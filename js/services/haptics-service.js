/* =====================================================
   PIPGO · HAPTICS SERVICE
   Vibración táctil. Respeta la preferencia del usuario.
   Usa Vibration API en web; usa HapticFeedback en Cordova
   si el plugin está disponible (opcional).
   ===================================================== */

(function () {
    'use strict';

    const PATTERNS = {
        light:    10,
        medium:   22,
        success:  [12, 40, 12],
        warning:  [22, 60, 22],
        error:    [30, 40, 30, 40, 30]
    };

    function isEnabled() {
        if (window.AppState && AppState.prefHapticsEnabled === false) return false;
        return true;
    }

    function vibrate(pattern) {
        if (!isEnabled()) return;
        try {
            if (window.cordova &&
                window.cordova.plugins &&
                window.cordova.plugins.HapticFeedback) {
                window.cordova.plugins.HapticFeedback.selection();
                return;
            }
            if (navigator.vibrate) {
                navigator.vibrate(pattern);
            }
        } catch (e) { /* noop */ }
    }

    window.HapticsService = {
        light()   { vibrate(PATTERNS.light); },
        medium()  { vibrate(PATTERNS.medium); },
        success() { vibrate(PATTERNS.success); },
        warning() { vibrate(PATTERNS.warning); },
        error()   { vibrate(PATTERNS.error); }
    };
})();