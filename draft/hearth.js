import * as THREE from 'three';
import { ANY, FEATS, MODES, MOUNTS, PORTRAIT, PORTRAITS, RELICS, TIERS, count, earned, forgeReady, forgeSteps, owned, portraitOpen, usedIn, valueOf } from './feats.js';
import { askName, claimName, heroName, nameOk } from '../pvp/name.js';

const WHO = 'gauntletWho', CLASSES = ['WARRIOR', 'PALADIN', 'HUNTER', 'ROGUE', 'PRIEST', 'SHAMAN', 'MAGE', 'WARLOCK', 'DRUID'];
const CLASS_NAME = Object.fromEntries(CLASSES.map((c) => [c, c[0] + c.slice(1).toLowerCase()]));
const QUALITY = { 2: '#1eff00', 3: '#0070dd', 4: '#a335ee', 5: '#ff8000' };
const SLOT_NAME = { head: 'Head', neck: 'Neck', shoulder: 'Shoulders', back: 'Back', chest: 'Chest', wrist: 'Wrists', hands: 'Hands', waist: 'Waist', legs: 'Legs', feet: 'Feet', finger: 'Ring', trinket: 'Trinket', main: 'Main hand', off: 'Off hand', ranged: 'Ranged' };
const RIDE_VIEW = { x: 0, y: 2.7, z: 11.5, tx: 0, ty: 1.95 }, FOOT_VIEW = { x: 0, y: 1.02, z: 5.7, tx: 0, ty: .98 };
const num = (n) => Math.round(n || 0).toLocaleString('en-US');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const deviceWho = () => {
  try {
    let id = localStorage.getItem(WHO);
    if (!id) { id = Math.random().toString(36).slice(2, 14); localStorage.setItem(WHO, id); }
    return id;
  } catch { return ''; }
};

let ctx = null, data = null, got = new Set(), tab = 'overview', root = null, stage = null, showing = '', mountRoot = null, mountMixer = null, heroRig = null, busy = Promise.resolve();

export function setupHearth(c) { ctx = c; }

export async function loadHearth(extra = {}) {
  const r = await fetch(`${ctx.API}/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: ctx.key(), who: deviceWho(), ...extra }) });
  if (!r.ok) throw new Error('profile');
  data = await r.json();
  got = earned(data.stats);
  return data;
}

const sq = (p) => (p.id.startsWith('class:') ? 'sq' : '');
const portraitOf = () => PORTRAIT[data && data.profile.icon] || PORTRAIT['hero:thrall'] || PORTRAITS[0];
const totalRuns = (s) => s.gear.runs + s.arena.runs + Object.values(s.raids).reduce((n, r) => n + r.runs, 0);

export function held() {
  const have = {};
  for (const r of Object.values((data && data.stats.raids) || {})) for (const [id, n] of Object.entries(r.drops || {})) have[id] = (have[id] || 0) + n;
  return have;
}

export function hearthBar(el) {
  if (!data) return;
  const p = portraitOf(), n = got.size;
  el.innerHTML = `<button class="hb" data-hearth><span class="hbface"><img class="${sq(p)}" src="${p.src}" alt=""></span><span class="hbwho"><small>Your Hearth</small><b>${esc(heroName())}</b></span><span class="hbbadges"><i style="--p:${n / FEATS.length}"></i><b>${n}</b><small>of ${FEATS.length} badges</small></span>${RELICS.some((x) => forgeReady(data.stats, x)) ? '<span class="hbforge">Forge ready</span>' : ''}<span class="hbgo">Open</span></button>`;
  el.hidden = false;
}

const modeOf = (f) => MODES.find((m) => m.id === f.mode) || ANY;
const artOf = (f) => (f.icon ? `assets/icons/${f.icon}.png` : f.art || modeOf(f).art);
const medal = (f) => {
  const on = got.has(f.id);
  return `<button class="hm ${on ? 'on' : 'off'} ${f.tier} ${f.art ? 'hcls' : ''}" style="--t:${TIERS[f.tier]}" data-feat="${f.id}" aria-label="${esc(f.name)}: ${esc(f.text)}${on ? '' : ' (locked)'}"><span class="hmface" style="background-image:url(${artOf(f)})"></span>${on ? '' : '<i class="hmlock"></i>'}<b>${esc(f.name)}</b><small>${esc(f.text)}</small></button>`;
};
const RANK = { bronze: 0, silver: 1, gold: 2, legend: 3 }, GLANCE = 8;
let expanded = {};

function badgeBlock(key, list, title = 'Badges') {
  const open = list.filter((f) => !f.hidden || got.has(f.id)), mine = open.filter((f) => got.has(f.id));
  const next = open.filter((f) => !got.has(f.id)).sort((a, b) => RANK[a.tier] - RANK[b.tier]);
  const all = expanded[key], shown = all ? [...mine, ...next] : [...mine.slice(0, Math.max(GLANCE, mine.length)), ...next.slice(0, Math.max(0, GLANCE - mine.length))];
  const rest = mine.length + next.length - shown.length;
  return `<h3 class="hh3">${title} <em>${mine.length} of ${list.length} earned</em></h3>${shown.length ? `<div class="hmedals">${shown.map(medal).join('')}</div>` : '<p class="hempty">Play this mode to earn your first badge.</p>'}<div class="hmore">${rest > 0 || all ? `<button class="gmini" data-more="${key}">${all ? 'Show fewer' : `Show all ${mine.length + next.length} badges`}</button>` : ''}</div>`;
}

const tile = (value, label, tone = '') => `<div class="ht ${tone}"><b>${value}</b><span>${label}</span></div>`;

function collectionHtml(raid) {
  const s = data.stats, items = [...MOUNTS, ...RELICS].filter((x) => !raid || x.raid === raid);
  if (!items.length) return '';
  return `${forgeBanner(raid)}<div class="hcoll">${items.map((x) => {
    const n = x.stack ? Math.min(count(s, x.id), x.stack) : 0, have = x.stack ? n > 0 : owned(s, x), mount = MOUNTS.includes(x), riding = mount && data.profile.ride === x.id, into = usedIn(s, x), ready = forgeReady(s, x);
    const steps = x.forged && !have && !ready ? `<span class="hcsteps">${forgeSteps(s, x).map(([t, ok]) => `<i class="${ok ? 'ok' : ''}">${esc(t)}</i>`).join('')}</span>` : '';
    const say = into ? `Forged into ${esc(into.short)}` : x.stack ? (have ? `${n} of ${x.stack} · from ${esc(x.from)}` : `Drops from ${esc(x.from)}`) : have ? (x.forged ? 'Legendary · forged' : `From ${esc(x.from)}`) : x.forged ? (ready ? 'Ready for the forge' : 'Forged from') : `Drops from ${esc(x.from)}`;
    const button = ready ? `<button class="hforgego" data-forge="${x.id}">Forge</button>` : have && mount ? `<button class="hride ${riding ? 'on' : ''}" data-ride="${riding ? 0 : x.id}">${riding ? 'Riding' : 'Ride'}</button>` : '';
    return `<div class="hc ${have ? 'on' : 'off'} ${x.forged ? 'forged' : ''} ${into ? 'used' : ''} ${ready ? 'ready' : ''}"><span class="hcicon"><img src="assets/icons/${x.icon}.png" alt=""></span><span class="hcsay"><b>${have || ready ? esc(x.name) : 'Undiscovered'}</b><small>${say}</small>${steps}</span>${button}</div>`;
  }).join('')}</div>`;
}

function forgeBanner(raid) {
  const ready = RELICS.filter((x) => (!raid || x.raid === raid) && forgeReady(data.stats, x));
  return ready.map((x) => `<div class="hforge ${x.theme}"><span class="hforgeicon"><img src="assets/icons/${x.icon}.png" alt=""></span><span class="hforgesay"><small>The Legendary Forge awaits</small><b>${esc(x.name)}</b><em>Everything is gathered. Bring it to the anvil.</em></span><button class="hforgego big" data-forge="${x.id}">Forge ${esc(x.short)}</button></div>`).join('');
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function forge(id) {
  const x = RELICS.find((r) => r.id === id), parts = x.forged.map((p) => RELICS.find((r) => r.id === p)).flatMap((p) => (p.stack ? [p, p, p] : [p]));
  const r = await fetch(`${ctx.API}/forge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: ctx.key(), item: id }) }).catch(() => null);
  if (!r || !r.ok) { alert('The forge went cold. Try again in a moment.'); return; }
  const box = document.createElement('div'), calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  box.className = `fcer ${x.theme}`;
  box.innerHTML = `<canvas></canvas><div class="fcore"></div><div class="fparts">${parts.map((p, i) => `<img src="assets/icons/${p.icon}.png" alt="" style="--a:${(360 / parts.length) * i}deg">`).join('')}</div><div class="fflash"></div><div class="freveal"><div class="frays"></div><img class="ficon" src="assets/icons/${x.icon}.png" alt=""><small>Legendary</small><h2>${esc(x.name)}</h2><button class="hforgego big">Claim</button></div>`;
  document.body.append(box);
  const stop = sparks(box.querySelector('canvas'), x.theme);
  const claim = new Promise((done) => { box.querySelector('.freveal button').onclick = done; });
  if (calm) box.classList.add('reveal', 'done');
  else {
    requestAnimationFrame(() => box.classList.add('in'));
    await wait(300); box.classList.add('pull');
    await wait(1900); box.classList.add('flash');
    await wait(260); box.classList.add('reveal');
    await wait(1100); box.classList.add('done');
  }
  await claim;
  box.classList.add('out');
  setTimeout(() => { stop(); box.remove(); }, 400);
  await loadHearth();
  refresh();
  if (ctx.onChange) ctx.onChange();
}

function sparks(canvas, theme) {
  const g = canvas.getContext('2d'), dots = [], hue = theme === 'storm' ? [190, 215] : [18, 42];
  let on = true, t0 = performance.now();
  const size = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; };
  size();
  addEventListener('resize', size);
  const tick = (now) => {
    if (!on) return;
    const t = (now - t0) / 1000, cx = canvas.width / 2, cy = canvas.height / 2, k = devicePixelRatio, burst = t > 2.45 && t < 2.6;
    const rate = burst ? 40 : t < 2.4 ? 2 + t * 4 : 1.5;
    for (let i = 0; i < rate; i++) {
      const a = Math.random() * Math.PI * 2, sp = (burst ? 6 + Math.random() * 10 : 1 + Math.random() * 3) * k;
      dots.push(t < 2.4 && !burst ? { x: cx + Math.cos(a) * 260 * k, y: cy + Math.sin(a) * 260 * k, vx: -Math.cos(a) * sp, vy: -Math.sin(a) * sp, life: 1, h: hue[0] + Math.random() * (hue[1] - hue[0]) } : { x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, h: hue[0] + Math.random() * (hue[1] - hue[0]) });
    }
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(5, 3, 2, .28)';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.globalCompositeOperation = 'lighter';
    for (let i = dots.length - 1; i >= 0; i--) {
      const d = dots[i];
      d.x += d.vx; d.y += d.vy; d.vx *= .985; d.vy *= .985; d.life -= .012;
      if (d.life <= 0) { dots.splice(i, 1); continue; }
      g.fillStyle = `hsla(${d.h}, 100%, ${55 + d.life * 25}%, ${d.life})`;
      g.beginPath(); g.arc(d.x, d.y, (1 + d.life * 2) * k, 0, Math.PI * 2); g.fill();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return () => { on = false; removeEventListener('resize', size); };
}

function modeCard(m) {
  const s = data.stats, feats = FEATS.filter((f) => f.mode === m.id), n = feats.filter((f) => got.has(f.id)).length;
  const line = m.id === 'gear' ? `${num(s.gear.runs)} runs · best ${s.gear.best ? s.gear.best.toFixed(1) : '-'}` : m.id === 'arena' ? `${num(s.arena.runs)} runs · best ${s.arena.best}/10` : `${num(s.raids[m.id].runs)} runs · best ${s.raids[m.id].best} bosses`;
  return `<button class="hmode" data-tab="${m.id}" style="background-image:url(${m.art})"><span><b>${m.name}</b><small>${line}</small></span><em>${n}/${feats.length}</em></button>`;
}

function tabHtml() {
  const s = data.stats;
  if (tab === 'overview') {
    const mine = FEATS.filter((f) => got.has(f.id)).sort((a, b) => RANK[b.tier] - RANK[a.tier]), all = expanded.overview, shown = all ? mine : mine.slice(0, 12);
    return `<div class="hmodes">${MODES.map(modeCard).join('')}</div>
      <h3 class="hh3">Collection</h3>${collectionHtml('')}
      <h3 class="hh3">Badges earned <em>${mine.length} of ${FEATS.length}</em></h3>${mine.length ? `<div class="hmedals">${shown.map(medal).join('')}</div>` : '<p class="hempty">Play any mode to earn your first badge.</p>'}<div class="hmore">${mine.length > 12 ? `<button class="gmini" data-more="overview">${all ? 'Show fewer' : `Show all ${mine.length}`}</button>` : ''}</div>`;
  }
  const feats = badgeBlock(tab, FEATS.filter((f) => f.mode === tab));
  if (tab === 'gear') {
    const g = s.gear, it = s.items, best = CLASSES.filter((c) => g.bestOf[c]);
    return `<div class="htiles">${tile(num(g.runs), 'Runs')}${tile(g.best ? g.best.toFixed(1) : '-', 'Best DPS', 'gold')}${tile(g.rank ? `#${num(g.rank)}` : '-', 'Board rank')}${tile(`${g.classes.length}/9`, 'Classes')}</div>${feats}
      ${best.length ? `<h3 class="hh3">Best by class</h3><div class="hbest">${best.map((c) => `<span><img src="assets/classes/${c}.png" alt=""><b>${g.bestOf[c].dps.toFixed(1)}</b><small>${CLASS_NAME[c]}</small></span>`).join('')}</div>` : ''}
      ${it.most.length ? `<h3 class="hh3">Most used gear <em>your favourite pick in each slot, across every mode</em></h3><div class="hmost">${it.most.map((x) => `<div class="hmu" style="--q:${QUALITY[x.q]}" title="${esc(x.name)}"><img src="assets/icons/${x.icon}.png" alt=""><span><small>${SLOT_NAME[x.slot]}</small><b>${esc(x.name)}</b></span><em>${x.n}x</em></div>`).join('')}</div>` : ''}`;
  }
  if (tab === 'arena') {
    const a = s.arena;
    return `<div class="htiles">${tile(num(a.runs), 'Runs')}${tile(num(a.fights), 'Duels')}${tile(num(a.wins), 'Wins')}${tile(`${a.best}/10`, 'Best run', 'gold')}${tile(num(a.tens), '10-win runs')}</div>${feats}
      ${a.classes.length ? `<h3 class="hh3">Champions played</h3><div class="hbest">${a.classes.map((c) => `<span class="${a.tenClasses.includes(c) ? 'ten' : ''}"><img src="assets/classes/${c}.png" alt=""><small>${CLASS_NAME[c]}${a.tenClasses.includes(c) ? ' · 10 wins' : ''}</small></span>`).join('')}</div>` : ''}`;
  }
  const r = s.raids[tab], final = tab === 'mc' ? 'Ragnaros' : 'Hakkar';
  return `<div class="htiles">${tile(num(r.runs), 'Runs')}${tile(`${r.best}/9`, 'Most bosses')}${tile(num(r.finales), `Reached ${final}`)}${tile(r.score ? num(r.score) : '-', `Best on ${final}`, 'gold')}</div>${feats}<h3 class="hh3">Collection</h3>${collectionHtml(tab)}`;
}

const headHtml = () => {
  const p = portraitOf(), n = got.size;
  return `<button class="hface" data-act="face" aria-label="Change portrait"><img class="${sq(p)}" src="${p.src}" alt=""><i>Change</i></button><div class="hwho"><small>Your Hearth</small><h2><button class="hname" data-act="name" title="Change your name">${esc(heroName())}<i>Edit</i></button></h2><span>${num(totalRuns(data.stats))} runs across every mode</span></div><div class="hring" style="--p:${n / FEATS.length}"><b>${n}</b><span>of ${FEATS.length}<br>badges</span></div>`;
};
const noteText = () => `${data.stats.gear.bestOf[showing] ? `Wearing your best ${CLASS_NAME[showing]} draft` : `Finish a ${CLASS_NAME[showing]} Gear Draft to dress them`}${data.profile.ride ? ` · Riding your ${(MOUNTS.find((m) => m.id === data.profile.ride) || {}).name || ''}` : ''}`;

function draw() {
  root.innerHTML = `<div class="hhead">${headHtml()}</div>
    <div class="hstage"><canvas class="hcanvas"></canvas><div class="hchips">${CLASSES.map((c) => `<button class="hchip ${showing === c ? 'on' : ''}" data-show="${c}" title="${CLASS_NAME[c]}"><img src="assets/classes/${c}.png" alt="${CLASS_NAME[c]}"></button>`).join('')}</div><p class="hstagenote"></p></div>
    <nav class="htabs">${[['overview', 'Overview'], ...MODES.map((m) => [m.id, m.name])].map(([id, name]) => `<button class="${tab === id ? 'on' : ''}" data-tab="${id}">${name}</button>`).join('')}</nav>
    <div class="hbody"></div>`;
  for (const b of root.querySelectorAll('.htabs [data-tab]')) b.onclick = () => { tab = b.dataset.tab; drawBody(); };
  for (const b of root.querySelectorAll('[data-show]')) b.onclick = () => setShow(b.dataset.show);
  refresh();
  dressStage();
}

function refresh() {
  root.querySelector('.hhead').innerHTML = headHtml();
  root.querySelector('[data-act=face]').onclick = pickFace;
  root.querySelector('[data-act=name]').onclick = editName;
  root.querySelector('.hstagenote').textContent = noteText();
  for (const b of root.querySelectorAll('[data-show]')) b.classList.toggle('on', b.dataset.show === showing);
  drawBody();
}

function bindBody() {
  for (const b of root.querySelectorAll('.htabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
  for (const b of root.querySelectorAll('.hbody [data-tab]')) b.onclick = () => { tab = b.dataset.tab; drawBody(); };
  for (const b of root.querySelectorAll('[data-feat]')) {
    b.onclick = (e) => { e.stopPropagation(); if (pop && pop.dataset.for === b.dataset.feat && pop.dataset.tap) return hidePop(); showPop(b, true); };
    b.onpointerenter = (e) => { if (e.pointerType === 'mouse') showPop(b, false); };
    b.onpointerleave = (e) => { if (e.pointerType === 'mouse' && pop && !pop.dataset.tap) hidePop(); };
  }
  for (const b of root.querySelectorAll('[data-ride]')) b.onclick = () => save({ ride: +b.dataset.ride });
  for (const b of root.querySelectorAll('[data-forge]')) b.onclick = () => { b.disabled = true; forge(+b.dataset.forge).finally(() => { b.disabled = false; }); };
  for (const b of root.querySelectorAll('[data-more]')) b.onclick = () => { expanded[b.dataset.more] = !expanded[b.dataset.more]; drawBody(); };
}

let pop = null;
const TIER_NAME = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', legend: 'Legendary' };

function hidePop() {
  if (!pop) return;
  const old = pop;
  pop = null;
  old.classList.add('out');
  setTimeout(() => old.remove(), 160);
}

function showPop(b, tap) {
  const f = FEATS.find((x) => x.id === b.dataset.feat);
  if (!f) return;
  if (pop) { pop.remove(); pop = null; }
  const mode = modeOf(f), on = got.has(f.id), art = artOf(f);
  pop = document.createElement('div');
  pop.className = `hpop ${on ? 'on' : 'off'} ${f.tier} ${f.art ? 'hcls' : ''}`;
  pop.style.setProperty('--t', TIERS[f.tier]);
  pop.dataset.for = f.id;
  if (tap) pop.dataset.tap = '1';
  pop.innerHTML = `<span class="hpopface" style="background-image:url(${art})"></span><div><small>${TIER_NAME[f.tier]} · ${esc(mode.name)}</small><b>${esc(f.name)}</b><p>${esc(f.text)}</p>${valueOf(data.stats, f) ? `<i class="hpopval">${esc(valueOf(data.stats, f))}</i>` : ''}<em>${on ? 'Earned' : 'Not earned yet'}</em></div>`;
  document.body.append(pop);
  const r = b.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight, x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)), above = r.top - h - 10 > 8;
  pop.style.left = `${x}px`;
  pop.style.top = `${above ? r.top - h - 10 : r.bottom + 10}px`;
  pop.classList.add(above ? 'above' : 'below');
}

addEventListener('click', () => { if (pop && pop.dataset.tap) hidePop(); });
addEventListener('scroll', () => hidePop(), { passive: true });

function drawBody() {
  hidePop();
  root.querySelector('.hbody').innerHTML = tabHtml();
  bindBody();
}

async function save(set) {
  try {
    await loadHearth({ set });
    showing = data.profile.cls || showing;
    refresh();
    if ('cls' in set || 'ride' in set) dressStage();
    if (ctx.onChange) ctx.onChange();
  } catch {}
}

function setShow(cls) {
  showing = cls;
  for (const b of root.querySelectorAll('[data-show]')) b.classList.toggle('on', b.dataset.show === cls);
  root.querySelector('.hstagenote').textContent = noteText();
  save({ cls });
}

async function editName() {
  if (!nameOk()) { if (await askName()) { refresh(); if (ctx.onChange) ctx.onChange(); } return; }
  const h2 = root.querySelector('.hwho h2');
  h2.innerHTML = `<input class="hnamein" maxlength="20" value="${esc(heroName())}" placeholder="Your name" aria-label="Your name"><small class="hnameerr" role="alert"></small>`;
  const input = h2.querySelector('input'), err = h2.querySelector('.hnameerr');
  let busy = false;
  const done = async (keep) => {
    if (busy) return;
    if (keep && input.value.trim() !== heroName()) {
      busy = true;
      const out = await claimName(input.value);
      busy = false;
      if (!out.name) { input.classList.add('bad'); err.textContent = out.error; input.focus(); return; }
    }
    refresh();
    if (ctx.onChange) ctx.onChange();
  };
  input.focus();
  input.select();
  input.oninput = () => { input.classList.remove('bad'); err.textContent = ''; };
  input.onkeydown = (e) => { if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); };
  input.onblur = () => { if (!input.classList.contains('bad')) done(true); };
}

function pickFace() {
  const box = document.createElement('div');
  box.className = 'gmodal hpick';
  box.innerHTML = `<div class="gmodalbox"><h2>Choose your portrait</h2><p>Some portraits unlock with badges.</p><div class="hfaces">${PORTRAITS.map((p) => {
    const open = portraitOpen(got, p), need = p.needs && FEATS.find((f) => f.id === p.needs);
    return `<button class="${open ? '' : 'locked'} ${data.profile.icon === p.id ? 'on' : ''}" data-face="${p.id}" ${open ? '' : 'disabled'} title="${esc(p.name)}${need && !open ? ` · Unlock: ${esc(need.name)}` : ''}"><span class="hfface"><img class="${sq(p)}" src="${p.src}" alt=""></span><small>${esc(open ? p.name : need ? need.name : p.name)}</small></button>`;
  }).join('')}</div><button class="gmini" data-close>Close</button></div>`;
  document.body.append(box);
  const close = () => box.remove();
  box.onclick = (e) => { if (e.target === box) close(); };
  box.querySelector('[data-close]').onclick = close;
  for (const b of box.querySelectorAll('[data-face]:not([disabled])')) b.onclick = () => { close(); save({ icon: b.dataset.face }); };
}

function dressStage() {
  const canvas = root.querySelector('.hcanvas');
  busy = busy.then(async () => {
    if (!stage || stage.canvas !== canvas) {
      if (stage) stage.pause();
      stage = new ctx.Stage(canvas, ctx.gear);
      heroRig = null;
      mountRoot = null;
    }
    if (mountRoot && heroRig) { mountRoot.parent && mountRoot.parent.remove(mountRoot); stage.rig = heroRig; stage.scene.add(heroRig); heroRig.position.set(0, 0, 0); heroRig.rotation.set(0, 0, 0); heroRig.scale.setScalar(1); mountRoot = null; mountMixer = null; stage.pose('idle'); }
    await stage.setClass(showing);
    heroRig = stage.rig;
    const best = data.stats.gear.bestOf[showing];
    if (best) await new Promise((done) => { stage.outfit(Object.entries(best.picks).filter(([, id]) => id && ctx.row(id)).map(([slot, id]) => [slot, id, ctx.row(id)]), done); });
    const ride = MOUNTS.find((m) => m.id === data.profile.ride);
    stage.want = { ...(ride ? RIDE_VIEW : FOOT_VIEW) };
    stage.view = { ...stage.want };
    if (ride) await mount(ride);
  }).catch(() => {});
}

async function mount(ride) {
  const g = await stage.loader.loadAsync(`assets/raid/gear/${ride.model}.glb`).catch(() => null);
  if (!g) return;
  const root3 = g.scene, seat = root3.getObjectByName('att0');
  root3.scale.setScalar(ride.scale);
  root3.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  mountMixer = new THREE.AnimationMixer(root3);
  const idle = g.animations.find((a) => a.name === 'idle');
  if (idle) mountMixer.clipAction(idle).play();
  stage.scene.remove(heroRig);
  heroRig.position.set(0, 0, 0);
  heroRig.rotation.set(0, 0, 0);
  heroRig.scale.setScalar(1 / ride.scale);
  (seat || root3).add(heroRig);
  stage.scene.add(root3);
  stage.pose('mount');
  stage.yaw = -.85;
  mountRoot = root3;
  stage.rig = root3;
  const mixer = mountMixer;
  stage.fx.push((dt) => { if (mountMixer !== mixer) return true; mixer.update(dt); return false; });
}

export async function openHearth(host) {
  root = host;
  root.innerHTML = '<div class="gload">Opening your Hearth</div>';
  try { await loadHearth(); } catch { root.innerHTML = '<p class="hempty">Your Hearth could not be reached. Try again in a moment.</p>'; return; }
  showing = data.profile.cls || data.stats.gear.classes[0] || 'WARRIOR';
  draw();
}

export function leaveHearth() { hidePop(); if (stage) stage.pause(); }
export function resumeHearth() { if (stage) stage.resume(); }
