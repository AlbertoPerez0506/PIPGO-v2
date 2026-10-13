/* =====================================================
   PIPGO · ERROR HANDLER
   v2.0:
   - Errores esperados (códigos conocidos, mensajes de
     dominio) bajan a Logger.warn — dejan de inundar la
     consola con [ERROR] por cosas normales (F-22).
   - Los UNKNOWN_ERROR reales siguen siendo Logger.error.
   ===================================================== */

(function () {
    'use strict';

    const MESSAGES = {
        NETWORK_OFFLINE: 'No pudimos conectarnos a Internet. Revisa tu conexión e inténtalo nuevamente.',
        NETWORK_TIMEOUT: 'La operación tardó demasiado. Verifica tu conexión e inténtalo de nuevo.',
        REQUEST_FAILED: 'No pudimos conectar con el servidor. Inténtalo nuevamente.',
        UNAUTHORIZED: 'Debes iniciar sesión para continuar.',
        FORBIDDEN: 'No tienes permisos para realizar esta acción.',
        NOT_FOUND: 'No encontramos la información solicitada.',
        SERVER_ERROR: 'Ocurrió un problema en el servidor. Inténtalo más tarde.',
        VALIDATION_ERROR: 'Revisa los datos ingresados e inténtalo nuevamente.',
        AUTH_ERROR: 'No pudimos completar la autenticación. Inténtalo de nuevo.',
        STORAGE_ERROR: 'Hubo un problema con el almacenamiento del dispositivo.',
        UPLOAD_ERROR: 'No pudimos subir la imagen. Inténtalo de nuevo.',
        IMAGE_PROCESSING_ERROR: 'No pudimos procesar la imagen seleccionada.',
        DATABASE_ERROR: 'Hubo un problema al guardar o leer los datos.',
        PARSE_ERROR: 'Recibimos una respuesta inesperada del servidor.',
        UNKNOWN_ERROR: 'Ocurrió un error inesperado. Inténtalo nuevamente.'
    };

    function classifyFirebaseError(error) {
        const code = error && error.code;
        if (!code || typeof code !== 'string') return null;
        if (code.startsWith('auth/')) return 'AUTH_ERROR';
        if (code === 'permission-denied') return 'FORBIDDEN';
        if (code === 'unavailable' || code === 'deadline-exceeded') return 'NETWORK_TIMEOUT';
        if (code === 'not-found') return 'NOT_FOUND';
        if (code === 'resource-exhausted') return 'SERVER_ERROR';
        if (code === 'failed-precondition') return 'DATABASE_ERROR';
        return null;
    }

    function classify(error) {
        if (!error) return 'UNKNOWN_ERROR';
        if (typeof error === 'string') return 'UNKNOWN_ERROR';

        if (error.code && typeof error.code === 'string') {
            const fb = classifyFirebaseError(error);
            if (fb) return fb;
            if (MESSAGES[error.code]) return error.code;
        }

        if (error.name === 'AbortError') return 'NETWORK_TIMEOUT';
        if (error.name === 'TypeError' && /fetch/i.test(error.message || '')) return 'NETWORK_OFFLINE';
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'NETWORK_OFFLINE';
        return 'UNKNOWN_ERROR';
    }

    function looksHuman(error) {
        if (!error || typeof error.message !== 'string') return false;
        const msg = error.message;
        if (msg.length === 0 || msg.length > 250) return false;
        if (/^(TypeError|ReferenceError|SyntaxError|RangeError|EvalError|URIError|Uncaught)\b/i.test(msg)) return false;
        if (/\bCannot (read|set) (property|properties|of)/i.test(msg)) return false;
        if (/\b(is not a function|is not defined|is undefined|null is not an object)\b/i.test(msg)) return false;
        if (/\n\s+at\s+/.test(msg)) return false;
        if (/https?:\/\/[^\s]+:\d+/.test(msg)) return false;
        return true;
    }

    window.ErrorHandler = {
        toUserMessage(error, { context = 'app', fallbackMessage } = {}) {
            const code = classify(error);

            let userMessage;
            if (fallbackMessage) {
                userMessage = fallbackMessage;
            } else if (error && error.userMessage) {
                userMessage = error.userMessage;
            } else if (code === 'UNKNOWN_ERROR' && looksHuman(error)) {
                userMessage = error.message;
            } else {
                userMessage = MESSAGES[code] || MESSAGES.UNKNOWN_ERROR;
            }

            // F-22: solo los UNKNOWN reales se loguean como error.
            const logArgs = [{
                message: error && error.message,
                stack: error && error.stack,
                originalCode: error && error.code
            }];
            if (code === 'UNKNOWN_ERROR') {
                Logger.error(`[${context}] code=${code}`, ...logArgs);
            } else {
                Logger.warn(`[${context}] code=${code}`, ...logArgs);
            }

            return userMessage;
        },

        classify,
        MESSAGES
    };
})();