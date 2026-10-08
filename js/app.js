/* =====================================================
   PIPGO · APP BOOTSTRAP
   ===================================================== */

(function () {
    'use strict';

    let cityDetectionInFlight = null;

    function initializeFeatures() {
        AuthUI.init();
        ProfileUI.init();
        PublicationUI.init();
        FavoriteUI.init();
        SellerUI.init();
        AdminUI.init();
        SellerProfileUI.init();
        MessagingUI.init();
        LegalUI.init();
    }

    function getTimeGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 19) return 'Buenas tardes';
        return 'Buenas noches';
    }

    function updateHomeGreeting(user) {
        const greetingEl = document.getElementById('home-greeting');
        if (!greetingEl) return;
        const prefix = getTimeGreeting();
        if (user && AppState.currentProfile && AppState.currentProfile.username) {
            greetingEl.textContent = `${prefix}, ${AppState.currentProfile.username}`;
        } else {
            greetingEl.textContent = prefix;
        }
    }

    function updateLocationChip(cityName) {
        const textEl = document.getElementById('location-text');
        if (!textEl) return;
        textEl.textContent = cityName || 'Sin ubicación';
    }

    async function detectAndUpdateCity() {
        if (cityDetectionInFlight) return cityDetectionInFlight;

        cityDetectionInFlight = (async () => {
            try {
                const { cityName } = await LocationService.detectUserCity();
                if (cityName) {
                    AppState.userCity = cityName;
                    Storage.set('user_city', cityName);
                    updateLocationChip(cityName);
                    return;
                }
            } catch (e) {}

            const cached = Storage.get('user_city', null);
            if (cached) {
                AppState.userCity = cached;
                updateLocationChip(cached);
            } else {
                updateLocationChip('Emiliano Zapata');
            }
        })();

        try {
            return await cityDetectionInFlight;
        } finally {
            cityDetectionInFlight = null;
        }
    }

    function initLocationHeader() {
        const cached = Storage.get('user_city', null);
        if (cached) {
            AppState.userCity = cached;
            updateLocationChip(cached);
        } else {
            updateLocationChip('Detectando…');
        }

        const chip = document.getElementById('location-chip');
        if (chip) {
            chip.addEventListener('click', async () => {
                Toast.info('Detectando tu ubicación…');
                await detectAndUpdateCity();
                if (AppState.userCity) Toast.success(`Ubicación: ${AppState.userCity}`);
            });
        }

        if (!cached) {
            setTimeout(detectAndUpdateCity, 800);
        }
    }

    function initHomeHeaderScroll() {
        const main = document.getElementById('main-content');
        const header = document.getElementById('home-header');
        const hero = document.getElementById('home-hero');
        if (!main || !header || !hero) return;

        const DELTA_THRESHOLD   = 18;
        const MIN_Y             = 80;
        const TRANSITION_LOCK_MS = 260;

        let lastY = main.scrollTop;
        let accumulated = 0;
        let ticking = false;
        let locked = false;
        let lockTimer = null;

        function lock() {
            locked = true;
            clearTimeout(lockTimer);
            lockTimer = setTimeout(() => {
                locked = false;
                lastY = main.scrollTop;
                accumulated = 0;
            }, TRANSITION_LOCK_MS);
        }

        function setHidden(hidden) {
            if (header.classList.contains('hero-hidden') === hidden) return;
            header.classList.toggle('hero-hidden', hidden);
            lock();
        }

        function reset() {
            header.classList.remove('hero-hidden');
            lastY = main.scrollTop;
            accumulated = 0;
            locked = false;
            clearTimeout(lockTimer);
        }

        main.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                ticking = false;

                const y = main.scrollTop;

                if (AppState.currentView !== 'home') {
                    if (header.classList.contains('hero-hidden')) {
                        header.classList.remove('hero-hidden');
                    }
                    lastY = y;
                    accumulated = 0;
                    return;
                }

                if (y <= 8) {
                    accumulated = 0;
                    if (header.classList.contains('hero-hidden')) {
                        header.classList.remove('hero-hidden');
                    }
                    lastY = y;
                    return;
                }

                const delta = y - lastY;
                lastY = y;

                if (locked) return;

                if ((accumulated > 0 && delta < 0) || (accumulated < 0 && delta > 0)) {
                    accumulated = 0;
                }
                accumulated += delta;

                if (accumulated >= DELTA_THRESHOLD && y > MIN_Y) {
                    setHidden(true);
                    accumulated = 0;
                } else if (accumulated <= -DELTA_THRESHOLD) {
                    setHidden(false);
                    accumulated = 0;
                }
            });
        }, { passive: true });

        window.PipGoHomeHeader = { reset };
    }

    function initPullToRefresh() {
        const main = document.getElementById('main-content');
        if (!main) return;

        const indicator = document.createElement('div');
        indicator.className = 'ptr-indicator';
        indicator.innerHTML = '<i class="fa-solid fa-arrow-rotate-right"></i>';
        main.appendChild(indicator);

        let startY = 0;
        let pulling = false;
        let refreshing = false;
        const THRESHOLD = 70;
        const MAX_PULL = 110;

        main.addEventListener('touchstart', (e) => {
            if (main.scrollTop > 0 || refreshing) return;
            if (e.touches.length !== 1) return;
            startY = e.touches[0].clientY;
            pulling = true;
        }, { passive: true });

        main.addEventListener('touchmove', (e) => {
            if (!pulling || refreshing) return;
            const dy = e.touches[0].clientY - startY;
            if (dy <= 0) { pulling = false; return; }

            const clamped = Math.min(dy * 0.5, MAX_PULL);
            indicator.classList.add('visible', 'pulling');
            indicator.style.transform = `translateY(${clamped - 60}px)`;
            indicator.style.setProperty('--ptr-deg', (clamped * 2).toFixed(0));
        }, { passive: true });

        main.addEventListener('touchend', async () => {
            if (!pulling || refreshing) { pulling = false; return; }
            pulling = false;

            const currentY = parseFloat((indicator.style.transform.match(/-?\d+(\.\d+)?/) || [0])[0]) + 60;

            if (currentY >= THRESHOLD * 0.5) {
                refreshing = true;
                indicator.classList.remove('pulling');
                indicator.classList.add('refreshing');
                indicator.style.transform = 'translateY(20px)';

                try {
                    if (window.HapticsService) HapticsService.light();

                    if (AppState.currentView === 'home' && window.PublicationUI) {
                        const pubs = await PublicationService.getActivePublications();
                        AppState.currentPublications = pubs;
                        PublicationUI.onEnterHome();
                        PublicationUI.renderHomeFilters(pubs);
                    } else if (AppState.currentView === 'search') {
                        const pubs = await PublicationService.getActivePublications();
                        AppState.currentPublications = pubs;
                        PublicationUI.onEnterSearch();
                        const filtered = (typeof PublicationUI.getFilteredList === 'function')
                            ? PublicationUI.getFilteredList()
                            : AppState.currentPublications;
                        PublicationUI.renderSearchResults(filtered);
                    } else if (AppState.currentView === 'perfil' && window.ProfileUI) {
                        await ProfileUI.renderProfile();
                    } else if (AppState.currentView === 'messaging' && window.MessagingUI) {
                        await MessagingUI.onEnterMessaging();
                    }
                } catch (e) {
                    if (window.Logger) Logger.warn('Pull-to-refresh error', e);
                } finally {
                    setTimeout(() => {
                        indicator.classList.remove('visible', 'refreshing');
                        indicator.style.transform = '';
                        refreshing = false;
                    }, 400);
                }
            } else {
                indicator.classList.remove('visible', 'pulling');
                indicator.style.transform = '';
            }
        });
    }

    function runPendingAction() {
        const action = AppState.pendingAction;
        AppState.pendingAction = null;
        if (!action) return;

        switch (action.type) {
            case 'toggleFavorite':
                if (window.FavoriteUI) FavoriteUI.toggleFavorite(action.publicationId);
                break;

            case 'openChatWith':
                if (window.MessagingUI && MessagingUI.openChatWith) {
                    MessagingUI.openChatWith(action.sellerUid, {
                        fromPublication: !!action.fromPublication,
                        publicationContext: action.publicationContext || null
                    });
                }
                break;

            case 'openSellerForm':
                if (window.SellerUI) SellerUI.open();
                break;

            case 'followSeller':
                if (window.FollowService && AppState.currentUser && action.sellerUid) {
                    FollowService.follow(AppState.currentUser.uid, action.sellerUid)
                        .then(() => {
                            Toast.success('Ahora sigues a este vendedor.');
                            if (window.SellerProfileUI && SellerProfileUI.refreshFollowState) {
                                SellerProfileUI.refreshFollowState(action.sellerUid);
                            }
                            // Refrescar el corazón del sheet de producto si está abierto
                            if (window.PublicationUI && PublicationUI.refreshSheetFollowState) {
                                PublicationUI.refreshSheetFollowState(action.sellerUid);
                            }
                        })
                        .catch((e) => {
                            Toast.error(ErrorHandler.toUserMessage(e, { context: 'app.pendingFollow' }));
                        });
                }
                break;
        }
    }

    function initializeAuthObserver() {
        AuthService.onAuthStateChanged(async (user) => {
            const wasAuthenticated = !!AppState.currentUser;
            AppState.currentUser = user;

            if (user) {
                try {
                    let profile = await UserService.getProfile(user.uid);
                    if (!profile) {
                        for (let i = 0; i < 3 && !profile; i++) {
                            await new Promise(r => setTimeout(r, 300));
                            profile = await UserService.getProfile(user.uid);
                        }
                    }
                    AppState.currentProfile = profile;
                    if (profile) {
                        try { await FavoriteUI.loadFavorites(user.uid); } catch (e) {}
                        try {
                            AppState.followingIds = await FollowService.getFollowingIds(user.uid);
                        } catch (e) {
                            AppState.followingIds = new Set();
                        }
                    }
                } catch (error) {
                    Logger.error('Error cargando perfil al autenticar', error);
                    AppState.currentProfile = null;
                }
            } else {
                AppState.resetSession();
                if (wasAuthenticated && window.PublicationUI &&
                    PublicationUI.stopHomeSubscription) {
                    PublicationUI.stopHomeSubscription();
                }
                if (AppState.currentView === 'messaging' && window.MessagingUI) {
                    MessagingUI.onEnterMessaging();
                }
            }

            try { updateHomeGreeting(user); } catch (e) {}
            try { if (window.PublicationUI && PublicationUI.updateAuthUI) PublicationUI.updateAuthUI(); } catch (e) {}
            try { if (window.ProfileUI && ProfileUI.renderProfile) ProfileUI.renderProfile(); } catch (e) {}
            try { if (window.FavoriteUI && FavoriteUI.updateAllButtons) FavoriteUI.updateAllButtons(); } catch (e) {}

            if (user && AppState.pendingAction) {
                setTimeout(runPendingAction, 180);
            }
        });
    }

    function initGlobalEscapeHandler() {
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;

            if (window.MessagingUI && MessagingUI.isChatOpen && MessagingUI.isChatOpen()) {
                e.preventDefault(); MessagingUI.closeChat(); return;
            }
            if (window.SellerProfileUI && SellerProfileUI.isOpen && SellerProfileUI.isOpen()) {
                e.preventDefault(); SellerProfileUI.close(); return;
            }

            if (window.PublicationUI) {
                if (PublicationUI.isLightboxOpen && PublicationUI.isLightboxOpen()) {
                    e.preventDefault(); PublicationUI.closeLightbox(); return;
                }
                if (PublicationUI.isProductSheetOpen && PublicationUI.isProductSheetOpen()) {
                    e.preventDefault(); PublicationUI.closeProductSheet(); return;
                }
                if (PublicationUI.isPreviewModalOpen && PublicationUI.isPreviewModalOpen()) {
                    e.preventDefault(); PublicationUI.closePreview(); return;
                }
                if (PublicationUI.isFilterModalOpen && PublicationUI.isFilterModalOpen()) {
                    e.preventDefault(); PublicationUI.closeFilterModal(); return;
                }
            }

            if (window.AdminUI && AdminUI.isConfirmModalOpen && AdminUI.isConfirmModalOpen()) {
                e.preventDefault(); AdminUI.closeConfirm(); return;
            }
            if (window.AuthUI && AuthUI.isAuthModalOpen && AuthUI.isAuthModalOpen()) {
                e.preventDefault(); AuthUI.closeAuthModal(); return;
            }
            if (window.ProfileUI && ProfileUI.isSettingsModalOpen && ProfileUI.isSettingsModalOpen()) {
                e.preventDefault(); ProfileUI.closeSettings(); return;
            }
            if (window.LegalUI && LegalUI.isOpen && LegalUI.isOpen()) {
                e.preventDefault(); LegalUI.close(); return;
            }

            ['draft-modal', 'seller-modal'].forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.classList.contains('hidden')) {
                    e.preventDefault();
                    el.classList.add('hidden');
                }
            });
        });
    }

    async function bootstrap() {
        try {
            ConnectivityService.init();

            AppState.prefHapticsEnabled = Storage.get('pref_haptics_enabled', true);
            AppState.prefSoundsEnabled = Storage.get('pref_sounds_enabled', false);

            initializeFeatures();

            NavigationUI.init();
            initLocationHeader();
            initHomeHeaderScroll();
            initPullToRefresh();
            initGlobalEscapeHandler();
            initializeAuthObserver();
            PublicationUI.loadPublications();
            ConnectivityUI.init();
        } catch (error) {
            Logger.error('Error durante el bootstrap de PipGo', error);
            Toast.error('Ocurrió un problema al iniciar la aplicación.');
        }
    }

    if (window.cordova) {
        document.addEventListener('deviceready', bootstrap, { once: true });
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
    } else {
        bootstrap();
    }
})();