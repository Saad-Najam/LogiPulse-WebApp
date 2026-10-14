// Runs synchronously in <head> (CSP forbids inline scripts) so the right theme is painted on first frame.
(function () {
  var root = document.documentElement;
  var role = root.getAttribute('data-role') || 'user';
  var stored = null;
  try { stored = localStorage.getItem('lp-theme-' + role); } catch (e) { /* storage blocked */ }
  var theme = stored || (role === 'rider' ? 'dark' : 'light'); // riders ride at night: dark by default
  root.setAttribute('data-theme', theme);
})();
