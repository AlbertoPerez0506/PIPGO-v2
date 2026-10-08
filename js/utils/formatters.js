/* =====================================================
   PIPGO · FORMATTERS
   Formateo de texto, URLs, precios, tiempo, distancia
   y horarios. Funciones puras, sin side effects.
   ===================================================== */

window.Formatters = {

    escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    },

    /**
     * FIX: ahora permite blob: además de http/https.
     * Las vistas previas usan URL.createObjectURL() que
     * devuelve blob: — antes se bloqueaban silenciosamente.
     * Sigue rechazando javascript:, data:, file:, etc.
     */
    safeUrl(url) {
        if (!url) return '';
        try {
            const u = new URL(String(url), window.location.origin);
            const allowedProtocols = ['http:', 'https:', 'blob:'];
            if (allowedProtocols.includes(u.protocol)) return u.href;
        } catch (e) {}
        return '';
    },

    formatRelativeTime(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diff < 60) return 'hace un momento';
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
        return `hace ${Math.floor(diff / 86400)} días`;
    },

    formatPrice(value) {
        if (value == null || value === '') return '';
        let str = String(value).trim();
        str = str.replace(/^\$+/, '').trim();
        if (!str) return '';
        const num = parseFloat(str.replace(/,/g, ''));
        if (!isNaN(num) && /^[\d.,\s]+$/.test(str)) {
            return '$' + num.toLocaleString('es-MX', {
                minimumFractionDigits: num % 1 === 0 ? 0 : 2,
                maximumFractionDigits: 2
            });
        }
        return '$' + str;
    },

    formatPriceWithUnit(price, unitCode) {
        const base = this.formatPrice(price);
        if (!base) return '';
        const short = window.UnitCatalog ? UnitCatalog.short(unitCode) : '';
        if (!short) return base;
        return `${base} / ${short}`;
    },

    sanitizePriceInput(value) {
        return String(value || '').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    },

    calculateDistance(lat1, lon1, lat2, lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
        const R = 6371000;
        const toRad = (d) => d * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
    },

    formatDistance(meters) {
        if (meters == null || isNaN(meters)) return '';
        if (meters < 1000) return `${Math.round(meters)} m`;
        return `${(meters / 1000).toFixed(1)} km`;
    },

    formatScheduleCompact(schedule) {
        if (!schedule || !schedule.days || !schedule.days.length ||
            !schedule.start || !schedule.end) return '';

        const days = schedule.days.slice().sort((a, b) => a - b);
        const isWeekdays = days.length === 5 && days.every(d => d >= 1 && d <= 5);
        const isWeekend = days.length === 2 && days.includes(0) && days.includes(6);
        const isAll = days.length === 7;

        let daysLabel;
        if (isWeekdays) daysLabel = 'Lun–Vie';
        else if (isWeekend) daysLabel = 'Sáb–Dom';
        else if (isAll) daysLabel = 'Todos los días';
        else {
            const map = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' };
            daysLabel = days.map(d => map[d]).join(', ');
        }
        return `${daysLabel} · ${schedule.start}–${schedule.end}`;
    },

    formatScheduleFull(schedule) {
        if (!schedule || !schedule.days || !schedule.days.length ||
            !schedule.start || !schedule.end) return '';
        const map = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };
        const days = schedule.days.slice().sort((a, b) => a - b).map(d => map[d]);
        return `${days.join(', ')} · ${schedule.start} – ${schedule.end}`;
    }
};