/* =====================================================
   PIPGO · CATEGORY CONFIG
   Define unidades, condición y presentación por categoría.
   ===================================================== */

(function () {
    'use strict';

    const DEFAULT = {
        units: ['pza'],
        showCondition: false,
        conditions: [],
        showPresentation: false
    };

    const CONFIG = {
        'Frutas': {
            units: ['kg', 'g', 'pza', 'manojo', 'caja'],
            showCondition: false,
            conditions: [],
            showPresentation: true
        },
        'Verduras': {
            units: ['kg', 'g', 'pza', 'manojo', 'bolsa'],
            showCondition: false,
            conditions: [],
            showPresentation: true
        },
        'Antojitos': {
            units: ['pza', 'orden', 'docena'],
            showCondition: false,
            conditions: [],
            showPresentation: false
        },
        'Comida preparada': {
            units: ['orden', 'pza', 'servicio'],
            showCondition: false,
            conditions: [],
            showPresentation: false
        },
        'Bebidas': {
            units: ['lt', 'ml', 'pza', 'caja'],
            showCondition: false,
            conditions: [],
            showPresentation: true
        },
        'Postres': {
            units: ['pza', 'orden', 'docena'],
            showCondition: false,
            conditions: [],
            showPresentation: false
        },
        /* Helados: coherente con Postres/Panadería. Antes no existía
           entrada y caía en DEFAULT (solo "pza"), lo que dejaba la
           categoría inconsistente respecto a sus hermanas. */
        'Helados': {
            units: ['pza', 'orden', 'docena'],
            showCondition: false,
            conditions: [],
            showPresentation: false
        },
        'Panadería': {
            units: ['pza', 'docena', 'kg'],
            showCondition: false,
            conditions: [],
            showPresentation: true
        },
        'Carnes': {
            units: ['kg', 'g', 'pza'],
            showCondition: false,
            conditions: [],
            showPresentation: true
        },
        'Mariscos': {
            units: ['kg', 'g', 'pza'],
            showCondition: false,
            conditions: [],
            showPresentation: true
        },
        'Lácteos': {
            units: ['lt', 'ml', 'kg', 'pza'],
            showCondition: false,
            conditions: [],
            showPresentation: true
        },
        'Productos del campo': {
            units: ['kg', 'g', 'manojo', 'caja', 'bolsa'],
            showCondition: false,
            conditions: [],
            showPresentation: true
        },
        'Artesanías': {
            units: ['pza'],
            showCondition: true,
            conditions: ['new', 'used'],
            showPresentation: false
        },
        'Ropa y accesorios': {
            units: ['pza', 'docena'],
            showCondition: true,
            conditions: ['new', 'used', 'refurbished'],
            showPresentation: false
        },
        'Belleza y cuidado': {
            units: ['pza', 'ml', 'g'],
            showCondition: true,
            conditions: ['new', 'used'],
            showPresentation: true
        },
        'Hogar': {
            units: ['pza'],
            showCondition: true,
            conditions: ['new', 'used', 'refurbished'],
            showPresentation: false
        },
        'Electrónica': {
            units: ['pza'],
            showCondition: true,
            conditions: ['new', 'used', 'refurbished'],
            showPresentation: false
        },
        'Mascotas': {
            units: ['pza', 'kg', 'bolsa'],
            showCondition: false,
            conditions: [],
            showPresentation: true
        },
        'Servicios': {
            units: ['servicio', 'hora'],
            showCondition: false,
            conditions: [],
            showPresentation: false
        },
        'Juguetes': {
            units: ['pza'],
            showCondition: true,
            conditions: ['new', 'used'],
            showPresentation: false
        },
        'Otros': {
            units: ['pza', 'kg', 'lt'],
            showCondition: false,
            conditions: [],
            showPresentation: false
        }
    };

    const CONDITION_LABELS = {
        new: 'Nuevo',
        used: 'Usado',
        refurbished: 'Reacondicionado'
    };

    window.CategoryConfig = {
        get(category) {
            return CONFIG[category] || DEFAULT;
        },
        unitsFor(category) {
            const cfg = this.get(category);
            return window.UnitCatalog ? UnitCatalog.list(cfg.units) : [];
        },
        showsCondition(category) {
            return this.get(category).showCondition === true;
        },
        conditionsFor(category) {
            return this.get(category).conditions || [];
        },
        conditionLabel(code) {
            return CONDITION_LABELS[code] || code;
        },
        showsPresentation(category) {
            return this.get(category).showPresentation === true;
        }
    };
})();