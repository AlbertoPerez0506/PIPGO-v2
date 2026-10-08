/* =====================================================
   PIPGO · LOGGER
   Registro centralizado. En producción solo loguea
   errores y warnings; en desarrollo todo.
   ===================================================== */

(function () {
    // Detectar entorno: Cordova sin livereload => asumimos producción
    const isDev = !window.cordova || location.hostname === 'localhost';

    function fmt(level, args) {
        const ts = new Date().toISOString().slice(11, 23);
        return [`[PipGo][${level}][${ts}]`, ...args];
    }

    window.Logger = {
        info(...args) { if (isDev) console.info(...fmt('INFO', args)); },
        warn(...args) { console.warn(...fmt('WARN', args)); },
        error(...args) { console.error(...fmt('ERROR', args)); },
        debug(...args) { if (isDev) console.debug(...fmt('DEBUG', args)); }
    };
})();