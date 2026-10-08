/* =====================================================
   PIPGO · CONFIRM DIALOG
   Modal de confirmación genérico (promesa).
   Reemplaza window.confirm en toda la app.
   -----------------------------------------------------
   PLAN C:
   - El listener de Escape usa capture:true y
     stopImmediatePropagation() para que NINGÚN otro
     handler (por ejemplo, el global de app.js que
     cierra overlays) reaccione al mismo ESC cuando
     el modal de confirmación está abierto.
   - Sin esto, un ESC con el confirm encima de un
     product sheet cerraba AMBAS cosas a la vez.
   ===================================================== */

(function () {
    'use strict';

    let modal, titleEl, textEl, okBtn, cancelBtn, closeBtn;
    let initialized = false;
    let currentResolve = null;

    function ensureInit() {
        if (initialized) return;
        modal     = document.getElementById('confirm-modal');
        titleEl   = document.getElementById('confirm-title');
        textEl    = document.getElementById('confirm-text');
        okBtn     = document.getElementById('confirm-ok');
        cancelBtn = document.getElementById('confirm-cancel');
        closeBtn  = document.getElementById('confirm-close');
        if (!modal) return;
        initialized = true;

        okBtn.addEventListener('click', () => resolve(true));
        cancelBtn.addEventListener('click', () => resolve(false));
        closeBtn.addEventListener('click', () => resolve(false));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) resolve(false);
        });

        // Capture + stopImmediatePropagation: garantiza que el ESC
        // se consuma aquí y no llegue al handler global de app.js.
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (!modal || modal.classList.contains('hidden')) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            resolve(false);
        }, true);
    }

    function resolve(value) {
        if (!currentResolve) return;
        modal.classList.add('hidden');
        const r = currentResolve;
        currentResolve = null;
        r(value);
    }

    /**
     * Abre un modal de confirmación.
     * @param {Object} opts
     * @param {string} opts.title
     * @param {string} opts.text
     * @param {string} [opts.okText='Confirmar']
     * @param {string} [opts.cancelText='Cancelar']
     * @param {boolean} [opts.danger=false]  // pinta el botón OK en rojo
     * @returns {Promise<boolean>}
     */
    function open(opts = {}) {
        ensureInit();
        if (!modal) return Promise.resolve(window.confirm(opts.text || ''));

        titleEl.textContent = opts.title || 'Confirmar';
        textEl.textContent  = opts.text || '';
        okBtn.textContent   = opts.okText || 'Confirmar';
        cancelBtn.textContent = opts.cancelText || 'Cancelar';

        okBtn.classList.toggle('btn-danger', !!opts.danger);
        okBtn.classList.toggle('btn-primary', !opts.danger);

        modal.classList.remove('hidden');
        setTimeout(() => okBtn.focus(), 30);

        return new Promise((resolveFn) => { currentResolve = resolveFn; });
    }

    window.ConfirmDialog = { open };
})();