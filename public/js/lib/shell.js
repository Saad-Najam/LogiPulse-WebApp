// Shared top bar: brand, role chip, live indicator, theme toggle, account + sign out.
import { icon, logoMark } from './icons.js';
import { avatar, esc, toggleTheme, currentTheme } from './ui.js';
import { logout } from './session.js';

const ROLE_LABEL = { user: 'Customer', rider: 'Rider', admin: 'Operations' };

export function mountTopbar(host, session, { center = '', leading = '' } = {}) {
  const { user } = session;
  host.className = 'topbar';
  host.innerHTML = `
    <div class="topbar-inner">
      <div class="topbar-left">
        ${leading}
        <a class="brand" href="/" aria-label="LogiPulse home">${logoMark(34)}<span class="brand-name">LogiPulse</span></a>
        <span class="role-chip">${ROLE_LABEL[user.role]}</span>
      </div>
      <div class="topbar-center">${center}</div>
      <div class="topbar-right">
        <span class="live" id="live" title="Real-time connection"><i></i><span>Live</span></span>
        <button class="btn btn-ghost btn-icon" id="theme-btn" aria-label="Toggle theme" title="Toggle theme"></button>
        <span class="topbar-sep"></span>
        <div class="account">
          ${avatar(user.name, 'sm')}
          <div class="account-text"><strong class="truncate">${esc(user.name)}</strong><span class="truncate">${esc(user.email)}</span></div>
        </div>
        <button class="btn btn-ghost btn-icon" id="logout-btn" aria-label="Sign out" title="Sign out">${icon('logout')}</button>
      </div>
    </div>`;
  const themeBtn = host.querySelector('#theme-btn');
  const paint = () => { themeBtn.innerHTML = icon(currentTheme() === 'dark' ? 'sun' : 'moon'); };
  paint();
  themeBtn.addEventListener('click', () => { toggleTheme(); paint(); });
  host.querySelector('#logout-btn').addEventListener('click', logout);
}
