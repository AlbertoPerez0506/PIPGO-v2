/* =====================================================
   PIPGO · CONVERSATION SERVICE
   Conversación USUARIO ↔ VENDEDOR.
   ID determinista: sorted uids joined with "_".

   FIX:
   - getOrCreateConversation ahora hace un solo .set() con
     readAtBy ya inicializado en ambos participantes, evitando
     el .update() posterior que podía fallar por reglas.
   - listConversationsForUser: se agregó el filtro por status
     en el índice compuesto (participantIds + status + updatedAt).
   ===================================================== */

(function () {
    'use strict';

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const LAST_MESSAGE_MAX = 80;

    function col() {
        return db.collection(CONFIG.COLLECTIONS.CONVERSATIONS);
    }

    function createConversationId(uidA, uidB) {
        if (!uidA || !uidB) throw new Error('UIDs requeridos');
        return [uidA, uidB].sort().join('_');
    }

    async function getConversation(conversationId) {
        if (!conversationId) return null;
        try {
            const snap = await col().doc(conversationId).get();
            return snap.exists ? { id: snap.id, ...snap.data() } : null;
        } catch (e) {
            // permission-denied puede ocurrir si el doc no existe y las
            // reglas no permiten leer null. Con las reglas actualizadas
            // ya no debería pasar, pero devolvemos null por seguridad.
            if (e && e.code === 'permission-denied') return null;
            throw e;
        }
    }

    /**
     * Idempotente. Devuelve { conversation, created }.
     * `created` permite saber si toca mandar el mensaje contextual.
     *
     * IMPORTANTE: se hace un solo .set() con todo inicializado, para
     * no depender de un segundo write (update) que pudiera rebotar
     * contra la regla de update.
     */
    async function getOrCreateConversation(uidA, uidB) {
        if (!uidA || !uidB) throw new Error('UIDs requeridos');
        if (uidA === uidB) throw new Error('No puedes conversar contigo mismo.');

        const conversationId = createConversationId(uidA, uidB);
        const ref = col().doc(conversationId);

        let snap = null;
        try {
            snap = await ref.get();
        } catch (e) {
            // Si por alguna razón las reglas antiguas siguen desplegadas,
            // permission-denied en el get significa "no existe para mí".
            // Seguimos adelante: el .set() fallará o creará según reglas.
            if (e && e.code === 'permission-denied') {
                snap = { exists: false };
            } else {
                throw e;
            }
        }

        if (snap && snap.exists) {
            return { conversation: { id: conversationId, ...snap.data() }, created: false };
        }

        const now = firebase.firestore.FieldValue.serverTimestamp();
        const participants = [uidA, uidB].sort();

        // Ambos participantes inician "leídos". Como la conversación
        // está vacía, no hay nada pendiente. Cuando llegue el primer
        // mensaje, lastMessageAt > readAtBy del receptor, y hasUnread()
        // lo detectará correctamente.
        const readAtBy = {};
        readAtBy[participants[0]] = now;
        readAtBy[participants[1]] = now;

        const data = {
            participantIds: participants,
            lastMessage: '',
            lastMessageAt: null,
            lastMessageSenderId: '',
            lastMessageExpiresAt: null,
            readAtBy,
            createdAt: now,
            updatedAt: now,
            status: 'active'
        };

        try {
            await ref.set(data);
            return { conversation: { id: conversationId, ...data }, created: true };
        } catch (err) {
            // Race condition: otro cliente lo creó al mismo tiempo.
            // Releemos para devolver la versión existente.
            try {
                const again = await ref.get();
                if (again.exists) {
                    return { conversation: { id: conversationId, ...again.data() }, created: false };
                }
            } catch (e) { /* cae abajo */ }
            throw err;
        }
    }

    /**
     * Lista las conversaciones del usuario ordenadas por actividad.
     *
     * Requiere índice compuesto:
     *   collectionGroup: conversaciones
     *   participantIds ARRAY_CONTAINS
     *   status ASC
     *   updatedAt DESC
     */
    async function listConversationsForUser(uid, limit = 30) {
        if (!uid) return [];
        const snap = await col()
            .where('participantIds', 'array-contains', uid)
            .where('status', '==', 'active')
            .orderBy('updatedAt', 'desc')
            .limit(limit)
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async function markAsRead(conversationId, uid) {
        if (!conversationId || !uid) return;
        try {
            await col().doc(conversationId).update({
                [`readAtBy.${uid}`]: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            Logger.warn('markAsRead falló', e);
        }
    }

    function _toMs(ts) {
        if (!ts) return 0;
        return ts.toDate ? ts.toDate().getTime() : new Date(ts).getTime();
    }

    function isLastMessageExpired(conversation, now = Date.now()) {
        if (!conversation || !conversation.lastMessageExpiresAt) return true;
        return _toMs(conversation.lastMessageExpiresAt) <= now;
    }

    function hasUnread(conversation, uid) {
        if (!conversation || !uid) return false;
        const sender = conversation.lastMessageSenderId;
        if (!sender || sender === uid) return false;
        const lastMs = _toMs(conversation.lastMessageAt);
        if (!lastMs) return false;
        const readMs = _toMs(conversation.readAtBy && conversation.readAtBy[uid]);
        return lastMs > readMs;
    }

    function otherParticipantId(conversation, uid) {
        if (!conversation || !conversation.participantIds) return null;
        return conversation.participantIds.find(p => p !== uid) || null;
    }

    function truncate(text) {
        const s = String(text || '');
        return s.length > LAST_MESSAGE_MAX ? s.slice(0, LAST_MESSAGE_MAX - 1) + '…' : s;
    }

    window.ConversationService = {
        SEVEN_DAYS_MS,
        createConversationId,
        getConversation,
        getOrCreateConversation,
        listConversationsForUser,
        markAsRead,
        isLastMessageExpired,
        hasUnread,
        otherParticipantId,
        truncate
    };
})();