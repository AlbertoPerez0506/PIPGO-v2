/* =====================================================
   PIPGO · SELLER PROFILE UI
   Bottom sheet con el perfil público del vendedor.
   Reutilizado desde Product Sheet y Chat Header.
   -----------------------------------------------------
   FIX:
   - Sólo renderiza el perfil completo si el doc tiene
     sellerApproved === true. Antes se mostraba cualquier
     perfil con username, y el botón "Seguir" fallaba al
     pulsarse porque FollowService (y las reglas de
     Firestore) rechazan seguir a usuarios que no son
     vendedores aprobados.
   - Dos estados vacíos diferenciados:
       · 'unavailable' → el perfil no existe o no tiene username.
       · 'not-seller'  → existe pero no es vendedor aprobado.
   ===================================================== */

(function () {
    'use strict';

    let backdrop, sheet, contentEl;
    let initialized = false;
    let historyPushed = false;
    let currentUid = null;
    let openingLock = false;
    let suppressPopstate = false;
    let currentProfileCache = null;

    function open(uid, { preload = null } = {}) {
        if (!uid) { Toast.warning('Vendedor no disponible.'); return; }
        if (openingLock) return;
        if (isOpen()) return;
        openingLock = true;
        setTimeout(() => { openingLock = false; }, 350);

        currentUid = uid;
        currentProfileCache = preload || null;
        backdrop.classList.add('open');
        document.body.style.overflow = 'hidden';
        render(uid, preload);
        if (!historyPushed) {
            history.pushState({ view: AppState.currentView, overlay: 'sellerProfile' }, '', '');
            historyPushed = true;
        }
    }

    function close(syncHistory = true) {
        backdrop.classList.remove('open');
        document.body.style.overflow = '';
        currentUid = null;
        currentProfileCache = null;
        if (historyPushed) {
            historyPushed = false;
            if (syncHistory) {
                suppressPopstate = true;
                try { history.back(); } catch (e) {}
            }
        }
    }

    function isOpen() {
        return backdrop && backdrop.classList.contains('open');
    }

    function escapeHtml(v) {
        return Formatters.escapeHtml(v);
    }

    function renderSkeleton() {
        contentEl.innerHTML = `
            <div class="seller-profile-body">
                <div class="sp-skel-avatar"></div>
                <div class="sp-skel-line w-40"></div>
                <div class="sp-skel-line w-60"></div>
                <div class="sp-skel-line w-80"></div>
            </div>`;
    }

    function renderEmptyState(kind) {
        if (kind === 'not-seller') {
            contentEl.innerHTML = `
                <div class="seller-profile-body">
                    <div class="seller-profile-empty">
                        <i class="fa-solid fa-user"></i>
                        <h4>Este usuario no es vendedor</h4>
                        <p>En PipGo sólo puedes seguir a vendedores aprobados.</p>
                    </div>
                </div>`;
            return;
        }
        contentEl.innerHTML = `
            <div class="seller-profile-body">
                <div class="seller-profile-empty">
                    <i class="fa-solid fa-store-slash"></i>
                    <h4>Información no disponible</h4>
                    <p>Este vendedor aún no ha completado su perfil público.</p>
                </div>
            </div>`;
    }

    function computeFollowState(uid) {
        const myUid = AppState.currentUser && AppState.currentUser.uid;
        const isSelf = !!myUid && myUid === uid;
        const following = !isSelf && !!(AppState.followingIds && AppState.followingIds.has(uid));
        return { isSelf, following };
    }

    function followButtonHtml(uid) {
        const { isSelf, following } = computeFollowState(uid);
        if (isSelf) return '';
        return `<button class="sp-follow-btn${following ? ' is-following' : ''}" id="sp-follow" type="button">
            <i class="fa-solid ${following ? 'fa-check' : 'fa-user-plus'}"></i>
            ${following ? 'Siguiendo' : 'Seguir'}
        </button>`;
    }

    function updateFollowButton(uid) {
        const btn = contentEl.querySelector('#sp-follow');
        if (!btn) return;
        const { following } = computeFollowState(uid);
        btn.classList.toggle('is-following', following);
        btn.innerHTML = following
            ? '<i class="fa-solid fa-check"></i> Siguiendo'
            : '<i class="fa-solid fa-user-plus"></i> Seguir';
    }

    async function onFollowClick(uid, btn) {
        if (!AppState.currentUser) {
            AppState.pendingAction = { type: 'followSeller', sellerUid: uid };
            AuthUI.openAuthModal('login');
            Toast.info('Inicia sesión para seguir vendedores.');
            return;
        }
        if (btn.disabled) return;
        btn.disabled = true;
        const prevHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        try {
            const nowFollowing = await FollowService.toggleFollow(AppState.currentUser.uid, uid);
            updateFollowButton(uid);
            if (window.HapticsService) HapticsService.light();
            Toast.success(nowFollowing
                ? 'Ahora sigues a este vendedor.'
                : 'Dejaste de seguir al vendedor.');
        } catch (err) {
            btn.innerHTML = prevHtml;
            Toast.error(ErrorHandler.toUserMessage(err, { context: 'seller.follow' }));
        } finally {
            btn.disabled = false;
        }
    }

    async function render(uid, preload) {
        renderSkeleton();

        let profile = preload;
        if (!profile) {
            try { profile = await SellerProfileService.getPublicProfile(uid); }
            catch (e) { profile = null; }
        }

        if (!isOpen() || currentUid !== uid) return;
        currentProfileCache = profile;

        // 1) El perfil no existe o no tiene username público.
        if (!profile || !profile.username) {
            renderEmptyState('unavailable');
            return;
        }

        // 2) Existe pero no es vendedor aprobado. Aquí es donde
        //    antes se mostraba el botón "Seguir" y fallaba.
        if (profile.sellerApproved !== true) {
            renderEmptyState('not-seller');
            return;
        }

        // 3) Vendedor aprobado → perfil completo
        const username = escapeHtml(profile.username);
        const displayName = profile.displayName ? escapeHtml(profile.displayName) : '';
        const description = profile.description ? escapeHtml(profile.description) : '';
        const avatarHtml = profile.avatarUrl
            ? `<img src="${Formatters.safeUrl(profile.avatarUrl)}" alt="">`
            : `<i class="fa-solid fa-user"></i>`;

        const contacts = [];
        if (profile.phone) {
            contacts.push(`
                <a class="sp-contact-btn" href="tel:${escapeHtml(String(profile.phone).replace(/\s+/g,''))}">
                    <i class="fa-solid fa-phone"></i> Llamar
                </a>`);
        }
        if (profile.phone && profile.contactMethod === 'whatsapp') {
            const phone = String(profile.phone).replace(/\D/g, '');
            const norm = phone.length === 10 ? '52' + phone : phone;
            contacts.push(`
                <a class="sp-contact-btn sp-wa" target="_blank" rel="noopener"
                   href="https://wa.me/${norm}">
                    <i class="fa-brands fa-whatsapp"></i> WhatsApp
                </a>`);
        }
        if (profile.socialUrl) {
            const host = (() => {
                try { return new URL(profile.socialUrl).hostname.replace('www.',''); }
                catch (e) { return 'Enlace'; }
            })();
            contacts.push(`
                <a class="sp-contact-btn" target="_blank" rel="noopener"
                   href="${Formatters.safeUrl(profile.socialUrl)}">
                    <i class="fa-solid fa-link"></i> ${escapeHtml(host)}
                </a>`);
        }

        const locationHtml = [profile.city, profile.state].filter(Boolean).join(', ');

        contentEl.innerHTML = `
            <div class="seller-profile-body">
                <div class="sp-avatar">${avatarHtml}</div>
                <div class="sp-identity">
                    <span class="sp-username">@${username}</span>
                    <span class="sp-role"><i class="fa-solid fa-store"></i> Vendedor</span>
                </div>
                ${displayName ? `<h3 class="sp-display-name">${displayName}</h3>` : ''}
                ${profile.category ? `<span class="sp-category">${escapeHtml(profile.category)}</span>` : ''}
                ${description ? `<p class="sp-description">${description}</p>` : ''}
                ${locationHtml ? `<p class="sp-location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(locationHtml)}</p>` : ''}

                ${followButtonHtml(uid)}

                ${contacts.length ? `<div class="sp-contacts">${contacts.join('')}</div>` : ''}

                <button class="sp-message-btn" id="sp-message" type="button">
                    <i class="fa-solid fa-comment-dots"></i> Enviar mensaje
                </button>
            </div>`;

        const followBtn = contentEl.querySelector('#sp-follow');
        if (followBtn) {
            followBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                onFollowClick(uid, followBtn);
            });
        }

        const msgBtn = contentEl.querySelector('#sp-message');
        if (msgBtn) msgBtn.addEventListener('click', () => {
            close();
            setTimeout(() => {
                if (window.MessagingUI && MessagingUI.openChatWith) {
                    MessagingUI.openChatWith(uid, { fromPublication: false });
                }
            }, 180);
        });
    }

    function refreshFollowState(sellerUid) {
        if (!isOpen() || currentUid !== sellerUid) return;
        updateFollowButton(sellerUid);
    }

    function init() {
        if (initialized) return;
        initialized = true;

        backdrop = document.getElementById('seller-profile-backdrop');
        sheet = document.getElementById('seller-profile-sheet');
        contentEl = document.getElementById('seller-profile-content');
        if (!backdrop || !contentEl) {
            Logger.error('SellerProfileUI: contenedores no encontrados.');
            return;
        }

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) close();
        });

        const dragZone = sheet.querySelector('.sheet-drag-zone');
        let startY = 0, curY = 0, dragging = false;
        dragZone.addEventListener('pointerdown', (e) => {
            dragging = true;
            startY = e.clientY; curY = e.clientY;
            sheet.style.transition = 'none';
            dragZone.setPointerCapture && dragZone.setPointerCapture(e.pointerId);
        });
        dragZone.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            curY = e.clientY;
            const dy = Math.max(0, curY - startY);
            sheet.style.transform = `translateY(${dy}px)`;
        });
        const endDrag = () => {
            if (!dragging) return;
            dragging = false;
            const dy = curY - startY;
            sheet.style.transition = '';
            if (dy > 100) { close(); sheet.style.transform = ''; }
            else sheet.style.transform = '';
        };
        dragZone.addEventListener('pointerup', endDrag);
        dragZone.addEventListener('pointercancel', endDrag);
    }

    window.SellerProfileUI = {
        init,
        open,
        close,
        isOpen,
        refreshFollowState,
        consumeSuppressPopstate: () => {
            if (suppressPopstate) { suppressPopstate = false; return true; }
            return false;
        }
    };
})();