(function () {
    let views, navItems, mainContent, homeSearchBtn, homeSearchTrigger, btnVerTodos;
    let navigationStack = ['home'];
    let initialized = false;

    function switchView(viewName, { push = false, force = false } = {}) {
        const isSameView = viewName === AppState.currentView;

        if (isSameView && push && !force) {
            mainContent.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        if (isSameView && !push && !force) return;

        if (!force &&
            AppState.currentView === 'anunciarme' &&
            viewName !== 'anunciarme' &&
            window.PublicationUI &&
            PublicationUI.hasUnsavedChanges &&
            PublicationUI.hasUnsavedChanges()) {
            PublicationUI.confirmLeave(() => {
                if (window.PublicationUI.resetFormMode) PublicationUI.resetFormMode();
                switchView(viewName, { push, force: true });
            });
            return;
        }

        const previousView = AppState.currentView;
        const leavingHome  = previousView === 'home' && viewName !== 'home';
        const enteringHome = viewName === 'home' && previousView !== 'home';

        AppState.currentView = viewName;

        views.forEach(v => v.classList.remove('active'));
        const target = document.getElementById(`view-${viewName}`);
        if (target) target.classList.add('active');

        navItems.forEach(item => item.classList.toggle('active', item.dataset.view === viewName));

        mainContent.scrollTo({ top: 0, behavior: 'smooth' });

        if (leavingHome && window.PublicationUI && PublicationUI.onLeaveHome) {
            PublicationUI.onLeaveHome();
        }
        if (enteringHome) {
            if (window.PipGoHomeHeader) window.PipGoHomeHeader.reset();
            if (window.PublicationUI && PublicationUI.onEnterHome) PublicationUI.onEnterHome();
        }

        if (viewName === 'anunciarme') PublicationUI.updateAuthUI();

        if (viewName === 'perfil') {
            if (previousView !== 'perfil' && window.ProfileUI && ProfileUI.resetActiveTab) {
                ProfileUI.resetActiveTab();
            }
            ProfileUI.renderProfile();
        }

        if (viewName === 'search') PublicationUI.onEnterSearch();
        if (viewName === 'admin' && window.AdminUI) AdminUI.onEnterAdmin();
        if (viewName === 'messaging' && window.MessagingUI) MessagingUI.onEnterMessaging();

        if (push) {
            const last = navigationStack[navigationStack.length - 1];
            if (viewName !== last) {
                navigationStack.push(viewName);
                history.pushState({ view: viewName }, '', '');
            }
        }
    }

    function focusSearchInput(delay = 320) {
        setTimeout(() => {
            const input = document.getElementById('search-input');
            if (input) input.focus();
        }, delay);
    }

    function closeAllOverlays() {
        if (window.LegalUI && LegalUI.isOpen && LegalUI.isOpen()) {
            LegalUI.close(true); return true;
        }
        if (window.MessagingUI && MessagingUI.isChatOpen && MessagingUI.isChatOpen()) {
            MessagingUI.closeChat(); return true;
        }
        if (window.SellerProfileUI && SellerProfileUI.isOpen && SellerProfileUI.isOpen()) {
            SellerProfileUI.close(); return true;
        }

        if (PublicationUI.isProductSheetOpen && PublicationUI.isProductSheetOpen()) {
            PublicationUI.closeProductSheet(true); return true;
        }
        if (PublicationUI.isLightboxOpen && PublicationUI.isLightboxOpen()) {
            PublicationUI.closeLightbox(true); return true;
        }
        if (PublicationUI.isPreviewModalOpen && PublicationUI.isPreviewModalOpen()) {
            PublicationUI.closePreview(true); return true;
        }
        if (AuthUI.isAuthModalOpen && AuthUI.isAuthModalOpen()) {
            AuthUI.closeAuthModal(); return true;
        }
        if (PublicationUI.isFilterModalOpen && PublicationUI.isFilterModalOpen()) {
            PublicationUI.closeFilterModal(); return true;
        }
        if (ProfileUI.isSettingsModalOpen && ProfileUI.isSettingsModalOpen()) {
            ProfileUI.closeSettings(); return true;
        }
        if (window.AdminUI && AdminUI.isConfirmModalOpen && AdminUI.isConfirmModalOpen()) {
            AdminUI.closeConfirm(); return true;
        }
        if (window.SellerUI) {
            const sellerModal = document.getElementById('seller-modal');
            if (sellerModal && !sellerModal.classList.contains('hidden')) {
                SellerUI.close(); return true;
            }
        }
        return false;
    }

    function onBackButton(e) {
        // Overlay más alto primero (por z-index).
        if (window.LegalUI && LegalUI.isOpen && LegalUI.isOpen()) {
            e.preventDefault(); LegalUI.close(); return;
        }
        if (window.SellerProfileUI && SellerProfileUI.isOpen && SellerProfileUI.isOpen()) {
            e.preventDefault(); SellerProfileUI.close(); return;
        }
        if (window.MessagingUI && MessagingUI.isChatOpen && MessagingUI.isChatOpen()) {
            e.preventDefault(); MessagingUI.closeChat(); return;
        }
        if (PublicationUI.isLightboxOpen && PublicationUI.isLightboxOpen()) {
            e.preventDefault(); PublicationUI.closeLightbox(); return;
        }
        if (PublicationUI.isProductSheetOpen && PublicationUI.isProductSheetOpen()) {
            e.preventDefault(); PublicationUI.closeProductSheet(); return;
        }
        if (PublicationUI.isPreviewModalOpen && PublicationUI.isPreviewModalOpen()) {
            e.preventDefault(); PublicationUI.closePreview(); return;
        }
        if (closeAllOverlays()) { e.preventDefault(); return; }
        if (navigationStack.length > 1) { e.preventDefault(); history.back(); return; }
        if (window.cordova && navigator.app) { e.preventDefault(); navigator.app.exitApp(); }
    }

    function applyPopstateChange(targetView) {
        if (!targetView || targetView === 'home') {
            if (AppState.currentView !== 'home') {
                navigationStack = ['home'];
                switchView('home', { push: false, force: true });
            }
            return;
        }
        const idx = navigationStack.indexOf(targetView);
        if (idx >= 0) navigationStack = navigationStack.slice(0, idx + 1);
        else navigationStack = [targetView];
        switchView(targetView, { push: false, force: true });
    }

    function handlePopState(event) {
        // Suppression: un overlay cerró con history.back() y no
        // quiere que el popstate cierre el overlay que está debajo.
        if (PublicationUI.consumeSuppressPopstate && PublicationUI.consumeSuppressPopstate()) return;
        if (window.MessagingUI && MessagingUI.consumeSuppressPopstate && MessagingUI.consumeSuppressPopstate()) return;
        if (window.SellerProfileUI && SellerProfileUI.consumeSuppressPopstate && SellerProfileUI.consumeSuppressPopstate()) return;
        if (window.LegalUI && LegalUI.consumeSuppressPopstate && LegalUI.consumeSuppressPopstate()) return;

        // Overlay más alto primero (por z-index).
        if (window.LegalUI && LegalUI.isOpen && LegalUI.isOpen()) {
            LegalUI.close(false); return;
        }
        if (window.SellerProfileUI && SellerProfileUI.isOpen && SellerProfileUI.isOpen()) {
            SellerProfileUI.close(false); return;
        }
        if (window.MessagingUI && MessagingUI.isChatOpen && MessagingUI.isChatOpen()) {
            MessagingUI.closeChat(false); return;
        }
        if (PublicationUI.isLightboxOpen && PublicationUI.isLightboxOpen()) {
            PublicationUI.closeLightbox(false); return;
        }
        if (PublicationUI.isProductSheetOpen && PublicationUI.isProductSheetOpen()) {
            PublicationUI.closeProductSheet(false); return;
        }
        if (PublicationUI.isPreviewModalOpen && PublicationUI.isPreviewModalOpen()) {
            PublicationUI.closePreview(false); return;
        }
        if (window.AdminUI && AdminUI.isConfirmModalOpen && AdminUI.isConfirmModalOpen()) {
            AdminUI.closeConfirm(); return;
        }

        const targetView = (event.state && event.state.view) || 'home';

        if (AppState.currentView === 'anunciarme' &&
            targetView !== 'anunciarme' &&
            window.PublicationUI &&
            PublicationUI.hasUnsavedChanges &&
            PublicationUI.hasUnsavedChanges()) {

            history.pushState({ view: 'anunciarme' }, '', '');
            PublicationUI.confirmLeave(() => {
                if (window.PublicationUI.resetFormMode) PublicationUI.resetFormMode();
                applyPopstateChange(targetView);
            });
            return;
        }

        applyPopstateChange(targetView);
    }

    function init() {
        if (initialized) return;
        initialized = true;

        views = document.querySelectorAll('.view');
        navItems = document.querySelectorAll('.nav-item');
        mainContent = document.getElementById('main-content');
        homeSearchBtn = document.getElementById('home-search-btn');
        homeSearchTrigger = document.getElementById('home-search-trigger');
        btnVerTodos = document.getElementById('btn-ver-todos');

        navigationStack = ['home'];
        history.replaceState({ view: 'home' }, '', '');

        navItems.forEach(item => {
            item.addEventListener('click', () => switchView(item.dataset.view, { push: true }));
        });

        if (homeSearchBtn) {
            homeSearchBtn.addEventListener('click', () => {
                switchView('search', { push: true });
                focusSearchInput();
            });
        }
        if (homeSearchTrigger) {
            homeSearchTrigger.addEventListener('click', () => {
                switchView('search', { push: true });
                focusSearchInput();
            });
        }
        if (btnVerTodos) {
            btnVerTodos.addEventListener('click', () => {
                switchView('search', { push: true });
                PublicationUI.showAllPublications();
            });
        }

        window.addEventListener('popstate', handlePopState);

        if (window.cordova) {
            document.addEventListener('backbutton', onBackButton, false);
        }
    }

    window.NavigationUI = {
        init,
        switchView: (name) => switchView(name, { push: true })
    };
})();