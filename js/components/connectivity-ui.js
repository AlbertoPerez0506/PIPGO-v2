/* =====================================================
   PIPGO · CONNECTIVITY UI
   Banner flotante "Sin conexión" + toasts al recuperar
   o al cambiar a datos móviles.
   ===================================================== */

(function () {
    'use strict';

    let banner, bannerText, bannerIcon;
    let initialized = false;
    let unsubscribe = null;
    let announcedCellular = false;
    let wasOffline = false;

    function ensureBanner() {
        if (banner) return banner;
        const app = document.getElementById('app');
        if (!app) return null;

        banner = document.createElement('div');
        banner.className = 'connectivity-banner';
        banner.id = 'connectivity-banner';
        banner.setAttribute('aria-live', 'polite');
        banner.innerHTML = `
            <i class="fa-solid fa-plug-circle-xmark" data-role="icon"></i>
            <span data-role="text">Sin conexión</span>`;
        app.appendChild(banner);

        bannerIcon = banner.querySelector('[data-role="icon"]');
        bannerText = banner.querySelector('[data-role="text"]');
        return banner;
    }

    function showOffline() {
        const b = ensureBanner();
        if (!b) return;
        if (bannerIcon) bannerIcon.className = 'fa-solid fa-plug-circle-xmark';
        if (bannerText) bannerText.textContent = 'Sin conexión';
        b.classList.add('visible');
    }

    function hideOffline() {
        if (!banner) return;
        banner.classList.remove('visible');
    }

    function handleChange(state) {
        if (!state) return;
        const { connectionType, onlineState } = state;

        if (onlineState === false) {
            wasOffline = true;
            showOffline();
            return;
        }

        if (wasOffline) {
            wasOffline = false;
            hideOffline();
            if (window.Toast) Toast.success('Conexión restaurada.');
        }

        if (connectionType === 'cellular' && !announcedCellular) {
            announcedCellular = true;
            if (window.Toast) Toast.info('Estás usando datos móviles.');
        }
    }

    function init() {
        if (initialized) return;
        initialized = true;
        ensureBanner();
        if (window.ConnectivityService) {
            handleChange(ConnectivityService.current());
            unsubscribe = ConnectivityService.onChange(handleChange);
        }
    }

    function destroy() {
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
        if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
        banner = null; bannerIcon = null; bannerText = null;
        initialized = false;
    }

    window.ConnectivityUI = { init, destroy };
})();