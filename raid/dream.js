import { hash, rng } from '../draft/core.js?v=20261127173000';

const NATURE = 'nature', SHADOW = 'shadow', ARCANE = 'arcane', PHYS = 'phys';

const breath = { n: 'Noxious Breath', first: 9, every: [11, 13], school: NATURE, dmg: [850, 1050], to: 'melee', dot: { n: 'Noxious Breath', per: 260, every: 2, ticks: 4, school: NATURE } };
export const BALANCE = { tank: { WARRIOR: 1.4, PALADIN: 0.79, DRUID: 0.813 }, heal: { PRIEST: 1.812, PALADIN: 0.836, DRUID: 0.911, SHAMAN: 1.051 }, dps: { arms: 0.905, fury: 0.822, ret: 1.117, shock: 0.761, bm: 0.854, mm: 0.791, surv: 0.887, mut: 0.854, combat: 0.747, shadow: 0.665, ele: 0.732, enh: 0.854, fire: 0.549, frost: 0.539, arcane: 0.489, afflic: 0.528, demo: 0.628, destro: 0.571, moon: 0.549, cat: 0.791 } };
const thirds = (a) => [.75, .5, .25].map((below) => ({ ...a, below, once: true }));

export const DRAGONS = {
  ysondre: {
    id: 'ysondre', name: 'Ysondre', short: 'Ysondre', title: 'Dragon of Nightmare', zone: 'The Emerald Dream', color: '#5dff9a', glow: '#1fbf6a', portrait: 'assets/raid/dream/ysondre.webp',
    trait: 'Lightning and the lost druids', blurb: 'Lightning arcs through the whole party, and each time she falters the lost druids of the Dream rise to fight for her.',
    health: 2840000, armor: 4691, resist: { nature: 50, fire: -50 }, weakTo: 'fire', res: 'nature', melee: [1250, 1650, 2.1], supreme: 150, balance: BALANCE, tune: 0.91,
    favour: 'Nature Resistance, party healing (Chain Heal, Rejuvenation) and fire damage.',
    know: [
      { n: 'Lightning Wave', icon: 136015, text: 'Nature lightning jumps through the whole party every few seconds. Nature Resistance softens every bolt.' },
      { n: 'Demented Druids', icon: 136057, text: 'At 75%, 50% and 25% her lost druids join the fight and rain Moonfire on everyone for 12 seconds. Healers who heal many at once shine.' },
      { n: 'Noxious Breath', icon: 136016, text: 'Nature breath on the tank and melee, with poison left behind.' },
      { n: 'Sleep', icon: 136090, text: 'Puts your healer to sleep for a few seconds.' },
      { n: 'Weak to fire', icon: 135812, text: 'Fire damage hits her 12% harder. She resists nature (12% less).' },
    ],
    abilities: [
      { n: 'Lightning Wave', first: 5, every: [8, 10], school: NATURE, dmg: [980, 1180], to: 'party' },
      breath,
      { n: 'Sleep', first: 18, every: [24, 28], control: 'heal', dur: 3.5 },
      ...thirds({ n: 'Demented Druids', tick: { n: 'Moonfire', every: 2, dmg: [520, 640], school: ARCANE, to: 'party' }, dur: 12 }),
    ],
  },
  lethon: {
    id: 'lethon', name: 'Lethon', short: 'Lethon', title: 'Dragon of Nightmare', zone: 'The Emerald Dream', color: '#b49cff', glow: '#6b4cd6', portrait: 'assets/raid/dream/lethon.webp',
    trait: 'Shadow, and spirits that feed him', blurb: 'Shadow whirls off him in waves. When he draws out your spirits, they drift back to him and heal his wounds.',
    health: 2780000, armor: 4691, resist: { shadow: 50, holy: -50 }, weakTo: 'holy', res: 'shadow', melee: [1250, 1650, 2.1], supreme: 150, balance: BALANCE, tune: 0.862,
    favour: 'Shadow Resistance, burst damage before he heals, and holy damage.',
    know: [
      { n: 'Shadow Bolt Whirl', icon: 136197, text: 'Shadow bolts hit the whole party in waves. Shadow Resistance from gear, auras and potions softens them.' },
      { n: 'Draw Spirit', icon: 136187, text: 'At 75%, 50% and 25% he stuns the party and pulls their spirits out. Each spirit that reaches him heals him. Hit hard to outrun it.' },
      { n: 'Noxious Breath', icon: 136016, text: 'Nature breath on the tank and melee, with poison left behind.' },
      { n: 'Sleep', icon: 136090, text: 'Puts your damage dealer to sleep for a few seconds.' },
      { n: 'Weak to holy', icon: 135920, text: 'Holy damage hits him 12% harder. He resists shadow (12% less).' },
    ],
    abilities: [
      { n: 'Shadow Bolt Whirl', first: 6, every: [8, 10], school: SHADOW, dmg: [960, 1160], to: 'party' },
      breath,
      { n: 'Sleep', first: 20, every: [24, 28], control: 'dps', dur: 3.5 },
      ...thirds({ n: 'Draw Spirit', school: SHADOW, dmg: [350, 450], to: 'party', stun: 2.5 }),
      ...thirds({ n: 'Spirit Shades', mend: .045 }),
    ],
  },
  emeriss: {
    id: 'emeriss', name: 'Emeriss', short: 'Emeriss', title: 'Dragon of Nightmare', zone: 'The Emerald Dream', color: '#d6ff5a', glow: '#7fbf1f', portrait: 'assets/raid/dream/emeriss.webp',
    trait: 'Rot that eats your health', blurb: 'Her infection spreads from hero to hero, and when she is hurt the earth itself rots under your feet.',
    health: 2800000, armor: 4691, resist: { nature: 50, frost: -50 }, weakTo: 'frost', res: 'nature', melee: [1250, 1650, 2.1], supreme: 150, balance: BALANCE, tune: 0.94,
    favour: 'Stamina and big health pools, healing over time, and frost damage.',
    know: [
      { n: 'Corruption of the Earth', icon: 132108, text: 'At 75%, 50% and 25% everyone loses 5% of their maximum health every 2 seconds for 10 seconds. Big health pools and healing over time carry you through.' },
      { n: 'Volatile Infection', icon: 132100, text: 'A nature disease on a random hero that keeps eating their health.' },
      { n: 'Noxious Breath', icon: 136016, text: 'Nature breath on the tank and melee, with poison left behind.' },
      { n: 'Sleep', icon: 136090, text: 'Puts your healer to sleep for a few seconds.' },
      { n: 'Weak to frost', icon: 135846, text: 'Frost damage hits her 12% harder. She resists nature (12% less).' },
    ],
    abilities: [
      { n: 'Volatile Infection', first: 4, every: [9, 11], school: NATURE, dmg: [520, 640], to: 'random', dot: { n: 'Volatile Infection', per: 330, every: 2, ticks: 6, school: NATURE } },
      breath,
      { n: 'Sleep', first: 18, every: [24, 28], control: 'heal', dur: 3.5 },
      ...thirds({ n: 'Corruption of the Earth', to: 'party', dot: { n: 'Corruption of the Earth', pct: .05, every: 2, ticks: 5, school: NATURE } }),
    ],
  },
  taerar: {
    id: 'taerar', name: 'Taerar', short: 'Taerar', title: 'Dragon of Nightmare', zone: 'The Emerald Dream', color: '#7fd8ff', glow: '#2f8fd6', portrait: 'assets/raid/dream/taerar.webp',
    trait: 'Fear, arcane, and his shades', blurb: 'His roar scatters your party and his arcane blasts land hard. When he is hurt he fades away and leaves his shades to tear at your tank.',
    health: 2560000, armor: 4691, resist: { arcane: 50, shadow: -50 }, weakTo: 'shadow', res: 'arcane', melee: [1250, 1650, 2.1], supreme: 150, balance: BALANCE, tune: 1.076,
    favour: 'A sturdy tank with armor and avoidance, Arcane Resistance, and shadow damage.',
    know: [
      { n: 'Shades of Taerar', icon: 136221, text: 'At 75%, 50% and 25% he vanishes for 8 seconds and three shades maul your tank. Nobody can hurt him while he is gone. Armor, dodge and parry matter.' },
      { n: 'Bellowing Roar', icon: 136184, text: 'Fears your healer and damage dealer for a few seconds.' },
      { n: 'Arcane Blast', icon: 135731, text: 'Heavy arcane damage on a random hero. Arcane Resistance softens it.' },
      { n: 'Noxious Breath', icon: 136016, text: 'Nature breath on the tank and melee, with poison left behind.' },
      { n: 'Weak to shadow', icon: 136197, text: 'Shadow damage hits him 12% harder. He resists arcane (12% less).' },
    ],
    abilities: [
      { n: 'Arcane Blast', first: 5, every: [7, 9], school: ARCANE, dmg: [1350, 1650], to: 'random' },
      breath,
      { n: 'Bellowing Roar', first: 16, every: [22, 26], fear: 1, dur: 3 },
      ...thirds({ n: 'Shades of Taerar', boss: { vanish: 1 }, dur: 8, tick: { n: 'Shades of Taerar', every: 1.4, dmg: [700, 900], school: PHYS, to: 'tank' } }),
    ],
  },
};

export const DRAGON_IDS = Object.keys(DRAGONS);
export const dragonOf = (seed) => DRAGON_IDS[Number.isInteger(seed) ? rng(hash(seed, 'dragon'))() * DRAGON_IDS.length | 0 : 0];

export const DREAM_START = 1795789800000;
export const TREES = [
  { id: 'seradane', bit: 1, name: 'Seradane', zone: 'The Hinterlands', icon: 132123, mode: 'Trial I', need: 'The Veiled Dream', times: 2 },
  { id: 'bough', bit: 2, name: 'Dream Bough', zone: 'Feralas', icon: 136074, mode: 'Trial II', need: 'Overgrowth', times: 2 },
  { id: 'shadow', bit: 4, name: 'Bough Shadow', zone: 'Ashenvale', icon: 136041, mode: 'Trial III', need: 'Fading Paths', times: 2 },
  { id: 'twilight', bit: 8, name: 'Twilight Grove', zone: 'Duskwood', icon: 136223, mode: 'Trial IV', need: 'The Shade Takes First', times: 1 },
];
export const DREAM_ALL = 15;
export const VISIONS = [
  'A green mist at the edge of sleep. Far away, someone is calling the dreamers.',
  'Ysera\'s voice, faint and frightened: the Dream is sick, and her chosen do not answer.',
  'Four trees, four doors. Something with wings is walking out of them.',
  'They are waiting at the last door. Wake the trees and step through.',
];
export const AWAKE = 'The four Great Trees are awake. The Dream is open.';

export function dreamOf(src = {}, granted = 0, since = 0, forged = 0) {
  const from = Math.max(since, DREAM_START), at = {}, echo = {}, need = Object.fromEntries(TREES.map((t) => [t.id, t.times]));
  for (const r of [...(src.wakes || [])].sort((a, b) => (a.at || 0) - (b.at || 0))) if ((r.at || 0) >= from && need[r.tree] && !at[r.tree]) { echo[r.tree] = (echo[r.tree] || 0) + 1; if (echo[r.tree] >= need[r.tree]) at[r.tree] = r.at || 1; }
  const trees = {};
  for (const t of TREES) { trees[t.id] = at[t.id] || (granted & t.bit ? 1 : 0); if (trees[t.id]) echo[t.id] = t.times; }
  const steps = TREES.filter((t) => trees[t.id]).length;
  return { trees, echo, steps, ready: steps === TREES.length ? 1 : 0, forged: forged || 0 };
}
export const nextTree = (a) => TREES.find((t) => !a.trees[t.id]);
