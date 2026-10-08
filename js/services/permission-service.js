/* =====================================================
   PIPGO · PERMISSION SERVICE
   Capa única de autorización para toda la app.
   La UI pregunta aquí, nunca reparte if(user) por ahí.
   ===================================================== */

(function () {
    'use strict';

    function profile() {
        return AppState.currentProfile || null;
    }

    window.PermissionService = {
        /* ---------- Identidad ---------- */
        isVisitor()       { return !AppState.currentUser; },
        isAuthenticated() { return !!AppState.currentUser; },

        getRole() {
            const p = profile();
            return (p && p.role) || 'user';
        },
        getSellerStatus() {
            const p = profile();
            return (p && p.sellerStatus) || 'none';
        },
        isActive() {
            const p = profile();
            return !p || p.active !== false;
        },

        /* ---------- Estado del vendedor ---------- */
        isSeller()           { return this.getRole() === 'seller'; },
        isSellerNone()       { return this.getSellerStatus() === 'none'; },
        isSellerPending()    { return this.getSellerStatus() === 'pending'; },
        isSellerApproved()   { return this.isSeller() && this.getSellerStatus() === 'approved'; },
        isSellerRejected()   { return this.getSellerStatus() === 'rejected'; },
        isSellerNeedsInfo()  { return this.getSellerStatus() === 'needs_info'; },
        isSellerSuspended()  { return this.getSellerStatus() === 'suspended'; },

        /* ---------- Capacidades ---------- */
        canViewPublications() { return true; },
        canFavorite()         { return this.isAuthenticated(); },
        canMessage()          { return this.isAuthenticated(); },
        canRequestSeller() {
            if (!this.isAuthenticated()) return false;
            const s = this.getSellerStatus();
            return s === 'none' || s === 'rejected' || s === 'needs_info';
        },
        canPublish() {
            return this.isAuthenticated()
                && this.isSellerApproved()
                && this.isActive();
        },

        /**
         * Solo se puede editar una publicación ACTIVA.
         * Firestore rechaza updates sobre 'sold' porque la regla
         * solo permite 'sold → deleted'. Por eso acotamos aquí.
         */
        canEditPublication(pub) {
            return this.canPublish()
                && pub
                && pub.userId === AppState.currentUser.uid
                && pub.status === 'active';
        },

        /**
         * Se puede eliminar (soft-delete) una publicación ACTIVA o
         * VENDIDA (reciente). No tiene sentido eliminar una ya eliminada.
         */
        canDeletePublication(pub) {
            return this.canPublish()
                && pub
                && pub.userId === AppState.currentUser.uid
                && (pub.status === 'active' || pub.status === 'sold');
        },

        canMarkAsSold(pub) {
            return this.canPublish()
                && pub
                && pub.userId === AppState.currentUser.uid
                && pub.status === 'active';
        },

        /* ---------- Mensaje humano para acciones bloqueadas ---------- */
        reasonCannotPublish() {
            if (!this.isAuthenticated()) return 'Inicia sesión para publicar.';
            if (this.isSellerPending())   return 'Tu solicitud de vendedor está en revisión.';
            if (this.isSellerNeedsInfo()) return 'La administración solicitó información adicional. Revisa tu solicitud para continuar.';
            if (this.isSellerRejected())  return 'Tu solicitud de vendedor no fue aprobada. Corrígela para volver a intentarlo.';
            if (this.isSellerSuspended()) return 'Tu cuenta de vendedor está suspendida temporalmente.';
            return 'Necesitas ser vendedor aprobado para publicar.';
        }
    };
})();