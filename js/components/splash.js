/* =====================================================
   PIPGO · SPLASH SCREEN
   Muestra el splash solo en la primera ejecución.
   Se elimina al estar lista la app (DOMContentLoaded + mínimo).

   v1.1 (Ronda 5 fix):
   - Storage.set('pipgo_splash_shown') movido a setAppReady().
     Antes se seteaba en init(), lo que provocaba que si
     Firebase fallaba y app.js eliminaba la splash en el
     branch de error, el flag quedaba a true y en la próxima
     recarga no se mostraba splash NUNCA. Ahora el flag
     solo se marca cuando la app está realmente lista.

   v1.2 (fix estructural):
   - Se eliminó la duplicación accidental del IIFE que
     provocaba una segunda ejecución de init() y el
     warning "Splash no encontrado" tras la primera
     carga completa. El archivo ahora contiene UN solo
     IIFE, sin código huérfano.
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
        if (appReady) return;
        appReady = true;

        // v1.1: marcar como mostrada SOLO cuando la app está
        // realmente lista. Si el arranque falla y app.js elimina
        // la splash manualmente, este punto nunca se alcanza y
        // el flag queda limpio para la próxima recarga.
        if (!splashFinished) {
            Storage.set(CONFIG_SPLASH.storageKey, true);
        }

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

        // v1.1: NO seteamos Storage.set aquí. Se hace en
        // setAppReady() para no "quemar" el flag si el
        // bootstrap falla antes de estar listo.

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