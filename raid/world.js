import { hash, rng } from '../draft/core.js';
import { fight, enrageTime } from './engine.js';
import { makeParty, choiceOf } from './roles.js';
import { ROLES, classesFor, specsFor, list, targetsOf } from './run.js';
import { boostOf, drink } from './consumables.js';
import { LOOT, KEY } from './worldloot.js';

const SHADOW = 'shadow', PHYS = 'phys';
export const SLOTS = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2', 'main', 'off', 'ranged'];
const POOL_OF = { finger1: 'finger', finger2: 'finger', trinket1: 'trinket', trinket2: 'trinket' };
const TIERS = [['l', .012], ['t', .17], ['e', .15], ['c', .13], ['b', .29], ['g', .248]];
const TIER_FULL = 10, HANDS = 7, ITERATIONS = 4, MOVES = 70;
export const RESET_HOUR = 5;
const DAY = 864e5;

export const WORLD = {
  kazzak: {
    id: 'kazzak', name: 'Lord Kazzak', short: 'Kazzak', zone: 'The Blasted Lands', model: 12449,
    blurb: 'The Highlord of the Burning Legion guards the Dark Portal. One attempt a day, and he does not forgive.',
    health: 2915000, armor: 4691, resist: { shadow: 150, fire: 90 }, melee: [1350, 1750, 2.2], supreme: 180,
    levelUp: { damage: .3, n: 'Capture Soul' },
    balance: { tank: { WARRIOR: 1.185, PALADIN: .912, DRUID: .734 }, heal: { PRIEST: 1.877, PALADIN: .91, DRUID: .751, SHAMAN: 1.096 }, dps: { arms: 1.333, fury: 1.198, ret: 1.409, shock: 1.163, bm: 1.228, mm: 1.136, surv: 1.174, mut: 1.246, combat: 1.077, shadow: 1.55, ele: 1.284, enh: 1.241, fire: 1.054, frost: .792, arcane: .783, afflic: 1.27, demo: 1.268, destro: 1.093, moon: .862, cat: 1.158 } },
    know: [
      { n: 'Shadow Bolt Volley', icon: 136197, text: 'Most of his damage is shadow: volleys on the whole party and bolts on the tank. Shadow Resistance from gear, auras and buffs softens all of it.' },
      { n: 'Mark of Kazzak', icon: 136121, text: "Drains your healer's mana. Deep mana pools and regeneration keep the heals coming." },
      { n: 'Twisted Reflection', icon: 136169, text: 'Kazzak heals for the damage he deals to the marked hero. Stamina and Shadow Resistance starve it.' },
      { n: 'Cleave', icon: 132338, text: 'Hits the tank and every melee hero standing beside him.' },
      { n: 'Capture Soul', icon: 136210, text: 'Every hero who falls makes him hit 30% harder.' },
      { n: 'Supreme Mode', icon: 136224, text: 'After three minutes he stops holding back. Kill him before then.' },
    ],
    abilities: [
      { n: 'Shadow Bolt Volley', first: 6, every: [8, 10], school: SHADOW, dmg: [1350, 1600], to: 'party' },
      { n: 'Shadow Bolt', first: 3, every: [5, 7], school: SHADOW, dmg: [1150, 1400], to: 'tank' },
      { n: 'Cleave', first: 4, every: [7, 9], school: PHYS, dmg: [1100, 1400], to: 'melee' },
      { n: 'Mark of Kazzak', first: 16, every: [24, 28], burn: { per: 230, every: 1, ticks: 10 } },
      { n: 'Twisted Reflection', first: 22, every: [26, 30], school: SHADOW, dmg: [950, 1150], to: 'random', drain: 5 },
    ],
    loot: LOOT.filter((l) => l.boss === 'kazzak'),
  },
};
for (const b of Object.values(WORLD)) { b.step = 0; b.hit = 1; b.enrageBy = 1; b.enrageBy = b.supreme / enrageTime(b, null); }

export const WORLD_IDS = Object.keys(WORLD);
export { LOOT, KEY };
export const keyRoll = (salt) => rng(hash(salt, 'key'))() < KEY.chance;
export const dayOf = (at = Date.now()) => Math.floor((at - RESET_HOUR * 36e5) / DAY);
export const resetAt = (day) => (day + 1) * DAY + RESET_HOUR * 36e5;
export const daySeed = (boss, day) => hash('world', boss, day);

export function newWorld(boss, day, salt, seed = daySeed(boss, day)) {
  return { mode: 'world', raid: boss, day, seed, salt, step: 'party', at: 0, heroes: [], mulligan: 1, rolls: 0, moves: [], result: null, over: false };
}

export function addHero(run, cls, build, pick) {
  const role = ROLES[run.at], choice = choiceOf(role, cls);
  if (!classesFor(role).includes(cls) || !specsFor(role, cls).some((s) => s.id === build)) throw new Error('bad hero');
  const chosen = choice ? (choice.list.some((x) => x.id === pick) ? pick : choice.list[0].id) : null;
  run.heroes[run.at] = { role, cls, build, picks: {}, round: 0, v: HANDS, ...(chosen && { pick: chosen }) };
  run.step = 'gear';
  run.moves.push(['h', cls, build, ...(chosen ? [chosen] : [])]);
}

export const open = (hero) => SLOTS.filter((s) => !(s in hero.picks));
const isTwoHand = (it) => it && it[3] === 17;

function rollSlot(pool, hero, slot, r, taken) {
  const main = hero.picks.main && pool.items[hero.picks.main];
  if (slot === 'off' && isTwoHand(main)) return 0;
  const ok = (i) => {
    const it = pool.items[i];
    if (taken.has(it[0])) return false;
    if (slot === 'main' && isTwoHand(it) && ((hero.role === 'tank' && hero.cls !== 'DRUID') || hero.picks.off)) return false;
    return true;
  };
  const tiers = TIERS.map(([t, w]) => { const ids = list(pool, hero, slot, t).filter(ok); return [ids, t === 'l' ? w : w * Math.min(1, ids.length / TIER_FULL)]; }).filter(([ids]) => ids.length);
  if (!tiers.length) return 0;
  let x = r() * tiers.reduce((n, [, w]) => n + w, 0);
  for (const [ids, w] of tiers) { if (x < w) return ids[Math.floor(r() * ids.length)]; x -= w; }
  const last = tiers[tiers.length - 1][0];
  return last[Math.floor(r() * last.length)];
}

export function gearOffers(pool, run) {
  const hero = run.heroes[run.at];
  if (!hero || run.step !== 'gear') return {};
  const r = rng(hash(run.seed, 'gear', run.at, hero.cls, hero.round, run.rolls)), out = {};
  const taken = new Set(Object.values(hero.picks).filter(Boolean).map((i) => pool.items[i][0]));
  for (const slot of open(hero)) {
    const id = rollSlot(pool, hero, slot, r, taken);
    if (id) taken.add(pool.items[id][0]);
    out[slot] = id;
  }
  return out;
}

export function handsFor(pool, run, slot, id) {
  const hero = run.heroes[run.at];
  return targetsOf(pool, hero, slot, id).filter((s) => !(s in hero.picks));
}

function nextHero(pool, run) {
  const hero = run.heroes[run.at];
  for (;;) {
    const left = open(hero);
    if (!left.length) break;
    const offer = gearOffers(pool, run), dead = left.filter((s) => !offer[s]);
    if (!dead.length) return;
    for (const s of dead) hero.picks[s] = 0;
  }
  run.at++;
  run.step = run.at >= ROLES.length ? 'boss' : 'party';
}

export function takeGear(pool, run, slot, to = slot) {
  const hero = run.heroes[run.at], id = gearOffers(pool, run)[slot];
  if (!id) throw new Error('bad pick');
  if (!handsFor(pool, run, slot, id).includes(to)) throw new Error('bad hand');
  hero.picks[to] = id;
  if (to === 'main' && isTwoHand(pool.items[id])) hero.picks.off = 0;
  hero.round++;
  run.moves.push(to === slot ? ['t', slot] : ['t', slot, to]);
  nextHero(pool, run);
  return id;
}

export function mulligan(run) {
  if (!run.mulligan || run.step !== 'gear') return false;
  run.mulligan = 0;
  run.rolls++;
  run.moves.push(['m']);
  return true;
}

export const bossOf = (run) => WORLD[run.raid];

export function tuneParty(party, boss) {
  const t = boss.balance || {};
  return party.map((h) => {
    if (h.role === 'dps') { const k = (t.dps || {})[h.build] || 1; return { ...h, power: h.power * k, dps: h.dps * k }; }
    if (h.role === 'heal') { const k = (t.heal || {})[h.cls] || 1; return { ...h, k: { ...h.k, heal: h.k.heal * k } }; }
    const k = (t.tank || {})[h.cls] || 1;
    return { ...h, k: { ...h.k, taken: (h.k.taken || 1) * k } };
  });
}

export const worldParty = (pool, run, iterations = ITERATIONS) => drink(tuneParty(makeParty(pool, run.heroes.map((h, i) => { const b = boostOf(run.consume && run.consume[i]); return b ? { ...h, boost: b } : h; }), iterations, [], run.raid), bossOf(run)), run.consume);
export const fightSeed = (run) => hash(run.salt, 'fight', run.raid);
export const variance = (seed) => { const r = rng(hash(seed, 'variance')); return { damage: .7 + r() * .6, health: .84 + r() * .32 }; };

export function fightWorld(pool, run, party = worldParty(pool, run)) {
  if (run.step !== 'boss') throw new Error('bad fight');
  const result = fight(party, bossOf(run), fightSeed(run), variance(fightSeed(run)), {});
  run.moves.push(['f']);
  run.result = { won: result.won, time: Math.round(result.time * 10) / 10, health: Math.round(result.health * 1000) / 1000, dealt: result.totals.map((h) => Math.round(h.dealt)) };
  run.over = true;
  run.step = 'over';
  return result;
}

export function replayDraft(pool, boss, day, moves, seed) {
  if (!Object.hasOwn(WORLD, boss) || !Array.isArray(moves) || moves.length > MOVES) throw new Error('bad run');
  const run = newWorld(boss, day, 0, Number.isInteger(seed) ? seed : undefined);
  for (const m of moves) {
    if (!Array.isArray(m)) throw new Error('bad move');
    if (m[0] === 'h') { if (run.step !== 'party') throw new Error('bad hero'); addHero(run, m[1], m[2], m[3]); }
    else if (m[0] === 't') { if (run.step !== 'gear') throw new Error('bad pick'); takeGear(pool, run, m[1], m[2] || m[1]); }
    else if (m[0] === 'm') { if (!mulligan(run)) throw new Error('bad mulligan'); }
    else throw new Error('bad move');
  }
  if (run.step !== 'boss') throw new Error('unfinished');
  return run;
}

export function pullWorld(pool, run, salt, party) {
  run.salt = salt;
  return fightWorld(pool, run, party || worldParty(pool, run));
}

export const dropsOf = (run) => (run.result && run.result.won ? bossOf(run).loot.filter((l) => rng(hash(run.salt, 'loot', l.id))() < l.chance) : []);

export function collectWorld(runs) {
  const have = {}, kept = [];
  for (const run of runs) {
    const got = [];
    for (const d of dropsOf(run)) { if (have[d.id]) continue; have[d.id] = run.at || 1; got.push(d); }
    kept.push(got);
  }
  return { have, kept };
}
