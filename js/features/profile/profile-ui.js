/* =====================================================
   PIPGO · PROFILE UI
   Perfil + Ajustes + edición inline de username.
   Incluye accesos a Aviso de Privacidad y Términos.
   Incluye pestaña "Siguiendo" completamente funcional.
   ===================================================== */

(function () {
    let profileContent, avatarInput;
    let ownPublications = [];
    let favorites = [];
    let soldPublications = [];
    let followingProfiles = [];
    let initialized = false;

    let renderToken = 0;

    let activeProfileTab = 'own';

    let settingsModal, settingsClose;

    /* Refs de edición de username */
    let usernameDisplayWrap, usernameEditWrap, usernameRowButtons,
        usernameEditButtons, settingsUsernameValue,
        btnEditUsername, btnCancelUsernameEdit, btnSaveUsername,
        usernameEditInput, usernameFeedback;
    let usernameDebounceTimer = null;
    let lastCheckedNormalized = '';

    /* -----------------------------------------------------
       TABS — aplicación de estado
       ----------------------------------------------------- */
    function applyTabState() {
        const tabs = document.querySelectorAll('.profile-tab');
        const panels = document.querySelectorAll('.profile-panel');
        if (!tabs.length) return;

        tabs.forEach(tab => {
            const isActive = (tab.dataset.panel || 'own') === activeProfileTab;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        panels.forEach(p => {
            const isActive = p.id === `panel-${activeProfileTab}`;
            p.classList.toggle('active', isActive);
        });
    }

    function resetActiveTab() {
        activeProfileTab = 'own';
    }

    /* -----------------------------------------------------
       LOGIN PROMPT
       ----------------------------------------------------- */
    function renderLoginPrompt() {
        if (!profileContent) return;

        profileContent.innerHTML = `
            <header class="profile-header-pro">
                <div class="profile-header-row">
                    <div class="profile-heading">
                        <div class="title-row"><h2>Perfil</h2></div>
                    </div>
                </div>
            </header>

            <div class="profile-unauth">
                <div class="profile-unauth-hero">
                    <div class="profile-unauth-icon">
                        <i class="fa-solid fa-user"></i>
                    </div>
                    <h2>Tu cuenta PipGo</h2>
                    <p>Inicia sesión para guardar favoritos, publicar productos y contactar vendedores.</p>

                    <div class="profile-unauth-actions">
                        <button class="btn-primary btn-large" id="btn-profile-login">
                            <i class="fa-solid fa-right-to-bracket"></i> Iniciar sesión
                        </button>
                        <button class="profile-unauth-btn-secondary" id="btn-profile-register">
                            <i class="fa-solid fa-user-plus"></i> Crear cuenta nueva
                        </button>
                    </div>
                </div>

                <div class="profile-unauth-benefits">
                    <div class="profile-unauth-benefit">
                        <div class="profile-unauth-benefit-icon tone-green">
                            <i class="fa-solid fa-bookmark"></i>
                        </div>
                        <div class="profile-unauth-benefit-text">
                            <h4>Guarda tus favoritos</h4>
                            <p>Marca productos y encuéntralos cuando los necesites.</p>
                        </div>
                    </div>
                    <div class="profile-unauth-benefit">
                        <div class="profile-unauth-benefit-icon tone-warm">
                            <i class="fa-solid fa-store"></i>
                        </div>
                        <div class="profile-unauth-benefit-text">
                            <h4>Conviértete en vendedor</h4>
                            <p>Publica tus productos y llega a más clientes cerca de ti.</p>
                        </div>
                    </div>
                    <div class="profile-unauth-benefit">
                        <div class="profile-unauth-benefit-icon tone-coffee">
                            <i class="fa-solid fa-comments"></i>
                        </div>
                        <div class="profile-unauth-benefit-text">
                            <h4>Contacta directo</h4>
                            <p>Habla con vendedores por WhatsApp o llamada.</p>
                        </div>
                    </div>
                </div>
            </div>`;

        const btnLogin = document.getElementById('btn-profile-login');
        const btnRegister = document.getElementById('btn-profile-register');
        if (btnLogin) btnLogin.addEventListener('click', () => AuthUI.openAuthModal('login'));
        if (btnRegister) btnRegister.addEventListener('click', () => AuthUI.openAuthModal('register'));
    }

    /* -----------------------------------------------------
       SELLER STATUS CARD
       ----------------------------------------------------- */
    function renderSellerStatusCard() {
        const s = PermissionService.getSellerStatus();
        const role = PermissionService.getRole();

        if (s === 'pending') {
            return `
                <div class="seller-status-card state-pending" id="seller-status-card">
                    <div class="seller-status-card-icon"><i class="fa-solid fa-hourglass-half"></i></div>
                    <div class="seller-status-card-text">
                        <h4>Solicitud en revisión</h4>
                        <p>Estamos revisando tu solicitud para vender.</p>
                    </div>
                    <button class="seller-action-btn" id="btn-seller-status-action">
                        <i class="fa-solid fa-eye"></i> Ver
                    </button>
                </div>`;
        }
        if (s === 'needs_info') {
            return `
                <div class="seller-status-card state-needs-info" id="seller-status-card">
                    <div class="seller-status-card-icon"><i class="fa-solid fa-circle-info"></i></div>
                    <div class="seller-status-card-text">
                        <h4>Información requerida</h4>
                        <p>La administración solicitó información adicional.</p>
                    </div>
                    <button class="seller-action-btn" id="btn-seller-status-action">
                        Revisar
                    </button>
                </div>`;
        }
        if (s === 'rejected') {
            return `
                <div class="seller-status-card state-rejected" id="seller-status-card">
                    <div class="seller-status-card-icon"><i class="fa-solid fa-circle-exclamation"></i></div>
                    <div class="seller-status-card-text">
                        <h4>Solicitud no aprobada</h4>
                        <p>Corrige tu información y vuelve a intentarlo.</p>
                    </div>
                    <button class="seller-action-btn" id="btn-seller-status-action">
                        Corregir
                    </button>
                </div>`;
        }
        if (s === 'suspended') {
            return `
                <div class="seller-status-card state-suspended" id="seller-status-card">
                    <div class="seller-status-card-icon"><i class="fa-solid fa-ban"></i></div>
                    <div class="seller-status-card-text">
                        <h4>Cuenta suspendida</h4>
                        <p>Tu cuenta de vendedor está suspendida temporalmente.</p>
                    </div>
                    <button class="seller-action-btn" id="btn-seller-status-action">Ver</button>
                </div>`;
        }
        if (s === 'approved' && role === 'seller') {
            return `
                <div class="seller-status-card state-approved" id="seller-status-card">
                    <div class="seller-status-card-icon"><i class="fa-solid fa-circle-check"></i></div>
                    <div class="seller-status-card-text">
                        <h4>Vendedor aprobado</h4>
                        <p>Ya puedes crear y administrar tus publicaciones.</p>
                    </div>
                    <button class="seller-action-btn" id="btn-seller-status-action">
                        <i class="fa-solid fa-plus"></i> Publicar
                    </button>
                </div>`;
        }
        return `
            <div class="seller-status-card state-none" id="seller-status-card">
                <div class="seller-status-card-icon"><i class="fa-solid fa-store"></i></div>
                <div class="seller-status-card-text">
                    <h4>¿Quieres vender en PipGo?</h4>
                    <p>Convierte tu cuenta en vendedor y comienza a publicar.</p>
                </div>
                <button class="seller-action-btn" id="btn-seller-status-action">Quiero vender</button>
            </div>`;
    }

    function wireSellerCard() {
        const btn = document.getElementById('btn-seller-status-action');
        if (!btn) return;
        const s = PermissionService.getSellerStatus();
        btn.addEventListener('click', () => {
            if (s === 'approved') NavigationUI.switchView('anunciarme');
            else SellerUI.open();
        });
    }

    /* =====================================================
       RENDER PRINCIPAL
       ===================================================== */
    async function renderProfile() {
        if (!profileContent) return;

        const token = ++renderToken;

        if (!AppState.currentUser) {
            renderLoginPrompt();
            return;
        }

        const uid = AppState.currentUser.uid;

        const hasContent = !!profileContent.querySelector('.profile-header-pro');
        if (!hasContent) {
            profileContent.innerHTML = `
                <header class="profile-header-pro">
                    <div class="profile-header-row">
                        <div class="profile-heading">
                            <div class="title-row"><h2>Perfil</h2></div>
                        </div>
                    </div>
                </header>
                <p style="text-align:center;padding:40px;color:var(--text-tertiary);">Cargando perfil…</p>`;
        }

        try {
            let profile = await UserService.getProfile(uid);

            if (token !== renderToken) return;

            if (!profile) {
                for (let i = 0; i < 3 && !profile; i++) {
                    await new Promise(r => setTimeout(r, 400));
                    if (token !== renderToken) return;
                    profile = await UserService.getProfile(uid);
                }
            }

            if (token !== renderToken) return;

            if (!profile) {
                profileContent.innerHTML = `
                    <header class="profile-header-pro">
                        <div class="profile-header-row">
                            <div class="profile-heading">
                                <div class="title-row"><h2>Perfil</h2></div>
                            </div>
                        </div>
                    </header>
                    <div class="login-required">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        <h3>Preparando tu perfil…</h3>
                        <p>Espera unos segundos e inténtalo de nuevo.</p>
                        <button class="btn-primary" id="btn-profile-retry">Reintentar</button>
                    </div>`;
                const btnRetry = document.getElementById('btn-profile-retry');
                if (btnRetry) btnRetry.addEventListener('click', () => renderProfile());
                return;
            }

            AppState.currentProfile = profile;

            const [ownPubs, favs, following] = await Promise.all([
                PublicationService.getUserPublications(uid).catch(err => {
                    Logger.error('Error cargando publicaciones del perfil', err);
                    return [];
                }),
                FavoriteService.getFavoritePublications(uid).catch(err => {
                    Logger.error('Error cargando favoritos del perfil', err);
                    return [];
                }),
                FollowService.getFollowingProfiles(uid).catch(err => {
                    Logger.error('Error cargando vendedores seguidos', err);
                    return [];
                })
            ]);

            if (token !== renderToken) return;

            ownPublications = ownPubs || [];
            favorites = favs || [];
            followingProfiles = following || [];
            soldPublications = ownPublications.filter(p => p.status === 'sold');

            const activeCount = ownPublications.filter(p => p.status === 'active').length;

            const avatarHtml = profile.avatarUrl
                ? `<img src="${Formatters.safeUrl(profile.avatarUrl)}" alt="Avatar">`
                : `<i class="fa-solid fa-user profile-avatar-fallback-icon"></i>`;

            let isAdmin = false;
            try { isAdmin = window.AdminService && AdminService.isAdmin(); } catch (e) {}

            const adminButtonHtml = isAdmin
                ? `<button class="profile-settings-btn profile-admin-btn" id="btn-open-admin" aria-label="Administración">
                       <i class="fa-solid fa-shield-halved"></i>
                   </button>`
                : '';

            profileContent.innerHTML = `
                <header class="profile-header-pro">
                    <div class="profile-header-row">
                        <div class="profile-heading">
                            <div class="title-row">
                                <h2>Perfil</h2>
                                ${adminButtonHtml}
                                <button class="profile-settings-btn" id="btn-open-settings" aria-label="Ajustes">
                                    <i class="fa-solid fa-gear"></i>
                                </button>
                            </div>
                            <p class="profile-username">@${Formatters.escapeHtml(profile.username || '')}</p>
                        </div>
                        <div class="profile-avatar-wrap">
                            <div class="profile-avatar" id="profile-avatar">${avatarHtml}</div>
                            <button class="profile-avatar-edit" id="btn-change-avatar" aria-label="Cambiar foto">
                                <i class="fa-solid fa-camera"></i>
                            </button>
                        </div>
                    </div>
                    <div class="profile-stats-pro" role="list">
                        <div class="stat-pro pub" role="listitem">
                            <span class="stat-number">${activeCount}</span>
                            <span class="stat-label">Publicaciones</span>
                        </div>
                        <div class="stat-pro fav" role="listitem">
                            <span class="stat-number">${favorites.length}</span>
                            <span class="stat-label">Favoritos</span>
                        </div>
                        <div class="stat-pro sold" role="listitem">
                            <span class="stat-number">${soldPublications.length}</span>
                            <span class="stat-label">Ventas</span>
                        </div>
                    </div>
                </header>
                ${renderSellerStatusCard()}
                <div class="profile-tabs" role="tablist">
                <button class="profile-tab" data-panel="own" role="tab" aria-selected="false">
                    <i class="fa-solid fa-box-open"></i> Mis publicaciones
                </button>
                <button class="profile-tab" data-panel="fav" role="tab" aria-selected="false">
                    <i class="fa-solid fa-bookmark"></i> Favoritos
                </button>
                <button class="profile-tab" data-panel="sold" role="tab" aria-selected="false">
                    <i class="fa-solid fa-hand-holding-dollar"></i> Ventas
                </button>
                <button class="profile-tab" data-panel="following" role="tab" aria-selected="false">
                    <i class="fa-solid fa-user-group"></i> Siguiendo
                </button>
                </div>
                <div class="profile-panel" id="panel-own">
                    <div id="user-products-grid" class="products-grid"></div>
                </div>
                <div class="profile-panel" id="panel-fav">
                    <div id="user-favorites-grid" class="products-grid"></div>
                </div>
                <div class="profile-panel" id="panel-sold">
                    <div id="user-sold-grid" class="products-grid"></div>
                </div>
                <div class="profile-panel" id="panel-following">
                    <div id="user-following-grid" class="following-list"></div>
                </div>`;

            renderOwnPublications(ownPublications);
            renderFavoritePublications(favorites);
            renderSoldPublications(soldPublications);
            renderFollowingList();
            wireSellerCard();
            applyTabState();

            Logger.info('Perfil renderizado', { uid, hasProfile: true });

        } catch (error) {
            if (token !== renderToken) return;
            Logger.error('Error cargando perfil', error);
            profileContent.innerHTML = `
                <header class="profile-header-pro">
                    <div class="profile-header-row">
                        <div class="profile-heading">
                            <div class="title-row"><h2>Perfil</h2></div>
                        </div>
                    </div>
                </header>
                <div class="login-required">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <h3>No pudimos cargar tu perfil</h3>
                    <p>Inténtalo de nuevo más tarde.</p>
                    <button class="btn-primary" id="btn-profile-retry">Reintentar</button>
                </div>`;
            const btnRetry = document.getElementById('btn-profile-retry');
            if (btnRetry) btnRetry.addEventListener('click', () => renderProfile());
        }
    }

    /* -----------------------------------------------------
       CARD DE PRODUCTO
       ----------------------------------------------------- */
    function buildCard(pub, options = {}) {
        const { withActions = false } = options;
        const canManage = withActions && PermissionService.canEditPublication(pub);
        const canDelete = withActions && PermissionService.canDeletePublication(pub);

        const card = document.createElement('article');
        card.className = 'product-card';
        card.dataset.id = pub.id;

        const safeImg = Formatters.safeUrl(pub.mainImage) || 'https://via.placeholder.com/300';
        const isSold = pub.status === 'sold';

        const imgWrap = document.createElement('div');
        imgWrap.className = 'product-img';

        const img = document.createElement('img');
        img.src = safeImg;
        img.alt = pub.name || '';
        img.loading = 'lazy';
        imgWrap.appendChild(img);

        if (pub.category) {
            imgWrap.appendChild(DOM.el('span', { class: 'product-category-chip' }, [pub.category]));
        }
        if (isSold) {
            imgWrap.appendChild(DOM.el('span', { class: 'sold-badge' }, [
                DOM.el('i', { class: 'fa-solid fa-check' }), ' Vendido'
            ]));
        }

        const favBtn = DOM.el('button', {
            class: 'product-favorite',
            'data-fav-id': pub.id,
            'aria-label': 'Guardar'
        }, [ DOM.el('i', { class: 'fa-regular fa-bookmark' }) ]);
        imgWrap.appendChild(favBtn);

        const info = document.createElement('div');
        info.className = 'product-info';

        if (pub.storeName) {
            info.appendChild(DOM.el('span', { class: 'product-store' }, [
                DOM.el('i', { class: 'fa-solid fa-store' }), pub.storeName
            ]));
        }
        info.appendChild(DOM.el('h4', {}, [pub.name || '']));
        info.appendChild(DOM.el('span', { class: 'product-price' }, [
            Formatters.formatPriceWithUnit(pub.price, pub.unitCode)
        ]));

        if (canManage || canDelete) {
            const actions = DOM.el('div', { class: 'card-actions' });

            if (canManage) {
                const editBtn = DOM.el('button', {
                    class: 'card-action-btn btn-edit',
                    'data-edit-id': pub.id,
                    'aria-label': 'Editar'
                }, [
                    DOM.el('i', { class: 'fa-solid fa-pen-to-square' }),
                    DOM.el('span', { class: 'card-action-label' }, ['Editar'])
                ]);
                actions.appendChild(editBtn);

                const soldBtn = DOM.el('button', {
                    class: 'card-action-btn btn-sold',
                    'data-sold-id': pub.id,
                    'aria-label': 'Marcar como vendido'
                }, [
                    DOM.el('i', { class: 'fa-solid fa-hand-holding-dollar' }),
                    DOM.el('span', { class: 'card-action-label' }, ['Vendido'])
                ]);
                actions.appendChild(soldBtn);
            }

            if (canDelete) {
                const delBtn = DOM.el('button', {
                    class: 'card-action-btn btn-delete',
                    'data-delete-id': pub.id,
                    'aria-label': 'Eliminar'
                }, [ DOM.el('i', { class: 'fa-solid fa-trash' }) ]);
                actions.appendChild(delBtn);
            }

            info.appendChild(actions);
        }

        card.appendChild(imgWrap);
        card.appendChild(info);

        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            PublicationUI.openProductSheet(pub);
        });

        return card;
    }

    /* -----------------------------------------------------
       RENDER DE PANELES
       ----------------------------------------------------- */
    function emptyState({ icon, title, text, actionLabel, actionId }) {
        const el = DOM.el('div', { class: 'empty-state' });
        el.innerHTML = `
            <div class="empty-state-icon"><i class="fa-solid ${icon}"></i></div>
            <h4>${Formatters.escapeHtml(title)}</h4>
            <p>${Formatters.escapeHtml(text)}</p>
            ${actionLabel ? `<button class="empty-action" id="${actionId}">
                <i class="fa-solid fa-arrow-right"></i> ${Formatters.escapeHtml(actionLabel)}
            </button>` : ''}
        `;
        return el;
    }

    function renderOwnPublications(list) {
        const container = document.getElementById('user-products-grid');
        if (!container) return;
        container.innerHTML = '';
        if (!list.length) {
            const empty = emptyState({
                icon: 'fa-box-open',
                title: 'Aún no tienes publicaciones',
                text: PermissionService.canPublish()
                    ? 'Publica tu primer producto para empezar a vender.'
                    : 'Cuando seas vendedor aprobado podrás publicar productos.',
                actionLabel: PermissionService.canPublish() ? 'Crear publicación' : 'Quiero vender',
                actionId: 'empty-create-pub'
            });
            container.appendChild(empty);
            const btn = document.getElementById('empty-create-pub');
            if (btn) btn.addEventListener('click', () => {
                if (PermissionService.canPublish()) NavigationUI.switchView('anunciarme');
                else SellerUI.open();
            });
            return;
        }
        list.forEach(pub => container.appendChild(buildCard(pub, { withActions: true })));
        FavoriteUI.updateAllButtons();
    }

    function renderFavoritePublications(list) {
        const container = document.getElementById('user-favorites-grid');
        if (!container) return;
        container.innerHTML = '';
        if (!list.length) {
            const empty = emptyState({
                icon: 'fa-bookmark',
                title: 'Sin favoritos todavía',
                text: 'Guarda publicaciones que te interesen para verlas aquí.',
                actionLabel: 'Explorar',
                actionId: 'empty-explore-fav'
            });
            container.appendChild(empty);
            const btn = document.getElementById('empty-explore-fav');
            if (btn) btn.addEventListener('click', () => NavigationUI.switchView('search'));
            return;
        }
        list.forEach(pub => container.appendChild(buildCard(pub)));
        FavoriteUI.updateAllButtons();
    }

    function renderSoldPublications(list) {
        const container = document.getElementById('user-sold-grid');
        if (!container) return;
        container.innerHTML = '';
        if (!list.length) {
            container.appendChild(emptyState({
                icon: 'fa-hand-holding-dollar',
                title: 'Sin ventas recientes',
                text: 'Cuando vendas una publicación aparecerá aquí durante 24 horas.'
            }));
            return;
        }
        list.forEach(pub => container.appendChild(buildCard(pub)));
        FavoriteUI.updateAllButtons();
    }

    /* -----------------------------------------------------
       PANEL: SIGUIENDO
       ----------------------------------------------------- */
    function renderFollowingList() {
        const container = document.getElementById('user-following-grid');
        if (!container) return;
        container.innerHTML = '';

        if (!followingProfiles.length) {
            const empty = emptyState({
                icon: 'fa-user-group',
                title: 'Aún no sigues a nadie',
                text: 'Sigue vendedores para ver sus productos y novedades aquí.',
                actionLabel: 'Explorar vendedores',
                actionId: 'empty-explore-following'
            });
            container.appendChild(empty);
            const btn = document.getElementById('empty-explore-following');
            if (btn) btn.addEventListener('click', () => NavigationUI.switchView('search'));
            return;
        }

        followingProfiles.forEach(profile => {
            container.appendChild(buildFollowingCard(profile));
        });
    }

    function buildFollowingCard(profile) {
        const card = document.createElement('article');
        card.className = 'following-card';
        card.dataset.followingUid = profile.uid;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        const avatarHtml = profile.avatarUrl
            ? `<img src="${Formatters.safeUrl(profile.avatarUrl)}" alt="">`
            : `<i class="fa-solid fa-user"></i>`;

        const name = profile.displayName || profile.businessName || '';
        const category = profile.category || '';

        card.innerHTML = `
            <div class="following-avatar">${avatarHtml}</div>
            <div class="following-info">
                <span class="following-username">@${Formatters.escapeHtml(profile.username || '')}</span>
                ${name ? `<span class="following-name">${Formatters.escapeHtml(name)}</span>` : ''}
                ${category ? `<span class="following-category">${Formatters.escapeHtml(category)}</span>` : ''}
            </div>
            <button class="following-unfollow-btn" data-unfollow-uid="${Formatters.escapeHtml(profile.uid)}" type="button" aria-label="Dejar de seguir">
                <i class="fa-solid fa-check"></i> Siguiendo
            </button>
        `;

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (e.target.closest('[data-unfollow-uid]')) return;
                e.preventDefault();
                if (window.SellerProfileUI) SellerProfileUI.open(profile.uid);
            }
        });

        return card;
    }

    async function onUnfollowClick(uid, btn) {
        if (btn.disabled) return;
        if (!AppState.currentUser) {
            AppState.pendingAction = { type: 'followSeller', sellerUid: uid };
            AuthUI.openAuthModal('login');
            return;
        }
        btn.disabled = true;
        const prevHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            await FollowService.unfollow(AppState.currentUser.uid, uid);
            if (window.HapticsService) HapticsService.light();
            Toast.success('Dejaste de seguir al vendedor.');

            followingProfiles = followingProfiles.filter(p => p.uid !== uid);
            renderFollowingList();
        } catch (e) {
            Logger.error('Error dejando de seguir', e);
            btn.innerHTML = prevHtml;
            btn.disabled = false;
            Toast.error(ErrorHandler.toUserMessage(e, { context: 'profile.unfollow' }));
        }
    }

    /* -----------------------------------------------------
       DELEGACIÓN DE CLICK
       ----------------------------------------------------- */
    function handleProfileClick(e) {
        const tab = e.target.closest('.profile-tab');
        if (tab) {
            e.preventDefault();
            e.stopPropagation();
            const panel = tab.dataset.panel || 'own';
            if (panel !== activeProfileTab) {
                activeProfileTab = panel;
                applyTabState();
                if (window.HapticsService) HapticsService.light();
            }
            return;
        }

        if (e.target.closest('#btn-open-admin')) {
            e.preventDefault();
            e.stopPropagation();
            NavigationUI.switchView('admin');
            return;
        }

        if (e.target.closest('#btn-open-settings')) {
            e.preventDefault();
            e.stopPropagation();
            if (AppState.currentProfile) openSettings(AppState.currentProfile);
            return;
        }

        if (e.target.closest('#btn-change-avatar')) {
            e.preventDefault();
            e.stopPropagation();
            avatarInput.click();
            return;
        }

        // Unfollow desde la pestaña Siguiendo
        const unfollowBtn = e.target.closest('[data-unfollow-uid]');
        if (unfollowBtn) {
            e.preventDefault();
            e.stopPropagation();
            onUnfollowClick(unfollowBtn.dataset.unfollowUid, unfollowBtn);
            return;
        }

        // Abrir perfil del vendedor desde la tarjeta de Siguiendo
        const followingCard = e.target.closest('.following-card');
        if (followingCard && followingCard.dataset.followingUid) {
            e.preventDefault();
            if (window.SellerProfileUI) {
                SellerProfileUI.open(followingCard.dataset.followingUid);
            }
            return;
        }

        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            e.stopPropagation();
            const pub = ownPublications.find(p => p.id === editBtn.dataset.editId);
            if (pub && PermissionService.canEditPublication(pub)) PublicationUI.openEditForm(pub);
            return;
        }

        const soldBtn = e.target.closest('.btn-sold');
        if (soldBtn) {
            e.stopPropagation();
            const pub = ownPublications.find(p => p.id === soldBtn.dataset.soldId);
            if (pub && PermissionService.canMarkAsSold(pub)) markAsSold(pub);
            return;
        }

        const delBtn = e.target.closest('.btn-delete');
        if (delBtn) {
            e.stopPropagation();
            const pub = ownPublications.find(p => p.id === delBtn.dataset.deleteId);
            if (pub && PermissionService.canDeletePublication(pub)) PublicationUI.deletePublication(pub);
        }
    }

    async function markAsSold(pub) {
        const confirmed = await ConfirmDialog.open({
            title: 'Marcar como vendido',
            text: `¿Marcar "${pub.name}" como vendido?\n\n` +
                  `Aparecerá como vendido en tu perfil durante 24 horas y luego se ocultará automáticamente.`,
            okText: 'Sí, marcar vendido',
            cancelText: 'Cancelar'
        });
        if (!confirmed) return;

        try {
            await PublicationService.markAsSold(pub.id);
            if (window.HapticsService) HapticsService.success();
            Toast.success('¡Publicación marcada como vendida!');
            await PublicationUI.loadPublications();
            renderProfile();
        } catch (error) {
            Logger.error('Error marcando como vendido', error);
            Toast.error(ErrorHandler.toUserMessage(error, { context: 'profile.markSold' }));
        }
    }

    /* -----------------------------------------------------
       AVATAR
       ----------------------------------------------------- */
    async function handleAvatarChange() {
        const file = avatarInput.files[0];
        if (!file) return;
        try {
            Toast.info('Subiendo avatar…');
            const compressed = await ImageService.compressImage(file);
            const upload = await ImageService.uploadImageToCloudinary(compressed);
            await UserService.updateAvatar(AppState.currentUser.uid, upload.secure_url);
            if (AppState.currentProfile) AppState.currentProfile.avatarUrl = upload.secure_url;
            renderProfile();
            Toast.success('Avatar actualizado.');
        } catch (error) {
            Logger.error('Error subiendo avatar', error);
            Toast.error('No pudimos subir el avatar.');
        } finally {
            avatarInput.value = '';
        }
    }

    /* =====================================================
       AJUSTES
       ===================================================== */
    function openSettings(profile) {
        const email = profile.email || (AppState.currentUser && AppState.currentUser.email) || '—';
        const list = document.getElementById('settings-list');

        list.innerHTML = `
            <div class="settings-group">
                <span class="settings-group-title">Cuenta</span>
                <div class="settings-group-card">
                    <div class="settings-row settings-username-row">
                        <div class="s-icon tone-coffee"><i class="fa-solid fa-at"></i></div>
                        <div class="s-text" id="username-display-wrap">
                            <span class="s-label">Username</span>
                            <span class="s-value" id="settings-username-value">@${Formatters.escapeHtml(profile.username || '')}</span>
                        </div>
                        <div class="s-text hidden" id="username-edit-wrap">
                            <span class="s-label">Nuevo username</span>
                            <div class="username-input-wrap">
                                <span class="username-input-prefix">@</span>
                                <input type="text" id="username-edit-input" maxlength="20"
                                       autocomplete="off" autocapitalize="off"
                                       spellcheck="false" inputmode="text">
                            </div>
                        </div>
                        <div class="settings-row-buttons" id="username-row-buttons">
                            <button class="settings-row-action-btn" id="btn-edit-username"
                                    type="button" aria-label="Editar username" title="Editar username">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                        </div>
                        <div class="settings-row-buttons hidden" id="username-edit-buttons">
                            <button class="settings-row-action-btn" id="btn-cancel-username-edit"
                                    type="button" aria-label="Cancelar" title="Cancelar">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                            <button class="settings-row-action-btn primary" id="btn-save-username"
                                    type="button" disabled aria-label="Guardar" title="Guardar">
                                <i class="fa-solid fa-check"></i>
                            </button>
                        </div>
                    </div>

                    <p class="username-feedback hidden" id="username-feedback"></p>

                    <div class="settings-row">
                        <div class="s-icon tone-warm"><i class="fa-solid fa-envelope"></i></div>
                        <div class="s-text">
                            <span class="s-label">Correo electrónico</span>
                            <span class="s-value">${Formatters.escapeHtml(email)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-group">
                <span class="settings-group-title">Estado</span>
                <div class="settings-group-card">
                    <div class="settings-row">
                        <div class="s-icon tone-green"><i class="fa-solid fa-shield-halved"></i></div>
                        <div class="s-text">
                            <span class="s-label">Cuenta</span>
                            <span class="s-value">${PermissionService.getSellerStatus() === 'approved' ? 'Vendedor aprobado' : 'Activa'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-group">
                <span class="settings-group-title">Legal</span>
                <div class="settings-group-card">
                    <div class="settings-row legal-row" id="settings-open-privacy" role="button" tabindex="0">
                        <div class="s-icon tone-green"><i class="fa-solid fa-user-shield"></i></div>
                        <div class="s-text">
                            <span class="s-label">Aviso de Privacidad</span>
                            <span class="s-value">Tratamiento de tus datos personales</span>
                        </div>
                        <span class="legal-badge-version"><i class="fa-solid fa-check"></i> Aceptado</span>
                        <i class="fa-solid fa-chevron-right settings-arrow"></i>
                    </div>
                    <div class="settings-row legal-row" id="settings-open-terms" role="button" tabindex="0">
                        <div class="s-icon tone-coffee"><i class="fa-solid fa-file-contract"></i></div>
                        <div class="s-text">
                            <span class="s-label">Términos y Condiciones</span>
                            <span class="s-value">Reglas de uso de PipGo</span>
                        </div>
                        <i class="fa-solid fa-chevron-right settings-arrow"></i>
                    </div>
                </div>
            </div>

            <div class="settings-group">
                <span class="settings-group-title">Sesión</span>
                <div class="settings-group-card">
                    <button class="btn-logout-pro" id="btn-logout-pro" type="button">
                        <i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión
                    </button>
                </div>
            </div>
        `;

        usernameDisplayWrap    = document.getElementById('username-display-wrap');
        usernameEditWrap       = document.getElementById('username-edit-wrap');
        usernameRowButtons     = document.getElementById('username-row-buttons');
        usernameEditButtons    = document.getElementById('username-edit-buttons');
        settingsUsernameValue  = document.getElementById('settings-username-value');
        btnEditUsername        = document.getElementById('btn-edit-username');
        btnCancelUsernameEdit  = document.getElementById('btn-cancel-username-edit');
        btnSaveUsername        = document.getElementById('btn-save-username');
        usernameEditInput      = document.getElementById('username-edit-input');
        usernameFeedback       = document.getElementById('username-feedback');

        btnEditUsername.addEventListener('click', startUsernameEdit);
        btnCancelUsernameEdit.addEventListener('click', cancelUsernameEdit);
        btnSaveUsername.addEventListener('click', saveUsername);
        usernameEditInput.addEventListener('input', onUsernameInput);
        usernameEditInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!btnSaveUsername.disabled) saveUsername();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelUsernameEdit();
            }
        });

        const logoutBtn = document.getElementById('btn-logout-pro');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    closeSettings();
                    await AuthService.logout();
                    Toast.success('Sesión cerrada.');
                } catch (e) {
                    Toast.error('No pudimos cerrar la sesión.');
                }
            });
        }

        const openPrivacy = document.getElementById('settings-open-privacy');
        const openTerms = document.getElementById('settings-open-terms');

        const launchLegal = (tab) => {
            closeSettings();
            setTimeout(() => {
                if (window.LegalUI) LegalUI.open(tab);
            }, 180);
        };

        if (openPrivacy) {
            openPrivacy.addEventListener('click', () => launchLegal('privacy'));
            openPrivacy.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    launchLegal('privacy');
                }
            });
        }
        if (openTerms) {
            openTerms.addEventListener('click', () => launchLegal('terms'));
            openTerms.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    launchLegal('terms');
                }
            });
        }

        settingsModal.classList.remove('hidden');
    }

    /* -----------------------------------------------------
       EDICIÓN DE USERNAME
       ----------------------------------------------------- */
    function setUsernameFeedback(text, kind) {
        if (!usernameFeedback) return;
        if (!text) {
            usernameFeedback.classList.add('hidden');
            usernameFeedback.textContent = '';
            usernameFeedback.className = 'username-feedback hidden';
            return;
        }
        usernameFeedback.classList.remove('hidden');
        usernameFeedback.className = 'username-feedback' + (kind ? ' ' + kind : '');
        usernameFeedback.textContent = text;
    }

    function enterEditMode() {
        usernameDisplayWrap.classList.add('hidden');
        usernameRowButtons.classList.add('hidden');
        usernameEditWrap.classList.remove('hidden');
        usernameEditButtons.classList.remove('hidden');
    }

    function exitEditMode() {
        usernameDisplayWrap.classList.remove('hidden');
        usernameRowButtons.classList.remove('hidden');
        usernameEditWrap.classList.add('hidden');
        usernameEditButtons.classList.add('hidden');
    }

    function startUsernameEdit() {
        const profile = AppState.currentProfile;
        if (!profile) return;

        usernameEditInput.value = profile.username || '';
        lastCheckedNormalized = '';
        btnSaveUsername.disabled = true;
        setUsernameFeedback('', '');

        enterEditMode();

        setTimeout(() => {
            usernameEditInput.focus();
            const len = usernameEditInput.value.length;
            try { usernameEditInput.setSelectionRange(len, len); } catch (e) {}
        }, 30);
    }

    function cancelUsernameEdit() {
        clearTimeout(usernameDebounceTimer);
        usernameDebounceTimer = null;
        lastCheckedNormalized = '';
        if (usernameEditInput) usernameEditInput.value = '';
        setUsernameFeedback('', '');
        if (btnSaveUsername) btnSaveUsername.disabled = true;
        exitEditMode();
    }

    function onUsernameInput() {
        clearTimeout(usernameDebounceTimer);

        const raw = String(usernameEditInput.value || '').trim();
        const normalized = Validators.normalizeUsername(raw);
        const currentNormalized = (AppState.currentProfile && AppState.currentProfile.usernameNormalized) || '';

        lastCheckedNormalized = '';
        btnSaveUsername.disabled = true;

        if (!raw) { setUsernameFeedback('', ''); return; }

        if (normalized === currentNormalized) {
            setUsernameFeedback('Es tu username actual.', 'checking');
            return;
        }

        const v = Validators.validateUsername(raw);
        if (!v.valid) { setUsernameFeedback(v.error, 'err'); return; }

        setUsernameFeedback('Verificando disponibilidad…', 'checking');

        usernameDebounceTimer = setTimeout(async () => {
            if (Validators.normalizeUsername(usernameEditInput.value) !== normalized) return;

            try {
                const available = await UserService.isUsernameAvailable(
                    normalized,
                    AppState.currentUser.uid
                );

                if (Validators.normalizeUsername(usernameEditInput.value) !== normalized) return;

                if (available) {
                    lastCheckedNormalized = normalized;
                    btnSaveUsername.disabled = false;
                    setUsernameFeedback('Disponible', 'ok');
                } else {
                    setUsernameFeedback('Ese username ya está en uso.', 'err');
                }
            } catch (e) {
                Logger.error('Error verificando username', e);
                setUsernameFeedback('No pudimos verificar la disponibilidad.', 'err');
            }
        }, 450);
    }

    async function saveUsername() {
        const raw = String(usernameEditInput.value || '').trim();
        const v = Validators.validateUsername(raw);
        if (!v.valid) { setUsernameFeedback(v.error, 'err'); return; }

        const normalized = Validators.normalizeUsername(v.value);
        if (normalized !== lastCheckedNormalized) {
            setUsernameFeedback('Verifica la disponibilidad antes de guardar.', 'err');
            return;
        }

        btnSaveUsername.disabled = true;
        const originalIcon = btnSaveUsername.innerHTML;
        btnSaveUsername.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            const result = await UserService.changeUsername(AppState.currentUser.uid, raw);

            if (result.changed) {
                AppState.currentProfile.username = result.username;
                AppState.currentProfile.usernameNormalized = result.normalized;

                if (settingsUsernameValue) {
                    settingsUsernameValue.textContent = '@' + result.username;
                }

                refreshHomeGreeting();
                renderProfile();

                Toast.success('Username actualizado.');
            } else {
                Toast.info('Tu username no cambió.');
            }

            cancelUsernameEdit();
        } catch (error) {
            Logger.error('Error cambiando username', error);
            setUsernameFeedback(error.message || 'No pudimos actualizar el username.', 'err');
        } finally {
            btnSaveUsername.innerHTML = originalIcon;
        }
    }

    function refreshHomeGreeting() {
        const el = document.getElementById('home-greeting');
        if (!el || !AppState.currentProfile || !AppState.currentProfile.username) return;
        const hour = new Date().getHours();
        const prefix = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
        el.textContent = `${prefix}, ${AppState.currentProfile.username}`;
    }

    function closeSettings() {
        clearTimeout(usernameDebounceTimer);
        usernameDebounceTimer = null;
        lastCheckedNormalized = '';
        if (settingsModal) settingsModal.classList.add('hidden');
    }

    function isSettingsModalOpen() {
        return settingsModal && !settingsModal.classList.contains('hidden');
    }

    /* -----------------------------------------------------
       INIT
       ----------------------------------------------------- */
    function init() {
        if (initialized) return;
        initialized = true;
        profileContent = document.getElementById('profile-content');
        avatarInput = document.getElementById('avatar-input');
        settingsModal = document.getElementById('settings-modal');
        settingsClose = document.getElementById('settings-close');

        if (!profileContent) {
            Logger.error('No se encontró #profile-content');
            return;
        }

        profileContent.addEventListener('click', handleProfileClick);

        if (avatarInput) avatarInput.addEventListener('change', handleAvatarChange);
        if (settingsClose) settingsClose.addEventListener('click', closeSettings);
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) closeSettings();
            });
        }
    }

    window.ProfileUI = {
        init,
        renderProfile,
        openSettings,
        closeSettings,
        isSettingsModalOpen,
        resetActiveTab
    };
})();