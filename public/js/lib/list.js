// Keyed list reconciler: updates the DOM in place instead of re-rendering, so polling never causes flicker,
// lost hover/focus, or restarted animations. New items animate in, removed items animate out, and items that
// change position glide there (FLIP).
import { reducedMotion } from './ui.js';

export function reconcile(container, items, opts) {
  const { key, render, sig = (x) => JSON.stringify(x), tag = 'div', className = '', attrs, flash = true, stagger = true } = opts;
  const animate = !reducedMotion();

  const live = () => [...container.children].filter((c) => c.dataset.key && !c.classList.contains('exit'));
  const before = new Map(live().map((el) => [el.dataset.key, el.getBoundingClientRect()]));
  const byKey = new Map(live().map((el) => [el.dataset.key, el]));
  const wanted = new Set(items.map((it) => String(key(it))));
  const initial = byKey.size === 0;

  // 1. remove what disappeared (animated)
  for (const [k, el] of byKey) {
    if (wanted.has(k)) continue;
    byKey.delete(k);
    if (animate) { el.classList.add('exit'); setTimeout(() => el.remove(), 320); } else el.remove();
  }

  // 2. create / patch / order
  items.forEach((item, i) => {
    const k = String(key(item));
    let el = byKey.get(k);
    const s = sig(item);
    if (!el) {
      el = document.createElement(tag);
      el.dataset.key = k;
      el.className = className;
      el.innerHTML = render(item);
      el._sig = s;
      if (animate) { el.classList.add('enter'); el.style.setProperty('--i', stagger && initial ? Math.min(i, 8) : 0); }
      byKey.set(k, el);
    } else if (el._sig !== s) {
      el.innerHTML = render(item);
      el._sig = s;
      if (flash && animate) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    }
    attrs?.(el, item);
    const at = live()[i];
    if (at !== el) container.insertBefore(el, at ?? null);
  });

  // 3. FLIP: glide existing items from their old position to the new one
  if (animate) {
    live().forEach((el) => {
      const prev = before.get(el.dataset.key);
      if (!prev) return;
      const dy = prev.top - el.getBoundingClientRect().top;
      if (Math.abs(dy) > 1) {
        el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    });
  }
}
