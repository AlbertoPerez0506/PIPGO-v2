/* =====================================================
   PIPGO · FOCUS TRAP UTILITY
   -----------------------------------------------------
   Atrapa el foco dentro de un modal abierto.
   - Tab / Shift+Tab ciclan entre los elementos focusables.
   - Al abrir: guarda el elemento activo previo y mueve el
     foco al primer focusable (o al indicado por el caller).
   - Al cerrar: restaura el foco al elemento activo previo.
   - Aplica `inert` a #main-content y .bottom-nav mientras
     hay al menos un modal abierto (accesibilidad + evita
     que Tab escape al fondo).
   - Soporta modales anidados (count > 0 → inert).
   -----------------------------------------------------
   Uso:
     FocusTrap.activate(modalEl);
     FocusTrap.activate(modalEl, initialFocusEl); // opcional
     FocusTrap.deactivate(modalEl);
   ===================================================== */

(function () {
    'use strict';

    /* Elementos que pueden recibir foco */
    const FOCUSABLE_SELECTOR = [
        'a[href]',
        'area[href]',
        'button:not([disabled]):not([aria-disabled="true"])',
        'input:not([disabled]):not([type="hidden"]):not([aria-disabled="true"])',
        'select:not([disabled]):not([aria-disabled="true"])',
        'textarea:not([disabled]):not([aria-disabled="true"])',
        'iframe',
        'object',
        'embed',
        '[contenteditable]:not([contenteditable="false"])',
        '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    /* Estado por modal → { prevActive, onKeydown } */
    const states = new WeakMap();

    /* Conteo global de modales abiertos → manejo de `inert` */
    let openCount = 0;

    /* -------------------------------------------------
       INERT EN EL FONDO
       ------------------------------------------------- */
    function _applyInert() {
        const main = document.getElementById('main-content');
        const nav  = document.querySelector('.bottom-nav');
        if (main) {
            try { main.inert = true; } catch (e) { main.setAttribute('inert', ''); }
        }
        if (nav) {
            try { nav.inert = true; } catch (e) { nav.setAttribute('inert', ''); }
        }
    }

    function _removeInert() {
        const main = document.getElementById('main-content');
        const nav  = document.querySelector('.bottom-nav');
        if (main) {
            try { main.inert = false; } catch (e) { main.removeAttribute('inert'); }
        }
        if (nav) {
            try { nav.inert = false; } catch (e) { nav.removeAttribute('inert'); }
        }
    }

    function _bumpInert(delta) {
        openCount = Math.max(0, openCount + delta);
        if (openCount > 0) _applyInert();
        else               _removeInert();
    }

    /* -------------------------------------------------
       FOCUSABLES
       ------------------------------------------------- */
    function _getFocusables(root) {
        if (!root) return [];
        const list = root.querySelectorAll(FOCUSABLE_SELECTOR);
        return Array.from(list).filter(el => {
            if (el.hasAttribute('hidden')) return false;
            if (el.getAttribute('aria-hidden') === 'true') return false;
            if (el.disabled) return false;
            if (el.getAttribute('aria-disabled') === 'true') return false;
            /* offsetParent null → oculto (display:none, visibility:hidden, etc.)
               excepto si es position:fixed (algunos navegadores devuelven null) */
            if (el.offsetParent === null) {
                const pos = getComputedStyle(el).position;
                if (pos !== 'fixed') return false;
            }
            return true;
        });
    }

    /* -------------------------------------------------
       HANDLER DE TAB
       ------------------------------------------------- */
    function _onKeydown(e) {
        if (e.key !== 'Tab') return;

        const state = states.get(e.currentTarget);
        if (!state) return;

        const focusables = _getFocusables(state.root);
        if (!focusables.length) {
            e.preventDefault();
            return;
        }

        const first  = focusables[0];
        const last   = focusables[focusables.length - 1];
        const active = document.activeElement;
        const inRoot = state.root.contains(active);

        if (e.shiftKey) {
            if (!inRoot || active === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (!inRoot || active === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    /* -------------------------------------------------
       API PÚBLICA
       ------------------------------------------------- */
    function activate(root, initialFocus) {
        if (!root) return;
        if (states.has(root)) return; // ya activo

        const prevActive = document.activeElement;

        const state = {
            root,
            prevActive,
            onKeydown: _onKeydown
        };

        states.set(root, state);

        /* Listener de teclado en el modal */
        root.addEventListener('keydown', state.onKeydown);

        /* Mover el foco adentro (post-render para layout) */
        requestAnimationFrame(() => {
            if (!states.has(root)) return; // fue cerrado muy rápido
            let target = initialFocus;
            if (!target || !root.contains(target)) {
                const focusables = _getFocusables(root);
                target = focusables[0];
            }
            if (target && typeof target.focus === 'function') {
                try { target.focus(); } catch (e) {}
            } else {
                /* Fallback: dar foco al modal mismo */
                if (!root.hasAttribute('tabindex')) {
                    root.setAttribute('tabindex', '-1');
                }
                try { root.focus(); } catch (e) {}
            }
        });

        _bumpInert(+1);
    }

    function deactivate(root) {
        if (!root) return;
        const state = states.get(root);
        if (!state) return;

        states.delete(root);
        root.removeEventListener('keydown', state.onKeydown);

        _bumpInert(-1);

        /* Restaurar foco previo si sigue existiendo en el DOM */
        const prev = state.prevActive;
        if (prev && document.body.contains(prev) && typeof prev.focus === 'function') {
            try { prev.focus({ preventScroll: true }); } catch (e) {}
        }
    }

    function isActive(root) {
        return !!root && states.has(root);
    }

    function hasOpenModals() {
        return openCount > 0;
    }

    window.FocusTrap = {
        activate,
        deactivate,
        isActive,
        hasOpenModals
    };
})();