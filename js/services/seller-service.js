/* =====================================================
   PIPGO · SELLER SERVICE
   Solicitudes de vendedor (una sola cuenta, distintos permisos).
   Soporta envío inicial y reenvío tras rechazo / needs_info.
   ===================================================== */

window.SellerService = {

    async submitApplication(data) {
        if (!AppState.currentUser) throw new Error('Debes iniciar sesión.');
        const uid = AppState.currentUser.uid;
        const now = firebase.firestore.FieldValue.serverTimestamp();

        // En reenvíos limpiamos los campos de revisión para
        // volver al estado "pending" (coincide con las rules).
        const payload = {
            uid,
            sellerType:      data.sellerType,
            displayName:     data.displayName,
            businessName:    data.businessName || '',
            category:        data.category || '',
            description:     data.description || '',
            phone:           data.phone || '',
            city:            data.city || '',
            state:           data.state || '',
            socialUrl:       data.socialUrl || '',
            contactMethod:   data.contactMethod || 'phone',
            termsAccepted:   true,
            status:          'pending',
            rejectionReason: null,
            adminNote:       null,
            submittedAt:     now,
            updatedAt:       now,
            reviewedAt:      null,
            reviewedBy:      null
        };

        const batch = db.batch();
        batch.set(
            db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS).doc(uid),
            payload,
            { merge: true }
        );
        batch.update(
            db.collection(CONFIG.COLLECTIONS.USERS).doc(uid),
            { sellerStatus: 'pending', updatedAt: now }
        );
        await batch.commit();

        if (AppState.currentProfile) {
            AppState.currentProfile.sellerStatus = 'pending';
        }
        AppState.currentSellerApplication = payload;
        return payload;
    },

    async getApplication(uid) {
        const snap = await db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS).doc(uid).get();
        return snap.exists ? snap.data() : null;
    },

    async listPending() {
        const snap = await db.collection(CONFIG.COLLECTIONS.SELLER_APPLICATIONS)
            .where('status', '==', 'pending')
            .orderBy('submittedAt', 'desc')
            .limit(50)
            .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
};