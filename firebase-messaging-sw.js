/* =====================================================
   PIPGO · FIREBASE MESSAGING SERVICE WORKER
   Recibe push en background y maneja clicks.
   ===================================================== */

importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBEGpdUzxEFJ9o5uyfE1Z4uxwjShwKvYH0",
  authDomain: "pipgo-1b3ba.firebaseapp.com",
  projectId: "pipgo-1b3ba",
  storageBucket: "pipgo-1b3ba.firebasestorage.app",
  messagingSenderId: "516598037905",
  appId: "1:516598037905:web:b70786f2270eb622822e30"
});

const messaging = firebase.messaging();

/* ---------- BACKGROUND ---------- */
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const d = payload.data || {};
  const title = n.title || d.title || 'PipGo';
  const body  = n.body  || d.body  || '';

  const options = {
    body,
    icon:  d.icon  || '/assets/android/icon_x192.png',
    badge: d.badge || '/assets/android/icon_x128.png',
    tag:   d.tag   || ('pipgo-' + (d.type || 'default') + '-' + (d.refId || '')),
    renotify: false,
    data:  d,
    requireInteraction: d.type === 'nuevo_mensaje' ? false : false
  };

  self.registration.showNotification(title, options);
});

/* ---------- CLICK ---------- */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const target = _buildTarget(data);

  event.waitUntil((async () => {
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Buscar una ventana de PipGo ya abierta
    for (const c of wins) {
      try {
        if (new URL(c.url).origin === self.location.origin) {
          await c.focus();
          c.postMessage({ type: 'PIPGO_NOTIFICATION_CLICK', target });
          return;
        }
      } catch (e) { /* noop */ }
    }
    // Ninguna abierta: abrir nueva en la ruta del SPA (siempre "/")
    if (clients.openWindow) {
      await clients.openWindow('/?notif=' + encodeURIComponent(JSON.stringify(target)));
    }
  })());
});

function _buildTarget(d) {
  const t = String(d.type || '');
  if (t === 'publicacion_nueva' && d.publicationId) {
    return { type: 'publicacion_nueva', publicationId: d.publicationId };
  }
  if (t === 'nuevo_mensaje' && d.conversationId) {
    return { type: 'nuevo_mensaje', conversationId: d.conversationId };
  }
  return { type: 'home' };
}

/* ---------- SKIP WAITING (activación inmediata) ---------- */
self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));