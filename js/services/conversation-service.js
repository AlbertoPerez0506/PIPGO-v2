/* =====================================================
   PIPGO · CONVERSATION SERVICE
   Conversación USUARIO ↔ VENDEDOR.
   ID determinista: sorted uids joined with "_".

   v2.4 (fix):
   - markAsRead ya NO toca `updatedAt`. Solo actualiza
     `readAtBy.<uid>`. Así el inbox de la contraparte no
     se reordena cuando alguien abre un chat viejo.

   Heredado:
   - getOrCreateConversation hace un solo .set() con
     readAtBy inicializado para ambos participantes.
   - listConversationsForUser filtra por status en el
     índice compuesto.
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
            if (e && e.code === 'permission-denied') return null;
            throw e;
        }
    }

    /**
     * Idempotente. Devuelve { conversation, created }.
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

    /**
     * FIX v2.4: solo escribimos readAtBy.<uid>. NO tocamos updatedAt
     * porque reordenaría el inbox de la contraparte.
     */
    async function markAsRead(conversationId, uid) {
        if (!conversationId || !uid) return;
        try {
            await col().doc(conversationId).update({
                [`readAtBy.${uid}`]: firebase.firestore.FieldValue.serverTimestamp()
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
        if (isLastMessageExpired(conversation)) return false;
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