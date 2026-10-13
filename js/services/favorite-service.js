/* =====================================================
   PIPGO · FAVORITE SERVICE
   -----------------------------------------------------
   v2.0:
   - Chunks de "in" ejecutados en paralelo con Promise.all
     en vez de secuencial (F-09). Con 200 favoritos:
     7 requests en vez de 7 × round-trip.
   - Auto-limpieza de huérfanos se mantiene pero se agrupa
     en un batch para reducir escrituras.
   ===================================================== */

(function () {
    'use strict';

    const IN_CHUNK = 30;

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

            // F-09: chunks en paralelo.
            const results = await Promise.all(
                batches.map(ids2 =>
                    db.collection(CONFIG.COLLECTIONS.PUBLICATIONS)
                        .where(firebase.firestore.FieldPath.documentId(), 'in', ids2)
                        .get()
                        .catch(err => {
                            Logger.warn('FavoriteService chunk falló', err);
                            return null;
                        })
                )
            );

            results.forEach(snap => {
                if (!snap) return;
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'deleted') return;
                    found.set(doc.id, { id: doc.id, ...data });
                });
            });

            // Auto-limpieza silenciosa en un solo batch.
            const orphans = idArray.filter(id => !found.has(id));
            if (orphans.length) {
                try {
                    const batch = db.batch();
                    orphans.forEach(id => batch.delete(favRef(uid).doc(id)));
                    await batch.commit();
                } catch (e) {
                    // Si falla el cleanup, no rompemos la carga de favoritos.
                    Logger.warn('FavoriteService: cleanup huérfanos falló', e);
                }
            }

            const list = [...found.values()];
            list.sort((a, b) => {
                const ta = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
                const tb = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
                return tb - ta;
            });
            return list;
        }
    };
})();