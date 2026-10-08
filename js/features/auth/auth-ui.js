/* =====================================================
   PIPGO · AUTH UI
   Login + Registro + Recuperar contraseña.
   Incluye aceptación legal obligatoria en el registro.
   ===================================================== */

(function () {
    let authModal, loginForm, registerForm, recoverView;
    let authTabsWrap, authTabs, authError, authSuccess, authClose;
    let heroIcon, heroTitle, heroSubtitle;
    let btnForgotPassword, btnBackToLogin, btnSubmitRecover;
    let loginEmailInput, loginPasswordInput;
    let loginSubmitBtn, registerSubmitBtn;
    let registerUsernameInput, registerEmailInput, registerPasswordInput;
    let registerAcceptLegal, registerLegalWrap;
    let recoverEmailInput;
    let initialized = false;

    /* ---------- UI helpers ---------- */
    function setHeroVariant(variant) {
        heroIcon.classList.remove('variant-register', 'variant-recover');
        if (variant === 'register') heroIcon.classList.add('variant-register');
        else if (variant === 'recover') heroIcon.classList.add('variant-recover');

        if (variant === 'login') {
            heroIcon.innerHTML = '<i class="fa-solid fa-store"></i>';
            heroTitle.textContent = 'Bienvenido a PipGo';
            heroSubtitle.textContent = 'Compra y vende cerca de ti';
        } else if (variant === 'register') {
            heroIcon.innerHTML = '<i class="fa-solid fa-user-plus"></i>';
            heroTitle.textContent = 'Crea tu cuenta';
            heroSubtitle.textContent = 'Encuentra productos cerca de ti';
        } else if (variant === 'recover') {
            heroIcon.innerHTML = '<i class="fa-solid fa-key"></i>';
            heroTitle.textContent = 'Recuperar contraseña';
            heroSubtitle.textContent = 'Un administrador revisará tu solicitud';
        }
    }

    function escapeHtml(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function showError(message) {
        authSuccess.classList.add('hidden');
        authSuccess.innerHTML = '';
        authError.innerHTML = message
            ? `<i class="fa-solid fa-circle-exclamation"></i> <span>${escapeHtml(message)}</span>`
            : '';
        authError.classList.toggle('hidden', !message);
        if (message) {
            setTimeout(() => {
                try { authError.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
            }, 30);
        }
    }

    function showSuccess(message) {
        authError.classList.add('hidden');
        authError.innerHTML = '';
        authSuccess.innerHTML = message
            ? `<i class="fa-solid fa-circle-check"></i> <span>${message}</span>`
            : '';
        authSuccess.classList.toggle('hidden', !message);
        if (message) {
            setTimeout(() => {
                try { authSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
            }, 30);
        }
    }

    function clearMessages() {
        authError.classList.add('hidden');
        authError.innerHTML = '';
        authSuccess.classList.add('hidden');
        authSuccess.innerHTML = '';
    }

    function setButtonLoading(btn, loading) {
        if (!btn) return;
        if (loading) {
            if (!btn.dataset.originalHtml) {
                btn.dataset.originalHtml = btn.innerHTML;
            }
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando…';
        } else {
            btn.disabled = false;
            if (btn.dataset.originalHtml) {
                btn.innerHTML = btn.dataset.originalHtml;
                delete btn.dataset.originalHtml;
            }
        }
    }

    function resetLegalCheckbox() {
        if (registerAcceptLegal) registerAcceptLegal.checked = false;
        if (registerLegalWrap) registerLegalWrap.classList.remove('error');
    }

    /* ---------- Vistas ---------- */
    function showLoginView() {
        authTabsWrap.classList.remove('hidden');
        authTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.auth === 'login'));
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        recoverView.classList.add('hidden');
        setHeroVariant('login');
        clearMessages();
        resetLegalCheckbox();
    }

    function showRegisterView() {
        authTabsWrap.classList.remove('hidden');
        authTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.auth === 'register'));
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        recoverView.classList.add('hidden');
        setHeroVariant('register');
        clearMessages();
        resetLegalCheckbox();
    }

    function showRecoverView() {
        authTabsWrap.classList.add('hidden');
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');
        recoverView.classList.remove('hidden');
        setHeroVariant('recover');
        clearMessages();
        setTimeout(() => recoverEmailInput && recoverEmailInput.focus(), 60);
    }

    function switchAuthTab(mode) {
        if (mode === 'register') showRegisterView();
        else showLoginView();
    }

    /* ---------- Modal ---------- */
    function openAuthModal(mode = 'login') {
        authModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (mode === 'register') showRegisterView();
        else if (mode === 'recover') showRecoverView();
        else showLoginView();
    }

    function closeAuthModal() {
        authModal.classList.add('hidden');
        document.body.style.overflow = '';
        clearMessages();
        if (loginPasswordInput) loginPasswordInput.value = '';
        if (registerPasswordInput) registerPasswordInput.value = '';
        resetLegalCheckbox();
    }

    function waitForAuthState(timeoutMs) {
        return new Promise((resolve) => {
            const start = Date.now();
            const tick = () => {
                if (AppState.currentUser) return resolve(true);
                if (Date.now() - start >= timeoutMs) return resolve(false);
                setTimeout(tick, 80);
            };
            tick();
        });
    }

    /* ---------- Handlers ---------- */
    async function handleRegister(e) {
        e.preventDefault();
        if (registerSubmitBtn && registerSubmitBtn.disabled) return;

        const username = registerUsernameInput.value;
        const email = registerEmailInput.value;
        const password = registerPasswordInput.value;
        clearMessages();

        // Validar aceptación legal ANTES de enviar
        if (registerLegalWrap) registerLegalWrap.classList.remove('error');
        if (!registerAcceptLegal || !registerAcceptLegal.checked) {
            if (registerLegalWrap) registerLegalWrap.classList.add('error');
            showError('Debes aceptar los Términos y Condiciones y el Aviso de Privacidad para crear tu cuenta.');
            return;
        }

        setButtonLoading(registerSubmitBtn, true);

        try {
            await AuthService.register({ username, email, password });

            // Marcar la versión legal aceptada
            if (window.LegalUI) LegalUI.markAccepted();

            await waitForAuthState(2500);
            closeAuthModal();
            Toast.success('Cuenta creada correctamente.');

            setTimeout(() => {
                try {
                    if (window.ProfileUI && ProfileUI.renderProfile) {
                        ProfileUI.renderProfile();
                    }
                } catch (err) {
                    Logger.error('renderProfile post-registro falló', err);
                }
            }, 150);
        } catch (error) {
            showError(error.message || 'No se pudo crear la cuenta.');
        } finally {
            setButtonLoading(registerSubmitBtn, false);
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        if (loginSubmitBtn && loginSubmitBtn.disabled) return;

        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;
        clearMessages();

        setButtonLoading(loginSubmitBtn, true);

        try {
            await AuthService.login(email, password);
            await waitForAuthState(2500);
            closeAuthModal();
            Toast.success('Sesión iniciada.');

            setTimeout(() => {
                try {
                    if (window.ProfileUI && ProfileUI.renderProfile) {
                        ProfileUI.renderProfile();
                    }
                } catch (err) {
                    Logger.error('renderProfile post-login falló', err);
                }
            }, 150);
        } catch (error) {
            showError(error.message || 'No se pudo iniciar sesión.');
        } finally {
            setButtonLoading(loginSubmitBtn, false);
        }
    }

    async function handleSubmitRecover() {
        const email = recoverEmailInput.value.trim();
        clearMessages();

        if (!email) {
            showError('Escribe tu correo electrónico.');
            return;
        }

        setButtonLoading(btnSubmitRecover, true);

        try {
            await AuthService.requestPasswordReset(email);
            showSuccess(
                `Tu solicitud fue enviada. Cuando un administrador la apruebe, recibirás un correo en <strong>${escapeHtml(email)}</strong> con un enlace para definir tu nueva contraseña.`
            );
            recoverEmailInput.value = '';
        } catch (error) {
            showError(error.message || 'No pudimos enviar la solicitud.');
        } finally {
            setButtonLoading(btnSubmitRecover, false);
        }
    }

    function handleTogglePassword(btn) {
        const targetId = btn.dataset.toggle;
        const input = document.getElementById(targetId);
        if (!input) return;
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
            input.type = 'text';
            if (icon) icon.className = 'fa-solid fa-eye-slash';
        } else {
            input.type = 'password';
            if (icon) icon.className = 'fa-solid fa-eye';
        }
    }

    /* ---------- Init ---------- */
    function init() {
        if (initialized) return;
        initialized = true;

        authModal         = document.getElementById('auth-modal');
        loginForm         = document.getElementById('login-form');
        registerForm      = document.getElementById('register-form');
        recoverView       = document.getElementById('recover-view');
        authTabsWrap      = document.getElementById('auth-tabs-pro');
        authTabs          = document.querySelectorAll('.auth-tab-pro');
        authError         = document.getElementById('auth-error');
        authSuccess       = document.getElementById('auth-success');
        authClose         = document.getElementById('auth-close');
        heroIcon          = document.getElementById('auth-hero-icon');
        heroTitle         = document.getElementById('auth-hero-title');
        heroSubtitle      = document.getElementById('auth-hero-subtitle');

        loginEmailInput       = document.getElementById('login-email');
        loginPasswordInput    = document.getElementById('login-password');
        registerUsernameInput = document.getElementById('register-username');
        registerEmailInput    = document.getElementById('register-email');
        registerPasswordInput = document.getElementById('register-password');
        recoverEmailInput     = document.getElementById('recover-email');

        registerAcceptLegal   = document.getElementById('register-accept-legal');
        registerLegalWrap     = document.getElementById('register-legal-wrap');

        loginSubmitBtn    = loginForm.querySelector('button[type="submit"]');
        registerSubmitBtn = registerForm.querySelector('button[type="submit"]');

        btnForgotPassword = document.getElementById('btn-forgot-password');
        btnBackToLogin    = document.getElementById('btn-back-to-login');
        btnSubmitRecover  = document.getElementById('btn-submit-recover');

        authTabs.forEach(tab => {
            tab.addEventListener('click', () => switchAuthTab(tab.dataset.auth));
        });

        authClose.addEventListener('click', closeAuthModal);
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) closeAuthModal();
        });

        loginForm.addEventListener('submit', handleLogin);
        registerForm.addEventListener('submit', handleRegister);

        if (btnForgotPassword) btnForgotPassword.addEventListener('click', showRecoverView);
        if (btnBackToLogin)    btnBackToLogin.addEventListener('click', showLoginView);
        if (btnSubmitRecover)  btnSubmitRecover.addEventListener('click', handleSubmitRecover);

        document.querySelectorAll('.auth-input-toggle').forEach(btn => {
            btn.addEventListener('click', () => handleTogglePassword(btn));
        });

        // Enlaces legales dentro del formulario de registro
        document.querySelectorAll('.legal-link[data-legal-open]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tab = btn.dataset.legalOpen === 'terms' ? 'terms' : 'privacy';
                if (window.LegalUI) LegalUI.open(tab);
            });
        });

        if (recoverEmailInput) {
            recoverEmailInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmitRecover();
                }
            });
        }
    }

    window.AuthUI = {
        init,
        openAuthModal,
        closeAuthModal,
        setError: showError,
        setSuccess: showSuccess,
        isAuthModalOpen: () => authModal && !authModal.classList.contains('hidden')
    };
})();