// Real-time layer. Socket.IO pushes events (instant), and a light poll is the safety net (the PRD accepts either).
// Pages register a `refresh` function; any socket event or poll tick simply calls it.
import { debounce } from './ui.js';

function setLive(ok) {
  const el = document.getElementById('live');
  if (!el) return;
  el.classList.toggle('offline', !ok);
  const label = el.querySelector('span');
  if (label) label.textContent = ok ? 'Live' : 'Reconnecting';
}

// poll(fn, ms) -> { refresh(), stop() }. Calls never overlap; a refresh requested mid-flight re-runs once after.
export function poll(fn, ms = 4000) {
  let running = false, again = false, stopped = false, timer;
  async function tick() {
    if (running) { again = true; return; }
    running = true;
    try { await fn(); setLive(true); }
    catch (err) { console.warn('[poll]', err.message); setLive(false); }
    finally { running = false; if (again) { again = false; tick(); } }
  }
  const loop = () => { timer = setTimeout(async () => { if (!document.hidden && !stopped) await tick(); if (!stopped) loop(); }, ms); };
  tick().then(loop);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  return { refresh: tick, stop: () => { stopped = true; clearTimeout(timer); } };
}

// connect(token, onEvent) -> { socket, joinOrder, leaveOrder }
export function connect(token, onEvent) {
  const sock = window.io ? window.io({ auth: { token }, transports: ['websocket', 'polling'], reconnectionDelayMax: 4000 }) : null;
  if (!sock) return { socket: null, joinOrder() {}, leaveOrder() {} };
  sock.onAny((event, payload) => onEvent?.(event, payload));
  sock.on('connect', () => setLive(true));
  sock.on('disconnect', () => setLive(false));
  sock.on('connect_error', () => setLive(false));
  return {
    socket: sock,
    joinOrder: (orderId) => sock.emit('order:join', { orderId }),
    leaveOrder: (orderId) => sock.emit('order:leave', { orderId }),
  };
}

// Convenience: debounced refresh trigger for bursts of events.
export const burst = (poller, ms = 80) => debounce(() => poller.refresh(), ms);
