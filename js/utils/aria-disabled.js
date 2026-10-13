/* =====================================================
   PIPGO · ARIA DISABLED UTILITY
   -----------------------------------------------------
   Reemplaza el uso de `el.disabled = true` por
   `aria-disabled="true"` en botones que deben seguir
   siendo focusables (mejor para screen readers, que
   anuncian "atenuado" pero mantienen el elemento en el
   orden de tabulación).

   - `AriaDisabled.set(el, true)`  → aplica aria-disabled
   - `AriaDisabled.set(el, false)` → lo quita
   - Bloquea el evento `click` en fase CAPTURE para que
     ningún handler se ejecute mientras esté deshabilitado.
   - Se integra con CSS existente:
       .btn-chat-v2[aria-disabled="true"] { ... }
     y con las nuevas reglas que añadiremos en components.css.

   Uso:
     AriaDisabled.set(btnSend, true);
     AriaDisabled.set(btnSend, false);
     AriaDisabled.isDisabled(btnSend); // true | false
   ===================================================== */

(function () {
    'use strict';

    const GUARD_KEY = '__ariaDisabledGuard';

    function isDisabled(el) {
        return !!el && el.getAttribute('aria-disabled') === 'true';
    }

    function set(el, disabled) {
        if (!el || el.nodeType !== 1) return;

        if (disabled) {
            el.setAttribute('aria-disabled', 'true');

            /* Instalamos el guard UNA SOLA VEZ por elemento */
            if (!el[GUARD_KEY]) {
                el[GUARD_KEY] = function (e) {
                    if (el.getAttribute('aria-disabled') === 'true') {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                    }
                };
                el.addEventListener('click', el[GUARD_KEY], true);
            }
        } else {
            el.removeAttribute('aria-disabled');
        }
    }

    function toggle(el, disabled) {
        set(el, disabled);
    }

    window.AriaDisabled = {
        set,
        toggle,
        isDisabled
    };
})();