/* =====================================================
   PIPGO · DOM HELPERS
   Utilidades para construir nodos de forma segura.
   ===================================================== */

window.DOM = {
    el(tag, attrs = {}, children = []) {
        const node = document.createElement(tag);
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'class') node.className = value;
            else if (key === 'dataset') Object.assign(node.dataset, value);
            else if (key.startsWith('on') && typeof value === 'function') {
                node.addEventListener(key.slice(2), value);
            } else if (value != null) {
                node.setAttribute(key, value);
            }
        });
        children.forEach(child => {
            if (typeof child === 'string') node.appendChild(document.createTextNode(child));
            else if (child) node.appendChild(child);
        });
        return node;
    }
};