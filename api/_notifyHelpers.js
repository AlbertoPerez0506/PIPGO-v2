/* =====================================================
   PIPGO · NOTIFY HELPERS (Admin SDK)
   -----------------------------------------------------
   Lógica compartida para:
     - /api/notify-publication.js   (llamada directa, uid del token)
     - /api/notify-message.js       (llamada directa, uid del token)
     - /api/process-queue.js        (cron, sin token, uid del doc de cola)

   Cada helper:
   - Lee la publicación/mensaje.
   - Verifica idempotencia vía notifiedAt.
   - Marca notifiedAt (server timestamp).
   - Resuelve seguidores (publicación) o destinatario (mensaje).
   - Crea notificación persistente (solo publicaciones).
   - Envía push multicast.
   - Limpia tokens inválidos.
   ===================================================== */

const admin = require('./_firebaseAdmin');
const db = admin.firestore();
const messaging = admin.messaging();

const TS = admin.firestore.FieldValue.serverTimestamp;

/* ============================================================
   PUBLICACIÓN NUEVA
   ------------------------------------------------------------
   Lanza si publicationId no existe. Devuelve { delivered, recipients }.
   Si ya fue notificada, devuelve { delivered: 0, skipped: true }.
   ============================================================ */
async function sendPublicationPush({ publicationId }) {
  if (!publicationId) throw new Error('publicationId requerido');

  const pubRef = db.collection('publicaciones').doc(publicationId);
  const pubSnap = await pubRef.get();
  if (!pubSnap.exists) throw new Error('PUBLICATION_NOT_FOUND');

  const pub = pubSnap.data();
  const uid = pub.userId;
  if (!uid) throw new Error('PUBLICATION_NO_OWNER');
  if (pub.status !== 'active') return { delivered: 0, skipped: 'not-active' };

  // Idempotencia
  if (pub.notifiedAt) return { delivered: 0, skipped: 'already' };
  await pubRef.update({ notifiedAt: TS() });

  // Seguidores del vendedor
  const followersSnap = await db
    .collection('usuarios').doc(uid)
    .collection('siguiendo').get();
  const followerIds = followersSnap.docs.map(d => d.id);

  if (!followerIds.length) return { delivered: 0, recipients: 0 };

  // Nombre público del vendedor
  const profileSnap = await db.collection('perfilesPublicos').doc(uid).get();
  const profile = profileSnap.exists ? profileSnap.data() : {};
  const sellerName = profile.displayName || profile.username || 'Un vendedor';

  const title = `Nuevo producto de ${sellerName}`;
  const body  = `${sellerName} acaba de publicar ${pub.name || 'algo nuevo'}.`;

  let delivered = 0;

  for (const followerId of followerIds) {
    if (followerId === uid) continue;

    // Notificación persistente (docId determinista → idempotente)
    const notifId = `${publicationId}__${followerId}`;
    const notifRef = db.collection('usuarios').doc(followerId)
      .collection('notificaciones').doc(notifId);

    try {
      await notifRef.set({
        type: 'publicacion_nueva',
        recipientId: followerId,
        sellerId: uid,
        sellerName,
        publicationId,
        title,
        body,
        createdAt: TS(),
        read: false,
        readAt: null,
        idempotencyKey: notifId
      }, { merge: true });
    } catch (e) {
      console.warn('notif persistente falló', followerId, e.message);
      // Seguimos: la push puede enviarse aunque la persistente falle.
    }

    // Tokens del seguidor
    const tokensSnap = await db.collection('usuarios').doc(followerId)
      .collection('dispositivos').get();
    const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
    if (!tokens.length) continue;

    const resp = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: {
        type: 'publicacion_nueva',
        publicationId,
        tag: 'pub-' + publicationId
      },
      webpush: {
        fcmOptions: { link: '/' },
        notification: {
          icon: '/assets/android/icon_x192.png',
          badge: '/assets/android/icon_x128.png',
          tag: 'pub-' + publicationId
        }
      }
    });

    // Limpieza de tokens muertos
    resp.responses.forEach((r, i) => {
      if (!r.success && r.error &&
          /registration-token-not-registered|invalid-argument/.test(r.error.code)) {
        tokensSnap.docs[i].ref.delete().catch(() => {});
      }
    });

    delivered += resp.successCount;
  }

  return { delivered, recipients: followerIds.length };
}

/* ============================================================
   MENSAJE NUEVO
   ------------------------------------------------------------
   Requiere conversationId y messageId. Devuelve { delivered, recipients }.
   Si ya fue notificado, { delivered: 0, skipped: true }.
   ============================================================ */
async function sendMessagePush({ conversationId, messageId }) {
  if (!conversationId || !messageId) {
    throw new Error('conversationId y messageId requeridos');
  }

  const convRef = db.collection('conversaciones').doc(conversationId);
  const convSnap = await convRef.get();
  if (!convSnap.exists) throw new Error('CONVERSATION_NOT_FOUND');
  const conv = convSnap.data();
  const senderId = conv.lastMessageSenderId;
  if (!senderId || !Array.isArray(conv.participantIds)) {
    throw new Error('CONVERSATION_INVALID');
  }

  const msgRef = convRef.collection('mensajes').doc(messageId);
  const msgSnap = await msgRef.get();
  if (!msgSnap.exists) throw new Error('MESSAGE_NOT_FOUND');
  const msg = msgSnap.data();

  // El mensaje debe ser del sender actual de la conversación
  if (msg.senderId !== senderId) throw new Error('MESSAGE_SENDER_MISMATCH');

  // Idempotencia
  if (msg.notifiedAt) return { delivered: 0, skipped: 'already' };
  await msgRef.update({ notifiedAt: TS() });

  const recipientId = conv.participantIds.find(p => p !== senderId);
  if (!recipientId) return { delivered: 0, recipients: 0 };

  // Nombre del remitente
  const profileSnap = await db.collection('perfilesPublicos').doc(senderId).get();
  const profile = profileSnap.exists ? profileSnap.data() : {};
  const senderName = profile.username
    ? '@' + profile.username
    : (profile.displayName || 'Nuevo mensaje');

  const title = senderName;
  const preview = String(msg.text || '').slice(0, 120);
  const body = preview || 'Nuevo mensaje';

  // Tokens del destinatario
  const tokensSnap = await db.collection('usuarios').doc(recipientId)
    .collection('dispositivos').get();
  const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
  if (!tokens.length) return { delivered: 0, recipients: 0 };

  const resp = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: {
      type: 'nuevo_mensaje',
      conversationId,
      messageId,
      tag: 'conv-' + conversationId
    },
    webpush: {
      fcmOptions: { link: '/' },
      notification: {
        icon: '/assets/android/icon_x192.png',
        badge: '/assets/android/icon_x128.png',
        tag: 'conv-' + conversationId
      }
    }
  });

  resp.responses.forEach((r, i) => {
    if (!r.success && r.error &&
        /registration-token-not-registered|invalid-argument/.test(r.error.code)) {
      tokensSnap.docs[i].ref.delete().catch(() => {});
    }
  });

  return { delivered: resp.successCount, recipients: 1 };
}

module.exports = { sendPublicationPush, sendMessagePush };