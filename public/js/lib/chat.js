// Per-order chat (customer <-> rider). Messages arrive instantly via Socket.IO (`message:new`) and a light poll
// (?after=<lastId>) guarantees delivery if the socket drops. Sends are optimistic and reconcile with the server.
import { api } from './api.js';
import { poll } from './live.js';
import { icon } from './icons.js';
import { esc, clock, dayLabel, toast } from './ui.js';

const QUICK = ['On my way', 'Almost there', "I've arrived", 'Please share your location'];

export function mountChat(host, { orderId, me, live, quick = false, peerName = '', onUnread }) {
  host.innerHTML = `
    <div class="chat">
      <div class="chat-log" aria-live="polite"></div>
      ${quick ? `<div class="chat-quick">${QUICK.map((q) => `<button type="button">${esc(q)}</button>`).join('')}</div>` : ''}
      <form class="chat-form" autocomplete="off">
        <input class="input" type="text" maxlength="1000" placeholder="${peerName ? `Message ${esc(peerName)}…` : 'Type a message…'}" aria-label="Message" />
        <button class="btn btn-primary send" type="submit" aria-label="Send">${icon('send')}</button>
      </form>
    </div>`;
  const log = host.querySelector('.chat-log');
  const form = host.querySelector('form');
  const input = form.querySelector('input');

  let messages = [];
  let lastId = 0;
  let visible = true;
  let unread = 0;
  const pendingTexts = new Map(); // tempId -> element

  const mine = (m) => m.sender_role === me.role && m.sender_id === me.id;

  function addMessage(m, { fresh = true } = {}) {
    if (messages.some((x) => x.id === m.id)) return;
    // reconcile an optimistic bubble with the confirmed message
    const temp = [...pendingTexts.entries()].find(([, v]) => v.text === m.content && mine(m));
    if (temp) { temp[1].el.remove(); pendingTexts.delete(temp[0]); }
    messages.push(m);
    lastId = Math.max(lastId, m.id);
    if (fresh && !mine(m) && !visible) { unread++; onUnread?.(unread); }
    draw(fresh);
  }

  function draw(stick = true) {
    const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 90;
    const keepPending = [...pendingTexts.values()].map((p) => p.el);
    log.innerHTML = '';
    if (!messages.length && !keepPending.length) {
      log.innerHTML = `<div class="empty" style="margin:auto"><div class="empty-art">${icon('chat')}</div><h3>Start the conversation</h3><p>Messages here are only visible to you and your ${me.role === 'user' ? 'rider' : 'customer'}.</p></div>`;
      return;
    }
    let prev = null; let day = '';
    for (const m of messages) {
      const d = dayLabel(m.created_at);
      if (d !== day) { day = d; log.insertAdjacentHTML('beforeend', `<div class="chat-day">${esc(d)}</div>`); prev = null; }
      const grouped = prev && prev.sender_role === m.sender_role && prev.sender_id === m.sender_id
        && new Date(m.created_at) - new Date(prev.created_at) < 60000;
      const row = document.createElement('div');
      row.className = `bubble-row ${mine(m) ? 'mine' : 'theirs'}${grouped ? ' cont' : ''}`;
      row.dataset.id = m.id;
      row.innerHTML = `${grouped ? '' : `<div class="who">${mine(m) ? 'You' : esc(m.sender_name)}</div>`}
        <div class="bubble">${esc(m.content)}</div><div class="time">${clock(m.created_at)}</div>`;
      if (!stick || row.dataset.id <= lastSeenRendered) row.style.animation = 'none';
      log.appendChild(row);
      prev = m;
    }
    keepPending.forEach((el) => log.appendChild(el));
    lastSeenRendered = lastId;
    if (stick && (nearBottom || !log.dataset.init)) { log.dataset.init = '1'; log.scrollTop = log.scrollHeight; }
  }
  let lastSeenRendered = 0;

  async function load() {
    const fresh = await api.messages(orderId, lastId);
    const first = messages.length === 0 && lastId === 0;
    fresh.forEach((m) => addMessage(m, { fresh: !first }));
    if (first) draw(true);
  }

  const poller = poll(load, 3000);
  live?.joinOrder(orderId);
  const onSocket = (ev, payload) => { if (ev === 'message:new' && payload.order_id === orderId) addMessage(payload); };
  live?.socket?.onAny(onSocket);

  async function send(text) {
    const tempId = `t${Date.now()}`;
    const el = document.createElement('div');
    el.className = 'bubble-row mine pending';
    el.innerHTML = `<div class="bubble">${esc(text)}</div><div class="time">Sending…</div>`;
    log.querySelector('.empty')?.remove();
    log.appendChild(el);
    pendingTexts.set(tempId, { el, text });
    log.scrollTop = log.scrollHeight;
    try {
      const m = await api.sendMessage(orderId, text);
      addMessage(m);
    } catch (err) {
      el.remove(); pendingTexts.delete(tempId);
      input.value = text;
      toast(err.message, { kind: 'error' });
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    send(text);
  });
  host.querySelector('.chat-quick')?.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (b) send(b.textContent);
  });

  return {
    setVisible(v) {
      visible = v;
      if (v) { unread = 0; onUnread?.(0); requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; }); }
    },
    focus: () => input.focus(),
    destroy() { poller.stop(); live?.leaveOrder(orderId); live?.socket?.offAny(onSocket); },
  };
}
