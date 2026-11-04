import * as THREE from 'three';
import { ANY, FEATS, LADDERS, MODES, MOUNTS, PORTRAIT, PORTRAITS, RELICS, TIERS, count, earned, forgeReady, forgeSteps, owned, portraitOpen, badgeTotal, usedIn, valueOf } from './feats.js';
import { askName, claimName, heroName, nameOk } from '../pvp/name.js';
import { SEASON, SEASONS, seasonOf } from './seasons.js';

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

let ctx = null, data = null, got = new Set(), gotIn = {}, view = '', tab = 'overview', root = null, stage = null, showing = '', mountRoot = null, mountMixer = null, heroRig = null, busy = Promise.resolve();

export function setupHearth(c) { ctx = c; }

export async function loadHearth(extra = {}) {
  const r = await fetch(`${ctx.API}/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: ctx.key(), who: deviceWho(), ...extra }) });
  if (!r.ok) throw new Error('profile');
  data = await r.json();
  data.season = data.season || SEASON;
  data.seasons = data.seasons || [{ id: data.season, stats: data.stats }];
  gotIn = Object.fromEntries(data.seasons.map((s) => [s.id, earned(s.stats)]));
  got = new Set([...earned(data.stats), ...Object.values(gotIn).flatMap((g) => [...g])]);
  if (view !== 'all' && !data.seasons.some((s) => s.id === view)) view = data.season;
  return data;
}

const sv = () => (view === 'all' ? data.stats : (data.seasons.find((s) => s.id === view) || {}).stats || data.stats);
const both = () => data.seasons.length > 1;
const viewName = () => (view === 'all' ? 'all time' : seasonOf(view).name);
const earnedWhen = (id) => {
  const where = SEASONS.filter((s) => gotIn[s.id] && gotIn[s.id].has(id)).map((s) => s.name);
  return where.length ? `Earned in ${where.join(' and ')}` : 'Earned across seasons';
};
const pastOnly = (id) => got.has(id) && !(gotIn[data.season] && gotIn[data.season].has(id)) && SEASONS.find((s) => gotIn[s.id] && gotIn[s.id].has(id));

function seasonBar() {
  const at = SEASONS.findIndex((s) => s.id === data.season), played = new Set(data.seasons.map((s) => s.id));
  const pills = SEASONS.map((s, i) => (played.has(s.id) ? `<button class="${view === s.id ? 'on' : ''}" data-season="${s.id}" title="${esc(s.blurb)}">${s.id === data.season ? '<i class="hnow"></i>' : ''}${esc(s.name)}</button>` : i > at ? `<span class="hsoon" title="${esc(s.blurb)}">${esc(s.name)}<small>Later</small></span>` : ''));
  return `<div class="hseasons" role="group" aria-label="Season"><small>Season</small>${pills.join('')}${both() ? `<button class="${view === 'all' ? 'on' : ''}" data-season="all">All time</button>` : ''}</div>`;
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
  el.innerHTML = `<button class="hb" data-hearth><span class="hbface"><img class="${sq(p)}" src="${p.src}" alt=""></span><span class="hbwho"><small>Your Hearth</small><b>${esc(heroName())}</b></span><span class="hbbadges"><i style="--p:${n / badgeTotal(got)}"></i><b>${n}</b><small>of ${badgeTotal(got)} badges</small></span>${RELICS.some((x) => forgeReady(data.stats, x)) ? '<span class="hbforge">Forge ready</span>' : ''}<span class="hbgo">Open</span></button>`;
  el.hidden = false;
}

const modeOf = (f) => MODES.find((m) => m.id === f.mode) || ANY;
const square = (src) => /assets\/(icons|classes)\//.test(src || '');
const artOf = (f) => (f.icon ? `assets/icons/${f.icon}.png` : f.art || modeOf(f).art);
const medal = (f) => {
  const on = got.has(f.id);
  return `<button class="hm ${on ? 'on' : 'off'} ${f.tier} ${square(artOf(f)) ? 'hcls' : ''}" style="--t:${TIERS[f.tier]}" data-feat="${f.id}" aria-label="${esc(f.name)}: ${esc(f.text)}${on ? '' : ' (locked)'}"><span class="hmface" style="background-image:url(${artOf(f)})"></span>${on ? '' : '<i class="hmlock"></i>'}${pastOnly(f.id) ? `<i class="hmseason">${esc(pastOnly(f.id).name)}</i>` : ''}<b>${esc(f.name)}</b><small>${esc(f.text)}</small></button>`;
};
const RANK = { bronze: 0, silver: 1, gold: 2, legend: 3 }, GLANCE = 8;
let expanded = {};

const FEAT = Object.fromEntries(FEATS.map((f) => [f.id, f]));
const inLadder = new Set(LADDERS.flatMap((l) => l.steps.map((x) => x.id)));
const stepsOf = (l) => l.steps.map((x) => ({ ...x, f: FEAT[x.id], on: got.has(x.id) }));
const topOf = (steps) => [...steps].reverse().find((x) => x.on);

function ladderCard(l) {
  const s = sv(), steps = stepsOf(l), top = topOf(steps), now = l.now(s), art = l.art || artOf(steps[0].f);
  return `<button class="hk ${top ? 'on' : 'off'} ${square(art) ? 'hcls' : ''}" style="--t:${top ? TIERS[top.f.tier] : '#3f3119'}" data-ladder="${l.id}" aria-label="${esc(l.name)}${top ? `: ${esc(top.f.rank || top.f.name)}` : ''}"><span class="hkface" style="background-image:url(${art})"></span><span class="hkbody"><span class="hkhead"><b>${esc(l.name)}</b>${top && top.f.rank ? `<i class="hkrank">${esc(top.f.rank)}</i>` : ''}${now ? `<small>${esc(now)}</small>` : ''}</span><span class="hktrack">${steps.map((x) => `<span class="hkseg ${x.on ? 'on' : ''}" style="--t:${TIERS[x.f.tier]};--p:${x.on ? 1 : x.prog(s).toFixed(3)}"><i></i><em>${esc(x.mark)}</em></span>`).join('')}</span></span></button>`;
}

function classLadders(mode) {
  const ls = LADDERS.filter((l) => l.mode === mode && l.cls), steps = ls.flatMap((l) => l.steps);
  if (!ls.length) return '';
  return `<h3 class="hh3">Class badges <em>${steps.filter((x) => got.has(x.id)).length} of ${steps.length} earned</em></h3><div class="hladders">${ls.map(ladderCard).join('')}</div>`;
}

function badgeBlock(key, list, title = 'Badges') {
  const lad = LADDERS.filter((l) => l.mode === key && !l.cls), earnedHere = list.filter((f) => got.has(f.id)).length;
  const open = list.filter((f) => !inLadder.has(f.id) && (!f.hidden || got.has(f.id))), mine = open.filter((f) => got.has(f.id));
  const next = open.filter((f) => !got.has(f.id)).sort((a, b) => RANK[a.tier] - RANK[b.tier]);
  const all = expanded[key], shown = all ? [...mine, ...next] : [...mine.slice(0, Math.max(GLANCE, mine.length)), ...next.slice(0, Math.max(0, GLANCE - mine.length))];
  const rest = mine.length + next.length - shown.length;
  return `<h3 class="hh3">${title} <em>${earnedHere} of ${list.length} earned</em></h3>${lad.length ? `<div class="hladders">${lad.map(ladderCard).join('')}</div>` : ''}${shown.length ? `<div class="hmedals">${shown.map(medal).join('')}</div>` : lad.length ? '' : '<p class="hempty">Play this mode to earn your first badge.</p>'}<div class="hmore">${rest > 0 || all ? `<button class="gmini" data-more="${key}">${all ? 'Show fewer' : `Show all ${mine.length + next.length} badges`}</button>` : ''}</div>`;
}

const tile = (value, label, tone = '') => `<div class="ht ${tone}"><b>${value}</b><span>${label}</span></div>`;

function collectionHtml(raid) {
  const s = data.stats, items = [...MOUNTS, ...RELICS].filter((x) => !raid || x.raid === raid);
  if (!items.length) return '';
  return `${forgeBanner(raid)}${trophyDoor()}<div class="hcoll">${items.map((x) => {
    const n = x.stack ? Math.min(count(s, x.id), x.stack) : 0, have = x.stack ? n > 0 : owned(s, x), mount = MOUNTS.includes(x), riding = mount && data.profile.ride === x.id, into = usedIn(s, x), ready = forgeReady(s, x);
    const steps = x.forged && !have && !ready ? `<span class="hcsteps">${forgeSteps(s, x).map(([t, ok]) => `<i class="${ok ? 'ok' : ''}">${esc(t)}</i>`).join('')}</span>` : '';
    const say = into ? `Forged into ${esc(into.short)}` : x.stack ? (have ? `${n} of ${x.stack} · from ${esc(x.from)}` : `Drops from ${esc(x.from)}`) : have ? (x.forged ? 'Legendary · forged' : `From ${esc(x.from)}`) : x.forged ? (ready ? 'Ready for the forge' : 'Forged from') : `Drops from ${esc(x.from)}`;
    const button = ready ? `<button class="hforgego" data-forge="${x.id}">Forge</button>` : have && mount ? `<button class="hride ${riding ? 'on' : ''}" data-ride="${riding ? 0 : x.id}">${riding ? 'Riding' : 'Ride'}</button>` : '';
    return `<div class="hc ${have ? 'on' : 'off'} ${x.forged ? 'forged' : ''} ${into ? 'used' : ''} ${ready ? 'ready' : ''}"><span class="hcicon"><img src="assets/icons/${x.icon}.png" alt=""></span><span class="hcsay"><b>${have || ready ? esc(x.name) : 'Undiscovered'}</b><small>${say}</small>${steps}</span>${button}</div>`;
  }).join('')}</div>`;
}

const TROPHIES = [...RELICS.filter((x) => x.forged), ...MOUNTS];
const day = (at) => { const d = new Date(at); return d.toLocaleDateString('en-US', d.getFullYear() === new Date().getFullYear() ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }); };

function trophyDoor() {
  const s = data.stats, have = TROPHIES.filter((x) => owned(s, x)).length;
  return `<button class="htrophy" data-trophy><span class="htrophyart">${TROPHIES.map((x) => `<img class="${owned(s, x) ? 'on' : ''}" src="assets/icons/${x.icon}.png" alt="">`).join('')}</span><span class="htrophysay"><small>Your Trophy Hall</small><b>The Lion's Pride Inn</b><em>${have ? `${have} of ${TROPHIES.length} trophies on display` : 'Your legendaries and mounts will be shown here'}</em></span><i>Enter</i></button>`;
}

function trophyItems() {
  const s = data.stats;
  return TROPHIES.map((x) => {
    const have = owned(s, x), mount = MOUNTS.includes(x), row = !mount && ctx.gear.items[x.id];
    const done = !mount && s.forge && s.forge[x.id] && s.forge[x.id].done;
    const got = mount && s.found && s.found[x.id];
    const line = mount ? (have ? `Dropped by ${x.from}${got ? ` · ${day(got)}` : ''}` : `Drops from ${x.from}`) : have ? `Forged ${day(done)}` : forgeReady(s, x) ? 'Ready for the forge' : 'Not yet forged';
    return { id: x.id, kind: mount ? 'mount' : 'weapon', name: x.name, icon: x.icon, have, line, model: mount ? `assets/raid/gear/${x.model}.glb` : row && row.m ? `assets/draft/gear/${row.m}` : '', scale: x.scale };
  });
}

function forgeBanner(raid) {
  const ready = RELICS.filter((x) => (!raid || x.raid === raid) && forgeReady(data.stats, x));
  return ready.map((x) => `<div class="hforge ${x.theme}"><span class="hforgeicon"><img src="assets/icons/${x.icon}.png" alt=""></span><span class="hforgesay"><small>The Legendary Forge awaits</small><b>${esc(x.name)}</b><em>Everything is gathered. Bring it to the anvil.</em></span><button class="hforgego big" data-forge="${x.id}">Forge ${esc(x.short)}</button></div>`).join('');
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const runsDone = () => (data ? totalRuns(data.stats) : 0);
export const readyRelics = () => (data ? RELICS.filter((x) => forgeReady(data.stats, x)) : []);

export function callForge(x) {
  const parts = x.forged.map((p) => RELICS.find((r) => r.id === p));
  const box = document.createElement('div');
  box.className = `fcall ${x.theme}`;
  box.innerHTML = `<div class="fcallcard" role="dialog" aria-modal="true" aria-labelledby="fcallT"><div class="fcallembers">${'<i></i>'.repeat(14)}</div><div class="fcallglow"><i class="fcallrays"></i><i class="fcallring"></i><img src="assets/icons/${x.icon}.png" alt=""></div><small>The Legendary Forge calls</small><h2 id="fcallT">${esc(x.name)}</h2><p>You have done everything the forge asks. Bring it all to the anvil and claim your legendary.</p><ul class="fcallparts">${forgeSteps((data && data.stats) || {}, x).map(([t]) => { const p = parts.find((q) => t.includes(q.name.replace(/s$/, ''))); return `<li>${p ? `<img src="assets/icons/${p.icon}.png" alt="">` : '<i class="fcalltrial"></i>'}<span>${esc(p && p.stack ? `${p.stack} ${p.name}s` : t.replace(/^Deal /, 'Dealt '))}</span><b aria-label="done">✓</b></li>`; }).join('')}</ul><div class="fcallgo"><button type="button" class="hforgego big">Forge ${esc(x.short)}</button><button type="button" class="fcalllater">Later</button></div></div>`;
  document.body.append(box);
  return new Promise((done) => {
    const close = (go) => { box.classList.add('out'); document.removeEventListener('keydown', key); setTimeout(() => box.remove(), 300); done(go); if (go) forge(x.id); };
    const key = (e) => { if (e.key === 'Escape') close(false); };
    document.addEventListener('keydown', key);
    box.querySelector('.hforgego').onclick = () => close(true);
    box.querySelector('.fcalllater').onclick = () => close(false);
    box.onclick = (e) => { if (e.target === box) close(false); };
    box.querySelector('.hforgego').focus({ preventScroll: true });
  });
}

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
  const s = sv(), feats = FEATS.filter((f) => f.mode === m.id), n = feats.filter((f) => got.has(f.id)).length;
  const line = m.id === 'gear' ? `${num(s.gear.runs)} runs · best ${s.gear.best ? s.gear.best.toFixed(1) : '-'}` : m.id === 'arena' ? `${num(s.arena.runs)} runs · best ${s.arena.best}/10` : `${num(s.raids[m.id].runs)} runs · best ${s.raids[m.id].best} bosses`;
  return `<button class="hmode" data-tab="${m.id}" style="background-image:url(${m.art})"><span><b>${m.name}</b><small>${line}</small></span><em>${n}/${feats.length}</em></button>`;
}

function tabHtml() {
  const s = sv();
  if (tab === 'overview') {
    const mine = FEATS.filter((f) => got.has(f.id)).sort((a, b) => RANK[b.tier] - RANK[a.tier]), all = expanded.overview, shown = all ? mine : mine.slice(0, 12);
    return `<div class="hmodes">${MODES.map(modeCard).join('')}</div>
      <h3 class="hh3">Collection</h3>${collectionHtml('')}
      <h3 class="hh3">Badges earned <em>${mine.length} of ${badgeTotal(got)}</em></h3>${mine.length ? `<div class="hmedals">${shown.map(medal).join('')}</div>` : '<p class="hempty">Play any mode to earn your first badge.</p>'}<div class="hmore">${mine.length > 12 ? `<button class="gmini" data-more="overview">${all ? 'Show fewer' : `Show all ${mine.length}`}</button>` : ''}</div>`;
  }
  const feats = badgeBlock(tab, FEATS.filter((f) => f.mode === tab && !(f.art && inLadder.has(f.id)))) + classLadders(tab);
  if (tab === 'gear') {
    const g = s.gear, it = s.items;
    return `<div class="htiles">${tile(num(g.runs), 'Runs')}${tile(g.best ? g.best.toFixed(1) : '-', 'Best DPS', 'gold')}${tile(g.rank ? `#${num(g.rank)}` : '-', view === 'all' ? 'Best board rank' : `${esc(seasonOf(view).name)} rank`)}${tile(`${g.classes.length}/9`, 'Classes')}</div>${feats}
      ${it.most.length ? `<h3 class="hh3">Most used gear <em>your favourite pick in each slot, across every mode</em></h3><div class="hmost">${it.most.map((x) => `<div class="hmu" style="--q:${QUALITY[x.q]}" title="${esc(x.name)}"><img src="assets/icons/${x.icon}.png" alt=""><span><small>${SLOT_NAME[x.slot]}</small><b>${esc(x.name)}</b></span><em>${x.n}x</em></div>`).join('')}</div>` : ''}`;
  }
  if (tab === 'arena') {
    const a = s.arena;
    return `<div class="htiles">${tile(num(a.runs), 'Runs')}${tile(num(a.fights), 'Duels')}${tile(num(a.wins), 'Wins')}${tile(`${a.best}/10`, 'Best run', 'gold')}${tile(num(a.tens), '10-win runs')}</div>${feats}`;
  }
  const r = s.raids[tab], final = tab === 'mc' ? 'Ragnaros' : 'Hakkar';
  return `<div class="htiles">${tile(num(r.runs), 'Runs')}${tile(`${r.best}/9`, 'Most bosses')}${tile(num(r.finales), `Reached ${final}`)}${tile(r.score ? num(r.score) : '-', `Best on ${final}`, 'gold')}</div>${feats}<h3 class="hh3">Collection</h3>${collectionHtml(tab)}`;
}

const headHtml = () => {
  const p = portraitOf(), n = got.size;
  return `<button class="hface" data-act="face" aria-label="Change portrait"><img class="${sq(p)}" src="${p.src}" alt=""><i>Change</i></button><div class="hwho"><small>Your Hearth</small><h2><button class="hname" data-act="name" title="Change your name">${esc(heroName())}<i>Edit</i></button></h2><span>${both() && view !== 'all' ? `${num(totalRuns(sv()))} runs in ${esc(viewName())} · ${num(totalRuns(data.stats))} all time` : `${num(totalRuns(data.stats))} runs across every mode`}</span></div><div class="hring" style="--p:${n / badgeTotal(got)}"><b>${n}</b><span>of ${badgeTotal(got)}<br>badges</span></div>`;
};
const noteText = () => `${data.stats.gear.bestOf[showing] ? `Wearing your best ${CLASS_NAME[showing]} draft` : `Finish a ${CLASS_NAME[showing]} Gear Draft to dress them`}${data.profile.ride ? ` · Riding your ${(MOUNTS.find((m) => m.id === data.profile.ride) || {}).name || ''}` : ''}`;

function draw() {
  root.innerHTML = `<div class="hhead">${headHtml()}</div>
    <div class="hstage"><canvas class="hcanvas"></canvas><div class="hchips">${CLASSES.map((c) => `<button class="hchip ${showing === c ? 'on' : ''}" data-show="${c}" title="${CLASS_NAME[c]}"><img src="assets/classes/${c}.png" alt="${CLASS_NAME[c]}"></button>`).join('')}</div><p class="hstagenote"></p></div>
    <div class="hbar"><nav class="htabs">${[['overview', 'Overview'], ...MODES.map((m) => [m.id, m.name])].map(([id, name]) => `<button class="${tab === id ? 'on' : ''}" data-tab="${id}">${name}</button>`).join('')}</nav>${seasonBar()}</div>
    <div class="hbody"></div>`;
  for (const b of root.querySelectorAll('.htabs [data-tab]')) b.onclick = () => { tab = b.dataset.tab; drawBody(); };
  for (const b of root.querySelectorAll('[data-show]')) b.onclick = () => setShow(b.dataset.show);
  bindSeasons();
  refresh();
  dressStage();
}

function bindSeasons() {
  for (const b of root.querySelectorAll('[data-season]')) b.onclick = () => {
    view = b.dataset.season;
    root.querySelector('.hseasons').outerHTML = seasonBar();
    bindSeasons();
    refresh();
  };
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
  for (const b of root.querySelectorAll('[data-feat], [data-ladder]')) {
    b.onclick = (e) => { e.stopPropagation(); if (pop && pop.dataset.for === (b.dataset.feat || b.dataset.ladder) && pop.dataset.tap) return hidePop(); showPop(b, true); };
    b.onpointerenter = (e) => { if (e.pointerType === 'mouse') showPop(b, false); };
    b.onpointerleave = (e) => { if (e.pointerType === 'mouse' && pop && !pop.dataset.tap) hidePop(); };
  }
  for (const b of root.querySelectorAll('[data-ride]')) b.onclick = () => save({ ride: +b.dataset.ride });
  for (const b of root.querySelectorAll('[data-forge]')) b.onclick = () => { b.disabled = true; forge(+b.dataset.forge).finally(() => { b.disabled = false; }); };
  for (const b of root.querySelectorAll('[data-trophy]')) b.onclick = () => import('./trophy.js').then((m) => m.openTrophyHall(trophyItems()));
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

function ladderPop(l) {
  const steps = stepsOf(l), top = topOf(steps), next = steps.find((x) => !x.on), val = valueOf(sv(), (next || steps[steps.length - 1]).f), mode = MODES.find((m) => m.id === l.mode) || ANY;
  pop.className = `hpop hkpop ${top ? 'on' : 'off'} ${square(l.art || artOf(steps[0].f)) ? 'hcls' : ''}`;
  pop.style.setProperty('--t', top ? TIERS[top.f.tier] : '#8a7a60');
  pop.innerHTML = `<span class="hpopface" style="background-image:url(${l.art || artOf(steps[0].f)})"></span><div><small>${esc(mode.name)}</small><b>${esc(l.name)}</b><ul class="hksteps">${steps.map((x) => `<li class="${x.on ? 'on' : ''}" style="--t:${TIERS[x.f.tier]}"><i></i><span><strong>${esc(x.f.rank || x.f.name)}</strong>${esc(x.f.text)}</span></li>`).join('')}</ul>${val ? `<i class="hpopval">${esc(val)}</i>` : ''}<em>${next ? `${steps.filter((x) => x.on).length} of ${steps.length} earned` : 'All earned'}${top ? ` · ${esc(earnedWhen(top.id).replace(/^Earned /, ''))}` : ''}</em></div>`;
}

function showPop(b, tap) {
  const l = b.dataset.ladder && LADDERS.find((x) => x.id === b.dataset.ladder), f = !l && FEATS.find((x) => x.id === b.dataset.feat);
  if (!l && !f) return;
  if (pop) { pop.remove(); pop = null; }
  if (l) {
    pop = document.createElement('div');
    pop.dataset.for = l.id;
    if (tap) pop.dataset.tap = '1';
    ladderPop(l);
    return place(b);
  }
  const mode = modeOf(f), on = got.has(f.id), art = artOf(f);
  pop = document.createElement('div');
  pop.className = `hpop ${on ? 'on' : 'off'} ${f.tier} ${square(artOf(f)) ? 'hcls' : ''}`;
  pop.style.setProperty('--t', TIERS[f.tier]);
  pop.dataset.for = f.id;
  if (tap) pop.dataset.tap = '1';
  pop.innerHTML = `<span class="hpopface" style="background-image:url(${art})"></span><div><small>${TIER_NAME[f.tier]} · ${esc(mode.name)}</small><b>${esc(f.name)}</b><p>${esc(f.text)}</p>${valueOf(sv(), f) ? `<i class="hpopval">${esc(valueOf(sv(), f))}</i>` : ''}<em>${on ? esc(earnedWhen(f.id)) : 'Not earned yet'}</em></div>`;
  place(b);
}

function place(b) {
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
