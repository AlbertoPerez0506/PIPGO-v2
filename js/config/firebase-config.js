/* =====================================================
   PIPGO · FIREBASE CONFIG
   -----------------------------------------------------
   v2.0:
   - initializeApp envuelto en try/catch (F-07).
     Si Firebase falla (CDN caído, bloqueo de red), se
     levanta un flag y bootstrap() aborta con mensaje claro
     en vez de explotar con "firebase is not defined".
   - La apiKey de Firebase es PÚBLICA por diseño. La
     seguridad real vive en Firestore Rules (ver
     firestore.rules) — F-26.
   ===================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyBEGpdUzxEFJ9o5uyfE1Z4uxwjShwKvYH0",
    authDomain: "pipgo-1b3ba.firebaseapp.com",
    projectId: "pipgo-1b3ba",
    storageBucket: "pipgo-1b3ba.firebasestorage.app",
    messagingSenderId: "516598037905",
    appId: "1:516598037905:web:b70786f2270eb622822e30"
};

window.PipGoFirebaseReady = false;

try {
    if (typeof firebase === 'undefined' || !firebase.initializeApp) {
        throw new Error('Firebase SDK no disponible.');
    }
    firebase.initializeApp(firebaseConfig);
    window.db = firebase.firestore();
    window.auth = firebase.auth();
    window.PipGoFirebaseReady = true;
} catch (err) {
    // No usamos Logger todavía: puede no haberse cargado.
    console.error('[PipGo] Firebase init falló:', err);
    window.PipGoFirebaseReady = false;
}