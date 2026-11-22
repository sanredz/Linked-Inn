import { hash, rng } from '../draft/core.js';
import { RAIDS } from './bosses.js';

export const CONSUME_START = 1795329976802;
export const CAP = 5;
export const DROP_CHANCE = .06;
export const TIER_ROLL = [['minor', .6], ['major', .3], ['superior', .1]];
export const TIERS = { minor: { name: 'Minor', color: '#1eff00' }, major: { name: 'Major', color: '#3a9bff' }, superior: { name: 'Superior', color: '#b45cff' } };

const FITS = {
  any: () => true,
  dps: (h) => h.role === 'dps',
  heal: (h) => h.role === 'heal',
};
const NOPE = { dps: 'Only for damage dealers', heal: 'Only for healers' };

export const CONSUMABLES = [
  { id: 990401, raid: 'mc', tier: 'minor', name: 'Juju Might', icon: 134309, fit: 'dps', power: 1.01, line: '+1% damage' },
  { id: 990402, raid: 'mc', tier: 'major', name: 'Elemental Sharpening Stone', icon: 135228, fit: 'dps', power: 1.015, line: '+1.5% damage' },
  { id: 990403, raid: 'mc', tier: 'superior', name: 'Flask of Supreme Power', icon: 134821, fit: 'dps', power: 1.02, line: '+2% damage' },
  { id: 990404, raid: 'zg', tier: 'minor', name: 'Nightfin Soup', icon: 132804, fit: 'heal', heal: 1.03, stats: { mp5: 4 }, line: '+3% healing, +4 mana every 5 sec' },
  { id: 990405, raid: 'zg', tier: 'major', name: 'Mageblood Potion', icon: 134825, fit: 'heal', heal: 1.05, stats: { mp5: 6 }, line: '+5% healing, +6 mana every 5 sec' },
  { id: 990406, raid: 'zg', tier: 'superior', name: 'Spirit of Zanza', icon: 134810, fit: 'heal', heal: 1.07, stats: { mp5: 8 }, line: '+7% healing, +8 mana every 5 sec' },
  { id: 990407, raid: 'aq20', tier: 'minor', name: 'Elixir of Fortitude', icon: 134823, fit: 'any', stats: { sta: 18 }, line: '+18 Stamina (+180 health)' },
  { id: 990408, raid: 'aq20', tier: 'major', name: 'Greater Shadow Protection Potion', icon: 134803, fit: 'any', stats: { rshadow: 35 }, line: '+35 shadow resistance' },
  { id: 990409, raid: 'aq20', tier: 'superior', name: 'Flask of the Titans', icon: 134842, fit: 'any', stats: { sta: 30, rshadow: 15 }, line: '+30 Stamina (+300 health), +15 shadow resistance' },
];
export const CONSUMABLE = Object.fromEntries(CONSUMABLES.map((c) => [c.id, c]));

export const SOURCES = { mc: { mid: 5, final: 9 }, zg: { mid: 5, final: 9 }, aq20: { mid: 3, final: 5 } };
export const bossName = (raid, i) => RAIDS[raid].bosses[i].name;

export const fits = (c, hero) => !!(c && hero && FITS[c.fit](hero));
export const whyNot = (c) => NOPE[c.fit] || '';

export function consumeDrops(raid, kills, seed) {
  const src = SOURCES[raid];
  if (!src || !Number.isInteger(seed)) return [];
  const out = [];
  for (const at of ['mid', 'final']) {
    const i = src[at], reached = at === 'final' ? kills === i : kills > i;
    if (!reached) continue;
    const r = rng(hash(seed, 'consume', raid, at));
    if (r() >= DROP_CHANCE) continue;
    let tier = 'minor';
    if (at === 'final') { const x = r(); let acc = 0; for (const [t, p] of TIER_ROLL) { acc += p; if (x < acc) { tier = t; break; } } }
    const c = CONSUMABLES.find((k) => k.raid === raid && k.tier === tier);
    out.push({ ...c, boss: i });
  }
  return out;
}

export function satchelOf(raidRows, usedRows = [], grants = [], unsealed = 0) {
  const events = [], from = unsealed ? Math.max(CONSUME_START, unsealed) : Infinity;
  for (const r of raidRows) if ((r.at || 0) >= from) for (const c of consumeDrops(r.raid, r.kills, r.seed)) events.push([r.at, c.id, 1]);
  for (const g of grants) events.push([g.at || 0, g.item, g.n || 1]);
  for (const u of usedRows) {
    let list = u.used;
    if (typeof list === 'string') { try { list = JSON.parse(list); } catch { list = []; } }
    for (const id of list || []) if (id) events.push([u.at || 0, id, -1]);
  }
  events.sort((a, b) => a[0] - b[0] || b[2] - a[2]);
  const have = {};
  for (const [, id, d] of events) { if (!CONSUMABLE[id]) continue; have[id] = Math.max(0, Math.min(CAP, (have[id] || 0) + d)); }
  for (const id of Object.keys(have)) if (!have[id]) delete have[id];
  return have;
}

export const boostOf = (id) => (CONSUMABLE[id] && CONSUMABLE[id].stats) || null;

export function drink(party, consume) {
  if (!consume) return party;
  return party.map((h, i) => {
    const c = CONSUMABLE[consume[i]];
    if (!c) return h;
    if (c.power && h.role === 'dps') return { ...h, power: h.power * c.power, dps: h.dps * c.power };
    if (c.heal && h.role === 'heal') return { ...h, k: { ...h.k, heal: h.k.heal * c.heal } };
    return h;
  });
}

export function checkUse(list, heroes, have) {
  if (list == null) return [0, 0, 0];
  if (!Array.isArray(list) || list.length > 3) return null;
  const out = [0, 0, 0], need = {};
  for (let i = 0; i < 3; i++) {
    const id = list[i] || 0;
    if (!id) continue;
    const c = CONSUMABLE[id];
    if (!c || !fits(c, heroes[i])) return null;
    need[id] = (need[id] || 0) + 1;
    out[i] = id;
  }
  for (const [id, n] of Object.entries(need)) if ((have[id] || 0) < n) return null;
  return out;
}
