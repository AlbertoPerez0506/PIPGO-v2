/* =====================================================
   PIPGO · USER SERVICE
   -----------------------------------------------------
   v2.0:
   - updateAvatar usa set({merge:true}) → no explota si el
     doc perfilesPublicos aún no existe (F-03).
   - changeUsername PROPAGA el nuevo username a las
     publicaciones activas del usuario vía writeBatch
     best-effort (F-02). Así las tarjetas del Home muestran
     el @ correcto sin re-resolver por cada card.
   - createProfileWithUsername y getProfile sin cambios.
   ===================================================== */

(function () {
    'use strict';

    // Se limita el batch de propagación para no exceder el
    // límite de 500 operaciones por batch de Firestore.
    const USERNAME_PROPAGATION_LIMIT = 100;

    async function _propagateUsernameToPublications(uid, username, avatarUrl) {
        try {
            const snap = await db.collection(CONFIG.COLLECTIONS.PUBLICATIONS)
                .where('userId', '==', uid)
                .where('status', 'in', ['active', 'sold'])
                .limit(USERNAME_PROPAGATION_LIMIT)
                .get();

            if (snap.empty) return;

            const batch = db.batch();
            snap.docs.forEach(doc => {
                const update = { sellerUsername: username };
                if (avatarUrl) update.sellerAvatarUrl = avatarUrl;
                batch.update(doc.ref, update);
            });
            await batch.commit();
        } catch (e) {
            Logger.warn('Propagar username a publicaciones falló (best-effort)', e);
        }
    }

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

            // F-03: set merge para tolerar perfiles públicos
            // que aún no se hayan creado (usuarios migrados).
            batch.set(
                db.collection('perfilesPublicos').doc(uid),
                { avatarUrl },
                { merge: true }
            );

            await batch.commit();

            // Propagar avatar a publicaciones activas (best-effort).
            _propagateUsernameToPublications(uid, null, avatarUrl).catch(() => {});
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

                // publicRef puede no existir en cuentas antiguas.
                const pubSnap = await t.get(publicRef);
                if (pubSnap.exists) {
                    t.update(publicRef, {
                        username,
                        usernameNormalized: normalized,
                        usernamePrefixes: prefixes
                    });
                } else {
                    t.set(publicRef, {
                        uid,
                        username,
                        usernameNormalized: normalized,
                        usernamePrefixes: prefixes,
                        avatarUrl: current.avatarUrl || '',
                        sellerApproved: false
                    });
                }
            });

            // F-02: propagar a publicaciones (best-effort, no bloquea).
            _propagateUsernameToPublications(uid, username, null).catch(() => {});

            return { changed: true, username, normalized };
        }
    };
})();