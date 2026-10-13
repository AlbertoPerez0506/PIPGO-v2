/* =====================================================
   PIPGO · BOOTSTRAP CORDOVA
   -----------------------------------------------------
   Detecta si la app corre dentro de Cordova/Capacitor
   y carga `cordova.js` si es necesario.

   Estaba inline en <head> para evitar un round-trip antes
   de que Firebase arrancara. Ahora vive aquí para poder
   endurecer el CSP (quitar 'unsafe-inline' de script-src).
   ===================================================== */

(function () {
    'use strict';

    var isCordova =
        window.location.protocol === 'file:' ||
        window.cordova !== undefined ||
        window.Capacitor !== undefined;

    if (!isCordova) return;

    var s = document.createElement('script');
    s.src = 'cordova.js';
    s.async = false;
    document.head.appendChild(s);
})();