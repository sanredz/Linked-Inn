import { hash, rng } from '../draft/core.js';
import { RAIDS, SCALE, TWISTS } from './bosses.js';
import { HEALERS, TANKS, choiceOf, damageBuilds, makeParty } from './roles.js';
import { fight } from './engine.js';
import { BOONS, boonById, modsOf } from './boons.js';

export const ROLES = ['tank', 'heal', 'dps'];
export const ROLE_NAME = { tank: 'Tank', heal: 'Healer', dps: 'Damage' };
export const CLASS_NAME = { WARRIOR: 'Warrior', PALADIN: 'Paladin', HUNTER: 'Hunter', ROGUE: 'Rogue', PRIEST: 'Priest', SHAMAN: 'Shaman', MAGE: 'Mage', WARLOCK: 'Warlock', DRUID: 'Druid' };
export const DRAFT_PICKS = 6, OFFERS = 4, SPOILS = 3, REROLLS = 2;
const SLOTS = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2', 'main', 'off', 'ranged'];
const POOL_OF = { finger1: 'finger', finger2: 'finger', trinket1: 'trinket', trinket2: 'trinket' };
const TANK = { sta: 1, armor: .05, def: 2.6, dodge: 16, parry: 14, block: 8, blockValue: .3, str: .3, agi: .4, hit: 3 };
const HEAL = { heal: .55, int: .6, spi: .35, mp5: 1.3, scrit: 9, sta: .3 };
const MELEE = { str: 2, agi: 1.6, ap: 1, hit: 22, crit: 26, sta: .2 };
const SPELL = { sp: 1, sfire: .8, sfrost: .8, sshadow: .8, sarcane: .8, snature: .8, int: .5, scrit: 14, shit: 16, sta: .2 };
const CASTERS = /^(moon|ele|shadow|shadowd|shock|fire|frost|arcane|afflic|demo|destro)$/;
const FERAL = /^(cat|catm)$/;
const STYLE = { melee: { str: 2, agi: 1.6, ap: 1, fap: .5, hit: 22, crit: 26 }, spell: { sp: 1, sfire: .8, sfrost: .8, sshadow: .8, sarcane: .8, snature: .8, sholy: .8, int: .5, scrit: 14, shit: 16 }, heal: { heal: 1, mp5: 2, spi: .35, int: .35 } };
const STYLE_FIT = .6;
const SCHOOLS = { moon: ['sarcane', 'snature'], ele: ['snature', 'sfire'], shadow: ['sshadow'], shadowd: ['sshadow'], shock: ['sholy'], fire: ['sfire'], frost: ['sfrost'], arcane: ['sarcane', 'sfire'], afflic: ['sshadow'], demo: ['sshadow'], destro: ['sfire', 'sshadow'] };
const SCHOOL_STAT = /^s(fire|frost|shadow|arcane|nature|holy)$/;
const offSchool = (hero, k) => hero.role === 'dps' && SCHOOLS[hero.build] && SCHOOL_STAT.test(k) && !SCHOOLS[hero.build].includes(k);

function fits(pool, hero, id, wild = false) {
  if (hero.role === 'heal' || (hero.role === 'tank' && !wild)) return true;
  const it = pool.items[id], style = hero.role === 'dps' && CASTERS.test(hero.build) ? 'spell' : 'melee';
  const score = (table) => Object.entries(it[7]).reduce((sum, [k, n]) => sum + (offSchool(hero, k) ? 0 : (table[k] || 0) * n), 0);
  const wrong = Object.entries(it[7]).reduce((sum, [k, n]) => sum + (offSchool(hero, k) ? STYLE.spell[k] * n : 0), 0);
  const own = score(STYLE[style]), rival = Math.max(wrong, ...Object.keys(STYLE).filter((s) => s !== style).map((s) => score(STYLE[s])));
  if (wrong > 0 && !it[7].sp && !Object.keys(it[7]).some((k) => SCHOOL_STAT.test(k) && !offSchool(hero, k))) return false;
  if (own > 0) return own >= rival * STYLE_FIT;
  if (rival > 0) return false;
  if (style === 'spell') return !it[8];
  return !(it[8] && FERAL.test(hero.build)) && !it[12].some((l) => /\bspells?\b|healing/i.test(l));
}
const FLOORS = [1.01, 1.01, .85, .6];
const SPOIL_RARITY = 4, SPOIL_FLOOR = 62, SPOIL_RISE = 1.6, SPOIL_MEAN = 5, SPOIL_DRIFT = .9, SPOIL_SPREAD = 7, SPOIL_TAIL = .015, HEROIC_BUMP = 4;
const DRAFT_TIERS = [['b', .62], ['c', .1], ['e', .24], ['t', .04]];
const JACKPOT = .025, JACKPOT_TIERS = [['e', .5], ['t', .4], ['l', .1]], DRAFT_CAP = 68;
export const HEROIC = { damage: 1.22, health: 1.15 };

export function classesFor(role) {
  if (role === 'tank') return Object.keys(TANKS);
  if (role === 'heal') return Object.keys(HEALERS);
  return Object.keys(CLASS_NAME);
}

export function specsFor(role, cls) {
  if (role === 'tank') return [{ id: 'tank', name: TANKS[cls].name, blurb: TANKS[cls].blurb }];
  if (role === 'heal') return [{ id: 'heal', name: HEALERS[cls].name, blurb: HEALERS[cls].blurb }];
  return damageBuilds(cls);
}

const wants = (hero) => (hero.role === 'tank' ? TANK : hero.role === 'heal' ? HEAL : CASTERS.test(hero.build) ? SPELL : MELEE);

export function worth(pool, hero, id) {
  if (!id) return 0;
  const it = pool.items[id], w = wants(hero), stats = it[7];
  let v = 0;
  for (const [k, n] of Object.entries(stats)) if (!offSchool(hero, k)) v += (w[k] || 0) * n;
  if (hero.role === 'dps' && it[8] && !CASTERS.test(hero.build) && !FERAL.test(hero.build)) v += (it[8].min + it[8].max) / 2 / (it[8].delay / 1000) * 12;
  if (hero.role === 'dps' && (it[10] || it[11])) v += 25;
  return v;
}

const DUAL_WIELD = /^(fury|furyd|mut|combat|enh|enhd)$/;
const STARTER_ILVL = 60, STARTER_RANK = .35, HANDS = 4;
const DUNGEON_SET = { MAGE: 181, PRIEST: 182, WARLOCK: 183, ROGUE: 184, DRUID: 185, HUNTER: 186, SHAMAN: 187, PALADIN: 188, WARRIOR: 189 };
const SET_SLOT = { 1: 'head', 3: 'shoulder', 5: 'chest', 20: 'chest', 9: 'wrist', 10: 'hands', 6: 'waist', 7: 'legs', 8: 'feet' };

function modest(pool, hero, slot, count, keep = () => true) {
  const table = pool.pools[hero.role][hero.cls][POOL_OF[slot] || slot] || {};
  const every = [...(table.b || []), ...(table.g || [])], right = every.filter((i) => fits(pool, hero, i) && keep(i)), usable = right.length ? right : every.filter(keep);
  const low = usable.filter((i) => pool.items[i][2] <= STARTER_ILVL);
  const all = low.length ? low : usable.sort((x, y) => pool.items[x][2] - pool.items[y][2] || x - y).slice(0, 6);
  const ranked = all.sort((x, y) => worth(pool, hero, y) - worth(pool, hero, x) || x - y);
  const at = Math.floor(ranked.length * STARTER_RANK);
  return ranked.slice(at, at + count).concat(ranked.slice(0, at)).slice(0, count);
}

export function starterPicks(pool, role, cls, build, hands = HANDS) {
  const hero = { role, cls, build }, picks = {}, dual = role === 'dps' && DUAL_WIELD.test(build), caster = role === 'heal' || (role === 'dps' && CASTERS.test(build));
  for (const slot of ['neck', 'back', 'ranged']) { const [id] = modest(pool, hero, slot, 1); if (id) picks[slot] = id; }
  for (const [id, row] of Object.entries(pool.items)) if (row[9] === DUNGEON_SET[cls] && SET_SLOT[row[3]]) picks[SET_SLOT[row[3]]] = +id;
  const [ring1, ring2] = modest(pool, hero, 'finger1', 2), [trink1, trink2] = modest(pool, hero, 'trinket1', 2);
  Object.assign(picks, ring1 && { finger1: ring1 }, ring2 && { finger2: ring2 }, trink1 && { trinket1: trink1 }, trink2 && { trinket2: trink2 });
  const oneHand = (i) => pool.items[i][3] === 13;
  const wantsOne = dual || (role === 'tank' && cls !== 'DRUID');
  const speed = (i) => pool.items[i][8]?.delay || 0, [first, second] = modest(pool, hero, 'main', 2, wantsOne ? oneHand : undefined), flip = hands && dual && build !== 'mut' && second && speed(second) > speed(first);
  const main = flip ? second : first;
  picks.main = main;
  if (dual && second) picks.off = flip ? first : second;
  else if (pool.items[main][3] !== 17 && (caster || role === 'tank')) {
    const shield = (i) => pool.items[i][5] === 4;
    const [off] = modest(pool, hero, 'off', 1, role === 'tank' ? shield : undefined);
    if (off) picks.off = off;
  }
  return picks;
}

export function newRun(raid = 'mc', seed = Math.floor(Math.random() * 1e9)) {
  return { raid, seed, step: 'party', at: 0, heroes: [], boss: 0, rerolls: REROLLS, rolled: 0, results: [], score: 0, over: false, moves: [], boons: [], spoilsLeft: 0 };
}

export function addHero(pool, run, cls, build, hands = HANDS, pick) {
  const role = ROLES[run.at], choice = hands >= 3 && choiceOf(role, cls);
  const picks = starterPicks(pool, role, cls, build, hands), chosen = choice ? (choice.list.some((x) => x.id === pick) ? pick : choice.list[0].id) : null;
  run.heroes[run.at] = { role, cls, build, picks, start: { ...picks }, left: DRAFT_PICKS, ...(hands && { v: hands }), ...(chosen && { pick: chosen }) };
  run.step = 'draft';
  run.moves.push(hands ? ['h', cls, build, hands, ...(chosen ? [chosen] : [])] : ['h', cls, build]);
}

const ARMOR = new Set(['head', 'shoulder', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet']), CAT = { role: 'dps', cls: 'DRUID', build: 'cat' };
const leather = (pool, i) => pool.items[i][5] === 4 && pool.items[i][6] === 2;
function bearExtra(pool, hero, group, tier) {
  if (!hero.v || hero.role !== 'tank' || hero.cls !== 'DRUID') return [];
  const rogue = ARMOR.has(group) ? (pool.pools.dps.ROGUE[group]?.[tier] || []).filter((i) => leather(pool, i)) : [];
  return [...(pool.pools.dps.DRUID[group]?.[tier] || []), ...rogue].filter((i) => fits(pool, CAT, i));
}

const withExtra = (base, more) => (more.length ? [...new Set(base.concat(more))] : base);
const TANK_KEEP = .6;
function curated(pool, hero, ids) {
  if (!hero.v || hero.role !== 'tank' || ids.length <= 3) return ids;
  const keep = new Set([...ids].sort((a, b) => worth(pool, hero, b) - worth(pool, hero, a) || a - b).slice(0, Math.max(3, Math.ceil(ids.length * TANK_KEEP))));
  return ids.filter((i) => keep.has(i));
}
const list = (pool, hero, slot, tier, wild = false) => curated(pool, hero, withExtra(pool.pools[wild && hero.role === 'tank' ? 'dps' : hero.role][hero.cls][POOL_OF[slot] || slot]?.[tier] || [], bearExtra(pool, hero, POOL_OF[slot] || slot, tier)).concat(slot === 'off' && hero.role === 'dps' ? (pool.pools.dps[hero.cls].main?.[tier] || []).filter((i) => pool.items[i][3] === 13) : []).filter((i) => fits(pool, hero, i, wild)));

function rollSlot(pool, hero, slot, r, tiers, taken, cap, luck = 1, floor = FLOORS[0]) {
  const names = new Set([...Object.values(hero.picks), ...taken].map((i) => pool.items[i][0]));
  const now = worth(pool, hero, hero.picks[slot]), wild = floor < .7;
  const main = hero.picks.main && pool.items[hero.picks.main];
  if (slot === 'off' && main && main[3] === 17) return 0;
  const jackpot = r() < JACKPOT * luck, table = jackpot ? JACKPOT_TIERS : tiers;
  for (let tries = 0; tries < 3; tries++) {
    let x = r(), tier = table[0][0];
    for (const [t, w] of table) { if (x < w) { tier = t; break; } x -= w; }
    const ids = list(pool, hero, slot, tier, wild).filter((i) => (jackpot || pool.items[i][2] <= cap) && !names.has(pool.items[i][0]) && worth(pool, hero, i) > now * floor && !(slot === 'main' && hero.role === 'tank' && pool.items[i][3] === 17 && hero.cls !== 'DRUID') && !(slot === 'main' && hero.role === 'heal' && hero.picks.off && pool.items[i][3] === 17));
    if (ids.length) return ids[Math.floor(r() * ids.length)];
  }
  return 0;
}

function shuffled(items, r) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const groupOf = (slot) => POOL_OF[slot] || slot;

export function draftOffers(pool, run) {
  const hero = run.heroes[run.at], r = rng(hash(run.seed, 'draft', run.at, hero.left, run.rolled)), out = [], taken = [], free = SLOTS.filter((s) => !(hero.took || []).includes(groupOf(s)));
  for (const slot of shuffled(free, r)) {
    if (out.length >= OFFERS) break;
    if (out.some((o) => groupOf(o.slot) === groupOf(slot))) continue;
    const id = rollSlot(pool, hero, slot, r, DRAFT_TIERS, taken, DRAFT_CAP, 1, FLOORS[out.length]);
    if (id) { out.push({ hero: run.at, slot, id }); taken.push(id); }
  }
  return out;
}

const nextHero = (run) => {
  const hero = run.heroes[run.at];
  hero.left--;
  if (hero.left > 0) return;
  run.at++;
  run.step = run.at >= ROLES.length ? 'boss' : 'party';
};

const spoilDone = (run) => {
  run.spoilsLeft--;
  if (run.spoilsLeft > 0) return;
  run.spoils = null;
  run.rolled++;
  run.step = 'boss';
};

export function targetsOf(pool, hero, slot, id) {
  if (POOL_OF[slot]) return Object.keys(POOL_OF).filter((s) => POOL_OF[s] === POOL_OF[slot]);
  if ((slot !== 'main' && slot !== 'off') || pool.items[id][3] !== 13 || hero.role !== 'dps' || !DUAL_WIELD.test(hero.build)) return [slot];
  const main = hero.picks.main && pool.items[hero.picks.main];
  return main && main[3] === 17 ? [slot] : ['main', 'off'];
}

export function take(pool, run, choice) {
  const hero = run.heroes[choice.hero], to = choice.to || choice.slot;
  if (!targetsOf(pool, hero, choice.slot, choice.id).includes(to)) throw new Error('bad slot');
  hero.picks[to] = choice.id;
  if (to === 'main' && pool.items[choice.id][3] === 17) delete hero.picks.off;
  run.moves.push(to === choice.slot ? ['t', choice.hero, choice.slot, choice.id] : ['t', choice.hero, choice.slot, choice.id, to]);
  if (run.step === 'spoils') {
    run.spoils.offers = run.spoils.offers.filter((o) => !(o.hero === choice.hero && o.slot === choice.slot));
    spoilDone(run);
  }
  else {
    hero.took = [...(hero.took || []), groupOf(to)];
    nextHero(run);
  }
}

export function takeBoon(run, id) {
  run.boons.push(id);
  run.rerolls += boonById(id).rerolls || 0;
  run.moves.push(['b', id]);
  run.spoils.boon = null;
  spoilDone(run);
}

export function passDraft(run) {
  run.moves.push(['p']);
  nextHero(run);
}

export function skipSpoils(run) {
  run.moves.push(['s']);
  run.spoilsLeft = 0;
  run.spoils = null;
  run.rolled++;
  run.step = 'boss';
}

const luck = (run) => modsOf(run.boons).jackpot || 1;

function spoilItem(pool, run, hero, slot, r, taken, floor, rarity = 0) {
  const names = new Set([...Object.values(hero.picks), ...taken].map((i) => pool.items[i][0])), worn = hero.picks[slot] ? pool.items[hero.picks[slot]][1] : 0, now = worth(pool, hero, hero.picks[slot]), wild = floor < .7;
  const main = hero.picks.main && pool.items[hero.picks.main];
  if (slot === 'off' && main && main[3] === 17) return 0;
  const base = SPOIL_FLOOR + run.boss * SPOIL_RISE + (run.heroic ? HEROIC_BUMP : 0), mean = base + SPOIL_MEAN + run.boss * SPOIL_DRIFT;
  const bag = ['g', 'b', 'c', 'e', 't', 'l'].flatMap((t) => list(pool, hero, slot, t, wild)).filter((i) => {
    const it = pool.items[i];
    return it[2] >= base && it[1] >= Math.max(worn, rarity) && !names.has(it[0]) && worth(pool, hero, i) > now * floor && !(slot === 'main' && hero.role === 'tank' && it[3] === 17 && hero.cls !== 'DRUID') && !(slot === 'main' && hero.picks.off && it[3] === 17);
  });
  const weight = (i) => { const it = pool.items[i], z = (it[2] - mean) / SPOIL_SPREAD; return (Math.exp(-z * z / 2) + SPOIL_TAIL * luck(run)) * (it[1] >= 5 ? .15 : 1); };
  let roll = r() * bag.reduce((n, i) => n + weight(i), 0);
  for (const i of bag) { roll -= weight(i); if (roll <= 0) return i; }
  return bag[bag.length - 1] || 0;
}

const startingSlots = (hero) => Object.keys(hero.start || {}).filter((s) => hero.picks[s] === hero.start[s]);
const replacesStarter = (pool, run, o) => targetsOf(pool, run.heroes[o.hero], o.slot, o.id).some((s) => startingSlots(run.heroes[o.hero]).includes(s));

function guarantee(pool, run, out, taken, r) {
  const fresh = out.filter((o) => replacesStarter(pool, run, o)), open = shuffled(run.heroes.flatMap((hero, who) => startingSlots(hero).map((slot) => ({ who, slot }))), r);
  if (!open.length || !out.length || fresh.length > 1) return;
  const keep = fresh[0], swap = keep || out[out.length - 1];
  if (keep && pool.items[keep.id][1] >= SPOIL_RARITY) return;
  const others = taken.filter((id) => id !== swap.id), tries = keep ? [{ who: keep.hero, slot: keep.slot }, ...open] : open;
  for (const rarity of [SPOIL_RARITY, 0]) {
    for (const { who, slot } of tries) {
      const id = spoilItem(pool, run, run.heroes[who], slot, r, others, FLOORS[2], rarity);
      if (id && !out.some((o) => o !== swap && o.hero === who && o.slot === slot)) { out[out.indexOf(swap)] = { hero: who, slot, id }; return; }
    }
  }
}

function rollSpoils(pool, run) {
  const r = rng(hash(run.seed, 'spoils', run.boss, run.rolled)), out = [], taken = [];
  const order = shuffled([0, 1, 2, 0, 1, 2], r);
  for (const who of order) {
    if (out.length >= SPOILS) break;
    const hero = run.heroes[who], used = out.filter((o) => o.hero === who).map((o) => o.slot);
    for (const slot of shuffled(SLOTS, r)) {
      if (used.includes(slot)) continue;
      const id = spoilItem(pool, run, hero, slot, r, taken, FLOORS[out.length + 1]);
      if (id) { out.push({ hero: who, slot, id }); taken.push(id); break; }
    }
  }
  guarantee(pool, run, out, taken, r);
  const free = BOONS.filter((b) => !run.boons.includes(b.id)), b = rng(hash(run.seed, 'boon', run.boss, run.rolled));
  return { offers: out, boon: free.length ? free[Math.floor(b() * free.length)].id : null };
}

export function spoilOffers(pool, run) {
  if (!run.spoils) run.spoils = rollSpoils(pool, run);
  return run.spoils.offers;
}

export const boonOffer = (pool, run) => { spoilOffers(pool, run); return run.spoils.boon; };

export function reroll(run) {
  if (run.rerolls <= 0) return false;
  run.rerolls--;
  run.rolled++;
  run.spoils = null;
  run.moves.push(['r']);
  return true;
}

export function finishBoss(run, result, heroic = false) {
  run.results.push({ boss: result.boss, won: result.won, time: result.time, score: result.score, heroic });
  run.score = result.score;
  run.heroic = heroic;
  if (result.won) { run.boss++; run.step = 'spoils'; run.spoilsLeft = heroic ? 2 : 1; return; }
  run.over = true;
  run.step = 'over';
}

export function twistFor(run, boss) {
  if (boss.endless) return null;
  const r = rng(hash(run.seed, 'twist', boss.step));
  if (r() >= SCALE.twistChance) return null;
  return TWISTS[Math.floor(r() * TWISTS.length)];
}

export const fightSeed = (run) => run.seed + run.boss * 131 + 1;

export const effectiveTwist = (run, boss, heroic) => {
  const t = twistFor(run, boss);
  if (!heroic) return t;
  return { ...(t || {}), damage: ((t && t.damage) || 1) * HEROIC.damage, health: ((t && t.health) || 1) * HEROIC.health };
};

export const modsFor = (run) => modsOf(run.boons, killed(run));

export function resolveFight(run, heroes, heroic) {
  const boss = currentBoss(run), result = fight(heroes, boss, fightSeed(run), effectiveTwist(run, boss, heroic), modsFor(run));
  run.moves.push(['f', heroic ? 1 : 0]);
  finishBoss(run, result, heroic);
  return result;
}

export const partyStats = (run) => run.boons.map((id) => boonById(id).all).filter(Boolean);

export function fightBoss(pool, run, heroic = false, iterations = 1) {
  return resolveFight(run, makeParty(pool, run.heroes, iterations, partyStats(run)), heroic);
}

export function replayRun(pool, seed, moves, raid = 'mc') {
  if (!Object.hasOwn(RAIDS, raid)) throw new Error('bad raid');
  const run = newRun(raid, seed), same = (o, m) => o.hero === m[1] && o.slot === m[2] && o.id === m[3];
  for (const m of moves) {
    if (run.over) throw new Error('moves after the end');
    if (m[0] === 'f') {
      if (run.step !== 'boss') throw new Error('bad fight');
      fightBoss(pool, run, !!m[1]);
    } else if (m[0] === 'h') {
      const role = ROLES[run.at];
      if (run.step !== 'party' || !classesFor(role).includes(m[1]) || !specsFor(role, m[1]).some((x) => x.id === m[2]) || (m.length > 3 && !(Number.isInteger(m[3]) && m[3] >= 1 && m[3] <= HANDS)) || (m.length > 4 && (m[3] < 3 || !(choiceOf(role, m[1]) || { list: [] }).list.some((x) => x.id === m[4])))) throw new Error('bad hero');
      addHero(pool, run, m[1], m[2], m.length > 3 ? m[3] : 0, m[4]);
    } else if (m[0] === 't') {
      const offers = run.step === 'draft' ? draftOffers(pool, run) : run.step === 'spoils' ? spoilOffers(pool, run) : [];
      if (!offers.some((o) => same(o, m))) throw new Error('bad item');
      take(pool, run, { hero: m[1], slot: m[2], id: m[3], to: m[4] });
    } else if (m[0] === 'b') {
      if (run.step !== 'spoils' || !m[1] || boonOffer(pool, run) !== m[1]) throw new Error('bad boon');
      takeBoon(run, m[1]);
    } else if (m[0] === 'p') {
      if (run.step !== 'draft' || draftOffers(pool, run).length) throw new Error('bad pass');
      passDraft(run);
    } else if (m[0] === 's') {
      if (run.step !== 'spoils') throw new Error('bad skip');
      skipSpoils(run);
    } else if (m[0] === 'r') {
      if (run.step !== 'spoils' || !reroll(run)) throw new Error('bad reroll');
    } else throw new Error('bad move');
  }
  if (!run.over) throw new Error('unfinished');
  return run;
}

export const bossAt = (run, i) => { const b = RAIDS[run.raid].bosses[i]; return b && b.variants ? b.variants[Math.floor(rng(hash(run.seed, 'variant', i))() * b.variants.length)] : b; };
export const currentBoss = (run) => bossAt(run, run.boss);
export const killed = (run) => run.results.filter((r) => r.won).length;
export const dropsOf = (run) => run.results.map((r, i) => { const b = bossAt(run, i); return b && (r.won || b.endless) && b.drop; }).filter((m, i) => m && rng(hash(run.seed, 'mount', i))() < m.chance);
export const INGOT = 17203, INGOTS = 8;
export const FORGE = { 19019: { needs: [18563, 18564], trial: 'mc', score: 120000 }, 17182: { needs: [17204], ingots: INGOTS, trial: 'mc', score: 125000 } };
const trialMet = (run, need) => run.results.some((r, i) => { const b = bossAt(run, i); return b && b.endless && (r.score || 0) >= need; });

export function collect(runs, base = {}) {
  const have = { ...base }, kept = [], trial = {};
  for (const run of runs) {
    const got = [];
    for (const d of dropsOf(run)) {
      if ((have[d.id] || 0) >= (d.id === INGOT ? INGOTS : 1)) continue;
      have[d.id] = (have[d.id] || 0) + 1;
      got.push(d);
    }
    kept.push(got);
    for (const [id, f] of Object.entries(FORGE)) if (!trial[id] && run.raid === f.trial && f.needs.every((n) => have[n]) && trialMet(run, f.score)) trial[id] = true;
  }
  const paired = !!(have[18563] && have[18564]);
  return { have, kept, trial, ready: { 19019: paired && !!trial[19019], 17182: !!have[17204] && (have[INGOT] || 0) >= INGOTS && !!trial[17182] }, paired };
}
