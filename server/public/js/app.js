(() => {
  const socket = io();

  // ─── State ───
  let myUsername = '';
  let myRoom = 'general';
  let myAvatar = '#ef4444';
  let typingTimer = null;
  let isTyping = false;
  const typingUsers = new Set();

  // ─── DOM ───
  const joinScreen   = document.getElementById('join-screen');
  const chatScreen   = document.getElementById('chat-screen');
  const usernameInput= document.getElementById('username-input');
  const joinBtn      = document.getElementById('join-btn');
  const joinError    = document.getElementById('join-error');
  const messagesEl   = document.getElementById('messages');
  const msgInput     = document.getElementById('msg-input');
  const sendBtn      = document.getElementById('send-btn');
  const userList     = document.getElementById('user-list');
  const userCount    = document.getElementById('user-count');
  const myAvatarEl   = document.getElementById('my-avatar');
  const myNameEl     = document.getElementById('my-name');
  const leaveBtn     = document.getElementById('leave-btn');
  const typingBar    = document.getElementById('typing-bar');
  const connStatus   = document.getElementById('conn-status');
  const roomNameEl   = document.getElementById('current-room-name');
  const msgInputPlaceholder = (room) => `Message #${room}`;

  // ─── Room selection (join screen) ───
  document.querySelectorAll('.room-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.room-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      myRoom = btn.dataset.room;
    });
  });

  // ─── Avatar color selection ───
  document.querySelectorAll('.av-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.av-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      myAvatar = btn.dataset.color;
    });
  });

  // ─── Sidebar room switching ───
  document.querySelectorAll('.room-item').forEach(item => {
    item.addEventListener('click', () => {
      const room = item.dataset.room;
      if (room === myRoom) return;
      switchRoom(room);
    });
  });

  function switchRoom(room) {
    myRoom = room;
    document.querySelectorAll('.room-item').forEach(i => {
      i.classList.toggle('active', i.dataset.room === room);
    });
    roomNameEl.textContent = room;
    msgInput.placeholder = msgInputPlaceholder(room);
    messagesEl.innerHTML = '';
    typingUsers.clear();
    updateTypingBar();
    socket.emit('join', { username: myUsername, room, avatar: myAvatar });
  }

  // ─── JOIN ───
  joinBtn.addEventListener('click', doJoin);
  usernameInput.addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });

  function doJoin() {
    const name = usernameInput.value.trim();
    if (!name) { showError('Please enter a username.'); return; }
    if (name.length < 2) { showError('Name must be at least 2 characters.'); return; }

    myUsername = name;
    joinError.textContent = '';
    joinScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');

    myAvatarEl.style.background = myAvatar;
    myNameEl.textContent = myUsername;
    roomNameEl.textContent = myRoom;
    msgInput.placeholder = msgInputPlaceholder(myRoom);

    socket.emit('join', { username: myUsername, room: myRoom, avatar: myAvatar });
    msgInput.focus();
  }

  function showError(msg) {
    joinError.textContent = msg;
  }

  // ─── LEAVE ───
  leaveBtn.addEventListener('click', () => {
    chatScreen.classList.add('hidden');
    joinScreen.classList.remove('hidden');
    messagesEl.innerHTML = '';
    userList.innerHTML = '';
    typingUsers.clear();
  });

  // ─── SEND MESSAGE ───
  sendBtn.addEventListener('click', sendMessage);
  msgInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  function sendMessage() {
    const text = msgInput.value.trim();
    if (!text) return;
    socket.emit('send_message', { text });
    msgInput.value = '';
    stopTyping();
  }

  // ─── TYPING ───
  msgInput.addEventListener('input', () => {
    if (!isTyping) {
      isTyping = true;
      socket.emit('typing', { isTyping: true });
    }
    clearTimeout(typingTimer);
    typingTimer = setTimeout(stopTyping, 1500);
  });

  function stopTyping() {
    if (isTyping) {
      isTyping = false;
      socket.emit('typing', { isTyping: false });
    }
    clearTimeout(typingTimer);
  }

  // ─── SOCKET EVENTS ───

  socket.on('connect', () => {
    connStatus.textContent = '● live';
    connStatus.className = 'conn-status connected';
  });

  socket.on('disconnect', () => {
    connStatus.textContent = '● offline';
    connStatus.className = 'conn-status disconnected';
  });

  socket.on('history', (messages) => {
    messagesEl.innerHTML = '';
    if (messages.length === 0) {
      appendSystem('No messages yet — be the first to say hi! 👋');
    } else {
      appendSystem(`— ${messages.length} recent messages loaded —`);
      messages.forEach(msg => appendMessage(msg));
    }
    scrollToBottom();
  });

  socket.on('receive_message', (msg) => {
    appendMessage(msg);
    scrollToBottom();
  });

  socket.on('system_message', ({ text }) => {
    appendSystem(text);
    scrollToBottom();
  });

  socket.on('user_joined', ({ username, users }) => {
    updateUserList(users);
  });

  socket.on('user_left', ({ username, users }) => {
    updateUserList(users);
    typingUsers.delete(username);
    updateTypingBar();
  });

  socket.on('typing', ({ username, isTyping: typing }) => {
    if (typing) typingUsers.add(username);
    else typingUsers.delete(username);
    updateTypingBar();
  });

  // ─── RENDER HELPERS ───

  function appendMessage({ username, text, avatar, createdAt }) {
    const isOwn = username === myUsername;
    const time = formatTime(createdAt);
    const initial = username[0].toUpperCase();

    const div = document.createElement('div');
    div.className = `msg${isOwn ? ' own' : ''}`;
    div.innerHTML = `
      <div class="msg-avatar" style="background:${avatar || '#6366f1'}">${initial}</div>
      <div class="msg-body">
        <div class="msg-meta">
          <span class="msg-user">${escHtml(username)}</span>
          <span class="msg-time">${time}</span>
        </div>
        <div class="msg-text">${escHtml(text)}</div>
      </div>
    `;
    messagesEl.appendChild(div);
  }

  function appendSystem(text) {
    const div = document.createElement('div');
    div.className = 'sys-msg';
    div.textContent = text;
    messagesEl.appendChild(div);
  }

  function updateUserList(users) {
    userCount.textContent = users.length;
    userList.innerHTML = users.map(u => `
      <div class="user-item">
        <div class="user-dot" style="background:${u.avatar}">${u.username[0].toUpperCase()}</div>
        <span>${escHtml(u.username)}</span>
      </div>
    `).join('');
  }

  function updateTypingBar() {
    const others = [...typingUsers].filter(u => u !== myUsername);
    if (others.length === 0) {
      typingBar.textContent = '';
      typingBar.classList.add('hidden');
    } else {
      const names = others.join(', ');
      typingBar.textContent = others.length === 1
        ? `${names} is typing…`
        : `${names} are typing…`;
      typingBar.classList.remove('hidden');
    }
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
