/* =====================================================
   PIPGO · CONNECTIVITY SERVICE
   Detecta estado de red (online/offline/tipo de conexión).
   Fuente única de verdad. Sin lógica de UI.
   ===================================================== */

(function () {
    'use strict';

    let listeners = new Set();
    const state = {
        onlineState: typeof navigator !== 'undefined' ? navigator.onLine : true,
        connectionType: 'unknown',
        effectiveType: ''
    };

    function getConn() {
        return navigator.connection ||
               navigator.mozConnection ||
               navigator.webkitConnection ||
               null;
    }

    function detectType() {
        const conn = getConn();
        if (!conn) {
            state.connectionType = state.onlineState ? 'unknown' : 'none';
            state.effectiveType = '';
            return;
        }
        state.connectionType = conn.type || (state.onlineState ? 'unknown' : 'none');
        state.effectiveType = conn.effectiveType || '';
    }

    function emit() {
        const snapshot = { ...state };
        listeners.forEach(fn => {
            try { fn(snapshot); } catch (e) {
                if (window.Logger) Logger.warn('Connectivity listener error', e);
            }
        });
    }

    function handleOnline()  {
        state.onlineState = true;
        detectType();
        emit();
    }

    function handleOffline() {
        state.onlineState = false;
        state.connectionType = 'none';
        state.effectiveType = '';
        emit();
    }

    function handleConnChange() {
        detectType();
        emit();
    }

    function init() {
        detectType();
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        const conn = getConn();
        if (conn && conn.addEventListener) {
            conn.addEventListener('change', handleConnChange);
        }
    }

    window.ConnectivityService = {
        init,
        current() { return { ...state }; },
        isOnline() { return state.onlineState === true; },
        onChange(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        }
    };
})();