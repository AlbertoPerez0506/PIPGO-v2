/* =====================================================
   PIPGO · ABOUT UI (Nosotros)
   -----------------------------------------------------
   Sección "Detrás de PipGo hay una historia".
   Carga 100% estática: no lee Firestore ni servicios.
   -----------------------------------------------------
   v1.4:
   - TEAM reordenado por rol Scrum:
     Product Owner → Scrum Master → Equipo de Desarrollo
     (Dev → UX/UI → Contenido → Marketing).
   ===================================================== */

(function () {
    'use strict';

    /* =====================================================
       1) DATOS · EDITA SOLO ESTE BLOQUE PARA ACTUALIZAR
       ===================================================== */

    const MEMORIES = [
        {
            src: 'assets/about/team/nosotros-01.webp',
            date: 'Equipo completo',
            caption: 'El equipo reunido en el evento.'
        },
        {
            src: 'assets/about/team/nosotros-02.webp',
            date: 'Sesión de trabajo',
            caption: 'Revisando antes de comenzar.'
        },
        {
            src: 'assets/about/team/nosotros-03.webp',
            date: 'Primeros avances',
            caption: 'Presentación del proyecto.'
        },
        // {
        //     src: 'assets/about/team/nosotros-04.webp',
        //     date: 'Momentos universitarios',
        //     caption: 'Aprendizajes que dejaron huella en nuestro camino.'
        // }
    ];

    const CHAPTERS = [
        {
            num: '01',
            date: '',
            title: 'Todo comenzó con una semilla',
            paragraphs: [
                'En sus primeras etapas, PipGo fue concebido como un videojuego 2D. La idea consistía en crear una aventura protagonizada por una pequeña semilla que recorrería distintos escenarios hasta llegar a su destino.',
                'El proyecto contemplaba cuatro escenarios: un maizal, una granja, un terreno lodoso y un campo abierto. Al final de la aventura, la semilla sería plantada, como símbolo de crecimiento y culminación de su recorrido.',
                'Comenzamos a convertir esa idea en realidad y llegamos a desarrollar uno de los escenarios: el campo abierto.',
                'Sin embargo, mientras avanzábamos, descubrimos que el alcance del videojuego era más ambicioso de lo que habíamos previsto.'
            ]
        },
        {
            num: '02',
            date: '',
            title: 'Cuando fue necesario detenernos',
            paragraphs: [
                'El verdadero desafío no era solamente técnico.',
                'Con el paso de los días, empezamos a sentir que algo no terminaba de encajar. Aunque teníamos una idea interesante y habíamos realizado avances, no encontrábamos la conexión con el proyecto que necesitábamos para continuar con la motivación que esperábamos.',
                'El desarrollo comenzó a perder ritmo y comprendimos que debíamos replantearnos nuestro camino.',
                'Decidimos conversar como equipo, compartir nuestras inquietudes y explorar otras posibilidades.',
                'En lugar de continuar por inercia, nos dimos la oportunidad de cuestionar lo que estábamos haciendo.'
            ]
        },
        {
            num: '03',
            date: '',
            title: 'Una nueva idea cambió el rumbo',
            paragraphs: [
                'De aquella conversación surgió una nueva oportunidad.',
                'No queríamos dejar morir el proyecto ni desaprovechar el trabajo que ya habíamos realizado. Queríamos encontrar un propósito con el que pudiéramos identificarnos de verdad.',
                'Con una perspectiva renovada y junto con nuestra asesora académica, <strong>Anery Suárez Vázquez</strong>, comenzamos a dar forma a una nueva visión.',
                'PipGo dejaría de ser un videojuego para convertirse en una aplicación de búsqueda de productos a nivel local.',
                'La nueva propuesta estaba orientada a acercar a las personas a los productos y negocios de su entorno, facilitando el descubrimiento de opciones disponibles en sus propias comunidades.',
                'Aquello significó mucho más que cambiar de tecnología o modificar una idea. Fue la oportunidad de replantear nuestro propósito y construir una solución diferente.',
                'Decidimos conservar el nombre PipGo en honor al videojuego original, a nuestros primeros esfuerzos y a la creatividad que nos permitió imaginar algo nuevo.'
            ],
            quote: 'La semilla seguía ahí. Lo que había cambiado era el lugar donde queríamos hacerla crecer.'
        },
        {
            num: '04',
            date: '27 · AGO · 2026',
            title: 'PipGo sale a la luz',
            paragraphs: [
                'El <strong>27 de agosto de 2026</strong>, PipGo tuvo su primera presentación oficial en <strong>Level Up Digital</strong>, una feria de videojuegos, aplicaciones móviles y desarrollo ágil con Scrum, celebrada en las instalaciones de la Universidad Tecnológica del Usumacinta.',
                'Aquel momento representó una oportunidad para compartir nuestro trabajo y presentar una idea que había evolucionado desde sus primeras etapas hasta convertirse en una aplicación con un propósito diferente.',
                'Desde entonces, PipGo ha continuado desarrollándose mediante actualizaciones, mejoras e implementaciones que buscan ofrecer una experiencia cada vez más útil y funcional.',
                'Sabemos que todavía queda mucho por construir. Por eso continuamos aprendiendo, evaluando nuevas ideas y trabajando para que la plataforma siga evolucionando junto con las necesidades de sus futuros usuarios.',
                'Esta historia no termina con su primera presentación. Es el comienzo de todo lo que todavía podemos construir.'
            ]
        }
    ];

    /* Invitación de Level Up  */
    const LEVEL_UP = {
        src: 'assets/about/PipGo_ Tecnología que impulsa lo local.webp',
        date: '27 ago 2026',
        caption: 'Invitación oficial de Level Up Digital · UT del Usumacinta.'
    };

    /* Asesora académica — aparece al final de la sección del equipo
       con un estilo visual propio (tema café). */
    const ADVISOR = {
        name: 'Anery Suárez Vázquez',
        role: 'Asesora académica',
        roleIcon: 'fa-graduation-cap',
        description: 'Acompañó al equipo durante la transición de PipGo, aportando perspectiva académica y guiando la construcción de la nueva visión del proyecto.',
        email: 'anery.suarez.vazquez@pipgo.app',
        photo: 'assets/about/anery-suarez-vazquez.webp'
    };

    /* Team ordenado por rol Scrum:
       1. Product Owner
       2. Scrum Master
       3. Equipo de Desarrollo (Dev → UX/UI → Contenido → Marketing)
       Correos provisionales — cámbialos aquí cuando tengas los reales. */
    const TEAM = [
        {
            name: 'Vanessa Paola García Rosario',
            role: 'Product Owner',
            roleIcon: 'fa-compass',
            description: 'Contribuye a definir la visión del producto, priorizar necesidades y orientar el desarrollo hacia los objetivos del proyecto.',
            email: 'vanessa.paola.garcia.rosario@pipgo.app',
            photo: 'assets/about/vanessa-paola-garcia-rosario.webp'
        },
        {
            name: 'Ariadna Ixchel Díaz Piña',
            role: 'Scrum Master',
            roleIcon: 'fa-list-check',
            description: 'Coordina la organización del equipo, facilita la colaboración y promueve el seguimiento del trabajo mediante la metodología Scrum.',
            email: 'ariadna.ixchel.diaz.pina@pipgo.app',
            photo: 'assets/about/ariadna-ixchel-diaz-pina.webp'
        },
        {
            name: 'Iván Alberto Pérez Ramírez',
            role: 'Programador / Desarrollador',
            roleIcon: 'fa-code',
            description: 'Participa en la construcción técnica de PipGo mediante el desarrollo de funcionalidades, integraciones y mejoras de la plataforma.',
            email: 'ivan.alberto.perez.ramirez@pipgo.app',
            photo: 'assets/about/ivan-alberto-perez-ramirez.webp'
        },
        {
            name: 'Anett Michelle Zacarías Sandoval',
            role: 'Diseñadora UX/UI',
            roleIcon: 'fa-pen-nib',
            description: 'Colabora en el diseño de interfaces y en la experiencia de usuario, procurando que la aplicación sea clara, intuitiva y funcional.',
            email: 'anett.michelle.zacarias.sandoval@pipgo.app',
            photo: 'assets/about/anett-michelle-zacarias-sandoval.webp'
        },
        {
            name: 'Ayelen Lakeisha Pérez Martínez',
            role: 'Diseñadora UX/UI',
            roleIcon: 'fa-pen-nib',
            description: 'Participa en el desarrollo visual de PipGo y en la construcción de una experiencia de interacción coherente y agradable.',
            email: 'ayelen.lakeisha.perez.martinez@pipgo.app',
            photo: 'assets/about/ayelen-lakeisha-perez-martinez.webp'
        },
        {
            name: 'Cristell Guadalupe Jiménez Jiménez',
            role: 'Estrategia de Contenido y Educación',
            roleIcon: 'fa-book-open',
            description: 'Contribuye a la planificación de contenidos y a la comunicación de información útil para los usuarios.',
            email: 'cristell.guadalupe.jimenez.jimenez@pipgo.app',
            photo: 'assets/about/cristell-guadalupe-jimenez-jimenez.webp'
        },
        {
            name: 'Ronay Arturo García Hernández',
            role: 'Marketing / Audiovisual',
            roleIcon: 'fa-bullhorn',
            description: 'Contribuye a la comunicación visual, la producción de materiales audiovisuales y la difusión del proyecto.',
            email: 'ronay.arturo.garcia.hernandez@pipgo.app',
            photo: 'assets/about/ronay-arturo-garcia-hernandez.webp'
        }
    ];

    /* =====================================================
       2) ESTADO INTERNO
       ===================================================== */
    let initialized = false;
    let rootEl = null;
    let lightboxEl = null;
    let lastFocusBeforeLightbox = null;

    /* =====================================================
       3) HELPERS
       ===================================================== */
    function el(html) {
        const t = document.createElement('template');
        t.innerHTML = html.trim();
        return t.content.firstElementChild;
    }

    function escapeHtml(s) {
        return Formatters && Formatters.escapeHtml
            ? Formatters.escapeHtml(s)
            : String(s == null ? '' : s)
                  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /**
     * Crea un contenedor con placeholder elegante.
     * Prueba extensiones en orden: webp → jpg → png.
     * Si todas fallan → queda el placeholder, sin imagen rota.
     *
     * ⚠️ NO usar loading="lazy" mientras la imagen está FUERA
     * del DOM (deadlock en algunos navegadores).
     */
    function createPhotoFrame({ src, alt, extraClass = '' }) {
        const frame = document.createElement('div');
        frame.className = 'about-photo-frame ' + extraClass;
        frame.innerHTML = `
            <div class="about-photo-placeholder">
                <i class="fa-solid fa-image" aria-hidden="true"></i>
                <span>Fotografía pendiente</span>
            </div>`;

        const img = new Image();
        img.alt = alt || '';
        img.decoding = 'async';
        img.className = 'about-photo-img';
        img.draggable = false;

        // Red de seguridad: estilos inline por si el CSS externo
        // no está listo cuando la imagen termina de cargar.
        img.style.position = 'absolute';
        img.style.top = '0';
        img.style.left = '0';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.objectPosition = 'center 25%';
        img.style.display = 'block';
        img.style.zIndex = '2';

        const candidates = _extensionCandidates(src);

        img.addEventListener('load', () => {
            frame.classList.add('loaded');
            if (!frame.contains(img)) frame.insertBefore(img, frame.firstChild);

            const ph = frame.querySelector('.about-photo-placeholder');
            if (ph) ph.style.display = 'none';
        });

        img.addEventListener('error', () => {
            const idx = _currentCandidateIndex(img.dataset.candidateIdx) + 1;
            if (idx < candidates.length) {
                img.dataset.candidateIdx = String(idx);
                img.src = _swapExtension(src, candidates[idx]);
            } else {
                frame.classList.add('error');
                // Nota: no logueamos en consola porque faltar fotos es
                // algo esperado durante el desarrollo. El placeholder
                // ya indica visualmente que falta esa imagen.
            }
        });

        img.dataset.candidateIdx = '0';
        img.src = _swapExtension(src, candidates[0]);

        return { frame, img };
    }

    /* ---------- Helpers de extensión ---------- */

    function _extensionCandidates(src) {
        // Reducido a 3 variantes para evitar ruido en consola.
        const m = /\.(webp|jpe?g|png)$/i.exec(src);
        const original = m ? m[1].toLowerCase() : 'webp';
        const order = ['webp', 'jpg', 'png'];
        return [original, ...order.filter(e => e !== original)];
    }

    function _swapExtension(src, ext) {
        const m = /\.(webp|jpe?g|png)$/i.exec(src);
        const base = m ? src.slice(0, m.index) : src;
        return base + '.' + ext;
    }

    function _currentCandidateIndex(val) {
        const n = parseInt(val, 10);
        return isFinite(n) && n >= 0 ? n : 0;
    }

    /* =====================================================
       4) RENDER · BLOQUES
       ===================================================== */
    function renderHero() {
        const wrapper = el(`
            <header class="about-hero">
                <div class="about-hero-top">
                    <button class="about-back" type="button" aria-label="Volver">
                        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                    </button>
                    <span class="about-eyebrow">
                        <i class="fa-solid fa-seedling" aria-hidden="true"></i>
                        Nuestra historia
                    </span>
                </div>

                <h1 class="about-title">
                    Detrás de PipGo hay
                    <span class="about-title-accent">una historia.</span>
                </h1>

                <p class="about-intro">
                    Lo que comenzó como una pequeña idea terminó convirtiéndose en algo
                    mucho más grande: un proyecto que nos enseñó a trabajar en equipo,
                    cuestionar nuestras ideas y encontrar nuevas formas de crear. Esta
                    es la historia de cómo PipGo encontró su camino y de las personas
                    que lo hicieron posible.
                </p>

                <span class="about-seed">
                    <i class="fa-solid fa-seedling" aria-hidden="true"></i>
                    Cada gran proyecto tiene un comienzo. El nuestro tuvo una semilla.
                </span>
            </header>`);

        wrapper.querySelector('.about-back').addEventListener('click', () => {
            if (window.history && history.length > 1) history.back();
            else if (window.NavigationUI) NavigationUI.switchView('perfil');
        });

        return wrapper;
    }

    function renderMemoriesCarousel() {
        const section = el(`
            <section class="about-section" aria-labelledby="about-memories-title">
                <div class="about-section-head">
                    <h2 id="about-memories-title">Nuestros primeros capítulos</h2>
                    <p>
                        Antes de que PipGo llegara a ser lo que es hoy, hubo ideas,
                        reuniones, aprendizajes y momentos que siempre formarán parte
                        de nuestra historia.
                    </p>
                </div>

                <div class="about-carousel">
                    <div class="about-carousel-track" role="list"></div>
                </div>

                <div class="about-carousel-foot">
                    <div class="about-dots" role="tablist" aria-label="Posición del carrusel"></div>
                    <div class="about-nav-btns">
                        <button class="about-nav-btn" type="button" data-nav="prev" aria-label="Foto anterior">
                            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                        </button>
                        <button class="about-nav-btn" type="button" data-nav="next" aria-label="Foto siguiente">
                            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
            </section>`);

        const track = section.querySelector('.about-carousel-track');
        const dotsWrap = section.querySelector('.about-dots');

        MEMORIES.forEach((mem, index) => {
            const card = el(`
                <article class="about-card" role="listitem" tabindex="0"
                         aria-label="${escapeHtml(mem.caption)}">
                    <div class="about-card-photo"></div>
                    <div class="about-card-body">
                        <span class="about-card-date">${escapeHtml(mem.date || '')}</span>
                        <p class="about-card-caption">${escapeHtml(mem.caption)}</p>
                    </div>
                </article>`);

            const photoWrap = card.querySelector('.about-card-photo');
            const { frame } = createPhotoFrame({
                src: mem.src,
                alt: mem.caption
            });
            frame.classList.add('about-card-photo-inner');
            photoWrap.appendChild(frame);

            const tag = el(`<span class="about-card-tag">Recuerdo ${String(index + 1).padStart(2, '0')}</span>`);
            photoWrap.appendChild(tag);

            const openLightbox = () => openAboutLightbox(mem.src, mem.caption);
            card.addEventListener('click', openLightbox);
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLightbox();
                }
            });

            track.appendChild(card);

            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'about-dot' + (index === 0 ? ' active' : '');
            dot.dataset.index = String(index);
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-label', `Ir al recuerdo ${index + 1}`);
            dot.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
            dot.addEventListener('click', () => {
                const card = track.children[index];
                if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
            });
            dotsWrap.appendChild(dot);
        });

        section.querySelectorAll('.about-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const dir = btn.dataset.nav === 'next' ? 1 : -1;
                const step = Math.max(1, Math.round(track.clientWidth / (track.children[0]?.offsetWidth || 1)));
                track.scrollBy({ left: dir * (track.children[0]?.offsetWidth || 300) * step, behavior: 'smooth' });
            });
        });

        let syncTicking = false;
        track.addEventListener('scroll', () => {
            if (syncTicking) return;
            syncTicking = true;
            requestAnimationFrame(() => {
                syncTicking = false;
                const center = track.scrollLeft + track.clientWidth / 2;
                let best = 0, bestDist = Infinity;
                Array.from(track.children).forEach((c, i) => {
                    const cCenter = c.offsetLeft + c.offsetWidth / 2;
                    const d = Math.abs(cCenter - center);
                    if (d < bestDist) { bestDist = d; best = i; }
                });
                dotsWrap.querySelectorAll('.about-dot').forEach((d, i) => {
                    const active = i === best;
                    d.classList.toggle('active', active);
                    d.setAttribute('aria-selected', active ? 'true' : 'false');
                });
                updateNavButtons(track, section);
            });
        }, { passive: true });

        requestAnimationFrame(() => updateNavButtons(track, section));

        return section;
    }

    function updateNavButtons(track, section) {
        const prev = section.querySelector('[data-nav="prev"]');
        const next = section.querySelector('[data-nav="next"]');
        if (!prev || !next) return;
        const maxScroll = track.scrollWidth - track.clientWidth;
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= maxScroll - 2;
    }

    function renderTimeline() {
        const section = el(`
            <section class="about-section" aria-labelledby="about-timeline-title">
                <div class="about-section-head">
                    <h2 id="about-timeline-title">La historia de PipGo</h2>
                    <p>
                        Cuatro capítulos que resumen cómo pasamos de imaginar un
                        videojuego a construir algo completamente distinto.
                    </p>
                </div>

                <div class="about-timeline"></div>
            </section>`);

        const tl = section.querySelector('.about-timeline');

        CHAPTERS.forEach(ch => {
            const paragraphsHtml = ch.paragraphs.map(p => `<p>${p}</p>`).join('');
            const quoteHtml = ch.quote
                ? `<p class="about-chapter-quote">“${escapeHtml(ch.quote)}”</p>`
                : '';

            const dateHtml = ch.date
                ? `<span class="about-chapter-date">${escapeHtml(ch.date)}</span>`
                : '';

            const chapter = el(`
                <article class="about-chapter">
                    <div class="about-chapter-meta">
                        <span class="about-chapter-num">${escapeHtml(ch.num)}</span>
                        ${dateHtml}
                    </div>
                    <h3 class="about-chapter-title">${escapeHtml(ch.title)}</h3>
                    ${paragraphsHtml}
                    ${quoteHtml}
                </article>`);

            tl.appendChild(chapter);
        });

        return section;
    }

    function renderLevelUp() {
        const section = el(`
            <section class="about-levelup" aria-labelledby="about-levelup-title">
                <span class="about-levelup-eyebrow">
                    <i class="fa-solid fa-star" aria-hidden="true"></i>
                    Recuerdo especial
                </span>

                <h2 id="about-levelup-title" class="about-levelup-title">
                    Un día que forma parte de nuestra historia
                </h2>

                <p class="about-levelup-text">
                    El 27 de agosto de 2026, PipGo tuvo su primera presentación
                    oficial en Level Up Digital, en la Universidad Tecnológica del
                    Usumacinta. Fue uno de esos momentos que nos recuerdan cuánto
                    puede cambiar una idea y hasta dónde puede llevarnos el trabajo
                    en equipo.
                </p>

                <div class="about-levelup-frame" tabindex="0" role="button"
                     aria-label="Ampliar la invitación oficial de Level Up Digital"></div>

                <div class="about-levelup-caption">
                    <span><i class="fa-solid fa-image" aria-hidden="true"></i> Invitación oficial del evento</span>
                    <span class="about-levelup-date">${escapeHtml(LEVEL_UP.date)}</span>
                </div>
            </section>`);

        const frameWrap = section.querySelector('.about-levelup-frame');
        const { frame } = createPhotoFrame({
            src: LEVEL_UP.src,
            alt: 'Invitación oficial de Level Up Digital',
            extraClass: 'about-levelup-frame-inner'
        });
        frameWrap.appendChild(frame);

        const openLb = () => openAboutLightbox(LEVEL_UP.src, LEVEL_UP.caption);
        frameWrap.addEventListener('click', openLb);
        frameWrap.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLb();
            }
        });

        return section;
    }

    /* ---------- Constructor de tarjeta de integrante ---------- */
    function buildTeamCard(member, { isAdvisor = false } = {}) {
        const card = el(`
            <article class="about-team-card${isAdvisor ? ' is-advisor' : ''}">
                <div class="about-team-photo" tabindex="0" role="button"
                     aria-label="Ampliar fotografía de ${escapeHtml(member.name)}"></div>
                <div class="about-team-body">
                    <span class="about-team-role">
                        <i class="fa-solid ${member.roleIcon || 'fa-user'}" aria-hidden="true"></i>
                        ${escapeHtml(member.role)}
                    </span>
                    <h3 class="about-team-name">${escapeHtml(member.name)}</h3>
                    <p class="about-team-desc">${escapeHtml(member.description)}</p>
                    <a class="about-team-mail" href="mailto:${escapeHtml(member.email)}"
                       aria-label="Enviar correo a ${escapeHtml(member.name)}">
                        <i class="fa-solid fa-envelope" aria-hidden="true"></i>
                        <span>${escapeHtml(member.email)}</span>
                    </a>
                </div>
            </article>`);

        const photoWrap = card.querySelector('.about-team-photo');
        const { frame } = createPhotoFrame({
            src: member.photo,
            alt: `Retrato de ${member.name}`,
            extraClass: 'about-team-photo-inner'
        });
        photoWrap.appendChild(frame);

        const openLb = () => openAboutLightbox(member.photo, member.name);
        photoWrap.addEventListener('click', openLb);
        photoWrap.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLb();
            }
        });

        return card;
    }

    function renderTeam() {
        const section = el(`
            <section class="about-section" aria-labelledby="about-team-title">
                <div class="about-section-head">
                    <h2 id="about-team-title">Las personas detrás del proyecto</h2>
                    <p>
                        PipGo es el resultado de distintas habilidades, perspectivas
                        y formas de aportar. Cada integrante cumple una función dentro
                        del equipo, pero todos formamos parte de una misma historia.
                    </p>
                </div>

                <div class="about-team-list"></div>
            </section>`);

        const list = section.querySelector('.about-team-list');

        // Equipo en orden Scrum: PO → SM → Equipo de Desarrollo
        TEAM.forEach(member => {
            list.appendChild(buildTeamCard(member));
        });

        // Al final, la asesora con estilo propio
        list.appendChild(buildTeamCard(ADVISOR, { isAdvisor: true }));

        return section;
    }

    function renderClosing() {
        return el(`
            <section class="about-closing" aria-label="Mensaje de cierre">
                <div class="about-closing-icon">
                    <i class="fa-solid fa-heart" aria-hidden="true"></i>
                </div>
                <p class="about-closing-message">
                    «Las ideas pueden cambiar de forma, pero la pasión por construir
                    algo que valga la pena puede llevarnos mucho más lejos de lo que
                    imaginábamos».
                </p>
                <p class="about-closing-sub">
                    PipGo sigue creciendo. Gracias por conocer la historia que hay detrás.
                </p>
            </section>`);
    }

    /* =====================================================
       5) LIGHTBOX
       ===================================================== */
    function buildLightbox() {
        const lb = el(`
            <div class="about-lightbox hidden" role="dialog" aria-modal="true"
                 aria-label="Imagen ampliada">
                <button class="about-lightbox-close" type="button" aria-label="Cerrar">
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
                <img class="about-lightbox-img" alt="">
                <p class="about-lightbox-caption"></p>
            </div>`);

        lb.querySelector('.about-lightbox-close').addEventListener('click', closeAboutLightbox);
        lb.addEventListener('click', (e) => {
            if (e.target === lb) closeAboutLightbox();
        });

        document.body.appendChild(lb);
        return lb;
    }

    function openAboutLightbox(src, caption) {
        if (!lightboxEl) return;
        lastFocusBeforeLightbox = document.activeElement;

        const imgEl = lightboxEl.querySelector('.about-lightbox-img');
        const capEl = lightboxEl.querySelector('.about-lightbox-caption');

        imgEl.src = src;
        imgEl.alt = caption || '';
        capEl.textContent = caption || '';

        lightboxEl.classList.remove('hidden');

        if (window.BodyLock) BodyLock.acquire();
        else document.body.style.overflow = 'hidden';

        if (window.FocusTrap) {
            FocusTrap.activate(lightboxEl, lightboxEl.querySelector('.about-lightbox-close'));
        }
        if (window.HapticsService) HapticsService.light();
    }

    function closeAboutLightbox() {
        if (!lightboxEl || lightboxEl.classList.contains('hidden')) return;
        lightboxEl.classList.add('hidden');

        const imgEl = lightboxEl.querySelector('.about-lightbox-img');
        imgEl.removeAttribute('src');
        imgEl.alt = '';

        if (window.BodyLock) BodyLock.release();
        else document.body.style.overflow = '';

        if (window.FocusTrap) FocusTrap.deactivate(lightboxEl);

        if (lastFocusBeforeLightbox && typeof lastFocusBeforeLightbox.focus === 'function') {
            try { lastFocusBeforeLightbox.focus(); } catch (e) {}
        }
        lastFocusBeforeLightbox = null;
    }

    function isLightboxOpen() {
        return lightboxEl && !lightboxEl.classList.contains('hidden');
    }

    /* =====================================================
       6) RENDER PRINCIPAL
       ===================================================== */
    function render() {
        if (!rootEl) return;

        const fragment = document.createDocumentFragment();
        const wrap = el('<div class="about"></div>');

        wrap.appendChild(renderHero());
        wrap.appendChild(renderMemoriesCarousel());
        wrap.appendChild(renderTimeline());
        wrap.appendChild(renderLevelUp());
        wrap.appendChild(renderTeam());
        wrap.appendChild(renderClosing());

        fragment.appendChild(wrap);
        rootEl.innerHTML = '';
        rootEl.appendChild(fragment);
    }

    /* =====================================================
       7) CICLO DE VIDA
       ===================================================== */
    function onEnter() {
        // Nada que recargar: la sección es estática.
    }

    function onLeave() {
        closeAboutLightbox();
    }

    /* =====================================================
       8) ESC GLOBAL
       ===================================================== */
    function handleKeydown(e) {
        if (e.key !== 'Escape') return;
        if (!isLightboxOpen()) return;

        e.preventDefault();
        e.stopImmediatePropagation();
        closeAboutLightbox();
    }

    /* =====================================================
       9) INIT
       ===================================================== */
    function init() {
        if (initialized) return;
        initialized = true;

        rootEl = document.getElementById('about-content');
        if (!rootEl) {
            Logger && Logger.warn && Logger.warn('AboutUI: #about-content no encontrado.');
            return;
        }

        lightboxEl = buildLightbox();
        render();

        document.addEventListener('keydown', handleKeydown, true);
    }

    /* =====================================================
       10) API PÚBLICA
       ===================================================== */
    window.AboutUI = {
        init,
        onEnter,
        onLeave,
        isLightboxOpen,
        closeLightbox: closeAboutLightbox,
        _data: { MEMORIES, CHAPTERS, LEVEL_UP, TEAM, ADVISOR }
    };
})();