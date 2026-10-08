/* =====================================================
   PIPGO · SELLER UI
   Modal de "Quiero vender" + formulario de solicitud.
   ===================================================== */

(function () {
    let modal, closeBtn, titleEl, bodyEl;
    let initialized = false;

    /* ---------------- helpers ---------------- */
    function el(html) {
        const t = document.createElement('template');
        t.innerHTML = html.trim();
        return t.content.firstElementChild;
    }

    async function open() {
        if (!AppState.currentUser) {
            AppState.pendingAction = { type: 'openSellerForm' };
            AuthUI.openAuthModal('login');
            return;
        }
        await renderByState();
        modal.classList.remove('hidden');
    }

    function close() { modal.classList.add('hidden'); }

    /* ---------------- estados ---------------- */
    async function renderByState() {
        const s = PermissionService.getSellerStatus();
        if (s === 'pending')        return renderPending();
        if (s === 'needs_info')     return await renderForm({ needsInfo: true });
        if (s === 'rejected')       return await renderForm({ rejected: true });
        if (s === 'suspended')      return renderSuspended();
        if (s === 'approved')       return renderApproved();
        return renderIntro();
    }

    function renderIntro() {
        titleEl.textContent = 'Vende en PipGo';
        bodyEl.innerHTML = `
            <div class="seller-intro">
                <div class="seller-intro-icon"><i class="fa-solid fa-store"></i></div>
                <p class="seller-intro-text">
                    Publica productos o promociona tu negocio dentro de PipGo.
                    Solo te pediremos datos básicos para verificar tu solicitud.
                </p>
                <ul class="seller-intro-list">
                    <li><i class="fa-solid fa-check"></i> Sin documentos oficiales</li>
                    <li><i class="fa-solid fa-check"></i> Sin datos bancarios</li>
                    <li><i class="fa-solid fa-check"></i> Revisión en 24-48h</li>
                </ul>
                <button class="btn-primary btn-large" id="seller-continue">
                    <i class="fa-solid fa-arrow-right"></i> Continuar
                </button>
            </div>`;
        bodyEl.querySelector('#seller-continue')
            .addEventListener('click', () => renderForm());
    }

    async function renderForm({ rejected = false, needsInfo = false, application = null } = {}) {
        titleEl.textContent = rejected ? 'Corregir solicitud'
                            : needsInfo ? 'Completar información'
                            : 'Solicitud de vendedor';

        // Cargar solicitud existente si no vino por parámetro
        let a = application;
        if (!a) {
            try {
                a = await SellerService.getApplication(AppState.currentUser.uid) || {};
            } catch (e) {
                a = {};
            }
        }

        const type = a.sellerType || 'person';
        const contact = a.contactMethod || 'phone';

        let bannerHtml = '';
        if (rejected) {
            bannerHtml = `
                <div class="seller-rejected">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <div>
                        <strong>Solicitud no aprobada</strong>
                        ${a.rejectionReason
                            ? `<p>${Formatters.escapeHtml(a.rejectionReason)}</p>`
                            : `<p>Corrige la información y vuelve a enviarla.</p>`}
                    </div>
                </div>`;
        } else if (needsInfo) {
            bannerHtml = `
                <div class="seller-rejected" style="background: var(--star-light); color: #92400E;">
                    <i class="fa-solid fa-circle-info"></i>
                    <div>
                        <strong>Información solicitada por administración</strong>
                        ${a.adminNote
                            ? `<p>${Formatters.escapeHtml(a.adminNote)}</p>`
                            : `<p>Corrige o completa tu información y vuelve a enviarla.</p>`}
                    </div>
                </div>`;
        }

        bodyEl.innerHTML = `
            ${bannerHtml}

            <div class="seller-form">
                <div class="input-group">
                    <label>Tipo de vendedor</label>
                    <div class="seller-type-toggle" id="seller-type-toggle">
                        <button type="button" data-type="person" class="${type==='person'?'active':''}">
                            <i class="fa-solid fa-user"></i> Persona
                        </button>
                        <button type="button" data-type="business" class="${type==='business'?'active':''}">
                            <i class="fa-solid fa-shop"></i> Negocio
                        </button>
                    </div>
                </div>

                <div class="input-group">
                    <label for="seller-display">Nombre público <span class="required">*</span></label>
                    <input type="text" id="seller-display" maxlength="100" value="${(a.displayName||'').replace(/"/g,'&quot;')}">
                </div>

                <div class="input-group hidden" id="seller-business-group">
                    <label for="seller-business">Nombre del negocio</label>
                    <input type="text" id="seller-business" maxlength="100" value="${(a.businessName||'').replace(/"/g,'&quot;')}">
                </div>

                <div class="input-group">
                    <label for="seller-category">Categoría principal <span class="required">*</span></label>
                    <input type="text" id="seller-category" maxlength="80" placeholder="Ej. Frutas y verduras" value="${(a.category||'').replace(/"/g,'&quot;')}">
                </div>

                <div class="input-group">
                    <label for="seller-desc">Descripción <span class="required">*</span></label>
                    <textarea id="seller-desc" rows="3" maxlength="1000" placeholder="Cuéntanos qué vendes y cómo lo haces.">${(a.description||'')}</textarea>
                </div>

                <div class="input-group">
                    <label for="seller-phone">Teléfono <span class="required">*</span></label>
                    <input type="tel" id="seller-phone" maxlength="30" value="${(a.phone||'').replace(/"/g,'&quot;')}">
                </div>

                <div class="input-group">
                    <label for="seller-city">Ciudad <span class="required">*</span></label>
                    <input type="text" id="seller-city" maxlength="80" value="${(a.city||'').replace(/"/g,'&quot;')}">
                </div>

                <div class="input-group">
                    <label for="seller-state">Estado <span class="required">*</span></label>
                    <input type="text" id="seller-state" maxlength="80" value="${(a.state||'').replace(/"/g,'&quot;')}">
                </div>

                <div class="input-group">
                    <label for="seller-social">Red social o sitio <span class="optional-tag">Opcional</span></label>
                    <input type="url" id="seller-social" maxlength="200" placeholder="https://..." value="${(a.socialUrl||'').replace(/"/g,'&quot;')}">
                </div>

                <div class="input-group">
                    <label>Método de contacto</label>
                    <div class="seller-type-toggle" id="seller-contact-toggle">
                        <button type="button" data-contact="phone" class="${contact==='phone'?'active':''}">
                            <i class="fa-solid fa-phone"></i> Llamada
                        </button>
                        <button type="button" data-contact="whatsapp" class="${contact==='whatsapp'?'active':''}">
                            <i class="fa-brands fa-whatsapp"></i> WhatsApp
                        </button>
                    </div>
                </div>

                <label class="seller-terms">
                    <input type="checkbox" id="seller-terms">
                    <span>Acepto los términos y confirmo que la información es verídica.</span>
                </label>

                <div class="form-error hidden" id="seller-error"></div>

                <button class="btn-primary btn-large" id="seller-submit">
                    <i class="fa-solid fa-paper-plane"></i> ${needsInfo || rejected ? 'Reenviar solicitud' : 'Enviar solicitud'}
                </button>
            </div>`;

        // toggles
        const typeToggle = bodyEl.querySelector('#seller-type-toggle');
        const businessGroup = bodyEl.querySelector('#seller-business-group');
        const updateBusinessVisibility = () => {
            const active = typeToggle.querySelector('.active');
            businessGroup.classList.toggle('hidden', active?.dataset.type !== 'business');
        };
        typeToggle.addEventListener('click', (e) => {
            const b = e.target.closest('button[data-type]');
            if (!b) return;
            typeToggle.querySelectorAll('button').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            updateBusinessVisibility();
        });
        updateBusinessVisibility();

        const contactToggle = bodyEl.querySelector('#seller-contact-toggle');
        contactToggle.addEventListener('click', (e) => {
            const b = e.target.closest('button[data-contact]');
            if (!b) return;
            contactToggle.querySelectorAll('button').forEach(x => x.classList.remove('active'));
            b.classList.add('active');
        });

        bodyEl.querySelector('#seller-submit')
            .addEventListener('click', submitForm);
    }

    async function submitForm() {
        const errEl = bodyEl.querySelector('#seller-error');
        const showErr = (m) => { errEl.textContent = m; errEl.classList.remove('hidden'); };
        errEl.classList.add('hidden');

        const type = bodyEl.querySelector('#seller-type-toggle .active')?.dataset.type || 'person';
        const contact = bodyEl.querySelector('#seller-contact-toggle .active')?.dataset.contact || 'phone';

        const payload = {
            sellerType:    type,
            displayName:   bodyEl.querySelector('#seller-display').value.trim(),
            businessName:  bodyEl.querySelector('#seller-business').value.trim(),
            category:      bodyEl.querySelector('#seller-category').value.trim(),
            description:   bodyEl.querySelector('#seller-desc').value.trim(),
            phone:         bodyEl.querySelector('#seller-phone').value.trim(),
            city:          bodyEl.querySelector('#seller-city').value.trim(),
            state:         bodyEl.querySelector('#seller-state').value.trim(),
            socialUrl:     bodyEl.querySelector('#seller-social').value.trim(),
            contactMethod: contact
        };

        const validation = Validators.validateSellerApplication({
            ...payload,
            termsAccepted: bodyEl.querySelector('#seller-terms').checked
        });
        if (!validation.valid) return showErr(validation.error);

        const btn = bodyEl.querySelector('#seller-submit');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando…';

        try {
            await SellerService.submitApplication(payload);
            Toast.success('Solicitud enviada. Te avisaremos pronto.');
            close();
            if (AppState.currentView === 'perfil') ProfileUI.renderProfile();
            if (AppState.currentView === 'anunciarme') PublicationUI.updateAuthUI();
        } catch (error) {
            const msg = ErrorHandler.toUserMessage(error, { context: 'seller.submit' });
            showErr(msg);
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar solicitud';
        }
    }

    function renderPending() {
        titleEl.textContent = 'Solicitud en revisión';
        bodyEl.innerHTML = `
            <div class="seller-status-view pending">
                <div class="seller-status-icon"><i class="fa-solid fa-hourglass-half"></i></div>
                <h4>Tu solicitud está en revisión</h4>
                <p>Mientras tanto puedes seguir usando PipGo como usuario normal.</p>
                <button class="btn-outline btn-large" id="seller-close-view">Entendido</button>
            </div>`;
        bodyEl.querySelector('#seller-close-view').addEventListener('click', close);
    }

    function renderApproved() {
        titleEl.textContent = 'Panel de vendedor';
        bodyEl.innerHTML = `
            <div class="seller-status-view approved">
                <div class="seller-status-icon"><i class="fa-solid fa-circle-check"></i></div>
                <h4>¡Eres vendedor aprobado!</h4>
                <p>Ya puedes crear y administrar tus publicaciones.</p>
                <button class="btn-primary btn-large" id="seller-new-pub">
                    <i class="fa-solid fa-plus"></i> Nueva publicación
                </button>
            </div>`;
        bodyEl.querySelector('#seller-new-pub').addEventListener('click', () => {
            close();
            NavigationUI.switchView('anunciarme');
        });
    }

    function renderSuspended() {
        titleEl.textContent = 'Cuenta suspendida';
        bodyEl.innerHTML = `
            <div class="seller-status-view suspended">
                <div class="seller-status-icon"><i class="fa-solid fa-ban"></i></div>
                <h4>Vendedor suspendido temporalmente</h4>
                <p>Puedes seguir usando PipGo como usuario normal. Contacta a soporte si crees que es un error.</p>
                <button class="btn-outline btn-large" id="seller-close-view">Cerrar</button>
            </div>`;
        bodyEl.querySelector('#seller-close-view').addEventListener('click', close);
    }

    /* ---------------- init ---------------- */
    function init() {
        if (initialized) return;
        initialized = true;
        modal   = document.getElementById('seller-modal');
        closeBtn= document.getElementById('seller-close');
        titleEl = document.getElementById('seller-modal-title');
        bodyEl  = document.getElementById('seller-modal-body');

        closeBtn.addEventListener('click', close);
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    }

    window.SellerUI = {
        init,
        open,
        close,
        openApplicationForm: () => { open(); }
    };
})();