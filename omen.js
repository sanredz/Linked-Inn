const SEEN = 'omenSeen';
const q = new URLSearchParams(location.search);
const forced = q.has('omen'), duelLink = /^#duel=/.test(location.hash);

const NEWS = 'dailyNews', NEWS_UNTIL = Date.UTC(2026, 11, 2, 5), DREAM = 'dreamOmen', DREAM_UNTIL = Date.UTC(2026, 11, 4, 5);
const seen = () => { try { return !!localStorage.getItem(SEEN); } catch { return true; } };
const newsSeen = () => { try { return !!localStorage.getItem(NEWS); } catch { return true; } };
const dreamSeen = () => { try { return !!localStorage.getItem(DREAM); } catch { return true; } };
const dreamBefore = dreamSeen();
const wantDream = () => !dreamSeen() && (Date.now() < DREAM_UNTIL || q.has('dreamomen'));
const wantNews = () => !newsSeen() && (dreamBefore || q.has('dailynews')) && (Date.now() < NEWS_UNTIL || q.has('dailynews'));
const FACES = ['ysondre', 'lethon', 'emeriss', 'taerar'];

function dream() {
  if (document.querySelector('.omen')) return;
  if (!document.querySelector('link[href*="omen.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="omen.css?v=20261127150500">');
  const here = !!document.querySelector('[data-screen]');
  const box = document.createElement('div');
  box.className = 'omen dream';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'An omen from the Emerald Dream');
  box.innerHTML = `<div class="omen-card">
    <i class="omen-smoke"></i><i class="omen-crack"></i><i class="omen-embers">${'<b></b>'.repeat(14)}</i>
    <button class="omen-x" type="button" aria-label="Close">&times;</button>
    <small>The Dream is troubled</small>
    <span class="dream-faces" aria-hidden="true">${FACES.map((f) => `<i><img src="assets/raid/dream/${f}.webp" alt=""></i>`).join('')}</span>
    <h2>Four shadows stir in the Emerald Dream</h2>
    <b class="omen-name" data-text="▒▓░▓▒▓ ░▒ ▓▒░▓▒▓▒▓" aria-hidden="true">▒▓░▓▒▓ ░▒ ▓▒░▓▒▓▒▓</b>
    <p>The Great Trees have fallen silent. Something has crept into the Dream, and it wears four faces. Walk the Dream's four trials, wake the trees, and the way will open.</p>
    <p class="omen-whisper">“Close your eyes, little one... we are waiting.”</p>
    <div class="omen-cta"><a class="omen-go" href="${here ? '?raid' : 'draft.html?raid'}">Walk the Dream</a><button class="omen-later" type="button">Not yet</button></div>
  </div>`;
  const mark = () => { try { localStorage.setItem(DREAM, String(Date.now())); localStorage.setItem(SEEN, localStorage.getItem(SEEN) || String(Date.now())); } catch {} };
  const close = () => { mark(); box.classList.remove('in'); document.removeEventListener('keydown', key); setTimeout(() => box.remove(), 600); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  box.querySelector('.omen-x').onclick = close;
  box.querySelector('.omen-later').onclick = close;
  box.onclick = (e) => { if (e.target === box) close(); };
  box.querySelector('.omen-go').addEventListener('click', mark);
  document.addEventListener('keydown', key);
  document.body.append(box);
  requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('in')));
}
const TW = [[132123, '#b8c8ff', 'Veiled'], [136074, '#8fd67a', 'Overgrowth'], [136041, '#d8c99a', 'Fading'], [136223, '#c79bff', 'The Shade']];

function news() {
  if (document.querySelector('.omen')) return;
  if (!document.querySelector('link[href*="omen.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="omen.css?v=20261127150500">');
  const here = !!document.querySelector('#dailyRow');
  const box = document.createElement('div');
  box.className = 'omen news';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'New: the Daily Draft');
  box.innerHTML = `<div class="omen-card">
    <i class="omen-smoke"></i>
    <button class="omen-x" type="button" aria-label="Close">&times;</button>
    <small>New at the Inn</small>
    <h2>The Daily Draft</h2>
    <span class="news-dial" aria-hidden="true">${TW.map(([ic, c, n]) => `<i style="--tw:${c}"><img src="assets/icons/${ic}.png" alt=""><em>${n}</em></i>`).join('')}</span>
    <p>One draft a day, the same for every hero: the same class, the same offers, and a twist from the Emerald Dream that changes every day.</p>
    <p>You get one walk. Climb today's board, then come back tomorrow for a new twist.</p>
    <div class="omen-cta"><a class="omen-go" href="${here ? '#daily' : 'draft.html#daily'}">See today's Draft</a><button class="omen-later" type="button">Later</button></div>
  </div>`;
  const mark = () => { try { localStorage.setItem(NEWS, String(Date.now())); } catch {} };
  const close = () => { mark(); box.classList.remove('in'); document.removeEventListener('keydown', key); setTimeout(() => box.remove(), 600); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  box.querySelector('.omen-x').onclick = close;
  box.querySelector('.omen-later').onclick = close;
  box.onclick = (e) => { if (e.target === box) close(); };
  box.querySelector('.omen-go').addEventListener('click', (e) => {
    mark();
    if (here) { e.preventDefault(); close(); const row = document.querySelector('.dailyrow'); if (row) { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => row.click(), 500); } }
  });
  document.addEventListener('keydown', key);
  document.body.append(box);
  requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('in')));
}
const remember = () => { try { localStorage.setItem(SEEN, String(Date.now())); } catch {} };

function show() {
  if (document.querySelector('.omen')) return;
  if (!document.querySelector('link[href*="omen.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="omen.css?v=20261127150500">');
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
  if (!gates) return wantDream() ? dream() : wantNews() ? news() : !seen() || forced ? show() : null;
  setTimeout(whenClear, 1500);
}

if (forced || !seen() || wantDream() || wantNews()) setTimeout(whenClear, forced ? 600 : duelLink ? 9000 : 2600);
