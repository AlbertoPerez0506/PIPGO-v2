/* =====================================================
   PIPGO · LOCATION SERVICE
   Geolocalización + reverse geocoding (Nominatim).
   Fuente única de verdad para ubicación del usuario.
   ===================================================== */

window.LocationService = {

    /* =================================================
       Obtener posición actual (Promise)
       ================================================= */
    getCurrentPosition(options = {}) {
        const { silent = false } = options;
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Tu dispositivo no soporta geolocalización.'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                }),
                (error) => {
                    const msg = this.getGeolocationErrorMessage(error);
                    const err = new Error(msg);
                    err.code = error.code;
                    if (!silent) Logger.warn('Geolocation error', msg);
                    reject(err);
                },
                { enableHighAccuracy: true, timeout: CONFIG.GEO_TIMEOUT_MS, maximumAge: 60000 }
            );
        });
    },

    /* Traduce códigos de error del navegador a mensajes claros */
    getGeolocationErrorMessage(error) {
        switch (error.code) {
            case 1: return 'Permiso de ubicación denegado. Actívalo en los ajustes del sistema.';
            case 2: return 'No pudimos obtener tu ubicación actual. Verifica que el GPS esté activo.';
            case 3: return 'El GPS tardó demasiado en responder. Inténtalo de nuevo.';
            default: return error.message || 'No pudimos obtener tu ubicación.';
        }
    },

    /* =================================================
       Reverse geocoding (Nominatim)
       Devuelve objeto enriquecido o null si falla.
       ================================================= */
    async reverseGeocode(lat, lon) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), CONFIG.REVERSE_GEO_TIMEOUT_MS);

            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=es`;
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeout);

            if (!response.ok) return null;
            const data = await response.json();
            if (data && data.address) {
                const addr = data.address;
                const cityName =
                    addr.city || addr.town || addr.village ||
                    addr.municipality || addr.county ||
                    addr.state_district || addr.state || '';
                return {
                    address: data.display_name || '',
                    shortAddress: this._buildShortAddress(addr),
                    city: cityName,
                    town: addr.town || '',
                    village: addr.village || '',
                    state: addr.state || '',
                    country: addr.country || '',
                    postcode: addr.postcode || '',
                    raw: addr
                };
            }
            return null;
        } catch (error) {
            Logger.warn('Reverse geocoding falló', error);
            return null;
        }
    },

    /* Dirección corta a partir de componentes Nominatim */
    _buildShortAddress(addr) {
        const parts = [];
        if (addr.road) parts.push(addr.road);
        if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
        if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
        return parts.filter(Boolean).join(', ');
    },

    /* =================================================
       Detectar ciudad del header
       Guarda coords del usuario en AppState para distancias.
       ================================================= */
    async detectUserCity() {
        const position = await this.getCurrentPosition({ silent: true });
        const geo = await this.reverseGeocode(position.latitude, position.longitude);
        const cityName = geo && geo.city ? geo.city : null;

        // Guardar coords del usuario para cálculos de distancia
        AppState.userCoords = {
            latitude: position.latitude,
            longitude: position.longitude
        };

        return { position, geo, cityName };
    },

    /* =================================================
       fetchFullLocation — fuente única de verdad
       Usada por "Usar mi ubicación" y por el submit.
       Devuelve ubicación completa lista para publicar.
       ================================================= */
    async fetchFullLocation() {
        const position = await this.getCurrentPosition();

        // Reverse geocoding es opcional: si falla, seguimos con coords
        let geo = null;
        try {
            geo = await this.reverseGeocode(position.latitude, position.longitude);
        } catch (e) { /* noop */ }

        // Actualizar coords del usuario (para distancias en cards)
        AppState.userCoords = {
            latitude: position.latitude,
            longitude: position.longitude
        };

        return {
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy: position.accuracy,
            address: (geo && geo.address) || '',
            shortAddress: (geo && geo.shortAddress) || '',
            city: (geo && geo.city) || '',
            state: (geo && geo.state) || '',
            country: (geo && geo.country) || ''
        };
    }
};