/* =====================================================
   PIPGO · ERROR HANDLER
   Traduce errores técnicos a mensajes humanos.
   Clasifica por código y contexto. Registra internamente.
   -----------------------------------------------------
   FIX:
   - Si el error trae `userMessage` explícito, se respeta.
   - Si es un error de dominio (sin code, con mensaje corto
     y humano), se muestra tal cual. Antes se reemplazaba
     por "Ocurrió un error inesperado" aunque el mensaje
     fuera perfectamente claro ("Este vendedor no está
     disponible.", "Ya sigues a este vendedor.", etc.).
   - `classifyFirebaseError` ya no marca códigos no-Firebase
     como DATABASE_ERROR; ahora devuelve null y deja pasar
     al flujo general (que respeta MESSAGES[error.code] si
     existe, o el mensaje crudo si es humano).
   ===================================================== */

(function () {

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

    /**
     * Traduce códigos de Firebase a nuestros códigos.
     * Devuelve `null` si el código no es de Firebase — así
     * permitimos códigos de dominio sin que caigan en
     * DATABASE_ERROR por accidente.
     */
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
            // Código de dominio propio (ej. 'NOT_A_SELLER') que
            // tengamos registrado en MESSAGES.
            if (MESSAGES[error.code]) return error.code;
        }

        if (error.name === 'AbortError') return 'NETWORK_TIMEOUT';
        if (error.name === 'TypeError' && /fetch/i.test(error.message || '')) return 'NETWORK_OFFLINE';
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'NETWORK_OFFLINE';
        return 'UNKNOWN_ERROR';
    }

    /**
     * ¿Parece un mensaje "humano" listo para mostrar al usuario?
     * Heurística: descarta mensajes técnicos de JS, stacks y URLs
     * con puerto (que delatan errores de red internos).
     */
    function looksHuman(error) {
        if (!error || typeof error.message !== 'string') return false;
        const msg = error.message;
        if (msg.length === 0 || msg.length > 250) return false;

        // Prefijos típicos de errores internos del motor JS
        if (/^(TypeError|ReferenceError|SyntaxError|RangeError|EvalError|URIError|Uncaught)\b/i.test(msg)) {
            return false;
        }
        // Mensajes técnicos clásicos
        if (/\bCannot (read|set) (property|properties|of)/i.test(msg)) return false;
        if (/\b(is not a function|is not defined|is undefined|null is not an object)\b/i.test(msg)) return false;
        // Stack trace incrustado
        if (/\n\s+at\s+/.test(msg)) return false;
        // URLs internas con puerto (localhost:5500, etc.)
        if (/https?:\/\/[^\s]+:\d+/.test(msg)) return false;

        return true;
    }

    window.ErrorHandler = {
        /**
         * Clasifica, registra y devuelve un mensaje de usuario.
         * Prioridad:
         *   1. fallbackMessage explícito.
         *   2. error.userMessage explícito.
         *   3. error.message si parece humano.
         *   4. MESSAGES[code] (código conocido).
         *   5. MESSAGES.UNKNOWN_ERROR.
         */
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

            // Log interno (nunca mostrado al usuario)
            Logger.error(`[${context}] code=${code}`, {
                message: error && error.message,
                stack: error && error.stack,
                originalCode: error && error.code
            });

            return userMessage;
        },

        /**
         * Clasifica sin mostrar. Útil para lógica condicional.
         */
        classify,

        /**
         * Mensajes base accesibles si otro módulo los necesita.
         */
        MESSAGES
    };
})();