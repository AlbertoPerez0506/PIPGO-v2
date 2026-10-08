/* =====================================================
   PIPGO · ADMIN UI
   Panel de administración: dashboard, solicitudes,
   recuperaciones de contraseña y usuarios.
   ===================================================== */

(function () {
    'use strict';

    let initialized = false;
    let currentTab = 'dashboard';
    let currentFilter = 'pending';
    let currentRecoverFilter = 'pending';
    let applicationsCache = [];
    let usersCache = [];
    let recoveriesCache = [];

    let confirmModal, confirmTitle, confirmText,
        confirmInputWrap, confirmInputLabel, confirmInput,
        confirmError, confirmOkBtn, confirmCancelBtn, confirmCloseBtn;
    let pendingConfirmAction = null;

    /* ---------------- HELPERS ---------------- */
    function el(html) {
        const t = document.createElement('template');
        t.innerHTML = html.trim();
        return t.content.firstElementChild;
    }

    function statusLabel(s) {
        switch (s) {
            case 'pending':    return 'En revisión';
            case 'approved':   return 'Aprobado';
            case 'rejected':   return 'Rechazado';
            case 'needs_info': return 'Información requerida';
            case 'suspended':  return 'Suspendido';
            default:            return s || '—';
        }
    }

    function statusClass(s) { return 'status-' + (s || 'none'); }

    function statusIcon(s) {
        switch (s) {
            case 'pending':    return 'fa-hourglass-half';
            case 'approved':   return 'fa-circle-check';
            case 'rejected':   return 'fa-circle-xmark';
            case 'needs_info': return 'fa-circle-info';
            case 'suspended':  return 'fa-ban';
            default:            return 'fa-circle';
        }
    }

    function roleLabelHtml(role, sellerStatus) {
        const build = (icon, label) =>
            `<i class="fa-solid ${icon}" aria-hidden="true"></i> ${Formatters.escapeHtml(label)}`;

        if (role === 'seller' && sellerStatus === 'approved') {
            return build('fa-circle-check', 'Vendedor aprobado');
        }
        if (sellerStatus === 'pending')    return build('fa-hourglass-half', 'Vendedor en revisión');
        if (sellerStatus === 'needs_info') return build('fa-circle-info',    'Requiere información');
        if (sellerStatus === 'rejected')   return build('fa-circle-xmark',   'Solicitud rechazada');
        if (sellerStatus === 'suspended')  return build('fa-ban',            'Suspendido');
        return build('fa-user', 'Usuario');
    }

    function formatDate(ts) {
        if (!ts) return '—';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function formatDateTime(ts) {
        if (!ts) return '—';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function describeAdminError(e) {
        const code = e && e.code;
        if (code === 'permission-denied') {
            return 'Firestore rechazó la operación. Verifica que tu email esté registrado como admin en las reglas de Firestore.';
        }
        return ErrorHandler.toUserMessage(e, { context: 'admin' });
    }

    /* =====================================================
       DASHBOARD
       ===================================================== */
    async function renderDashboard() {
        const panel = document.getElementById('admin-panel-dashboard');
        if (!panel) return;
        panel.innerHTML = '<p class="admin-loading">Cargando estadísticas…</p>';

        try {
            const stats = await AdminService.getDashboardStats();
            panel.innerHTML = `
                <div class="admin-stats-grid">
                    <div class="admin-stat-card">
                        <span class="admin-stat-number">${stats.totalUsers}</span>
                        <span class="admin-stat-label">Usuarios</span>
                    </div>
                    <div class="admin-stat-card warn">
                        <span class="admin-stat-number">${stats.pending}</span>
                        <span class="admin-stat-label">Pendientes</span>
                    </div>
                    <div class="admin-stat-card success">
                        <span class="admin-stat-number">${stats.approved}</span>
                        <span class="admin-stat-label">Vendedores</span>
                    </div>
                    <div class="admin-stat-card info">
                        <span class="admin-stat-number">${stats.needsInfo}</span>
                        <span class="admin-stat-label">Info requerida</span>
                    </div>
                    <div class="admin-stat-card danger">
                        <span class="admin-stat-number">${stats.rejected}</span>
                        <span class="admin-stat-label">Rechazadas</span>
                    </div>
                    <div class="admin-stat-card warn">
                        <span class="admin-stat-number">${stats.pendingRecoveries}</span>
                        <span class="admin-stat-label">Recuperaciones</span>
                    </div>
                </div>`;
        } catch (e) {
            Logger.error('Admin dashboard error', e);
            panel.innerHTML = `<p class="admin-error">${Formatters.escapeHtml(describeAdminError(e))}</p>`;
        }
    }

    /* =====================================================
       SOLICITUDES DE VENDEDOR
       ===================================================== */
    async function renderApplications() {
        const panel = document.getElementById('admin-panel-applications');
        if (!panel) return;

        panel.innerHTML = `
            <div class="admin-filter-row">
                <button class="admin-filter-chip${currentFilter === 'pending'    ? ' active' : ''}" data-filter="pending">Pendientes</button>
                <button class="admin-filter-chip${currentFilter === 'needs_info' ? ' active' : ''}" data-filter="needs_info">Info requerida</button>
                <button class="admin-filter-chip${currentFilter === 'approved'   ? ' active' : ''}" data-filter="approved">Aprobadas</button>
                <button class="admin-filter-chip${currentFilter === 'rejected'   ? ' active' : ''}" data-filter="rejected">Rechazadas</button>
                <button class="admin-filter-chip${currentFilter === 'all'        ? ' active' : ''}" data-filter="all">Todas</button>
            </div>
            <div id="admin-applications-list" class="admin-applications-list">
                <p class="admin-loading">Cargando solicitudes…</p>
            </div>`;

        panel.querySelectorAll('.admin-filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                currentFilter = chip.dataset.filter;
                renderApplications();
            });
        });

        await loadApplications();
    }

    async function loadApplications() {
        const list = document.getElementById('admin-applications-list');
        if (!list) return;
        list.innerHTML = '<p class="admin-loading">Cargando solicitudes…</p>';

        try {
            applicationsCache = await AdminService.listApplications(currentFilter);

            if (!applicationsCache.length) {
                list.innerHTML = '<p class="admin-empty">No hay solicitudes en este estado.</p>';
                return;
            }

            list.innerHTML = '';
            applicationsCache.forEach(app => list.appendChild(buildApplicationCard(app)));
        } catch (e) {
            Logger.error('Admin load applications error', e);
            list.innerHTML = `<p class="admin-error">${Formatters.escapeHtml(describeAdminError(e))}</p>`;
        }
    }

    function buildApplicationCard(app) {
        const user = app.user || {};
        const name = user.username ? '@' + user.username : (app.displayName || 'Sin nombre');
        const email = user.email || '—';

        const card = el(`
            <div class="admin-app-card">
                <div class="admin-app-head" role="button" tabindex="0">
                    <div class="admin-app-head-info">
                        <h4>${Formatters.escapeHtml(name)}</h4>
                        <p class="admin-app-email">${Formatters.escapeHtml(email)}</p>
                    </div>
                    <div class="admin-app-head-right">
                        <span class="admin-status-pill ${statusClass(app.status)}">
                            <i class="fa-solid ${statusIcon(app.status)}" aria-hidden="true"></i>
                            ${Formatters.escapeHtml(statusLabel(app.status))}
                        </span>
                        <i class="fa-solid fa-chevron-down admin-chevron"></i>
                    </div>
                </div>
                <div class="admin-app-body hidden">
                    ${renderApplicationBody(app)}
                </div>
            </div>`);

        const head = card.querySelector('.admin-app-head');
        const body = card.querySelector('.admin-app-body');
        head.addEventListener('click', () => {
            const isOpen = !body.classList.contains('hidden');
            body.classList.toggle('hidden', isOpen);
            card.classList.toggle('open', !isOpen);
        });

        card.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleAction(btn.dataset.action, app);
            });
        });

        return card;
    }

    function renderApplicationBody(app) {
        const rows = [
            ['Nombre público',       app.displayName],
            ['Tipo',                 app.sellerType === 'business' ? 'Negocio' : 'Persona'],
            ['Nombre del negocio',   app.businessName],
            ['Categoría',            app.category],
            ['Descripción',          app.description],
            ['Teléfono',             app.phone],
            ['Ciudad',               app.city],
            ['Estado',               app.state],
            ['Red social',           app.socialUrl],
            ['Método de contacto',   app.contactMethod === 'whatsapp' ? 'WhatsApp' : 'Llamada'],
            ['Enviada',              formatDate(app.submittedAt)]
        ];

        let html = '<div class="admin-app-fields">';
        rows.forEach(([label, value]) => {
            if (value === undefined || value === null || value === '') return;
            html += `
                <div class="admin-field">
                    <span class="admin-field-label">${Formatters.escapeHtml(label)}</span>
                    <span class="admin-field-value">${Formatters.escapeHtml(String(value))}</span>
                </div>`;
        });
        html += '</div>';

        if (app.rejectionReason) {
            html += `
                <div class="admin-note danger">
                    <strong>Motivo de rechazo:</strong>
                    <p>${Formatters.escapeHtml(app.rejectionReason)}</p>
                </div>`;
        }
        if (app.adminNote) {
            html += `
                <div class="admin-note info">
                    <strong>Información solicitada:</strong>
                    <p>${Formatters.escapeHtml(app.adminNote)}</p>
                </div>`;
        }
        if (app.reviewedAt) {
            html += `<p class="admin-reviewed">Última revisión: ${formatDate(app.reviewedAt)}</p>`;
        }

        const actions = [];
        if (app.status === 'pending' || app.status === 'needs_info' || app.status === 'rejected') {
            actions.push(`<button class="admin-action-btn approve" data-action="approve"><i class="fa-solid fa-check"></i> Aprobar</button>`);
        }
        if (app.status === 'pending' || app.status === 'approved') {
            actions.push(`<button class="admin-action-btn info" data-action="needs_info"><i class="fa-solid fa-circle-info"></i> Solicitar información</button>`);
        }
        if (app.status === 'pending' || app.status === 'approved' || app.status === 'needs_info') {
            actions.push(`<button class="admin-action-btn reject" data-action="reject"><i class="fa-solid fa-xmark"></i> Rechazar</button>`);
        }

        if (actions.length) {
            html += `<div class="admin-app-actions">${actions.join('')}</div>`;
        }

        return html;
    }

    /* =====================================================
       RECUPERACIONES DE CONTRASEÑA
       ===================================================== */
    async function renderRecoveries() {
        const panel = document.getElementById('admin-panel-recoveries');
        if (!panel) return;

        panel.innerHTML = `
            <div class="admin-filter-row">
                <button class="admin-filter-chip${currentRecoverFilter === 'pending'  ? ' active' : ''}" data-filter="pending">Pendientes</button>
                <button class="admin-filter-chip${currentRecoverFilter === 'approved' ? ' active' : ''}" data-filter="approved">Aprobadas</button>
                <button class="admin-filter-chip${currentRecoverFilter === 'rejected' ? ' active' : ''}" data-filter="rejected">Rechazadas</button>
                <button class="admin-filter-chip${currentRecoverFilter === 'all'      ? ' active' : ''}" data-filter="all">Todas</button>
            </div>
            <div id="admin-recoveries-list" class="admin-applications-list">
                <p class="admin-loading">Cargando solicitudes…</p>
            </div>`;

        panel.querySelectorAll('.admin-filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                currentRecoverFilter = chip.dataset.filter;
                renderRecoveries();
            });
        });

        await loadRecoveries();
    }

    async function loadRecoveries() {
        const list = document.getElementById('admin-recoveries-list');
        if (!list) return;
        list.innerHTML = '<p class="admin-loading">Cargando solicitudes…</p>';

        try {
            recoveriesCache = await AdminService.listPasswordResetRequests(currentRecoverFilter);

            if (!recoveriesCache.length) {
                list.innerHTML = '<p class="admin-empty">No hay solicitudes de recuperación en este estado.</p>';
                return;
            }

            list.innerHTML = '';
            recoveriesCache.forEach(r => list.appendChild(buildRecoveryCard(r)));
        } catch (e) {
            Logger.error('Admin load recoveries error', e);
            list.innerHTML = `<p class="admin-error">${Formatters.escapeHtml(describeAdminError(e))}</p>`;
        }
    }

    function buildRecoveryCard(req) {
        const card = el(`
            <div class="admin-app-card">
                <div class="admin-app-head" role="button" tabindex="0">
                    <div class="admin-app-head-info">
                        <h4><i class="fa-solid fa-key" aria-hidden="true"></i> ${Formatters.escapeHtml(req.email || '—')}</h4>
                        <p class="admin-app-email">Solicitada ${formatDateTime(req.requestedAt)}</p>
                    </div>
                    <div class="admin-app-head-right">
                        <span class="admin-status-pill ${statusClass(req.status)}">
                            <i class="fa-solid ${statusIcon(req.status)}" aria-hidden="true"></i>
                            ${Formatters.escapeHtml(statusLabel(req.status))}
                        </span>
                        <i class="fa-solid fa-chevron-down admin-chevron"></i>
                    </div>
                </div>
                <div class="admin-app-body hidden">
                    ${renderRecoveryBody(req)}
                </div>
            </div>`);

        const head = card.querySelector('.admin-app-head');
        const body = card.querySelector('.admin-app-body');
        head.addEventListener('click', () => {
            const isOpen = !body.classList.contains('hidden');
            body.classList.toggle('hidden', isOpen);
            card.classList.toggle('open', !isOpen);
        });

        card.querySelectorAll('[data-recover-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleRecoveryAction(btn.dataset.recoverAction, req);
            });
        });

        return card;
    }

    function renderRecoveryBody(req) {
        let html = '<div class="admin-app-fields">';
        html += `
            <div class="admin-field">
                <span class="admin-field-label">Correo electrónico</span>
                <span class="admin-field-value">${Formatters.escapeHtml(req.email || '—')}</span>
            </div>
            <div class="admin-field">
                <span class="admin-field-label">Solicitada</span>
                <span class="admin-field-value">${formatDateTime(req.requestedAt)}</span>
            </div>`;
        if (req.reviewedAt) {
            html += `
                <div class="admin-field">
                    <span class="admin-field-label">Revisada</span>
                    <span class="admin-field-value">${formatDateTime(req.reviewedAt)}</span>
                </div>`;
        }
        if (req.emailSentAt) {
            html += `
                <div class="admin-field">
                    <span class="admin-field-label">Correo enviado</span>
                    <span class="admin-field-value">${formatDateTime(req.emailSentAt)}</span>
                </div>`;
        }
        html += '</div>';

        if (req.rejectionReason) {
            html += `
                <div class="admin-note danger">
                    <strong>Motivo del rechazo:</strong>
                    <p>${Formatters.escapeHtml(req.rejectionReason)}</p>
                </div>`;
        }

        const actions = [];
        if (req.status === 'pending') {
            actions.push(`<button class="admin-action-btn approve" data-recover-action="approve">
                <i class="fa-solid fa-paper-plane"></i> Enviar enlace
            </button>`);
            actions.push(`<button class="admin-action-btn reject" data-recover-action="reject">
                <i class="fa-solid fa-xmark"></i> Rechazar
            </button>`);
        } else if (req.status === 'rejected') {
            actions.push(`<button class="admin-action-btn approve" data-recover-action="approve">
                <i class="fa-solid fa-paper-plane"></i> Enviar enlace
            </button>`);
        }

        if (actions.length) {
            html += `<div class="admin-app-actions">${actions.join('')}</div>`;
        }

        return html;
    }

    function handleRecoveryAction(action, req) {
        if (action === 'approve') {
            openConfirm({
                title: 'Enviar enlace de recuperación',
                text: `Se enviará un correo a ${req.email} con un enlace para definir una nueva contraseña. ¿Continuar?`,
                inputLabel: null,
                okText: 'Sí, enviar',
                onConfirm: () => AdminService.approvePasswordReset(req.id, req.email)
            });
        } else if (action === 'reject') {
            openConfirm({
                title: 'Rechazar solicitud',
                text: `¿Rechazar la solicitud de ${req.email}? Puedes agregar un motivo.`,
                inputLabel: 'Motivo (opcional)',
                inputPlaceholder: 'Ej. Correo no coincide con ninguna cuenta…',
                okText: 'Sí, rechazar',
                onConfirm: (value) => AdminService.rejectPasswordReset(req.id, value || '')
            });
        }
    }

    /* =====================================================
       USUARIOS
       ===================================================== */
    async function renderUsers() {
        const panel = document.getElementById('admin-panel-users');
        if (!panel) return;

        panel.innerHTML = `
            <div class="admin-search-wrap">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="admin-user-search" placeholder="Buscar por @usuario o correo…">
            </div>
            <p class="admin-users-count" id="admin-users-count"></p>
            <div class="admin-users-list" id="admin-users-list">
                <p class="admin-loading">Cargando usuarios…</p>
            </div>`;

        try {
            usersCache = await AdminService.listUsers();
            renderUsersList('');
        } catch (e) {
            Logger.error('Admin users error', e);
            const l = document.getElementById('admin-users-list');
            if (l) l.innerHTML = `<p class="admin-error">${Formatters.escapeHtml(describeAdminError(e))}</p>`;
            return;
        }

        const search = document.getElementById('admin-user-search');
        if (search) search.addEventListener('input', e => renderUsersList(e.target.value));
    }

    function renderUsersList(query) {
        const list = document.getElementById('admin-users-list');
        const countEl = document.getElementById('admin-users-count');
        if (!list) return;

        const q = String(query || '').trim().toLowerCase();
        const filtered = q
            ? usersCache.filter(u => {
                const uname = (u.username || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                return uname.includes(q) || email.includes(q);
            })
            : usersCache;

        if (countEl) {
            countEl.textContent = `${filtered.length} usuario${filtered.length === 1 ? '' : 's'}`;
        }

        if (!filtered.length) {
            list.innerHTML = '<p class="admin-empty">Sin resultados.</p>';
            return;
        }

        list.innerHTML = '';
        filtered
            .sort((a, b) => (a.username || '').localeCompare(b.username || ''))
            .forEach(u => {
                const email = u.email || '—';
                const username = u.username ? '@' + u.username : '';
                const badgeHtml = roleLabelHtml(u.role, u.sellerStatus);
                list.appendChild(el(`
                    <div class="admin-user-row">
                        <div class="admin-user-info">
                            <span class="admin-user-name">${Formatters.escapeHtml(username || email)}</span>
                            <span class="admin-user-email">${Formatters.escapeHtml(email)}</span>
                        </div>
                        <span class="admin-user-badge">${badgeHtml}</span>
                    </div>`));
            });
    }

    /* =====================================================
       ACCIONES + CONFIRMACIÓN
       ===================================================== */
    function handleAction(action, app) {
        const user = app.user || {};
        const name = user.username ? '@' + user.username : (app.displayName || 'usuario');
        const uid = app.uid || app.id;

        if (action === 'approve') {
            openConfirm({
                title: 'Aprobar solicitud',
                text: `¿Estás seguro de aprobar la solicitud de ${name}? Pasará a ser vendedor aprobado y podrá publicar.`,
                inputLabel: null,
                okText: 'Sí, aprobar',
                onConfirm: () => AdminService.approve(uid)
            });
        } else if (action === 'reject') {
            openConfirm({
                title: 'Rechazar solicitud',
                text: `¿Estás seguro de rechazar la solicitud de ${name}? Se guardará el motivo.`,
                inputLabel: 'Motivo del rechazo',
                inputPlaceholder: 'Indica por qué no fue aprobada…',
                okText: 'Sí, rechazar',
                onConfirm: (value) => AdminService.reject(uid, value)
            });
        } else if (action === 'needs_info') {
            openConfirm({
                title: 'Solicitar información',
                text: `¿Qué información necesita corregir o completar ${name}?`,
                inputLabel: 'Información solicitada',
                inputPlaceholder: 'Describe qué debe corregir o completar…',
                okText: 'Solicitar información',
                onConfirm: (value) => AdminService.requestInfo(uid, value)
            });
        }
    }

    function openConfirm({ title, text, inputLabel, inputPlaceholder, okText, onConfirm }) {
        confirmTitle.textContent = title;
        confirmText.textContent = text;

        if (inputLabel) {
            confirmInputWrap.classList.remove('hidden');
            confirmInputLabel.textContent = inputLabel;
            confirmInput.placeholder = inputPlaceholder || '';
            confirmInput.value = '';
        } else {
            confirmInputWrap.classList.add('hidden');
        }

        confirmError.classList.add('hidden');
        confirmOkBtn.disabled = false;
        confirmOkBtn.textContent = okText || 'Confirmar';
        pendingConfirmAction = onConfirm;

        confirmModal.classList.remove('hidden');
    }

    function closeConfirm() {
        confirmModal.classList.add('hidden');
        pendingConfirmAction = null;
    }

    async function onConfirmClick() {
        if (!pendingConfirmAction) return;

        const needsInput = !confirmInputWrap.classList.contains('hidden');
        const value = needsInput ? confirmInput.value.trim() : '';

        // Para rechazos con motivo, permitir vacío (opcional). El mínimo
        // solo aplica si el label dice "Motivo del rechazo" en vendedores.
        if (needsInput &&
            confirmInputLabel.textContent === 'Motivo del rechazo' &&
            value.length < 3) {
            confirmError.textContent = 'Escribe al menos 3 caracteres.';
            confirmError.classList.remove('hidden');
            return;
        }

        confirmOkBtn.disabled = true;
        const originalText = confirmOkBtn.textContent;
        confirmOkBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando…';

        try {
            await pendingConfirmAction(value);
            closeConfirm();
            Toast.success('Acción completada correctamente.');

            if (currentTab === 'applications') await loadApplications();
            else if (currentTab === 'recoveries') await loadRecoveries();
            else if (currentTab === 'dashboard')  await renderDashboard();
            else if (currentTab === 'users')      await renderUsers();
        } catch (e) {
            Logger.error('Admin action failed', e);
            confirmError.textContent = describeAdminError(e);
            confirmError.classList.remove('hidden');
        } finally {
            confirmOkBtn.disabled = false;
            confirmOkBtn.textContent = originalText;
        }
    }

    /* =====================================================
       TABS
       ===================================================== */
    function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.admin-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.adminTab === tab);
        });
        document.querySelectorAll('.admin-panel').forEach(p => {
            p.classList.toggle('active', p.id === `admin-panel-${tab}`);
        });

        if (tab === 'dashboard')         renderDashboard();
        else if (tab === 'applications') renderApplications();
        else if (tab === 'recoveries')   renderRecoveries();
        else if (tab === 'users')        renderUsers();
    }

    /* =====================================================
       ENTRAR AL PANEL
       ===================================================== */
    function onEnterAdmin() {
        waitForAuthThenEnter(0);
    }

    function waitForAuthThenEnter(attempt) {
        const MAX_ATTEMPTS = 12;
        const INTERVAL_MS = 100;

        if (AppState.currentUser) {
            if (!AdminService.isAdmin()) {
                Toast.error('No tienes permisos para acceder.');
                NavigationUI.switchView('home');
                return;
            }
            renderAdminPanel();
            return;
        }

        if (attempt >= MAX_ATTEMPTS) {
            Toast.error('No tienes permisos para acceder.');
            NavigationUI.switchView('home');
            return;
        }

        setTimeout(() => waitForAuthThenEnter(attempt + 1), INTERVAL_MS);
    }

    function renderAdminPanel() {
        const hello = document.getElementById('admin-hello');
        const profile = AppState.currentProfile || {};
        if (hello) hello.textContent = `Hola, ${profile.username || 'admin'}`;

        switchTab('dashboard');
    }

    /* =====================================================
       INIT
       ===================================================== */
    function init() {
        if (initialized) return;
        initialized = true;

        confirmModal       = document.getElementById('admin-confirm-modal');
        confirmTitle       = document.getElementById('admin-confirm-title');
        confirmText        = document.getElementById('admin-confirm-text');
        confirmInputWrap   = document.getElementById('admin-confirm-input-wrap');
        confirmInputLabel  = document.getElementById('admin-confirm-input-label');
        confirmInput       = document.getElementById('admin-confirm-input');
        confirmError       = document.getElementById('admin-confirm-error');
        confirmOkBtn       = document.getElementById('admin-confirm-ok');
        confirmCancelBtn   = document.getElementById('admin-confirm-cancel');
        confirmCloseBtn    = document.getElementById('admin-confirm-close');

        document.querySelectorAll('.admin-tab').forEach(t => {
            t.addEventListener('click', () => switchTab(t.dataset.adminTab));
        });

        const backBtn = document.getElementById('admin-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => history.back());
        }

        confirmOkBtn.addEventListener('click', onConfirmClick);
        confirmCancelBtn.addEventListener('click', closeConfirm);
        confirmCloseBtn.addEventListener('click', closeConfirm);
        confirmModal.addEventListener('click', e => {
            if (e.target === confirmModal) closeConfirm();
        });
    }

    window.AdminUI = {
        init,
        onEnterAdmin,
        isConfirmModalOpen: () => confirmModal && !confirmModal.classList.contains('hidden'),
        closeConfirm
    };
})();