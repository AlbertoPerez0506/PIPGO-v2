/* =====================================================
   PIPGO · VALIDATORS
   Validación de datos de entrada. NO sanitiza.
   Mensajes específicos, sin culpar al usuario.
   Los límites viven aquí: fuente única de verdad
   para contadores y validaciones.

   Novedades:
   - Username acepta ñ/Ñ.
   - Mensajes de error específicos (espacios,
     caracteres inválidos, etc.).
   - validateSchedule robusto: parsea a minutos,
     acepta 24h y 12h (con AM/PM), permite cualquier
     combinación mañana/tarde/noche.
   ===================================================== */

window.Validators = {

    LIMITS: {
        USERNAME_MIN: 3,
        USERNAME_MAX: 20,
        PUBLICATION_NAME_MAX: 60,
        PUBLICATION_STORE_NAME_MAX: 60,
        PUBLICATION_DESCRIPTION_MAX: 400,
        PUBLICATION_EXTRA_REFS_MAX: 300,
        PUBLICATION_REFERENCE_MAX: 120,
        PUBLICATION_PHONE_MAX: 20,
        PRESENTATION_QTY_MAX_DIGITS: 8,
        SELLER_DISPLAY_NAME_MIN: 2,
        SELLER_DISPLAY_NAME_MAX: 100,
        SELLER_CATEGORY_MAX: 80,
        SELLER_DESCRIPTION_MIN: 10,
        SELLER_DESCRIPTION_MAX: 1000,
        SELLER_PHONE_MIN: 7,
        SELLER_PHONE_MAX: 30
    },

    /* Caracteres permitidos en username: A-Z, a-z, 0-9, punto, guion bajo,
       y las letras ñ/Ñ (español). */
    USERNAME_ALLOWED_REGEX: /^[a-zA-Z0-9._ñÑ]+$/,
    USERNAME_INVALID_CHARS_REGEX: /[^a-zA-Z0-9._ñÑ]/g,

    /* ---------- Username ---------- */
    normalizeUsername(username) {
        // toLowerCase() en JS respeta ñ/Ñ sin problemas.
        return String(username || '').trim().toLowerCase();
    },

    validateUsername(username) {
        const L = this.LIMITS;
        const raw = String(username == null ? '' : username);

        // 1) Espacios: caso más común y confuso. Mensaje muy explícito.
        if (/\s/.test(raw)) {
            const suggestion = raw.trim().replace(/\s+/g, '_');
            return {
                valid: false,
                error: `Los usernames no pueden tener espacios. Prueba con "${suggestion}" o algo parecido.`
            };
        }

        const value = raw.trim();

        // 2) Longitud
        if (value.length < L.USERNAME_MIN) {
            return {
                valid: false,
                error: `El username debe tener al menos ${L.USERNAME_MIN} caracteres.`
            };
        }
        if (value.length > L.USERNAME_MAX) {
            return {
                valid: false,
                error: `El username no puede superar ${L.USERNAME_MAX} caracteres.`
            };
        }

        // 3) Caracteres inválidos → mostramos cuáles
        const invalidMatches = value.match(this.USERNAME_INVALID_CHARS_REGEX);
        if (invalidMatches && invalidMatches.length) {
            const uniq = [...new Set(invalidMatches)].slice(0, 5);
            const list = uniq.map(c => `"${c}"`).join(' ');
            return {
                valid: false,
                error: `Caracteres no permitidos: ${list}. Usa solo letras (incluida ñ), números, "_" y ".".`
            };
        }

        // 4) Regex final (redundante pero por seguridad)
        if (!this.USERNAME_ALLOWED_REGEX.test(value)) {
            return {
                valid: false,
                error: 'Solo se permiten letras (incluida ñ), números, "_" y ".". Sin espacios.'
            };
        }

        return { valid: true, value };
    },

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
    },

    validatePassword(password) {
        return String(password || '').length >= 6;
    },

    /**
     * Genera los prefijos (longitud 2..N) de un username normalizado.
     * Se almacena en perfilesPublicos.usernamePrefixes para permitir
     * búsqueda por prefijo con array-contains.
     */
    generateUsernamePrefixes(normalized) {
    const s = String(normalized || '').trim().toLowerCase();
    if (s.length < 2) return [];
    const out = [];
    for (let i = 2; i <= s.length; i++) out.push(s.slice(0, i));
    return out;
    },



    /* =================================================
       PUBLICACIÓN
       ================================================= */
    validatePublication(data) {
        const L = this.LIMITS;

        if (!data.name || !String(data.name).trim()) {
            return { valid: false, error: 'Agrega el nombre del producto.' };
        }
        if (String(data.name).length > L.PUBLICATION_NAME_MAX) {
            return { valid: false, error: `El nombre no puede superar ${L.PUBLICATION_NAME_MAX} caracteres.` };
        }
        if (data.price == null || data.price === '') {
            return { valid: false, error: 'Agrega un precio.' };
        }
        if (!data.category) {
            return { valid: false, error: 'Selecciona una categoría.' };
        }
        if (!data.mainImage) {
            return { valid: false, error: 'La foto principal es obligatoria.' };
        }
        if (data.description != null &&
            String(data.description).length > L.PUBLICATION_DESCRIPTION_MAX) {
            return { valid: false, error: `La descripción no puede superar ${L.PUBLICATION_DESCRIPTION_MAX} caracteres.` };
        }

        const unitCheck = this._validateUnitForCategory(data.unitCode, data.category);
        if (!unitCheck.valid) return unitCheck;

        const conditionCheck = this._validateConditionForCategory(data.condition, data.category);
        if (!conditionCheck.valid) return conditionCheck;

        const presentationCheck = this.validatePresentation(data.presentation, data.category);
        if (!presentationCheck.valid) return presentationCheck;

        return { valid: true };
    },

    _validateUnitForCategory(unitCode, category) {
        if (!unitCode) return { valid: true };
        if (!window.UnitCatalog || !window.CategoryConfig) return { valid: true };

        const unit = UnitCatalog.get(unitCode);
        if (!unit) return { valid: false, error: 'La unidad seleccionada no es válida.' };

        const allowed = CategoryConfig.unitsFor(category).map(u => u.code);
        if (!allowed.includes(unitCode)) {
            return { valid: false, error: 'Esa unidad no aplica a la categoría seleccionada.' };
        }
        return { valid: true };
    },

    _validateConditionForCategory(condition, category) {
        if (!condition) return { valid: true };
        if (!window.CategoryConfig) return { valid: true };

        if (!CategoryConfig.showsCondition(category)) {
            return { valid: false, error: 'La condición no aplica a esta categoría.' };
        }
        const allowed = CategoryConfig.conditionsFor(category);
        if (!allowed.includes(condition)) {
            return { valid: false, error: 'Condición no válida para esta categoría.' };
        }
        return { valid: true };
    },

    validatePresentation(presentation, category) {
        if (presentation == null) return { valid: true };

        if (typeof presentation !== 'object') {
            return { valid: false, error: 'La presentación no tiene un formato válido.' };
        }

        const qty = Number(presentation.quantity);
        if (!isFinite(qty) || qty <= 0) {
            return { valid: false, error: 'La cantidad de la presentación debe ser mayor que cero.' };
        }
        if (!presentation.unitCode) {
            return { valid: false, error: 'Falta la unidad de la presentación.' };
        }
        if (window.UnitCatalog && !UnitCatalog.get(presentation.unitCode)) {
            return { valid: false, error: 'Unidad de presentación no válida.' };
        }
        if (window.CategoryConfig && category) {
            const allowed = CategoryConfig.unitsFor(category).map(u => u.code);
            if (!allowed.includes(presentation.unitCode)) {
                return { valid: false, error: 'La unidad de presentación no aplica a esta categoría.' };
            }
        }
        return { valid: true };
    },

    /* =================================================
       HORARIO — opcional
       -------------------------------------------------
       Antes se comparaba "HH:MM" como string. Eso funciona
       para formato 24h con ceros, pero falla si algún
       navegador devuelve "8:00" (sin cero) o "2:00 PM".

       Ahora convertimos a minutos y comparamos numérico.
       Aceptamos cualquier combinación mañana/tarde/noche
       (2pm-5pm, 11am-2pm, 8am-12pm, etc.). Horarios que
       cruzan medianoche (22:00 → 02:00) también son
       válidos.

       Casos inválidos:
         - Sin días.
         - Hora vacía o con formato desconocido.
         - Inicio == fin.
       ================================================= */
    validateSchedule(schedule) {
        if (!schedule) return { valid: true };
        if (!schedule.days || !schedule.days.length) {
            return { valid: false, error: 'Selecciona al menos un día para el horario.' };
        }
        if (!schedule.start || !schedule.end) {
            return { valid: false, error: 'Indica la hora de inicio y de fin.' };
        }

        const startMin = this._timeToMinutes(schedule.start);
        const endMin   = this._timeToMinutes(schedule.end);

        if (startMin == null || endMin == null) {
            return { valid: false, error: 'La hora no tiene un formato válido.' };
        }

        if (startMin === endMin) {
            return { valid: false, error: 'La hora de inicio y la de fin no pueden ser iguales.' };
        }

        // Inicio > fin se interpreta como horario nocturno (cruza medianoche).
        // Es válido.
        return { valid: true };
    },

    /**
     * Convierte una hora a minutos desde medianoche.
     * Acepta:
     *   "14:00", "14:00:30", "8:00"   → 24h
     *   "2:30 PM", "02:30PM", "2:30 p.m." → 12h
     * Devuelve null si no se puede parsear.
     */
    _timeToMinutes(value) {
        if (value == null) return null;
        const str = String(value).trim();
        if (!str) return null;

        // 24h: HH:MM o HH:MM:SS (con o sin cero a la izquierda)
        let m = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        if (m) {
            const h = parseInt(m[1], 10);
            const min = parseInt(m[2], 10);
            if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
                return h * 60 + min;
            }
            return null;
        }

        // 12h: H:MM AM / H:MM PM (con o sin puntos, con o sin espacio)
        m = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp])\.?\s*[Mm]\.?$/);
        if (m) {
            let h = parseInt(m[1], 10);
            const min = parseInt(m[2], 10);
            const period = m[3].toUpperCase();

            if (h < 1 || h > 12 || min < 0 || min > 59) return null;
            if (h === 12) h = 0;
            if (period === 'P') h += 12;

            return h * 60 + min;
        }

        return null;
    },

    /* =================================================
       SOLICITUD DE VENDEDOR
       ================================================= */
    validateSellerApplication(data) {
        const L = this.LIMITS;

        if (!data.sellerType || !['person', 'business'].includes(data.sellerType)) {
            return { valid: false, error: 'Selecciona el tipo de vendedor.' };
        }
        if (!data.displayName || data.displayName.trim().length < L.SELLER_DISPLAY_NAME_MIN) {
            return { valid: false, error: `Ingresa un nombre público (mínimo ${L.SELLER_DISPLAY_NAME_MIN} caracteres).` };
        }
        if (data.displayName.trim().length > L.SELLER_DISPLAY_NAME_MAX) {
            return { valid: false, error: `El nombre público no puede superar ${L.SELLER_DISPLAY_NAME_MAX} caracteres.` };
        }
        if (data.sellerType === 'business' &&
            (!data.businessName || data.businessName.trim().length < 2)) {
            return { valid: false, error: 'Ingresa el nombre del negocio.' };
        }
        if (!data.category || data.category.trim().length < 2) {
            return { valid: false, error: 'Indica la categoría principal.' };
        }
        if (data.category.trim().length > L.SELLER_CATEGORY_MAX) {
            return { valid: false, error: `La categoría no puede superar ${L.SELLER_CATEGORY_MAX} caracteres.` };
        }
        if (!data.description || data.description.trim().length < L.SELLER_DESCRIPTION_MIN) {
            return { valid: false, error: `Describe brevemente tu actividad (mínimo ${L.SELLER_DESCRIPTION_MIN} caracteres).` };
        }
        if (data.description.trim().length > L.SELLER_DESCRIPTION_MAX) {
            return { valid: false, error: `La descripción no puede superar ${L.SELLER_DESCRIPTION_MAX} caracteres.` };
        }
        if (!data.phone || data.phone.trim().length < L.SELLER_PHONE_MIN) {
            return { valid: false, error: 'Ingresa un teléfono de contacto.' };
        }
        if (data.phone.trim().length > L.SELLER_PHONE_MAX) {
            return { valid: false, error: `El teléfono no puede superar ${L.SELLER_PHONE_MAX} caracteres.` };
        }
        if (!data.city || !data.city.trim()) {
            return { valid: false, error: 'Ingresa tu ciudad.' };
        }
        if (!data.state || !data.state.trim()) {
            return { valid: false, error: 'Ingresa tu estado.' };
        }
        if (!['phone', 'whatsapp'].includes(data.contactMethod || 'phone')) {
            return { valid: false, error: 'Selecciona el método de contacto.' };
        }
        if (data.socialUrl && data.socialUrl.trim()) {
            try {
                const u = new URL(data.socialUrl.trim());
                if (!['http:', 'https:'].includes(u.protocol)) {
                    return { valid: false, error: 'La URL debe empezar con http:// o https://.' };
                }
            } catch (e) {
                return { valid: false, error: 'La URL de la red social no es válida.' };
            }
        }
        if (!data.termsAccepted) {
            return { valid: false, error: 'Debes aceptar los términos para continuar.' };
        }
        return { valid: true };
    }
};