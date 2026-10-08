/* =====================================================
   PIPGO · FIREBASE CONFIG
   Proyecto: PIPGO-v2
   ===================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyD-jaLMFPRLpuNkB-GSex7fiPSi6RqCJLY",
    authDomain: "pipgo-v2.firebaseapp.com",
    projectId: "pipgo-v2",
    storageBucket: "pipgo-v2.firebasestorage.app",
    messagingSenderId: "432829501406",
    appId: "1:432829501406:web:cad5cd72fdc03f48c8d74f"
};

firebase.initializeApp(firebaseConfig);

window.db = firebase.firestore();
window.auth = firebase.auth();