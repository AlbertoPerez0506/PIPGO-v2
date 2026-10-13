/* =====================================================
   PIPGO · APP STATE
   -----------------------------------------------------
   v2.0:
   - resetSession() limpia userCity/userCoords/locationPermission
     para evitar "fantasmas" tras logout (F-17).
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

        // F-17: limpiar ubicación "fantasma" tras logout.
        this.userCity = null;
        this.userCoords = null;
        this.locationPermission = null;

        if (window.SellerProfileService && SellerProfileService.clearCache) {
            try { SellerProfileService.clearCache(); } catch (e) {}
        }
        if (window.FollowService && FollowService.clearCache) {
            try { FollowService.clearCache(); } catch (e) {}
        }
    }
};