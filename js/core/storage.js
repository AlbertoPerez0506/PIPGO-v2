/* =====================================================
   PIPGO · STORAGE SERVICE
   Envoltorio sobre localStorage. Centraliza lectura/escritura
   y evita acceso directo desde features.
   ===================================================== */

(function () {
    const PREFIX = 'pipgo.';

    window.Storage = {
        get(key, defaultValue = null) {
            try {
                const raw = localStorage.getItem(PREFIX + key);
                if (raw == null) return defaultValue;
                return JSON.parse(raw);
            } catch (e) {
                Logger.warn('Storage.get falló', key, e);
                return defaultValue;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(PREFIX + key, JSON.stringify(value));
                return true;
            } catch (e) {
                Logger.warn('Storage.set falló', key, e);
                return false;
            }
        },

        remove(key) {
            try { localStorage.removeItem(PREFIX + key); } catch (e) {}
        }
    };
})();