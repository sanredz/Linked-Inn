const SEEN = 'omenSeen';
const q = new URLSearchParams(location.search);
const forced = q.has('omen');

const seen = () => { try { return !!localStorage.getItem(SEEN); } catch { return true; } };
const remember = () => { try { localStorage.setItem(SEEN, String(Date.now())); } catch {} };

function show() {
  if (document.querySelector('.omen')) return;
  if (!document.querySelector('link[href$="omen.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="omen.css">');
  const here = !!document.querySelector('[data-screen]');
  const box = document.createElement('div');
  box.className = 'omen';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'An omen');
  box.innerHTML = `<div class="omen-card">
    <i class="omen-smoke"></i><i class="omen-crack"></i><i class="omen-embers">${'<b></b>'.repeat(14)}</i>
    <button class="omen-x" type="button" aria-label="Close">&times;</button>
    <small>An omen</small>
    <h2>Something stirs beyond the Dark Portal</h2>
    <b class="omen-name" data-text="▒▓░▓ ▒▓░▓▒▒" aria-hidden="true">▒▓░▓ ▒▓░▓▒▒</b>
    <p>Six seals hold it in the dark. Three pieces of one thing lie with the masters of the Molten Core, Zul'Gurub and the Ruins of Ahn'Qiraj, and the Light must walk where each of them falls.</p>
    <p class="omen-whisper">“Break the seals... and I will answer.”</p>
    <div class="omen-cta"><a class="omen-go" href="${here ? '?raid' : 'draft.html?raid'}">Seek the seals</a><button class="omen-later" type="button">Not yet</button></div>
  </div>`;
  const close = () => { remember(); box.classList.remove('in'); document.removeEventListener('keydown', key); setTimeout(() => box.remove(), 600); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  box.querySelector('.omen-x').onclick = close;
  box.querySelector('.omen-later').onclick = close;
  box.onclick = (e) => { if (e.target === box) close(); };
  box.querySelector('.omen-go').addEventListener('click', remember);
  document.addEventListener('keydown', key);
  document.body.append(box);
  requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('in')));
}

function whenClear() {
  const gates = document.querySelector('.gates, .aqo, .seals, .troph, .duelover, body[data-view=draft], body[data-view=talents], body[data-view=fight]');
  if (!gates) return show();
  setTimeout(whenClear, 1500);
}

if (forced || !seen()) setTimeout(whenClear, forced ? 600 : 2600);
