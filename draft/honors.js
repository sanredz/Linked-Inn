export const HONORS = [];

const PREVIEW = /^(localhost|127\.0\.0\.1|azeroth-preview\.pages\.dev|[\w-]+\.azeroth-preview\.pages\.dev)$/.test(location.hostname);
const forced = () => { if (!PREVIEW) return null; const q = new URLSearchParams(location.search).get('honor'); return q && HONORS.find((h) => h.id === q) || null; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function honorsOf(share) {
  const f = forced();
  const list = HONORS.filter((h) => h.share && h.share === share);
  if (f && !list.includes(f)) list.unshift(f);
  return list;
}

let css = false;
function loadCss() {
  if (css || document.querySelector('link[data-honors]')) return;
  css = true;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.dataset.honors = '1';
  l.href = new URL('./honors.css', import.meta.url).href;
  document.head.append(l);
}

export function medalHtml(h, size = '') {
  loadCss();
  return `<span class="hon-medal ${h.theme} ${size}"><i class="hon-ribbon"></i><span class="hon-disc"><span class="hon-ring"></span><img src="assets/icons/${h.icon}.png" alt=""></span></span>`;
}

export function titleHtml(h) {
  loadCss();
  return `<span class="hon-title ${h.theme}" data-honor="${h.id}">${medalHtml(h, 'xs')}<b>${esc(h.title)}</b></span>`;
}

export function honorCards(list) {
  loadCss();
  if (!list.length) return '';
  return `<div class="hon-cards">${list.map((h) => `<button class="hon-card ${h.theme}" data-honor="${h.id}">${medalHtml(h, 'sm')}<span><small>Honor of the Inn</small><b>${esc(h.title)}</b><em>${esc(h.line)}</em></span></button>`).join('')}</div>`;
}

export function plaqueHtml(list) {
  loadCss();
  if (!list.length) return '';
  return `<div class="hon-plaques">${list.map((h) => `<div class="hon-plaque ${h.theme}">${medalHtml(h, 'xs')}<span><small>Honored guest of the Inn</small><b>${esc(h.title)}</b></span></div>`).join('')}</div>`;
}

const SEEN = 'honorSeen';
const seenList = () => { try { return JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch { return []; } };
export function unseen(list) {
  const f = forced();
  if (f) return list.filter((h) => h === f);
  const s = seenList();
  return list.filter((h) => !s.includes(h.id));
}
const markSeen = (h) => { try { localStorage.setItem(SEEN, JSON.stringify([...new Set([...seenList(), h.id])])); } catch {} };

let playing = false;
export async function revealHonor(h, name) {
  if (playing) return;
  playing = true;
  loadCss();
  await new Promise((ok) => setTimeout(ok, 60));
  const el = document.createElement('div');
  el.className = `hon-reveal ${h.theme}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', `Honor: ${h.title}`);
  el.innerHTML = `<div class="hon-motes"></div><div class="hon-burst"></div>
    <div class="hon-stage">
      <small class="hon-kicker">An honor of the Inn</small>
      <div class="hon-drop">${medalHtml(h, 'xl')}</div>
      <p class="hon-for">${esc(name || h.who)}</p>
      <h1 class="hon-name">${esc(h.title)}</h1>
      <p class="hon-line">${esc(h.line)}</p>
      <div class="hon-facts">${h.facts.map(([n, t], i) => `<div style="--i:${i}"><b>${esc(n)}</b><span>${esc(t)}</span></div>`).join('')}</div>
      <p class="hon-where">Your title now shows on your Hearth and in the Lion's Pride Inn.</p>
      <button class="hon-ok" type="button">Accept the honor</button>
    </div>`;
  const motes = el.querySelector('.hon-motes');
  for (let i = 0; i < 46; i++) { const m = document.createElement('i'); m.style.cssText = `left:${Math.random() * 100}%;animation-delay:${(Math.random() * 6).toFixed(2)}s;animation-duration:${(5 + Math.random() * 6).toFixed(2)}s;--s:${(0.5 + Math.random() * 1.6).toFixed(2)}`; motes.append(m); }
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('on'));
  chime();
  const close = () => { markSeen(h); el.classList.add('out'); setTimeout(() => { el.remove(); playing = false; }, 700); document.removeEventListener('keydown', key); };
  const key = (e) => { if (e.key === 'Escape' || e.key === 'Enter') close(); };
  document.addEventListener('keydown', key);
  el.querySelector('.hon-ok').onclick = close;
  return new Promise((ok) => { const t = setInterval(() => { if (!document.body.contains(el)) { clearInterval(t); ok(); } }, 200); });
}

function chime() {
  let ctx;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  if (ctx.state === 'suspended') return;
  const t0 = ctx.currentTime + 0.9;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t0 + i * 0.12); g.gain.linearRampToValueAtTime(0.12, t0 + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.0005, t0 + i * 0.12 + 2.4);
    o.connect(g); g.connect(ctx.destination); o.start(t0 + i * 0.12); o.stop(t0 + i * 0.12 + 2.5);
  });
}
