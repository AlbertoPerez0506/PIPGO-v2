/* =====================================================
   PIPGO · LEGAL UI
   Modal unificado de Aviso de Privacidad y Términos y
   Condiciones. Contiene el texto legal embebido para
   evitar dependencias de red y permitir su lectura offline.

   Conforme a:
   - LFPDPPP (Ley Federal de Protección de Datos Personales
     en Posesión de los Particulares, reforma 14-nov-2025).
   - LFPC (Ley Federal de Protección al Consumidor).
   - NMX-COE-001-SCFI-2018 (Comercio electrónico).
   - Lineamientos SEGOB de clasificación de contenido.
   - Reglas del SAT para plataformas digitales (2026).
   ===================================================== */

(function () {
    'use strict';

    /* -------------------------------------------------
       CONSTANTES
       ------------------------------------------------- */
    const LEGAL_VERSION = '1.0.0';
    const LEGAL_LAST_UPDATE = 'Octubre de 2026';
    const STORAGE_KEY = 'legal_accepted_version';

    const CONTACT = {
        general: 'contacto@pipgo.mx',
        privacy: 'privacidad@pipgo.mx',
        legal: 'legal@pipgo.mx',
        support: 'soporte@pipgo.mx'
    };

    const COMPANY = {
        name: 'PipGo',
        city: 'Emiliano Zapata, Tabasco, México'
    };

    /* -------------------------------------------------
       ESTADO
       ------------------------------------------------- */
    let modal, closeBtn, tabsWrap, tabs, bodyEl, titleEl, subtitleEl,
        headerIcon, updatedEl, acceptBtn;
    let initialized = false;
    let currentTab = 'privacy';
    let historyPushed = false;
    let suppressPopstate = false;

    /* =====================================================
       CONTENIDO — AVISO DE PRIVACIDAD
       ===================================================== */
    function buildPrivacyHtml() {
        return `
            <div class="legal-doc-meta">
                <i class="fa-solid fa-shield-halved"></i>
                <span>Conforme a la LFPDPPP · Reforma 14-nov-2025</span>
            </div>

            <div class="legal-doc">
                <h3>1. Identidad y domicilio del responsable</h3>
                <p>
                    <strong>${COMPANY.name}</strong> (en adelante, "el Responsable"),
                    plataforma digital de intermediación para la compra y venta de
                    productos locales, con domicilio en ${COMPANY.city}, es el
                    responsable del tratamiento de sus datos personales conforme
                    a la Ley Federal de Protección de Datos Personales en Posesión
                    de los Particulares (LFPDPPP), su Reglamento y los Lineamientos
                    del Aviso de Privacidad publicados en el Diario Oficial de la
                    Federación el 14 de noviembre de 2025.
                </p>

                <h3>2. Datos personales que recabamos</h3>
                <p>Para el cumplimiento de las finalidades descritas en el presente Aviso, recabamos las siguientes categorías de datos personales:</p>
                <ul>
                    <li><strong>Datos de identificación:</strong> nombre de usuario (username), correo electrónico.</li>
                    <li><strong>Datos de contacto:</strong> número telefónico (opcional), red social o sitio web (opcional, solo para vendedores).</li>
                    <li><strong>Datos de ubicación:</strong> coordenadas GPS (latitud y longitud) y dirección de referencia aproximada al momento de publicar un producto.</li>
                    <li><strong>Datos de imagen:</strong> fotografía de perfil (avatar) y fotografías del producto publicadas.</li>
                    <li><strong>Datos de comunicación:</strong> contenido de los mensajes intercambiados entre usuarios dentro de la plataforma.</li>
                    <li><strong>Datos técnicos:</strong> identificadores de dispositivo, tipo de conexión y datos de uso estrictamente necesarios para el funcionamiento del servicio.</li>
                </ul>

                <div class="legal-callout">
                    <p>
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        PipGo <strong>no recaba datos personales sensibles</strong>
                        (origen étnico, salud, creencias religiosas, preferencia
                        sexual, datos biométricos, etc.), por lo que no requiere
                        consentimiento expreso y por escrito para su tratamiento.
                    </p>
                </div>

                <h3>3. Finalidades del tratamiento</h3>
                <h4>3.1 Finalidades primarias (necesarias)</h4>
                <p>Estas finalidades son indispensables para la existencia y operación de la relación jurídica entre usted y PipGo:</p>
                <ul>
                    <li>Crear, administrar y proteger su cuenta de usuario.</li>
                    <li>Verificar su identidad mediante correo electrónico y nombre de usuario único.</li>
                    <li>Permitir la publicación, visualización y contacto en torno a productos.</li>
                    <li>Habilitar la comunicación entre compradores y vendedores a través del sistema de mensajería interno.</li>
                    <li>Mostrar productos cercanos a su ubicación geográfica aproximada.</li>
                    <li>Gestionar solicitudes de vendedor y validar el cumplimiento de requisitos.</li>
                    <li>Atender solicitudes de recuperación de contraseña y soporte técnico.</li>
                    <li>Prevenir fraudes, usos indebidos y conductas contrarias a los Términos y Condiciones.</li>
                </ul>

                <h4>3.2 Finalidades secundarias (no necesarias)</h4>
                <p>Estas finalidades no son necesarias para la relación jurídica y usted puede oponerse a ellas sin afectar el servicio:</p>
                <ul>
                    <li>Envío de comunicaciones informativas, promociones o novedades de PipGo.</li>
                    <li>Elaboración de estadísticas anónimas y agregadas para mejorar la plataforma.</li>
                </ul>
                <p>
                    Si usted no desea que sus datos sean tratados para las
                    finalidades secundarias, puede manifestarlo enviando un correo a
                    <a href="mailto:${CONTACT.privacy}">${CONTACT.privacy}</a>.
                </p>

                <h3>4. Consentimiento</h3>
                <p>
                    Al registrarse y hacer uso de PipGo, usted otorga su
                    <strong>consentimiento expreso e inequívoco</strong> para el
                    tratamiento de sus datos personales conforme a las finalidades
                    primarias descritas. Este consentimiento se formaliza a través
                    de la casilla de aceptación mostrada durante el proceso de
                    creación de cuenta.
                </p>

                <h3>5. Transferencias y remisiones de datos</h3>
                <p>Sus datos personales podrán ser transferidos o remitidos a los siguientes terceros, únicamente para las finalidades indicadas:</p>
                <ul>
                    <li><strong>Google Firebase (Google LLC):</strong> autenticación, almacenamiento de base de datos y notificaciones. Servidores en EE. UU. bajo cláusulas contractuales tipo.</li>
                    <li><strong>Cloudinary Ltd.:</strong> almacenamiento y optimización de imágenes. Servidores en EE. UU.</li>
                    <li><strong>OpenStreetMap / Nominatim:</strong> servicio de geocodificación inversa para mostrar direcciones aproximadas. No se envía información personal identificable.</li>
                    <li><strong>Autoridades competentes:</strong> cuando exista requerimiento legal, fiscal o judicial debidamente fundado y motivado.</li>
                </ul>
                <p>
                    En todos los casos, PipGo procura que los terceros cuenten con
                    políticas de privacidad equivalentes y medidas de seguridad
                    adecuadas conforme a la normatividad mexicana y estándares
                    internacionales.
                </p>

                <h3>6. Medidas de seguridad</h3>
                <p>PipGo implementa medidas técnicas, administrativas y físicas para proteger sus datos personales, entre ellas:</p>
                <ul>
                    <li>Cifrado en tránsito mediante HTTPS / TLS 1.3.</li>
                    <li>Cifrado en reposo por parte del proveedor de infraestructura.</li>
                    <li>Reglas de acceso en base de datos (Firestore Security Rules) que restringen la lectura y escritura a usuarios autorizados.</li>
                    <li>Autenticación mediante Firebase Authentication con contraseñas protegidas por hash.</li>
                    <li>Tokens de sesión con expiración automática.</li>
                    <li>Acceso administrativo restringido a personal autorizado.</li>
                </ul>

                <h3>7. Conservación de datos</h3>
                <p>
                    Sus datos personales serán conservados durante el tiempo que
                    mantenga una cuenta activa en PipGo. Los mensajes internos
                    tienen una vigencia automática de <strong>siete (7) días
                    naturales</strong>, tras lo cual son eliminados de forma
                    definitiva. Al solicitar la eliminación de su cuenta, sus
                    datos serán suprimidos en un plazo máximo de 30 días hábiles,
                    salvo obligación legal de conservarlos.
                </p>

                <h3>8. Derechos ARCO y revocación del consentimiento</h3>
                <p>
                    Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u
                    Oponerse</strong> (derechos ARCO) al tratamiento de sus datos
                    personales, así como a revocar el consentimiento otorgado.
                    Para ejercer cualquiera de estos derechos, puede enviar una
                    solicitud al correo:
                </p>
                <div class="legal-contact-box">
                    <p><strong>Correo:</strong> <a href="mailto:${CONTACT.privacy}">${CONTACT.privacy}</a></p>
                    <p><strong>Asunto:</strong> Solicitud de Derechos ARCO</p>
                </div>
                <p>La solicitud deberá contener:</p>
                <ul>
                    <li>Nombre completo del titular y correo asociado a su cuenta.</li>
                    <li>Documento que acredite su identidad o representación legal.</li>
                    <li>Descripción clara y precisa del derecho que desea ejercer.</li>
                    <li>Cualquier elemento que facilite la localización de sus datos.</li>
                </ul>
                <p>
                    PipGo responderá en un plazo máximo de <strong>20 días
                    hábiles</strong> contados a partir de la recepción de la
                    solicitud, conforme al artículo 32 de la LFPDPPP.
                </p>

                <h3>9. Uso de cookies y tecnologías similares</h3>
                <p>
                    PipGo utiliza almacenamiento local del navegador
                    (localStorage) y cookies estrictamente necesarias para el
                    funcionamiento de la aplicación, incluyendo: mantener su
                    sesión activa, recordar preferencias y almacenar borradores
                    temporales de publicaciones. No se utilizan cookies de
                    rastreo publicitario de terceros.
                </p>

                <h3>10. Menores de edad</h3>
                <p>
                    PipGo está dirigida a personas mayores de 18 años. Si usted
                    es menor de edad, le solicitamos no proporcionar datos
                    personales sin la autorización previa de su padre, madre o
                    tutor. PipGo opera bajo el principio de
                    <strong>protección reforzada</strong> para menores,
                    absteniéndose de recabar datos adicionales a los estrictamente
                    necesarios y sin implementar patrones de diseño que incentiven
                    el uso prolongado.
                </p>

                <h3>11. Cambios al Aviso de Privacidad</h3>
                <p>
                    PipGo se reserva el derecho de actualizar este Aviso de
                    Privacidad. Cualquier cambio sustancial será notificado a
                    través de la aplicación y, en su caso, mediante correo
                    electrónico. La versión vigente estará siempre disponible en
                    esta sección. El uso continuado de la plataforma posterior a
                    la publicación de los cambios implica su aceptación.
                </p>

                <h3>12. Autoridad competente</h3>
                <p>
                    Si usted considera que su derecho a la protección de datos
                    personales ha sido vulnerado, puede acudir a la autoridad
                    federal competente en materia de protección de datos
                    personales en posesión de los particulares, sin perjuicio de
                    contactar previamente a PipGo para buscar una solución.
                </p>

                <hr class="legal-divider">

                <p style="text-align:center; font-size:12.5px; color:var(--text-tertiary);">
                    Última actualización: <strong>${LEGAL_LAST_UPDATE}</strong> · Versión <strong>${LEGAL_VERSION}</strong>
                </p>
            </div>
        `;
    }

    /* =====================================================
       CONTENIDO — TÉRMINOS Y CONDICIONES
       ===================================================== */
    function buildTermsHtml() {
        return `
            <div class="legal-doc-meta">
                <i class="fa-solid fa-file-contract"></i>
                <span>Contrato de adhesión · NMX-COE-001-SCFI-2018</span>
            </div>

            <div class="legal-doc">
                <h3>1. Identificación del proveedor</h3>
                <p>
                    Los presentes Términos y Condiciones (en adelante, "los
                    Términos") constituyen un <strong>contrato de adhesión</strong>
                    celebrado entre usted (en adelante, "el Usuario") y
                    <strong>${COMPANY.name}</strong>, con domicilio en ${COMPANY.city},
                    en su carácter de proveedor de servicios digitales conforme a
                    la Ley Federal de Protección al Consumidor (LFPC) y a la Norma
                    Mexicana NMX-COE-001-SCFI-2018 sobre comercio electrónico.
                </p>
                <div class="legal-contact-box">
                    <p><strong>Correo general:</strong> <a href="mailto:${CONTACT.general}">${CONTACT.general}</a></p>
                    <p><strong>Correo legal:</strong> <a href="mailto:${CONTACT.legal}">${CONTACT.legal}</a></p>
                </div>

                <h3>2. Aceptación de los Términos</h3>
                <p>
                    El uso de la aplicación PipGo y la creación de una cuenta
                    implican la <strong>aceptación plena e incondicional</strong>
                    de los presentes Términos, así como del Aviso de Privacidad
                    correspondiente. Si usted no está de acuerdo con alguna
                    disposición, deberá abstenerse de utilizar la plataforma.
                </p>

                <h3>3. Capacidad legal</h3>
                <p>
                    Para registrarse y usar PipGo, el Usuario declara ser mayor de
                    edad y contar con la capacidad legal necesaria para
                    obligarse conforme a los presentes Términos. El uso por
                    menores de edad queda sujeto a la autorización y supervisión
                    de su padre, madre o tutor legal.
                </p>

                <h3>4. Registro y cuenta</h3>
                <p>El Usuario se obliga a:</p>
                <ul>
                    <li>Proporcionar información veraz, precisa y actualizada.</li>
                    <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
                    <li>No ceder, transferir o compartir su cuenta con terceros.</li>
                    <li>Notificar inmediatamente a PipGo cualquier uso no autorizado de su cuenta.</li>
                </ul>
                <p>
                    PipGo se reserva el derecho de suspender o cancelar cuentas que
                    incumplan estos Términos, sin perjuicio de las acciones legales
                    que correspondan.
                </p>

                <h3>5. Naturaleza de la plataforma</h3>
                <p>
                    <strong>PipGo es una plataforma de intermediación.</strong> No
                    es propietaria de los productos publicados, no los fabrica, no
                    los almacena y no participa directamente en las transacciones
                    entre Vendedores y Compradores. La responsabilidad sobre la
                    veracidad, calidad, legalidad y entrega del producto recae
                    exclusivamente en el Vendedor que lo publica.
                </p>

                <h3>6. Condiciones para vendedores</h3>
                <p>Para publicar productos, el Usuario deberá:</p>
                <ul>
                    <li>Contar con autorización previa de PipGo como vendedor.</li>
                    <li>Proporcionar información veraz sobre su identidad y actividad.</li>
                    <li>Publicar productos lícitos, no prohibidos por la legislación mexicana.</li>
                    <li>Respetar los derechos de propiedad intelectual de terceros.</li>
                    <li>Cumplir con las obligaciones fiscales aplicables a su actividad.</li>
                    <li>Mantener actualizada la información de contacto y ubicación.</li>
                </ul>

                <h4>6.1 Prohibiciones para vendedores</h4>
                <ul>
                    <li>Productos ilegales, robados, falsificados o de origen ilícito.</li>
                    <li>Alimentos en mal estado o sin registro sanitario cuando sea exigible.</li>
                    <li>Medicamentos, sustancias controladas o precursores químicos.</li>
                    <li>Armas, explosivos o materiales peligrosos.</li>
                    <li>Especies protegidas o productos derivados del tráfico ilegal de flora y fauna.</li>
                    <li>Servicios sexuales, contenido para adultos o material que vulnere derechos de terceros.</li>
                </ul>

                <h3>7. Condiciones para compradores</h3>
                <p>El Comprador se compromete a:</p>
                <ul>
                    <li>Utilizar la información de contacto obtenida únicamente para concretar la compra.</li>
                    <li>Respetar al Vendedor y abstenerse de conductas ofensivas, discriminatorias o fraudulentas.</li>
                    <li>Verificar las condiciones del producto antes de concretar la operación.</li>
                </ul>

                <h3>8. Precios y pagos</h3>
                <p>
                    Los precios son establecidos libremente por cada Vendedor en
                    pesos mexicanos (MXN). PipGo <strong>no procesa pagos en esta
                    versión</strong>: las transacciones económicas se acuerdan
                    directamente entre Vendedor y Comprador. PipGo no es
                    responsable de los acuerdos de pago, entregas o disputas
                    derivadas de la transacción.
                </p>

                <h3>9. Entregas y devoluciones</h3>
                <p>
                    Las condiciones de entrega, tiempos, costos y política de
                    devoluciones son responsabilidad exclusiva del Vendedor y
                    deberán informarse al Comprador antes de concretar la compra.
                    PipGo no interviene en estas operaciones salvo para facilitar
                    el contacto entre las partes.
                </p>

                <h3>10. Propiedad intelectual</h3>
                <p>
                    La marca <strong>PipGo</strong>, su logotipo, diseño de
                    interfaz, código fuente y demás elementos distintivos son
                    propiedad exclusiva de sus titulares y están protegidos por la
                    Ley Federal del Derecho de Autor (LFDA) y la Ley de la
                    Propiedad Industrial (LPI). Queda prohibida su reproducción,
                    distribución o uso sin autorización previa y por escrito.
                </p>
                <p>
                    El Usuario conserva los derechos sobre el contenido que
                    publique, pero otorga a PipGo una licencia no exclusiva,
                    gratuita y mundial para exhibirlo dentro de la plataforma.
                </p>

                <h3>11. Contenido generado por el Usuario</h3>
                <p>
                    El Usuario es el único responsable del contenido que publique
                    (textos, imágenes, descripciones) y garantiza que cuenta con
                    los derechos necesarios para hacerlo. PipGo podrá retirar
                    contenido que incumpla los presentes Términos, sin previo
                    aviso, reservándose las acciones legales aplicables.
                </p>

                <h3>12. Obligaciones fiscales</h3>
                <p>
                    Conforme a la normatividad vigente del Servicio de
                    Administración Tributaria (SAT) en materia de plataformas
                    tecnológicas:
                </p>
                <ul>
                    <li>PipGo está inscrita en el RFC y cuenta con los mecanismos de control fiscal exigidos.</li>
                    <li>PipGo podrá solicitar a los Vendedores su RFC para el cumplimiento de las retenciones de ISR e IVA aplicables.</li>
                    <li>Los Vendedores son responsables de cumplir con sus propias obligaciones fiscales derivadas de su actividad.</li>
                    <li>En caso de lanzamiento comercial, PipGo integrará el sistema de retenciones y CFDI correspondientes.</li>
                </ul>

                <h3>13. Clasificación de contenido</h3>
                <p>
                    PipGo se clasifica como <strong>apta para todo público
                    (AA)</strong> conforme a los Lineamientos de Clasificación de
                    Contenidos de la Secretaría de Gobernación (SEGOB). La
                    plataforma no contiene violencia, lenguaje soez, contenido
                    sexual ni material que pueda resultar nocivo. PipGo opera bajo
                    el principio de protección reforzada para menores de edad.
                </p>

                <h3>14. Protección al consumidor</h3>
                <p>
                    PipGo reconoce los derechos del consumidor establecidos en la
                    LFPC. En caso de controversia, el Usuario podrá presentar su
                    queja ante la Procuraduría Federal del Consumidor (PROFECO)
                    a través de los canales oficiales, sin perjuicio de contactar
                    primero a PipGo para una resolución amistosa a través de
                    <a href="mailto:${CONTACT.support}">${CONTACT.support}</a>.
                </p>

                <h3>15. Limitación de responsabilidad</h3>
                <p>
                    PipGo no será responsable de daños indirectos, incidentales,
                    especiales o consecuenciales derivados del uso o la
                    imposibilidad de uso de la plataforma, incluyendo: lucro
                    cesante, pérdida de datos, incumplimiento de vendedores o
                    compradores, ni por el contenido publicado por los usuarios.
                </p>

                <h3>16. Disponibilidad del servicio</h3>
                <p>
                    PipGo no garantiza la disponibilidad ininterrumpida del
                    servicio. Podrán realizarse mantenimientos programados o
                    correctivos que impliquen suspensión temporal, procurando
                    notificar oportunamente a los usuarios.
                </p>

                <h3>17. Modificaciones a los Términos</h3>
                <p>
                    PipGo se reserva el derecho de modificar estos Términos en
                    cualquier momento. Las modificaciones entrarán en vigor a
                    partir de su publicación en la aplicación. El uso continuado
                    implica la aceptación de los términos vigentes.
                </p>

                <h3>18. Terminación</h3>
                <p>
                    El Usuario podrá solicitar la baja de su cuenta en cualquier
                    momento. PipGo podrá suspender o terminar el acceso al
                    servicio sin previo aviso en caso de incumplimiento grave a
                    los presentes Términos o a la legislación vigente.
                </p>

                <h3>19. Ley aplicable y jurisdicción</h3>
                <p>
                    Los presentes Términos se rigen por las leyes de los Estados
                    Unidos Mexicanos. Para cualquier controversia, las partes se
                    someten a la jurisdicción de los tribunales competentes en
                    el Estado de Tabasco, renunciando a cualquier otro fuero que
                    pudiera corresponderles por razón de su domicilio presente o
                    futuro.
                </p>

                <h3>20. Contacto</h3>
                <div class="legal-contact-box">
                    <p><strong>Atención general:</strong> <a href="mailto:${CONTACT.general}">${CONTACT.general}</a></p>
                    <p><strong>Soporte:</strong> <a href="mailto:${CONTACT.support}">${CONTACT.support}</a></p>
                    <p><strong>Asuntos legales:</strong> <a href="mailto:${CONTACT.legal}">${CONTACT.legal}</a></p>
                </div>

                <hr class="legal-divider">

                <p style="text-align:center; font-size:12.5px; color:var(--text-tertiary);">
                    Última actualización: <strong>${LEGAL_LAST_UPDATE}</strong> · Versión <strong>${LEGAL_VERSION}</strong>
                </p>
            </div>
        `;
    }

    /* =====================================================
       RENDER
       ===================================================== */
    function renderTab(tab) {
        currentTab = tab;

        // Actualizar tab activo
        tabs.forEach(t => {
            t.classList.toggle('active', t.dataset.legalTab === tab);
        });

        // Header dinámico
        if (tab === 'terms') {
            headerIcon.className = 'legal-header-icon variant-terms';
            headerIcon.innerHTML = '<i class="fa-solid fa-file-contract"></i>';
            titleEl.textContent = 'Términos y Condiciones';
            subtitleEl.textContent = 'Contrato de adhesión · Uso de la plataforma';
        } else {
            headerIcon.className = 'legal-header-icon variant-privacy';
            headerIcon.innerHTML = '<i class="fa-solid fa-shield-halved"></i>';
            titleEl.textContent = 'Aviso de Privacidad';
            subtitleEl.textContent = 'Tratamiento de datos personales';
        }

        // Body
        bodyEl.innerHTML = tab === 'terms' ? buildTermsHtml() : buildPrivacyHtml();
        bodyEl.scrollTop = 0;

        // Footer
        updatedEl.innerHTML =
            `Última actualización: <strong>${LEGAL_LAST_UPDATE}</strong> · v${LEGAL_VERSION}`;
    }

    /* =====================================================
       MODAL
       ===================================================== */
    function open(tab = 'privacy', { showTabs = true } = {}) {
        if (!modal) return;

        tabsWrap.classList.toggle('hidden', !showTabs);
        renderTab(tab === 'terms' ? 'terms' : 'privacy');

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        if (!historyPushed) {
            history.pushState(
                { view: AppState.currentView, overlay: 'legal' },
                '',
                ''
            );
            historyPushed = true;
        }
    }

    function close(syncHistory = true) {
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.style.overflow = '';

        if (historyPushed) {
            historyPushed = false;
            if (syncHistory) {
                suppressPopstate = true;
                try { history.back(); } catch (e) {}
            }
        }
    }

    function isOpen() {
        return modal && !modal.classList.contains('hidden');
    }

    /* =====================================================
       ACEPTACIÓN LEGAL (para el registro)
       ===================================================== */
    function hasAccepted() {
        return Storage.get(STORAGE_KEY, null) === LEGAL_VERSION;
    }

    function markAccepted() {
        Storage.set(STORAGE_KEY, LEGAL_VERSION);
    }

    /* =====================================================
       INIT
       ===================================================== */
    function init() {
        if (initialized) return;
        initialized = true;

        modal      = document.getElementById('legal-modal');
        closeBtn   = document.getElementById('legal-close');
        tabsWrap   = document.getElementById('legal-tabs');
        bodyEl     = document.getElementById('legal-body');
        titleEl    = document.getElementById('legal-title');
        subtitleEl = document.getElementById('legal-subtitle');
        headerIcon = document.getElementById('legal-header-icon');
        updatedEl  = document.getElementById('legal-updated');
        acceptBtn  = document.getElementById('legal-accept');

        if (!modal) {
            Logger.error('LegalUI: modal legal no encontrado en el DOM.');
            return;
        }

        tabs = modal.querySelectorAll('.legal-tab');

        // Tabs
        tabs.forEach(tab => {
            tab.addEventListener('click', () => renderTab(tab.dataset.legalTab));
        });

        // Cerrar
        if (closeBtn) closeBtn.addEventListener('click', () => close());
        if (acceptBtn) acceptBtn.addEventListener('click', () => close());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });

        // ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen()) {
                e.preventDefault();
                close();
            }
        });
    }

    /* =====================================================
       API PÚBLICA
       ===================================================== */
    window.LegalUI = {
        init,
        open,
        close,
        isOpen,
        hasAccepted,
        markAccepted,
        LEGAL_VERSION,
        LEGAL_LAST_UPDATE,
        consumeSuppressPopstate: () => {
            if (suppressPopstate) {
                suppressPopstate = false;
                return true;
            }
            return false;
        }
    };
})();