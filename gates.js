const API = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'http://localhost:8789' : 'https://azeroth-draft.sanredz.workers.dev';
const SEEN = 'aqGateSeen', ANNOUNCE = 7 * 864e5;
let pending = null;

export const loadWar = () => (pending ||= fetch(`${API}/war`).then((r) => (r.ok ? r.json() : null)).catch(() => null));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : Math.round(n).toLocaleString('en-US'));

export function goalsHtml(goals) {
  return `<ul class="gates-goals">${goals.map((g) => {
    const p = Math.min(1, g.have / g.need), done = p >= 1;
    return `<li class="${done ? 'done' : ''}"><img src="assets/icons/${g.icon}.png" alt=""><div><span><b>${esc(g.name)}</b><em>${done ? 'Reached' : `${short(g.have)} of ${short(g.need)}`}</em></span><i class="gates-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p * 100)}"><i style="width:${(p * 100).toFixed(1)}%"></i></i></div></li>`;
  }).join('')}</ul>`;
}

const seen = () => { try { return JSON.parse(localStorage.getItem(SEEN) || 'null'); } catch { return null; } };
const remember = (open) => { try { localStorage.setItem(SEEN, JSON.stringify({ open, at: Date.now() })); } catch {} };

function popup(w) {
  if (w.open && w.openedAt && Date.now() - w.openedAt > ANNOUNCE && !new URLSearchParams(location.search).has('gates')) return;
  const last = seen();
  if (last && last.open === w.open && !new URLSearchParams(location.search).has('gates')) return;
  const box = document.createElement('aside');
  box.className = 'gates';
  box.setAttribute('aria-label', w.open ? "The Ruins of Ahn'Qiraj are open" : "The Gates of Ahn'Qiraj");
  const here = !!document.querySelector('[data-screen]');
  box.innerHTML = `<button class="gates-x" type="button" aria-label="Close">&times;</button><small>${w.open ? 'The gates are open' : 'The war effort'}</small><h2>${w.open ? "The Ruins of Ahn'Qiraj are open" : "The Gates of Ahn'Qiraj"}</h2><p>${w.open ? 'Six new bosses, richer spoils and the Scepter of the Shifting Sands await.' : "The Ruins open when Azeroth's heroes reach all three goals together. Every final stand and every forged legendary counts."}</p>${goalsHtml(w.goals)}<a class="gates-go" href="${here ? '?raid' : 'draft.html?raid'}">${w.open ? 'Take me raiding' : 'Join the war effort'}</a>`;
  const close = () => { remember(w.open); box.classList.remove('in'); setTimeout(() => box.remove(), 300); };
  box.querySelector('.gates-x').onclick = close;
  box.querySelector('.gates-go').addEventListener('click', () => remember(w.open));
  document.body.append(box);
  setTimeout(() => box.classList.add('in'), 40);
}

if (!document.documentElement.hasAttribute('data-nogates')) setTimeout(() => loadWar().then((w) => { if (w && w.goals) popup(w); }), 1200);
