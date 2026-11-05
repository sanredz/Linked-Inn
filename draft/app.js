import * as C from './core.js?v=20261105154240';
import { Stage } from './stage.js?v=20261105154240';
import { askFeedback, askName, heroName, nameField, nameOk, notify, onName, syncName } from '../pvp/name.js';

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
const touch = matchMedia('(hover: none)').matches;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const prettyKey = (key) => key.match(/.{4}/g).join('-');
const CODE_MASK = '****-****-****-****';
const hideCode = (text, button) => { $(text).textContent = CODE_MASK; $(button).textContent = 'Show'; };
const flipCode = (text, button) => {
  if ($(button).textContent === 'Hide') return hideCode(text, button);
  $(text).textContent = prettyKey(playerKey);
  $(button).textContent = 'Hide';
};
function saveKey(key) {
  try { localStorage.setItem('draftKey', key); } catch {}
  return key;
}
function loadKey() {
  let key = null;
  try { key = localStorage.getItem('draftKey'); } catch {}
  return key || saveKey([...crypto.getRandomValues(new Uint32Array(16))].map((n) => ALPHABET[n % ALPHABET.length]).join(''));
}

function note(key) {
  try { localStorage.setItem(key, '1'); } catch {}
}
const pageUrl = () => location.origin + location.pathname;

let playerKey = loadKey(), histRows = [], histSort = 'new', histOpen = 0, openPicks = {}, shareId = '', retired = {};
let cameFrom = null;
let sharedRows = [], sharedOpen = 0, replayRun = null, replayStep = 0, replayBack = 'pick', replayWorn = {}, dressed = {}, dressing = Promise.resolve(), everything;
let viewBuild = null, pool, gear, talents, stage, run, sig, offer = {}, spinning = false, chosenBuild = null, last = null, online = true;

const row = (id) => pool.items[id] || retired[id];
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

let gauntletOwned = null;
let raidOwned = null;
let mainView = 'pick';
let gauntletOpen = false;
let raidOpen = false;

function tooltip(id, owned, enchant) {
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
  if (enchant) h += `<div class="eq">${esc(enchant)}</div>`;
  for (const l of lines) h += `<div class="eq">${esc(l)}</div>`;
  if (s.ap && !lines.some((l) => /Attack Power/.test(l))) h += `<div class="eq">Equip: +${s.ap} Attack Power.</div>`;
  if (s.sp && !lines.some((l) => /damage/.test(l))) h += `<div class="eq">Equip: Increases damage and healing done by magical spells and effects by up to ${s.sp}.</div>`;
  const set = setId && pool.sets[setId];
  if (set) {
    const have = set.i.filter((i) => Object.values(owned || (document.body.dataset.view === 'raid' && raidOwned ? raidOwned() : document.body.dataset.view === 'gauntlet' && gauntletOwned ? gauntletOwned() : ['pick', 'shared', 'replay'].includes(document.body.dataset.view) ? openPicks : run ? run.picks : {})).includes(i)).length;
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
  if (!e.target.closest('#hand') && !e.target.closest('.slot') && !e.target.closest('#sheet')) $('hand').hidden = true;
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('hand').hidden = true; });

document.addEventListener('click', (e) => {
  if (!touch || !e.target.closest) return;
  const tal = e.target.closest('[data-tal]');
  if (tal) {
    e.stopPropagation();
    e.preventDefault();
    openSheet(taltip(tal.dataset.tal, tal.dataset.build));
    return;
  }
  const worn = e.target.closest('.ps');
  if (worn && +worn.dataset.item) openSheet(tooltip(worn.dataset.item, undefined, worn.dataset.extra));
}, true);

document.addEventListener('mousemove', (e) => {
  if (touch) return;
  const t = $('tip');
  const tal = e.target.closest && e.target.closest('[data-tal]');
  if (tal) {
    const key = 't' + tal.dataset.tal + tal.dataset.build;
    if (t.dataset.id !== key) { t.innerHTML = taltip(tal.dataset.tal, tal.dataset.build); t.classList.remove('multi'); t.dataset.id = key; }
    t.hidden = false;
    positionTip(e);
    return;
  }
  const el = e.target.closest && e.target.closest('[data-item]');
  if (!el || !+el.dataset.item) { t.hidden = true; return; }
  const vs = (el.dataset.vs || '').split(',').filter(Boolean), key = [el.dataset.item, ...vs, el.dataset.head || ''].join();
  if (t.dataset.id !== key) {
    t.innerHTML = vs.length ? [el.dataset.item, ...vs].map((id, i) => `<div class="ttcol">${i ? '<small>Equipped</small>' : ''}${tooltip(id)}</div>`).join('') : (el.dataset.head ? `<small class="tiphead">${esc(el.dataset.head)}</small>` : '') + tooltip(el.dataset.item, undefined, el.dataset.extra);
    t.classList.toggle('multi', vs.length > 0);
    t.dataset.id = key;
  }
  t.hidden = false;
  positionTip(e);
});

function buildDoll() {
  const left = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist'], right = ['legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2', 'main', 'off', 'ranged'];
  const name = Object.fromEntries(C.SLOTS);
  const cell = (s) => `<button class="slot" id="s_${s}" data-slot="${s}"><span class="ic"><img alt=""></span><span class="tx"><b></b><small>${name[s]}</small></span></button>`;
  $('left').innerHTML = left.map(cell).join('');
  $('right').innerHTML = right.map(cell).join('');
  for (const b of document.querySelectorAll('.slot')) b.onclick = () => (touch ? inspect(b.dataset.slot) : choose(b.dataset.slot));
  const art = (s) => ['finger1', 'finger2'].includes(s) ? 'finger' : ['trinket1', 'trinket2'].includes(s) ? 'trinket' : s;
  $('doll').innerHTML = PANE.map(([s, x, y]) => `<button class="ps" id="p_${s}" data-item="" style="left:calc(var(--u)*${x});top:calc(var(--u)*${y});background-image:url(assets/draft/ui/${art(s)}.png)" tabindex="-1"></button>`).join('');
  for (const s of ['shirt', 'tabard']) $('p_' + s).classList.add('dead');
}

function fillPane(slot, id, from) {
  const el = $('p_' + slot), r = row(id);
  const finish = () => {
    if (replayRun && replayWorn[slot] !== id) return;
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

function emptyPane(slot) {
  const el = $('p_' + slot);
  el.innerHTML = '';
  el.dataset.item = '';
  el.classList.remove('on', 'land');
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
  const hand = id && (slot === 'main' || slot === 'off') ? INV[row(id)[3]] : '';
  const notes = [hand, id && C.TIER_NAME[tierOf(slot, id)], state === 'kept' ? 'kept' : state === 'took' ? 'kept this round' : ''];
  el.querySelector('small').textContent = id ? notes.filter(Boolean).join(' · ') : Object.fromEntries(C.SLOTS)[slot];
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
  const s = C.sheet(everything, run.cls, viewBuild, run.picks), hasMana = s.now.mana > 0;
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

function openSheet(html, slot, hands = []) {
  $('sheetBody').innerHTML = html;
  $('sheetKeep').hidden = !slot || hands.length > 1;
  $('sheetKeep').onclick = (e) => { e.stopPropagation(); closeSheet(); choose(slot); };
  for (const [id, to] of [['sheetMain', 'main'], ['sheetOff', 'off']]) {
    $(id).hidden = !hands.includes(to) || hands.length < 2;
    $(id).onclick = (e) => { e.stopPropagation(); closeSheet(); choose(slot, to); };
  }
  $('sheet').hidden = false;
}

function closeSheet() {
  $('sheet').hidden = true;
}

function inspect(slot) {
  const id = +$('s_' + slot).dataset.item;
  if (!id) return;
  const open = !spinning && run && offer[slot] === id && !(slot in run.picks);
  openSheet(tooltip(id), open ? slot : null, open ? C.hands(pool, run, slot, id) : []);
}

function askHand(slot) {
  $('tip').hidden = true;
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
  closeSheet();
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
  const marks = res.summons.map(([summon, from, to]) => ({ summon, from, to, on: false, off: false }));
  const cat = run.cls === 'HUNTER' && !!build.kit.pet;
  await stage.prepare([...new Set(marks.map((m) => m.summon)), ...(cat ? ['cat'] : [])]);
  if (cat) stage.summon('cat');
  const minions = new Set(['Pet', ...Object.values(C.SUMMONS).map((s) => s.n)]);
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
      const until = e * events.length, clock = e * C.FIGHT;
      for (const m of marks) {
        if (!m.on && clock >= m.from) { m.on = true; stage.summon(m.summon); }
        if (m.on && !m.off && clock >= m.to) { m.off = true; stage.dismiss(m.summon); }
      }
      while (at < until && at < events.length) {
        const ev = events[at++];
        stage.hit(ev[4], minions.has(ev[1]), ev[1], ev[3]);
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

function statSpans(s, build) {
  const list = build.kit.kind === 'caster' ? [['Spell Damage', s.sp], ['Spell Crit', s.scrit + '%'], ['Spell Hit', s.shit + '%'], ['Intellect', s.int]] : [['Attack Power', build.kit.kind === 'ranged' ? s.rap : s.ap], ['Crit', s.crit + '%'], ['Hit', s.hit + '%'], ['Agility', s.agi]];
  return list.map(([k, v]) => `<span><i>${k}</i>${v}</span>`).join('');
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
  const s = res.sheet;
  $('rSheet').innerHTML = statSpans(s, build);
  const auto = C.randomName(run.seed);
  showName();
  $('saved').textContent = '';
  $('rRank').textContent = 'Logging your run...';
  last.auto = auto;
  last.id = null;
  try {
    const out = await post('/run', { cls: run.cls, seed: run.seed, sig, moves: run.moves, build: chosenBuild, key: playerKey });
    last.id = out.id;
    last.token = out.token;
    const spec = C.specOf(run.cls, chosenBuild);
    $('rRank').innerHTML = `Rank <b>#${out.rank}</b> of ${out.of} overall · <b>#${out.classRank}</b> among ${C.CLASS_NAME[run.cls]}s${Object.keys(C.SPECS[run.cls]).length > 1 ? ` · <b>#${out.specRank}</b> in ${spec}` : ''}`;
  } catch (e) {
    online = false;
    $('rRank').textContent = /"error":"(build|run|seed)"/.test(e.message) ? 'This page is out of date, so the run was not saved. Press Ctrl+F5 and try again.' : 'The ranking is offline right now, so this run was not saved.';
    $('nameBox').hidden = true;
  }
  board(run.cls, Object.keys(C.SPECS[run.cls]).length > 1 ? C.specOf(run.cls, chosenBuild) : '');
}

function showName() {
  $('nameGo').hidden = nameOk();
  $('nameShow').innerHTML = nameOk() ? `<b>${esc(heroName())}</b><i class="ninfo" tabindex="0" aria-label="You can change your name in your Hearth">i<em>You can change your name in your Hearth</em></i>` : '<small>Save it under your name</small>';
}

async function saveName() {
  if (!last || !last.id || last.named) return;
  if (!nameOk() && !(await askName())) return;
  showName();
  try {
    await post('/name', { id: last.id, token: last.token, name: heroName() });
    last.named = true;
    $('saved').textContent = 'Saved.';
    board(boardClass, boardSpec);
  } catch (e) {
    if (/"ok":false/.test(e.message)) { last.named = true; $('saved').textContent = 'Saved.'; return; }
    $('saved').textContent = /"error":"(name|taken)"/.test(e.message) ? 'That name belongs to someone else. Change yours in your Hearth.' : 'That name did not save. Try again.';
  }
}

function specRow(el, cls, classes) {
  const names = Object.keys(C.SPECS[cls] || {});
  const items = [...classes, ...(names.length > 1 ? names.map((s) => [cls, s, s]) : [])];
  el.innerHTML = items.map(([c, s, label]) => `<button class="spec${c === boardClass && s === boardSpec ? ' on' : ''}" data-c="${c}" data-s="${esc(s)}">${esc(label)}</button>`).join('');
  for (const b of el.children) b.onclick = () => board(b.dataset.c, b.dataset.s);
}

let boardClass = 'ALL', boardSpec = '', boardFind = '', boardTicket = 0, findTimer = 0;
async function board(cls, spec = '') {
  boardClass = cls;
  boardSpec = spec;
  const ticket = ++boardTicket, result = document.body.dataset.view === 'result';
  for (const b of document.querySelectorAll('#bFilter button')) b.classList.toggle('on', b.dataset.c === cls);
  specRow($('bSpec'), cls, Object.keys(C.SPECS[cls] || {}).length > 1 ? [[cls, '', 'All specs']] : []);
  if (result && run) specRow($('rSpec'), run.cls, [['ALL', '', 'All classes'], [run.cls, '', C.CLASS_NAME[run.cls]]]);
  const el = $(result ? 'boardResult' : 'board'), count = $(result ? 'rCount' : 'bCount'), find = boardFind.trim();
  try {
    const r = await fetch(`${API}/board?cls=${cls}${spec ? `&spec=${encodeURIComponent(spec)}` : ''}${find ? `&q=${encodeURIComponent(find)}` : ''}`);
    if (!r.ok) throw 0;
    const d = await r.json();
    if (ticket !== boardTicket) return;
    const plural = (n) => `${n.toLocaleString()} run${n === 1 ? '' : 's'}`;
    count.textContent = find ? `${d.matched.toLocaleString()} of ${plural(d.total)}` : plural(d.total);
    if (!d.rows.length) { el.innerHTML = `<div class="empty">${find ? 'Nobody with that name here.' : 'No runs yet. Be the first on the board.'}</div>`; return; }
    el.classList.toggle('ranks', !!find);
    el.innerHTML = (find ? '<p class="rw rh"><span>Overall</span><span>Class</span></p>' : '') + d.rows.map((x) => {
      const b = (C.BUILDS[x.cls] || []).find((q) => q.id === x.build);
      return `<a class="rw${last && x.id === last.id ? ' me' : ''}" href="#run=${x.id}" data-run="${x.id}"><span class="rk">${x.pos}</span>${find ? `<span class="rk">${x.classPos}</span>` : ''}<img src="assets/classes/${x.cls}.png" alt="${C.CLASS_NAME[x.cls]}"><span class="nm" style="color:${C.CLASS_COLOR[x.cls]}">${esc(x.name)}${x.auto ? '<em>random name</em>' : ''}</span><span class="bd">${b ? esc(b.name) : ''}</span><b>${(+x.dps).toFixed(1)}</b></a>`;
    }).join('');
  } catch {
    if (ticket !== boardTicket) return;
    count.textContent = '';
    el.innerHTML = '<div class="empty">The ranking could not be reached.</div>';
  }
}

function runDetail(x) {
  const build = C.BUILDS[x.cls].find((b) => b.id === x.build);
  const res = C.simulate(pool, x.cls, x.build, x.picks, x.seed, 12);
  const notes = x.swapped.map((s) => `${esc(s.from)} was removed from the draft, so this run now has ${s.to ? esc(row(s.to)[0]) : 'nothing'} in that slot.`);
  if (x.orig_dps !== null && Math.abs(x.orig_dps - x.dps) >= .05) notes.unshift(`Scored ${(+x.orig_dps).toFixed(1)} under the old rules, rescored to ${(+x.dps).toFixed(1)}.`);
  const names = Object.fromEntries(C.SLOTS);
  const gear = C.SLOTS.filter(([s]) => x.picks[s]).map(([s]) => {
    const id = x.picks[s];
    return `<button class="hi" data-item="${id}"><img src="${icon(id)}" alt=""><span style="color:${QUALITY[row(id)[1]]}">${esc(row(id)[0])}<small>${names[s]}</small></span></button>`;
  }).join('');
  const top = Object.entries(res.by).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return `<div class="hd">
    <div class="hbuild">${esc(build.name)} · ${esc(build.split)}${x.auto ? '' : ` · ${esc(x.name)}`}<span class="hacts">${x.replay || x.draft ? `<button class="spec" data-watch="${x.id}">Watch the draft</button>` : ''}<button class="spec" data-link="${x.id}">Copy run link</button></span></div>
    ${notes.length ? `<div class="hnotes">${notes.map((n) => `<div>${n}</div>`).join('')}</div>` : ''}
    <div class="hgear">${gear}</div>
    <div class="hside">
      <div class="sheet" >${statSpans(res.sheet, build)}</div>
      <div class="rc">${top.map(([n, v]) => `<div class="br"><span>${esc(n)}</span><i style="width:${v}%"></i><b>${v}%</b></div>`).join('')}</div>
      ${res.sets.length ? `<div class="hsets">${res.sets.map(([n, c]) => `<div>${esc(n)} (${c})</div>`).join('')}</div>` : ''}
    </div>
  </div>`;
}

function wireDetail(el, back) {
  for (const b of el.querySelectorAll('.hi')) b.onclick = () => { if (touch) openSheet(tooltip(+b.dataset.item)); };
  for (const b of el.querySelectorAll('[data-watch]')) b.onclick = () => watch(+b.dataset.watch, back);
  for (const b of el.querySelectorAll('[data-link]')) b.onclick = () => copyLink(b, `${pageUrl()}#run=${b.dataset.link}`, 'Copy run link');
}

async function copyLink(button, text, label) {
  try { await navigator.clipboard.writeText(text); button.textContent = 'Copied'; } catch { button.textContent = 'Press and hold to copy'; }
  setTimeout(() => { button.textContent = label; }, 1800);
}

function drawRows(el, rows, sort, openId, toggle, back) {
  const open = rows.find((x) => x.id === openId);
  openPicks = open ? open.picks : {};
  const list = [...rows].sort(sort === 'best' ? (a, b) => b.dps - a.dps : (a, b) => b.id - a.id);
  const when = (at) => new Date(at * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  el.innerHTML = list.map((x) => `<div class="hrow${x === open ? ' open' : ''}"><button class="hr" data-id="${x.id}" aria-expanded="${x === open}"><img src="assets/classes/${x.cls}.png" alt="${C.CLASS_NAME[x.cls]}"><span class="nm" style="color:${C.CLASS_COLOR[x.cls]}">${esc(C.specOf(x.cls, x.build) || C.CLASS_NAME[x.cls])} ${C.CLASS_NAME[x.cls]}<em>${when(x.at)}${x.auto ? '' : ` · ${esc(x.name)}`}</em></span>${x.swapped.length ? '<span class="tag">Item replaced</span>' : ''}<b>${(+x.dps).toFixed(1)}</b></button>${x === open ? runDetail(x) : ''}</div>`).join('');
  for (const b of el.querySelectorAll('.hr')) b.onclick = () => toggle(+b.dataset.id);
  wireDetail(el, back);
}

function drawHistory() {
  const best = histRows.reduce((m, x) => Math.max(m, x.dps), 0);
  $('hSum').textContent = histRows.length ? `${histRows.length} run${histRows.length === 1 ? '' : 's'} · best ${best.toFixed(1)}` : '';
  for (const b of $('hSort').children) b.classList.toggle('on', b.dataset.o === histSort);
  $('hSort').hidden = histRows.length < 2;
  $('hShare').hidden = !histRows.length || !shareId;
  if (!histRows.length) { $('hist').innerHTML = '<div class="empty">Your finished runs will show up here.</div>'; return; }
  drawRows($('hist'), histRows, histSort, histOpen, (id) => { histOpen = histOpen === id ? 0 : id; drawHistory(); }, 'pick');
}

const readRun = (x) => ({ ...x, picks: JSON.parse(x.picks), swapped: x.swapped ? JSON.parse(x.swapped) : [], draft: x.draft ? JSON.parse(x.draft) : null });

async function fetchRun(id) {
  const r = await fetch(`${API}/one?id=${id}`);
  if (!r.ok) throw new Error('missing');
  return readRun((await r.json()).run);
}

async function watch(id, back) {
  try {
    replayRun = await fetchRun(id);
  } catch { return; }
  replayStep = 0;
  replayBack = back;
  replayWorn = {};
  dressed = {};
  offer = {};
  const x = replayRun;
  run = { cls: x.cls, picks: {} };
  show('replay');
  scrollTo(0, 0);
  setTable(x.cls, x.build);
  $('dTitle').textContent = `${x.auto ? '' : `${x.name}: `}${C.specOf(x.cls, x.build)} ${C.CLASS_NAME[x.cls]}`;
  $('status').textContent = '';
  drawReplay();
  if (!stage) stage = new Stage($('stage'), gear);
  stage.reset();
  stage.resize();
  await stage.setClass(x.cls);
  if (replayRun === x) dress(replayWorn);
}

function dress(want) {
  dressing = dressing.then(async () => {
    if (want !== replayWorn) return;
    if (Object.keys(dressed).some((s) => dressed[s] !== want[s])) {
      dressed = {};
      await stage.strip();
    }
    for (const [slot, id] of Object.entries(want)) {
      if (want !== replayWorn) return;
      if (dressed[slot] === id) continue;
      dressed[slot] = id;
      await stage.wear(slot, id, row(id));
    }
  }).catch(() => {});
}

function drawReplay() {
  const x = replayRun, log = x.draft, step = log[replayStep], worn = {};
  for (const [shown, move] of log.slice(0, replayStep + 1)) {
    if (move === '!') continue;
    const [slot, to = slot] = move.split('>');
    worn[to] = shown[slot];
  }
  const [shown, move] = step || [{}, ''];
  const [slot, to = slot] = move === '!' ? [] : move.split('>');
  const taken = move && move !== '!' ? shown[slot] : 0;
  const names = Object.fromEntries(C.SLOTS);
  $('round').textContent = step ? `Round ${replayStep + 1} of ${log.length}` : `Finished at ${(+x.dps).toFixed(1)} DPS`;
  $('rpSay').innerHTML = !step ? ['That is the whole draft.', ...x.swapped.map((c) => `${esc(c.from)} was later removed from the draft, so this run is now scored with ${c.to ? esc(row(c.to)[0]) : 'an empty slot'}.`)].join(' ') : move === '!' ? 'Used the mulligan, so every open slot rolled again.' : `Kept <span style="color:${QUALITY[row(taken)[1]]}">${esc(row(taken)[0])}</span>${to !== slot ? ` in the ${esc(names[to])} slot` : ''}.`;
  replayWorn = worn;
  openPicks = worn;
  run.picks = worn;
  for (const [s] of C.SLOTS) {
    const id = s === slot ? taken : worn[s] || shown[s] || 0;
    paint(s, id, !id ? 'blocked' : !step ? 'final' : s === slot ? 'took' : worn[s] ? 'kept' : move === '!' ? 'gone' : 'offer');
    if (!worn[s]) { emptyPane(s); continue; }
    if (+$('p_' + s).dataset.item !== worn[s]) fillPane(s, worn[s], s === to ? $('s_' + slot).querySelector('.ic') : null);
  }
  sheet();
  $('tip').hidden = true;
  $('rpPrev').disabled = replayStep === 0;
  $('rpNext').disabled = replayStep === log.length;
  if (stage && stage.rig) dress(worn);
}

function replayMove(by) {
  replayStep = Math.max(0, Math.min(replayRun.draft.length, replayStep + by));
  drawReplay();
}

function leaveReplay() {
  replayRun = null;
  run = null;
  replayWorn = {};
  $('dTitle').textContent = 'Gear Draft';
  $('round').textContent = '';
  document.body.style.removeProperty('--art');
  show(replayBack);
  if (replayBack === 'pick') drawHistory(); else if (sharedRows.length) drawShared(); else route();
}

function drawShared() {
  drawRows($('shBody'), sharedRows, 'best', sharedOpen, (id) => { sharedOpen = sharedOpen === id ? 0 : id; drawShared(); }, 'shared');
}

async function showRun(id) {
  sharedRows = [];
  show('shared');
  $('shTitle').textContent = 'Shared run';
  $('shSum').textContent = '';
  try {
    const x = await fetchRun(id);
    openPicks = x.picks;
    $('shTitle').textContent = `${x.auto ? '' : `${x.name}: `}${C.specOf(x.cls, x.build)} ${C.CLASS_NAME[x.cls]}`;
    $('shSum').textContent = `${(+x.dps).toFixed(1)} DPS`;
    $('shBody').innerHTML = `<div class="hrow open">${runDetail(x)}</div>`;
    wireDetail($('shBody'), 'shared');
  } catch {
    $('shBody').innerHTML = '<div class="empty">That run could not be found.</div>';
  }
}

async function showShared(share) {
  sharedRows = [];
  sharedOpen = 0;
  show('shared');
  $('shTitle').textContent = 'Shared runs';
  $('shSum').textContent = '';
  try {
    const r = await fetch(`${API}/shared?s=${share}`);
    if (!r.ok) throw 0;
    sharedRows = (await r.json()).rows.map(readRun);
    $('shSum').textContent = `${sharedRows.length} run${sharedRows.length === 1 ? '' : 's'}`;
    if (sharedRows.length) drawShared(); else $('shBody').innerHTML = '<div class="empty">No runs here yet.</div>';
  } catch {
    $('shBody').innerHTML = '<div class="empty">Those runs could not be found.</div>';
  }
}

function route() {
  const hash = location.hash, one = /^#run=(\d+)$/.exec(hash), many = /^#runs=([0-9a-f]{16})$/.exec(hash);
  $('shBack').hidden = !cameFrom;
  if (one) return showRun(+one[1]);
  if (many) return showShared(many[1]);
  if (cameFrom) {
    const { view, y, picks, box, top } = cameFrom;
    cameFrom = null;
    openPicks = picks;
    show(view);
    if (box) box.scrollTop = top;
    scrollTo(0, y);
    return;
  }
  show(mainView);
  board('ALL');
  history();
}

async function history(from) {
  try {
    const d = await post('/history', { key: playerKey, from });
    histRows = d.rows.map(readRun);
    shareId = d.share;
    drawHistory();
  } catch {
    $('hist').innerHTML = '<div class="empty">Your runs could not be reached.</div>';
  }
}

function useCode(input = 'sIn', msg = 'sMsg') {
  const key = $(input).value.replace(/[^0-9a-z]/gi, '').toUpperCase();
  if (key.length !== 16 || [...key].some((c) => !ALPHABET.includes(c))) { $(msg).textContent = 'That is not a Hearthstone code. It has 16 letters and numbers.'; return; }
  const from = playerKey;
  playerKey = saveKey(key);
  $(input).value = '';
  $(msg).textContent = 'Code loaded. Your runs, badges and collection are here.';
  $('sUse').hidden = false;
  $('sForm').hidden = true;
  hideCode('sCode', 'sShow');
  histOpen = 0;
  history(from);
  refreshHearth(from);
}

let hearthLib = null;
const hearthMod = async () => {
  if (!hearthLib) {
    hearthLib = await import('./hearth.js?v=20261105154240');
    hearthLib.setupHearth({ API, key: () => playerKey, Stage, gear, row: (id) => row(id), onChange: () => hearthLib.hearthBar($('hearthBar')) });
  }
  return hearthLib;
};
let hearthAt = 0, raidMod = null;
const asked = (id) => { try { return sessionStorage.getItem(`forgeCalled${id}`); } catch { return '1'; } };
const FEEDBACK_OPEN = Date.UTC(2026, 10, 5, 0), FEEDBACK_KEY = 'feedbackAsked';
const feedbackAsked = () => { try { return !!localStorage.getItem(FEEDBACK_KEY); } catch { return true; } };
async function callFeedback() {
  if (!hearthLib || feedbackAsked() || document.querySelector('.fcall, .fcer, .nmask')) return;
  const runs = hearthLib.runsDone();
  if (document.body.dataset.view !== 'home' || !(runs >= 5 || (runs > 0 && Date.now() < FEEDBACK_OPEN))) return;
  try { localStorage.setItem(FEEDBACK_KEY, String(Date.now())); } catch {}
  await askFeedback('prompt', true);
}
$('feedBtn').onclick = () => askFeedback(document.body.dataset.view || '');

async function callForge() {
  if (!hearthLib || document.querySelector('.fcall, .fcer, .nmask')) return;
  const view = document.body.dataset.view, idle = ['home', 'pick', 'result'].includes(view) || (view === 'raid' && raidMod && raidMod.raidIdle());
  const x = idle && hearthLib.readyRelics().find((r) => !asked(r.id));
  if (!x) return;
  try { sessionStorage.setItem(`forgeCalled${x.id}`, '1'); } catch {}
  await hearthLib.callForge(x);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - hearthAt > 120000) refreshHearth(); });
async function refreshHearth(from) {
  hearthAt = Date.now();
  try {
    const h = await hearthMod(), d = await h.loadHearth(from ? { from } : {});
    await syncName(d.name);
    h.hearthBar($('hearthBar'));
    for (const n of d.notices || []) await notify(n);
    await callForge();
    await callFeedback();
    shareId = d.share || shareId;
    $('sShare').hidden = !shareId;
    $('sShareNone').hidden = !!shareId;
  } catch {}
}

let peekStage, peekId = 0, peekX = 0, peekOpen = 0, peekHide = 0, peekChain = Promise.resolve(), peekPicks = {};
const peekRuns = new Map();

async function peekRun(id) {
  if (!peekRuns.has(id)) peekRuns.set(id, await fetchRun(id));
  return peekRuns.get(id);
}

function placePeek(el) {
  const r = el.getBoundingClientRect(), w = 360, h = 440, gap = 36;
  const x = peekX + gap + w <= innerWidth - 8 ? peekX + gap : peekX - gap - w;
  const y = Math.max(8, Math.min(r.top + r.height / 2 - h / 2, innerHeight - h - 8));
  $('peek').style.transform = `translate(${Math.max(8, x)}px,${y}px)`;
}

function fillPeek(x) {
  const art = (s) => ['finger1', 'finger2'].includes(s) ? 'finger' : ['trinket1', 'trinket2'].includes(s) ? 'trinket' : s;
  $('pkDoll').innerHTML = PANE.map(([s, left, top]) => {
    const id = x.picks[s], on = id && row(id);
    return `<button class="ps${on ? ' on' : ''}${['shirt', 'tabard'].includes(s) ? ' dead' : ''}" data-item="${on ? id : ''}" style="left:calc(var(--u)*${left});top:calc(var(--u)*${top});background-image:url(assets/draft/ui/${art(s)}.png)${on ? `;--q:${QUALITY[row(id)[1]]}` : ''}" tabindex="-1">${on ? `<img src="${icon(id)}" alt="">` : ''}</button>`;
  }).join('');
  $('peek').style.setProperty('--cc', C.CLASS_COLOR[x.cls]);
  $('pkPortrait').src = `assets/classes/${x.cls}.png`;
  $('pkWho').textContent = `${x.auto ? '' : `${x.name} · `}${C.specOf(x.cls, x.build) || C.CLASS_NAME[x.cls]}`;
  $('pkSay').textContent = `${(+x.dps).toFixed(1)} DPS`;
}

async function openPeek(el) {
  const id = +el.dataset.run;
  if (peekId === id) return;
  peekId = id;
  let x;
  try { x = await peekRun(id); } catch { return; }
  if (peekId !== id) return;
  if ($('peek').hidden) peekPicks = openPicks;
  openPicks = x.picks;
  fillPeek(x);
  placePeek(el);
  $('peek').hidden = false;
  if (!peekStage) peekStage = new Stage($('pkStage'), gear);
  peekStage.resume();
  peekStage.resize();
  peekChain = peekChain.then(async () => {
    if (peekId !== id) return;
    $('pkStage').style.opacity = 0;
    await peekStage.setClass(x.cls);
    if (peekId !== id) return;
    await peekStage.outfit(C.SLOTS.filter(([s]) => x.picks[s] && row(x.picks[s])).map(([s]) => [s, x.picks[s], row(x.picks[s])]), () => { $('pkStage').style.opacity = 1; });
  }).catch(() => {});
}

function closePeek() {
  clearTimeout(peekOpen);
  clearTimeout(peekHide);
  if ($('peek').hidden) { peekId = 0; return; }
  peekId = 0;
  $('peek').hidden = true;
  $('tip').hidden = true;
  openPicks = peekPicks;
  if (peekStage) peekStage.pause();
}

if (!touch) {
  document.addEventListener('mousemove', (e) => { peekX = e.clientX; });
  document.addEventListener('mouseover', (e) => {
    const link = e.target.closest && e.target.closest('a.rw[data-run]'), inside = e.target.closest && e.target.closest('#peek');
    if (!link && !inside) return;
    clearTimeout(peekHide);
    clearTimeout(peekOpen);
    if (link) peekOpen = setTimeout(() => openPeek(link), 220);
  });
  document.addEventListener('mouseout', (e) => {
    const from = e.target.closest && e.target.closest('a.rw[data-run], #peek');
    const to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('a.rw[data-run], #peek');
    if (!from || to) return;
    clearTimeout(peekOpen);
    peekHide = setTimeout(closePeek, 350);
  });
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('a.rw[data-run]')) closePeek(); });
  addEventListener('scroll', closePeek, { passive: true });
}

function setTable(cls, build) {
  document.body.style.setProperty('--cc', C.CLASS_COLOR[cls]);
  document.body.style.setProperty('--art', `url(assets/game/${ART[cls]})`);
  $('who').textContent = C.CLASS_NAME[cls];
  $('portrait').src = `assets/classes/${cls}.png`;
  viewBuild = build;
  buildDoll();
}

async function startClass(cls) {
  show('draft');
  setTable(cls, C.BUILDS[cls][0].id);
  let seed = (Math.random() * 2 ** 32) >>> 0;
  sig = null;
  try {
    const s = await post('/start', { cls, version: C.VERSION });
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

const STEPS = [['Spin', 'Every open slot rolls an item for your class.'], ['Keep one', 'The rest roll again. You get one mulligan.'], ['Talents', 'Pick one of three Forever builds.'], ['Hit the dummy', 'Your DPS goes on the board.']];
let gearCls = (() => { try { const c = localStorage.getItem('gearClass'); return C.BUILDS[c] ? c : 'WARRIOR'; } catch { return 'WARRIOR'; } })(), gearShown = '';

function drawPick() {
  const fresh = gearCls !== gearShown, enter = !gearShown, color = C.CLASS_COLOR[gearCls], specs = Object.keys(C.SPECS[gearCls] || {});
  gearShown = gearCls;
  const banners = Object.keys(C.BUILDS).map((c, i) => `<button class="rbanner ${c === gearCls ? 'on' : ''} ${c === gearCls && fresh ? 'fresh' : ''}" data-gc="${c}" style="--cc:${C.CLASS_COLOR[c]};--i:${i}"><span class="rbannerface"><i class="rbannerart" style="background-image:url(assets/game/${ART[c]})"></i><img src="assets/classes/${c}.png" alt=""><b>${C.CLASS_NAME[c]}</b></span></button>`).join('');
  $('classes').innerHTML = `<div class="rpicker ${enter ? 'enter' : ''}" style="--cc:${color}"><i class="rpickart" style="background-image:url(assets/game/${ART[gearCls]})"></i><div class="rembers">${'<i></i>'.repeat(12)}</div><div class="rpickhead"><h3>Choose your class</h3>${nameField()}</div><div class="rbanners many">${banners}</div><div class="rpickinfo ${fresh ? 'fresh' : ''}"><h4>${C.CLASS_NAME[gearCls]}</h4>${specs.length ? `<small class="rpickspec">${specs.map(esc).join(' · ')}</small>` : ''}<ol class="gsteps">${STEPS.map(([b, t]) => `<li><b>${b}</b><span>${t}</span></li>`).join('')}</ol></div><button class="rforge" data-gstart><span>Draft a ${C.CLASS_NAME[gearCls]}</span></button></div>`;
  for (const b of $('classes').querySelectorAll('[data-gc]')) b.onclick = () => { gearCls = b.dataset.gc; try { localStorage.setItem('gearClass', gearCls); } catch {} drawPick(); };
  $('classes').querySelector('[data-gstart]').onclick = async () => { if (nameOk() || (await askName())) startClass(gearCls); };
}

function classGrid() {
  drawPick();
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
  if (location.hash) clearHash();
  show('pick');
  board('ALL');
  history();
}

function clearHash() {
  window.history.replaceState(null, '', location.pathname);
}

async function loadTally() {
  try {
    const r = await fetch(`${API}/counts`);
    if (!r.ok) return;
    const d = await r.json(), total = d.gear + d.arena + d.raid;
    if (d.heard) {
      const el = $('feedHeard');
      el.innerHTML = `<i class="fhl">Latest fix from</i><img src="assets/icons/134939.png" alt="" title="Voice of the Inn: sent feedback that made it into the game"><b>${esc(d.heard.name)}:</b><i>${esc(d.heard.fix)}</i>`;
      el.hidden = false;
    }
    if (!Number.isFinite(total)) return;
    for (const el of document.querySelectorAll('[data-count]')) { const n = d[el.dataset.count]; el.innerHTML = `${n.toLocaleString()}<small>${n === 1 ? 'run' : 'runs'}</small>`; el.hidden = false; }
    const box = $('tallyAll'), start = performance.now(), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('tally').hidden = false;
    const step = (t) => { const p = still ? 1 : Math.min(1, (t - start) / 1400), e = 1 - (1 - p) ** 3; box.textContent = Math.round(total * e).toLocaleString(); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    setTimeout(() => { box.textContent = total.toLocaleString(); }, 1600);
  } catch {}
}

async function boot() {
  [pool, gear, talents, retired] = await Promise.all(['draft/pool.json?v=20261105154240', 'draft/gear.json?v=20261105154240', 'draft/talents.json?v=20261105154240', 'draft/retired.json?v=20261105154240'].map((f) => fetch(f).then((r) => r.json())));
  everything = { ...pool, items: { ...pool.items, ...retired } };
  classGrid();
  for (const box of [$('bFind'), $('rFind')]) box.oninput = () => {
    boardFind = $('bFind').value = $('rFind').value = box.value;
    clearTimeout(findTimer);
    findTimer = setTimeout(() => board(boardClass, boardSpec), 120);
  };
  for (const href of ['pvp/gauntlet.css', 'raid/raid.css', 'draft/hearth.css', 'pvp/name.css']) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.append(link);
  }
  const go = (view) => {
    if (view !== 'hearth' && hearthLib) hearthLib.leaveHearth();
    mainView = view;
    show(view);
    if (view !== 'hearth') setTimeout(() => callForge().then(callFeedback), 600);
    for (const b of document.querySelectorAll('[data-mode]')) b.classList.toggle('on', b.dataset.mode === view);
    scrollTo(0, 0);
  };
  const openArena = async () => {
    go('gauntlet');
    if (gauntletOpen) return dispatchEvent(new Event('resize'));
    gauntletOpen = true;
    $('gauntletRoot').innerHTML = '<div class="gload">Entering the arena</div>';
    const { openGauntlet } = await import('../pvp/gauntlet.js');
    await openGauntlet({ pool, gear, tooltip, PANE, QUALITY, ownedBy: (fn) => { gauntletOwned = fn; } }, $('gauntletRoot'));
  };
  const openRaid = async () => {
    go('raid');
    if (raidOpen) {
      dispatchEvent(new Event('resize'));
      return (await import('../raid/raid.js')).backToRaids();
    }
    raidOpen = true;
    $('raidRoot').innerHTML = '<div class="gload">Entering Raid Draft</div>';
    const raid = raidMod = await import('../raid/raid.js');
    await raid.openRaid({ pool, gear, tooltip, PANE, QUALITY, ownedBy: (fn) => { raidOwned = fn; }, held: () => (hearthLib ? hearthLib.held() : {}), after: () => refreshHearth() }, $('raidRoot'));
  };
  const openHearth = async () => {
    go('hearth');
    const h = await hearthMod();
    h.resumeHearth();
    await h.openHearth($('hearthRoot'));
  };
  const modes = { home: () => go('home'), pick: () => go('pick'), gauntlet: openArena, raid: openRaid, hearth: openHearth };
  mainView = 'home';
  loadTally();
  import('./hall.js').then((m) => { m.mountHall($('hall'), { API, me: () => (nameOk() ? heroName() : ''), colors: C.CLASS_COLOR }); onName(() => m.refreshHall()); }).catch(() => {});
  refreshHearth();
  $('hearthBar').onclick = (e) => { if (e.target.closest('[data-hearth]')) openHearth(); };
  $('sShow').onclick = () => flipCode('sCode', 'sShow');
  $('sCopy').onclick = () => { note('draftCodeSaved'); copyLink($('sCopy'), prettyKey(playerKey), 'Copy'); };
  $('sUse').onclick = () => { $('sUse').hidden = true; $('sForm').hidden = false; $('sMsg').textContent = ''; $('sIn').focus(); };
  $('sLoad').onclick = () => useCode('sIn', 'sMsg');
  $('sIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') useCode('sIn', 'sMsg'); });
  $('sShare').onclick = () => copyLink($('sShare'), `${pageUrl()}#runs=${shareId}`, 'Copy share link');
  $('modeDraft').onclick = modes.pick;
  $('modeArena').onclick = modes.gauntlet;
  $('modeRaid').onclick = modes.raid;
  for (const b of document.querySelectorAll('[data-mode]')) b.onclick = modes[b.dataset.mode];
  if (location.search.includes('gauntlet')) openArena();
  if (location.search.includes('raid')) openRaid();
  $('noteLink').onclick = (e) => {
    e.preventDefault();
    $('notes').open = true;
    $('notes').scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
  };
  $('mull').onclick = mulligan;
  $('sheetClose').onclick = closeSheet;
  $('sheet').onclick = (e) => { if (e.target === $('sheet')) closeSheet(); };
  $('again').onclick = restart;
  $('nameGo').onclick = saveName;
  onName(() => { showName(); drawPick(); if (hearthLib) hearthLib.hearthBar($('hearthBar')); });
  for (const b of $('hSort').children) b.onclick = () => { histSort = b.dataset.o; drawHistory(); };
  $('hShare').onclick = () => copyLink($('hShare'), `${pageUrl()}#runs=${shareId}`, 'Share my runs');
  $('rpPrev').onclick = () => replayMove(-1);
  $('rpNext').onclick = () => replayMove(1);
  $('rpBack').onclick = leaveReplay;
  $('shHome').onclick = () => { cameFrom = null; restart(); };
  $('shBack').onclick = () => window.history.back();
  document.addEventListener('click', (e) => {
    const link = e.target.closest && e.target.closest('a.rw[data-run]');
    if (!link || e.button || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (cameFrom) return;
    let box = link.parentElement;
    while (box && box !== document.body && !(box.scrollHeight > box.clientHeight && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
    cameFrom = { view: document.body.dataset.view, y: scrollY, picks: openPicks, box, top: box ? box.scrollTop : 0 };
  }, true);
  addEventListener('hashchange', route);
  document.addEventListener('keydown', (e) => {
    if (!replayRun || document.body.dataset.view !== 'replay') return;
    if (e.key === 'ArrowRight') replayMove(1);
    if (e.key === 'ArrowLeft') replayMove(-1);
  });
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  route();
}

boot();
import('../pvp/chat.js').then((m) => m.mountChat()).catch(() => {});
