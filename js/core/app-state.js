/* =====================================================
   PIPGO · APP STATE
   -----------------------------------------------------
   PLAN D:
   - resetSession() también limpia currentUser.
     Antes dependía de que app.js lo hubiera seteado
     a null antes de llamar a resetSession; si se
     invocaba desde otro lado, quedaba una sesión
     "fantasma" en memoria.
   ===================================================== */

window.AppState = {
    currentUser: null,
    currentProfile: null,
    currentPublicProfile: null,

    currentPublications: [],
    favoriteIds: new Set(),
    followingIds: new Set(),

    currentView: 'home',
    currentProduct: null,

    currentLocation: null,
    userCity: null,
    userCoords: null,
    locationPermission: null,

    activeCategoryFilter: '',

    isSubmitting: false,
    formDirtyState: false,

    currentSellerApplication: null,

    pendingAction: null,

    homeSubscription: null,
    hasPendingHomeUpdates: false,
    pendingHomePublications: [],

    currentConversationId: null,

    prefHapticsEnabled: true,
    prefSoundsEnabled: false,

    resetSession() {
        this.currentUser = null;
        this.currentProfile = null;
        this.currentPublicProfile = null;
        this.favoriteIds = new Set();
        this.followingIds = new Set();
        this.currentLocation = null;
        this.currentProduct = null;
        this.isSubmitting = false;
        this.formDirtyState = false;
        this.currentSellerApplication = null;
        this.pendingAction = null;
        this.hasPendingHomeUpdates = false;
        this.pendingHomePublications = [];
        this.activeCategoryFilter = '';
        this.currentConversationId = null;

        if (window.SellerProfileService && SellerProfileService.clearCache) {
            try { SellerProfileService.clearCache(); } catch (e) {}
        }
        if (window.FollowService && FollowService.clearCache) {
            try { FollowService.clearCache(); } catch (e) {}
        }
    }
};