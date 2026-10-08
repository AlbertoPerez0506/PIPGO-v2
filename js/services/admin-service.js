/* =====================================================
   PIPGO · ADMIN SERVICE
   -----------------------------------------------------
   PLAN B:
   - getDashboardStats: usa count() si está disponible;
     si la build de compat no lo expone, cae a get().size
     automáticamente. Cero errores en consola.
   - listApplications: CHUNK = 30 (máximo del operador
     'in' de Firestore con documentId()).
   ===================================================== */

window.AdminService = {

    ADMIN_EMAIL: (window.CONFIG && CONFIG.ADMIN_EMAIL) ||
                 'ivanalbertoperezramirez@gmail.com',

    isAdmin() {
        const u = AppState.currentUser;
        if (!u || !u.email) return false;
        return String(u.email).toLowerCase() === this.ADMIN_EMAIL.toLowerCase();
    },

    getAdminUid() {
        return AppState.currentUser ? AppState.currentUser.uid : null;
    },

    /**
     * Cuenta documentos de una query de forma segura.
     *
     * - Si el SDK expone aggregation queries (.count()), las usa:
     *     1 lectura por cada 1000 docs.
     * - Si no (build de compat sin aggregation), hace get() y usa .size:
     *     1 lectura por doc (peor, pero funciona).
     *
     * Nunca lanza por API faltante.
     */
    async _safeCount(query) {
        if (query && typeof query.count === 'function') {
            try {
                const snap = await query.count().get();
                const n = snap && snap.data && typeof snap.data().count === 'number'
                    ? snap.data().count
                    : null;
                if (n !== null) return n;
            } catch (e) {
                // Si por alguna razón count() está expuesto pero
                // falla (backend antiguo, permisos), caemos al fallback.
                Logger.warn('count() falló, usando get().size', e);
            }
        }
        const snap = await query.get();
        return snap.size;
    },

    async getDashboardStats() {
        const usersCol = db.collection(CONFIG.COLLECTIONS.USERS);
        const appsCol  = db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS);
        const recCol   = db.collection('solicitudesRecuperacion');

        const [
            totalUsers,
            pending,
            approved,
            rejected,
            needsInfo,
            pendingRecoveries
        ] = await Promise.all([
            this._safeCount(usersCol),
            this._safeCount(appsCol.where('status', '==', 'pending')),
            this._safeCount(appsCol.where('status', '==', 'approved')),
            this._safeCount(appsCol.where('status', '==', 'rejected')),
            this._safeCount(appsCol.where('status', '==', 'needs_info')),
            this._safeCount(recCol.where('status', '==', 'pending'))
        ]);

        return {
            totalUsers,
            pending,
            approved,
            rejected,
            needsInfo,
            pendingRecoveries
        };
    },

    /**
     * Enriquece cada solicitud con datos del usuario emisor.
     * Firestore permite hasta 30 valores en 'in' → usamos 30.
     */
    async listApplications(filter = 'all') {
        let query = db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS);
        if (filter && filter !== 'all') query = query.where('status', '==', filter);

        const snap = await query.get();
        const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!apps.length) return [];

        const uids = [...new Set(apps.map(a => a.uid || a.id))].filter(Boolean);
        const usersById = {};

        const CHUNK = 30;
        for (let i = 0; i < uids.length; i += CHUNK) {
            const chunk = uids.slice(i, i + CHUNK);
            try {
                const usersSnap = await db.collection(CONFIG.COLLECTIONS.USERS)
                    .where(firebase.firestore.FieldPath.documentId(), 'in', chunk)
                    .get();
                usersSnap.forEach(u => { usersById[u.id] = u.data(); });
            } catch (e) {
                Logger.warn('Admin listApplications: no se pudo enriquecer un chunk de usuarios', e);
            }
        }

        const enriched = apps.map(app => {
            const uid = app.uid || app.id;
            return { ...app, id: uid, user: usersById[uid] || {} };
        });

        enriched.sort((a, b) => {
            const ta = a.submittedAt && a.submittedAt.toDate ? a.submittedAt.toDate().getTime() : 0;
            const tb = b.submittedAt && b.submittedAt.toDate ? b.submittedAt.toDate().getTime() : 0;
            return tb - ta;
        });

        return enriched;
    },

    async listUsers() {
        const snap = await db.collection(CONFIG.COLLECTIONS.USERS).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /* -------------------------------------------------
       APROBAR — replica información pública en perfilesPublicos/{uid}
       ------------------------------------------------- */
    async approve(uid) {
        if (!this.isAdmin()) throw new Error('FORBIDDEN');
        const adminUid = this.getAdminUid();
        const now = firebase.firestore.FieldValue.serverTimestamp();

        const [appSnap, userSnap] = await Promise.all([
            db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS).doc(uid).get(),
            db.collection(CONFIG.COLLECTIONS.USERS).doc(uid).get()
        ]);

        const app = appSnap.exists ? appSnap.data() : {};
        const user = userSnap.exists ? userSnap.data() : {};

        const batch = db.batch();

        batch.update(db.collection(CONFIG.COLLECTIONS.USERS).doc(uid), {
            role: 'seller',
            sellerStatus: 'approved',
            updatedAt: now
        });
        batch.set(
            db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS).doc(uid),
            {
                status: 'approved',
                reviewedAt: now,
                reviewedBy: adminUid,
                rejectionReason: null,
                adminNote: null,
                updatedAt: now
            },
            { merge: true }
        );

        batch.set(
            db.collection(CONFIG.COLLECTIONS.PUBLIC_PROFILES).doc(uid),
            {
                uid,
                username: user.username || '',
                usernameNormalized: user.usernameNormalized || '',
                usernamePrefixes: Validators.generateUsernamePrefixes(user.usernameNormalized || ''),
                avatarUrl: user.avatarUrl || '',
                sellerApproved: true,
                displayName: app.displayName || '',
                businessName: app.businessName || '',
                sellerType: app.sellerType || 'person',
                category: app.category || '',
                description: app.description || '',
                phone: app.phone || '',
                city: app.city || '',
                state: app.state || '',
                socialUrl: app.socialUrl || '',
                contactMethod: app.contactMethod || 'phone'
            },
            { merge: true }
        );

        await batch.commit();
    },

    async reject(uid, reason) {
        if (!this.isAdmin()) throw new Error('FORBIDDEN');
        const adminUid = this.getAdminUid();
        const now = firebase.firestore.FieldValue.serverTimestamp();

        const batch = db.batch();
        batch.update(db.collection(CONFIG.COLLECTIONS.USERS).doc(uid), {
            sellerStatus: 'rejected',
            updatedAt: now
        });
        batch.set(
            db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS).doc(uid),
            {
                status: 'rejected',
                rejectionReason: reason || '',
                reviewedAt: now,
                reviewedBy: adminUid,
                updatedAt: now
            },
            { merge: true }
        );
        await batch.commit();
    },

    async requestInfo(uid, note) {
        if (!this.isAdmin()) throw new Error('FORBIDDEN');
        const adminUid = this.getAdminUid();
        const now = firebase.firestore.FieldValue.serverTimestamp();

        const batch = db.batch();
        batch.update(db.collection(CONFIG.COLLECTIONS.USERS).doc(uid), {
            sellerStatus: 'needs_info',
            updatedAt: now
        });
        batch.set(
            db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS).doc(uid),
            {
                status: 'needs_info',
                adminNote: note || '',
                reviewedAt: now,
                reviewedBy: adminUid,
                updatedAt: now
            },
            { merge: true }
        );
        await batch.commit();
    },

    /* ------------- Recuperaciones ------------- */

    async listPasswordResetRequests(filter = 'pending') {
        let query = db.collection('solicitudesRecuperacion');
        if (filter && filter !== 'all') query = query.where('status', '==', filter);
        const snap = await query.get();
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
            const ta = a.requestedAt && a.requestedAt.toDate ? a.requestedAt.toDate().getTime() : 0;
            const tb = b.requestedAt && b.requestedAt.toDate ? b.requestedAt.toDate().getTime() : 0;
            return tb - ta;
        });
        return list;
    },

    async approvePasswordReset(docId, email) {
        if (!this.isAdmin()) throw new Error('FORBIDDEN');
        await AuthService.sendPasswordResetEmail(email);

        const adminUid = this.getAdminUid();
        const now = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('solicitudesRecuperacion').doc(docId).update({
            status: 'approved',
            reviewedAt: now,
            reviewedBy: adminUid,
            emailSentAt: now,
            rejectionReason: null
        });
    },

    async rejectPasswordReset(docId, reason) {
        if (!this.isAdmin()) throw new Error('FORBIDDEN');
        const adminUid = this.getAdminUid();
        const now = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('solicitudesRecuperacion').doc(docId).update({
            status: 'rejected',
            reviewedAt: now,
            reviewedBy: adminUid,
            rejectionReason: reason || ''
        });
    }
};