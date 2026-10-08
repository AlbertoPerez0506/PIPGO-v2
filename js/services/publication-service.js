/* =====================================================
   PIPGO · PUBLICATION SERVICE
   ===================================================== */

window.PublicationService = {

    async create(data) {
        const profile = AppState.currentProfile || {};
        const enriched = {
            ...data,
            sellerUsername: profile.username || '',
            sellerAvatarUrl: profile.avatarUrl || '',
            sellerDisplayName: '',
            status: 'active',
            soldAt: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        return await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS).add(enriched);
    },

    async getActivePublications() {
        const snapshot = await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS)
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .limit(60)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    subscribeActivePublications(onChange, onError) {
        const query = db.collection(CONFIG.COLLECTIONS.PUBLICATIONS)
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .limit(60);

        const unsubscribe = query.onSnapshot(
            (snapshot) => {
                const changes = { added: [], modified: [], removed: [] };
                snapshot.docChanges().forEach(change => {
                    const data = { id: change.doc.id, ...change.doc.data() };
                    if (change.type === 'added')         changes.added.push(data);
                    else if (change.type === 'modified') changes.modified.push(data);
                    else if (change.type === 'removed')  changes.removed.push(data);
                });
                try { onChange(changes, snapshot); }
                catch (e) { if (window.Logger) Logger.error('subscribeActivePublications onChange falló', e); }
            },
            (error) => {
                if (window.Logger) Logger.error('subscribeActivePublications error', error);
                if (onError) onError(error);
            }
        );

        return unsubscribe;
    },

    async getUserPublications(uid) {
        const snapshot = await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS)
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(pub => {
                if (pub.status === 'deleted') return false;
                if (pub.status === 'sold' && pub.soldAt) {
                    const soldMs = pub.soldAt.toDate ? pub.soldAt.toDate().getTime() : new Date(pub.soldAt).getTime();
                    return (Date.now() - soldMs) < 24 * 60 * 60 * 1000;
                }
                return true;
            });
    },

    async getPublicationById(id) {
        const snap = await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS).doc(id).get();
        return snap.exists ? { id: snap.id, ...snap.data() } : null;
    },

    async update(id, data) {
        const updateData = { ...data };
        delete updateData.userId;
        delete updateData.createdAt;
        delete updateData.status;
        delete updateData.soldAt;
        delete updateData.sellerUsername;
        delete updateData.sellerAvatarUrl;
        delete updateData.sellerDisplayName;
        updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS).doc(id).update(updateData);
    },

    async markAsSold(id) {
        await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS).doc(id).update({
            status: 'sold',
            soldAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async softDelete(id) {
        await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS).doc(id).update({
            status: 'deleted',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    buildSuggestions(publications) {
        const counter = new Map();
        const add = (val) => {
            if (!val) return;
            const key = String(val).trim();
            if (!key || key.length < 2) return;
            counter.set(key, (counter.get(key) || 0) + 1);
        };
        publications.forEach(p => {
            add(p.name);
            add(p.storeName);
        });
        return [...counter.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([value]) => value);
    }
};