/* =====================================================
   PIPGO · MESSAGE SERVICE
   Mensajes por conversación. Expiración a 7 días.
   Sin TTL ni Cloud Functions. Limpieza oportunista.
   ===================================================== */

(function () {
    'use strict';

    const MAX_TEXT_LENGTH = 2000;
    const PAGE_SIZE = 40;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    function col(conversationId) {
        return db.collection(CONFIG.COLLECTIONS.CONVERSATIONS)
                 .doc(conversationId)
                 .collection('mensajes');
    }

    function convRef(conversationId) {
        return db.collection(CONFIG.COLLECTIONS.CONVERSATIONS).doc(conversationId);
    }

    function _toMs(ts) {
        if (!ts) return 0;
        return ts.toDate ? ts.toDate().getTime() : new Date(ts).getTime();
    }

    function isExpired(message, now = Date.now()) {
        if (!message || !message.expiresAt) return false;
        return _toMs(message.expiresAt) <= now;
    }

    function sanitizeText(raw) {
        const s = String(raw == null ? '' : raw).trim();
        if (!s) return { valid: false, error: 'El mensaje está vacío.' };
        if (s.length > MAX_TEXT_LENGTH) {
            return { valid: false, error: `El mensaje no puede superar ${MAX_TEXT_LENGTH} caracteres.` };
        }
        return { valid: true, value: s };
    }

    /**
     * Envía un mensaje. Crea el mensaje y actualiza el resumen de la
     * conversación en un writeBatch (atómico).
     */
    async function sendMessage(conversationId, payload) {
        const {
            senderId,
            text,
            type = 'text',
            publicationId = null,
            publicationName = null
        } = payload || {};

        if (!conversationId || !senderId) throw new Error('Datos incompletos.');

        const check = sanitizeText(text);
        if (!check.valid) throw new Error(check.error);

        const now = firebase.firestore.FieldValue.serverTimestamp();
        const expiresAt = firebase.firestore.Timestamp.fromMillis(Date.now() + SEVEN_DAYS_MS);

        const msgRef = col(conversationId).doc();

        const messageData = {
            senderId,
            text: check.value,
            type,
            publicationId,
            publicationName,
            createdAt: now,
            updatedAt: now,
            expiresAt,
            edited: false,
            deletedForEveryone: false,
            hiddenFor: []
        };

        const batch = db.batch();
        batch.set(msgRef, messageData);
        batch.update(convRef(conversationId), {
            lastMessage: check.value.slice(0, 80),
            lastMessageAt: now,
            lastMessageSenderId: senderId,
            lastMessageExpiresAt: expiresAt,
            updatedAt: now,
            [`readAtBy.${senderId}`]: now
        });
        await batch.commit();

        return { messageId: msgRef.id };
    }

    /**
     * Listener de los últimos N mensajes. Devolver unsubscribe al cerrar chat.
     */
    function subscribeMessages(conversationId, { onChange, onError, limit = PAGE_SIZE } = {}) {
        if (!conversationId) return () => {};

        const q = col(conversationId).orderBy('createdAt', 'desc').limit(limit);

        return q.onSnapshot(
            (snap) => {
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                list.reverse(); // orden ascendente para render
                try { onChange(list); }
                catch (e) { Logger.error('subscribeMessages onChange', e); }
            },
            (err) => {
                Logger.error('subscribeMessages error', err);
                if (onError) onError(err);
            }
        );
    }

    async function loadOlderMessages(conversationId, beforeCreatedAt, limit = PAGE_SIZE) {
        if (!conversationId || !beforeCreatedAt) return [];
        const snap = await col(conversationId)
            .orderBy('createdAt', 'desc')
            .startAfter(beforeCreatedAt)
            .limit(limit)
            .get();
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.reverse();
        return list;
    }

    async function editMessage(conversationId, messageId, senderId, newText) {
        const check = sanitizeText(newText);
        if (!check.valid) throw new Error(check.error);

        const ref = col(conversationId).doc(messageId);
        const snap = await ref.get();
        if (!snap.exists) throw new Error('El mensaje ya no existe.');

        const data = snap.data();
        if (data.senderId !== senderId) throw new Error('No puedes editar este mensaje.');
        if (data.deletedForEveryone) throw new Error('Este mensaje fue eliminado.');
        if (isExpired(data)) throw new Error('Este mensaje ya expiró.');

        await ref.update({
            text: check.value,
            edited: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            // expiresAt NO se renueva.
        });
    }

    async function deleteForMe(conversationId, messageId, uid) {
        const ref = col(conversationId).doc(messageId);
        await ref.update({
            hiddenFor: firebase.firestore.FieldValue.arrayUnion(uid)
        });
    }

    async function deleteForEveryone(conversationId, messageId, senderId) {
        const ref = col(conversationId).doc(messageId);
        const snap = await ref.get();
        if (!snap.exists) throw new Error('El mensaje ya no existe.');
        const data = snap.data();
        if (data.senderId !== senderId) throw new Error('No puedes eliminar este mensaje.');

        await ref.update({
            deletedForEveryone: true,
            text: '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    /**
     * Limpieza oportunista: elimina físicamente mensajes expirados.
     * Se llama al abrir el chat. No usa polling.
     */
    async function cleanupExpiredMessages(conversationId) {
        if (!conversationId) return 0;
        try {
            const now = firebase.firestore.Timestamp.now();
            const snap = await col(conversationId)
                .where('expiresAt', '<=', now)
                .limit(50)
                .get();
            if (snap.empty) return 0;
            const batch = db.batch();
            snap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            return snap.size;
        } catch (e) {
            Logger.warn('cleanupExpiredMessages falló', e);
            return 0;
        }
    }

    window.MessageService = {
        MAX_TEXT_LENGTH,
        PAGE_SIZE,
        SEVEN_DAYS_MS,
        isExpired,
        sanitizeText,
        sendMessage,
        subscribeMessages,
        loadOlderMessages,
        editMessage,
        deleteForMe,
        deleteForEveryone,
        cleanupExpiredMessages
    };
})();