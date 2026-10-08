/* =====================================================
   PIPGO · SPLASH SCREEN
   Muestra el splash solo en la primera ejecución.
   Se elimina al estar lista la app (DOMContentLoaded + mínimo).
   ===================================================== */

(function () {
    'use strict';

    const CONFIG_SPLASH = {
        splashId: 'pipgo-splash',
        storageKey: 'pipgo_splash_shown',
        minimumDisplayTime: 1500,
        fadeDuration: 500
    };

    let splash = null;
    let startTime = 0;
    let appReady = false;
    let splashFinished = false;

    function getSplash() {
        if (!splash) splash = document.getElementById(CONFIG_SPLASH.splashId);
        return splash;
    }

    function hasBeenShown() {
        return Storage.get(CONFIG_SPLASH.storageKey) === true;
    }

    function removeImmediately() {
        const el = getSplash();
        if (!el) return;
        el.remove();
        splashFinished = true;
    }

    function hideSplash() {
        if (splashFinished) return;
        const el = getSplash();
        if (!el) { splashFinished = true; return; }
        splashFinished = true;
        el.classList.add('hide');
        setTimeout(() => el && el.remove(), CONFIG_SPLASH.fadeDuration);
    }

    function tryFinishSplash() {
        if (splashFinished || !appReady) return;
        const elapsed = Date.now() - startTime;
        const remaining = CONFIG_SPLASH.minimumDisplayTime - elapsed;
        if (remaining > 0) {
            setTimeout(tryFinishSplash, remaining);
            return;
        }
        hideSplash();
    }

    function setAppReady() {
        appReady = true;
        tryFinishSplash();
    }

    function init() {
        splash = getSplash();
        if (!splash) {
            Logger.warn('Splash no encontrado');
            return;
        }
        startTime = Date.now();

        if (hasBeenShown()) {
            removeImmediately();
            return;
        }
        Storage.set(CONFIG_SPLASH.storageKey, true);

        if (document.readyState === 'complete') setAppReady();
        else window.addEventListener('load', setAppReady, { once: true });

        document.addEventListener('deviceready', setAppReady, { once: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

    window.PipGoSplash = {
        hide: hideSplash,
        ready: setAppReady,
        reset: () => { Storage.remove(CONFIG_SPLASH.storageKey); }
    };
})();