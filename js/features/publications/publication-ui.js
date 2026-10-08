/* =====================================================
   PIPGO · PUBLICATION UI
   Home (realtime), Search, Form (crear/editar), Sheet,
   Lightbox, WhatsApp, unidades, condición, presentación,
   contador, vista previa, borrador, protección de salida,
   empty states inteligentes, skeletons y haptics.
   + Integración con SellerProfileUI, MessagingUI,
     búsqueda de vendedores y corazón de follow.
   ===================================================== */

(function () {

    /* ---------------------------------------------------
       REFERENCIAS DOM
       --------------------------------------------------- */
    let publicationForm, stepType, typeCalle, typeEstablecimiento, btnBackType;
    let btnGetLocation, productRefInput, btnSubmit, btnSubmitText, formError;
    let loginRequired, formWrapper, productsGrid, searchResults, searchInput;
    let clearSearch, searchSuggestions, suggestionChips, searchSubtitle;
    let searchSellersSection, searchSellersResults;
    let sheetBackdrop, productSheet;
    let sheetDragZone, galleryTrack, galleryDots, galleryClose, galleryPrev, galleryNext;
    let sheetCategory, sheetName, sheetStore, sheetPrice, sheetTime, sheetDesc;
    let sheetRefsBlock, sheetRefs, sheetRef;
    let sheetContactRow, sheetPhone, sheetCall, sheetWhatsapp;
    let sheetScheduleBlock, sheetScheduleText, sheetBadgesRow;
    let sheetSellerBlock, sheetSellerAvatar, sheetSellerUsername, sheetSellerFollowBtn;
    let btnDirections, sheetMapLink, btnChatV2;

    let productHasWhatsappInput;
    let productPriceInput;

    let productCategorySelect;
    let unitGroup, productUnitSelect, unitHint;
    let conditionGroup, conditionChips;
    let presentationGroup, productPresentationQty, productPresentationUnit;
    let descriptionInput, descriptionCounter;

    let previewModal, previewClose, previewBody, previewBack, previewPublish, btnPreview;

    let homeNewBanner, homeNewBannerText;

    let draftModal, draftContinueBtn, draftDiscardBtn, draftCloseBtn;
    let unsavedModal;

    /* Horario (form) */
    let scheduleToggle, schedulePanel, scheduleDays, scheduleStart, scheduleEnd;
    let scheduleToggleText, btnClearSchedule;

    let lightbox, lightboxTrack, lightboxClose, lightboxCounter, lightboxDots;

    let photoSlots = [];

    /* Estado del sheet */
    let currentGalleryIndex = 0;
    let isSheetOpen = false;
    let isDraggingSheet = false;
    let sheetStartY = 0, sheetCurrentY = 0;

    /* Control de historial de overlays */
    let productSheetHistoryPushed = false;
    let lightboxHistoryPushed = false;
    let previewHistoryPushed = false;
    let suppressPopstate = false;

    /* Filtros
       -----------------------------------------------------
       activeFilterCategory / activeFilterSeller son EXCLUSIVOS
       de la vista Search. El Home tiene su propio filtro en
       AppState.activeCategoryFilter. Son independientes. */
    let filterModal, filterClose, filterApply, filterCategory, filterSeller;
    let activeFilterCategory = '';
    let activeFilterSeller = '';

    /* Lightbox */
    let lightboxImages = [];
    let lightboxIndex = 0;
    let lbDragging = false, lbStartX = 0, lbCurX = 0;
    let lbPointers = new Map();
    let lbPinchStart = 0, lbPinchScale = 1, lbCurrentScale = 1, lbActiveImg = null;

    /* Realtime Home */
    let homeUnsubscribe = null;
    let homeIsFirstSnapshotOfSubscription = false;
    let pendingHomePublications = [];

    /* Búsqueda */
    let searchDebounceTimer = null;
    const SEARCH_DEBOUNCE_MS = 180;

    /* Búsqueda de vendedores */
    let sellerSearchToken = 0;

    /* Borrador */
    const DRAFT_KEY = 'publication_draft';
    const DRAFT_SAVE_DELAY = 400;
    let draftSaveTimeout = null;

    let initialized = false;

    /* =====================================================
       HELPERS DE FORM
       ===================================================== */
    function showFormError(message) {
        formError.textContent = message;
        formError.classList.remove('hidden');
        try { formError.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    }
    function hideFormError() { formError.classList.add('hidden'); }

    function setSubmitButton(text, iconClass) {
        btnSubmitText.textContent = text;
        if (iconClass) {
            const icon = btnSubmit.querySelector('i');
            if (icon) icon.className = `fa-solid ${iconClass}`;
        }
    }

    function fillSelectWithUnits(select, units, { emptyOption = false } = {}) {
        select.innerHTML = '';
        if (emptyOption) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Sin unidad';
            select.appendChild(opt);
        }
        units.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.code;
            opt.textContent = u.label;
            select.appendChild(opt);
        });
    }

    function sortByCreatedAtDesc(a, b) {
        const ta = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
        const tb = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
        return tb - ta;
    }

    function updateFilterBadge() {
        const badge = document.getElementById('filter-badge');
        if (!badge) return;
        const hasFilters = !!(activeFilterCategory || activeFilterSeller);
        badge.classList.toggle('hidden', !hasFilters);
    }

    function updateSearchSubtitle() {
        if (!searchSubtitle) return;
        const query = searchInput ? searchInput.value.trim() : '';
        const count = searchResults ? searchResults.querySelectorAll('.product-card').length : 0;

        if (query) {
            searchSubtitle.textContent = `${count} resultado${count === 1 ? '' : 's'} para "${query}"`;
        } else if (activeFilterCategory || activeFilterSeller) {
            searchSubtitle.textContent = `${count} resultado${count === 1 ? '' : 's'} con filtros`;
        } else {
            searchSubtitle.textContent = 'Descubre productos cerca de ti';
        }
    }

    /* =====================================================
       AUTH / PERMISOS
       ===================================================== */
    function updateAuthUI() {
        const canPublish = window.PermissionService && PermissionService.canPublish();
        if (canPublish) {
            loginRequired.classList.add('hidden');
            formWrapper.classList.remove('hidden');
        } else {
            loginRequired.classList.remove('hidden');
            formWrapper.classList.add('hidden');
            renderLoginRequiredState();
        }
    }

    function renderLoginRequiredState() {
        const container = document.getElementById('login-required');
        if (!container) return;

        if (!window.PermissionService || !PermissionService.isAuthenticated()) {
            container.innerHTML = `
                <i class="fa-solid fa-user-lock"></i>
                <h3>Necesitas iniciar sesión</h3>
                <p>Para publicar un anuncio debes estar autenticado.</p>
                <button class="btn-primary" id="btn-go-auth">Iniciar sesión</button>`;
            const btn = document.getElementById('btn-go-auth');
            if (btn) btn.addEventListener('click', () => AuthUI.openAuthModal('login'));
            return;
        }

        const status = PermissionService.getSellerStatus();

        if (status === 'pending') {
            container.innerHTML = `
                <i class="fa-solid fa-hourglass-half" style="color:var(--primary);"></i>
                <h3>Solicitud en revisión</h3>
                <p>Tu solicitud para vender en PipGo está siendo revisada.</p>
                <button class="btn-primary" id="btn-seller-view">Ver solicitud</button>`;
            const b = document.getElementById('btn-seller-view');
            if (b) b.addEventListener('click', () => SellerUI.open());
            return;
        }

        if (status === 'needs_info') {
            container.innerHTML = `
                <i class="fa-solid fa-circle-info" style="color:var(--primary);"></i>
                <h3>Información requerida</h3>
                <p>La administración solicitó información adicional. Revisa tu solicitud para continuar.</p>
                <button class="btn-primary" id="btn-seller-fix-info">Revisar solicitud</button>`;
            const b = document.getElementById('btn-seller-fix-info');
            if (b) b.addEventListener('click', () => SellerUI.open());
            return;
        }

        if (status === 'rejected') {
            container.innerHTML = `
                <i class="fa-solid fa-circle-exclamation" style="color:var(--danger-fg);"></i>
                <h3>Solicitud no aprobada</h3>
                <p>Corrige tu información y vuelve a enviarla para poder publicar.</p>
                <button class="btn-primary" id="btn-seller-fix">Corregir solicitud</button>`;
            const b = document.getElementById('btn-seller-fix');
            if (b) b.addEventListener('click', () => SellerUI.open());
            return;
        }

        if (status === 'suspended') {
            container.innerHTML = `
                <i class="fa-solid fa-ban" style="color:var(--text-tertiary);"></i>
                <h3>Cuenta suspendida</h3>
                <p>Tu cuenta de vendedor está suspendida temporalmente.</p>`;
            return;
        }

        container.innerHTML = `
            <i class="fa-solid fa-store"></i>
            <h3>Conviértete en vendedor</h3>
            <p>Solicita ser vendedor para publicar tus productos en PipGo.</p>
            <button class="btn-primary" id="btn-seller-request">Quiero vender</button>`;
        const b = document.getElementById('btn-seller-request');
        if (b) b.addEventListener('click', () => SellerUI.open());
    }

    /* =====================================================
       SKELETONS
       ===================================================== */
    function renderSkeletons(container, count = 6) {
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const sk = document.createElement('div');
            sk.className = 'skeleton-card';
            sk.innerHTML = `
                <div class="skeleton-img"></div>
                <div class="skeleton-info">
                    <div class="skeleton-line w-60"></div>
                    <div class="skeleton-line w-80"></div>
                    <div class="skeleton-line w-40"></div>
                </div>`;
            container.appendChild(sk);
        }
    }

    /* =====================================================
       CARGA DE PUBLICACIONES
       ===================================================== */
    async function loadPublications() {
        if (AppState.currentView === 'home') {
            startHomeSubscription();
            return;
        }

        try {
            if (!AppState.currentPublications.length) {
                renderSkeletons(productsGrid, 6);
            }

            AppState.currentPublications = await PublicationService.getActivePublications();
            renderHomeFilters(AppState.currentPublications);
            renderSearchSuggestions(AppState.currentPublications);

            if (AppState.currentView === 'search') {
                renderSearchResults(getFilteredList());
            } else {
                const homeList = AppState.activeCategoryFilter
                    ? AppState.currentPublications.filter(p => p.category === AppState.activeCategoryFilter)
                    : AppState.currentPublications;
                renderProducts(productsGrid, homeList);
            }
        } catch (error) {
            Logger.error('Error cargando publicaciones', error);
            if (productsGrid) {
                productsGrid.innerHTML = `
                    <div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--text-tertiary);">
                        <i class="fa-solid fa-cloud-exclamation" style="font-size:32px;display:block;margin-bottom:12px;"></i>
                        <p style="font-size:14px;">No pudimos cargar las publicaciones.</p>
                    </div>`;
            }
        }
    }

    /* =====================================================
       TIEMPO REAL — HOME
       ===================================================== */
    function startHomeSubscription() {
        if (homeUnsubscribe) return;

        if (!AppState.currentPublications.length) {
            renderSkeletons(productsGrid, 6);
        }

        homeIsFirstSnapshotOfSubscription = true;

        homeUnsubscribe = PublicationService.subscribeActivePublications(
            (changes, snapshot) => handleHomeSnapshot(changes, snapshot),
            (error) => {
                Logger.error('Realtime Home error', error);
                homeUnsubscribe = null;
                (async () => {
                    try {
                        AppState.currentPublications = await PublicationService.getActivePublications();
                        rerenderHome();
                        renderHomeFilters(AppState.currentPublications);
                        renderSearchSuggestions(AppState.currentPublications);
                    } catch (e) { /* noop */ }
                })();
            }
        );
        AppState.homeSubscription = homeUnsubscribe;
    }

    function stopHomeSubscription() {
        if (homeUnsubscribe) {
            try { homeUnsubscribe(); } catch (e) {}
            homeUnsubscribe = null;
        }
        AppState.homeSubscription = null;
        hideHomeNewBanner();
    }

    function handleHomeSnapshot(changes, snapshot) {
        if (homeIsFirstSnapshotOfSubscription) {
            homeIsFirstSnapshotOfSubscription = false;
            const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            AppState.currentPublications = all;
            rerenderHome();
            renderHomeFilters(AppState.currentPublications);
            renderSearchSuggestions(AppState.currentPublications);
            if (AppState.currentView === 'search') renderSearchResults(getFilteredList());
            return;
        }

        if (changes.removed.length) {
            const removedIds = new Set(changes.removed.map(p => p.id));
            AppState.currentPublications = AppState.currentPublications.filter(p => !removedIds.has(p.id));
            pendingHomePublications = pendingHomePublications.filter(p => !removedIds.has(p.id));
            if (!pendingHomePublications.length) hideHomeNewBanner();
        }

        if (changes.modified.length) {
            const modMap = new Map(changes.modified.map(p => [p.id, p]));
            AppState.currentPublications = AppState.currentPublications.map(p =>
                modMap.has(p.id) ? modMap.get(p.id) : p
            );
            pendingHomePublications = pendingHomePublications.map(p =>
                modMap.has(p.id) ? modMap.get(p.id) : p
            );
        }

        if (changes.added.length) {
            const main = document.getElementById('main-content');
            const scrollTop = main ? main.scrollTop : 0;
            const atTop = scrollTop < 100;
            const isOnHome = AppState.currentView === 'home';

            const existingIds = new Set([
                ...AppState.currentPublications.map(p => p.id),
                ...pendingHomePublications.map(p => p.id)
            ]);
            const newItems = changes.added.filter(p => !existingIds.has(p.id));

            if (newItems.length) {
                if (isOnHome && !atTop) {
                    pendingHomePublications.push(...newItems);
                    AppState.hasPendingHomeUpdates = true;
                    AppState.pendingHomePublications = pendingHomePublications.slice();
                    showHomeNewBanner();
                } else {
                    AppState.currentPublications = [...newItems, ...AppState.currentPublications];
                    AppState.currentPublications.sort(sortByCreatedAtDesc);
                }
            }
        }

        rerenderHome();
        renderHomeFilters(AppState.currentPublications);
        renderSearchSuggestions(AppState.currentPublications);
        if (AppState.currentView === 'search') renderSearchResults(getFilteredList());
    }

    function rerenderHome() {
        if (!productsGrid) return;
        const homeList = AppState.activeCategoryFilter
            ? AppState.currentPublications.filter(p => p.category === AppState.activeCategoryFilter)
            : AppState.currentPublications;
        renderProducts(productsGrid, homeList);
    }

    function showHomeNewBanner() {
        if (!homeNewBanner || !homeNewBannerText) return;
        const count = pendingHomePublications.length;
        if (!count) { hideHomeNewBanner(); return; }
        homeNewBannerText.textContent = count === 1
            ? '1 nueva publicación'
            : `${count} nuevas publicaciones`;
        homeNewBanner.classList.remove('hidden');
    }

    function hideHomeNewBanner() {
        if (homeNewBanner) homeNewBanner.classList.add('hidden');
        pendingHomePublications = [];
        AppState.hasPendingHomeUpdates = false;
        AppState.pendingHomePublications = [];
    }

    function applyPendingHomeUpdates() {
        if (!pendingHomePublications.length) { hideHomeNewBanner(); return; }

        const existingIds = new Set(AppState.currentPublications.map(p => p.id));
        const newItems = pendingHomePublications.filter(p => !existingIds.has(p.id));

        AppState.currentPublications = [...newItems, ...AppState.currentPublications];
        AppState.currentPublications.sort(sortByCreatedAtDesc);

        hideHomeNewBanner();
        rerenderHome();

        if (window.HapticsService) HapticsService.light();

        const main = document.getElementById('main-content');
        if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* =====================================================
       CARD DE PRODUCTO
       ===================================================== */
    function createProductCard(pub) {
        const card = document.createElement('article');
        card.className = 'product-card';
        card.dataset.id = pub.id;

        const safeImg = Formatters.safeUrl(pub.mainImage) || 'https://via.placeholder.com/300';
        const categoryChip = pub.category
            ? `<span class="product-category-chip">${Formatters.escapeHtml(pub.category)}</span>`
            : '';
        const storeLine = pub.storeName
            ? `<span class="product-store"><i class="fa-solid fa-store"></i> ${Formatters.escapeHtml(pub.storeName)}</span>`
            : '';

        const scheduleLabel = Formatters.formatScheduleCompact(pub.schedule);
        const scheduleChip = scheduleLabel
            ? `<span class="product-schedule-chip" title="${Formatters.escapeHtml(scheduleLabel)}">
                   <i class="fa-regular fa-clock"></i> ${Formatters.escapeHtml(scheduleLabel)}
               </span>`
            : '';

        let distanceHtml = '';
        if (AppState.userCoords && pub.latitude != null && pub.longitude != null) {
            const meters = Formatters.calculateDistance(
                AppState.userCoords.latitude, AppState.userCoords.longitude,
                pub.latitude, pub.longitude
            );
            const txt = Formatters.formatDistance(meters);
            if (txt) distanceHtml = `<i class="fa-solid fa-location-dot"></i><span>${txt}</span>`;
        }

        const presentationLabel = (function () {
            if (!pub.presentation || !pub.presentation.quantity) return '';
            const short = window.UnitCatalog ? UnitCatalog.short(pub.presentation.unitCode) : '';
            if (!short) return '';
            return `${pub.presentation.quantity} ${short}`;
        })();

        const timeText = Formatters.formatRelativeTime(pub.createdAt);
        const metaParts = [];
        if (distanceHtml) metaParts.push(distanceHtml);
        if (presentationLabel) metaParts.push(`<i class="fa-solid fa-box-open"></i><span>${Formatters.escapeHtml(presentationLabel)}</span>`);
        if (timeText) metaParts.push(`<span>${timeText}</span>`);
        const metaHtml = metaParts.map((p, i) => i === 0 ? p : `<span class="dot">·</span>${p}`).join('');

        const priceHtml = Formatters.formatPriceWithUnit(pub.price, pub.unitCode);

        card.innerHTML = `
            <div class="product-img">
                <img src="${safeImg}" alt="${Formatters.escapeHtml(pub.name || '')}" loading="lazy">
                ${categoryChip}
                <button class="product-favorite" data-fav-id="${pub.id}" aria-label="Guardar"><i class="fa-regular fa-bookmark"></i></button>
            </div>
            <div class="product-info">
                ${storeLine}
                <h4>${Formatters.escapeHtml(pub.name || '')}</h4>
                <div class="product-price-row">
                    <span class="product-price">${priceHtml}</span>
                    ${scheduleChip}
                </div>
                <div class="product-meta">${metaHtml}</div>
            </div>`;

        card.addEventListener('click', (e) => {
            if (e.target.closest('.product-favorite')) return;
            openProductSheet(pub);
        });

        return card;
    }

    /* =====================================================
       EMPTY STATES INTELIGENTES
       ===================================================== */
    function renderEmptyState(container, { type, query, category }) {
        if (!container) return;
        container.innerHTML = '';

        let icon = 'fa-box-open';
        let title = 'Sin publicaciones';
        let text = 'Cuando haya publicaciones cerca de ti, las verás aquí.';
        let actionLabel = '';
        let actionId = '';

        if (type === 'search-no-results') {
            icon = 'fa-magnifying-glass';
            title = 'Sin resultados';
            text = query
                ? `No encontramos nada para "${query}". Prueba con otra palabra.`
                : 'No hay publicaciones que coincidan con los filtros.';
            actionLabel = 'Limpiar búsqueda';
            actionId = 'empty-clear-search';
        } else if (type === 'filter-no-results') {
            icon = 'fa-filter-circle-xmark';
            title = 'Sin coincidencias';
            text = 'Prueba quitando algún filtro para ampliar los resultados.';
            actionLabel = 'Limpiar filtros';
            actionId = 'empty-clear-filters';
        } else if (type === 'category-empty') {
            icon = 'fa-tag';
            title = `Sin publicaciones en ${category || 'esta categoría'}`;
            text = 'Explora otras categorías o mira todo lo que hay cerca de ti.';
            actionLabel = 'Ver todas';
            actionId = 'empty-show-all';
        } else if (type === 'no-data') {
            icon = 'fa-store-slash';
            title = 'Aún no hay publicaciones';
            text = 'Sé de los primeros en publicar algo en PipGo.';
            actionLabel = 'Anunciarme';
            actionId = 'empty-go-publish';
        }

        const wrap = document.createElement('div');
        wrap.className = 'empty-state-intelligent';
        wrap.innerHTML = `
            <div class="empty-state-icon"><i class="fa-solid ${icon}"></i></div>
            <h4>${Formatters.escapeHtml(title)}</h4>
            <p>${Formatters.escapeHtml(text)}</p>
            ${actionLabel ? `<button class="empty-action" id="${actionId}">
                <i class="fa-solid fa-arrow-right"></i> ${Formatters.escapeHtml(actionLabel)}
            </button>` : ''}`;
        container.appendChild(wrap);

        if (actionId === 'empty-clear-search') {
            const b = document.getElementById(actionId);
            if (b) b.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (clearSearch) clearSearch.classList.remove('visible');
                if (searchSuggestions) searchSuggestions.style.display = 'block';
                handleSearchInput();
            });
        } else if (actionId === 'empty-clear-filters') {
            const b = document.getElementById(actionId);
            if (b) b.addEventListener('click', () => {
                activeFilterCategory = '';
                activeFilterSeller = '';
                if (searchInput) searchInput.value = '';
                if (clearSearch) clearSearch.classList.remove('visible');
                renderCategoriesScroll();
                renderFilterChips();
                updateFilterBadge();
                renderSearchResults(AppState.currentPublications);
            });
        } else if (actionId === 'empty-show-all') {
            const b = document.getElementById(actionId);
            if (b) b.addEventListener('click', () => {
                AppState.activeCategoryFilter = '';
                renderHomeFilters(AppState.currentPublications);
                renderCategoriesScroll();
                rerenderHome();
            });
        } else if (actionId === 'empty-go-publish') {
            const b = document.getElementById(actionId);
            if (b) b.addEventListener('click', () => NavigationUI.switchView('anunciarme'));
        }
    }

    function renderProducts(container, list) {
        if (!container) return;

        const isHome = container === productsGrid;
        const query = searchInput ? searchInput.value.trim() : '';

        if (!list.length) {
            if (AppState.currentPublications.length === 0) {
                renderEmptyState(container, { type: 'no-data' });
            } else if (isHome && AppState.activeCategoryFilter) {
                renderEmptyState(container, { type: 'category-empty', category: AppState.activeCategoryFilter });
            } else if (!isHome && query) {
                renderEmptyState(container, { type: 'search-no-results', query });
            } else if (!isHome && (activeFilterCategory || activeFilterSeller)) {
                renderEmptyState(container, { type: 'filter-no-results' });
            } else {
                renderEmptyState(container, { type: 'no-data' });
            }
            return;
        }

        container.innerHTML = '';
        list.forEach(pub => container.appendChild(createProductCard(pub)));
        FavoriteUI.updateAllButtons();
    }

    function renderSearchResults(list) {
        renderProducts(searchResults, list);
        updateSearchSubtitle();
    }

    function showAllPublications() {
        searchInput.value = '';
        clearSearch.classList.remove('visible');
        searchSuggestions.style.display = 'block';
        clearSellersSearch();
        activeFilterCategory = '';
        activeFilterSeller = '';
        AppState.activeCategoryFilter = '';
        renderFilterChips();
        renderCategoriesScroll();
        renderHomeFilters(AppState.currentPublications);
        updateFilterBadge();
        renderSearchResults(AppState.currentPublications);
    }

    function onEnterSearch() {
        renderCategoriesScroll();
        renderFilterChips();
        updateFilterBadge();
        clearSellersSearch();
        renderSearchResults(getFilteredList());
    }

    function onEnterHome() {
        const list = AppState.activeCategoryFilter
            ? AppState.currentPublications.filter(p => p.category === AppState.activeCategoryFilter)
            : AppState.currentPublications;
        renderHomeFilters(AppState.currentPublications);
        if (AppState.currentPublications.length) {
            renderProducts(productsGrid, list);
        }
        startHomeSubscription();
        if (pendingHomePublications.length) showHomeNewBanner();
    }

    function onLeaveHome() {
        stopHomeSubscription();
    }

    /* =====================================================
       BÚSQUEDA DE VENDEDORES EN EXPLORAR
       ===================================================== */
    function clearSellersSearch() {
        sellerSearchToken++;
        if (searchSellersSection) searchSellersSection.classList.add('hidden');
        if (searchSellersResults) searchSellersResults.innerHTML = '';
    }

    async function performSellerSearch(query) {
        if (!searchSellersSection || !searchSellersResults) return;

        const q = String(query || '').trim();
        if (q.length < 2) { clearSellersSearch(); return; }

        const token = ++sellerSearchToken;

        try {
            const sellers = await SellerProfileService.searchSellersByPrefix(q, { limit: 8 });
            if (token !== sellerSearchToken) return;

            if (!sellers.length) {
                searchSellersSection.classList.add('hidden');
                searchSellersResults.innerHTML = '';
                return;
            }

            renderSellersSearchResults(sellers);
        } catch (e) {
            Logger.warn('performSellerSearch', e);
            if (token === sellerSearchToken) clearSellersSearch();
        }
    }

    function renderSellersSearchResults(sellers) {
        if (!searchSellersSection || !searchSellersResults) return;

        searchSellersResults.innerHTML = '';

        sellers.forEach(seller => {
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'search-seller-row';

            const avatarHtml = seller.avatarUrl
                ? `<img src="${Formatters.safeUrl(seller.avatarUrl)}" alt="">`
                : `<i class="fa-solid fa-user"></i>`;

            const name = seller.displayName || seller.businessName || '';
            const category = seller.category || '';

            row.innerHTML = `
                <div class="search-seller-avatar">${avatarHtml}</div>
                <div class="search-seller-info">
                    <span class="search-seller-username">@${Formatters.escapeHtml(seller.username || '')}</span>
                    ${name ? `<span class="search-seller-name">${Formatters.escapeHtml(name)}</span>` : ''}
                    ${category ? `<span class="search-seller-category">${Formatters.escapeHtml(category)}</span>` : ''}
                </div>
                <i class="fa-solid fa-chevron-right search-seller-arrow" aria-hidden="true"></i>
            `;

            row.addEventListener('click', () => {
                if (window.SellerProfileUI) {
                    SellerProfileUI.open(seller.uid);
                }
            });

            searchSellersResults.appendChild(row);
        });

        searchSellersSection.classList.remove('hidden');
    }

    /* =====================================================
       CATEGORÍAS DINÁMICAS
       ===================================================== */
    function getActiveCategories(publications) {
        const set = new Set();
        publications.forEach(p => { if (p.category) set.add(p.category); });
        return [...set];
    }

    function renderHomeFilters(publications) {
        const strip = document.getElementById('home-filter-chips');
        if (!strip) return;

        const cats = getActiveCategories(publications || []);
        strip.innerHTML = '';

        if (!cats.length) { strip.style.display = 'none'; return; }
        strip.style.display = 'flex';

        const current = AppState.activeCategoryFilter || '';

        const makeChip = (label, cat) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'home-filter-chip' + (current === cat ? ' active' : '');
            chip.dataset.cat = cat;
            chip.textContent = label;
            chip.setAttribute('role', 'tab');
            chip.setAttribute('aria-selected', current === cat ? 'true' : 'false');
            chip.addEventListener('click', () => onHomeFilterClick(cat));
            return chip;
        };

        strip.appendChild(makeChip('Todos', ''));
        cats.forEach(cat => strip.appendChild(makeChip(cat, cat)));
    }

    function onHomeFilterClick(cat) {
        AppState.activeCategoryFilter = cat || '';

        document.querySelectorAll('#home-filter-chips .home-filter-chip').forEach(c => {
            const isActive = (c.dataset.cat || '') === (cat || '');
            c.classList.toggle('active', isActive);
            c.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        const list = AppState.activeCategoryFilter
            ? AppState.currentPublications.filter(p => p.category === AppState.activeCategoryFilter)
            : AppState.currentPublications;
        renderProducts(productsGrid, list);
    }

    function renderCategoriesScroll() {
        const scroll = document.getElementById('search-category-scroll');
        if (!scroll) return;
        const cats = getActiveCategories(AppState.currentPublications);
        scroll.innerHTML = '';

        const allBtn = document.createElement('button');
        allBtn.className = 'category-pill' + (!activeFilterCategory ? ' active' : '');
        allBtn.innerHTML = '<i class="fa-solid fa-border-all pill-ico"></i> Todas';
        allBtn.addEventListener('click', () => {
            activeFilterCategory = '';
            renderCategoriesScroll();
            renderSearchResults(getFilteredList());
            renderFilterChips();
            updateFilterBadge();
        });
        scroll.appendChild(allBtn);

        cats.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'category-pill' + (activeFilterCategory === cat ? ' active' : '');
            btn.textContent = cat;
            btn.addEventListener('click', () => {
                activeFilterCategory = cat;
                renderCategoriesScroll();
                renderSearchResults(getFilteredList());
                renderFilterChips();
                updateFilterBadge();
            });
            scroll.appendChild(btn);
        });
    }

    function renderFilterChips() {
        const row = document.getElementById('filter-chip-row');
        if (!row) return;
        row.innerHTML = '';
        if (activeFilterSeller) {
            const chip = document.createElement('button');
            chip.className = 'filter-chip';
            const label = activeFilterSeller === 'calle' ? 'Puesto de calle' : 'Establecimiento';
            chip.innerHTML = `${label} <i class="fa-solid fa-xmark"></i>`;
            chip.addEventListener('click', () => {
                activeFilterSeller = '';
                renderFilterChips();
                updateFilterBadge();
                renderSearchResults(getFilteredList());
            });
            row.appendChild(chip);
        }
        updateFilterBadge();
    }

    /* =====================================================
       SUGERENCIAS
       ===================================================== */
    function renderSearchSuggestions(publications) {
        const suggestions = PublicationService.buildSuggestions(publications);
        suggestionChips.innerHTML = '';
        suggestions.forEach(text => {
            const chip = document.createElement('button');
            chip.className = 'suggestion-chip';
            chip.textContent = text;
            chip.addEventListener('click', () => {
                searchInput.value = text;
                handleSearchInput();
            });
            suggestionChips.appendChild(chip);
        });
    }

    /* =====================================================
       FILTROS
       ===================================================== */
    function openFilterModal() {
        const cats = getActiveCategories(AppState.currentPublications);
        filterCategory.innerHTML = '<option value="">Todas</option>';
        cats.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat; opt.textContent = cat;
            filterCategory.appendChild(opt);
        });
        filterCategory.value = activeFilterCategory;
        filterSeller.value = activeFilterSeller;
        filterModal.classList.remove('hidden');
    }
    function closeFilterModal() { filterModal.classList.add('hidden'); }
    function isFilterModalOpen() { return !filterModal.classList.contains('hidden'); }

    function applyFilters() {
        activeFilterCategory = filterCategory.value;
        activeFilterSeller = filterSeller.value;
        closeFilterModal();
        renderCategoriesScroll();
        renderFilterChips();
        updateFilterBadge();
        handleSearchInput();
    }

    function getFilteredList() {
        const query = (searchInput.value || '').toLowerCase().trim();
        return AppState.currentPublications.filter(p => {
            const matchesQuery = !query ||
                (p.name && p.name.toLowerCase().includes(query)) ||
                (p.storeName && p.storeName.toLowerCase().includes(query)) ||
                (p.category && p.category.toLowerCase().includes(query)) ||
                (p.sellerType && p.sellerType.toLowerCase().includes(query)) ||
                (p.description && p.description.toLowerCase().includes(query));
            const matchesCategory = !activeFilterCategory || p.category === activeFilterCategory;
            const matchesSeller = !activeFilterSeller || p.sellerType === activeFilterSeller;
            return matchesQuery && matchesCategory && matchesSeller;
        });
    }

    function handleSearchInput() {
        const query = searchInput.value.trim();
        if (query) {
            clearSearch.classList.add('visible');
            searchSuggestions.style.display = 'none';
        } else {
            clearSearch.classList.remove('visible');
            searchSuggestions.style.display = 'block';
            clearSellersSearch();
        }

        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            searchDebounceTimer = null;
            renderSearchResults(getFilteredList());
            performSellerSearch(query);
        }, SEARCH_DEBOUNCE_MS);
    }

    /* =====================================================
       FORMULARIO — tipo de vendedor
       ===================================================== */
    function selectSellerType(button) {
        typeCalle.classList.remove('selected');
        typeEstablecimiento.classList.remove('selected');
        button.classList.add('selected');
        stepType.classList.add('hidden');
        publicationForm.classList.remove('hidden');
        publicationForm.dataset.editId = '';
        setSubmitButton('Publicar anuncio', 'fa-paper-plane');
        publicationForm.scrollIntoView({ behavior: 'smooth', block: 'start' });

        setTimeout(() => maybeOfferDraftRestore(), 280);
    }

    function resetFormMode() {
        publicationForm.dataset.editId = '';
        publicationForm.reset();
        photoSlots.forEach(resetSlot);
        resetSchedule();
        if (productHasWhatsappInput) productHasWhatsappInput.checked = false;
        stepType.classList.remove('hidden');
        publicationForm.classList.add('hidden');
        typeCalle.classList.remove('selected');
        typeEstablecimiento.classList.remove('selected');
        setSubmitButton('Publicar anuncio', 'fa-paper-plane');
        hideFormError();
        AppState.currentLocation = null;
        AppState.formDirtyState = false;

        onCategoryChange();
        updateDescriptionCounter();
        updatePriceHint();
    }

    function resetSlot(slot) {
        slot.preview.classList.add('hidden');
        slot.preview.removeAttribute('src');
        if (slot.previewUrl) { URL.revokeObjectURL(slot.previewUrl); slot.previewUrl = null; }
        slot.blob = null; slot.uploadedUrl = '';
        slot.slot.querySelector('i').style.display = '';
        slot.slot.querySelector('span').style.display = '';
        slot.removeBtn.classList.add('hidden');
        slot.input.value = '';
    }

    function setSlotImageFromUrl(slot, url) {
        slot.uploadedUrl = url; slot.blob = null;
        if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
        slot.preview.src = url;
        slot.preview.classList.remove('hidden');
        slot.slot.querySelector('i').style.display = 'none';
        slot.slot.querySelector('span').style.display = 'none';
        slot.removeBtn.classList.remove('hidden');
    }

    async function processAndPreview(slot, source) {
        try {
            const compressed = await ImageService.compressImage(source);
            slot.blob = compressed; slot.uploadedUrl = '';
            if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
            slot.previewUrl = URL.createObjectURL(compressed);
            slot.preview.src = slot.previewUrl;
            slot.preview.classList.remove('hidden');
            slot.slot.querySelector('i').style.display = 'none';
            slot.slot.querySelector('span').style.display = 'none';
            slot.removeBtn.classList.remove('hidden');
            slot.input.value = '';
        } catch (error) {
            Logger.error('Error procesando imagen', error);
            Toast.error('No pudimos procesar la imagen.');
        }
    }

    /* =====================================================
       CATEGORÍA → UNIDAD / CONDICIÓN / PRESENTACIÓN
       ===================================================== */
    function onCategoryChange() {
        const category = productCategorySelect ? productCategorySelect.value : '';

        if (!category) {
            unitGroup.classList.add('hidden');
            conditionGroup.classList.add('hidden');
            presentationGroup.classList.add('hidden');
            updatePriceHint();
            return;
        }

        const cfg = window.CategoryConfig ? CategoryConfig.get(category) : { units: ['pza'] };
        const units = window.CategoryConfig
            ? CategoryConfig.unitsFor(category)
            : (window.UnitCatalog ? UnitCatalog.list(cfg.units) : []);

        if (units.length) {
            const prev = productUnitSelect.value;
            fillSelectWithUnits(productUnitSelect, units, { emptyOption: false });
            const codes = units.map(u => u.code);
            if (prev && codes.includes(prev)) productUnitSelect.value = prev;
            else productUnitSelect.value = units[0].code;
            unitGroup.classList.remove('hidden');
        } else {
            unitGroup.classList.add('hidden');
            productUnitSelect.innerHTML = '';
        }

        if (cfg.showPresentation && units.length) {
            fillSelectWithUnits(productPresentationUnit, units, { emptyOption: false });
            presentationGroup.classList.remove('hidden');
        } else {
            presentationGroup.classList.add('hidden');
            productPresentationQty.value = '';
            productPresentationUnit.innerHTML = '';
        }

        if (cfg.showCondition && cfg.conditions && cfg.conditions.length) {
            buildConditionChips(cfg.conditions);
            conditionGroup.classList.remove('hidden');
        } else {
            conditionGroup.classList.add('hidden');
            conditionChips.innerHTML = '';
        }

        updatePriceHint();
    }

    function buildConditionChips(conditions) {
        conditionChips.innerHTML = '';
        const icons = {
            new: 'fa-box-open',
            used: 'fa-recycle',
            refurbished: 'fa-screwdriver-wrench'
        };

        conditions.forEach((code, index) => {
            const label = window.CategoryConfig ? CategoryConfig.conditionLabel(code) : code;
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'condition-chip' + (index === 0 ? ' active' : '');
            chip.dataset.condition = code;
            chip.setAttribute('role', 'radio');
            chip.setAttribute('aria-checked', index === 0 ? 'true' : 'false');
            chip.innerHTML = `<i class="fa-solid ${icons[code] || 'fa-circle-dot'}"></i> ${Formatters.escapeHtml(label)}`;
            chip.addEventListener('click', () => {
                conditionChips.querySelectorAll('.condition-chip').forEach(c => {
                    c.classList.remove('active');
                    c.setAttribute('aria-checked', 'false');
                });
                chip.classList.add('active');
                chip.setAttribute('aria-checked', 'true');
                if (window.HapticsService) HapticsService.light();
                markFormDirty();
            });
            conditionChips.appendChild(chip);
        });
    }

    function readCondition() {
        if (!conditionGroup || conditionGroup.classList.contains('hidden')) return '';
        const active = conditionChips.querySelector('.condition-chip.active');
        return active ? active.dataset.condition : '';
    }

    function readUnitCode() {
        if (!unitGroup || unitGroup.classList.contains('hidden')) return '';
        return productUnitSelect.value || '';
    }

    function readPresentation() {
        if (!presentationGroup || presentationGroup.classList.contains('hidden')) return null;
        const raw = String(productPresentationQty.value || '').trim();
        if (!raw) return null;
        const qty = parseFloat(raw.replace(',', '.'));
        if (!isFinite(qty) || qty <= 0) return null;
        const unitCode = productPresentationUnit.value || '';
        if (!unitCode) return null;
        return { quantity: qty, unitCode };
    }

    function updatePriceHint() {
        if (!unitHint) return;
        const rawPrice = productPriceInput ? productPriceInput.value : '';
        const price = Formatters.sanitizePriceInput(rawPrice);
        const unit = readUnitCode();
        if (!price) {
            unitHint.textContent = 'Se mostrará como "$0 / unidad".';
            return;
        }
        const formatted = Formatters.formatPriceWithUnit(price, unit);
        unitHint.textContent = `Se mostrará como ${formatted}.`;
    }

    function updateDescriptionCounter() {
        if (!descriptionCounter || !descriptionInput) return;
        const max = (window.Validators && Validators.LIMITS)
            ? Validators.LIMITS.PUBLICATION_DESCRIPTION_MAX
            : 400;
        const current = String(descriptionInput.value || '').length;
        descriptionCounter.textContent = `${current} / ${max}`;
        descriptionCounter.classList.toggle('is-near-limit', current >= max * 0.9);
        descriptionCounter.classList.toggle('is-at-limit', current >= max);
    }

    /* =====================================================
       HORARIO
       ===================================================== */
    function setSchedulePanelOpen(open) {
        schedulePanel.classList.toggle('hidden', !open);
        scheduleToggle.classList.toggle('open', open);
        scheduleToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        scheduleToggleText.textContent = open ? 'Horario' : 'Agregar horario';
    }

    function resetSchedule() {
        setSchedulePanelOpen(false);
        scheduleDays.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        scheduleStart.value = '08:00';
        scheduleEnd.value = '12:00';
        btnClearSchedule.classList.add('hidden');
    }

    function readSchedule() {
        if (schedulePanel.classList.contains('hidden')) return null;
        const days = [...scheduleDays.querySelectorAll('button.active')]
            .map(b => parseInt(b.dataset.day, 10));
        const start = scheduleStart.value;
        const end = scheduleEnd.value;
        if (!days.length) return null;
        return { days, start, end };
    }

    function applyScheduleToForm(schedule) {
        resetSchedule();
        if (!schedule || !schedule.days || !schedule.days.length) return;
        setSchedulePanelOpen(true);
        scheduleDays.querySelectorAll('button').forEach(b => {
            const d = parseInt(b.dataset.day, 10);
            b.classList.toggle('active', schedule.days.includes(d));
        });
        scheduleStart.value = schedule.start || '08:00';
        scheduleEnd.value = schedule.end || '12:00';
        btnClearSchedule.classList.remove('hidden');
    }

    function updateScheduleVisualState() {
        const hasDays = scheduleDays.querySelectorAll('button.active').length > 0;
        const hasTimes = scheduleStart.value && scheduleEnd.value;
        const isConfigured = hasDays && hasTimes;
        btnClearSchedule.classList.toggle('hidden', !isConfigured);
    }

    /* =====================================================
       UBICACIÓN
       ===================================================== */
    function hasValidLocation() {
        const loc = AppState.currentLocation;
        return !!(loc && loc.latitude != null && loc.longitude != null);
    }

    function applyLocationToInput(location) {
        const display =
            location.shortAddress ||
            location.address ||
            `Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}`;
        productRefInput.value = display;
    }

    async function handleGetLocation() {
        if (!AppState.currentUser) { AuthUI.openAuthModal('login'); return; }
        if (btnGetLocation.disabled) return;

        btnGetLocation.disabled = true;
        btnGetLocation.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Obteniendo ubicación…';

        try {
            const location = await LocationService.fetchFullLocation();
            AppState.currentLocation = location;
            applyLocationToInput(location);
            Toast.success('Ubicación detectada. Puedes editarla si es necesario.');
            markFormDirty();
        } catch (error) {
            Toast.error(error.message || 'No pudimos obtener la ubicación.');
        } finally {
            btnGetLocation.disabled = false;
            btnGetLocation.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Usar mi ubicación';
        }
    }

    /* =====================================================
       FORM STATE — DIRTY / DRAFT
       ===================================================== */
    function markFormDirty() {
        if (publicationForm.classList.contains('hidden')) return;
        AppState.formDirtyState = true;
        if (!publicationForm.dataset.editId) {
            saveDraftDebounced();
        }
    }

    function readDraftPayload() {
        if (!productCategorySelect) return null;
        const sellerType = typeCalle && typeCalle.classList.contains('selected') ? 'calle'
                         : typeEstablecimiento && typeEstablecimiento.classList.contains('selected') ? 'establecimiento'
                         : '';
        if (!sellerType) return null;

        return {
            savedAt: Date.now(),
            sellerType,
            storeName: (document.getElementById('store-name').value || '').trim(),
            category: productCategorySelect.value || '',
            name: (document.getElementById('product-name').value || '').trim(),
            price: Formatters.sanitizePriceInput(productPriceInput ? productPriceInput.value : ''),
            unitCode: readUnitCode(),
            condition: readCondition(),
            presentation: readPresentation(),
            phone: (document.getElementById('product-phone').value || '').trim(),
            hasWhatsapp: !!(productHasWhatsappInput && productHasWhatsappInput.checked),
            description: descriptionInput ? descriptionInput.value.trim() : '',
            extraRefs: (document.getElementById('product-extra-refs').value || '').trim(),
            reference: (productRefInput.value || '').trim(),
            schedule: readSchedule()
        };
    }

    function hasMeaningfulDraftContent(d) {
        if (!d) return false;
        return !!(d.name || d.price || d.description || d.storeName ||
                  d.reference || d.extraRefs || d.phone ||
                  (d.category && d.category !== '') ||
                  (d.schedule && d.schedule.days && d.schedule.days.length));
    }

    function saveDraftDebounced() {
        if (draftSaveTimeout) clearTimeout(draftSaveTimeout);
        draftSaveTimeout = setTimeout(() => {
            draftSaveTimeout = null;
            saveDraft();
        }, DRAFT_SAVE_DELAY);
    }

    function saveDraft() {
        if (publicationForm.dataset.editId) return;
        if (!formWrapper || formWrapper.classList.contains('hidden')) return;

        const payload = readDraftPayload();
        if (!payload || !hasMeaningfulDraftContent(payload)) return;

        Storage.set(DRAFT_KEY, payload);
    }

    function clearDraft() {
        if (draftSaveTimeout) { clearTimeout(draftSaveTimeout); draftSaveTimeout = null; }
        Storage.remove(DRAFT_KEY);
    }

    function hasDraft() {
        const d = Storage.get(DRAFT_KEY, null);
        return !!(d && typeof d === 'object' && d.savedAt);
    }

    function applyDraftToForm(draft) {
        if (!draft) return;

        if (draft.sellerType === 'calle') {
            typeCalle.classList.add('selected');
            typeEstablecimiento.classList.remove('selected');
        } else if (draft.sellerType === 'establecimiento') {
            typeEstablecimiento.classList.add('selected');
            typeCalle.classList.remove('selected');
        } else return;

        stepType.classList.add('hidden');
        publicationForm.classList.remove('hidden');
        publicationForm.dataset.editId = '';

        if (draft.storeName) document.getElementById('store-name').value = draft.storeName;
        if (draft.category) productCategorySelect.value = draft.category;
        onCategoryChange();

        if (draft.name) document.getElementById('product-name').value = draft.name;
        if (draft.price && productPriceInput) productPriceInput.value = draft.price;

        if (draft.unitCode) {
            const exists = [...productUnitSelect.options].some(o => o.value === draft.unitCode);
            if (exists) productUnitSelect.value = draft.unitCode;
        }

        if (draft.condition && conditionChips) {
            conditionChips.querySelectorAll('.condition-chip').forEach(c => {
                const match = c.dataset.condition === draft.condition;
                c.classList.toggle('active', match);
                c.setAttribute('aria-checked', match ? 'true' : 'false');
            });
        }

        if (draft.presentation && draft.presentation.quantity) {
            productPresentationQty.value = draft.presentation.quantity;
            if (draft.presentation.unitCode) {
                const existsP = [...productPresentationUnit.options].some(o => o.value === draft.presentation.unitCode);
                if (existsP) productPresentationUnit.value = draft.presentation.unitCode;
            }
        }

        if (draft.phone) document.getElementById('product-phone').value = draft.phone;
        if (productHasWhatsappInput) productHasWhatsappInput.checked = !!draft.hasWhatsapp;
        if (draft.description) descriptionInput.value = draft.description;
        if (draft.extraRefs) document.getElementById('product-extra-refs').value = draft.extraRefs;
        if (draft.reference) productRefInput.value = draft.reference;

        if (draft.schedule) applyScheduleToForm(draft.schedule);

        updateDescriptionCounter();
        updatePriceHint();

        AppState.formDirtyState = true;
        publicationForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function maybeOfferDraftRestore() {
        if (publicationForm.dataset.editId) return;
        if (!hasDraft()) return;
        if (!draftModal) return;
        draftModal.classList.remove('hidden');
    }

    /* =====================================================
       PROTECCIÓN DE SALIDA
       ===================================================== */
    function hasUnsavedChanges() {
        if (!AppState.formDirtyState) return false;
        if (!publicationForm || publicationForm.classList.contains('hidden')) return false;
        return true;
    }

    function confirmLeave(onConfirm) {
        if (!unsavedModal) { onConfirm(); return; }

        const confirmBtn = document.getElementById('unsaved-confirm');
        const cancelBtn = document.getElementById('unsaved-cancel');
        const closeBtn = document.getElementById('unsaved-close');

        const cleanup = () => {
            confirmBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            closeBtn.removeEventListener('click', onCancel);
            unsavedModal.classList.add('hidden');
        };
        const onOk = () => { cleanup(); onConfirm(); };
        const onCancel = () => { cleanup(); };

        confirmBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        closeBtn.addEventListener('click', onCancel);

        unsavedModal.classList.remove('hidden');
    }

    /* =====================================================
       VISTA PREVIA
       ===================================================== */
    function openPreview() {
        hideFormError();
        const data = readFormData();

        const v = Validators.validatePublication(data);
        if (!v.valid) { showFormError(v.error); return; }
        const schedV = Validators.validateSchedule(data.schedule);
        if (!schedV.valid) { showFormError(schedV.error); return; }

        previewBody.innerHTML = buildPreviewHtml(data);
        previewModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        if (!previewHistoryPushed) {
            history.pushState({ view: AppState.currentView, overlay: 'preview' }, '', '');
            previewHistoryPushed = true;
        }
    }

    function closePreview(syncHistory = true) {
        previewModal.classList.add('hidden');
        document.body.style.overflow = '';
        previewBody.innerHTML = '';

        if (previewHistoryPushed) {
            previewHistoryPushed = false;
            if (syncHistory) {
                suppressPopstate = true;
                try { history.back(); } catch (e) {}
            }
        }
    }

    function buildPreviewHtml(data) {
        const safeImg = Formatters.safeUrl(data.mainImagePreviewUrl) || 'https://via.placeholder.com/300';
        const categoryChip = data.category
            ? `<span class="sheet-category-badge">${Formatters.escapeHtml(data.category)}</span>`
            : '';

        const badges = [];
        if (data.condition) {
            const label = window.CategoryConfig ? CategoryConfig.conditionLabel(data.condition) : '';
            if (label) badges.push(`<span class="sheet-badge sheet-badge-condition">
                <i class="fa-solid fa-circle-check"></i> ${Formatters.escapeHtml(label)}
            </span>`);
        }
        if (data.presentation && data.presentation.quantity) {
            const short = window.UnitCatalog ? UnitCatalog.short(data.presentation.unitCode) : '';
            if (short) badges.push(`<span class="sheet-badge sheet-badge-presentation">
                <i class="fa-solid fa-box-open"></i> ${data.presentation.quantity} ${Formatters.escapeHtml(short)}
            </span>`);
        }
        const badgesHtml = badges.length
            ? `<div class="sheet-badges-row">${badges.join('')}</div>`
            : '';

        const storeHtml = data.storeName
            ? `<p class="sheet-store-name"><i class="fa-solid fa-store"></i> ${Formatters.escapeHtml(data.storeName)}</p>`
            : '';

        const priceHtml = Formatters.formatPriceWithUnit(data.price, data.unitCode);

        const scheduleFull = Formatters.formatScheduleFull(data.schedule);
        const scheduleHtml = scheduleFull
            ? `<div class="sheet-schedule-block">
                   <div class="sheet-schedule-icon"><i class="fa-regular fa-clock"></i></div>
                   <div class="sheet-schedule-info">
                       <span>Horario</span>
                       <strong>${Formatters.escapeHtml(scheduleFull)}</strong>
                   </div>
               </div>`
            : '';

        const contactHtml = (data.phone || data.hasWhatsapp)
            ? `<div class="sheet-contact-row">
                   <div class="contact-info">
                       <i class="fa-solid fa-phone"></i>
                       <span>${Formatters.escapeHtml(data.phone || '—')}</span>
                   </div>
                   <div class="sheet-contact-actions">
                       ${data.phone ? `<span class="btn-outline btn-call"><i class="fa-solid fa-phone"></i> Llamar</span>` : ''}
                       ${(data.phone && data.hasWhatsapp) ? `<span class="btn-outline btn-whatsapp"><i class="fa-brands fa-whatsapp"></i> WhatsApp</span>` : ''}
                   </div>
               </div>`
            : '';

        const refsHtml = data.extraRefs
            ? `<div class="sheet-refs-block">
                   <div class="refs-header"><i class="fa-solid fa-circle-info"></i> Referencias</div>
                   <p>${Formatters.escapeHtml(data.extraRefs)}</p>
               </div>`
            : '';

        const locHtml = data.reference
            ? `<div class="sheet-location-card">
                   <div class="location-icon"><i class="fa-solid fa-location-dot"></i></div>
                   <div class="location-info">
                       <span>Ubicación de referencia</span>
                       <strong>${Formatters.escapeHtml(data.reference)}</strong>
                   </div>
               </div>`
            : '';

        const sellerChip = `<span class="preview-seller-chip">
            <i class="fa-solid fa-user"></i> ${Formatters.escapeHtml(
                (AppState.currentProfile && AppState.currentProfile.username)
                    ? '@' + AppState.currentProfile.username
                    : 'Tú'
            )}
        </span>`;

        return `
            <div class="preview-card">
                <div class="preview-gallery"><img src="${safeImg}" alt=""></div>
                <div class="preview-body-inner">
                    ${categoryChip}
                    <h3 class="sheet-title">${Formatters.escapeHtml(data.name)}</h3>
                    ${badgesHtml}
                    ${storeHtml}
                    <div class="sheet-price-row">
                        <span class="sheet-price">${priceHtml}</span>
                    </div>
                    ${data.description ? `<p class="sheet-description">${Formatters.escapeHtml(data.description)}</p>` : ''}
                    ${refsHtml}
                    ${scheduleHtml}
                    ${locHtml}
                    ${contactHtml}
                    <div class="preview-seller-row">${sellerChip}</div>
                </div>
            </div>
        `;
    }

    /* =====================================================
       RECOLECCIÓN DE DATOS
       ===================================================== */
    function readFormData() {
        const sellerType = typeCalle.classList.contains('selected') ? 'calle' : 'establecimiento';
        return {
            storeName: document.getElementById('store-name').value.trim(),
            category: productCategorySelect.value || '',
            name: document.getElementById('product-name').value.trim(),
            price: Formatters.sanitizePriceInput(productPriceInput ? productPriceInput.value : ''),
            unitCode: readUnitCode(),
            condition: readCondition(),
            presentation: readPresentation(),
            phone: document.getElementById('product-phone').value.trim(),
            hasWhatsapp: !!(productHasWhatsappInput && productHasWhatsappInput.checked),
            description: descriptionInput.value.trim(),
            extraRefs: document.getElementById('product-extra-refs').value.trim(),
            reference: productRefInput.value.trim(),
            sellerType,
            schedule: readSchedule(),
            mainImage: photoSlots[0].blob || photoSlots[0].uploadedUrl,
            mainImageIsBlob: !!photoSlots[0].blob,
            mainImagePreviewUrl: photoSlots[0].previewUrl || photoSlots[0].uploadedUrl,
            images: photoSlots.slice(1).map(s => s.previewUrl || s.uploadedUrl).filter(Boolean)
        };
    }

    /* =====================================================
       SUBMIT
       ===================================================== */
    async function handleSubmit(e) {
        e.preventDefault();
        hideFormError();

        if (AppState.isSubmitting) return;

        if (window.PermissionService && !PermissionService.canPublish()) {
            showFormError(PermissionService.reasonCannotPublish());
            return;
        }

        if (!AppState.currentUser || !auth.currentUser) {
            showFormError('Debes iniciar sesión para publicar.');
            return;
        }

        const editId = publicationForm.dataset.editId || '';
        const form = readFormData();

        const validation = Validators.validatePublication({
            name: form.name,
            price: form.price,
            category: form.category,
            unitCode: form.unitCode,
            condition: form.condition,
            presentation: form.presentation,
            description: form.description,
            mainImage: form.mainImage
        });
        if (!validation.valid) { showFormError(validation.error); return; }

        const scheduleValidation = Validators.validateSchedule(form.schedule);
        if (!scheduleValidation.valid) { showFormError(scheduleValidation.error); return; }

        const mainSlot = photoSlots[0];
        const secondarySlots = photoSlots.slice(1);

        AppState.isSubmitting = true;
        btnSubmit.disabled = true;

        const uploadedUrls = [];

        try {
            let location = AppState.currentLocation;

            if (!hasValidLocation()) {
                setSubmitButton('Obteniendo ubicación…', 'fa-location-crosshairs');
                try {
                    location = await LocationService.fetchFullLocation();
                    AppState.currentLocation = location;
                    applyLocationToInput(location);
                } catch (locErr) {
                    showFormError(
                        locErr.message ||
                        'No pudimos obtener tu ubicación. Activa el GPS e inténtalo de nuevo.'
                    );
                    return;
                }
            } else {
                location = AppState.currentLocation;
            }

            let mainUrl = mainSlot.uploadedUrl;
            if (mainSlot.blob) {
                setSubmitButton('Subiendo imagen…', 'fa-cloud-arrow-up');
                const upload = await ImageService.uploadImageToCloudinary(mainSlot.blob);
                mainUrl = upload.secure_url;
                uploadedUrls.push({ url: mainUrl, publicId: upload.public_id });
            }

            const imageUrls = [];
            for (const slot of secondarySlots) {
                if (slot.uploadedUrl) imageUrls.push(slot.uploadedUrl);
                else if (slot.blob) {
                    setSubmitButton('Subiendo imágenes…', 'fa-cloud-arrow-up');
                    const upload = await ImageService.uploadImageToCloudinary(slot.blob);
                    imageUrls.push(upload.secure_url);
                    uploadedUrls.push({ url: upload.secure_url, publicId: upload.public_id });
                }
            }

            const payload = {
                userId: AppState.currentUser.uid,
                sellerType: form.sellerType,
                storeName: form.storeName || '',
                name: form.name,
                price: form.price,
                unitCode: form.unitCode || '',
                condition: form.condition || '',
                presentation: form.presentation || null,
                description: form.description,
                extraRefs: form.extraRefs || '',
                reference: form.reference,
                phone: form.phone || '',
                hasWhatsapp: form.hasWhatsapp,
                category: form.category,
                schedule: form.schedule || null,
                mainImage: mainUrl,
                images: imageUrls,
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy || null,
                address: location.address || '',
                city: location.city || '',
                state: location.state || '',
                country: location.country || ''
            };

            if (editId) {
                setSubmitButton('Guardando cambios…', 'fa-floppy-disk');
                await PublicationService.update(editId, payload);
                Toast.success('Publicación actualizada.');
            } else {
                setSubmitButton('Publicando…', 'fa-paper-plane');
                await PublicationService.create(payload);
                Toast.success('Publicación creada.');
            }

            if (window.HapticsService) HapticsService.success();

            setSubmitButton('Publicado correctamente', 'fa-circle-check');

            if (!editId) clearDraft();
            AppState.formDirtyState = false;

            resetFormMode();
            AppState.currentLocation = null;

            await loadPublications();
            NavigationUI.switchView('home');

        } catch (error) {
            if (uploadedUrls.length) {
                Logger.warn('Imágenes subidas sin publicación (posibles huérfanas)', {
                    context: 'publication.submit',
                    urls: uploadedUrls.map(u => u.url)
                });
            }
            const msg = ErrorHandler.toUserMessage(error, { context: 'publication.submit' });
            showFormError(msg);
        } finally {
            AppState.isSubmitting = false;
            btnSubmit.disabled = false;
            if (publicationForm.dataset.editId) {
                setSubmitButton('Guardar cambios', 'fa-floppy-disk');
            } else {
                setSubmitButton('Publicar anuncio', 'fa-paper-plane');
            }
        }
    }

    /* =====================================================
       ELIMINAR / EDITAR
       ===================================================== */
    async function deletePublication(pub) {
        if (window.PermissionService && !PermissionService.canDeletePublication(pub)) {
            Toast.error('No puedes eliminar esta publicación.');
            return;
        }
        const confirmed = await ConfirmDialog.open({
            title: 'Eliminar publicación',
            text: `¿Eliminar "${pub.name}"?\n\nEsta acción no se puede deshacer.`,
            okText: 'Eliminar',
            cancelText: 'Cancelar',
            danger: true
        });
        if (!confirmed) return;

        try {
            await PublicationService.softDelete(pub.id);
            Toast.success('Publicación eliminada.');
            await loadPublications();
            if (AppState.currentView === 'perfil') ProfileUI.renderProfile();
        } catch (error) {
            Logger.error('Error eliminando publicación', error);
            Toast.error(ErrorHandler.toUserMessage(error, { context: 'publication.delete' }));
        }
    }

    function openEditForm(pub) {
        if (window.PermissionService && !PermissionService.canEditPublication(pub)) {
            Toast.error('No puedes editar esta publicación.');
            return;
        }
        hideFormError();
        setSubmitButton('Guardar cambios', 'fa-floppy-disk');
        NavigationUI.switchView('anunciarme');

        publicationForm.dataset.editId = pub.id;
        stepType.classList.add('hidden');
        publicationForm.classList.remove('hidden');

        document.getElementById('store-name').value = pub.storeName || '';
        productCategorySelect.value = pub.category || '';
        document.getElementById('product-name').value = pub.name || '';
        if (productPriceInput) productPriceInput.value = pub.price || '';
        document.getElementById('product-phone').value = pub.phone || '';
        descriptionInput.value = pub.description || '';
        document.getElementById('product-extra-refs').value = pub.extraRefs || '';
        productRefInput.value = pub.reference || '';

        if (productHasWhatsappInput) {
            productHasWhatsappInput.checked = pub.hasWhatsapp === true;
        }

        typeCalle.classList.remove('selected');
        typeEstablecimiento.classList.remove('selected');
        if (pub.sellerType === 'calle') typeCalle.classList.add('selected');
        else typeEstablecimiento.classList.add('selected');

        photoSlots.forEach(resetSlot);
        const images = [pub.mainImage, ...(pub.images || [])].filter(Boolean);
        images.forEach((url, index) => {
            if (index < photoSlots.length) setSlotImageFromUrl(photoSlots[index], url);
        });

        onCategoryChange();

        if (pub.unitCode && unitGroup && !unitGroup.classList.contains('hidden')) {
            const exists = [...productUnitSelect.options].some(o => o.value === pub.unitCode);
            if (exists) productUnitSelect.value = pub.unitCode;
        }

        if (pub.condition && conditionGroup && !conditionGroup.classList.contains('hidden')) {
            const chips = conditionChips.querySelectorAll('.condition-chip');
            chips.forEach(c => {
                const match = c.dataset.condition === pub.condition;
                c.classList.toggle('active', match);
                c.setAttribute('aria-checked', match ? 'true' : 'false');
            });
        }

        if (pub.presentation && pub.presentation.quantity &&
            presentationGroup && !presentationGroup.classList.contains('hidden')) {
            productPresentationQty.value = pub.presentation.quantity;
            if (pub.presentation.unitCode) {
                const existsP = [...productPresentationUnit.options].some(o => o.value === pub.presentation.unitCode);
                if (existsP) productPresentationUnit.value = pub.presentation.unitCode;
            }
        }

        applyScheduleToForm(pub.schedule || null);

        AppState.currentLocation = {
            latitude: pub.latitude, longitude: pub.longitude, accuracy: pub.accuracy,
            address: pub.address, city: pub.city, state: pub.state, country: pub.country
        };

        updateDescriptionCounter();
        updatePriceHint();

        AppState.formDirtyState = false;

        publicationForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* =====================================================
       FOLLOW EN SHEET DE PRODUCTO
       ===================================================== */
    function updateSheetFollowButton() {
        if (!sheetSellerFollowBtn) return;
        const pub = AppState.currentProduct;
        if (!pub || !pub.userId) {
            sheetSellerFollowBtn.classList.add('hidden');
            return;
        }
        // Ocultar si soy yo mismo o no estoy autenticado
        if (!AppState.currentUser || AppState.currentUser.uid === pub.userId) {
            sheetSellerFollowBtn.classList.add('hidden');
            return;
        }
        sheetSellerFollowBtn.classList.remove('hidden');

        const isFollowing = !!(AppState.followingIds && AppState.followingIds.has(pub.userId));
        const icon = sheetSellerFollowBtn.querySelector('i');
        if (isFollowing) {
            sheetSellerFollowBtn.classList.add('is-following');
            if (icon) icon.className = 'fa-solid fa-heart';
            sheetSellerFollowBtn.setAttribute('aria-label', 'Dejar de seguir');
        } else {
            sheetSellerFollowBtn.classList.remove('is-following');
            if (icon) icon.className = 'fa-regular fa-heart';
            sheetSellerFollowBtn.setAttribute('aria-label', 'Seguir vendedor');
        }
    }

    async function onSheetFollowClick(e) {
        e.preventDefault();
        e.stopPropagation();

        const pub = AppState.currentProduct;
        if (!pub || !pub.userId) return;

        if (!AppState.currentUser) {
            AppState.pendingAction = { type: 'followSeller', sellerUid: pub.userId };
            AuthUI.openAuthModal('login');
            Toast.info('Inicia sesión para seguir vendedores.');
            return;
        }

        if (sheetSellerFollowBtn.disabled) return;
        sheetSellerFollowBtn.disabled = true;

        try {
            const nowFollowing = await FollowService.toggleFollow(
                AppState.currentUser.uid, pub.userId
            );
            if (window.HapticsService) HapticsService.light();
            updateSheetFollowButton();
            Toast.success(nowFollowing
                ? 'Ahora sigues a este vendedor.'
                : 'Dejaste de seguir al vendedor.');
        } catch (err) {
            Toast.error(ErrorHandler.toUserMessage(err, { context: 'sheet.follow' }));
        } finally {
            sheetSellerFollowBtn.disabled = false;
        }
    }

    /**
     * Llamado desde app.js (pendingAction.followSeller) cuando el
     * usuario acaba de iniciar sesión. Refresca el ícono si el sheet
     * está abierto para el mismo vendedor.
     */
    function refreshSheetFollowState(sellerUid) {
        if (!isSheetOpen) return;
        const pub = AppState.currentProduct;
        if (!pub || pub.userId !== sellerUid) return;
        updateSheetFollowButton();
    }

    /* =====================================================
       SHEET DE PRODUCTO
       ===================================================== */
    function openProductSheet(product) {
        AppState.currentProduct = product;
        currentGalleryIndex = 0;

        sheetCategory.textContent = product.category || 'Producto';
        sheetName.textContent = product.name || '';

        if (sheetSellerBlock) {
            sheetSellerBlock.classList.remove('hidden');
            sheetSellerAvatar.innerHTML = '<i class="fa-solid fa-user"></i>';
            sheetSellerUsername.textContent = '@…';
            sheetSellerBlock.dataset.uid = product.userId || '';

            if (product.sellerUsername || product.sellerAvatarUrl) {
                if (product.sellerAvatarUrl) {
                    sheetSellerAvatar.innerHTML =
                        `<img src="${Formatters.safeUrl(product.sellerAvatarUrl)}" alt="">`;
                }
                sheetSellerUsername.textContent = product.sellerUsername
                    ? '@' + product.sellerUsername
                    : '@usuario';
            } else if (window.SellerProfileService && product.userId) {
                SellerProfileService.resolveIdentity(product).then(identity => {
                    if (!identity) {
                        sheetSellerBlock.classList.add('hidden');
                        return;
                    }
                    if (identity.avatarUrl) {
                        sheetSellerAvatar.innerHTML =
                            `<img src="${Formatters.safeUrl(identity.avatarUrl)}" alt="">`;
                    }
                    sheetSellerUsername.textContent = identity.username
                        ? '@' + identity.username
                        : '@usuario';
                    sheetSellerBlock.dataset.uid = identity.uid || product.userId || '';
                }).catch(() => {
                    sheetSellerBlock.classList.add('hidden');
                });
            }
        }

        // Corazón de follow
        updateSheetFollowButton();

        if (product.storeName) {
            sheetStore.innerHTML = `<i class="fa-solid fa-store"></i> ${Formatters.escapeHtml(product.storeName)}`;
            sheetStore.style.display = 'flex';
        } else {
            sheetStore.style.display = 'none';
        }

        if (sheetBadgesRow) {
            const badges = [];
            if (product.condition) {
                const label = window.CategoryConfig ? CategoryConfig.conditionLabel(product.condition) : '';
                if (label) badges.push(`<span class="sheet-badge sheet-badge-condition">
                    <i class="fa-solid fa-circle-check"></i> ${Formatters.escapeHtml(label)}
                </span>`);
            }
            if (product.presentation && product.presentation.quantity) {
                const short = window.UnitCatalog ? UnitCatalog.short(product.presentation.unitCode) : '';
                if (short) badges.push(`<span class="sheet-badge sheet-badge-presentation">
                    <i class="fa-solid fa-box-open"></i> ${product.presentation.quantity} ${Formatters.escapeHtml(short)}
                </span>`);
            }
            if (badges.length) {
                sheetBadgesRow.innerHTML = badges.join('');
                sheetBadgesRow.classList.remove('hidden');
            } else {
                sheetBadgesRow.innerHTML = '';
                sheetBadgesRow.classList.add('hidden');
            }
        }

        sheetPrice.textContent = Formatters.formatPriceWithUnit(product.price, product.unitCode);
        sheetTime.innerHTML = `<i class="fa-solid fa-clock"></i> ${Formatters.formatRelativeTime(product.createdAt)}`;
        sheetDesc.textContent = product.description || 'Sin descripción.';

        if (product.extraRefs && product.extraRefs.trim()) {
            sheetRefsBlock.classList.remove('hidden');
            sheetRefs.textContent = product.extraRefs;
        } else {
            sheetRefsBlock.classList.add('hidden');
        }

        const baseRef = product.address || product.reference || 'Sin referencia';
        let refText = baseRef;
        if (AppState.userCoords && product.latitude != null && product.longitude != null) {
            const meters = Formatters.calculateDistance(
                AppState.userCoords.latitude, AppState.userCoords.longitude,
                product.latitude, product.longitude
            );
            const dist = Formatters.formatDistance(meters);
            if (dist) refText = `${baseRef} · ${dist}`;
        }
        sheetRef.textContent = refText;

        const phoneRaw = product.phone && String(product.phone).trim();
        if (phoneRaw) {
            sheetContactRow.classList.remove('hidden');
            sheetPhone.textContent = product.phone;
            sheetCall.href = `tel:${product.phone.replace(/\s+/g, '')}`;
            if (product.hasWhatsapp === true && sheetWhatsapp) {
                sheetWhatsapp.classList.remove('hidden');
            } else if (sheetWhatsapp) {
                sheetWhatsapp.classList.add('hidden');
            }
        } else {
            sheetContactRow.classList.add('hidden');
        }

        const scheduleFull = Formatters.formatScheduleFull(product.schedule);
        if (scheduleFull) {
            sheetScheduleBlock.classList.remove('hidden');
            sheetScheduleText.textContent = scheduleFull;
        } else {
            sheetScheduleBlock.classList.add('hidden');
        }

        const allImages = [product.mainImage, ...(product.images || [])].filter(Boolean);
        buildGallery(allImages);

        sheetBackdrop.classList.add('open');
        isSheetOpen = true;
        document.body.style.overflow = 'hidden';
        FavoriteUI.updateAllButtons();

        if (!productSheetHistoryPushed) {
            history.pushState({ view: AppState.currentView, overlay: 'product', productId: product.id }, '', '');
            productSheetHistoryPushed = true;
        }
    }

    function closeProductSheet(syncHistory = true) {
        sheetBackdrop.classList.remove('open');
        isSheetOpen = false;
        document.body.style.overflow = '';
        AppState.currentProduct = null;
        if (sheetSellerFollowBtn) sheetSellerFollowBtn.classList.add('hidden');

        if (productSheetHistoryPushed) {
            productSheetHistoryPushed = false;
            if (syncHistory) {
                suppressPopstate = true;
                try { history.back(); } catch (e) {}
            }
        }
    }

    /* =====================================================
       WHATSAPP CONTEXTUAL
       ===================================================== */
    function buildWhatsappMessage(pub) {
        const name = pub && pub.name ? `"${pub.name}"` : 'una publicación';
        return `Hola, vi tu publicación de ${name} en PipGo. ` +
               `Me interesa y quisiera saber si todavía está disponible.`;
    }

    function normalizeWhatsappPhone(raw) {
        const digits = String(raw || '').replace(/\D/g, '');
        if (!digits) return '';
        if (digits.length === 10) return '52' + digits;
        if (digits.length >= 11 && digits.length <= 15) return digits;
        return digits;
    }

    function openWhatsappForProduct(pub) {
        if (!pub || pub.hasWhatsapp !== true) {
            Toast.warning('Este vendedor no ha habilitado WhatsApp.');
            return;
        }
        if (!pub.phone || !String(pub.phone).trim()) {
            Toast.warning('Este vendedor no tiene un teléfono de contacto.');
            return;
        }
        const phone = normalizeWhatsappPhone(pub.phone);
        if (!phone) { Toast.warning('El teléfono del vendedor no es válido.'); return; }

        const message = buildWhatsappMessage(pub);
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

        try {
            if (window.cordova && window.cordova.InAppBrowser) {
                cordova.InAppBrowser.open(url, '_system');
                return;
            }
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser) {
                window.Capacitor.Plugins.Browser.open({ url });
                return;
            }
        } catch (e) { Logger.warn('WhatsApp nativo falló, usando window.open', e); }
        window.open(url, '_blank', 'noopener');
    }

    /* ---------- Galería ---------- */
    function buildGallery(images) {
        galleryTrack.innerHTML = '';
        galleryDots.innerHTML = '';
        lightboxImages = images.slice();

        if (!images.length) {
            const slide = document.createElement('div');
            slide.className = 'gallery-slide';
            slide.style.background = 'var(--bg)';
            galleryTrack.appendChild(slide);
        } else {
            images.forEach((imgUrl, index) => {
                const slide = document.createElement('div');
                slide.className = 'gallery-slide';
                const img = document.createElement('img');
                img.src = Formatters.safeUrl(imgUrl) || '';
                img.alt = `Imagen ${index + 1}`;
                img.loading = 'lazy';
                img.draggable = false;
                slide.appendChild(img);
                slide.addEventListener('click', () => openLightbox(index));
                galleryTrack.appendChild(slide);

                const dot = document.createElement('span');
                dot.className = `gallery-dot ${index === 0 ? 'active' : ''}`;
                dot.dataset.index = index;
                dot.addEventListener('click', (e) => { e.stopPropagation(); goToGallerySlide(index); });
                galleryDots.appendChild(dot);
            });
        }

        currentGalleryIndex = 0;
        updateGalleryTransform(false);
        updateGalleryDots();
    }

    function goToGallerySlide(index) {
        const total = galleryTrack.children.length;
        if (index < 0 || index >= total) return;
        currentGalleryIndex = index;
        updateGalleryTransform(true);
        updateGalleryDots();
    }

    function updateGalleryTransform(animate = true) {
        galleryTrack.style.transition = animate ? 'transform 0.4s cubic-bezier(0.4,0,0.2,1)' : 'none';
        galleryTrack.style.transform = `translateX(-${currentGalleryIndex * 100}%)`;
    }

    function updateGalleryDots() {
        galleryDots.querySelectorAll('.gallery-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === currentGalleryIndex);
        });
    }

    let galStartX = 0, galCurX = 0, galSwiping = false;

    function handleGalleryPointerDown(e) {
        if (e.pointerType === 'pen') return;
        galSwiping = true;
        galStartX = e.clientX; galCurX = e.clientX;
        galleryTrack.style.transition = 'none';
    }
    function handleGalleryPointerMove(e) {
        if (!galSwiping) return;
        galCurX = e.clientX;
        const dx = galCurX - galStartX;
        const baseOffset = -currentGalleryIndex * galleryTrack.offsetWidth;
        galleryTrack.style.transform = `translateX(${baseOffset + dx}px)`;
    }
    function handleGalleryPointerUp() {
        if (!galSwiping) return;
        galSwiping = false;
        const dx = galCurX - galStartX;
        const threshold = galleryTrack.offsetWidth * 0.2;
        const total = galleryTrack.children.length;
        if (dx < -threshold && currentGalleryIndex < total - 1) currentGalleryIndex++;
        else if (dx > threshold && currentGalleryIndex > 0) currentGalleryIndex--;
        updateGalleryTransform(true);
        updateGalleryDots();
    }

    /* =====================================================
       LIGHTBOX
       ===================================================== */
    function openLightbox(index) {
        if (!lightboxImages.length) return;
        lightboxImages = lightboxImages.slice();
        lightboxIndex = index;
        lightboxTrack.innerHTML = '';
        lightboxDots.innerHTML = '';

        lightboxImages.forEach((url, i) => {
            const slide = document.createElement('div');
            slide.className = 'lightbox-slide';
            const img = document.createElement('img');
            img.src = Formatters.safeUrl(url);
            img.alt = `Imagen ${i + 1}`;
            img.draggable = false;
            slide.appendChild(img);
            lightboxTrack.appendChild(slide);

            const dot = document.createElement('span');
            dot.className = `gallery-dot ${i === index ? 'active' : ''}`;
            dot.dataset.index = i;
            dot.addEventListener('click', (e) => { e.stopPropagation(); goToLightbox(i); });
            lightboxDots.appendChild(dot);
        });

        lightbox.classList.remove('hidden');
        goToLightbox(index, false);
        document.body.style.overflow = 'hidden';

        if (!lightboxHistoryPushed) {
            history.pushState({ view: AppState.currentView, overlay: 'lightbox' }, '', '');
            lightboxHistoryPushed = true;
        }
    }

    function closeLightbox(syncHistory = true) {
        lightbox.classList.add('hidden');
        lightboxTrack.innerHTML = '';
        lightboxDots.innerHTML = '';
        lightboxImages = [];
        lbCurrentScale = 1;
        if (isSheetOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';

        if (lightboxHistoryPushed) {
            lightboxHistoryPushed = false;
            if (syncHistory) {
                suppressPopstate = true;
                try { history.back(); } catch (e) {}
            }
        }
    }

    function isLightboxOpen() {
        return lightbox && !lightbox.classList.contains('hidden');
    }

    function goToLightbox(index, animate = true) {
        const total = lightboxImages.length;
        if (index < 0 || index >= total) return;
        lightboxIndex = index;
        lightboxTrack.style.transition = animate ? 'transform 0.35s cubic-bezier(0.4,0,0.2,1)' : 'none';
        lightboxTrack.style.transform = `translateX(-${index * 100}%)`;
        lightboxCounter.textContent = `${index + 1} / ${total}`;
        lightboxDots.querySelectorAll('.gallery-dot').forEach((d, i) => {
            d.classList.toggle('active', i === index);
        });
        lbCurrentScale = 1;
        lbActiveImg = null;
        lightboxTrack.querySelectorAll('img').forEach(im => {
            im.style.transform = 'scale(1)';
        });
    }

    function handleLightboxDown(e) {
        lbPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (lbPointers.size === 1) {
            lbDragging = true;
            lbStartX = e.clientX; lbCurX = e.clientX;
            lightboxTrack.style.transition = 'none';
        } else if (lbPointers.size === 2) {
            lbDragging = false;
            const [a, b] = [...lbPointers.values()];
            lbPinchStart = Math.hypot(b.x - a.x, b.y - a.y);
            lbActiveImg = lightboxTrack.children[lightboxIndex]?.querySelector('img') || null;
            if (lbActiveImg) lbActiveImg.style.transition = 'none';
        }
    }
    function handleLightboxMove(e) {
        if (!lbPointers.has(e.pointerId)) return;
        lbPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (lbPointers.size === 1 && lbDragging) {
            lbCurX = e.clientX;
            const dx = lbCurX - lbStartX;
            const base = -lightboxIndex * lightboxTrack.offsetWidth;
            lightboxTrack.style.transform = `translateX(${base + dx}px)`;
        } else if (lbPointers.size === 2) {
            const [a, b] = [...lbPointers.values()];
            const dist = Math.hypot(b.x - a.x, b.y - a.y);
            lbCurrentScale = Math.min(Math.max(lbPinchScale * (dist / lbPinchStart), 1), 4);
            if (lbActiveImg) lbActiveImg.style.transform = `scale(${lbCurrentScale})`;
        }
    }
    function handleLightboxUp(e) {
        if (!lbPointers.has(e.pointerId)) return;
        lbPointers.delete(e.pointerId);

        if (lbPointers.size < 2 && lbActiveImg) {
            lbPinchScale = lbCurrentScale;
            if (lbPointers.size === 0) lbPinchStart = 0;
        }

        if (lbPointers.size === 0 && lbDragging) {
            lbDragging = false;
            const dx = lbCurX - lbStartX;
            const threshold = lightboxTrack.offsetWidth * 0.2;
            if (dx < -threshold && lightboxIndex < lightboxImages.length - 1) goToLightbox(lightboxIndex + 1);
            else if (dx > threshold && lightboxIndex > 0) goToLightbox(lightboxIndex - 1);
            else goToLightbox(lightboxIndex);
        } else if (lbPointers.size === 0) {
            goToLightbox(lightboxIndex);
        }
    }

    /* =====================================================
       DRAG DEL SHEET
       ===================================================== */
    function startDragSheet(e) {
        if (!isSheetOpen || productSheet.scrollTop > 0) return;
        isDraggingSheet = true;
        sheetStartY = e.clientY; sheetCurrentY = e.clientY;
        sheetBackdrop.classList.add('dragging');
        productSheet.style.transition = 'none';
        if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    }
    function moveDragSheet(e) {
        if (!isDraggingSheet) return;
        sheetCurrentY = e.clientY;
        const dy = sheetCurrentY - sheetStartY;
        if (dy > 0) productSheet.style.transform = `translateY(${dy}px)`;
    }
    function endDragSheet(e) {
        if (!isDraggingSheet) return;
        isDraggingSheet = false;
        sheetBackdrop.classList.remove('dragging');
        productSheet.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
        const dy = sheetCurrentY - sheetStartY;
        if (dy > 100) {
            closeProductSheet();
            productSheet.style.transform = '';
        } else {
            productSheet.style.transform = 'translateY(0)';
        }
        sheetCurrentY = 0;
        if (e.target.releasePointerCapture) e.target.releasePointerCapture(e.pointerId);
    }

    /* =====================================================
       NAVEGACIÓN EXTERNA (mapas)
       ===================================================== */
    function openDirections(product) {
        if (!product) return;
        const lat = product.latitude, lon = product.longitude;
        if (lat == null || lon == null) {
            Toast.warning('Esta publicación no tiene coordenadas.');
            return;
        }
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
        if (window.cordova && window.cordova.InAppBrowser) {
            cordova.InAppBrowser.open(url, '_system');
        } else {
            window.open(url, '_blank', 'noopener');
        }
    }

    /* =====================================================
       INIT
       ===================================================== */
    function init() {
        if (initialized) return;
        initialized = true;

        publicationForm = document.getElementById('publication-form');
        stepType = document.getElementById('step-type');
        typeCalle = document.getElementById('type-calle');
        typeEstablecimiento = document.getElementById('type-establecimiento');
        btnBackType = document.getElementById('btn-back-type');
        btnGetLocation = document.getElementById('btn-get-location');
        productRefInput = document.getElementById('product-ref');
        btnSubmit = document.getElementById('btn-submit');
        btnSubmitText = document.getElementById('btn-submit-text');
        formError = document.getElementById('form-error');
        loginRequired = document.getElementById('login-required');
        formWrapper = document.getElementById('form-wrapper');
        productsGrid = document.getElementById('products-grid');
        searchResults = document.getElementById('search-results');
        searchInput = document.getElementById('search-input');
        clearSearch = document.getElementById('clear-search');
        searchSuggestions = document.getElementById('search-suggestions');
        suggestionChips = document.getElementById('suggestion-chips');
        searchSubtitle = document.getElementById('search-subtitle');
        searchSellersSection = document.getElementById('search-sellers-section');
        searchSellersResults = document.getElementById('search-sellers-results');
        sheetBackdrop = document.getElementById('sheet-backdrop');
        productSheet = document.getElementById('product-sheet');
        sheetDragZone = document.getElementById('sheet-drag-zone');
        galleryTrack = document.getElementById('gallery-track');
        galleryDots = document.getElementById('gallery-dots');
        galleryClose = document.getElementById('gallery-close');
        galleryPrev = document.getElementById('gallery-prev');
        galleryNext = document.getElementById('gallery-next');
        sheetCategory = document.getElementById('sheet-category');
        sheetName = document.getElementById('sheet-name');
        sheetStore = document.getElementById('sheet-store');
        sheetPrice = document.getElementById('sheet-price');
        sheetTime = document.getElementById('sheet-time');
        sheetDesc = document.getElementById('sheet-desc');
        sheetRefsBlock = document.getElementById('sheet-refs-block');
        sheetRefs = document.getElementById('sheet-refs');
        sheetRef = document.getElementById('sheet-ref');
        sheetContactRow = document.getElementById('sheet-contact-row');
        sheetPhone = document.getElementById('sheet-phone');
        sheetCall = document.getElementById('sheet-call');
        sheetWhatsapp = document.getElementById('sheet-whatsapp');
        sheetScheduleBlock = document.getElementById('sheet-schedule-block');
        sheetScheduleText = document.getElementById('sheet-schedule-text');
        sheetBadgesRow = document.getElementById('sheet-badges-row');
        sheetSellerBlock = document.getElementById('sheet-seller-block');
        sheetSellerAvatar = document.getElementById('sheet-seller-avatar');
        sheetSellerUsername = document.getElementById('sheet-seller-username');
        sheetSellerFollowBtn = document.getElementById('sheet-seller-follow-btn');
        btnDirections = document.getElementById('btn-directions');
        sheetMapLink = document.getElementById('sheet-map-link');
        btnChatV2 = document.getElementById('btn-chat-v2');

        productHasWhatsappInput = document.getElementById('product-has-whatsapp');
        productPriceInput = document.getElementById('product-price');

        productCategorySelect = document.getElementById('product-category');
        unitGroup = document.getElementById('unit-group');
        productUnitSelect = document.getElementById('product-unit');
        unitHint = document.getElementById('unit-hint');
        conditionGroup = document.getElementById('condition-group');
        conditionChips = document.getElementById('condition-chips');
        presentationGroup = document.getElementById('presentation-group');
        productPresentationQty = document.getElementById('product-presentation-qty');
        productPresentationUnit = document.getElementById('product-presentation-unit');
        descriptionInput = document.getElementById('product-desc');
        descriptionCounter = document.getElementById('desc-counter');

        previewModal = document.getElementById('preview-modal');
        previewClose = document.getElementById('preview-close');
        previewBody = document.getElementById('preview-body');
        previewBack = document.getElementById('preview-back');
        previewPublish = document.getElementById('preview-publish');
        btnPreview = document.getElementById('btn-preview');

        homeNewBanner = document.getElementById('home-new-banner');
        homeNewBannerText = document.getElementById('home-new-banner-text');

        draftModal = document.getElementById('draft-modal');
        draftContinueBtn = document.getElementById('draft-continue');
        draftDiscardBtn = document.getElementById('draft-discard');
        draftCloseBtn = document.getElementById('draft-close');

        unsavedModal = document.getElementById('unsaved-modal');

        scheduleToggle = document.getElementById('schedule-toggle');
        schedulePanel = document.getElementById('schedule-panel');
        scheduleDays = document.getElementById('schedule-days');
        scheduleStart = document.getElementById('schedule-start');
        scheduleEnd = document.getElementById('schedule-end');
        scheduleToggleText = document.getElementById('schedule-toggle-text');
        btnClearSchedule = document.getElementById('btn-clear-schedule');

        lightbox = document.getElementById('lightbox');
        lightboxTrack = document.getElementById('lightbox-track');
        lightboxClose = document.getElementById('lightbox-close');
        lightboxCounter = document.getElementById('lightbox-counter');
        lightboxDots = document.getElementById('lightbox-dots');

        photoSlots = [
            { slot: document.getElementById('photo-slot-main'), input: document.getElementById('photo-input-main'), preview: document.getElementById('photo-preview-main'), removeBtn: document.querySelector('[data-preview="photo-preview-main"]'), blob: null, previewUrl: null, uploadedUrl: '' },
            { slot: document.getElementById('photo-slot-2'), input: document.getElementById('photo-input-2'), preview: document.getElementById('photo-preview-2'), removeBtn: document.querySelector('[data-preview="photo-preview-2"]'), blob: null, previewUrl: null, uploadedUrl: '' },
            { slot: document.getElementById('photo-slot-3'), input: document.getElementById('photo-input-3'), preview: document.getElementById('photo-preview-3'), removeBtn: document.querySelector('[data-preview="photo-preview-3"]'), blob: null, previewUrl: null, uploadedUrl: '' },
            { slot: document.getElementById('photo-slot-4'), input: document.getElementById('photo-input-4'), preview: document.getElementById('photo-preview-4'), removeBtn: document.querySelector('[data-preview="photo-preview-4"]'), blob: null, previewUrl: null, uploadedUrl: '' },
            { slot: document.getElementById('photo-slot-5'), input: document.getElementById('photo-input-5'), preview: document.getElementById('photo-preview-5'), removeBtn: document.querySelector('[data-preview="photo-preview-5"]'), blob: null, previewUrl: null, uploadedUrl: '' }
        ];

        filterModal = document.getElementById('filter-modal');
        filterClose = document.getElementById('filter-close');
        filterApply = document.getElementById('filter-apply');
        filterCategory = document.getElementById('filter-category');
        filterSeller = document.getElementById('filter-seller');

        if (productPriceInput) {
            productPriceInput.addEventListener('input', (e) => {
                e.target.value = Formatters.sanitizePriceInput(e.target.value);
                updatePriceHint();
            });
        }

        typeCalle.addEventListener('click', () => selectSellerType(typeCalle));
        typeEstablecimiento.addEventListener('click', () => selectSellerType(typeEstablecimiento));
        btnBackType.addEventListener('click', () => {
            if (AppState.formDirtyState) {
                confirmLeave(() => {
                    AppState.formDirtyState = false;
                    resetFormMode();
                });
            } else {
                resetFormMode();
            }
        });

        photoSlots.forEach(slot => {
            slot.slot.addEventListener('click', () => { if (!slot.uploadedUrl) slot.input.click(); });
            slot.input.addEventListener('change', e => {
                const file = e.target.files[0];
                if (file) { processAndPreview(slot, file); markFormDirty(); }
            });
            slot.removeBtn.addEventListener('click', e => {
                e.stopPropagation();
                resetSlot(slot);
                markFormDirty();
            });
        });

        productCategorySelect.addEventListener('change', () => { onCategoryChange(); markFormDirty(); });
        productUnitSelect.addEventListener('change', () => { updatePriceHint(); markFormDirty(); });

        descriptionInput.addEventListener('input', () => { updateDescriptionCounter(); markFormDirty(); });

        publicationForm.addEventListener('input', () => {
            if (publicationForm.classList.contains('hidden')) return;
            markFormDirty();
        });
        publicationForm.addEventListener('change', () => {
            if (publicationForm.classList.contains('hidden')) return;
            markFormDirty();
        });

        if (btnPreview) btnPreview.addEventListener('click', openPreview);
        if (previewClose) previewClose.addEventListener('click', () => closePreview());
        if (previewBack) previewBack.addEventListener('click', () => closePreview());
        if (previewPublish) previewPublish.addEventListener('click', () => {
            closePreview();
            if (publicationForm.requestSubmit) {
                publicationForm.requestSubmit();
            } else {
                const evt = new Event('submit', { cancelable: true, bubbles: true });
                publicationForm.dispatchEvent(evt);
            }
        });
        if (previewModal) {
            previewModal.addEventListener('click', (e) => {
                if (e.target === previewModal) closePreview();
            });
        }

        if (homeNewBanner) {
            homeNewBanner.addEventListener('click', () => applyPendingHomeUpdates());
        }

        if (draftContinueBtn) {
            draftContinueBtn.addEventListener('click', () => {
                const d = Storage.get(DRAFT_KEY, null);
                draftModal.classList.add('hidden');
                if (d) applyDraftToForm(d);
            });
        }
        if (draftDiscardBtn) {
            draftDiscardBtn.addEventListener('click', () => {
                draftModal.classList.add('hidden');
                clearDraft();
                AppState.formDirtyState = false;
            });
        }
        if (draftCloseBtn) {
            draftCloseBtn.addEventListener('click', () => {
                draftModal.classList.add('hidden');
            });
        }

        scheduleToggle.addEventListener('click', () => {
            const willOpen = schedulePanel.classList.contains('hidden');
            setSchedulePanelOpen(willOpen);
        });
        scheduleDays.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-day]');
            if (!btn) return;
            btn.classList.toggle('active');
            updateScheduleVisualState();
        });
        scheduleStart.addEventListener('change', updateScheduleVisualState);
        scheduleEnd.addEventListener('change', updateScheduleVisualState);
        btnClearSchedule.addEventListener('click', () => {
            resetSchedule();
            setSchedulePanelOpen(false);
        });

        btnGetLocation.addEventListener('click', handleGetLocation);
        publicationForm.addEventListener('submit', handleSubmit);

        searchInput.addEventListener('input', handleSearchInput);
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            clearSearch.classList.remove('visible');
            searchSuggestions.style.display = 'block';
            handleSearchInput();
        });

        const btnFilters = document.getElementById('btn-search-filters');
        if (btnFilters) btnFilters.addEventListener('click', openFilterModal);
        if (filterClose) filterClose.addEventListener('click', closeFilterModal);
        if (filterApply) filterApply.addEventListener('click', applyFilters);

        galleryClose.addEventListener('click', () => closeProductSheet());
        galleryPrev.addEventListener('click', (e) => { e.stopPropagation(); goToGallerySlide(currentGalleryIndex - 1); });
        galleryNext.addEventListener('click', (e) => { e.stopPropagation(); goToGallerySlide(currentGalleryIndex + 1); });
        sheetDragZone.addEventListener('pointerdown', startDragSheet);
        sheetDragZone.addEventListener('pointermove', moveDragSheet);
        sheetDragZone.addEventListener('pointerup', endDragSheet);
        sheetDragZone.addEventListener('pointercancel', endDragSheet);
        sheetBackdrop.addEventListener('click', e => { if (e.target === sheetBackdrop) closeProductSheet(); });

        galleryTrack.addEventListener('pointerdown', handleGalleryPointerDown);
        galleryTrack.addEventListener('pointermove', handleGalleryPointerMove);
        galleryTrack.addEventListener('pointerup', handleGalleryPointerUp);
        galleryTrack.addEventListener('pointercancel', handleGalleryPointerUp);

        btnDirections.addEventListener('click', () => openDirections(AppState.currentProduct));
        sheetMapLink.addEventListener('click', () => openDirections(AppState.currentProduct));

        if (sheetWhatsapp) {
            sheetWhatsapp.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!AppState.currentProduct) return;
                openWhatsappForProduct(AppState.currentProduct);
            });
        }

        if (sheetSellerBlock) {
            sheetSellerBlock.addEventListener('click', () => {
                const uid = sheetSellerBlock.dataset.uid;
                if (!uid) return;
                if (!window.SellerProfileUI) return;
                SellerProfileUI.open(uid);
            });
            sheetSellerBlock.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const uid = sheetSellerBlock.dataset.uid;
                    if (uid && window.SellerProfileUI) SellerProfileUI.open(uid);
                }
            });
        }

        // Corazón de follow en el sheet
        if (sheetSellerFollowBtn) {
            sheetSellerFollowBtn.addEventListener('click', onSheetFollowClick);
        }

        btnChatV2.addEventListener('click', async () => {
            const pub = AppState.currentProduct;
            if (!pub || !pub.userId) return;

            if (AppState.currentUser && pub.userId === AppState.currentUser.uid) {
                Toast.warning('Esta es tu propia publicación.');
                return;
            }

            if (!AppState.currentUser) {
                // Guardar contexto y CERRAR el sheet ANTES de abrir el login
                AppState.pendingAction = {
                    type: 'openChatWith',
                    sellerUid: pub.userId,
                    fromPublication: true,
                    publicationContext: { id: pub.id, name: pub.name, mainImage: pub.mainImage }
                };
                closeProductSheet();
                AuthUI.openAuthModal('login');
                Toast.info('Inicia sesión para contactar al vendedor.');
                return;
            }

            const originalHtml = btnChatV2.innerHTML;
            btnChatV2.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Abriendo conversación…';
            btnChatV2.disabled = true;

            try {
                closeProductSheet();
                if (window.MessagingUI && MessagingUI.openChatWith) {
                    MessagingUI.openChatWith(pub.userId, {
                        fromPublication: true,
                        publicationContext: { id: pub.id, name: pub.name, mainImage: pub.mainImage }
                    });
                } else {
                    Toast.error('La mensajería no está disponible.');
                }
            } finally {
                btnChatV2.innerHTML = originalHtml;
                btnChatV2.disabled = false;
            }
        });

        lightboxClose.addEventListener('click', () => closeLightbox());
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
        lightboxTrack.addEventListener('pointerdown', handleLightboxDown);
        lightboxTrack.addEventListener('pointermove', handleLightboxMove);
        lightboxTrack.addEventListener('pointerup', handleLightboxUp);
        lightboxTrack.addEventListener('pointercancel', handleLightboxUp);

        updateDescriptionCounter();
        updateFilterBadge();

        window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        });
    }

    /* =====================================================
       API PÚBLICA
       ===================================================== */
    window.PublicationUI = {
        init,
        updateAuthUI,
        loadPublications,
        renderProducts,
        renderSearchResults,
        renderHomeFilters,
        showAllPublications,
        onEnterSearch,
        onEnterHome,
        onLeaveHome,
        stopHomeSubscription,
        openProductSheet,
        closeProductSheet,
        openLightbox,
        closeLightbox,
        openEditForm,
        deletePublication,
        resetFormMode,
        refreshSheetFollowState,
        getFilteredList,
        isProductSheetOpen: () => isSheetOpen,
        isLightboxOpen,
        isFilterModalOpen,
        closeFilterModal,
        isPreviewModalOpen: () => previewModal && !previewModal.classList.contains('hidden'),
        closePreview,
        hasUnsavedChanges,
        confirmLeave,
        consumeSuppressPopstate: () => {
            if (suppressPopstate) {
                suppressPopstate = false;
                return true;
            }
            return false;
        }
    };
})();