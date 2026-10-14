/* =====================================================
   PIPGO · APP BOOTSTRAP
   -----------------------------------------------------
   v2.5 (Ronda 5 — fixes de bugs reales):
   - initGlobalEscapeHandler() reordenado por z-index
     descendente:
       500 → Auth, Admin, Settings, Preview, Filter,
             Draft, Unsaved, Seller
       300 → Lightbox
       260 → SellerProfile
       100 → ProductSheet
     Esto corrige el bug donde ESC cerraba el sheet cuando
     Auth estaba encima.
   - Ahora también cierra Draft/Unsaved por ESC usando las
     nuevas APIs de PublicationUI.
   - BodyLock.reset() en logout sigue como red de seguridad.
   - Comentario actualizado para reflejar los modales con
     capture propio (ConfirmDialog, LegalUI, MessagingUI).

   Heredado v2.4:
   - window.BodyLock (conteo anidado) disponible global.
   - initGlobalEscapeHandler verificado vs FocusTrap.

   Heredado v2.3:
   - Storage user_city_cache único, migración legacy.

   Heredado v2.2:
   - initLocationHeader con cache TTL + refresh silencioso.
   - silentAutoRefreshCity solo con permiso granted.

   Heredado v2.1:
   - Guarda contra Firebase no disponible (F-07).
   - initializeFeatures con try/catch por feature.
   - F-17: limpieza completa del chip y caches tras logout.
   ===================================================== */

(function () {
    'use strict';

    let cityDetectionInFlight = null;

    /* =====================================================
       BODY LOCK — helper global (Ronda 4, integrado Ronda 5)
       -----------------------------------------------------
       Conteo anidado: si dos modales piden lock, el body
       permanece bloqueado hasta que el último lo libere.

       Uso desde cualquier módulo:
         BodyLock.acquire();   // al abrir un modal
         BodyLock.release();   // al cerrar ese modal
         BodyLock.isLocked();  // true | false

       Fallback defensivo (si por alguna razón este script no
       se cargó, los modales usan `document.body.style.overflow`
       directamente).
       ===================================================== */
    let _bodyLockCount = 0;
    let _bodyLockOriginal = '';

    window.BodyLock = {
        acquire() {
            if (_bodyLockCount === 0) {
                _bodyLockOriginal = document.body.style.overflow || '';
                document.body.style.overflow = 'hidden';
            }
            _bodyLockCount++;
        },
        release() {
            _bodyLockCount = Math.max(0, _bodyLockCount - 1);
            if (_bodyLockCount === 0) {
                document.body.style.overflow = _bodyLockOriginal || '';
                _bodyLockOriginal = '';
            }
        },
        isLocked() { return _bodyLockCount > 0; },
        /* Escape hatch: fuerza reset (por si algo se cuelga) */
        reset() {
            _bodyLockCount = 0;
            document.body.style.overflow = _bodyLockOriginal || '';
            _bodyLockOriginal = '';
        }
    };

    function initializeFeatures() {
        const features = [
            ['AuthUI',        () => AuthUI.init()],
            ['ProfileUI',     () => ProfileUI.init()],
            ['PublicationUI', () => PublicationUI.init()],
            ['FavoriteUI',    () => FavoriteUI.init()],
            ['SellerUI',      () => SellerUI.init()],
            ['AdminUI',       () => AdminUI.init()],
            ['SellerProfileUI', () => SellerProfileUI.init()],
            ['MessagingUI',   () => MessagingUI.init()],
            ['LegalUI',       () => LegalUI.init()],
            ['AboutUI',       () => AboutUI.init()]   // ← AÑADIR
        ];

        features.forEach(([name, initFn]) => {
            try {
                initFn();
            } catch (e) {
                Logger.error(`[bootstrap] ${name}.init falló`, e);
            }
        });
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

    async function detectAndUpdateCity({ force = false } = {}) {
        if (cityDetectionInFlight) return cityDetectionInFlight;

        cityDetectionInFlight = (async () => {
            try {
                const { cityName } = await LocationService.detectUserCity({
                    useStorageCache: !force
                });
                if (cityName) {
                    AppState.userCity = cityName;
                    updateLocationChip(cityName);
                    return;
                }
            } catch (e) { /* silencioso */ }

            const cached = LocationService.getCachedCity
                ? LocationService.getCachedCity({ allowStale: true })
                : null;

            if (cached && cached.city) {
                AppState.userCity = cached.city;
                updateLocationChip(cached.city);
            } else {
                updateLocationChip('Sin ubicación');
            }
        })();

        try {
            return await cityDetectionInFlight;
        } finally {
            cityDetectionInFlight = null;
        }
    }

    async function silentAutoRefreshCity() {
        try {
            if (!window.LocationService || !LocationService.getPermissionState) return;

            const state = await LocationService.getPermissionState();
            if (state !== 'granted') return;

            const { cityName } = await LocationService.detectUserCity({
                useStorageCache: false
            });

            if (cityName && cityName !== AppState.userCity) {
                AppState.userCity = cityName;
                updateLocationChip(cityName);
            }
        } catch (e) { /* silencioso */ }
    }

    function initLocationHeader() {
        let entry = null;

        if (window.LocationService && LocationService.getCachedCity) {
            entry = LocationService.getCachedCity({ allowStale: true });
        }

        if (entry && entry.city) {
            AppState.userCity = entry.city;
            updateLocationChip(entry.city);
            if (!entry.isFresh) silentAutoRefreshCity();
        } else {
            updateLocationChip('Sin ubicación');
        }

        const chip = document.getElementById('location-chip');
        if (chip) {
            chip.addEventListener('click', async () => {
                Toast.info('Detectando tu ubicación…');
                await detectAndUpdateCity({ force: true });
                if (AppState.userCity) {
                    Toast.success(`Ubicación: ${AppState.userCity}`);
                } else {
                    Toast.warning('No pudimos detectar tu ubicación.');
                }
            });
        }
    }

    function initHomeHeaderScroll() {
        const main = document.getElementById('main-content');
        const header = document.getElementById('home-header');
        const hero = document.getElementById('home-hero');
        if (!main || !header || !hero) return;

        const DELTA_THRESHOLD    = 18;
        const MIN_Y              = 80;
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
                    } else if (AppState.currentView === 'search' && window.PublicationUI) {
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
                if (window.FavoriteUI && FavoriteUI.toggleFavorite) {
                    FavoriteUI.toggleFavorite(action.publicationId);
                }
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

                silentAutoRefreshCity();
            } else {
                AppState.resetSession();

                Storage.remove('user_city_cache');
                Storage.remove('user_city');
                updateLocationChip('Sin ubicación');

                if (window.LocationService && LocationService.clearCache) {
                    try { LocationService.clearCache(); } catch (e) {}
                }

                if (wasAuthenticated && window.PublicationUI &&
                    PublicationUI.stopHomeSubscription) {
                    PublicationUI.stopHomeSubscription();
                }

                /* Ronda 5: red de seguridad. Si quedó algún body
                   lock colgado (ej. usuario cerró sesión con un
                   modal abierto), lo reseteamos. */
                if (window.BodyLock) BodyLock.reset();
            }

            if (AppState.currentView === 'messaging' && window.MessagingUI && MessagingUI.onEnterMessaging) {
                try { MessagingUI.onEnterMessaging(); } catch (e) {
                    Logger.error('Refresh messaging post-auth falló', e);
                }
            }

            try { updateHomeGreeting(user); } catch (e) {}
            try {
                if (window.PublicationUI && PublicationUI.updateAuthUI) PublicationUI.updateAuthUI();
            } catch (e) {}
            try {
                if (window.ProfileUI && ProfileUI.renderProfile) ProfileUI.renderProfile();
            } catch (e) {}
            try {
                if (window.FavoriteUI && FavoriteUI.updateAllButtons) FavoriteUI.updateAllButtons();
            } catch (e) {}

            if (user && AppState.pendingAction) {
                setTimeout(runPendingAction, 180);
            }
        });
    }

    /**
     * ESC handler global (Ronda 5).
     * -----------------------------------------------------
     * Orden por z-index descendente.
     *
     * Los siguientes modales tienen su PROPIO handler en
     * capture phase con stopImmediatePropagation; NO llegan
     * aquí (ganan antes de que app.js procese el ESC):
     *   - ConfirmDialog       (z-modal 500)
     *   - LegalUI             (z-modal 500)
     *   - MessagingUI chat    (z-chat 250)
     *   - Chat edit modal     (dentro de chat)
     *
     * Aquí solo procesamos ESC cuando nadie más lo reclamó:
     */
    function initGlobalEscapeHandler() {
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;

            // ---------- z-modal 500 (mutuamente excluyentes) ----------
            if (window.AuthUI && AuthUI.isAuthModalOpen && AuthUI.isAuthModalOpen()) {
                e.preventDefault(); AuthUI.closeAuthModal(); return;
            }
            if (window.AdminUI && AdminUI.isConfirmModalOpen && AdminUI.isConfirmModalOpen()) {
                e.preventDefault(); AdminUI.closeConfirm(); return;
            }
            if (window.ProfileUI && ProfileUI.isSettingsModalOpen && ProfileUI.isSettingsModalOpen()) {
                e.preventDefault(); ProfileUI.closeSettings(); return;
            }
            if (window.PublicationUI && PublicationUI.isPreviewModalOpen && PublicationUI.isPreviewModalOpen()) {
                e.preventDefault(); PublicationUI.closePreview(); return;
            }
            if (window.PublicationUI && PublicationUI.isFilterModalOpen && PublicationUI.isFilterModalOpen()) {
                e.preventDefault(); PublicationUI.closeFilterModal(); return;
            }
            if (window.PublicationUI && PublicationUI.isDraftModalOpen && PublicationUI.isDraftModalOpen()) {
                e.preventDefault(); PublicationUI.closeDraftModal(); return;
            }
            if (window.PublicationUI && PublicationUI.isUnsavedModalOpen && PublicationUI.isUnsavedModalOpen()) {
                e.preventDefault(); PublicationUI.closeUnsaved(); return;
            }
            {
                const sellerModal = document.getElementById('seller-modal');
                if (sellerModal && !sellerModal.classList.contains('hidden')) {
                    e.preventDefault();
                    if (window.SellerUI && SellerUI.close) SellerUI.close();
                    else sellerModal.classList.add('hidden');
                    return;
                }
            }

            // ---------- z-lightbox 300 ----------
            if (window.PublicationUI && PublicationUI.isLightboxOpen && PublicationUI.isLightboxOpen()) {
                e.preventDefault(); PublicationUI.closeLightbox(); return;
            }

            // ---------- z-seller-profile 260 ----------
            if (window.SellerProfileUI && SellerProfileUI.isOpen && SellerProfileUI.isOpen()) {
                e.preventDefault(); SellerProfileUI.close(); return;
            }

            // ---------- z-sheet 100 ----------
            if (window.PublicationUI && PublicationUI.isProductSheetOpen && PublicationUI.isProductSheetOpen()) {
                e.preventDefault(); PublicationUI.closeProductSheet(); return;
            }
        });
    }

    async function bootstrap() {
        if (!window.PipGoFirebaseReady) {
            Logger.error('Bootstrap abortado: Firebase no disponible.');
            Toast.error('No pudimos iniciar la aplicación. Revisa tu conexión e inténtalo de nuevo.');
            const splash = document.getElementById('pipgo-splash');
            if (splash) splash.remove();
            return;
        }

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