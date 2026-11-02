import { MILESTONES, RAIDS, tierOf } from './bosses.js';
import { BONUS, makeParty, partyBonuses } from './roles.js';
import { bossHealth, enrageTime, explain, fight } from './engine.js';
import { boonById } from './boons.js';
import { RaidScene } from './scene.js';
import { resultHtml } from '../pvp/arena.js';
import { CLASS_COLOR } from '../draft/core.js';
import { bindName, heroName, nameField, nameOk } from '../pvp/name.js';
import { CLASS_NAME, DRAFT_PICKS, ROLES, ROLE_NAME, addHero, classesFor, currentBoss, boonOffer, draftOffers, effectiveTwist, fightSeed, killed, modsFor, newRun, partyStats, passDraft, reroll, resolveFight, skipSpoils, specsFor, spoilOffers, starterPicks, take, targetsOf, takeBoon, twistFor, worth } from './run.js';

const KEY = 'raidRun', WHO = 'gauntletWho';
const API = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'http://localhost:8789' : 'https://azeroth-draft.sanredz.workers.dev';
const SLOT_NAME = { head: 'Head', neck: 'Neck', shoulder: 'Shoulders', back: 'Back', chest: 'Chest', wrist: 'Wrists', hands: 'Hands', waist: 'Waist', legs: 'Legs', feet: 'Feet', finger1: 'Ring', finger2: 'Ring', trinket1: 'Trinket', trinket2: 'Trinket', main: 'Main Hand', off: 'Off Hand', ranged: 'Ranged' };
const STAT = { sta: 'Stamina', str: 'Strength', agi: 'Agility', int: 'Intellect', spi: 'Spirit', armor: 'Armor', def: 'Defense', dodge: 'Dodge', parry: 'Parry', block: 'Block', blockValue: 'Block value', heal: 'Healing', sp: 'Spell power', mp5: 'Mana per 5', ap: 'Attack power', rap: 'Ranged AP', fap: 'Feral AP', sfire: 'Fire power', sfrost: 'Frost power', sshadow: 'Shadow power', sarcane: 'Arcane power', snature: 'Nature power', sholy: 'Holy power', rholy: 'Holy res', crit: 'Crit', hit: 'Hit', scrit: 'Spell crit', shit: 'Spell hit', rfire: 'Fire res', rshadow: 'Shadow res', rarcane: 'Arcane res', rfrost: 'Frost res', rnature: 'Nature res' };
const SKILL = { 0: 'Axe', 1: 'Axe', 2: 'Bow', 3: 'Gun', 4: 'Mace', 5: 'Mace', 7: 'Sword', 8: 'Sword', 15: 'Dagger', 18: 'Crossbow' };
const WEAPON = { 0: 'Axe', 1: 'Axe', 2: 'Bow', 3: 'Gun', 4: 'Mace', 5: 'Mace', 6: 'Polearm', 7: 'Sword', 8: 'Sword', 10: 'Staff', 13: 'Fist Weapon', 15: 'Dagger', 16: 'Thrown', 18: 'Crossbow', 19: 'Wand' };
const ARMOR = { 1: 'Cloth', 2: 'Leather', 3: 'Mail', 4: 'Plate', 6: 'Shield', 7: 'Libram', 8: 'Idol', 9: 'Totem' };
const CASTER_BUILD = /^(moon|ele|shadow|shadowd|shock|fire|frost|arcane|afflic|demo|destro)$/;
const PERCENT = new Set(['dodge', 'parry', 'block', 'crit', 'hit', 'scrit', 'shit']);
const ROLE_STATS = { tank: ['def', 'dodge', 'parry', 'block', 'sta', 'armor', 'blockValue', 'str', 'agi'], heal: ['heal', 'mp5', 'int', 'spi', 'scrit', 'sta'], dps: ['ap', 'sp', 'str', 'agi', 'int', 'crit', 'scrit', 'hit', 'shit', 'sta'] };
const VERDICT = [[0, 'Deadly', 'bad'], [.4, 'Close', 'mid'], [.8, 'Comfortable', 'good']];

let dressing = Promise.resolve();
let root, scene, pool, gear, run, PANE, QUALITY, tooltip, viewing = 0, chosenCls = '', chosenSpec = '', board = [], boardRaid = 'mc', busy = false, offers = null, shownPick = '', shownRole = -1;
const cache = {};
let aims = {};
const dress = (step) => { dressing = dressing.then(step).catch(() => {}); return dressing; };

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const save = () => { try { if (run && !run.over) localStorage.setItem(KEY, JSON.stringify(run)); else localStorage.removeItem(KEY); } catch {} };
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const who = () => { try { return localStorage.getItem(WHO) || 'anon'; } catch { return 'anon'; } };
const iconOf = (id) => `assets/icons/${pool.items[id][4]}.png`;
const num = (v) => Math.round(v).toLocaleString('en-US');

function team() {
  const key = JSON.stringify([run.boons, run.heroes.map((h) => [h.cls, h.build, h.picks])]);
  if (cache.key !== key) { cache.key = key; cache.heroes = makeParty(pool, run.heroes, 12, partyStats(run)); }
  return cache.heroes;
}
const built = (i) => team()[i];

function heroLine(i) {
  const h = built(i);
  if (h.role === 'tank') return `<span>Health <b>${num(h.hp)}</b></span><span>Armor <b>${num(h.armor)}</b></span><span>Crit taken <b>${h.critTaken.toFixed(0)}%</b></span><span class="${h.miss + h.dodge + h.parry + h.block >= 102.4 ? 'cap' : 'warn'}">${h.miss + h.dodge + h.parry + h.block >= 102.4 ? 'Uncrushable' : `Crushable (${(h.miss + h.dodge + h.parry + h.block).toFixed(0)}/102)`}</span>`;
  if (h.role === 'heal') return `<span>Health <b>${num(h.hp)}</b></span><span>Mana <b>${num(h.mana)}</b></span><span>Healing <b>${num(h.heal)}</b></span>`;
  return `<span>Health <b>${num(h.hp)}</b></span><span>DPS <b>${num(h.dps)}</b></span>`;
}

function partyHtml() {
  return ROLES.map((role, i) => {
    const h = run.heroes[i], now = (run.step === 'draft' || run.step === 'party') && run.at === i;
    const pips = h ? `<div class="rpips">${Array.from({ length: DRAFT_PICKS }, (_, p) => `<i class="${p < DRAFT_PICKS - h.left ? 'on' : ''}"></i>`).join('')}</div>` : '';
    return `<button class="rhero role-${role} ${now ? 'now' : ''} ${h ? 'set' : ''} ${(h || now) && viewing === i ? 'view' : ''}" ${h || now ? `data-view="${i}"` : 'disabled'}>${h ? `<img src="assets/classes/${h.cls}.png" alt="">` : '<em></em>'}<div><small>${ROLE_NAME[role]}</small><b>${h ? CLASS_NAME[h.cls] : 'Empty'}</b>${h ? `<div class="rline">${heroLine(i)}</div>` : ''}${h && now ? pips : ''}</div></button>`;
  }).join('');
}

function routeHtml() {
  const bosses = RAIDS[run.raid].bosses;
  return `<div class="rroute"><h3>The raid <em>each boss shows its twist when you reach it</em></h3><div class="rpath">${bosses.map((b, n) => `<span class="${n === bosses.length - 1 ? 'last' : ''}" style="--i:${n}"><i>${b.step + 1}</i><small>${esc(b.name.split(' ')[0])}</small></span>`).join('')}</div></div>`;
}

function bonusHtml() {
  const list = partyBonuses(run.heroes);
  return list.length ? `<div class="rbonus">${list.map((b) => `<span title="${esc(b.text)}"><b>${esc(b.n)}</b> ${esc(b.text)}</span>`).join('')}</div>` : '';
}

function boonsHtml() {
  return run.boons.length ? `<div class="rbonus rboons">${run.boons.map((id) => `<span title="${esc(boonById(id).text)}"><b>${esc(boonById(id).name)}</b></span>`).join('')}</div>` : '';
}

function ladderHtml() {
  const bosses = RAIDS[run.raid].bosses;
  return `<div class="rladder">${bosses.map((b, i) => `<i class="${i < run.boss ? 'won' : i === run.boss && run.step !== 'party' && run.step !== 'draft' ? 'now' : ''} ${b.endless ? 'last' : ''}" title="${esc(b.name)}">${i + 1}</i>`).join('')}</div>`;
}

const label = (k) => (/^sk\d+$/.test(k) ? `${SKILL[k.slice(2)] || 'Weapon'} skill` : STAT[k]);
const plainEquip = /^Equip: (\+\d+ (ranged )?Attack Power\.|Increases damage and healing|Improves your chance to (get a critical strike|hit)|Restores \d+ mana per|Increases healing done|Increased Defense|Increases your chance to (dodge|parry|block)|Increases the block value|Increases damage done by \w+ spells|Increased \w+ \+\d+)/;
const PASSIVES = [[/^Equip: Restores (\d+) health per 5 sec/, 'Health per 5'], [/^Equip: \+(\d+) Attack Power when fighting (\w+)/, 'AP vs $2'], [/^Equip: \+(\d+) Attack Power in Cat, Bear/, 'Feral AP'], [/^Equip: \+(\d+) All Resistances/, 'All resistances'], [/^Equip: Decreases the magical resistances of your spell targets by (\d+)/, 'Spell penetration'], [/^Equip: Gives you a (\d+)% chance to avoid interruption/, 'Interrupt avoidance', '%']];
const passivesOf = (id) => {
  const out = {};
  for (const line of pool.items[id][12]) {
    for (const [rule, name, tail = ''] of PASSIVES) {
      const hit = rule.exec(line);
      if (hit) { const key = name.replace('$2', hit[2]); out[key] = { n: (out[key]?.n || 0) + +hit[1], tail }; }
    }
  }
  return out;
};
const effectsOf = (id) => pool.items[id][12].filter((l) => !plainEquip.test(l) && !PASSIVES.some(([rule]) => rule.test(l)));
const signed = (d, tail = '') => `${d > 0 ? '+' : ''}${Math.abs(d) >= 20 ? Math.round(d) : Math.round(d * 10) / 10}${tail}`;
const keyOf = (o) => `${o.hero}|${o.slot}|${o.id}`;

function slotsFor(o) {
  return targetsOf(pool, run.heroes[o.hero], o.slot, o.id);
}

function aimOf(o) {
  const hero = run.heroes[o.hero], list = slotsFor(o), saved = aims[keyOf(o)];
  if (list.includes(saved)) return saved;
  return list.reduce((a, b) => (worth(pool, hero, hero.picks[b]) < worth(pool, hero, hero.picks[a]) ? b : a));
}

function replaced(hero, to, id) {
  const out = [hero.picks[to]];
  if (to === 'main' && pool.items[id][3] === 17) out.push(hero.picks.off);
  return out.filter(Boolean);
}

function wearing(hero, to, id) {
  const picks = { ...hero.picks, [to]: id };
  if (to === 'main' && pool.items[id][3] === 17) delete picks.off;
  return picks;
}

function statList(hero, to, o) {
  const gone = replaced(hero, to, o.id), it = pool.items[o.id], rows = [], total = {};
  for (const id of gone) for (const [k, v] of Object.entries(pool.items[id][7])) total[k] = (total[k] || 0) + v;
  const wep = (id) => { const w = id && pool.items[id][8]; return w && w.delay ? { dps: (w.min + w.max) / 2 / (w.delay / 1000), speed: w.delay / 1000 } : null; };
  const next = wep(o.id), past = wep(hero.picks[to]), counts = hero.role === 'tank' || (hero.role === 'dps' && !CASTER_BUILD.test(hero.build));
  if (next) {
    const d = next.dps - (past ? past.dps : 0);
    rows.push(['Weapon DPS', past ? signed(d) : next.dps.toFixed(1), counts ? (d > 0 ? 'up' : d < 0 ? 'down' : '') : '']);
    rows.push(['Speed', past && past.speed !== next.speed ? `${past.speed.toFixed(2)} → ${next.speed.toFixed(2)}` : next.speed.toFixed(2), '']);
  }
  const keys = [...new Set([...ROLE_STATS[hero.role], ...Object.keys(it[7]), ...Object.keys(total)])];
  for (const k of keys) {
    const d = (it[7][k] || 0) - (total[k] || 0);
    if (d && label(k)) rows.push([label(k), signed(d, PERCENT.has(k) ? '%' : ''), d > 0 ? 'up' : 'down']);
  }
  const was = {};
  for (const id of gone) for (const [k, v] of Object.entries(passivesOf(id))) was[k] = { n: (was[k]?.n || 0) + v.n, tail: v.tail };
  const now = passivesOf(o.id);
  for (const k of new Set([...Object.keys(now), ...Object.keys(was)])) {
    const d = (now[k]?.n || 0) - (was[k]?.n || 0);
    if (d) rows.push([k, signed(d, (now[k] || was[k]).tail), d > 0 ? 'up' : 'down']);
  }
  return rows;
}

function statRows(hero, to, o) {
  const rows = statList(hero, to, o);
  return rows.length ? `<div class="rrows">${rows.map(([n, v, c]) => `<span><i>${n}</i><b class="${c}">${v}</b></span>`).join('')}</div>` : '';
}

function gainsHtml(hero, to, o) {
  return `<div class="rgain">${statList(hero, to, o).map(([n, v, c]) => `<span class="${c}">${n === 'Speed' ? `${n} ${v}` : `${v} ${n}`}</span>`).join('')}</div>`;
}

function noteHtml(hero, to, o) {
  const { diffs, added } = effectChanges(hero, to, o), plain = (l) => esc(l.replace(/^Equip: /, '')), after = wearing(hero, to, o.id), count = (picks, sid) => Object.values(picks).filter((id) => id && pool.items[id][9] === sid).length, tags = [];
  for (const sid of new Set([...replaced(hero, to, o.id), o.id].map((id) => pool.items[id][9]).filter(Boolean))) {
    const set = pool.sets[sid];
    for (const [need, , text] of (set ? set.b : [])) {
      if (text && count(hero.picks, sid) >= need && count(after, sid) < need) tags.push(`<span class="down">Breaks ${esc(set.n)} (${need})</span>`);
      if (text && count(hero.picks, sid) < need && count(after, sid) >= need) tags.push(`<span class="up">Completes ${esc(set.n)} (${need})</span>`);
    }
  }
  const line = diffs.length ? diffs.map((d) => `<p class="reffect ${d.up ? '' : 'worse'}">${plain(d.text)}</p>`).join('') : added.length ? `<p class="reffect ${hero.role === 'dps' ? '' : 'quiet'}">${plain(added[0])}</p>` : '';
  return line + (tags.length ? `<div class="rtags">${tags.join('')}</div>` : '');
}

function setRows(hero, to, o) {
  const after = wearing(hero, to, o.id), count = (picks, sid) => Object.values(picks).filter((id) => id && pool.items[id][9] === sid).length;
  const ids = new Set([...replaced(hero, to, o.id), o.id].map((id) => pool.items[id][9]).filter(Boolean)), out = [];
  for (const sid of ids) {
    const set = pool.sets[sid], was = count(hero.picks, sid), now = count(after, sid);
    if (!set) continue;
    for (const [need, , text] of set.b) {
      if (text && was < need && now >= need) out.push(`<li class="up">${esc(set.n)} (${need}): ${esc(text)}</li>`);
      if (text && was >= need && now < need) out.push(`<li class="down">Loses ${esc(set.n)} (${need}): ${esc(text)}</li>`);
    }
    if (pool.items[o.id][9] === sid) out.push(`<li class="gold">${esc(set.n)} ${now}/${set.i.length}</li>`);
  }
  return out;
}

function effectChanges(hero, to, o) {
  const shape = (l) => l.replace(/\d+(\.\d+)?/g, '#'), numbers = (l) => (l.match(/\d+(\.\d+)?/g) || []).map(Number), lost = replaced(hero, to, o.id).flatMap(effectsOf), diffs = [], added = [];
  for (const line of effectsOf(o.id)) {
    const at = lost.findIndex((l) => shape(l) === shape(line));
    if (at < 0) { added.push(line); continue; }
    const [old] = lost.splice(at, 1), was = numbers(old), now = numbers(line), moved = now.map((n, i) => n - was[i]);
    if (old === line) continue;
    if (moved.filter(Boolean).length !== 1) { added.push(line); lost.push(old); continue; }
    let n = -1;
    const d = moved.find(Boolean);
    diffs.push({ text: line.replace(/\d+(\.\d+)?/g, (v) => (moved[++n] ? signed(moved[n]) : v)), up: d > 0 });
  }
  return { diffs, added, lost };
}

function effectRows(hero, to, o) {
  const { diffs, added, lost } = effectChanges(hero, to, o), plain = (l) => esc(l.replace(/^Equip: /, ''));
  const out = [...diffs.map((d) => `<li class="${d.up ? 'up' : 'down'}">${plain(d.text)}</li>`), ...added.map((l) => `<li class="up">${plain(l)}</li>`), ...lost.map((l) => `<li class="down">Loses: ${plain(l)}</li>`), ...setRows(hero, to, o)];
  const note = diffs.length + added.length && hero.role !== 'dps' ? `<small class="rnote">Effects are not counted for ${hero.role === 'tank' ? 'tanks' : 'healers'}</small>` : '';
  return out.length ? `<ul class="reffects">${out.join('')}</ul>${note}` : '';
}

function offerHtml(o, withHero) {
  const hero = run.heroes[o.hero], it = pool.items[o.id], to = aimOf(o), list = slotsFor(o), key = keyOf(o), worn = list.map((s) => hero.picks[s]).filter(Boolean);
  const kind = it[5] === 2 ? WEAPON[it[6]] : ARMOR[it[6]], meta = [SLOT_NAME[o.slot], kind].filter(Boolean).join(' · ');
  const name = (s) => { const id = hero.picks[s]; return id ? pool.items[id] : null; };
  const aim = list.length > 1 ? `<div class="raims">${list.map((s) => { const w = name(s); return `<button class="${s === to ? 'on' : ''}" data-aim="${key}|${s}"><small>${SLOT_NAME[s]}${/\d$/.test(s) ? ` ${s.slice(-1)}` : ''}</small><b style="color:${w ? QUALITY[w[1]] : 'inherit'}">${w ? esc(w[0]) : 'Empty'}</b></button>`; }).join('')}</div>` : `<p class="rold">${name(to) ? `Replaces <em style="color:${QUALITY[name(to)[1]]}">${esc(name(to)[0])}</em>` : 'Empty slot'}</p>`;
  const owner = withHero ? `<div class="rforhero"><img src="assets/classes/${hero.cls}.png" alt=""><b>${CLASS_NAME[hero.cls]}</b><span>${ROLE_NAME[hero.role]}</span></div>` : '';
  return `<div class="roffer ${withHero ? `rfor role-${hero.role}` : ''}">${owner}<button class="rlook" data-look="${key}"><span class="rico" data-item="${o.id}" data-vs="${worn.join(',')}"><img src="${iconOf(o.id)}" alt=""></span><span class="rtxt"><b style="color:${QUALITY[it[1]]}">${esc(it[0])}</b><small>${meta}</small></span></button>${gainsHtml(hero, to, o)}${noteHtml(hero, to, o)}<div class="rfoot">${aim}<button class="gmini rtake" data-take="${key}|${to}">Take</button></div></div>`;
}

function previewPicks() {
  const role = ROLES[run.at], cls = chosenCls || classesFor(role)[0];
  return starterPicks(pool, role, cls, chosenSpec || specsFor(role, cls)[0].id);
}

function dollHtml() {
  const hero = run && (run.heroes[viewing] || (run.step === 'party' ? { picks: previewPicks() } : null));
  if (!hero) return '';
  const art = (s) => (s.startsWith('finger') ? 'finger' : s.startsWith('trinket') ? 'trinket' : s);
  return PANE.map(([s, left, top]) => {
    const id = hero.picks[s], dead = s === 'shirt' || s === 'tabard';
    return `<button class="ps${id ? ' on' : ''}${dead ? ' dead' : ''}" data-item="${id || ''}" style="left:calc(var(--u)*${left});top:calc(var(--u)*${top});background-image:url(assets/draft/ui/${art(s)}.png)${id ? `;--q:${QUALITY[pool.items[id][1]]}` : ''}" tabindex="-1">${id ? `<img src="${iconOf(id)}" alt="">` : ''}</button>`;
  }).join('');
}

function compare(o) {
  const hero = run.heroes[o.hero], worn = slotsFor(o).filter((s) => hero.picks[s]), box = document.createElement('div');
  box.className = 'gmodal';
  box.innerHTML = `<div class="gmodalbox rcompare"><h2>${CLASS_NAME[hero.cls]}: ${SLOT_NAME[o.slot]}</h2><div class="rfull">${statRows(hero, aimOf(o), o)}${effectRows(hero, aimOf(o), o)}</div><div class="rsides ${worn.length > 1 ? 'three' : ''}"><div><h4>New</h4><div class="gtt">${tooltip(o.id, hero.picks)}</div></div>${worn.length ? worn.map((s) => `<div><h4>${worn.length > 1 ? SLOT_NAME[s] : 'Wearing'}</h4><div class="gtt">${tooltip(hero.picks[s], hero.picks)}</div></div>`).join('') : '<div><h4>Wearing</h4><p>Nothing in this slot.</p></div>'}</div><div class="rbuttons"><button class="gbtn" data-yes="1">Take this</button><button class="gmini" data-no="1">Back</button></div></div>`;
  document.body.append(box);
  box.querySelector('[data-no]').onclick = () => box.remove();
  box.onclick = (e) => { if (e.target === box) box.remove(); };
  box.querySelector('[data-yes]').onclick = () => { box.remove(); chooseItem({ ...o, to: aimOf(o) }); };
}

const SOON = [['zg', "Zul'Gurub"], ['aq20', "Ruins of Ahn'Qiraj"]];

function introHtml() {
  const saved = load();
  const open = `<button class="rraid live" data-act="begin"><i class="rraidart" style="background-image:url(assets/draft/arena/raid-mc.jpg)"></i><span class="rraidsay"><b class="rraidname">${RAIDS.mc.name}</b><span class="rraidtext">${RAIDS.mc.blurb}</span><span class="rraidgo">Begin the raid</span></span></button>`;
  const soon = SOON.map(([id, name]) => `<div class="rraid soon" aria-disabled="true"><i class="rraidart" style="background-image:url(assets/draft/arena/raid-${id}.jpg)"></i><div class="rraidsay"><h3>${name}</h3><p>Coming soon</p></div></div>`).join('');
  return `<div class="rraids">${open}${soon}</div>${saved ? '<button class="gresume" data-act="resume">Continue your run</button>' : ''}<ul class="rrules"><li>Draft a tank, a healer and a damage dealer</li><li>Each hero starts in their class Dungeon Set and gets ${DRAFT_PICKS} picks</li><li>Every boss killed drops a choice of new gear</li><li>One wipe ends the run</li></ul>`;
}

const artOf = (role, cls) => `assets/game/art-${{ WARRIOR: 'warriorarms', PALADIN: 'priestholy', HUNTER: 'hunterbeastmastery', ROGUE: 'roguecombat', PRIEST: role === 'heal' ? 'priestholy' : 'priestshadow', SHAMAN: 'shamanrestoration', MAGE: 'magefire', WARLOCK: 'magearcane', DRUID: role === 'heal' ? 'druidrestoration' : 'druidferalcombat' }[cls]}.jpg`;

function classHtml() {
  const role = ROLES[run.at], classes = classesFor(role);
  if (!classes.includes(chosenCls)) chosenCls = classes[0];
  const specs = specsFor(role, chosenCls);
  if (!specs.some((s) => s.id === chosenSpec)) chosenSpec = specs[0].id;
  const spec = specs.find((s) => s.id === chosenSpec), key = `${chosenCls}|${chosenSpec}`;
  const fresh = key !== shownPick, enter = run.at !== shownRole, bonus = BONUS[role][chosenCls];
  shownPick = key;
  shownRole = run.at;
  const banners = classes.map((c, i) => `<button class="rbanner ${c === chosenCls ? 'on' : ''} ${c === chosenCls && fresh ? 'fresh' : ''}" data-cls="${c}" style="--cc:${CLASS_COLOR[c]};--i:${i}"><span class="rbannerface"><i class="rbannerart" style="background-image:url(${artOf(role, c)})"></i><img src="assets/classes/${c}.png" alt=""><b>${CLASS_NAME[c]}</b></span></button>`).join('');
  const tabs = specs.length > 1 ? `<div class="rpickspecs">${specs.map((s) => `<button class="${s.id === chosenSpec ? 'on' : ''}" data-spec="${s.id}">${esc(s.name)}</button>`).join('')}</div>` : `<small class="rpickspec">${esc(spec.name)}</small>`;
  return `<div class="rpicker ${enter ? 'enter' : ''}" style="--cc:${CLASS_COLOR[chosenCls]}"><i class="rpickart" style="background-image:url(${artOf(role, chosenCls)})"></i><div class="rembers">${'<i></i>'.repeat(12)}</div><div class="rpickhead"><small>Hero ${run.at + 1} of ${ROLES.length}</small><h3>Choose your ${role === 'dps' ? 'damage dealer' : ROLE_NAME[role].toLowerCase()}</h3>${run.at ? '' : nameField()}</div><div class="rbanners ${classes.length > 3 ? 'many' : ''}">${banners}</div><div class="rpickinfo ${fresh ? 'fresh' : ''}"><h4>${CLASS_NAME[chosenCls]}</h4>${tabs}<p class="rblurb">${esc(spec.blurb)}</p>${chosenSpec === 'fire' ? '<p class="rwarn">Molten Core is a fire raid. Baron Geddon and Ragnaros are immune, and others resist fire.</p>' : ''}<div class="rseal"><i></i><div><small>Party bonus</small><b>${esc(bonus.n)}</b><span>${esc(bonus.text)}</span></div></div></div><button class="rforge" data-act="hero" ${run.at ? '' : `data-named ${nameOk() ? '' : 'disabled'}`}><span>Draft your ${CLASS_NAME[chosenCls]}</span></button></div>${routeHtml()}`;
}

function draftHtml() {
  const hero = run.heroes[run.at];
  offers = offers || draftOffers(pool, run);
  return `<div class="gpanel"><h3>${CLASS_NAME[hero.cls]} <em>pick ${DRAFT_PICKS - hero.left + 1} of ${DRAFT_PICKS}</em></h3><div class="roffers">${offers.map((o) => offerHtml(o, false)).join('') || '<p>Nothing better turned up.</p>'}</div>${offers.length ? '' : '<button class="gbtn" data-act="pass">Continue</button>'}</div>${routeHtml()}`;
}

function forecast(boss) {
  const heroes = team(), mods = modsFor(run), runs = [1, 2, 3, 4, 5].map((s) => fight(heroes, boss, run.seed + s * 977, twistFor(run, boss), mods)), heroic = [1, 2, 3].map((s) => fight(heroes, boss, run.seed + s * 977, effectiveTwist(run, boss, true), mods));
  const pick = (f) => runs.reduce((a, r) => a + f(r), 0) / runs.length, wins = runs.filter((r) => r.won).length / runs.length;
  return {
    wins, heroic: heroic.filter((r) => r.won).length / heroic.length, kill: pick((r) => r.time), tank: pick((r) => r.totals[0].took / r.time), biggest: Math.max(...runs.map((r) => r.totals[0].maxHit)), heal: pick((r) => r.totals[1].healed / r.time),
    oom: runs.filter((r) => r.totals[1].oomAt).length, dps: pick((r) => (r.totals[0].dealt + r.totals[2].dealt) / r.time),
  };
}

function bossHtml() {
  const boss = currentBoss(run), f = forecast(boss), [, word, tone] = [...VERDICT].reverse().find(([at]) => f.wins >= at);
  const twist = twistFor(run, boss), size = boss.endless ? 'Cannot be killed' : `${num(bossHealth(boss, twist))} health, enrages at ${Math.round(enrageTime(boss, twist))}s`;
  return `<div class="gpanel rboss-card"><div class="rtitle"><div><small>Boss ${run.boss + 1} of ${RAIDS[run.raid].bosses.length}</small><h3>${esc(boss.name)}</h3></div>${boss.endless ? '<span class="rverdict bad">Final Stand</span>' : `<span class="rverdict ${tone}">${word}</span>`}</div><p>${esc(boss.tip)}</p>${twist ? `<div class="rtwist ${twist.tone}"><b>${esc(twist.name)}</b><span>${esc(twist.text)}</span></div>` : ''}
    <div class="rtests ${boss.endless ? '' : ''}"><div><b>Survive</b><span>Tank takes ${num(f.tank)} a second, biggest hit ${num(f.biggest)}</span></div><div><b>Heal</b><span>Healer restores ${num(f.heal)} a second${f.oom ? ', runs out of mana' : ''}</span></div><div><b>Burn</b><span>${boss.endless ? `${num(f.dps)} DPS, every point scores` : `${num(f.dps)} DPS against ${size}`}</span></div></div>
    <div class="rpulls ${boss.endless ? 'one' : ''}"><button class="gbtn big" data-act="pull">${boss.endless ? 'Begin the Final Stand' : 'Pull'}</button>${boss.endless ? '' : `<button class="gbtn big heroic" data-act="heroic"><b>Heroic</b><small>22% harder hits, 15% more health. Pick 2 spoils, with better item levels.</small></button>`}</div></div>`;
}

function spoilsHtml() {
  offers = offers || spoilOffers(pool, run);
  const boon = boonOffer(pool, run), b = boon && boonById(boon);
  return `<div class="gpanel"><div class="rtitle"><div><h3>Spoils <em>${run.spoilsLeft > 1 ? `choose ${run.spoilsLeft} of these` : 'choose 1'}</em></h3></div><button class="gmini" data-act="reroll" ${run.rerolls ? '' : 'disabled'}>Reroll (${run.rerolls} left)</button></div> <div class="roffers four">${b ? `<div class="roffer rboon"><div class="rlook"><span class="rtxt"><small>Boon for this run</small><b>${esc(b.name)}</b><span class="rboontext">${esc(b.text)}</span></span></div><button class="gmini rtake" data-boon="${b.id}">Take</button></div>` : ''}${offers.map((o) => offerHtml(o, true)).join('')}</div><button class="gskip" data-act="pass">${run.spoilsLeft > 1 ? 'Take nothing' : 'Done'}</button></div>`;
}

function overHtml() {
  const k = killed(run), bosses = RAIDS[run.raid].bosses, finale = bosses[run.boss].endless, last = run.results[run.results.length - 1], tier = tierOf(run.score);
  const trail = bosses.map((b, i) => { const r = run.results[i]; return `<i class="${r ? (b.endless ? 'final' : r.won ? 'won' : 'lost') : ''} ${r && r.heroic ? 'heroic' : ''}" title="${esc(b.name)}${r ? ` ${Math.round(r.time)}s` : ''}">${i + 1}</i>`; }).join('');
  const heroics = run.results.filter((r) => r.heroic && r.won).length;
  const rank = run.rank ? `<div class="rrank"><b>#${num(run.rank.place)}</b><span>of ${num(run.rank.total)} ${run.rank.total === 1 ? 'run' : 'runs'} on the leaderboard</span></div>` : '';
  return `<div class="gpanel rsummary ${finale ? 'finale' : ''}"><small>${esc(RAIDS[run.raid].name)}</small>${finale ? `<h2>${tier >= 0 ? esc(MILESTONES[tier][1]) : 'Final Stand'}</h2><div class="rbig">${num(run.score)}</div><p class="rlabel">damage to Ragnaros</p>${rank}` : `<h2>Fell to ${esc(bosses[run.boss].name)}</h2><p class="rlabel">Reach Ragnaros to earn a place on the leaderboard.</p>`}
    <div class="rtrail">${trail}</div>
    <p>${k} of ${bosses.length - 1} bosses killed${heroics ? `, ${heroics} on Heroic` : ''}. ${esc(last.why || '')}</p>
    <div class="rsumparty">${run.heroes.map((h) => `<div class="rsumhero"><img src="assets/classes/${h.cls}.png" alt=""><span><small>${ROLE_NAME[h.role]}</small><b>${CLASS_NAME[h.cls]}</b></span></div>`).join('')}</div>
    ${run.boons.length ? `<div class="rbonus rboons">${run.boons.map((id) => `<span><b>${esc(boonById(id).name)}</b></span>`).join('')}</div>` : ''}
    <button class="gbtn big" data-act="again">New raid</button></div>`;
}

function boardHtml() {
  const last = RAIDS[boardRaid].bosses.at(-1).name.split(' ')[0];
  const head = `<div class="rboardhead"><h3>Leaderboard <em>highest damage to ${esc(last)}</em></h3><div class="rboardtabs">${[['mc', RAIDS.mc.name], ...SOON].map(([id, name]) => `<button class="gmini ${id === boardRaid ? 'on' : ''}" data-board="${id}"${RAIDS[id] ? '' : ' disabled'}>${name}</button>`).join('')}</div></div>`;
  if (!board) return `${head}<p>The board could not be reached.</p>`;
  if (!board.length) return `${head}<p>Nobody has reached ${esc(last)} yet.</p>`;
  return head + board.map((r, i) => `<div class="rrow ${r.mine ? 'mine' : ''}"><span>${i + 1}</span><b>${esc(r.name)}</b><span class="rclassrow">${r.party.map((c) => `<img src="assets/classes/${c}.png" alt="${c}">`).join('')}</span><em>${num(r.score)}</em></div>`).join('');
}

function render() {
  const side = root.querySelector('.rside');
  const hidden = root.dataset.step === 'intro';
  root.dataset.step = run ? run.step : 'intro';
  document.body.classList.toggle('raidrun', !!run);
  if (hidden && run) scene.stageA.resize();
  root.querySelector('.rtop').innerHTML = run ? `${ladderHtml()}<div class="rparty">${partyHtml()}</div>${bonusHtml()}${boonsHtml()}` : '';
  if (!run) side.innerHTML = introHtml();
  else if (run.step === 'party') side.innerHTML = classHtml();
  else if (run.step === 'draft') side.innerHTML = draftHtml();
  else if (run.step === 'boss') side.innerHTML = bossHtml();
  else if (run.step === 'spoils') side.innerHTML = spoilsHtml();
  else if (run.step === 'over') side.innerHTML = overHtml();
  else side.innerHTML = '';
  const shown = run && run.heroes[viewing];
  root.querySelector('.portrait').src = `assets/classes/${shown ? shown.cls : run && run.step === 'party' ? chosenCls || 'WARRIOR' : 'WARRIOR'}.png`;
  root.querySelector('.peekwho').textContent = shown ? CLASS_NAME[shown.cls] : run && run.step === 'party' ? CLASS_NAME[chosenCls] : 'Your party';
  root.querySelector('.rstage .sub').textContent = shown ? ROLE_NAME[shown.role] : run && run.step === 'party' ? ROLE_NAME[ROLES[run.at]] : 'Molten Core';
  root.querySelector('.rstage').className = `rstage ${shown ? `role-${shown.role}` : run && run.step === 'party' ? `role-${ROLES[run.at]}` : ''}`;
  root.querySelector('.peekdoll').innerHTML = run && run.step === 'fight' ? '' : dollHtml();
  root.querySelector('.rctl').innerHTML = run && run.step === 'fight' ? `${[1, 2, 4].map((n) => `<button class="gmini sp ${scene.speed === n ? 'on' : ''}" data-speed="${n}">${n}x</button>`).join('')}<button class="gmini" data-act="skip">Skip</button>` : '';
  root.querySelector('.rboardlist').innerHTML = boardHtml();
  bindName(root);
  for (const el of root.querySelectorAll('[data-act]')) el.onclick = () => action(el.dataset.act);
  for (const el of root.querySelectorAll('[data-cls]')) el.onclick = () => { chosenCls = el.dataset.cls; chosenSpec = ''; viewing = run.at; render(); showHero(); };
  for (const el of root.querySelectorAll('[data-spec]')) el.onclick = () => { chosenSpec = el.dataset.spec; viewing = run.at; render(); showHero(); };
  for (const el of root.querySelectorAll('[data-take]')) el.onclick = () => { const [hero, slot, id, to] = el.dataset.take.split('|'); chooseItem({ hero: +hero, slot, id: +id, to }); };
  for (const el of root.querySelectorAll('[data-aim]')) el.onclick = () => { const [hero, slot, id, to] = el.dataset.aim.split('|'); aims[`${hero}|${slot}|${id}`] = to; render(); };
  for (const el of root.querySelectorAll('[data-boon]')) el.onclick = () => { takeBoon(run, el.dataset.boon); offers = null; save(); render(); showHero(); };
  for (const el of root.querySelectorAll('[data-look]')) el.onclick = (e) => { const [hero, slot, id] = el.dataset.look.split('|'); compare({ hero: +hero, slot, id: +id }); };
  for (const el of root.querySelectorAll('[data-view]')) el.onclick = () => { viewing = +el.dataset.view; render(); showHero(); };
  for (const el of root.querySelectorAll('[data-speed]')) el.onclick = () => { scene.speed = +el.dataset.speed; for (const b of root.querySelectorAll('.sp')) b.classList.toggle('on', b === el); };
}

function showHero() {
  if (!run) return dress(() => scene.hero({ cls: 'WARRIOR', picks: {} }));
  if (run.step === 'party' && !run.heroes[viewing]) { const cls = chosenCls || classesFor(ROLES[run.at])[0]; const role = ROLES[run.at], picks = previewPicks(), build = chosenSpec || specsFor(role, cls)[0].id; return dress(() => scene.hero({ cls, picks, role, build })); }
  const h = run.heroes[viewing];
  if (!h) return null;
  const look = { cls: h.cls, picks: { ...h.picks }, role: h.role, build: h.build };
  return dress(() => scene.hero(look));
}

function chooseItem(choice) {
  const before = run.step, from = run.at, same = viewing === choice.hero;
  take(pool, run, choice);
  offers = null;
  if (run.step === 'draft' || run.step === 'party') viewing = Math.min(run.at, 2);
  save();
  render();
  if (before === 'draft' && run.at === from && same && pool.items[choice.id][3] !== 20) dress(() => scene.wear(choice.to || choice.slot, choice.id));
  else showHero();
}

async function pull(heroic = false) {
  if (busy) return;
  busy = true;
  const boss = currentBoss(run), heroes = team(), result = resolveFight(run, heroes, heroic), why = explain(result), after = run.step;
  run.step = 'fight';
  render();
  root.querySelector('.rscene').scrollIntoView({ block: 'start', behavior: 'smooth' });
  await dress(() => scene.stageRaid(run.heroes.map((h, i) => ({ ...h, ...heroes[i] })), boss));
  run.results[run.results.length - 1].why = why;
  run.step = 'fight';
  const stored = { ...run, step: after };
  try { if (!run.over) localStorage.setItem(KEY, JSON.stringify(stored)); else localStorage.removeItem(KEY); } catch {}
  scene.banner(boss.endless ? '<small>He cannot be killed</small><h2>Final Stand</h2><small>Deal as much damage as you can</small>' : `<small>Boss ${run.results.length}</small><h2>${esc(boss.name)}</h2>`, 'vs');
  await new Promise((done) => { setTimeout(done, 1300); });
  scene.play(result, null, { onEnd: () => finished(result, why, after, boss) });
  busy = false;
}

function finished(result, why, after, boss) {
  const title = result.won ? 'Victory' : boss.endless ? num(result.score) : 'Wipe';
  const dealt = result.totals.reduce((n, h) => n + h.dealt, 0), share = (h) => Math.round(h).toLocaleString('en-US');
  scene.banner(resultHtml({ title, stats: boss.endless ? [['Final Stand', 'Damage to Ragnaros'], [Math.round(result.time), 'Seconds survived']] : [[Math.round(result.time), 'Seconds'], [share(dealt), 'Damage dealt'], result.won ? [run.boss, `of ${RAIDS[run.raid].bosses.length} bosses`] : [`${Math.round(result.health * 100)}%`, 'Boss health left']], note: boss.endless ? '' : esc(why), action: result.won ? 'Claim spoils' : 'See your run' }), `result ${result.won || boss.endless ? 'win' : 'lose'}`);
  root.querySelector('[data-next]').onclick = () => {
    run.step = after;
    offers = null;
    if (run.over) postResult();
    save();
    render();
    showHero();
    root.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
}

async function postResult() {
  if (!run.sig) return;
  const body = { who: who(), name: heroName(), seed: run.seed, sig: run.sig, moves: run.moves };
  try {
    const r = await fetch(`${API}/raid/finish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = r.ok ? await r.json() : null;
    if (d && d.place && run && run.over) { run.rank = { place: d.place, total: d.total }; render(); }
  } catch {}
  loadBoard();
}

async function loadBoard() {
  try {
    const r = await fetch(`${API}/raid/board?raid=${boardRaid}&who=${who()}`);
    board = r.ok ? (await r.json()).rows : null;
  } catch { board = null; }
  if (root) root.querySelector('.rboardlist').innerHTML = boardHtml();
}

async function begin() {
  let seed, sig = '';
  try {
    const r = await fetch(`${API}/raid/start`, { method: 'POST' });
    if (r.ok) ({ seed, sig } = await r.json());
  } catch {}
  run = seed === undefined ? newRun() : newRun('mc', seed);
  run.sig = sig;
  viewing = 0;
  offers = null;
  chosenCls = '';
  save();
  render();
  showHero();
}

function action(a) {
  if (a === 'begin') begin();
  else if (a === 'resume') { run = load(); viewing = Math.min(run.at, 2); offers = null; render(); showHero(); }
  else if (a === 'hero') { addHero(pool, run, chosenCls, chosenSpec); viewing = run.at; offers = null; save(); render(); showHero(); }
  else if (a === 'pass') {
    if (run.step === 'spoils') skipSpoils(run); else passDraft(run);
    offers = null;
    save();
    render();
    showHero();
  } else if (a === 'reroll') { if (reroll(run)) { offers = null; save(); render(); } }
  else if (a === 'pull') pull();
  else if (a === 'heroic') pull(true);
  else if (a === 'skip') scene.skip();
  else if (a === 'again') { run = null; save(); render(); showHero(); }
}

export async function openRaid(data, host) {
  if (root) { scene.stageA.resize(); return; }
  gear = data.gear;
  ({ PANE, QUALITY, tooltip } = data);
  data.ownedBy(() => (run && run.heroes[viewing] ? run.heroes[viewing].picks : {}));
  const [raidPool, raidGear] = await Promise.all(['raid/pool.json', 'raid/gear.json'].map((f) => fetch(f).then((r) => r.json())));
  Object.assign(gear.items, raidGear.items);
  for (const [id, row] of Object.entries(raidPool.items)) if (!data.pool.items[id]) data.pool.items[id] = row;
  for (const [id, set] of Object.entries(raidPool.sets)) if (!data.pool.sets[id]) data.pool.sets[id] = set;
  pool = raidPool;
  root = host;
  root.id = 'raid';
  root.innerHTML = '<div class="rtop"></div><div class="rmain"><div class="rstage"><div class="pane gpane"><img class="portrait" alt=""><div class="frameart"></div><div class="viewport"><div class="rscene"></div></div><div class="peekwho"></div><div class="sub"></div><div class="peekdoll"></div><div class="rctl"></div></div></div><div class="rside"></div></div><section class="gpanel rboard"><div class="rboardlist"></div></section>';
  root.querySelector('.rboard').onclick = (e) => {
    const b = e.target.closest('[data-board]');
    if (b && !b.disabled) { boardRaid = b.dataset.board; loadBoard(); }
  };
  scene = new RaidScene(root.querySelector('.rscene'), gear, pool);
  await scene.init();
  scene.theme({ floor: 'terrain_rock', wall: 'terrain_rock', fog: 0x2a0c04, light: 0xff6a2a });
  render();
  showHero();
  loadBoard();
  window.raid = { scene, get run() { return run; }, set run(v) { run = v; }, render };
}
