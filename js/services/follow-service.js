/* =====================================================
   PIPGO · FOLLOW SERVICE
   Relación USUARIO → VENDEDOR APROBADO.
   docId determinista (sellerUid) para prevenir duplicados.
   Fuente de verdad: Firestore. Estado en sesión: AppState.followingIds.
   ===================================================== */

(function () {
    'use strict';

    function followingRef(uid) {
        return db.collection(CONFIG.COLLECTIONS.USERS).doc(uid)
                 .collection('siguiendo');
    }

    function chunk(arr, size) {
        const out = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
    }

    async function getFollowingIds(uid) {
        if (!uid) return new Set();
        const snap = await followingRef(uid).get();
        return new Set(snap.docs.map(d => d.id));
    }

    async function isFollowing(uid, sellerUid) {
        if (!uid || !sellerUid) return false;
        if (window.AppState && AppState.followingIds) {
            return AppState.followingIds.has(sellerUid);
        }
        const snap = await followingRef(uid).doc(sellerUid).get();
        return snap.exists;
    }

    async function follow(uid, sellerUid) {
        if (!uid || !sellerUid) throw new Error('Datos incompletos.');
        if (uid === sellerUid) throw new Error('No puedes seguirte a ti mismo.');

        const sellerSnap = await db.collection(CONFIG.COLLECTIONS.PUBLIC_PROFILES)
            .doc(sellerUid).get();
        if (!sellerSnap.exists || sellerSnap.data().sellerApproved !== true) {
            throw new Error('Este vendedor no está disponible.');
        }

        const ref = followingRef(uid).doc(sellerUid);
        const exists = await ref.get();
        if (exists.exists) {
            if (AppState.followingIds) AppState.followingIds.add(sellerUid);
            return false;
        }

        await ref.set({
            sellerUid,
            followedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (AppState.followingIds) AppState.followingIds.add(sellerUid);
        return true;
    }

    async function unfollow(uid, sellerUid) {
        if (!uid || !sellerUid) return;
        const ref = followingRef(uid).doc(sellerUid);
        const snap = await ref.get();
        if (snap.exists) await ref.delete();
        if (AppState.followingIds) AppState.followingIds.delete(sellerUid);
    }

    async function toggleFollow(uid, sellerUid) {
        const currently = await isFollowing(uid, sellerUid);
        if (currently) {
            await unfollow(uid, sellerUid);
            return false;
        }
        await follow(uid, sellerUid);
        return true;
    }

    async function getFollowingProfiles(uid) {
        const ids = await getFollowingIds(uid);
        if (!ids.size) return [];

        const idArray = [...ids];
        const batches = chunk(idArray, 10);
        const results = [];

        for (const ids2 of batches) {
            try {
                const snap = await db.collection(CONFIG.COLLECTIONS.PUBLIC_PROFILES)
                    .where(firebase.firestore.FieldPath.documentId(), 'in', ids2)
                    .get();
                snap.docs.forEach(d => {
                    const data = d.data();
                    if (data.sellerApproved === true) {
                        results.push({ uid: d.id, ...data });
                    }
                });
            } catch (e) {
                Logger.warn('FollowService.getFollowingProfiles chunk falló', e);
            }
        }

        results.sort((a, b) =>
            String(a.username || '').localeCompare(String(b.username || ''))
        );
        return results;
    }

    function clearCache() {
        if (AppState.followingIds) AppState.followingIds = new Set();
    }

    window.FollowService = {
        getFollowingIds,
        isFollowing,
        follow,
        unfollow,
        toggleFollow,
        getFollowingProfiles,
        clearCache
    };
})();