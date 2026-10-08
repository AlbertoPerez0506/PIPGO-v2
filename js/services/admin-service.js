/* =====================================================
   PIPGO · ADMIN SERVICE
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

    async getDashboardStats() {
        const [usersSnap, appsSnap, recoveriesSnap] = await Promise.all([
            db.collection(CONFIG.COLLECTIONS.USERS).get(),
            db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS).get(),
            db.collection('solicitudesRecuperacion').where('status', '==', 'pending').get()
        ]);

        let pending = 0, approved = 0, rejected = 0, needsInfo = 0;
        appsSnap.forEach(doc => {
            const s = doc.data().status;
            if (s === 'pending')         pending++;
            else if (s === 'approved')   approved++;
            else if (s === 'rejected')   rejected++;
            else if (s === 'needs_info') needsInfo++;
        });

        return {
            totalUsers: usersSnap.size,
            pending, approved, rejected, needsInfo,
            pendingRecoveries: recoveriesSnap.size
        };
    },

    /**
     * MEJORA: en lugar de leer TODA la colección usuarios para
     * enriquecer cada solicitud, leemos solo los uids relevantes
     * con un where(documentId() 'in' [...]) en chunks de 10.
     * Con 10k usuarios esto baja de 10k lecturas a N (tamaño de apps).
     */
    async listApplications(filter = 'all') {
        let query = db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS);
        if (filter && filter !== 'all') query = query.where('status', '==', filter);

        const snap = await query.get();
        const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!apps.length) return [];

        // UIDs únicos (el documento está keyed por uid en este proyecto)
        const uids = [...new Set(apps.map(a => a.uid || a.id))].filter(Boolean);
        const usersById = {};

        // Firestore 'in' permite hasta 30 valores; usamos chunks de 10 por seguridad.
        const CHUNK = 10;
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
                usernamePrefixes: Validators.generateUsernamePrefixes(user.usernameNormalized || ''),  // ← NUEVO
                avatarUrl: user.avatarUrl || '',
                sellerApproved: true,                                                                  // ← NUEVO
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