/* =====================================================
   PIPGO · UNIT CATALOG
   Catálogo central de unidades de venta.
   ===================================================== */

(function () {
    'use strict';

    const UNITS = {
        pza:       { code: 'pza',       label: 'Pieza',        short: 'pza' },
        kg:        { code: 'kg',        label: 'Kilogramo',    short: 'kg' },
        g:         { code: 'g',         label: 'Gramo',        short: 'g' },
        lt:        { code: 'lt',        label: 'Litro',        short: 'L' },
        ml:        { code: 'ml',        label: 'Mililitro',    short: 'ml' },
        manojo:    { code: 'manojo',    label: 'Manojo',       short: 'manojo' },
        caja:      { code: 'caja',      label: 'Caja',         short: 'caja' },
        bolsa:     { code: 'bolsa',     label: 'Bolsa',        short: 'bolsa' },
        docena:    { code: 'docena',    label: 'Docena',       short: 'docena' },
        orden:     { code: 'orden',     label: 'Orden',        short: 'orden' },
        servicio:  { code: 'servicio',  label: 'Servicio',     short: 'servicio' },
        metro:     { code: 'metro',     label: 'Metro',        short: 'm' },
        hora:      { code: 'hora',      label: 'Hora',         short: 'h' }
    };

    window.UnitCatalog = {
        get(code) {
            return UNITS[code] || null;
        },
        short(code) {
            const u = UNITS[code];
            return u ? u.short : '';
        },
        label(code) {
            const u = UNITS[code];
            return u ? u.label : '';
        },
        list(codes) {
            return (codes || []).map(c => UNITS[c]).filter(Boolean);
        },
        all() {
            return Object.values(UNITS);
        }
    };
})();