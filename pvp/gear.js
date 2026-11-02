import { sheet } from '../draft/core.js';
import { PRESETS, PLANS } from './engine.js';

export const CLASSES = Object.keys(PRESETS);
export const SLOTS = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2', 'main', 'off', 'ranged'];
const POOL_OF = { finger1: 'finger', finger2: 'finger', trinket1: 'trinket', trinket2: 'trinket' };
const TWO_HAND = { WARRIOR: 1, PALADIN: 1, SHAMAN: 1 };
const DUAL = { ROGUE: 1 };
const offensive = (s, d, k) => (s.str || 0) * k.str + (s.agi || 0) * k.agi + (s.ap || 0) * 1 + (s.fap || 0) * (k.fap || 0) + (s.rap || 0) * (k.rap || 0) + (s.hit || 0) * 20 + (s.crit || 0) * 25 + (d ? (d.min + d.max) / 2 / d.delay * 1000 * 12 : 0);
const caster = (s, school) => (s.sp || 0) + (s[school] || 0) + (s.int || 0) * .6 + (s.scrit || 0) * 12 + (s.shit || 0) * 12;
const WEIGHT = {
  WARRIOR: (s, d) => offensive(s, d, { str: 2, agi: 1 }) + (s.sta || 0) * 1.5,
  PALADIN: (s, d) => offensive(s, d, { str: 2, agi: 1 }) + (s.sta || 0) * 1.5 + (s.int || 0) * .6,
  HUNTER: (s, d) => offensive(s, d, { str: 0, agi: 2.4, rap: 1 }) + (s.sta || 0) * 1.5 + (s.int || 0) * .5,
  ROGUE: (s, d) => offensive(s, d, { str: 1, agi: 2 }) + (s.sta || 0) * 1.5,
  PRIEST: (s) => caster(s, 'sshadow') + (s.sta || 0) * 2.5 + (s.spi || 0) * .4,
  SHAMAN: (s, d) => offensive(s, d, { str: 2, agi: 1 }) + (s.sta || 0) * 1.5 + (s.int || 0) * .8 + (s.sp || 0) * .6,
  MAGE: (s) => caster(s, 'sfrost') + (s.sta || 0) * 2.5,
  WARLOCK: (s) => caster(s, 'sshadow') + (s.sta || 0) * 2.5,
  DRUID: (s) => offensive({ ...s, hit: s.hit, crit: s.crit }, null, { str: 2, agi: 2.4, fap: 1 }) + (s.sta || 0) * 1.5 + (s.int || 0) * .3,
};

export function rand(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

export const isTwoHand = (pool, id) => !!id && pool.items[id][3] === 17;
export const worth = (pool, cls, id) => { const it = pool.items[id]; return WEIGHT[cls](it[7], it[8]); };

export function offers(pool, cls, slot, tiers, picks = {}) {
  const tree = pool.pools[cls][POOL_OF[slot] || slot] || {};
  if (slot === 'off' && TWO_HAND[cls]) return [];
  let ids = tiers.flatMap((t) => tree[t] || []);
  if (slot === 'off' && DUAL[cls]) ids = [...ids, ...tiers.flatMap((t) => (pool.pools[cls].main || {})[t] || [])].filter((i) => pool.items[i][3] === 13 || pool.items[i][3] === 22 || pool.items[i][3] === 21);
  if (slot === 'main' && TWO_HAND[cls]) ids = ids.filter((i) => pool.items[i][3] === 17);
  if (slot === 'main' && DUAL[cls]) ids = ids.filter((i) => pool.items[i][3] !== 17);
  const names = new Set(Object.entries(picks).filter(([s, i]) => s !== slot && i).map(([, i]) => pool.items[i][0]));
  return [...new Set(ids)].filter((i) => !names.has(pool.items[i][0]));
}

const MELEE_VALUE = { str: 2, agi: 1.6, ap: 1, rap: 1, fap: .5, hit: 22, crit: 26 }, SPELL_VALUE = { sp: 1, heal: 1, sfire: .8, sfrost: .8, sshadow: .8, sarcane: .8, snature: .8, sholy: .8, scrit: 14, shit: 16, mp5: 2 }, HYBRID = new Set(['PALADIN', 'SHAMAN', 'HUNTER', 'DRUID']), STYLE_FIT = .6;

export function fits(pool, cls, id) {
  const it = pool.items[id], value = (table) => Object.entries(it[7]).reduce((sum, [k, n]) => sum + (table[k] || 0) * n, 0), caster = PRESETS[cls].kind === 'caster';
  const int = (it[7].int || 0) * .5, melee = value(MELEE_VALUE) + (caster || HYBRID.has(cls) ? 0 : 0), spell = value(SPELL_VALUE) + (caster ? int : HYBRID.has(cls) ? 0 : int);
  const own = caster ? spell : melee, rival = caster ? melee : spell;
  return own > 0 ? own >= rival * STYLE_FIT : rival === 0;
}

export function suited(pool, cls, ids) {
  const good = ids.filter((id) => fits(pool, cls, id));
  return good.length ? good : ids;
}

export function gear(pool, cls, tiers, seed, choose = 3) {
  const r = rand(seed), picks = {};
  for (const slot of SLOTS) {
    const ids = suited(pool, cls, offers(pool, cls, slot, tiers, picks));
    if (!ids.length || (slot === 'off' && isTwoHand(pool, picks.main))) continue;
    const offer = Array.from({ length: choose }, () => ids[Math.floor(r() * ids.length)]);
    picks[slot] = offer.sort((a, b) => worth(pool, cls, b) - worth(pool, cls, a))[0];
  }
  return picks;
}

export function mixed(pool, cls, seed, n, tier) {
  const base = gear(pool, cls, ['g'], seed), best = gear(pool, cls, tier, seed + 1), keys = Object.keys(best);
  for (let i = 0; i < n; i++) { const k = keys[(seed + i * 5) % keys.length]; if (!Object.values(base).includes(best[k])) base[k] = best[k]; }
  return base;
}

const weaponOf = (pool, id) => {
  const d = id && pool.items[id] && pool.items[id][8];
  return d && d.delay ? { min: d.min, max: d.max, speed: d.delay / 1000 } : null;
};

export function statsOf(pool, cls, picks) {
  const s = sheet(pool, cls, PRESETS[cls].build, picks);
  return { ...s.now, sp: Math.max(s.schoolDmg || 0, s.now.sp || 0) };
}

export function side(pool, cls, picks, plan, ref) {
  return { cls, stats: statsOf(pool, cls, picks), plan: PLANS[cls][plan], ref, main: weaponOf(pool, picks.main), off: weaponOf(pool, picks.off), bow: weaponOf(pool, picks.ranged) };
}

export function references(pool) {
  return Object.fromEntries(CLASSES.map((c) => {
    const sets = Array.from({ length: 40 }, (_, i) => gear(pool, c, ['g'], 500 + i)), list = sets.map((p) => statsOf(pool, c, p)), avg = {};
    for (const k of Object.keys(list[0])) avg[k] = list.reduce((s, x) => s + (x[k] || 0), 0) / list.length;
    const weapons = sets.map((p) => weaponOf(pool, p.main)).filter(Boolean);
    const bows = sets.map((p) => weaponOf(pool, p.ranged)).filter(Boolean), mean = (l) => (l.length ? l.reduce((s, w) => s + (w.min + w.max) / 2 / w.speed, 0) / l.length : 0);
    avg.wdps = mean(weapons);
    avg.bdps = mean(bows);
    return [c, avg];
  }));
}
