const LEVEL = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Mythic: 5 };
const COLOR = { Common: '#f4ead8', Uncommon: '#1eff00', Rare: '#3a9bff', Epic: '#b45cff', Legendary: '#ff8000', Mythic: '#3dffb0' };
const LADDER = ['#f4ead8', '#1eff00', '#3a9bff', '#b45cff', '#ff8000', '#3dffb0'];
const KIND = { painting: 'painting', jar: 'curio', rack: 'weapon', steed: 'mount', trophy: 'trophy', key: 'key' };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let ac = null;
export function audio() {
  try { if (localStorage.getItem('trophyMute') === '1') return null; } catch {}
  try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; } catch { return null; }
}

export function bell(ctx, t, f, dur, vol) {
  for (const [mult, type, v] of [[1, 'sine', 1], [2, 'triangle', .28], [3.01, 'sine', .12]]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f * mult, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * v, t + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + .05);
  }
}

export function boom(ctx, t, vol = .5, low = 120) {
  const len = Math.floor(ctx.sampleRate * .9), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buf;
  f.type = 'lowpass';
  f.frequency.setValueAtTime(low * 6, t);
  f.frequency.exponentialRampToValueAtTime(low, t + .6);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + .9);
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t);
}

export function sound(kind, level = 0) {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime + .02;
  if (kind === 'mark') { boom(ctx, t, .22, 90); bell(ctx, t, 196, .9, .05); return; }
  if (kind === 'supreme') { boom(ctx, t, .55, 60); boom(ctx, t + .35, .45, 50); bell(ctx, t, 98, 1.6, .08); bell(ctx, t, 103.8, 1.6, .06); return; }
  if (kind === 'slain') { boom(ctx, t, .6, 70); [392, 494, 587, 784].forEach((f, i) => bell(ctx, t + .25 + i * .11, f, 2.2, .1)); return; }
  if (kind === 'charge') { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(520 + level * 120, t + .9); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.06, t + .7); g.gain.exponentialRampToValueAtTime(.0001, t + 1); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 1.05); return; }
  if (kind === 'tick') { boom(ctx, t, .25 + level * .06, 80 + level * 20); bell(ctx, t, 220 * Math.pow(1.19, level), .5, .05); return; }
  if (kind === 'ash') { boom(ctx, t, .3, 60); bell(ctx, t + .1, 130.8, 1.4, .05); bell(ctx, t + .1, 123.5, 1.4, .04); return; }
  if (kind === 'loot') {
    boom(ctx, t, .35 + level * .08, 110);
    const scale = [523.3, 659.3, 784, 1046.5, 1318.5, 1568, 2093];
    const n = 3 + level;
    for (let i = 0; i < n; i++) bell(ctx, t + .05 + i * (.09 - level * .008), scale[Math.min(scale.length - 1, i)], 1.6 + level * .3, .09);
    if (level >= 3) bell(ctx, t + .05 + n * .08, 2093, 2.6, .07);
  }
}

function card(d, i, n, keys) {
  const kind = KIND[d.kind] || 'collectible', lv = LEVEL[d.rarity] || 0, key = d.kind === 'key';
  const where = key ? `<div class="wlinn wlkey">${keys > 1 ? `You now hold ${keys} keys` : 'You now hold a key'} · use it from the World Boss card</div>` : `<div class="wlinn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V10l9-6 9 6v11h-5v-6a4 4 0 0 0-8 0v6Z"/></svg>Added to the Cellar of your Lion's Pride Inn</div>`;
  return `<div class="wloot r${lv} ${key ? 'key' : ''}" style="--rc:${COLOR[d.rarity]}" role="dialog" aria-modal="true" aria-label="${esc(d.name)}">
    <div class="wlflash"></div><div class="wlembers">${'<i></i>'.repeat(Math.min(26, 10 + lv * 4))}</div>
    <div class="wlorb"><i></i><b></b></div>
    <div class="wlcard">
      <small class="wlkick">${esc(d.from)} dropped</small>
      <div class="wlglow"><i class="wlrays"></i><i class="wlring"></i><i class="wlring two"></i><img src="assets/icons/${d.icon}.png" alt=""></div>
      <b class="wlrarity">${esc(d.rarity)} ${kind}</b>
      <h2>${esc(d.name)}</h2>
      <p>${esc(d.text)}</p>
      ${where}
      <div class="wlgo">${key ? '' : '<button class="wlsee">See it in the Inn</button>'}<button class="wlnext ${key ? 'solo' : ''}">${i < n - 1 ? 'Next' : 'Continue'}</button></div>
      ${n > 1 ? `<small class="wlcount">${i + 1} of ${n}</small>` : ''}
    </div></div>`;
}

export async function revealLoot(drops, { onInn, instant, keys = 1 } = {}) {
  for (let i = 0; i < drops.length; i++) {
    const d = drops[i], lv = LEVEL[d.rarity] || 0, host = document.createElement('div');
    host.innerHTML = card(d, i, drops.length, keys);
    const box = host.firstElementChild;
    document.body.append(box);
    const choice = new Promise((done) => {
      const see = box.querySelector('.wlsee');
      if (see) see.onclick = () => done('inn');
      box.querySelector('.wlnext').onclick = () => done('next');
      const key = (e) => { if (e.key === 'Escape') { removeEventListener('keydown', key); done('next'); } };
      addEventListener('keydown', key);
    });
    requestAnimationFrame(() => box.classList.add('in'));
    if (calm() || (instant && i === 0)) box.classList.add('open');
    else {
      sound('charge', lv);
      await wait(950 + lv * 120);
      box.classList.add('open');
    }
    sound('loot', lv);
    box.querySelector('.wlnext').focus({ preventScroll: true });
    const go = await choice;
    box.classList.add('out');
    setTimeout(() => box.remove(), 320);
    if (go === 'inn') { if (onInn) onInn(d); return 'inn'; }
    await wait(200);
  }
  return 'done';
}

function panel(html, cls, rc) {
  const host = document.createElement('div');
  host.innerHTML = `<div class="wloot open ${cls}" style="--rc:${rc}" role="dialog" aria-modal="true"><div class="wlembers">${'<i></i>'.repeat(cls === 'wfull' ? 26 : 10)}</div><div class="wlcard">${html}</div></div>`;
  const box = host.firstElementChild;
  document.body.append(box);
  requestAnimationFrame(() => box.classList.add('in'));
  return new Promise((done) => {
    const close = () => { removeEventListener('keydown', key); box.classList.add('out'); setTimeout(() => box.remove(), 320); done(); };
    const key = (e) => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', key);
    box.querySelector('.wlnext').onclick = close;
    box.querySelector('.wlnext').focus({ preventScroll: true });
  });
}

function tableHtml(o) {
  return `<ul class="wtable">${o.loot.map((l) => `<li class="${o.have[l.id] ? 'have' : ''}" style="--r:${COLOR[l.rarity]}"><img src="assets/icons/${l.icon}.png" alt=""><span><b>${esc(l.name)}</b><small>${esc(l.rarity)}</small></span><i>${o.have[l.id] ? '✓' : ''}</i></li>`).join('')}${o.full ? `<li class="keyrow" style="--r:${COLOR.Mythic}"><img src="assets/icons/${o.key.icon}.png" alt=""><span><b>${esc(o.key.name)}</b><small>Mythic · unlocked</small></span><i></i></li>` : ''}</ul>`;
}

async function chest(level, o) {
  const host = document.createElement('div'), empty = level < 0, color = empty ? '#8f8478' : LADDER[level];
  host.innerHTML = `<div class="wcz ${empty ? 'empty' : `l${level}`}" style="--rc:${LADDER[0]}" role="dialog" aria-modal="true" aria-label="${esc(o.title)}">
    <div class="wczflash"></div><i class="wczrays"></i><div class="wczash">${'<i></i>'.repeat(16)}</div>
    <div class="wczbox"><div class="wczglow"></div><div class="wczlid"><i></i></div><div class="wczbase"><b></b></div></div>
    <div class="wczsay"><small>${esc(o.title)}</small><b>Searching the remains…</b></div>
    <button class="wczskip">Skip</button>
  </div>`;
  const box = host.firstElementChild, say = box.querySelector('.wczsay b');
  document.body.append(box);
  let skip = false;
  box.querySelector('.wczskip').onclick = () => { skip = true; };
  requestAnimationFrame(() => box.classList.add('in'));
  const steps = empty ? 2 : Math.max(2, level + 2);
  if (!calm()) {
    await wait(700);
    for (let i = 0; i < steps && !skip; i++) {
      const lv = empty ? -1 : Math.min(level, Math.max(0, i - 1));
      box.style.setProperty('--rc', lv < 0 ? '#a89a88' : LADDER[lv]);
      box.classList.remove('shake');
      void box.offsetWidth;
      box.classList.add('shake');
      sound('tick', i);
      if (i === steps - 1 && !empty) say.textContent = level >= 4 ? 'Something powerful stirs…' : level >= 2 ? 'Light spills from the seams…' : 'Something glints inside…';
      await wait(i === steps - 1 ? 760 : 620);
    }
  }
  box.style.setProperty('--rc', color);
  box.classList.add('open');
  say.textContent = empty ? 'Only ash and embers this time' : level >= 5 ? 'The Dark Portal answers' : `${['A common find', 'An uncommon find', 'A rare find', 'An epic find', 'A legendary find'][level]}!`;
  sound(empty ? 'ash' : 'loot', Math.max(0, level));
  await wait(empty ? 1500 : 1300);
  box.classList.add('out');
  setTimeout(() => box.remove(), 320);
}

export async function walkout(o) {
  const items = [...o.drops, ...(o.keyed ? [{ ...o.key, kind: 'key', from: o.from }] : [])];
  const level = items.length ? Math.max(...items.map((d) => LEVEL[d.rarity] || 0)) : -1;
  await chest(level, o);
  let how = 'done';
  if (items.length) how = await revealLoot(items, { onInn: o.onInn, instant: true, keys: o.keys });
  if (how === 'inn') return how;
  if (o.complete) {
    sound('slain');
    await panel(`<small class="wlkick">${esc(o.from)}</small><div class="wfullring">${o.loot.map((l, i) => `<img src="assets/icons/${l.icon}.png" alt="" style="--i:${i};--n:${o.loot.length};--r:${COLOR[l.rarity]}">`).join('')}<img class="wfullkey" src="assets/icons/${o.key.icon}.png" alt=""></div><b class="wlrarity">Collection complete</b><h2>Every treasure is yours</h2><p>You own all ${o.loot.length} of ${esc(o.from)}'s collectibles. From now on each kill has a chance to drop a ${esc(o.key.name)}, which lets you face any world boss again, even on a day you already have.</p><div class="wlgo"><button class="wlnext solo">Continue</button></div>`, 'wfull', '#ffd76a');
  } else if (!items.length) {
    await panel(`<small class="wlkick">${esc(o.from)}'s hoard</small><b class="wlrarity">Empty this time</b><h2>Only ash and embers</h2><p>${o.full ? `You own every collectible. Each kill now has a chance at a key.` : `You have ${o.owned} of ${o.loot.length}. Every kill rolls for each one you are missing.`}</p>${tableHtml(o)}<div class="wlgo"><button class="wlnext solo">Continue</button></div>`, 'wempty', '#a89a88');
  }
  return how;
}
