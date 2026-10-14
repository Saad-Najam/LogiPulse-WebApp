import { api } from '/js/lib/api.js';
import { getSession, setSession, HOME } from '/js/lib/session.js';
import { icon, logoMark } from '/js/lib/icons.js';
import { $, $$, initSeg, toggleTheme, currentTheme, avatar } from '/js/lib/ui.js';

// Already signed in -> straight to the right dashboard (use "Sign out" to switch roles).
const existing = getSession();
if (existing?.token && HOME[existing.user.role]) location.replace(HOME[existing.user.role]);

const DEMO = {
  user: { name: 'Ayesha Khan', email: 'user@logipulse.com', hint: 'Request deliveries and track them live' },
  rider: { name: 'Hamza Ali', email: 'rider@logipulse.com', hint: 'Find nearby requests and deliver' },
  admin: { name: 'Operations Admin', email: 'admin@logipulse.com', hint: 'Monitor the whole platform' },
};
const DEMO_PASSWORD = 'password123';

let role = 'user';
let mode = 'signin'; // or 'register' (customers only)

// Fill in icon placeholders
// Wrapper spans (.ico) keep their box; bare placeholders are replaced by the svg itself.
$$('[data-i]').forEach((el) => { if (el.classList.contains('ico')) el.innerHTML = icon(el.dataset.i); else el.outerHTML = icon(el.dataset.i); });
$('#bp-logo').innerHTML = logoMark(40);
$('#mb-logo').innerHTML = logoMark(34);

const el = {
  card: $('#card'), form: $('#form'), notice: $('#notice'), title: $('#title'), subtitle: $('#subtitle'),
  email: $('#email'), password: $('#password'), name: $('#name'), submit: $('#submit'), submitLabel: $('#submit-label'),
  seg: $('#role-seg'), demo: $('#demo'), switchMode: $('#switch-mode'),
};

/* ---- theme ---- */
const themeBtn = $('#theme-btn');
const paintTheme = () => { themeBtn.innerHTML = icon(currentTheme() === 'dark' ? 'sun' : 'moon'); };
paintTheme();
themeBtn.addEventListener('click', () => { toggleTheme(); paintTheme(); });

/* ---- password visibility ---- */
const pwBtn = $('#toggle-pw');
pwBtn.innerHTML = icon('eye');
pwBtn.addEventListener('click', () => {
  const show = el.password.type === 'password';
  el.password.type = show ? 'text' : 'password';
  pwBtn.innerHTML = icon(show ? 'eyeOff' : 'eye');
  pwBtn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});

/* ---- role selector: switching role re-tints the whole page (accent variables change) ---- */
const seg = initSeg(el.seg, (value) => setRole(value));
function setRole(r) {
  role = r;
  document.documentElement.setAttribute('data-role', r);
  paintDemo();
  if (r !== 'user' && mode === 'register') setMode('signin');
  el.switchMode.classList.toggle('hidden', r !== 'user');
  try { localStorage.setItem('lp-last-role', r); } catch { /* ignore */ }
}
function paintDemo() {
  const d = DEMO[role];
  $('#demo-name').textContent = d.name;
  $('#demo-email').textContent = d.email;
  $('#demo-avatar').outerHTML = avatar(d.name, 'sm').replace('<span', '<span id="demo-avatar"');
}
$('#demo-fill').addEventListener('click', () => {
  el.email.value = DEMO[role].email;
  el.password.value = DEMO_PASSWORD;
  clearErrors();
  el.password.focus();
});

/* ---- sign in <-> create account ---- */
function setMode(m) {
  mode = m;
  const reg = m === 'register';
  el.title.textContent = reg ? 'Create your account' : 'Welcome back';
  el.subtitle.textContent = reg ? 'Request deliveries and track every step, free.' : 'Sign in to continue to your dashboard.';
  el.submitLabel.textContent = reg ? 'Create account' : 'Sign in';
  $('#f-name').classList.toggle('hidden', !reg);
  el.seg.classList.toggle('hidden', reg);
  el.demo.classList.toggle('hidden', reg);
  $('#mode-link').textContent = reg ? 'Sign in instead' : 'Create an account';
  el.switchMode.firstChild.textContent = reg ? 'Already registered? ' : 'New customer? ';
  el.password.autocomplete = reg ? 'new-password' : 'current-password';
  if (reg) { role = 'user'; document.documentElement.setAttribute('data-role', 'user'); seg.set('user', true); }
  el.form.classList.remove('swap'); void el.form.offsetWidth; el.form.classList.add('swap');
  clearErrors(); hideNotice();
  (reg ? el.name : el.email).focus();
}
$('#mode-link').addEventListener('click', (e) => { e.preventDefault(); setMode(mode === 'signin' ? 'register' : 'signin'); });

/* ---- validation + submit ---- */
function fieldError(id, msg) {
  const f = $(id);
  f.classList.toggle('has-error', !!msg);
  f.querySelector('.error-text').textContent = msg || '';
}
function clearErrors() { ['#f-name', '#f-email', '#f-password'].forEach((f) => fieldError(f, '')); }
function showNotice(msg, kind = 'error') {
  el.notice.className = `notice ${kind}`;
  el.notice.innerHTML = `${icon(kind === 'error' ? 'alert' : 'info')}<span></span>`;
  el.notice.querySelector('span').textContent = msg;
}
const hideNotice = () => el.notice.classList.add('hidden');
['input', 'change'].forEach((ev) => el.form.addEventListener(ev, (e) => {
  const f = e.target.closest('.field'); if (f) fieldError('#' + f.id, '');
  hideNotice();
}));

el.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors(); hideNotice();
  const email = el.email.value.trim();
  const password = el.password.value;
  const name = el.name.value.trim();
  let bad = false;
  if (mode === 'register' && name.length < 2) { fieldError('#f-name', 'Please enter your full name.'); bad = true; }
  if (!/^\S+@\S+\.\S+$/.test(email)) { fieldError('#f-email', 'Enter a valid email address.'); bad = true; }
  if (!password) { fieldError('#f-password', 'Enter your password.'); bad = true; }
  else if (mode === 'register' && password.length < 8) { fieldError('#f-password', 'Use at least 8 characters.'); bad = true; }
  if (bad) { el.card.classList.remove('shake'); void el.card.offsetWidth; el.card.classList.add('shake'); return; }

  el.submit.classList.add('is-loading');
  el.submit.disabled = true;
  try {
    const res = await (mode === 'register' ? api.register(name, email, password) : api.login(role, email, password));
    setSession(res);
    document.body.classList.add('leaving');
    setTimeout(() => location.assign(HOME[res.user.role]), 260);
  } catch (err) {
    // Errors belong next to the form, not in a toast.
    showNotice(err.message);
    el.card.classList.remove('shake'); void el.card.offsetWidth; el.card.classList.add('shake');
    el.submit.classList.remove('is-loading');
    el.submit.disabled = false;
  }
});

/* ---- init ---- */
const params = new URLSearchParams(location.search);
if (params.get('expired')) showNotice('Your session expired. Please sign in again.', 'info');
let startRole = 'user';
try { startRole = localStorage.getItem('lp-last-role') || 'user'; } catch { /* ignore */ }
if (!DEMO[startRole]) startRole = 'user';
seg.set(startRole, true);
setRole(startRole);
