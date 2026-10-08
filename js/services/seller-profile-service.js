/* =====================================================
   PIPGO · SELLER PROFILE SERVICE
   Lectura + cache de perfilesPublicos/{uid}.
   Búsqueda por prefijo de username (solo vendedores aprobados).
   ===================================================== */

(function () {
    'use strict';

    const CACHE_TTL_MS = 5 * 60 * 1000;
    const cache = new Map();

    const SEARCH_CACHE_TTL = 30 * 1000;
    const searchCache = new Map();

    function isFresh(entry) {
        return entry && (Date.now() - entry.at) < CACHE_TTL_MS;
    }

    async function getPublicProfile(uid, { force = false } = {}) {
        if (!uid) return null;
        const hit = cache.get(uid);
        if (!force && isFresh(hit)) return hit.data;

        try {
            const snap = await db.collection(CONFIG.COLLECTIONS.PUBLIC_PROFILES).doc(uid).get();
            const data = snap.exists ? { uid, ...snap.data() } : null;
            cache.set(uid, { data, at: Date.now() });
            return data;
        } catch (e) {
            Logger.error('SellerProfileService.getPublicProfile', e);
            return hit ? hit.data : null;
        }
    }

    async function resolveIdentity(publication) {
        if (!publication) return null;
        const uid = publication.userId;
        if (!uid) return null;

        if (publication.sellerUsername || publication.sellerAvatarUrl) {
            return {
                uid,
                username: publication.sellerUsername || '',
                avatarUrl: publication.sellerAvatarUrl || '',
                displayName: publication.sellerDisplayName || ''
            };
        }

        const pub = await getPublicProfile(uid);
        return {
            uid,
            username: (pub && pub.username) || '',
            avatarUrl: (pub && pub.avatarUrl) || '',
            displayName: (pub && pub.displayName) || ''
        };
    }

    async function searchSellersByPrefix(prefix, { limit = 10 } = {}) {
        const norm = String(prefix || '').trim().toLowerCase().replace(/^@/, '');
        if (norm.length < 2) return [];

        const hit = searchCache.get(norm);
        if (hit && (Date.now() - hit.at) < SEARCH_CACHE_TTL) return hit.results;

        try {
            const snap = await db.collection(CONFIG.COLLECTIONS.PUBLIC_PROFILES)
                .where('sellerApproved', '==', true)
                .where('usernamePrefixes', 'array-contains', norm)
                .limit(limit)
                .get();

            const myUid = AppState.currentUser && AppState.currentUser.uid;
            const results = snap.docs
                .map(d => ({ uid: d.id, ...d.data() }))
                .filter(p => p.uid !== myUid);

            searchCache.set(norm, { at: Date.now(), results });
            return results;
        } catch (e) {
            Logger.error('SellerProfileService.searchSellersByPrefix', e);
            return [];
        }
    }

    function clearCache() {
        cache.clear();
        searchCache.clear();
    }

    window.SellerProfileService = {
        getPublicProfile,
        resolveIdentity,
        searchSellersByPrefix,
        clearCache
    };
})();