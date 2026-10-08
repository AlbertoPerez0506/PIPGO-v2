/* =====================================================
   PIPGO · MESSAGING UI
   Inbox + chat overlay en tiempo real.
   - Abrir desde publicación: crea o reutiliza conversación
     y solo la primera vez inserta "Vi tu publicación de X."
   - Abrir desde Mensajes (vendedor seguido): abre chat
     SIN mensaje automático.
   - Buscador filtra vendedores seguidos.
   - Emoji picker estilo WhatsApp.
   - Apertura inmediata del overlay (sin esperas de red).
   ===================================================== */

(function () {
    'use strict';

    /* ---------- Estado ---------- */
    let initialized = false;

    // Inbox
    let searchInput, clearSearchBtn, contentEl;

    // Chat overlay
    let overlay, headerEl, backBtn, sellerInfoBtn,
        chatAvatar, chatUsername, chatRole,
        contextBanner, contextName, contextOpenBtn,
        messagesEl, newMessagesEl, newMessagesText,
        inputEl, sendBtn,
        messageMenuEl,
        emojiBtn, emojiPicker, emojiTabs, emojiScroll;

    // Emoji
    let recentEmojis = [];
    let currentEmojiCategory = 'smileys';

    // Token para cancelar aperturas concurrentes
    let openChatToken = 0;
    let openingSellerProfile = false;

    // Búsqueda en inbox
    let sellerSearchToken = 0;
    let inboxSearchDebounce = null;
    const INBOX_SEARCH_DEBOUNCE_MS = 200;
    let followedSellersCache = null; // { at, data }

    let conversations = [];
    let currentChat = {
        conversationId: null,
        otherUid: null,
        otherProfile: null,
        publicationContext: null,
        unsubscribe: null,
        messages: [],
        oldestCreatedAt: null,
        hasMore: true,
        loadedOnce: false,
        menuMessage: null,
        _savedSelection: null
    };

    let suppressPopstate = false;
    let chatHistoryPushed = false;
    let bodyLockPrev = '';

    /* =====================================================
       EMOJI CATALOG
       ===================================================== */
    const EMOJI_CATEGORIES = {
        smileys: {
            icon: 'fa-face-smile',
            label: 'Emociones',
            emojis: [
                '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
                '😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐',
                '🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒',
                '🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕',
                '😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱',
                '😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','🤡','🤖'
            ]
        },
        gestures: {
            icon: 'fa-hand',
            label: 'Gestos',
            emojis: [
                '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆',
                '👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','💪','💅',
                '👀','👁️','👅','👄','🧠','🫀','🫁','🦷','🦴'
            ]
        },
        hearts: {
            icon: 'fa-heart',
            label: 'Amor',
            emojis: [
                '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
                '💘','💝','💟','♥️','💋','💌','🌹','🌷','💐','🌸','🌺','🌻','🌼','🏵️'
            ]
        },
        animals: {
            icon: 'fa-paw',
            label: 'Animales',
            emojis: [
                '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈',
                '🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🦋',
                '🐌','🐞','🐜','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡',
                '🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🐘','🦛','🦏','🐪','🐫',
                '🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🐈','🐓'
            ]
        },
        food: {
            icon: 'fa-pizza-slice',
            label: 'Comida',
            emojis: [
                '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝',
                '🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐',
                '🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔',
                '🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲',
                '🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨',
                '🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛'
            ]
        },
        activities: {
            icon: 'fa-futbol',
            label: 'Actividades',
            emojis: [
                '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍',
                '🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌',
                '🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽',
                '🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹',
                '🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🪕','🎻','🎲','♟️',
                '🎯','🎳','🎮','🎰','🧩'
            ]
        },
        travel: {
            icon: 'fa-plane',
            label: 'Viajes',
            emojis: [
                '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🛴','🚲',
                '🛵','🏍️','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄',
                '🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁',
                '🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','⛽','🚧','🚦','🚥','🗺️','🗿','🗽','🗼',
                '🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️'
            ]
        },
        objects: {
            icon: 'fa-lightbulb',
            label: 'Objetos',
            emojis: [
                '⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🕹️','💽','💾','💿','📀','📼','📷','📸',
                '📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🧭','⏱️','⏲️','⏰','🕰️',
                '⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧯','💸','💵','💰','💳','💎','⚖️',
                '🔧','🔨','⚒️','🛠️','⛏️','🔩','⚙️','🧱','⛓️','🧲','🔫','💣','🧨','🪓','🔪','🗡️',
                '⚔️','🛡️','🏺','🔮','📿','🧿','💈','🔭','🔬','🩹','🩺','💊','💉','🧬','🦠','🧪',
                '🌡️','🧹','🧺','🧻','🚽','🚿','🛁','🧼','🪥','🪒','🧽','🧴','🔑','🗝️','🚪','🪑'
            ]
        },
        symbols: {
            icon: 'fa-star',
            label: 'Símbolos',
            emojis: [
                '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
                '☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋',
                '♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶',
                '✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘',
                '❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭',
                '❗','❕','❓','❔','‼️','⁉️','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','💹','❇️','✳️'
            ]
        }
    };

    /* ---------- Utils ---------- */
    function isNearBottom(el, threshold = 80) {
        if (!el) return true;
        return (el.scrollHeight - el.scrollTop - el.clientHeight) < threshold;
    }

    function scrollToBottom(behavior = 'auto') {
        if (!messagesEl) return;
        messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior });
    }

    function two(n) { return n < 10 ? '0' + n : '' + n; }

    function formatDayHeader(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const now = new Date();
        const sameDay = d.toDateString() === now.toDateString();
        if (sameDay) return 'Hoy';
        const yest = new Date(now); yest.setDate(now.getDate() - 1);
        if (d.toDateString() === yest.toDateString()) return 'Ayer';
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function formatHour(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return `${two(d.getHours())}:${two(d.getMinutes())}`;
    }

    function timeAgoShort(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const diff = Date.now() - d.getTime();
        if (diff < 60_000) return 'ahora';
        if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min`;
        if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)} h`;
        return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    }

    function avatarHtml(url, fallbackIcon = 'fa-user') {
        if (url) {
            return `<img src="${Formatters.safeUrl(url)}" alt="">`;
        }
        return `<i class="fa-solid ${fallbackIcon}"></i>`;
    }

    /* =====================================================
       ENTRAR A LA VISTA MENSAJES
       ===================================================== */
    async function onEnterMessaging() {
        // Reset del buscador al entrar
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            clearSearchBtn.classList.remove('visible');
        }
        followedSellersCache = null;

        renderSkeleton();
        if (!AppState.currentUser) {
            renderVisitorState();
            return;
        }
        try {
            conversations = await ConversationService.listConversationsForUser(AppState.currentUser.uid, 30);
            renderInbox();
        } catch (e) {
            Logger.error('MessagingUI.onEnterMessaging', e);
            renderInboxError();
        }
    }

    function renderSkeleton() {
        contentEl.innerHTML = `
            <div class="msg-skel-list">
                ${Array.from({ length: 4 }).map(() => `
                    <div class="msg-skel-row">
                        <div class="msg-skel-avatar"></div>
                        <div class="msg-skel-body">
                            <div class="msg-skel-line w-40"></div>
                            <div class="msg-skel-line w-80"></div>
                        </div>
                    </div>`).join('')}
            </div>`;
    }

    function renderInboxError() {
        contentEl.innerHTML = `
            <div class="msg-empty">
                <div class="msg-empty-icon"><i class="fa-solid fa-cloud-exclamation"></i></div>
                <h4>No pudimos cargar tus mensajes</h4>
                <p>Revisa tu conexión e inténtalo de nuevo.</p>
            </div>`;
    }

    function renderVisitorState() {
        contentEl.innerHTML = `
            <div class="msg-empty">
                <div class="msg-empty-icon"><i class="fa-solid fa-comments"></i></div>
                <h4>Inicia sesión para ver tus mensajes</h4>
                <p>Cuando contactes a un vendedor, tus conversaciones aparecerán aquí.</p>
                <button class="btn-primary" id="msg-go-auth" type="button">
                    <i class="fa-solid fa-right-to-bracket"></i> Iniciar sesión
                </button>
            </div>`;
        const b = document.getElementById('msg-go-auth');
        if (b) b.addEventListener('click', () => AuthUI.openAuthModal('login'));
    }

    function renderInboxEmpty() {
        contentEl.innerHTML = `
            <div class="msg-empty">
                <div class="msg-empty-icon"><i class="fa-solid fa-comment-dots"></i></div>
                <h4>Aún no tienes conversaciones</h4>
                <p>Cuando contactes a un vendedor, aparecerá aquí.</p>
            </div>`;
    }

    function renderNoFollowedSellers() {
        contentEl.innerHTML = `
            <div class="msg-empty">
                <div class="msg-empty-icon"><i class="fa-solid fa-user-plus"></i></div>
                <h4>Aún no sigues vendedores</h4>
                <p>Sigue a un vendedor desde su perfil para iniciar una conversación desde aquí.</p>
                <button class="btn-primary" id="msg-explore-sellers" type="button">
                    <i class="fa-solid fa-magnifying-glass"></i> Explorar vendedores
                </button>
            </div>`;
        const b = document.getElementById('msg-explore-sellers');
        if (b) b.addEventListener('click', () => NavigationUI.switchView('search'));
    }

    function renderNoSellerResults(query) {
        contentEl.innerHTML = `
            <div class="msg-empty">
                <div class="msg-empty-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
                <h4>Sin coincidencias</h4>
                <p>Ningún vendedor seguido coincide con "${Formatters.escapeHtml(query)}".</p>
            </div>`;
    }

    function renderInbox() {
        if (!conversations.length) { renderInboxEmpty(); return; }

        const list = document.createElement('div');
        list.className = 'msg-inbox';

        conversations.forEach(conv => {
            list.appendChild(buildConversationRow(conv));
        });

        contentEl.innerHTML = '';
        contentEl.appendChild(list);
    }

    function buildConversationRow(conv) {
        const otherUid = ConversationService.otherParticipantId(conv, AppState.currentUser.uid);
        const expired = ConversationService.isLastMessageExpired(conv);
        const unread = ConversationService.hasUnread(conv, AppState.currentUser.uid);

        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'msg-row' + (unread ? ' unread' : '');
        row.dataset.convId = conv.id;
        row.dataset.otherUid = otherUid || '';

        row.innerHTML = `
            <div class="msg-avatar">
                <i class="fa-solid fa-user"></i>
            </div>
            <div class="msg-body">
                <div class="msg-body-top">
                    <span class="msg-username" data-uid="${otherUid}">@—</span>
                    <span class="msg-time">${timeAgoShort(conv.lastMessageAt)}</span>
                </div>
                <div class="msg-preview">${expired ? 'Sin mensajes recientes' : (Formatters.escapeHtml(conv.lastMessage || '…'))}</div>
            </div>
            ${unread ? '<span class="msg-unread-dot"></span>' : ''}
        `;

        row.addEventListener('click', () => {
            openChat({ conversationId: conv.id, otherUid });
        });

        // Hidratar identidad pública (cache) sin bloquear el click
        if (otherUid) {
            SellerProfileService.getPublicProfile(otherUid).then(profile => {
                if (!profile) return;
                const avatarEl = row.querySelector('.msg-avatar');
                const userEl = row.querySelector('.msg-username');
                if (profile.avatarUrl && avatarEl) avatarEl.innerHTML = avatarHtml(profile.avatarUrl);
                if (profile.username && userEl) {
                    userEl.textContent = '@' + profile.username;
                }
            }).catch(() => {});
        }

        return row;
    }

    /* =====================================================
       BÚSQUEDA — SOLO VENDEDORES SEGUIDOS
       ===================================================== */
    async function getFollowedSellersCached() {
        if (!AppState.currentUser) return [];
        if (followedSellersCache && (Date.now() - followedSellersCache.at) < 30_000) {
            return followedSellersCache.data;
        }
        const data = await FollowService.getFollowingProfiles(AppState.currentUser.uid);
        followedSellersCache = { at: Date.now(), data };
        return data;
    }

    function onSearchInput() {
        const q = (searchInput.value || '').trim();
        clearSearchBtn.classList.toggle('visible', !!q);

        if (!q) {
            sellerSearchToken++;
            renderInbox();
            return;
        }

        if (!AppState.currentUser) {
            sellerSearchToken++;
            renderVisitorState();
            return;
        }

        if (inboxSearchDebounce) clearTimeout(inboxSearchDebounce);
        inboxSearchDebounce = setTimeout(() => runSellerSearch(q), INBOX_SEARCH_DEBOUNCE_MS);
    }

    async function runSellerSearch(query) {
        const token = ++sellerSearchToken;
        renderSkeleton();

        try {
            const all = await getFollowedSellersCached();
            if (token !== sellerSearchToken) return;

            if (!all.length) {
                renderNoFollowedSellers();
                return;
            }

            const norm = query.toLowerCase().replace(/^@/, '');
            const filtered = all.filter(s =>
                (s.username || '').toLowerCase().includes(norm) ||
                (s.displayName || '').toLowerCase().includes(norm) ||
                (s.businessName || '').toLowerCase().includes(norm)
            );

            if (token !== sellerSearchToken) return;

            if (!filtered.length) {
                renderNoSellerResults(query);
                return;
            }

            renderFollowedSellersResults(filtered);
        } catch (e) {
            if (token !== sellerSearchToken) return;
            Logger.error('runSellerSearch', e);
            renderInboxError();
        }
    }

    function renderFollowedSellersResults(sellers) {
        const list = document.createElement('div');
        list.className = 'msg-inbox';

        sellers.forEach(seller => {
            list.appendChild(buildFollowedSellerRow(seller));
        });

        contentEl.innerHTML = '';
        contentEl.appendChild(list);
    }

    function buildFollowedSellerRow(seller) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'msg-row';
        row.dataset.otherUid = seller.uid;

        const avatarHtml_ = seller.avatarUrl
            ? `<img src="${Formatters.safeUrl(seller.avatarUrl)}" alt="">`
            : `<i class="fa-solid fa-user"></i>`;

        const name = seller.displayName || seller.businessName || '';
        const category = seller.category || '';

        row.innerHTML = `
            <div class="msg-avatar">${avatarHtml_}</div>
            <div class="msg-body">
                <div class="msg-body-top">
                    <span class="msg-username">@${Formatters.escapeHtml(seller.username || '')}</span>
                </div>
                <div class="msg-preview">
                    ${name ? Formatters.escapeHtml(name) : ''}
                    ${category ? `${name ? ' · ' : ''}${Formatters.escapeHtml(category)}` : ''}
                </div>
            </div>
            <i class="fa-solid fa-comment-dots msg-row-cta" aria-hidden="true"></i>
        `;

        row.addEventListener('click', () => {
            openChat({ otherUid: seller.uid });
        });

        return row;
    }

    /* =====================================================
       ABRIR CHAT
       ===================================================== */
    async function openChat({ conversationId, otherUid, publicationContext = null, fromPublication = false } = {}) {
        if (!AppState.currentUser) {
            AuthUI.openAuthModal('login');
            return;
        }

        const myToken = ++openChatToken;

        closeEmojiPicker();
        closeMessageMenu();

        currentChat.otherUid = otherUid || null;
        currentChat.publicationContext = publicationContext;
        currentChat.messages = [];
        currentChat.oldestCreatedAt = null;
        currentChat.hasMore = true;
        currentChat.loadedOnce = false;
        currentChat.otherProfile = null;
        currentChat._savedSelection = null;

        messagesEl.innerHTML = `<div class="chat-loading"><i class="fa-solid fa-spinner fa-spin"></i> Abriendo conversación…</div>`;
        inputEl.value = '';
        autoResizeInput();
        renderContextBanner();
        renderChatHeader();
        newMessagesEl.classList.add('hidden');

        // Mostrar el overlay YA, sin ningún await previo
        openOverlay();
        if (window.HapticsService) HapticsService.light();

        // Resolver otherUid si no lo tenemos (fallback).
        if (!otherUid && conversationId) {
            const local = conversations.find(c => c.id === conversationId);
            if (local) {
                otherUid = ConversationService.otherParticipantId(local, AppState.currentUser.uid);
            } else {
                try {
                    const fetched = await ConversationService.getConversation(conversationId);
                    if (myToken !== openChatToken) return;
                    if (fetched) {
                        otherUid = ConversationService.otherParticipantId(fetched, AppState.currentUser.uid);
                    }
                } catch (e) { /* silent */ }
            }
            if (myToken !== openChatToken) return;
            if (otherUid) {
                currentChat.otherUid = otherUid;
                renderChatHeader();
            }
        }

        if (!otherUid) {
            Toast.error('No pudimos abrir la conversación.');
            if (myToken === openChatToken) closeOverlay();
            return;
        }

        // NUEVO: impedir abrir una conversación consigo mismo
        if (otherUid === AppState.currentUser.uid) {
            Toast.info('No puedes abrir una conversación contigo mismo.');
            if (myToken === openChatToken) closeOverlay();
            return;
        }

        // Cargar perfil del vendedor (background)
        if (window.SellerProfileService && otherUid) {
            try {
                const profile = await SellerProfileService.getPublicProfile(otherUid);
                if (myToken !== openChatToken) return;
                if (currentChat.otherUid === otherUid) {
                    currentChat.otherProfile = profile;
                    renderChatHeader();
                }
            } catch (e) { /* silent */ }
        }

        if (myToken !== openChatToken) return;

        // Crear conversación si no existe
        if (!conversationId) {
            try {
                const { conversation, created } = await ConversationService.getOrCreateConversation(
                    AppState.currentUser.uid, otherUid
                );
                if (myToken !== openChatToken) return;
                currentChat.conversationId = conversation.id;

                // Retry del mensaje contextual: se envía si la conversación
                // fue creada ahora o si existe pero está vacía.
                const conversationIsEmpty = created || !conversation.lastMessage;

                if (fromPublication && conversationIsEmpty &&
                    publicationContext && publicationContext.id && publicationContext.name) {
                    try {
                        await MessageService.sendMessage(conversation.id, {
                            senderId: AppState.currentUser.uid,
                            text: `Vi tu publicación de ${publicationContext.name}.`,
                            type: 'publication_context',
                            publicationId: publicationContext.id,
                            publicationName: publicationContext.name
                        });
                    } catch (e) {
                        Logger.error('Mensaje contextual falló', e);
                    }
                }
            } catch (e) {
                Logger.error('openChat getOrCreate', e);
                if (myToken === openChatToken) {
                    Toast.error('No pudimos abrir la conversación.');
                    closeOverlay();
                }
                return;
            }
        } else {
            currentChat.conversationId = conversationId;
        }

        if (myToken !== openChatToken) return;

        MessageService.cleanupExpiredMessages(currentChat.conversationId).catch(() => {});
        subscribeCurrentChat();
        ConversationService.markAsRead(currentChat.conversationId, AppState.currentUser.uid).catch(() => {});
    }

    /**
     * Punto de entrada usado por Product Sheet y Seller Profile.
     */
    async function openChatWith(sellerUid, { fromPublication = false, publicationContext = null } = {}) {
        if (!sellerUid) { Toast.warning('Vendedor no disponible.'); return; }

        // NUEVO: impedir auto-mensaje
        if (AppState.currentUser && sellerUid === AppState.currentUser.uid) {
            Toast.info('No puedes enviarte mensajes a ti mismo.');
            return;
        }

        if (!AppState.currentUser) {
            AppState.pendingAction = {
                type: 'openChatWith',
                sellerUid,
                fromPublication,
                publicationContext
            };
            AuthUI.openAuthModal('login');
            Toast.info('Inicia sesión para contactar al vendedor.');
            return;
        }
        return openChat({ otherUid: sellerUid, publicationContext, fromPublication });
    }

    function renderChatHeader() {
        const profile = currentChat.otherProfile || {};
        const username = profile.username ? '@' + profile.username : '@…';
        chatUsername.textContent = username;
        chatRole.textContent = 'Vendedor';
        chatAvatar.innerHTML = avatarHtml(profile.avatarUrl, 'fa-user');
    }

    function renderContextBanner() {
        const ctx = currentChat.publicationContext;
        if (ctx && ctx.id && ctx.name) {
            contextBanner.classList.remove('hidden');
            contextName.textContent = ctx.name;
        } else {
            contextBanner.classList.add('hidden');
        }
    }

    function subscribeCurrentChat() {
        if (currentChat.unsubscribe) {
            try { currentChat.unsubscribe(); } catch (e) {}
            currentChat.unsubscribe = null;
        }
        currentChat.unsubscribe = MessageService.subscribeMessages(
            currentChat.conversationId,
            {
                onChange: (list) => handleMessagesChange(list),
                onError: () => Toast.error('No pudimos actualizar el chat.')
            }
        );
    }

    function handleMessagesChange(rawList) {
        const uid = AppState.currentUser.uid;

        const visible = rawList.filter(m =>
            !MessageService.isExpired(m) &&
            !(Array.isArray(m.hiddenFor) && m.hiddenFor.includes(uid))
        );

        const wasAtBottom = isNearBottom(messagesEl, 120);
        const hadMessages = currentChat.messages.length > 0;
        const prevLastId = hadMessages ? currentChat.messages[currentChat.messages.length - 1].id : null;

        currentChat.messages = visible;
        if (visible.length) {
            currentChat.oldestCreatedAt = visible[0].createdAt;
        }

        renderMessages({ preserveScroll: hadMessages && !wasAtBottom });

        const newLastId = visible.length ? visible[visible.length - 1].id : null;
        const incoming = newLastId && newLastId !== prevLastId;

        if (incoming) {
            if (wasAtBottom) {
                scrollToBottom('smooth');
                if (window.HapticsService) HapticsService.light();
            } else {
                showNewMessagePill();
            }
        }

        if (incoming && wasAtBottom) {
            ConversationService.markAsRead(currentChat.conversationId, uid).catch(() => {});
        }
    }

    function showNewMessagePill() {
        newMessagesText.textContent = '1 mensaje nuevo';
        newMessagesEl.classList.remove('hidden');
    }

    function hideNewMessagePill() {
        newMessagesEl.classList.add('hidden');
    }

    /* =====================================================
       RENDER DE MENSAJES
       ===================================================== */
    function renderMessages({ preserveScroll = false } = {}) {
        const prevScrollHeight = preserveScroll ? messagesEl.scrollHeight : 0;
        const prevScrollTop = preserveScroll ? messagesEl.scrollTop : 0;

        messagesEl.innerHTML = '';

        if (!currentChat.messages.length) {
            const empty = document.createElement('div');
            empty.className = 'chat-empty';
            empty.innerHTML = `
                <div class="chat-empty-icon"><i class="fa-regular fa-comments"></i></div>
                <p>Inicia la conversación.</p>`;
            messagesEl.appendChild(empty);
            return;
        }

        let lastDay = '';
        currentChat.messages.forEach(msg => {
            const day = formatDayHeader(msg.createdAt);
            if (day !== lastDay) {
                const sep = document.createElement('div');
                sep.className = 'chat-day-sep';
                sep.textContent = day;
                messagesEl.appendChild(sep);
                lastDay = day;
            }
            messagesEl.appendChild(buildMessageBubble(msg));
        });

        if (preserveScroll) {
            const newScrollHeight = messagesEl.scrollHeight;
            messagesEl.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
        } else {
            scrollToBottom('auto');
        }
    }

    function buildMessageBubble(msg) {
        const uid = AppState.currentUser.uid;
        const isOwn = msg.senderId === uid;
        const wrap = document.createElement('div');
        wrap.className = 'chat-msg ' + (isOwn ? 'own' : 'other');
        wrap.dataset.msgId = msg.id;

        if (msg.deletedForEveryone) {
            wrap.classList.add('deleted');
            wrap.innerHTML = `
                <div class="chat-bubble">
                    <em>Este mensaje fue eliminado</em>
                    <span class="chat-time">${formatHour(msg.createdAt)}</span>
                </div>`;
            return wrap;
        }

        const text = Formatters.escapeHtml(msg.text || '');
        const editedTag = msg.edited ? ' <span class="chat-edited">Editado</span>' : '';
        wrap.innerHTML = `
            <div class="chat-bubble">
                <span class="chat-text">${text}</span>
                <span class="chat-time">${formatHour(msg.createdAt)}${editedTag}</span>
            </div>`;

        if (msg.type === 'publication_context' && msg.publicationName) {
            const ref = document.createElement('div');
            ref.className = 'chat-context-mini';
            ref.innerHTML = `<i class="fa-solid fa-tag"></i> ${Formatters.escapeHtml(msg.publicationName)}`;
            wrap.querySelector('.chat-bubble').appendChild(ref);
        }

        wrap.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openMessageMenu(msg, e.clientX, e.clientY);
        });

        let pressTimer = null;
        wrap.addEventListener('touchstart', (e) => {
            pressTimer = setTimeout(() => {
                const t = e.touches[0];
                openMessageMenu(msg, t.clientX, t.clientY);
            }, 450);
        }, { passive: true });
        ['touchend','touchmove','touchcancel'].forEach(ev =>
            wrap.addEventListener(ev, () => clearTimeout(pressTimer), { passive: true })
        );

        return wrap;
    }

    /* =====================================================
       MENÚ CONTEXTUAL
       ===================================================== */
    function openMessageMenu(msg, x, y) {
        closeEmojiPicker();
        currentChat.menuMessage = msg;
        const isOwn = msg.senderId === AppState.currentUser.uid;
        const canEdit = isOwn && !msg.deletedForEveryone && !MessageService.isExpired(msg);

        messageMenuEl.innerHTML = '';
        const mk = (action, icon, label, danger) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.dataset.action = action;
            b.className = danger ? 'danger' : '';
            b.innerHTML = `<i class="fa-solid ${icon}"></i> ${label}`;
            b.addEventListener('click', () => handleMenuAction(action));
            return b;
        };

        messageMenuEl.appendChild(mk('copy', 'fa-copy', 'Copiar'));
        if (canEdit) {
            messageMenuEl.appendChild(mk('edit', 'fa-pen', 'Editar'));
        }
        messageMenuEl.appendChild(mk('delete-me', 'fa-eye-slash', 'Eliminar para mí'));
        if (isOwn) {
            messageMenuEl.appendChild(mk('delete-all', 'fa-trash', 'Eliminar para todos', true));
        }

        messageMenuEl.classList.remove('hidden');

        const rect = messageMenuEl.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 12;
        const maxY = window.innerHeight - rect.height - 12;
        messageMenuEl.style.left = Math.min(x, maxX) + 'px';
        messageMenuEl.style.top = Math.min(y, maxY) + 'px';
    }

    function closeMessageMenu() {
        messageMenuEl.classList.add('hidden');
        currentChat.menuMessage = null;
    }

    async function handleMenuAction(action) {
        const msg = currentChat.menuMessage;
        if (!msg) return;
        const uid = AppState.currentUser.uid;

        closeMessageMenu();

        try {
            if (action === 'copy') {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(msg.text || '');
                    Toast.success('Mensaje copiado.');
                } else {
                    Toast.warning('No se pudo copiar.');
                }
            } else if (action === 'edit') {
                openEditFlow(msg);
            } else if (action === 'delete-me') {
                await MessageService.deleteForMe(currentChat.conversationId, msg.id, uid);
                Toast.success('Mensaje oculto.');
            } else if (action === 'delete-all') {
                const ok = await ConfirmDialog.open({
                    title: 'Eliminar mensaje',
                    text: '¿Eliminar este mensaje para todos?',
                    okText: 'Eliminar',
                    cancelText: 'Cancelar',
                    danger: true
                });
                if (!ok) return;
                await MessageService.deleteForEveryone(currentChat.conversationId, msg.id, uid);
                Toast.success('Mensaje eliminado.');
            }
        } catch (e) {
            Logger.error('handleMenuAction', e);
            Toast.error(ErrorHandler.toUserMessage(e, { context: 'messaging.menu' }));
        }
    }

    function openEditFlow(msg) {
        const current = msg.text || '';
        const newText = window.prompt('Editar mensaje:', current);
        if (newText == null) return;
        const check = MessageService.sanitizeText(newText);
        if (!check.valid) { Toast.error(check.error); return; }

        MessageService.editMessage(
            currentChat.conversationId, msg.id, AppState.currentUser.uid, check.value
        ).then(() => Toast.success('Mensaje actualizado.'))
         .catch((e) => Toast.error(ErrorHandler.toUserMessage(e, { context: 'messaging.edit' })));
    }

    /* =====================================================
       EMOJI PICKER
       ===================================================== */
    function createEmojiPicker() {
        const composer = overlay.querySelector('.chat-composer');
        if (!composer) return;

        const btn = document.createElement('button');
        btn.id = 'chat-emoji-btn';
        btn.className = 'chat-emoji-btn';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Abrir emojis');
        btn.innerHTML = '<i class="fa-regular fa-face-smile"></i>';
        composer.insertBefore(btn, composer.firstChild);

        const picker = document.createElement('div');
        picker.id = 'chat-emoji-picker';
        picker.className = 'chat-emoji-picker hidden';
        picker.innerHTML = `
            <div class="chat-emoji-tabs" id="chat-emoji-tabs"></div>
            <div class="chat-emoji-scroll" id="chat-emoji-scroll"></div>
        `;
        composer.insertAdjacentElement('beforebegin', picker);

        emojiBtn = btn;
        emojiPicker = picker;
        emojiTabs = picker.querySelector('#chat-emoji-tabs');
        emojiScroll = picker.querySelector('#chat-emoji-scroll');
    }

    function initEmojiPicker() {
        if (!emojiBtn || !emojiPicker) return;

        recentEmojis = Storage.get('msg_recent_emojis', []) || [];
        if (!Array.isArray(recentEmojis)) recentEmojis = [];

        renderEmojiTabs();
        renderEmojiCategory(currentEmojiCategory);

        emojiTabs.addEventListener('click', (e) => {
            e.stopPropagation();
            const btn = e.target.closest('[data-cat]');
            if (!btn) return;
            const newCat = btn.dataset.cat;
            if (newCat === currentEmojiCategory) return;
            currentEmojiCategory = newCat;
            emojiTabs.querySelectorAll('.emoji-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.cat === currentEmojiCategory);
            });
            renderEmojiCategory(currentEmojiCategory);
        });

        emojiScroll.addEventListener('click', (e) => {
            e.stopPropagation();
            const cell = e.target.closest('[data-emoji]');
            if (!cell) return;
            insertEmoji(cell.dataset.emoji);
        });

        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleEmojiPicker();
        });

        document.addEventListener('click', (e) => {
            if (emojiPicker.classList.contains('hidden')) return;
            if (emojiPicker.contains(e.target)) return;
            if (emojiBtn.contains(e.target)) return;
            closeEmojiPicker();
        });

        inputEl.addEventListener('focus', () => {
            if (!emojiPicker.classList.contains('hidden')) {
                closeEmojiPicker();
            }
        });

        if (window.visualViewport) {
            const onVVResize = () => {
                const vv = window.visualViewport;
                const keyboardOpen = vv.height < window.innerHeight - 150;
                if (keyboardOpen && !emojiPicker.classList.contains('hidden')) {
                    emojiPicker.classList.add('hidden');
                    emojiBtn.classList.remove('active');
                    overlay.classList.remove('emoji-open');
                    updateEmojiBtnIcon();
                }
            };
            window.visualViewport.addEventListener('resize', onVVResize);
        }
    }

    function renderEmojiTabs() {
        const cats = [];
        if (recentEmojis.length) {
            cats.push({ key: 'recent', icon: 'fa-clock-rotate-left' });
        }
        Object.entries(EMOJI_CATEGORIES).forEach(([key, data]) => {
            cats.push({ key, icon: data.icon });
        });

        emojiTabs.innerHTML = cats.map(c => `
            <button class="emoji-tab${c.key === currentEmojiCategory ? ' active' : ''}"
                    data-cat="${c.key}" type="button" aria-label="${c.key}">
                <i class="fa-solid ${c.icon}"></i>
            </button>
        `).join('');
    }

    function renderEmojiCategory(catKey) {
        let emojis;
        if (catKey === 'recent') {
            emojis = recentEmojis;
        } else {
            const cat = EMOJI_CATEGORIES[catKey];
            emojis = cat ? cat.emojis : [];
        }
        emojiScroll.innerHTML = emojis.map(e =>
            `<button class="emoji-cell" data-emoji="${e}" type="button" aria-label="${e}">${e}</button>`
        ).join('');
        emojiScroll.scrollTop = 0;
    }

    function insertEmoji(emoji) {
        if (!inputEl) return;

        let start, end;
        if (currentChat._savedSelection) {
            start = currentChat._savedSelection.start;
            end = currentChat._savedSelection.end;
        } else {
            start = (typeof inputEl.selectionStart === 'number') ? inputEl.selectionStart : inputEl.value.length;
            end = (typeof inputEl.selectionEnd === 'number') ? inputEl.selectionEnd : inputEl.value.length;
        }

        const before = inputEl.value.slice(0, start);
        const after = inputEl.value.slice(end);
        inputEl.value = before + emoji + after;
        const newPos = start + emoji.length;

        currentChat._savedSelection = { start: newPos, end: newPos };

        try { inputEl.setSelectionRange(newPos, newPos); } catch (e) {}

        autoResizeInput();

        const wasEmptyRecents = recentEmojis.length === 0;
        recentEmojis = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 24);
        Storage.set('msg_recent_emojis', recentEmojis);

        if (wasEmptyRecents) {
            renderEmojiTabs();
        }
        if (currentEmojiCategory === 'recent') {
            renderEmojiCategory('recent');
        }

        if (window.HapticsService) HapticsService.light();
    }

    function toggleEmojiPicker() {
        if (emojiPicker.classList.contains('hidden')) {
            openEmojiPicker();
        } else {
            closeEmojiPicker();
        }
    }

    function openEmojiPicker() {
        closeMessageMenu();

        if (document.activeElement === inputEl) {
            currentChat._savedSelection = {
                start: inputEl.selectionStart,
                end: inputEl.selectionEnd
            };
        } else if (!currentChat._savedSelection) {
            currentChat._savedSelection = {
                start: inputEl.value.length,
                end: inputEl.value.length
            };
        }

        inputEl.blur();

        emojiPicker.classList.remove('hidden');
        emojiBtn.classList.add('active');
        overlay.classList.add('emoji-open');
        updateEmojiBtnIcon();

        if (isNearBottom(messagesEl, 120)) {
            requestAnimationFrame(() => scrollToBottom('auto'));
        }
    }

    function closeEmojiPicker() {
        if (!emojiPicker) return;
        emojiPicker.classList.add('hidden');
        if (emojiBtn) emojiBtn.classList.remove('active');
        if (overlay) overlay.classList.remove('emoji-open');
        updateEmojiBtnIcon();
    }

    function updateEmojiBtnIcon() {
        if (!emojiBtn) return;
        if (emojiPicker.classList.contains('hidden')) {
            emojiBtn.innerHTML = '<i class="fa-regular fa-face-smile"></i>';
            emojiBtn.setAttribute('aria-label', 'Abrir emojis');
        } else {
            emojiBtn.innerHTML = '<i class="fa-regular fa-keyboard"></i>';
            emojiBtn.setAttribute('aria-label', 'Cerrar emojis');
        }
    }

    /* =====================================================
       ENVIAR
       ===================================================== */
    function autoResizeInput() {
        if (!inputEl) return;
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(Math.max(inputEl.scrollHeight, 44), 120) + 'px';
    }

    async function sendCurrent() {
        const raw = inputEl.value || '';
        const check = MessageService.sanitizeText(raw);
        if (!check.valid) {
            if (raw.trim() === '') return;
            Toast.warning(check.error);
            return;
        }
        if (!currentChat.conversationId) return;

        sendBtn.disabled = true;
        inputEl.value = '';
        currentChat._savedSelection = null;
        autoResizeInput();

        if (!emojiPicker.classList.contains('hidden')) {
            closeEmojiPicker();
        }

        try {
            await MessageService.sendMessage(currentChat.conversationId, {
                senderId: AppState.currentUser.uid,
                text: check.value
            });

            if (window.HapticsService) HapticsService.light();

            scrollToBottom('smooth');
            hideNewMessagePill();
        } catch (e) {
            Logger.error('sendCurrent', e);
            Toast.error(ErrorHandler.toUserMessage(e, { context: 'messaging.send' }));
            inputEl.value = check.value;
            autoResizeInput();
        } finally {
            sendBtn.disabled = false;
        }
    }

    /* =====================================================
       OVERLAY / NAV
       ===================================================== */
    function openOverlay() {
        overlay.classList.remove('hidden');
        bodyLockPrev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        if (!chatHistoryPushed) {
            history.pushState({ view: AppState.currentView, overlay: 'chat' }, '', '');
            chatHistoryPushed = true;
        }
    }

    function closeOverlay(syncHistory = true) {
        closeEmojiPicker();
        closeMessageMenu();
        overlay.classList.add('hidden');
        document.body.style.overflow = bodyLockPrev || '';
        bodyLockPrev = '';

        if (currentChat.unsubscribe) {
            try { currentChat.unsubscribe(); } catch (e) {}
            currentChat.unsubscribe = null;
        }

        // NUEVO: resetear contexto de chat
        currentChat.conversationId = null;
        currentChat.otherUid = null;
        currentChat.otherProfile = null;
        currentChat.publicationContext = null;
        currentChat.messages = [];
        currentChat.oldestCreatedAt = null;
        currentChat.hasMore = true;
        currentChat.loadedOnce = false;

        if (chatHistoryPushed) {
            chatHistoryPushed = false;
            if (syncHistory) {
                suppressPopstate = true;
                try { history.back(); } catch (e) {}
            }
        }

        if (AppState.currentView === 'messaging') onEnterMessaging();
    }

    /* =====================================================
       INIT
       ===================================================== */
    function init() {
        if (initialized) return;
        initialized = true;

        searchInput = document.getElementById('messaging-search-input');
        clearSearchBtn = document.getElementById('messaging-clear-search');
        contentEl = document.getElementById('messaging-content');

        overlay = document.getElementById('chat-overlay');
        headerEl = document.getElementById('chat-header');
        backBtn = document.getElementById('chat-back');
        sellerInfoBtn = document.getElementById('chat-seller-info');
        chatAvatar = document.getElementById('chat-avatar');
        chatUsername = document.getElementById('chat-seller-username');
        chatRole = document.getElementById('chat-seller-role');
        contextBanner = document.getElementById('chat-context-banner');
        contextName = document.getElementById('chat-context-name');
        contextOpenBtn = document.getElementById('chat-context-open');
        messagesEl = document.getElementById('chat-messages');
        newMessagesEl = document.getElementById('chat-new-messages');
        newMessagesText = document.getElementById('chat-new-messages-text');
        inputEl = document.getElementById('chat-input');
        sendBtn = document.getElementById('chat-send');
        messageMenuEl = document.getElementById('chat-message-menu');

        createEmojiPicker();
        initEmojiPicker();

        if (searchInput) {
            searchInput.addEventListener('input', onSearchInput);
        }
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            });
        }

        if (backBtn) backBtn.addEventListener('click', () => closeOverlay());

        if (sellerInfoBtn) {
            sellerInfoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeEmojiPicker();
                closeMessageMenu();
                if (openingSellerProfile) return;
                if (!currentChat.otherUid) return;
                openingSellerProfile = true;
                SellerProfileUI.open(currentChat.otherUid, { preload: currentChat.otherProfile });
                setTimeout(() => { openingSellerProfile = false; }, 400);
            });
        }

        if (contextOpenBtn) {
            contextOpenBtn.addEventListener('click', () => {
                const ctx = currentChat.publicationContext;
                if (!ctx || !ctx.id) return;
                closeOverlay();
                setTimeout(async () => {
                    const pub = await PublicationService.getPublicationById(ctx.id);
                    if (pub) PublicationUI.openProductSheet(pub);
                }, 200);
            });
        }

        if (newMessagesEl) {
            newMessagesEl.addEventListener('click', () => {
                scrollToBottom('smooth');
                hideNewMessagePill();
                if (currentChat.conversationId) {
                    ConversationService.markAsRead(
                        currentChat.conversationId, AppState.currentUser.uid
                    ).catch(() => {});
                }
            });
        }

        if (inputEl) {
            inputEl.addEventListener('input', () => {
                autoResizeInput();
                currentChat._savedSelection = null;
            });
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendCurrent();
                }
            });
        }

        if (sendBtn) sendBtn.addEventListener('click', sendCurrent);

        document.addEventListener('click', (e) => {
            if (!messageMenuEl || messageMenuEl.classList.contains('hidden')) return;
            if (messageMenuEl.contains(e.target)) return;
            closeMessageMenu();
        });

        document.addEventListener('scroll', () => closeMessageMenu(), true);

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;

            if (emojiPicker && !emojiPicker.classList.contains('hidden')) {
                e.preventDefault();
                closeEmojiPicker();
                return;
            }

            if (messageMenuEl && !messageMenuEl.classList.contains('hidden')) {
                e.preventDefault();
                closeMessageMenu();
                return;
            }

            if (overlay && !overlay.classList.contains('hidden')) {
                e.preventDefault();
                closeOverlay();
            }
        });
    }

    window.MessagingUI = {
        init,
        onEnterMessaging,
        openChat,
        openChatWith,
        isChatOpen: () => overlay && !overlay.classList.contains('hidden'),
        closeChat: closeOverlay,
        consumeSuppressPopstate: () => {
            if (suppressPopstate) {
                suppressPopstate = false;
                return true;
            }
            return false;
        }
    };
})();