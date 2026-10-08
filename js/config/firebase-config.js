/* =====================================================
   PIPGO · FIREBASE CONFIG
   Proyecto: pipgo-1b3ba
   -----------------------------------------------------
   Compat SDK (CDN) — no modular.
   Compatible con firebase-app-compat.js,
   firebase-auth-compat.js y firebase-firestore-compat.js.
   ===================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyBEGpdUzxEFJ9o5uyfE1Z4uxwjShwKvYH0",
    authDomain: "pipgo-1b3ba.firebaseapp.com",
    projectId: "pipgo-1b3ba",
    storageBucket: "pipgo-1b3ba.firebasestorage.app",
    messagingSenderId: "516598037905",
    appId: "1:516598037905:web:b70786f2270eb622822e30"
};

firebase.initializeApp(firebaseConfig);

window.db = firebase.firestore();
window.auth = firebase.auth();