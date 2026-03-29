/**
 * SlimeChat — Chat JS
 * Rimuru Tempest Edition 💙
 */

// ─── State ────────────────────────────────────────────────────────────────────
let socket;
let selectedUserId = null;
let selectedUsername = '';
let typingTimer = null;
let isTyping = false;
let lastDate = null;
let reactionBarOpen = false;

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const chatWindow      = document.getElementById('chatWindow');
const welcomeScreen   = document.getElementById('welcomeScreen');
const messagesArea    = document.getElementById('messagesArea');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput    = document.getElementById('messageInput');
const headerName      = document.getElementById('headerName');
const headerStatus    = document.getElementById('headerStatus');
const headerLetter    = document.getElementById('headerLetter');
const headerDot       = document.getElementById('headerDot');
const typingIndicator = document.getElementById('typingIndicator');
const typingText      = document.getElementById('typingText');
const sidebar         = document.getElementById('sidebar');
const reactionBar     = document.getElementById('reactionBar');
const gifToggle       = document.getElementById('gifToggle');

// ─── Socket Init ──────────────────────────────────────────────────────────────
function initSocket() {
    socket = io({ reconnection: true, reconnectionAttempts: 10 });

    socket.on('connect', () => console.log('✅ Connected:', socket.id));
    socket.on('disconnect', () => console.log('❌ Disconnected'));

    socket.on('receive_message', handleIncoming);
    socket.on('message_sent', handleSentConfirm);

    socket.on('user_typing', (d) => {
        if (d.sender_id === selectedUserId) showTyping(d.username);
    });
    socket.on('user_stop_typing', (d) => {
        if (d.sender_id === selectedUserId) hideTyping();
    });

    socket.on('user_online',  (d) => setOnline(d.user_id, true));
    socket.on('user_offline', (d) => setOnline(d.user_id, false));
}

// ─── Select User ──────────────────────────────────────────────────────────────
function selectUser(userId, username) {
    document.querySelectorAll('.user-item.active').forEach(el => el.classList.remove('active'));
    const item = document.getElementById(`user-${userId}`);
    if (item) item.classList.add('active');

    selectedUserId = userId;
    selectedUsername = username;

    // Update header
    headerName.textContent = username;
    headerLetter.textContent = username[0].toUpperCase();

    // Mobile: hide sidebar
    if (window.innerWidth <= 768) sidebar.classList.add('hidden');

    welcomeScreen.style.display = 'none';
    chatWindow.style.display = 'flex';

    lastDate = null;
    messagesContainer.innerHTML = '';
    hideTyping();
    hideReactionBar();

    clearBadge(userId);
    loadMessages(userId);
    checkOnlineStatus(userId);
}

function goBack() {
    selectedUserId = null;
    chatWindow.style.display = 'none';
    welcomeScreen.style.display = 'flex';
    sidebar.classList.remove('hidden');
    document.querySelectorAll('.user-item.active').forEach(el => el.classList.remove('active'));
}

// ─── Load Messages ────────────────────────────────────────────────────────────
async function loadMessages(userId) {
    try {
        const resp = await fetch(`/api/messages/${userId}`);
        if (!resp.ok) return;
        const msgs = await resp.json();
        lastDate = null;
        messagesContainer.innerHTML = '';
        msgs.forEach(m => appendMessage(m, false));
        scrollBottom(false);
    } catch (e) {
        console.error('loadMessages error:', e);
    }
}

// ─── Append Message ───────────────────────────────────────────────────────────
function appendMessage(msg, animate = true) {
    const isSent = msg.sender_id === CURRENT_USER_ID;

    // Date divider
    if (msg.date && msg.date !== lastDate) {
        lastDate = msg.date;
        const div = document.createElement('div');
        div.className = 'date-divider';
        div.innerHTML = `<span>${formatDate(msg.date)}</span>`;
        messagesContainer.appendChild(div);
    }

    // Check if it's a GIF reaction message
    if (msg.message && msg.message.startsWith('__GIF__:')) {
        appendGifMessage(msg, isSent, animate);
        return;
    }

    const wrap = document.createElement('div');
    wrap.className = `message-wrapper ${isSent ? 'sent' : 'received'}`;
    if (!animate) wrap.style.animation = 'none';

    const ticks = isSent ? (msg.is_read ? '✓✓' : '✓') : '';
    const ticksClass = isSent && msg.is_read ? 'seen' : '';

    wrap.innerHTML = `
        <div class="message-bubble">
            <div class="message-text">${escHtml(msg.message)}</div>
            <div class="message-meta">
                <span class="message-time">${msg.timestamp || ''}</span>
                ${isSent ? `<span class="message-ticks ${ticksClass}">${ticks}</span>` : ''}
            </div>
        </div>
    `;
    messagesContainer.appendChild(wrap);
}

// ─── GIF Message Bubble ───────────────────────────────────────────────────────
function appendGifMessage(msg, isSent, animate) {
    const key = msg.message.replace('__GIF__:', '');
    const gif = GIF_REACTIONS[key];
    if (!gif) return;

    const wrap = document.createElement('div');
    wrap.className = `message-wrapper ${isSent ? 'sent' : 'received'}`;
    if (!animate) wrap.style.animation = 'none';

    wrap.innerHTML = `
        <div class="gif-message-bubble">
            <img src="${gif.url}" alt="${key}" loading="lazy"/>
            <div class="gif-caption">${gif.label}</div>
        </div>
        <div class="message-meta" style="margin-top:4px">
            <span class="message-time">${msg.timestamp || ''}</span>
        </div>
    `;
    messagesContainer.appendChild(wrap);
}

// ─── Incoming / Sent Handlers ─────────────────────────────────────────────────
function handleIncoming(data) {
    updatePreview(data.sender_id, data.message);

    if (data.sender_id === selectedUserId) {
        const now = new Date();
        appendMessage({
            sender_id: data.sender_id,
            receiver_id: data.receiver_id,
            message: data.message,
            timestamp: data.timestamp,
            date: data.date || now.toISOString().split('T')[0],
            is_read: false
        }, true);
        scrollBottom(true);
        hideTyping();
    } else {
        showBadge(data.sender_id);
    }
    playPing();
}

function handleSentConfirm(data) {
    updatePreview(data.receiver_id, data.message);
}

// ─── Send Message ─────────────────────────────────────────────────────────────
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !selectedUserId) return;

    socket.emit('send_message', { receiver_id: selectedUserId, message: text });

    const now = new Date();
    appendMessage({
        sender_id: CURRENT_USER_ID,
        receiver_id: selectedUserId,
        message: text,
        timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: now.toISOString().split('T')[0],
        is_read: false
    }, true);

    messageInput.value = '';
    messageInput.style.height = 'auto';
    scrollBottom(true);
    if (isTyping) stopTyping();
}

// ─── GIF Reactions ────────────────────────────────────────────────────────────
function sendGifReaction(key) {
    if (!selectedUserId) return;
    const text = `__GIF__:${key}`;
    socket.emit('send_message', { receiver_id: selectedUserId, message: text });

    const now = new Date();
    appendMessage({
        sender_id: CURRENT_USER_ID,
        receiver_id: selectedUserId,
        message: text,
        timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: now.toISOString().split('T')[0],
        is_read: false
    }, true);

    scrollBottom(true);
    hideReactionBar();
}

function toggleReactionBar() {
    reactionBarOpen = !reactionBarOpen;
    if (reactionBarOpen) {
        reactionBar.classList.add('visible');
        gifToggle.classList.add('active');
    } else {
        hideReactionBar();
    }
}

function hideReactionBar() {
    reactionBarOpen = false;
    reactionBar.classList.remove('visible');
    gifToggle.classList.remove('active');
}

// ─── Typing ───────────────────────────────────────────────────────────────────
function showTyping(username) {
    typingText.textContent = `${username} is typing...`;
    typingIndicator.style.display = 'flex';
    scrollBottom(true);
}
function hideTyping() { typingIndicator.style.display = 'none'; }

function startTyping() {
    if (!isTyping && selectedUserId) {
        isTyping = true;
        socket.emit('typing', { receiver_id: selectedUserId });
    }
    clearTimeout(typingTimer);
    typingTimer = setTimeout(stopTyping, 2000);
}

function stopTyping() {
    if (isTyping && selectedUserId) {
        isTyping = false;
        socket.emit('stop_typing', { receiver_id: selectedUserId });
    }
    clearTimeout(typingTimer);
}

// ─── Online Status ────────────────────────────────────────────────────────────
function setOnline(userId, online) {
    const dot = document.getElementById(`status-${userId}`);
    if (dot) {
        dot.className = `status-dot ${online ? 'online' : 'offline'}`;
    }
    if (userId === selectedUserId) {
        headerStatus.textContent = online ? 'Online' : 'Offline';
        headerStatus.className = online ? 'header-status online-text' : 'header-status';
        if (headerDot) {
            headerDot.className = `status-dot ${online ? 'online' : 'offline'}`;
        }
    }
}

async function checkOnlineStatus(userId) {
    try {
        const resp = await fetch('/api/users/online');
        const ids = await resp.json();
        setOnline(userId, ids.includes(userId));
        // Also update all sidebar dots
        document.querySelectorAll('.user-item').forEach(item => {
            const uid = parseInt(item.dataset.userId);
            if (uid) setOnline(uid, ids.includes(uid));
        });
    } catch (e) {}
}

// ─── Sidebar Helpers ──────────────────────────────────────────────────────────
function updatePreview(userId, message) {
    const el = document.getElementById(`preview-${userId}`);
    if (!el) return;
    let preview = message;
    if (message.startsWith('__GIF__:')) preview = '🎭 Sent a GIF reaction';
    el.textContent = preview.length > 28 ? preview.slice(0, 28) + '…' : preview;
}

function showBadge(userId) {
    const el = document.getElementById(`badge-${userId}`);
    if (!el) return;
    el.style.display = 'inline-flex';
    el.textContent = parseInt(el.textContent || '0') + 1;
}

function clearBadge(userId) {
    const el = document.getElementById(`badge-${userId}`);
    if (el) { el.style.display = 'none'; el.textContent = '0'; }
}

// ─── User Search ──────────────────────────────────────────────────────────────
document.getElementById('userSearch').addEventListener('input', function () {
    const q = this.value.toLowerCase();
    document.querySelectorAll('.user-item').forEach(item => {
        item.style.display = item.dataset.username.toLowerCase().includes(q) ? '' : 'none';
    });
});

// ─── Input Events ─────────────────────────────────────────────────────────────
messageInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

messageInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    startTyping();
});

// ─── Utilities ────────────────────────────────────────────────────────────────
function scrollBottom(smooth = true) {
    setTimeout(() => {
        messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
    }, 50);
}

function escHtml(t) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(t));
    return d.innerHTML;
}

function formatDate(dateStr) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return '✨ Today';
    if (dateStr === yesterday) return '🌙 Yesterday';
    return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

function playPing() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initSocket();
    checkOnlineStatus(-1); // refresh all
    setInterval(() => checkOnlineStatus(selectedUserId || -1), 30000);
});
