/* =====================================================
   PIPGO · USER SERVICE
   Perfiles de usuario + perfil público + avatar.
   Incluye cambio atómico de username.
   ===================================================== */

window.UserService = {

    async createProfileWithUsername({ uid, username, normalized, email }) {
        const userRef     = db.collection(CONFIG.COLLECTIONS.USERS).doc(uid);
        const publicRef   = db.collection('perfilesPublicos').doc(uid);
        const usernameRef = db.collection(CONFIG.COLLECTIONS.USERNAMES).doc(normalized);

        await db.runTransaction(async (transaction) => {
            const snap = await transaction.get(usernameRef);
            if (snap.exists) throw new Error('El username no está disponible.');

            const now = firebase.firestore.FieldValue.serverTimestamp();
            const prefixes = Validators.generateUsernamePrefixes(normalized);

            transaction.set(usernameRef, { uid, username, createdAt: now });

            transaction.set(userRef, {
                uid,
                username,
                usernameNormalized: normalized,
                email,
                avatarUrl: '',
                role: 'user',
                sellerStatus: 'none',
                active: true,
                admin: false,
                createdAt: now,
                updatedAt: now
            });

            transaction.set(publicRef, {
                uid,
                username,
                usernameNormalized: normalized,
                usernamePrefixes: prefixes,
                avatarUrl: '',
                sellerApproved: false
            });
        });
    },

    async getProfile(uid) {
        const snap = await db.collection(CONFIG.COLLECTIONS.USERS).doc(uid).get();
        return snap.exists ? snap.data() : null;
    },

    async getPublicProfile(uid) {
        const snap = await db.collection('perfilesPublicos').doc(uid).get();
        return snap.exists ? snap.data() : null;
    },

    async updateAvatar(uid, avatarUrl) {
        const now = firebase.firestore.FieldValue.serverTimestamp();
        const batch = db.batch();
        batch.update(db.collection(CONFIG.COLLECTIONS.USERS).doc(uid), {
            avatarUrl, updatedAt: now
        });
        batch.update(db.collection('perfilesPublicos').doc(uid), { avatarUrl });
        await batch.commit();
    },

    async isUsernameAvailable(normalized, uid) {
        if (!normalized) return false;
        const snap = await db.collection(CONFIG.COLLECTIONS.USERNAMES)
            .doc(normalized)
            .get();
        if (!snap.exists) return true;
        const data = snap.data() || {};
        return data.uid === uid;
    },

    async changeUsername(uid, newRawUsername) {
        if (!uid) throw new Error('Falta el identificador del usuario.');

        const validation = Validators.validateUsername(newRawUsername);
        if (!validation.valid) throw new Error(validation.error);

        const username   = validation.value;
        const normalized = Validators.normalizeUsername(username);

        const userRef    = db.collection(CONFIG.COLLECTIONS.USERS).doc(uid);
        const publicRef  = db.collection('perfilesPublicos').doc(uid);
        const newIdxRef  = db.collection(CONFIG.COLLECTIONS.USERNAMES).doc(normalized);

        const userSnap = await userRef.get();
        if (!userSnap.exists) throw new Error('No encontramos tu perfil.');

        const current = userSnap.data() || {};
        const oldNormalized = current.usernameNormalized || '';

        if (oldNormalized === normalized) {
            return { changed: false, username, normalized };
        }

        const oldIdxRef = oldNormalized
            ? db.collection(CONFIG.COLLECTIONS.USERNAMES).doc(oldNormalized)
            : null;

        await db.runTransaction(async (t) => {
            const newIdxSnap = await t.get(newIdxRef);
            const oldIdxSnap = oldIdxRef ? await t.get(oldIdxRef) : null;

            if (newIdxSnap.exists && newIdxSnap.data().uid !== uid) {
                throw new Error('Ese username ya está en uso.');
            }

            const now = firebase.firestore.FieldValue.serverTimestamp();
            const prefixes = Validators.generateUsernamePrefixes(normalized);

            if (oldIdxRef && oldIdxSnap && oldIdxSnap.exists) {
                if (oldIdxSnap.data().uid === uid) {
                    t.delete(oldIdxRef);
                }
            }

            if (!newIdxSnap.exists) {
                t.set(newIdxRef, { uid, username, createdAt: now });
            }

            t.update(userRef, {
                username,
                usernameNormalized: normalized,
                updatedAt: now
            });

            t.update(publicRef, {
                username,
                usernameNormalized: normalized,
                usernamePrefixes: prefixes
            });
        });

        return { changed: true, username, normalized };
    }
};