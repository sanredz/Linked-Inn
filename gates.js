const API = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'http://localhost:8789' : 'https://azeroth-draft.sanredz.workers.dev';
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
