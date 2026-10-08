/* =====================================================
   PIPGO · AUTH SERVICE
   ===================================================== */

window.AuthService = {
    async register({ username, email, password }) {
        const usernameValidation = Validators.validateUsername(username);
        if (!usernameValidation.valid) throw new Error(usernameValidation.error);
        if (!Validators.validateEmail(email)) throw new Error('Correo electrónico inválido.');
        if (!Validators.validatePassword(password)) throw new Error('La contraseña debe tener al menos 6 caracteres.');

        const normalized = Validators.normalizeUsername(usernameValidation.value);
        const cleanEmail = String(email).trim().toLowerCase();

        let credential;
        try {
            credential = await auth.createUserWithEmailAndPassword(cleanEmail, password);
        } catch (error) {
            Logger.error('Registro falló', error);
            throw new Error(this.getAuthErrorMessage(error));
        }

        const uid = credential.user.uid;

        try {
            await UserService.createProfileWithUsername({
                uid,
                username: usernameValidation.value,
                normalized,
                email: cleanEmail
            });
            return credential.user;
        } catch (error) {
            try {
                await credential.user.delete();
                await auth.signOut();
            } catch (cleanupError) {
                Logger.error('Rollback de cuenta falló', cleanupError);
            }
            throw error;
        }
    },

    async login(email, password) {
        const cleanEmail = String(email || '').trim().toLowerCase();
        if (!cleanEmail || !password) {
            throw new Error('Correo y contraseña son obligatorios.');
        }

        try {
            const credential = await auth.signInWithEmailAndPassword(cleanEmail, password);
            Logger.info('Login OK', { uid: credential.user.uid, email: credential.user.email });
            return credential;
        } catch (error) {
            Logger.error('Login falló', { code: error && error.code, message: error && error.message });
            throw new Error(this.getAuthErrorMessage(error));
        }
    },

    logout() { return auth.signOut(); },

    onAuthStateChanged(callback) { return auth.onAuthStateChanged(callback); },

    /* -------------------------------------------------
       RECUPERACIÓN DE CONTRASEÑA
       ------------------------------------------------- */
    async requestPasswordReset(rawEmail) {
        const email = String(rawEmail || '').trim().toLowerCase();
        if (!Validators.validateEmail(email)) {
            throw new Error('Correo electrónico inválido.');
        }

        try {
            await db.collection('solicitudesRecuperacion').add({
                email,
                status: 'pending',
                requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
                reviewedAt: null,
                reviewedBy: null,
                emailSentAt: null,
                rejectionReason: null
            });
        } catch (error) {
            Logger.error('Error creando solicitud de recuperación', error);
            throw new Error('No pudimos registrar tu solicitud. Inténtalo de nuevo.');
        }
    },

    async sendPasswordResetEmail(email) {
        try {
            await auth.sendPasswordResetEmail(email);
            return true;
        } catch (error) {
            Logger.error('sendPasswordResetEmail falló', error);
            throw new Error(this.getAuthErrorMessage(error));
        }
    },

    getAuthErrorMessage(error) {
        const code = error && error.code;
        const map = {
            'auth/invalid-email': 'Correo electrónico inválido.',
            'auth/email-already-in-use': 'Este correo ya está registrado.',
            'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
            'auth/user-not-found': 'No existe una cuenta con este correo.',
            'auth/wrong-password': 'Contraseña incorrecta.',
            'auth/invalid-credential': 'Correo o contraseña incorrectos.',
            'auth/invalid-login-credentials': 'Correo o contraseña incorrectos.',
            'auth/user-disabled': 'Esta cuenta fue deshabilitada. Contacta al soporte.',
            'auth/too-many-requests': 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
            'auth/network-request-failed': 'No pudimos conectar. Revisa tu conexión a Internet.',
            'auth/operation-not-allowed': 'El inicio de sesión con correo no está habilitado. Contacta al administrador.'
        };
        return map[code] || 'No pudimos completar la autenticación. Inténtalo de nuevo.';
    }
};