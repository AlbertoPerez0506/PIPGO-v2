/* =====================================================
   PIPGO · FAVORITE UI
   Just-in-time auth + haptics.
   ===================================================== */

(function () {
    let initialized = false;

    function init() {
        if (initialized) return;
        initialized = true;
        document.addEventListener('click', handleCardFavoriteClick, true);
        const sheetBtn = document.getElementById('btn-favorite');
        if (sheetBtn) sheetBtn.addEventListener('click', handleSheetFavoriteClick);
    }

    async function loadFavorites(uid) {
        try {
            AppState.favoriteIds = await FavoriteService.getFavoriteIds(uid);
            updateAllButtons();
        } catch (error) {
            Logger.error('Error cargando favoritos', error);
        }
    }

    function handleCardFavoriteClick(e) {
        const btn = e.target.closest('.product-favorite');
        if (!btn) return;
        e.stopPropagation();
        e.preventDefault();
        const pubId = btn.dataset.favId ||
            (btn.closest('.product-card') && btn.closest('.product-card').dataset.id);
        if (pubId) toggleFavorite(pubId);
    }

    function handleSheetFavoriteClick(e) {
        e.stopPropagation();
        if (AppState.currentProduct) toggleFavorite(AppState.currentProduct.id);
    }

    async function toggleFavorite(publicationId) {
        if (!AppState.currentUser) {
            AppState.pendingAction = { type: 'toggleFavorite', publicationId };
            AuthUI.openAuthModal('login');
            Toast.info('Inicia sesión para guardar publicaciones.');
            return;
        }
        try {
            const isFavorite = await FavoriteService.toggleFavorite(AppState.currentUser.uid, publicationId);
            if (isFavorite) AppState.favoriteIds.add(publicationId);
            else            AppState.favoriteIds.delete(publicationId);

            if (window.HapticsService) HapticsService.light();

            updateAllButtons();
            Toast.success(isFavorite ? 'Guardado en favoritos.' : 'Eliminado de favoritos.');
            if (AppState.currentView === 'perfil') ProfileUI.renderProfile();
        } catch (error) {
            Logger.error('Error actualizando favorito', error);
            Toast.error('No pudimos actualizar el favorito.');
        }
    }

    function updateAllButtons() {
        document.querySelectorAll('.product-favorite').forEach(btn => {
            const pubId = btn.dataset.favId ||
                (btn.closest('.product-card') && btn.closest('.product-card').dataset.id);
            if (!pubId) return;
            const icon = btn.querySelector('i');
            if (!icon) return;
            const isFav = AppState.favoriteIds.has(pubId);
            icon.className = isFav ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
            btn.classList.toggle('is-fav', isFav);
        });

        const sheetBtn = document.getElementById('btn-favorite');
        if (sheetBtn && AppState.currentProduct) {
            const icon = sheetBtn.querySelector('i');
            if (!icon) return;
            const isFav = AppState.favoriteIds.has(AppState.currentProduct.id);
            icon.className = isFav ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
            icon.style.color = isFav ? 'var(--primary)' : '';
        }
    }

    window.FavoriteUI = { init, loadFavorites, updateAllButtons, toggleFavorite };
})();