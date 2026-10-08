/* =====================================================
   PIPGO · TOAST COMPONENT
   Notificaciones efímeras. Reemplaza window.showToast global.
   ===================================================== */

(function () {
    let toastEl, toastIcon, toastMessage, hideTimeout;
    let initialized = false;

    const ICONS = {
        success: 'fa-circle-check',
        error: 'fa-circle-exclamation',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };

    function ensureInit() {
        if (initialized) return;
        toastEl = document.getElementById('toast');
        toastIcon = document.getElementById('toast-icon');
        toastMessage = document.getElementById('toast-message');
        initialized = true;
    }

    function show(message, type = 'success', duration = 2500) {
        ensureInit();
        if (!toastEl) return;

        // Resetear clases de tipo
        toastEl.classList.remove('toast-success', 'toast-error', 'toast-warning', 'toast-info');
        toastEl.classList.add(`toast-${type}`);

        // Icono
        if (toastIcon) {
            toastIcon.className = `fa-solid ${ICONS[type] || ICONS.info}`;
        }

        toastMessage.textContent = message;
        toastEl.classList.remove('hidden');

        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => toastEl.classList.add('hidden'), duration);
    }

    window.Toast = {
        success: (msg, d) => show(msg, 'success', d),
        error: (msg, d) => show(msg, 'error', d),
        warning: (msg, d) => show(msg, 'warning', d),
        info: (msg, d) => show(msg, 'info', d)
    };
})();