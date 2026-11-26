const SQUARE = /(^|\/)assets\/(icons|classes|profs|game\/ui)\/|zamimg\.com\/images\/wow\/icons\/|worldofwarcraft\.com\/.*\/icons\//;
const ZOOM = 1.2;
const LOOK = { 'background-position': 'center', 'background-size': `${ZOOM * 100}%`, 'background-repeat': 'no-repeat', 'object-position': '-99999px 0' };
const zoomIn = (el, src) => {
  el.style.setProperty('background-image', `url("${src}")`, 'important');
  for (const k in LOOK) el.style.setProperty(k, LOOK[k], 'important');
  el.dataset.rzi = '1';
};
const zoomOut = (el) => {
  for (const k of ['background-image', ...Object.keys(LOOK)]) el.style.removeProperty(k);
  delete el.dataset.rzi;
};

const radius = (el, cs) => {
  const r = cs.borderTopLeftRadius, w = el.offsetWidth || el.getBoundingClientRect().width;
  if (!w) return false;
  return r.endsWith('%') ? parseFloat(r) >= 40 : parseFloat(r) >= w * .4;
};
const clips = (cs) => cs.overflow !== 'visible' || cs.clipPath !== 'none';
const zoomed = (cs) => (cs.scale && cs.scale !== 'none' && parseFloat(cs.scale) > 1.1) || cs.clipPath !== 'none' || Math.abs(new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform).a) > 1.1;
const bgUrl = (el) => { const m = /url\(["']?([^"')]+)/.exec(el.style.backgroundImage || ''); return m ? m[1] : ''; };

function fix(el) {
  if (!el.isConnected) return;
  if (!el.getBoundingClientRect().width) return later(el);
  if (el.tagName === 'IMG') {
    const src = el.getAttribute('src') || '';
    if (!SQUARE.test(src)) { if (el.dataset.rzi) zoomOut(el); if (el.dataset.rzs) { el.style.scale = ''; delete el.dataset.rzs; } return; }
    const cs = getComputedStyle(el);
    if (el.dataset.rzi) return zoomIn(el, el.currentSrc || el.src);
    if (el.dataset.rzs) return;
    if (radius(el, cs) && cs.clipPath === 'none') return zoomIn(el, el.currentSrc || el.src);
    const p = el.parentElement;
    if (!p || zoomed(cs)) return;
    const pc = getComputedStyle(p), pw = p.offsetWidth || p.getBoundingClientRect().width;
    if (radius(p, pc) && clips(pc) && (el.offsetWidth || el.getBoundingClientRect().width) >= pw * .75) { el.style.scale = String(ZOOM); el.dataset.rzs = '1'; }
    return;
  }
  const url = bgUrl(el);
  if (!SQUARE.test(url)) return;
  const cs = getComputedStyle(el);
  if (!radius(el, cs)) return;
  const size = cs.backgroundSize;
  if (['cover', 'auto', '100%', '100% 100%', 'contain', 'auto auto'].includes(size)) el.style.backgroundSize = `${ZOOM * 100}%`;
}

const waiting = new Set();
let tick = 0;
function later(el) {
  waiting.add(el);
  if (tick) return;
  tick = setTimeout(() => {
    tick = 0;
    const list = [...waiting];
    waiting.clear();
    for (const e of list) if (e.isConnected) { seen.delete(e); take(e); }
  }, 700);
}

const seen = new WeakSet();
const watch = new IntersectionObserver((list) => {
  for (const e of list) {
    if (!e.isIntersecting) continue;
    watch.unobserve(e.target);
    fix(e.target);
  }
});
const take = (el) => {
  if (seen.has(el)) return;
  seen.add(el);
  watch.observe(el);
};
const scan = (root) => {
  if (root.nodeType !== 1) return;
  if (root.matches('img, [style*="background-image"]')) take(root);
  for (const el of root.querySelectorAll('img, [style*="background-image"]')) take(el);
};

new MutationObserver((list) => {
  for (const m of list) {
    if (m.type === 'attributes') {
      seen.delete(m.target);
      take(m.target);
      continue;
    }
    for (const n of m.addedNodes) scan(n);
  }
}).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
scan(document.body);
