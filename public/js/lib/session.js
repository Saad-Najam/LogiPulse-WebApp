// Who is logged in. sessionStorage = per browser TAB, so a demo can keep a customer, a rider and an admin
// open side by side in different tabs without them logging each other out.
const KEY = 'logipulse.session';

export const getSession = () => {
  try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; }
};
export const setSession = (s) => {
  try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
};
export const clearSession = () => {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
};
export const HOME = { user: '/user.html', rider: '/rider.html', admin: '/admin.html' };

export function logout() {
  clearSession();
  location.href = '/';
}

// Guard for dashboards: wrong/absent session -> back to login (or to the right dashboard).
export function requireRole(role) {
  const s = getSession();
  if (!s?.token) { location.replace('/'); throw new Error('not signed in'); }
  if (s.user.role !== role) { location.replace(HOME[s.user.role] || '/'); throw new Error('wrong role'); }
  return s;
}
