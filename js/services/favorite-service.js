/* =====================================================
   PIPGO · FAVORITE SERVICE
   Favoritos por usuario. Lectura en batch (evita N+1).
   Resiliente a publicaciones eliminadas / no accesibles.
   ===================================================== */

(function () {
    'use strict';

    const IN_CHUNK = 30; // límite de Firestore para "in"

    function favRef(uid) {
        return db.collection(CONFIG.COLLECTIONS.USERS).doc(uid)
                 .collection(CONFIG.COLLECTIONS.FAVORITES);
    }

    function chunk(arr, size) {
        const out = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
    }

    window.FavoriteService = {
        _favRef: favRef,

        async getFavoriteIds(uid) {
            const snapshot = await favRef(uid).get();
            return new Set(snapshot.docs.map(doc => doc.id));
        },

        async toggleFavorite(uid, publicationId) {
            const ref = favRef(uid).doc(publicationId);
            const snap = await ref.get();
            if (snap.exists) {
                await ref.delete();
                return false;
            }
            await ref.set({
                publicationId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        },

        async getFavoritePublications(uid) {
            const ids = await this.getFavoriteIds(uid);
            if (ids.size === 0) return [];

            const idArray = [...ids];
            const batches = chunk(idArray, IN_CHUNK);
            const found = new Map();

            for (const ids2 of batches) {
                const snap = await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS)
                    .where(firebase.firestore.FieldPath.documentId(), 'in', ids2)
                    .get();

                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'deleted') return;
                    found.set(doc.id, { id: doc.id, ...data });
                });
            }

            // Auto-limpieza silenciosa: favoritos huérfanos (borrados
            // o inaccesibles por reglas) se eliminan del usuario.
            idArray.forEach(id => {
                if (!found.has(id)) {
                    favRef(uid).doc(id).delete().catch(() => {});
                }
            });

            // Orden por createdAt desc si está disponible.
            const results = [...found.values()];
            results.sort((a, b) => {
                const ta = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
                const tb = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
                return tb - ta;
            });
            return results;
        }
    };
})();