/* =====================================================
   PIPGO · NOTIFICATION SERVICE
   -----------------------------------------------------
   v1.2 (Ronda 7):
   - VAPID_KEY configurada con la clave real del proyecto.
   - enqueueEvent incluye `uid` en el payload (fix de reglas).
   - Guard defensivo: si no hay usuario autenticado, no encola.
   ===================================================== */

(function () {
    'use strict';

    /* -------------------------------------------------
       Clave pública VAPID del proyecto PipGo (pipgo-1b3ba).
       Generada en Firebase Console → Cloud Messaging → Web Push certificates.
       ------------------------------------------------- */
    const VAPID_KEY = 'BE1F2embx_3QITNxZmSKTpTyvLD6aX4rrXvu7A6_NFQ-eqKKd75r0YvrbKO_r6ha9lR1_cl-EOvjTACceKUjqaY';

    let messaging = null;
    let initialized = false;
    let currentToken = null;
    let currentUid = null;
    let onForegroundCallback = null;
    let swRegistration = null;

    /* =====================================================
       SOPORTE DEL NAVEGADOR
       ===================================================== */
    function _supported() {
        return (
            'serviceWorker' in navigator &&
            'PushManager'   in window &&
            'Notification'  in window &&
            typeof firebase !== 'undefined' &&
            firebase.messaging
        );
    }

    /* =====================================================
       SERVICE WORKER
       ===================================================== */
    async function _getSW() {
        if (swRegistration) return swRegistration;
        swRegistration = await navigator.serviceWorker.register(
            '/firebase-messaging-sw.js',
            { scope: '/' }
        );
        await navigator.serviceWorker.ready;
        return swRegistration;
    }

    /* =====================================================
       INIT
       ===================================================== */
    async function init() {
        if (initialized) return;
        initialized = true;

        if (!_supported()) {
            Logger.warn('NotificationService: Web Push no soportado en este navegador.');
            return;
        }

        try {
            await _getSW();
            messaging = firebase.messaging();
            messaging.useServiceWorker(swRegistration);

            messaging.onMessage((payload) => {
                if (typeof onForegroundCallback === 'function') {
                    try { onForegroundCallback(payload); }
                    catch (e) { Logger.error('onMessage handler falló', e); }
                }
            });

            navigator.serviceWorker.addEventListener('message', (event) => {
                const msg = event.data || {};
                if (msg.type === 'PIPGO_NOTIFICATION_CLICK') {
                    _handleDeepLink(msg.target);
                }
            });

            Logger.info('NotificationService: inicializado');
        } catch (e) {
            Logger.error('NotificationService init', e);
        }
    }

    /* =====================================================
       ESTADO / PERMISO
       ===================================================== */
    function isSupported() { return _supported(); }

    function permissionState() {
        return (typeof Notification !== 'undefined')
            ? Notification.permission
            : 'unsupported';
    }

    async function requestPermission() {
        if (!_supported()) {
            throw new Error('Tu navegador no admite notificaciones.');
        }
        if (Notification.permission === 'granted') return 'granted';
        if (Notification.permission === 'denied') {
            throw new Error(
                'Bloqueaste las notificaciones para PipGo. Actívalas desde los ajustes del navegador.'
            );
        }
        const result = await Notification.requestPermission();
        if (result !== 'granted') {
            throw new Error('No autorizaste las notificaciones.');
        }
        return result;
    }

    /* =====================================================
       ACTIVAR NOTIFICACIONES PARA UN USUARIO
       ===================================================== */
    async function enableFor(uid) {
        if (!_supported()) throw new Error('Web Push no disponible.');
        if (!uid) throw new Error('Debes iniciar sesión.');

        await requestPermission();
        await _getSW();

        const token = await messaging.getToken({ vapidKey: VAPID_KEY });
        if (!token) throw new Error('No pudimos obtener el token de notificaciones.');

        currentToken = token;
        currentUid = uid;

        await _saveToken(uid, token);

        messaging.onTokenRefresh(async () => {
            try {
                const fresh = await messaging.getToken({ vapidKey: VAPID_KEY });
                if (fresh && fresh !== currentToken) {
                    await _removeToken(currentUid, currentToken);
                    currentToken = fresh;
                    await _saveToken(currentUid, fresh);
                }
            } catch (e) {
                Logger.warn('onTokenRefresh falló', e);
            }
        });

        return token;
    }

    /* =====================================================
       PERSISTENCIA DE TOKEN EN FIRESTORE
       usuarios/{uid}/dispositivos/{hash}
       ===================================================== */
    async function _saveToken(uid, token) {
        const id = _tokenDocId(token);
        const now = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection(CONFIG.COLLECTIONS.USERS).doc(uid)
            .collection('dispositivos').doc(id)
            .set({
                token,
                ua: (navigator.userAgent || '').slice(0, 200),
                platform: (navigator.platform || '').slice(0, 60),
                createdAt: now,
                updatedAt: now
            }, { merge: true });
    }

    async function _removeToken(uid, token) {
        if (!uid || !token) return;
        try {
            await db.collection(CONFIG.COLLECTIONS.USERS).doc(uid)
                .collection('dispositivos').doc(_tokenDocId(token)).delete();
        } catch (e) {
            Logger.warn('removeToken falló', e);
        }
    }

    function _tokenDocId(token) {
        return _simpleHash(token).slice(0, 40);
    }

    function _simpleHash(str) {
        let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
        for (let i = 0; i < str.length; i++) {
            const ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (h1 >>> 0).toString(16).padStart(8, '0') +
               (h2 >>> 0).toString(16).padStart(8, '0');
    }

    /* =====================================================
       DESACTIVAR / LIMPIAR
       ===================================================== */
    async function disableFor(uid) {
        if (!uid) return;
        try {
            if (currentToken) await _removeToken(uid, currentToken);
            if (messaging && currentToken) {
                try { await messaging.deleteToken(); } catch (e) {}
            }
        } finally {
            currentToken = null;
            currentUid = null;
        }
    }

    async function cleanupOnLogout(uid) {
        if (!uid) return;
        try {
            const snap = await db.collection(CONFIG.COLLECTIONS.USERS).doc(uid)
                .collection('dispositivos').get();
            const batch = db.batch();
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        } catch (e) {
            Logger.warn('cleanupOnLogout falló', e);
        }
        currentToken = null;
        currentUid = null;
    }

    /* =====================================================
       FOREGROUND HANDLER
       ===================================================== */
    function setForegroundHandler(fn) {
        onForegroundCallback = fn;
    }

    /* =====================================================
       DEEP LINK DESDE EL SERVICE WORKER
       ===================================================== */
    async function _handleDeepLink(target) {
        if (!target) return;

        if (!AppState.currentUser) {
            AppState.pendingAction = { type: 'openNotification', target };
            AuthUI.openAuthModal('login');
            return;
        }

        if (target.type === 'publicacion_nueva' && target.publicationId) {
            try {
                const pub = await PublicationService.getPublicationById(target.publicationId);
                if (!pub || pub.status === 'deleted') {
                    Toast.warning('Esta publicación ya no está disponible.');
                    return;
                }
                PublicationUI.openProductSheet(pub);
            } catch (e) {
                Toast.error('No pudimos abrir la publicación.');
            }
        } else if (target.type === 'nuevo_mensaje' && target.conversationId) {
            MessagingUI.openChat({ conversationId: target.conversationId });
        }
    }

    /* =====================================================
       COLA DE EVENTOS (FALLBACK)
       ===================================================== */
    async function enqueueEvent(payload) {
        if (!auth.currentUser) return;
        try {
            await db.collection('colaNotificaciones').add({
                ...payload,
                uid: auth.currentUser.uid,
                status: 'pending',
                attempts: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            Logger.warn('enqueueEvent falló', e);
        }
    }

    /* =====================================================
       EMISORES
       ===================================================== */
    async function notifyPublicationCreated(publicationId) {
        if (!publicationId) return;
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch('/api/notify-publication', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ publicationId })
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
        } catch (e) {
            Logger.warn('notifyPublicationCreated → cola', e);
            await enqueueEvent({ kind: 'publication', publicationId });
        }
    }

    async function notifyMessageSent(conversationId, messageId) {
        if (!conversationId || !messageId) return;
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch('/api/notify-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ conversationId, messageId })
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
        } catch (e) {
            Logger.warn('notifyMessageSent → cola', e);
            await enqueueEvent({ kind: 'message', conversationId, messageId });
        }
    }

    /* =====================================================
       API PÚBLICA
       ===================================================== */
    window.NotificationService = {
        init,
        isSupported,
        permissionState,
        requestPermission,
        enableFor,
        disableFor,
        cleanupOnLogout,
        setForegroundHandler,
        notifyPublicationCreated,
        notifyMessageSent,
        handleDeepLink: _handleDeepLink
    };
})();