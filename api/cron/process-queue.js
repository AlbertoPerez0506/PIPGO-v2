/* =====================================================
   PIPGO · PROCESS QUEUE (cron)
   -----------------------------------------------------
   Reprocesa eventos encolados por el cliente cuando el
   POST directo a /api/notify-* falló (red, cierre de
   pestaña, 5xx temporal).

   Estructura esperada del doc en colaNotificaciones:
     {
       kind: 'publication' | 'message',
       uid: <uid del emisor>,
       publicationId?   (si kind === 'publication'),
       conversationId?  (si kind === 'message'),
       messageId?       (si kind === 'message'),
       status: 'pending' | 'done' | 'failed',
       attempts: number,
       createdAt, processedAt?, lastError?
     }

   Reglas: solo admin lee/muta. El cron usa Admin SDK
   (bypassa reglas), autenticado por header CRON_SECRET.

   FIX v1.2:
   - Autenticación corregida: Vercel Cron manda el secreto
     en `Authorization: Bearer <CRON_SECRET>`, no en
     `x-cron-secret`. Se aceptan AMBOS formatos por
     compatibilidad (por si algún día cambia).
   ===================================================== */

const admin = require('../_firebaseAdmin');
const { sendPublicationPush, sendMessagePush } = require('../_notifyHelpers');

const db = admin.firestore();
const TS = admin.firestore.FieldValue.serverTimestamp;
const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 20;

module.exports = async (req, res) => {
  // ---------- AUTENTICACIÓN ----------
  // Vercel Cron (producción) manda: Authorization: Bearer <CRON_SECRET>
  // Para pruebas manuales aceptamos también x-cron-secret.
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error('process-queue: CRON_SECRET no configurado en env.');
    return res.status(500).json({ error: 'Servidor mal configurado' });
  }

  const authHeader = req.headers['authorization'] || '';
  const bearer = authHeader.replace(/^Bearer\s+/, '');
  const legacy = req.headers['x-cron-secret'] || '';

  if (bearer !== expected && legacy !== expected) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // ---------- PROCESAMIENTO ----------
  try {
    const snap = await db.collection('colaNotificaciones')
      .where('status', '==', 'pending')
      .limit(BATCH_SIZE)
      .get();

    if (snap.empty) {
      return res.status(200).json({ processed: 0, ok: 0, failed: 0 });
    }

    let ok = 0;
    let failed = 0;

    for (const doc of snap.docs) {
      const item = doc.data();
      const ref = doc.ref;

      try {
        let result;
        if (item.kind === 'publication' && item.publicationId) {
          result = await sendPublicationPush({ publicationId: item.publicationId });
        } else if (item.kind === 'message' && item.conversationId && item.messageId) {
          result = await sendMessagePush({
            conversationId: item.conversationId,
            messageId: item.messageId
          });
        } else {
          await ref.update({
            status: 'failed',
            lastError: 'Item malformado (kind/ids ausentes)',
            processedAt: TS()
          });
          failed++;
          continue;
        }

        await ref.update({
          status: 'done',
          processedAt: TS(),
          result: {
            delivered: result.delivered || 0,
            skipped: result.skipped || null
          }
        });
        ok++;
      } catch (e) {
        const attempts = (item.attempts || 0) + 1;
        const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
        await ref.update({
          attempts,
          status,
          lastError: String(e && e.message || e).slice(0, 300),
          processedAt: TS()
        });
        failed++;
      }
    }

    return res.status(200).json({ processed: snap.size, ok, failed });
  } catch (e) {
    console.error('process-queue error', e);
    return res.status(500).json({ error: 'Error interno' });
  }
};