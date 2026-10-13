/* =====================================================
   PIPGO · CONFIRM DIALOG
   Modal de confirmación genérico (promesa).
   -----------------------------------------------------
   v3.3 (Ronda 5 fixes):
   - BodyLock.acquire/release. El modal ahora bloquea el
     scroll del body, consistente con el resto de modales.
     (Antes no lo hacía: dejaba el body scrollable por
     detrás del backdrop en desktop.)
   - Handler ESC capture: si hay un modal de MAYOR
     z-index abierto (chat-edit-modal), no consumir.
   - Heredado v3.2: FocusTrap con foco inicial en OK.
   - Heredado PLAN C: ESC en capture + stopImmediate.
   ===================================================== */

(function () {
    'use strict';

    let modal, titleEl, textEl, okBtn, cancelBtn, closeBtn;
    let initialized = false;
    let currentResolve = null;

    /* ---------- body lock helpers (Ronda 5) ---------- */
    function _lockBody() {
        if (window.BodyLock) BodyLock.acquire();
        else document.body.style.overflow = 'hidden';
    }
    function _unlockBody() {
        if (window.BodyLock) BodyLock.release();
        else document.body.style.overflow = '';
    }

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

        /* Ronda 5: ESC en capture. Antes de consumir,
           comprobamos si hay un modal superior (chat-edit). */
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (!modal || modal.classList.contains('hidden')) return;

            const editModal = document.getElementById('chat-edit-modal');
            if (editModal && !editModal.classList.contains('hidden')) return;

            e.preventDefault();
            e.stopImmediatePropagation();
            resolve(false);
        }, true);
    }

    function resolve(value) {
        if (!currentResolve) return;
        modal.classList.add('hidden');

        _unlockBody();  /* Ronda 5 */

        if (window.FocusTrap) FocusTrap.deactivate(modal);

        const r = currentResolve;
        currentResolve = null;
        r(value);
    }

    function open(opts = {}) {
        ensureInit();
        if (!modal) return Promise.resolve(window.confirm(opts.text || ''));

        titleEl.textContent    = opts.title || 'Confirmar';
        textEl.textContent     = opts.text  || '';
        okBtn.textContent      = opts.okText || 'Confirmar';
        cancelBtn.textContent  = opts.cancelText || 'Cancelar';

        okBtn.classList.toggle('btn-danger', !!opts.danger);
        okBtn.classList.toggle('btn-primary', !opts.danger);

        modal.classList.remove('hidden');

        /* Ronda 5: BodyLock.acquire() */
        _lockBody();

        if (window.FocusTrap) FocusTrap.activate(modal, okBtn);

        return new Promise((resolveFn) => { currentResolve = resolveFn; });
    }

    window.ConfirmDialog = { open };
})();