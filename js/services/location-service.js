/* =====================================================
   PIPGO · LOCATION SERVICE
   -----------------------------------------------------
   v2.3 — Migración legacy + ciudad "viva".

   Novedades v2.3:
   - _migrateLegacyCityIfNeeded(): convierte el formato
     antiguo (user_city: string) al nuevo
     (user_city_cache: {city, at}) en la primera lectura,
     y BORRA la clave legacy. La entrada migrada se marca
     como stale (at: 0) para que app.js dispare un refresh
     silencioso en background.
   - _saveCityToStorage() ya NO escribe la clave legacy:
     solo user_city_cache. La migración se encarga de
     limpiar el resto.
   - _getStoredCityEntry() solo lee el formato nuevo
     (post-migración). Código más simple y sin ramas
     defensivas redundantes.

   Heredado de v2.2:
   - getCachedCity({ allowStale }) con TTL de 30 min.
   - silentAutoRefreshCity() solo corre si el permiso
     de ubicación ya está concedido.
   - Cache en memoria de reverse geocode (10 min).
   - Retry con backoff contra Nominatim.
   - Cache de última posición (45 s).
   - getPermissionState(), formatAccuracy(meters).
   - Timeouts por llamada, Nominatim identificada.
   ===================================================== */

(function () {
    'use strict';

    /* ============================================================
       CONFIGURACIÓN LOCAL
       ============================================================ */
    const LOC = {
        NOMINATIM_ENDPOINT: 'https://nominatim.openstreetmap.org/reverse',
        NOMINATIM_APP_ID:   'pipgo.app',
        NOMINATIM_CONTACT:  'contacto@pipgo.mx',
        NOMINATIM_LANGUAGE: 'es',

        GEO_TIMEOUT_MS:        12000,
        REVERSE_TIMEOUT_MS:     7000,
        REVERSE_RETRY_MS:        900,
        REVERSE_RETRIES:           1,

        GEO_CACHE_TTL_MS:       10 * 60 * 1000, // reverse geocode
        POSITION_CACHE_TTL_MS:         45 * 1000, // última posición
        CITY_STORAGE_TTL_MS:     30 * 60 * 1000, // ciudad persistida

        // Fuente única de verdad (formato nuevo, con TTL).
        CITY_STORAGE_KEY:       'user_city_cache',

        // Clave legacy que existía en versiones anteriores. Solo
        // se lee UNA VEZ para migrarla y luego se elimina. Nunca
        // se escribe en esta versión.
        CITY_LEGACY_KEY:        'user_city',

        HIGH_ACCURACY: true,
        MAX_AGE_MS:       60 * 1000
    };

    /* ============================================================
       CACHE EN MEMORIA
       ============================================================ */
    const reverseCache = new Map(); // key: "lat,lon" → { data, at }
    let lastPosition = null;        // { position, at }

    function _rkey(lat, lon) {
        return `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
    }

    function _isFresh(entry, ttl) {
        return !!(entry && (Date.now() - entry.at) < ttl);
    }

    /* ============================================================
       HELPERS
       ============================================================ */
    function _geolocationError(error) {
        const messages = {
            1: 'Permiso de ubicación denegado. Actívalo en los ajustes del sistema.',
            2: 'No pudimos obtener tu ubicación. Verifica que el GPS esté activo.',
            3: 'El GPS tardó demasiado en responder. Inténtalo de nuevo.'
        };
        const msg = messages[error.code] || error.message || 'No pudimos obtener tu ubicación.';
        const err = new Error(msg);
        err.code = error.code;
        return err;
    }

    function _buildShortAddress(addr) {
        if (!addr) return '';
        const parts = [];
        if (addr.road) {
            const road = addr.house_number
                ? `${addr.road} ${addr.house_number}`
                : addr.road;
            parts.push(road);
        }
        if (addr.suburb || addr.neighbourhood) {
            parts.push(addr.suburb || addr.neighbourhood);
        }
        const city = addr.city || addr.town || addr.village;
        if (city) parts.push(city);
        return parts.filter(Boolean).join(', ');
    }

    function _extractCity(addr) {
        if (!addr) return '';
        return addr.city || addr.town || addr.village
            || addr.municipality || addr.county
            || addr.state_district || addr.state || '';
    }

    /* ============================================================
       PERMISOS
       ============================================================ */
    async function getPermissionState() {
        if (!navigator.permissions || !navigator.permissions.query) {
            return 'unknown';
        }
        try {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            return result.state; // 'granted' | 'denied' | 'prompt'
        } catch (e) {
            return 'unknown';
        }
    }

    /* ============================================================
       POSICIÓN
       ============================================================ */
    function _positionPromise(options) {
        const {
            timeout = LOC.GEO_TIMEOUT_MS,
            highAccuracy = LOC.HIGH_ACCURACY,
            maxAge = LOC.MAX_AGE_MS
        } = options;

        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Tu dispositivo no soporta geolocalización.'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => resolve({
                    latitude:  position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy:  position.coords.accuracy,
                    altitude:  position.coords.altitude,
                    heading:   position.coords.heading,
                    speed:     position.coords.speed,
                    timestamp: position.timestamp
                }),
                (error) => reject(_geolocationError(error)),
                { enableHighAccuracy: highAccuracy, timeout, maximumAge: maxAge }
            );
        });
    }

    async function getCurrentPosition(options = {}) {
        const {
            silent = false,
            useCache = false,
            cacheTtl = LOC.POSITION_CACHE_TTL_MS
        } = options;

        if (useCache && _isFresh(lastPosition, cacheTtl)) {
            return lastPosition.position;
        }

        try {
            const position = await _positionPromise(options);
            lastPosition = { position, at: Date.now() };
            return position;
        } catch (err) {
            if (!silent) Logger.warn('Geolocation error', err.message);
            throw err;
        }
    }

    /* ============================================================
       REVERSE GEOCODING (Nominatim) CON CACHE Y RETRY
       ============================================================ */
    async function _nominatimFetch(lat, lon, timeoutMs) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const params = new URLSearchParams({
            format: 'jsonv2',
            lat: String(lat),
            lon: String(lon),
            'accept-language': LOC.NOMINATIM_LANGUAGE,
            email: LOC.NOMINATIM_CONTACT,
            app: LOC.NOMINATIM_APP_ID,
            addressdetails: '1'
        });

        const url = `${LOC.NOMINATIM_ENDPOINT}?${params.toString()}`;

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) {
                throw new Error(`Nominatim HTTP ${response.status}`);
            }
            return await response.json();
        } finally {
            clearTimeout(timeout);
        }
    }

    function _normalizeNominatim(data) {
        if (!data || !data.address) return null;
        const addr = data.address;
        return {
            address:      data.display_name || '',
            shortAddress: _buildShortAddress(addr),
            city:         _extractCity(addr),
            town:         addr.town || '',
            village:      addr.village || '',
            suburb:       addr.suburb || addr.neighbourhood || '',
            road:         addr.road || '',
            state:        addr.state || '',
            country:      addr.country || '',
            postcode:     addr.postcode || '',
            raw:          addr
        };
    }

    async function reverseGeocode(lat, lon, { force = false } = {}) {
        if (lat == null || lon == null) return null;

        const key = _rkey(lat, lon);
        const cached = reverseCache.get(key);
        if (!force && _isFresh(cached, LOC.GEO_CACHE_TTL_MS)) {
            return cached.data;
        }

        const retries = LOC.REVERSE_RETRIES;
        let lastErr = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const data = await _nominatimFetch(lat, lon, LOC.REVERSE_TIMEOUT_MS);
                const normalized = _normalizeNominatim(data);
                reverseCache.set(key, { data: normalized, at: Date.now() });
                return normalized;
            } catch (err) {
                lastErr = err;
                if (attempt < retries) {
                    await new Promise(r => setTimeout(r, LOC.REVERSE_RETRY_MS));
                }
            }
        }

        Logger.warn('Reverse geocoding falló tras reintentos', lastErr && lastErr.message);
        // Cacheamos el fallo por un rato para no spamear a Nominatim.
        reverseCache.set(key, { data: null, at: Date.now() });
        return null;
    }

    /* ============================================================
       CIUDAD (persistida en Storage)
       ------------------------------------------------------------
       Formato ÚNICO (v2.3):

         user_city_cache = { city: "Villahermosa", at: 1730000000000 }

       Compatibilidad: si en el dispositivo existe la clave legacy
       `user_city` (string suelto), se migra UNA VEZ a este formato
       con at=0 (marcada como stale → refresh silencioso en
       background) y se borra la clave legacy.

       Nunca más se escribe `user_city`.
       ============================================================ */

    /**
     * Migración one-shot: legacy → nuevo formato.
     *
     * - Solo actúa si NO existe todavía `user_city_cache`.
     * - Copia el valor legacy a `user_city_cache` con at: 0,
     *   lo que lo marca como "stale" (dato viejo pero válido)
     *   para que app.js dispare silentAutoRefreshCity().
     * - Elimina la clave legacy para no volver a migrar.
     */
    function _migrateLegacyCityIfNeeded() {
        // Ya hay cache nuevo → nada que migrar.
        const existing = Storage.get(LOC.CITY_STORAGE_KEY, null);
        if (existing && typeof existing === 'object'
            && typeof existing.city === 'string'
            && typeof existing.at === 'number') {
            return;
        }

        // ¿Hay algo legacy que rescatar?
        const legacy = Storage.get(LOC.CITY_LEGACY_KEY, null);
        if (typeof legacy !== 'string' || !legacy) return;

        // Migrar: nuevo formato, marcado stale (at: 0) para que
        // app.js refresque en background sin parpadear la UI.
        Storage.set(LOC.CITY_STORAGE_KEY, { city: legacy, at: 0 });

        // Limpiar la clave legacy. A partir de aquí solo existe
        // user_city_cache.
        Storage.remove(LOC.CITY_LEGACY_KEY);

        Logger.info('LocationService: ciudad legacy migrada', { city: legacy });
    }

    /**
     * Guarda la ciudad SOLO en el formato nuevo. La clave legacy
     * ya no se escribe nunca.
     */
    function _saveCityToStorage(city) {
        if (!city) return;
        Storage.set(LOC.CITY_STORAGE_KEY, { city, at: Date.now() });
    }

    /**
     * Lee la entrada de ciudad post-migración.
     * Solo lee `user_city_cache`. Si no existe, devuelve null.
     */
    function _getStoredCityEntry() {
        _migrateLegacyCityIfNeeded();

        const entry = Storage.get(LOC.CITY_STORAGE_KEY, null);
        if (entry && typeof entry === 'object'
            && typeof entry.city === 'string'
            && typeof entry.at === 'number') {
            return entry;
        }
        return null;
    }

    /**
     * Devuelve la ciudad cacheada con metadata de frescura.
     *
     * @param {Object}  [opts]
     * @param {boolean} [opts.allowStale=false]  Si true, devuelve también
     *   ciudades expiradas (marcadas como isFresh:false). app.js lo usa
     *   para mostrar el valor viejo mientras refresca en background.
     * @returns {null | { city: string, isFresh: boolean, age: number }}
     */
    function getCachedCity({ allowStale = false } = {}) {
        const entry = _getStoredCityEntry();
        if (!entry) return null;

        const age = Date.now() - entry.at;
        const isFresh = entry.at > 0 && age <= LOC.CITY_STORAGE_TTL_MS;

        if (!isFresh && !allowStale) return null;

        return { city: entry.city, isFresh, age };
    }

    async function detectUserCity({ useStorageCache = true } = {}) {
        // 1) Cache fresco → instantáneo.
        if (useStorageCache) {
            const entry = _getStoredCityEntry();
            if (entry && entry.at > 0
                && (Date.now() - entry.at) <= LOC.CITY_STORAGE_TTL_MS) {
                return { cityName: entry.city, from: 'storage', isFresh: true };
            }
        }

        // 2) Posición (con cache en memoria para no pedir GPS dos veces).
        let position;
        try {
            position = await getCurrentPosition({ silent: true, useCache: true });
        } catch (err) {
            return { cityName: null, error: err };
        }

        // 3) Guardar coords para distancias.
        AppState.userCoords = {
            latitude:  position.latitude,
            longitude: position.longitude
        };

        // 4) Reverse geocode (con cache).
        const geo = await reverseGeocode(position.latitude, position.longitude);
        const cityName = geo && geo.city ? geo.city : null;

        if (cityName) _saveCityToStorage(cityName);

        return { position, geo, cityName, from: 'fresh' };
    }

    /* ============================================================
       UBICACIÓN COMPLETA (para publicar)
       ============================================================ */
    async function fetchFullLocation({ allowCachedPosition = true } = {}) {
        const position = await getCurrentPosition({
            silent: false,
            useCache: allowCachedPosition,
            cacheTtl: 30 * 1000
        });

        AppState.userCoords = {
            latitude:  position.latitude,
            longitude: position.longitude
        };

        let geo = null;
        try {
            geo = await reverseGeocode(position.latitude, position.longitude);
        } catch (e) { /* noop */ }

        return {
            latitude:  position.latitude,
            longitude: position.longitude,
            accuracy:  position.accuracy,
            address:      (geo && geo.address)      || '',
            shortAddress: (geo && geo.shortAddress) || '',
            city:         (geo && geo.city)         || '',
            state:        (geo && geo.state)        || '',
            country:      (geo && geo.country)      || ''
        };
    }

    /* ============================================================
       UTILIDADES
       ============================================================ */
    function formatAccuracy(meters) {
        if (meters == null || isNaN(meters)) return '';
        if (meters < 30)  return 'Alta precisión';
        if (meters < 100) return 'Buena precisión';
        if (meters < 500) return 'Precisión media';
        return 'Precisión baja';
    }

    function clearCache() {
        reverseCache.clear();
        lastPosition = null;
        // Nota: el cache de ciudad en Storage lo limpia app.js
        // al hacer logout (Storage.remove('user_city_cache')).
        // La clave legacy `user_city` ya no se usa en v2.3.
    }

    /* ============================================================
       API PÚBLICA
       ============================================================ */
    window.LocationService = {
        getPermissionState,
        getCurrentPosition,
        reverseGeocode,
        detectUserCity,
        fetchFullLocation,
        getCachedCity,
        formatAccuracy,
        clearCache,
        _buildShortAddress
    };
})();