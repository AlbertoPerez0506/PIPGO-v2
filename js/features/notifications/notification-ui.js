/* =====================================================
   PIPGO · NOTIFICATION UI (Sección "Notificaciones")
   Sistema A: notificaciones persistentes de publicaciones.
   Los mensajes NO aparecen aquí.
   ===================================================== */

(function () {
    'use strict';

    let contentEl, badgeEl;
    let unsubscribe = null;
    let initialized = false;
    let items = [];

    function _ref(uid) {
        return db.collection(CONFIG.COLLECTIONS.USERS).doc(uid).collection('notificaciones');
    }

    function init() {
        if (initialized) return;
        initialized = true;

        contentEl = document.getElementById('notifications-content');
        badgeEl   = document.getElementById('notifications-badge');

        NotificationService.setForegroundHandler(_onForegroundMessage);
    }

    async function onEnter() {
        if (!AppState.currentUser) {
            _renderVisitor();
            return;
        }
        _renderSkeleton();
        _subscribe();
        try {
            await NotificationService.enableFor(AppState.currentUser.uid)
                .then(() => _markPermissionPill())
                .catch(() => { /* no forzamos */ });
        } catch (e) {}
    }

    function onLeave() {
        if (unsubscribe) { try { unsubscribe(); } catch (e) {} unsubscribe = null; }
    }

    function _subscribe() {
        if (unsubscribe) { try { unsubscribe(); } catch (e) {} }

        const uid = AppState.currentUser.uid;
        unsubscribe = _ref(uid)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .onSnapshot(
                (snap) => {
                    items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    _renderList();
                    _updateBadge();
                },
                (err) => {
                    Logger.error('NotificationUI subscribe error', err);
                    _renderError();
                }
            );
    }

    function _updateBadge() {
        if (!badgeEl) return;
        const unread = items.filter(i => !i.read).length;
        if (unread > 0) {
            badgeEl.textContent = unread > 9 ? '9+' : String(unread);
            badgeEl.classList.remove('hidden');
        } else {
            badgeEl.classList.add('hidden');
        }
    }

    function _renderSkeleton() {
        contentEl.innerHTML = `
            <div class="msg-skel-list">
                ${Array.from({ length: 4 }).map(() => `
                    <div class="msg-skel-row">
                        <div class="msg-skel-avatar"></div>
                        <div class="msg-skel-body">
                            <div class="msg-skel-line w-40"></div>
                            <div class="msg-skel-line w-80"></div>
                        </div>
                    </div>`).join('')}
            </div>`;
    }

    function _renderVisitor() {
        contentEl.innerHTML = `
            <div class="msg-empty">
                <div class="msg-empty-icon"><i class="fa-solid fa-bell" aria-hidden="true"></i></div>
                <h4>Inicia sesión para ver tus notificaciones</h4>
                <p>Aquí aparecerán los avisos de vendedores que sigues.</p>
                <button class="btn-primary" id="notif-go-auth" type="button">
                    <i class="fa-solid fa-right-to-bracket"></i> Iniciar sesión
                </button>
            </div>`;
        const b = document.getElementById('notif-go-auth');
        if (b) b.addEventListener('click', () => AuthUI.openAuthModal('login'));
    }

    function _renderError() {
        contentEl.innerHTML = `
            <div class="msg-empty">
                <div class="msg-empty-icon"><i class="fa-solid fa-cloud-exclamation"></i></div>
                <h4>No pudimos cargar tus notificaciones</h4>
                <p>Revisa tu conexión e inténtalo de nuevo.</p>
            </div>`;
    }

    function _renderList() {
        if (!items.length) {
            contentEl.innerHTML = `
                <div class="msg-empty">
                    <div class="msg-empty-icon"><i class="fa-regular fa-bell"></i></div>
                    <h4>Sin notificaciones todavía</h4>
                    <p>Cuando un vendedor que sigues publique algo, aparecerá aquí.</p>
                </div>`;
            return;
        }

        const list = document.createElement('div');
        list.className = 'msg-inbox';

        // Toolbar: marcar todas como leídas
        if (items.some(i => !i.read)) {
            const bar = document.createElement('div');
            bar.className = 'notif-toolbar';
            bar.innerHTML = `
                <button class="notif-mark-all" id="notif-mark-all" type="button">
                    <i class="fa-solid fa-check-double"></i> Marcar todas como leídas
                </button>`;
            bar.querySelector('#notif-mark-all').addEventListener('click', _markAllRead);
            contentEl.innerHTML = '';
            contentEl.appendChild(bar);
            contentEl.appendChild(list);
        } else {
            contentEl.innerHTML = '';
            contentEl.appendChild(list);
        }

        items.forEach(n => list.appendChild(_buildRow(n)));
    }

    function _buildRow(n) {
        const row = document.createElement('div');
        row.className = 'msg-row notif-row' + (n.read ? '' : ' unread');
        row.dataset.id = n.id;

        const icon = _iconForType(n.type);
        const when = Formatters.formatRelativeTime(n.createdAt);

        row.innerHTML = `
            <div class="msg-avatar notif-avatar">
                <i class="fa-solid ${icon}" aria-hidden="true"></i>
            </div>
            <div class="msg-body">
                <div class="msg-body-top">
                    <span class="msg-username">${Formatters.escapeHtml(n.title || 'Notificación')}</span>
                    <span class="msg-time">${when}</span>
                </div>
                <div class="msg-preview">${Formatters.escapeHtml(n.body || '')}</div>
            </div>
            <button class="notif-delete" type="button" aria-label="Eliminar notificación">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        row.addEventListener('click', (e) => {
            if (e.target.closest('.notif-delete')) return;
            _openNotification(n);
        });

        row.querySelector('.notif-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            _deleteNotification(n);
        });

        return row;
    }

    function _iconForType(type) {
        if (type === 'publicacion_nueva') return 'fa-box-open';
        return 'fa-bell';
    }

    async function _openNotification(n) {
        // Marcar como leída
        if (!n.read) await _markRead(n);
        // Navegar
        if (n.type === 'publicacion_nueva' && n.publicationId) {
            try {
                const pub = await PublicationService.getPublicationById(n.publicationId);
                if (!pub || pub.status === 'deleted') {
                    Toast.warning('Esta publicación ya no está disponible.');
                    return;
                }
                NavigationUI.switchView('home');
                PublicationUI.openProductSheet(pub);
            } catch (e) {
                Toast.error('No pudimos abrir la publicación.');
            }
        }
    }

    async function _markRead(n) {
        try {
            await _ref(AppState.currentUser.uid).doc(n.id).update({
                read: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) { Logger.warn('markRead falló', e); }
    }

    async function _markAllRead() {
        const unread = items.filter(i => !i.read);
        if (!unread.length) return;
        const batch = db.batch();
        unread.forEach(n => {
            batch.update(_ref(AppState.currentUser.uid).doc(n.id), {
                read: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        try { await batch.commit(); Toast.success('Todas marcadas como leídas.'); }
        catch (e) { Toast.error('No pudimos actualizar.'); }
    }

    async function _deleteNotification(n) {
        try {
            await _ref(AppState.currentUser.uid).doc(n.id).delete();
            Toast.success('Notificación eliminada.');
        } catch (e) { Toast.error('No pudimos eliminar.'); }
    }

    function _onForegroundMessage(payload) {
        const d = payload.data || {};
        if (d.type === 'nuevo_mensaje') {
            // Sistema B: no crear notif general. Actualizar badge de Mensajes.
            _bumpMessagesBadge();
            if (MessagingUI && MessagingUI.isChatOpen && MessagingUI.isChatOpen()) {
                // Si el chat está abierto, la UI ya actualiza por snapshot.
                return;
            }
            // Aviso interno discreto
            Toast.info((payload.notification && payload.notification.title) || 'Nuevo mensaje');
            return;
        }
        if (d.type === 'publicacion_nueva') {
            // El snapshot de Firestore actualizará la lista. No duplicar.
            Toast.info((payload.notification && payload.notification.body) || 'Nueva publicación');
        }
    }

    function _bumpMessagesBadge() {
        const el = document.getElementById('messaging-badge');
        if (!el) return;
        const current = parseInt(el.textContent || '0', 10) || 0;
        const next = current + 1;
        el.textContent = next > 9 ? '9+' : String(next);
        el.classList.remove('hidden');
    }

    function _markPermissionPill() {
        const pill = document.getElementById('notif-permission-state');
        if (pill) {
            pill.textContent = 'Activadas';
            pill.classList.add('ok');
        }
    }

    window.NotificationUI = { init, onEnter, onLeave };
})();