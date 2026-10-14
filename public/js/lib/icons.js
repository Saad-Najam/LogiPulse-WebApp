// One consistent inline-SVG icon set (24px grid, 1.9 stroke). Styled by .icon in design.css.
const P = {
  package: '<path d="M12 2.6 3.6 7v10L12 21.4 20.4 17V7L12 2.6Z"/><path d="M3.8 7.1 12 11.8l8.2-4.7M12 11.8v9.5"/><path d="m7.6 4.8 8.4 4.7"/>',
  pin: '<path d="M12 21.2s-7-5.5-7-11.1a7 7 0 1 1 14 0c0 5.6-7 11.1-7 11.1Z"/><circle cx="12" cy="10" r="2.6"/>',
  flag: '<path d="M5 21.5V3.8"/><path d="M5 4.5h12.2l-2.4 3.9 2.4 3.9H5"/>',
  navigation: '<path d="m3.2 10.8 17.6-7.6-7.6 17.6-2.2-7.8-7.8-2.2Z"/>',
  send: '<path d="m21.2 2.8-10.4 10.4"/><path d="M21.2 2.8 14.4 21.2l-3.6-8-8-3.6 18.4-6.8Z"/>',
  chat: '<path d="M21 11.8a8.4 8.4 0 0 1-12.2 7.4L3.2 20.8l1.7-5.1A8.4 8.4 0 1 1 21 11.8Z"/>',
  check: '<path d="m5 12.6 4.6 4.5L19 7.4"/>',
  checkCircle: '<circle cx="12" cy="12" r="9.2"/><path d="m8.2 12.4 2.7 2.7 4.9-5.4"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevR: '<path d="m9.5 6 6 6-6 6"/>',
  chevD: '<path d="m6 9.5 6 6 6-6"/>',
  chevL: '<path d="m14.5 6-6 6 6 6"/>',
  arrowR: '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
  arrowL: '<path d="M19.5 12h-15M10.5 6l-6 6 6 6"/>',
  search: '<circle cx="11" cy="11" r="6.6"/><path d="m20.2 20.2-4.5-4.5"/>',
  logout: '<path d="M9.5 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.5"/><path d="m16 16.8 4.8-4.8L16 7.2M20.8 12H9.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.7 4.7l1.4 1.4M17.9 17.9l1.4 1.4M2.5 12h2M19.5 12h2M4.7 19.3l1.4-1.4M17.9 6.1l1.4-1.4"/>',
  moon: '<path d="M20.4 14.3A8.6 8.6 0 1 1 9.7 3.6a6.8 6.8 0 0 0 10.7 10.7Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.2 21a7.8 7.8 0 0 1 15.6 0"/>',
  users: '<circle cx="9" cy="8.2" r="3.6"/><path d="M2.4 20.5a6.6 6.6 0 0 1 13.2 0"/><path d="M15.8 4.8a3.6 3.6 0 0 1 0 6.9M18.4 14.2a6.6 6.6 0 0 1 3.2 6.3"/>',
  bike: '<circle cx="5.6" cy="16.6" r="3.2"/><circle cx="18.4" cy="16.6" r="3.2"/><path d="M5.6 16.6 9.2 8H13l3.2 5.2h2.2M13 8l-2.6 8.6M9.2 8H7"/><path d="M15.5 5h2.7"/>',
  clock: '<circle cx="12" cy="12" r="9.2"/><path d="M12 7v5.2l3.2 1.8"/>',
  dashboard: '<rect x="3" y="3" width="7.6" height="9.4" rx="2"/><rect x="13.4" y="3" width="7.6" height="5.4" rx="2"/><rect x="13.4" y="11.6" width="7.6" height="9.4" rx="2"/><rect x="3" y="15.6" width="7.6" height="5.4" rx="2"/>',
  list: '<path d="M8.5 6h12.5M8.5 12h12.5M8.5 18h12.5"/><path d="M3.6 6h.01M3.6 12h.01M3.6 18h.01" stroke-width="2.6"/>',
  chart: '<path d="M4.5 20V11M10.2 20V4M15.9 20v-6.5M21.5 20h-19"/>',
  flame: '<path d="M12 22c4 0 7-2.8 7-6.9 0-3-1.7-5-3.3-6.7-.4 1.2-1.1 2-2.2 2.5-.4-3-1.6-5.2-3.6-7.4.2 4.2-5.4 6.1-5.4 12.5C4.5 19.2 8 22 12 22Z"/>',
  zap: '<path d="M13.2 2.5 4.5 13.8h6.6l-.9 7.7 8.8-11.4h-6.6l.8-7.6Z"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3.5 3.5l17 17"/><path d="M10.7 6.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 4M6.6 6.9C3.9 8.7 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.4-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.6"/><path d="m3.6 7.2 8.4 6 8.4-6"/>',
  lock: '<rect x="4.6" y="10.6" width="14.8" height="10" rx="2.6"/><path d="M8 10.6V8a4 4 0 0 1 8 0v2.6"/>',
  locate: '<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  refresh: '<path d="M20.4 11.2A8.4 8.4 0 0 0 5.7 6.1L3.2 8.6"/><path d="M3.2 3.8v4.8h4.8"/><path d="M3.6 12.8a8.4 8.4 0 0 0 14.7 5.1l2.5-2.5"/><path d="M20.8 20.2v-4.8H16"/>',
  shield: '<path d="M12 21.5s8-3.6 8-10V5.6L12 2.5 4 5.6v5.9c0 6.4 8 10 8 10Z"/><path d="m8.6 12 2.4 2.4 4.4-4.8"/>',
  activity: '<path d="M2.5 12h4l3-8.5 5 17 3-8.5h4"/>',
  map: '<path d="m9 4 6 2.2L21 4v14l-6 2.2L9 18l-6 2.2V6.2L9 4Z"/><path d="M9 4v14M15 6.2v14"/>',
  route: '<circle cx="6" cy="19" r="2.4"/><circle cx="18" cy="5" r="2.4"/><path d="M8.4 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.6"/>',
  alert: '<path d="M10.3 4 1.9 18.2A2 2 0 0 0 3.6 21h16.8a2 2 0 0 0 1.7-2.8L13.7 4a2 2 0 0 0-3.4 0Z"/><path d="M12 9.5v4M12 17h.01" stroke-width="2.4"/>',
  inbox: '<path d="M3 13.5 5.6 5.7A2 2 0 0 1 7.5 4.3h9a2 2 0 0 1 1.9 1.4L21 13.5"/><path d="M3 13.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4.5h-5.2a2 2 0 0 0-1.9 1.4 2.3 2.3 0 0 1-4.2 0 2 2 0 0 0-1.9-1.4H3Z"/>',
  truck: '<path d="M2.5 6.5h11v10h-11zM13.5 10h4.2l3.8 3.8v2.7h-8"/><circle cx="7" cy="17.6" r="2"/><circle cx="17.2" cy="17.6" r="2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  info: '<circle cx="12" cy="12" r="9.2"/><path d="M12 11v5.4M12 7.7h.01" stroke-width="2.4"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  externalLink: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  phone: '<path d="M21 16.4v2.6a2 2 0 0 1-2.2 2A19.6 19.6 0 0 1 3 5.2 2 2 0 0 1 5 3h2.6a2 2 0 0 1 2 1.7l.5 2.9a2 2 0 0 1-.6 1.8l-1.3 1.3a15.7 15.7 0 0 0 6.1 6.1l1.3-1.3a2 2 0 0 1 1.8-.6l2.9.5a2 2 0 0 1 1.7 2Z"/>',
  building: '<rect x="4.5" y="3" width="15" height="18" rx="2"/><path d="M9 7.5h.01M15 7.5h.01M9 11.5h.01M15 11.5h.01M9.5 21v-4.5h5V21"/>',
  gauge: '<path d="M4.2 17.5A9 9 0 1 1 19.8 17.5"/><path d="m12 13 4-4.2"/><circle cx="12" cy="13" r="1.2"/>',
};

export function icon(name, cls = '') {
  const body = P[name];
  if (!body) return '';
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
}

// Brand mark: a rounded square holding a heartbeat line ("pulse"), tinted by the page's role accent.
export function logoMark(size = 34) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true" class="logo-mark">
    <defs><linearGradient id="lg${size}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent-hover)"/><stop offset="1" stop-color="var(--accent)"/></linearGradient></defs>
    <rect width="40" height="40" rx="11" fill="url(#lg${size})"/>
    <path d="M6.5 21h6.2l3.1-8.4 5 16 3.6-9.6h9.1" fill="none" stroke="var(--on-accent)" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
