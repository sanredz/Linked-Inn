import * as C from './core.js';
import { Stage } from './stage.js';

const API = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'http://localhost:8789' : 'https://azeroth-draft.sanredz.workers.dev';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const QUALITY = { 2: '#1eff00', 3: '#0070dd', 4: '#a335ee', 5: '#ff8000' };
const STAT = { str: 'Strength', agi: 'Agility', sta: 'Stamina', int: 'Intellect', spi: 'Spirit' };
const RESIST = { rfire: 'Fire', rnature: 'Nature', rfrost: 'Frost', rshadow: 'Shadow', rarcane: 'Arcane', rholy: 'Holy' };
const INV = { 1: 'Head', 2: 'Neck', 3: 'Shoulder', 5: 'Chest', 20: 'Chest', 6: 'Waist', 7: 'Legs', 8: 'Feet', 9: 'Wrist', 10: 'Hands', 11: 'Finger', 12: 'Trinket', 13: 'One-Hand', 14: 'Off Hand', 15: 'Ranged', 16: 'Back', 17: 'Two-Hand', 21: 'Main Hand', 22: 'Off Hand', 23: 'Held In Off-hand', 25: 'Thrown', 26: 'Ranged', 28: 'Relic' };
const WEAPON = { 0: 'Axe', 1: 'Axe', 2: 'Bow', 3: 'Gun', 4: 'Mace', 5: 'Mace', 6: 'Polearm', 7: 'Sword', 8: 'Sword', 10: 'Staff', 13: 'Fist Weapon', 15: 'Dagger', 16: 'Thrown', 18: 'Crossbow', 19: 'Wand' };
const ARMOR = { 1: 'Cloth', 2: 'Leather', 3: 'Mail', 4: 'Plate', 6: 'Shield', 7: 'Libram', 8: 'Idol', 9: 'Totem' };
const PANE = [['head', 20, 76], ['neck', 20, 117], ['shoulder', 20, 158], ['back', 20, 199], ['chest', 20, 240], ['shirt', 20, 281], ['tabard', 20, 322], ['wrist', 20, 363],
  ['hands', 304, 76], ['waist', 304, 117], ['legs', 304, 158], ['feet', 304, 199], ['finger1', 304, 240], ['finger2', 304, 281], ['trinket1', 304, 322], ['trinket2', 304, 363],
  ['main', 120, 386], ['off', 162, 386], ['ranged', 204, 386]];
const ART = { WARRIOR: 'art-warriorarms.jpg', PALADIN: 'art-priestholy.jpg', HUNTER: 'art-hunterbeastmastery.jpg', ROGUE: 'art-roguecombat.jpg', PRIEST: 'art-priestshadow.jpg', SHAMAN: 'art-shamanrestoration.jpg', MAGE: 'art-magefire.jpg', WARLOCK: 'art-magearcane.jpg', DRUID: 'art-druidferalcombat.jpg' };
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

let viewBuild = null, pool, gear, talents, stage, run, sig, offer = {}, spinning = false, chosenBuild = null, last = null, online = true;

const row = (id) => pool.items[id];
const taltip = (id, build) => {
  const n = talents.nodes[id], have = talents.builds[build][id] || 0;
  return n ? `<b style="color:#ffd100">${esc(n[0])}</b><i class="il">Rank ${have}/${n[2]}</i><div>${esc(n[3][have] || n[3][n[2]] || '')}</div>` : '';
};
const talIcon = (id, build) => {
  const n = talents.nodes[id];
  return n ? `<img src="assets/icons/${n[1]}.png" alt="${esc(n[0])}" data-tal="${id}" data-build="${build}">` : '';
};
const icon = (id) => `assets/icons/${row(id)[4]}.png`;
const wait = (ms) => new Promise((ok) => setTimeout(ok, calm ? Math.min(ms, 30) : ms));

function show(view) {
  for (const s of document.querySelectorAll('[data-screen]')) s.hidden = !s.dataset.screen.split(' ').includes(view);
  document.body.dataset.view = view;
}

function tooltip(id) {
  const r = row(id), [name, q, ilvl, inv, , cls, sub, s, d, setId, , , lines] = r;
  const kind = cls === 2 ? WEAPON[sub] : ARMOR[sub] || '';
  let h = `<b style="color:${QUALITY[q]}">${esc(name)}</b><i class="il">Item Level ${ilvl}</i><div class="two"><span>${INV[inv] || ''}</span><span>${kind}</span></div>`;
  if (d) {
    const speed = d.delay / 1000;
    h += `<div class="two"><span>${d.min} - ${d.max} Damage</span><span>Speed ${speed.toFixed(2)}</span></div><div>(${((d.min + d.max) / 2 / speed).toFixed(1)} damage per second)</div>`;
  }
  if (s.armor) h += `<div>${s.armor} Armor</div>`;
  for (const k of Object.keys(STAT)) if (s[k]) h += `<div>+${s[k]} ${STAT[k]}</div>`;
  for (const k of Object.keys(RESIST)) if (s[k]) h += `<div>+${s[k]} ${RESIST[k]} Resistance</div>`;
  for (const l of lines) h += `<div class="eq">${esc(l)}</div>`;
  if (s.ap && !lines.some((l) => /Attack Power/.test(l))) h += `<div class="eq">Equip: +${s.ap} Attack Power.</div>`;
  if (s.sp && !lines.some((l) => /damage/.test(l))) h += `<div class="eq">Equip: Increases damage and healing done by magical spells and effects by up to ${s.sp}.</div>`;
  const set = setId && pool.sets[setId];
  if (set) {
    const have = set.i.filter((i) => Object.values(run ? run.picks : {}).includes(i)).length;
    h += `<div class="set">${esc(set.n)} (${have}/${set.i.length})</div>`;
    for (const [need, , text] of set.b) if (text) h += `<div class="${have >= need ? 'eq' : 'off'}">(${need}) Set: ${esc(text)}</div>`;
  }
  return h;
}

function positionTip(e) {
  const t = $('tip'), pad = 14, w = t.offsetWidth, h = t.offsetHeight;
  let x = e.clientX + pad, y = e.clientY + pad;
  if (x + w > innerWidth - 8) x = e.clientX - w - pad;
  if (y + h > innerHeight - 8) y = Math.max(8, innerHeight - h - 8);
  t.style.transform = `translate(${Math.max(8, x)}px,${y}px)`;
}

document.addEventListener('error', (e) => {
  const t = e.target;
  if (t.tagName === 'IMG' && t.src.includes('assets/icons/') && !t.src.endsWith('134400.png')) t.src = 'assets/icons/134400.png';
}, true);

document.addEventListener('click', (e) => {
  if (!e.target.closest('#hand') && !e.target.closest('.slot')) $('hand').hidden = true;
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('hand').hidden = true; });

document.addEventListener('mousemove', (e) => {
  const t = $('tip');
  const tal = e.target.closest && e.target.closest('[data-tal]');
  if (tal) {
    const key = 't' + tal.dataset.tal + tal.dataset.build;
    if (t.dataset.id !== key) { t.innerHTML = taltip(tal.dataset.tal, tal.dataset.build); t.dataset.id = key; }
    t.hidden = false;
    positionTip(e);
    return;
  }
  const el = e.target.closest && e.target.closest('[data-item]');
  if (!el || !+el.dataset.item) { t.hidden = true; return; }
  if (t.dataset.id !== el.dataset.item) { t.innerHTML = tooltip(el.dataset.item); t.dataset.id = el.dataset.item; }
  t.hidden = false;
  positionTip(e);
});

function buildDoll() {
  const left = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist'], right = ['legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2', 'main', 'off', 'ranged'];
  const name = Object.fromEntries(C.SLOTS);
  const cell = (s) => `<button class="slot" id="s_${s}" data-slot="${s}"><span class="ic"><img alt=""></span><span class="tx"><b></b><small>${name[s]}</small></span></button>`;
  $('left').innerHTML = left.map(cell).join('');
  $('right').innerHTML = right.map(cell).join('');
  for (const b of document.querySelectorAll('.slot')) b.onclick = () => choose(b.dataset.slot);
  const art = (s) => ['finger1', 'finger2'].includes(s) ? 'finger' : ['trinket1', 'trinket2'].includes(s) ? 'trinket' : s;
  $('doll').innerHTML = PANE.map(([s, x, y]) => `<button class="ps" id="p_${s}" data-item="" style="left:calc(var(--u)*${x});top:calc(var(--u)*${y});background-image:url(assets/draft/ui/${art(s)}.png)" tabindex="-1"></button>`).join('');
  for (const s of ['shirt', 'tabard']) $('p_' + s).classList.add('dead');
}

function fillPane(slot, id, from) {
  const el = $('p_' + slot), r = row(id);
  const finish = () => {
    el.innerHTML = `<img src="${icon(id)}" alt="">`;
    el.dataset.item = id;
    el.style.setProperty('--q', QUALITY[r[1]]);
    el.classList.add('on', 'land');
  };
  if (calm || !from) return finish();
  const a = from.getBoundingClientRect(), b = el.getBoundingClientRect(), f = new Image();
  f.src = icon(id);
  f.className = 'flight';
  f.style.left = a.left + 'px';
  f.style.top = a.top + 'px';
  document.body.append(f);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    f.style.transform = `translate(${b.left - a.left - 4}px,${b.top - a.top - 4}px) scale(.8)`;
  }));
  setTimeout(() => { f.remove(); finish(); }, 390);
}

function paint(slot, id, state) {
  const el = $('s_' + slot);
  const img = el.querySelector('img'), b = el.querySelector('b');
  el.className = 'slot ' + state;
  el.dataset.item = id || '';
  if (id) {
    const r = row(id);
    img.src = icon(id);
    img.style.visibility = '';
    b.textContent = r[0];
    b.style.color = QUALITY[r[1]];
    el.style.setProperty('--q', QUALITY[r[1]]);
  } else {
    img.style.visibility = 'hidden';
    b.textContent = state === 'blocked' ? 'Two-hand weapon' : '';
    el.style.removeProperty('--q');
  }
  const hand = id && (slot === 'main' || slot === 'off') ? `${INV[row(id)[3]]} · ` : '';
  el.querySelector('small').textContent = id ? `${hand}${C.TIER_NAME[tierOf(slot, id)] || ''}${state === 'kept' ? ' · kept' : ''}` : Object.fromEntries(C.SLOTS)[slot];
}

function tierOf(slot, id) {
  const p = pool.pools[run.cls], key = slot.replace(/[12]$/, '');
  for (const pools of [p[key], slot === 'off' ? p.main : null]) {
    if (!pools) continue;
    for (const [t, ids] of Object.entries(pools)) if (ids.includes(+id)) return t;
  }
  return '';
}

async function spin() {
  spinning = true;
  $('status').textContent = 'Rolling...';
  $('mull').disabled = true;
  offer = C.offers(pool, run);
  const slots = C.remaining(run);
  const strip = {};
  for (const s of slots) {
    const key = s.replace(/[12]$/, ''), ids = Object.values(pool.pools[run.cls][key] || pool.pools[run.cls].main).flat();
    strip[s] = ids.length ? ids : [offer[s]];
    $('s_' + s).className = 'slot spin';
  }
  let live = new Set(slots);
  const timer = calm ? 0 : setInterval(() => {
    for (const s of live) {
      const id = strip[s][Math.floor(Math.random() * strip[s].length)];
      const el = $('s_' + s);
      el.querySelector('img').src = icon(id);
      el.querySelector('img').style.visibility = '';
      el.querySelector('b').textContent = '';
      el.querySelector('small').textContent = '';
    }
  }, 70);
  await wait(420);
  const order = [...slots];
  for (const s of order) {
    await wait(Math.max(45, 150 - order.length * 5));
    live.delete(s);
    paint(s, offer[s], offer[s] ? 'offer' : 'blocked');
    const r = offer[s] && row(offer[s]);
    if (r && r[1] >= 4) $('s_' + s).classList.add('flash');
  }
  clearInterval(timer);
  spinning = false;
  $('status').textContent = 'Keep one item';
  $('round').textContent = `${Object.keys(run.picks).length} of 17 slots filled`;
  $('mull').disabled = !run.mulligan;
  $('mull').textContent = run.mulligan ? 'Mulligan (1 left)' : 'Mulligan used';
}

function statRow(label, key, s, unit = '') {
  const v = s.now[key], d = Math.round((v - s.base[key]) * 10) / 10;
  return `<div class="sr"><span>${label}</span><b>${v}${unit}${d ? `<em>${d > 0 ? '+' : ''}${d}${unit}</em>` : ''}</b></div>`;
}

function sheet() {
  const s = C.sheet(pool, run.cls, viewBuild, run.picks), hasMana = s.now.mana > 0;
  const b = C.BUILDS[run.cls].find((x) => x.id === viewBuild);
  $('toggle').innerHTML = C.BUILDS[run.cls].map((x) => `<button role="radio" aria-checked="${x.id === viewBuild}" data-b="${x.id}">${esc(x.name)}<small>${x.split}</small></button>`).join('');
  for (const t of document.querySelectorAll('#toggle button')) t.onclick = () => { viewBuild = t.dataset.b; sheet(); };
  $('tb').innerHTML = `${esc(b.blurb)}<div class="ti">${b.talents.map((t) => talIcon(t, b.id)).join('')}</div>`;
  const school = s.school && s.schoolDmg !== s.now.sp ? `<div class="sr"><span>${s.school[0].toUpperCase() + s.school.slice(1)} Damage</span><b>${s.schoolDmg}</b></div>` : '';
  $('rows').innerHTML = `<div class="grp">Attributes</div>${statRow('Strength', 'str', s)}${statRow('Agility', 'agi', s)}${statRow('Stamina', 'sta', s)}${statRow('Intellect', 'int', s)}${statRow('Spirit', 'spi', s)}${statRow('Armor', 'armor', s)}
    <div class="grp">Melee and Ranged</div>${statRow('Attack Power', 'ap', s)}${statRow('Ranged Attack Power', 'rap', s)}${statRow('Crit', 'crit', s, '%')}${statRow('Hit', 'hit', s, '%')}${s.now.haste ? statRow('Attack Speed', 'haste', s, '%') : ''}
    <div class="grp">Spell</div>${statRow('Spell Damage', 'sp', s)}${school}${statRow('Spell Crit', 'scrit', s, '%')}${statRow('Spell Hit', 'shit', s, '%')}${hasMana ? statRow('Mana', 'mana', s) : ''}
    ${s.bonuses.length ? `<div class="grp">Talent bonuses</div>${s.bonuses.map((x) => `<div class="bn">${esc(x)}</div>`).join('')}` : ''}`;
}

function askHand(slot) {
  const box = $('hand'), r = $('s_' + slot).getBoundingClientRect();
  box.innerHTML = `<span>Which hand?</span><button data-to="main">Main Hand</button><button data-to="off">Off Hand</button>`;
  box.hidden = false;
  box.style.left = Math.max(8, Math.min(innerWidth - box.offsetWidth - 8, r.left)) + 'px';
  box.style.top = Math.min(innerHeight - box.offsetHeight - 8, r.bottom + 4) + 'px';
  for (const b of box.querySelectorAll('button')) b.onclick = (e) => { e.stopPropagation(); box.hidden = true; choose(slot, b.dataset.to); };
  box.querySelector('button').focus();
}

async function choose(slot, to) {
  if (spinning || !run || !offer[slot] || slot in run.picks) return;
  if (!to && C.hands(pool, run, slot, offer[slot]).length > 1) return askHand(slot);
  $('hand').hidden = true;
  to = to || slot;
  const before = new Set(Object.keys(run.picks));
  const from = $('s_' + slot).querySelector('.ic');
  const id = C.pick(pool, run, slot, to);
  paint(to, id, 'kept');
  fillPane(to, id, from);
  $('tip').hidden = true;
  sheet();
  stage.wear(to, id, row(id));
  for (const s of Object.keys(run.picks)) if (!before.has(s) && s !== to) paint(s, 0, 'blocked');
  if (C.finished(run)) return talentsStep();
  spin();
}

function mulligan() {
  if (spinning || !run || !run.mulligan) return;
  C.mulligan(pool, run);
  spin();
}

function talentsStep() {
  $('status').textContent = 'All slots filled';
  $('round').textContent = 'All slots filled';
  show('talents');
  const shield = C.hasShield(pool, run.picks);
  const main = row(run.picks.main || 0), two = main && main[3] === 17;
  const note = (b) => {
    if (b.wants === 'shield') return shield ? 'You have a shield.' : 'No shield drafted: this build loses its best ability.';
    if (b.wants === '2H') return two ? 'You have a two-hander.' : 'Built for a two-hander.';
    if (b.wants === 'dagger') return 'Better with daggers.';
    return '';
  };
  const key = (b) => {
    const s = C.sheet(pool, run.cls, b.id, run.picks).now;
    const list = b.kit.kind === 'caster' ? [['Spell', s.sp], ['Crit', s.scrit + '%'], ['Hit', s.shit + '%'], ['Int', s.int]] : [['AP', b.kit.kind === 'ranged' ? s.rap : s.ap], ['Crit', s.crit + '%'], ['Hit', s.hit + '%'], ['Agi', s.agi]];
    return `<span class="cs">${list.map(([k, v]) => `<span><i>${k}</i>${v}</span>`).join('')}</span>`;
  };
  const ordered = [...C.BUILDS[run.cls]].sort((x, y) => (y.id === viewBuild) - (x.id === viewBuild));
  $('builds').innerHTML = ordered.map((b) => `
    <button class="build" data-build="${b.id}">
      <span class="bh"><b>${esc(b.name)}</b><em>${b.split}</em></span>
      <span class="bl">${esc(b.blurb)}</span>
      <span class="tl">${b.talents.map((t) => talIcon(t, b.id)).join('')}</span>
      ${key(b)}
      ${note(b) ? `<span class="nt">${note(b)}</span>` : ''}
    </button>`).join('');
  for (const b of document.querySelectorAll('.build')) b.onclick = () => fight(b.dataset.build);
}

const ease = (p) => 1 - Math.pow(1 - p, 3.4);

async function fight(buildId) {
  chosenBuild = buildId;
  const build = C.BUILDS[run.cls].find((b) => b.id === buildId);
  const res = C.simulate(pool, run.cls, buildId, run.picks, run.seed, 12, true);
  last = { res, build };
  show('fight');
  document.body.classList.add('arena');
  $('round').textContent = '';
  await new Promise(requestAnimationFrame);
  stage.resize();
  const kind = build.kit.kind;
  const main = run.picks.main ? row(run.picks.main) : null;
  await stage.fight(kind, !!main && main[3] === 17);
  const gauge = $('dps'), bar = $('fill'), fly = $('fly');
  const dur = calm ? 300 : 11500, start = performance.now();
  const log = res.log, shown = Math.min(log.length, 240), step = Math.max(1, Math.floor(log.length / shown));
  const events = log.filter((_, i) => i % step === 0);
  let at = 0;
  await new Promise((done) => {
    const tick = () => {
      const now = performance.now(), p = Math.min(1, (now - start) / dur), e = ease(p);
      const wobble = p < .98 ? Math.sin(p * 46) * (1 - p) * .012 : 0;
      const val = res.dps * Math.min(1.02, e + wobble);
      gauge.textContent = Math.max(0, val).toFixed(1);
      bar.style.width = Math.min(100, e * 100) + '%';
      const until = e * events.length;
      while (at < until && at < events.length) {
        const ev = events[at++];
        stage.hit(ev[4]);
        const a = stage.anchor(), n = document.createElement('span');
        n.className = 'ft ' + ev[4] + (ev[3] ? ' crit' : '');
        n.textContent = ev[2];
        n.style.left = (a.x * 100 + (Math.random() * 18 - 9)) + '%';
        n.style.top = (a.y * 100 + (Math.random() * 7 - 2)) + '%';
        fly.append(n);
        setTimeout(() => n.remove(), 950);
      }
      if (p < 1) requestAnimationFrame(tick); else done();
    };
    tick();
  });
  gauge.textContent = res.dps.toFixed(1);
  stage.stopFight();
  gauge.classList.add('done');
  await wait(600);
  results();
}

async function post(path, body) {
  const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function results() {
  show('result');
  const { res, build } = last;
  $('rDps').textContent = res.dps.toFixed(1);
  $('rName').textContent = `${C.CLASS_NAME[run.cls]} · ${build.name}`;
  $('rName').style.color = C.CLASS_COLOR[run.cls];
  const top = Object.entries(res.by).sort((a, b) => b[1] - a[1]).slice(0, 7);
  $('rBy').innerHTML = top.map(([n, v]) => `<div class="br"><span>${esc(n)}</span><i style="width:${v}%"></i><b>${v}%</b></div>`).join('');
  $('rSets').innerHTML = res.sets.length ? res.sets.map(([n, c]) => `<div>${esc(n)} (${c})</div>`).join('') : '';
  const s = res.sheet, magic = build.kit.kind === 'caster';
  $('rSheet').innerHTML = (magic ? [['Spell Damage', s.sp], ['Spell Crit', s.scrit + '%'], ['Spell Hit', s.shit + '%'], ['Intellect', s.int]] : [['Attack Power', build.kit.kind === 'ranged' ? s.rap : s.ap], ['Crit', s.crit + '%'], ['Hit', s.hit + '%'], ['Agility', s.agi]]).map(([k, v]) => `<span><i>${k}</i>${v}</span>`).join('');
  const auto = C.randomName(run.seed);
  $('nameIn').value = '';
  $('nameIn').placeholder = auto;
  $('saved').textContent = '';
  $('rRank').textContent = 'Logging your run...';
  last.auto = auto;
  last.id = null;
  try {
    const out = await post('/run', { cls: run.cls, seed: run.seed, sig, moves: run.moves, build: chosenBuild });
    last.id = out.id;
    last.token = out.token;
    $('rRank').innerHTML = `Rank <b>#${out.rank}</b> of ${out.of} overall · <b>#${out.classRank}</b> among ${C.CLASS_NAME[run.cls]}s`;
  } catch {
    online = false;
    $('rRank').textContent = 'The ranking is offline right now, so this run was not saved.';
    $('nameBox').hidden = true;
  }
  board(boardClass);
}

async function saveName() {
  const name = $('nameIn').value.trim();
  if (!last || !last.id || !name) return;
  try {
    await post('/name', { id: last.id, token: last.token, name });
    $('saved').textContent = 'Saved.';
    board(boardClass);
  } catch {
    $('saved').textContent = 'That name did not save. Try another one.';
  }
}

let boardClass = 'ALL';
async function board(cls) {
  boardClass = cls;
  for (const b of document.querySelectorAll('#bFilter button')) b.classList.toggle('on', b.dataset.c === cls);
  const el = $(document.body.dataset.view === 'result' ? 'boardResult' : 'board');
  try {
    const r = await fetch(`${API}/board?cls=${cls}`);
    if (!r.ok) throw 0;
    const d = await r.json();
    if (!d.rows.length) { el.innerHTML = '<div class="empty">No runs yet. Be the first on the board.</div>'; return; }
    el.innerHTML = d.rows.map((x, i) => {
      const b = (C.BUILDS[x.cls] || []).find((q) => q.id === x.build);
      return `<div class="rw${last && x.id === last.id ? ' me' : ''}"><span class="rk">${i + 1}</span><img src="assets/classes/${x.cls}.png" alt="${C.CLASS_NAME[x.cls]}"><span class="nm" style="color:${C.CLASS_COLOR[x.cls]}">${esc(x.name)}${x.auto ? '<em>random name</em>' : ''}</span><span class="bd">${b ? esc(b.name) : ''}</span><b>${(+x.dps).toFixed(1)}</b></div>`;
    }).join('');
  } catch {
    el.innerHTML = '<div class="empty">The ranking could not be reached.</div>';
  }
}

async function startClass(cls) {
  show('draft');
  document.body.style.setProperty('--cc', C.CLASS_COLOR[cls]);
  document.body.style.setProperty('--art', `url(assets/game/${ART[cls]})`);
  $('who').textContent = C.CLASS_NAME[cls];
  $('portrait').src = `assets/classes/${cls}.png`;
  viewBuild = C.BUILDS[cls][0].id;
  buildDoll();
  let seed = (Math.random() * 2 ** 32) >>> 0;
  sig = null;
  try {
    const s = await post('/start', { cls });
    seed = s.seed;
    sig = s.sig;
  } catch { online = false; }
  run = C.newRun(seed, cls);
  sheet();
  if (!stage) stage = new Stage($('stage'), gear);
  stage.reset();
  $('status').textContent = 'Dressing your character...';
  await stage.setClass(cls);
  spin();
}

function classGrid() {
  $('classes').innerHTML = Object.keys(C.BUILDS).map((c) => `<button class="cls" data-c="${c}" style="--cc:${C.CLASS_COLOR[c]};--a:url(assets/game/${ART[c]})"><img src="assets/classes/${c}.png" alt=""><b>${C.CLASS_NAME[c]}</b></button>`).join('');
  for (const b of document.querySelectorAll('.cls')) b.onclick = () => startClass(b.dataset.c);
  $('bFilter').innerHTML = ['ALL', ...Object.keys(C.BUILDS)].map((c) => `<button class="chip" data-c="${c}" aria-label="${c === 'ALL' ? 'All classes' : C.CLASS_NAME[c]}">${c === 'ALL' ? 'All' : `<img src="assets/classes/${c}.png" alt="" title="${C.CLASS_NAME[c]}">`}</button>`).join('');
  for (const b of document.querySelectorAll('#bFilter button')) b.onclick = () => board(b.dataset.c);
}

function restart() {
  run = null;
  $('dps').classList.remove('done');
  $('dps').textContent = '0.0';
  $('fill').style.width = '0';
  $('nameBox').hidden = false;
  document.body.classList.remove('arena');
  document.body.style.removeProperty('--art');
  show('pick');
  board('ALL');
}

async function boot() {
  [pool, gear, talents] = await Promise.all(['draft/pool.json', 'draft/gear.json', 'draft/talents.json'].map((f) => fetch(f).then((r) => r.json())));
  classGrid();
  $('mull').onclick = mulligan;
  $('again').onclick = restart;
  $('nameGo').onclick = saveName;
  $('nameIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') saveName(); });
  show('pick');
  board('ALL');
}

boot();
