/* =====================================================
   PIPGO · CONFIRM DIALOG
   Modal de confirmación genérico (promesa).
   -----------------------------------------------------
   v3.4 (Ronda 5 fixes):
   - Eliminado el chequeo de `chat-edit-modal` en el ESC.
     Estaba invertido: el edit-modal vive DENTRO de
     chat-overlay (z-chat 250) y su z-edit-modal solo
     compite dentro de ese stacking context. Es decir,
     ConfirmDialog (z-modal 500) SIEMPRE está por encima
     del edit-modal. Diferir el ESC al edit-modal era
     incorrecto.

     Ahora ConfirmDialog consume el ESC siempre que esté
     abierto. Si el edit-modal está también abierto, el
     ESC cierra el confirm (que es lo correcto por
     z-index).

   - BodyLock.acquire/release.
   - FocusTrap con foco inicial en OK.
   - ESC en capture + stopImmediate.
   ===================================================== */

(function () {
    'use strict';

    let modal, titleEl, textEl, okBtn, cancelBtn, closeBtn;
    let initialized = false;
    let currentResolve = null;

    /* ---------- body lock helpers ---------- */
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

        /* ESC en capture. ConfirmDialog vive a z-modal (500),
           por encima de chat (250), sheet (100), lightbox (300),
           seller-profile (260) y edit-modal (250 efectivo).
           Nada por debajo tiene prioridad sobre el ESC. */
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

        _unlockBody();

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

        _lockBody();

        if (window.FocusTrap) FocusTrap.activate(modal, okBtn);

        return new Promise((resolveFn) => { currentResolve = resolveFn; });
    }

    window.ConfirmDialog = { open };
})();