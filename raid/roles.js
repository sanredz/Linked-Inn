import { BUILDS, gearStats, sheet, simulate } from '../draft/core.js';

const BASE_HP = { WARRIOR: 1689, PALADIN: 1381, HUNTER: 1467, ROGUE: 1523, PRIEST: 1387, SHAMAN: 1280, MAGE: 1360, WARLOCK: 1414, DRUID: 1483 };
const AGI_DODGE = { WARRIOR: 20, PALADIN: 19.8, HUNTER: 52.9, ROGUE: 29, PRIEST: 20, SHAMAN: 19.7, MAGE: 19.5, WARLOCK: 20, DRUID: 20 };
const REGEN = { PRIEST: [12.5, 4], PALADIN: [15, 5], DRUID: [15, 5], SHAMAN: [17, 5] };
const RANGED = new Set(['HUNTER', 'MAGE', 'WARLOCK', 'PRIEST']);
const CAST = /^(moon|ele|shadow|shadowd|shock)$/;

export const TANKS = {
  WARRIOR: { name: 'Protection', blurb: 'The best against heavy hitters: blocks, parries and Shield Wall. Needs Defense, or crits and crushing blows will flatten him.', taken: .9, armor: 1.1, def: 10, block: 15, parry: 0, shield: 1, wall: { below: .25, taken: .5, dur: 10 }, threat: 1.35 },
  PALADIN: { name: 'Protection', blurb: 'Picks the aura the raid needs, from Fire Resistance to Devotion, and has one Lay on Hands to reset a bad fight. Needs Defense too.', taken: .84, armor: 1.1, flatArmor: 735, def: 10, block: 18, parry: 0, shield: 1, hands: { below: .2 }, threat: 1.5 },
  DRUID: { name: 'Feral (Bear)', blurb: 'A mountain of health that shrugs off magic. Agility replaces Defense, but with no block or parry, big hits always crush.', taken: .85, armor: 5, sta: 1.6, def: 0, dodge: 3, critTaken: -3, regen: { below: .3, hp: .3, dur: 10 }, threat: 2 },
};

export const HEALERS = {
  PRIEST: { name: 'Holy', blurb: 'The biggest single heals, and Renew to keep the tank topped up.', mana: 1, heal: 1.16, crit: 5, regen: .18, cost: .8, big: { n: 'Greater Heal', base: 1960, spread: .11, coef: .857, cast: 2.5, cost: 710 }, fast: { n: 'Flash Heal', base: 825, spread: .165, coef: .429, cast: 1.5, cost: 380 }, hot: { n: 'Renew', per: 166, ticks: 5, every: 3, coef: .2, cost: 410 } },
  PALADIN: { name: 'Holy', blurb: 'Endless mana from healing crits, but only one target at a time.', mana: 1, heal: 1.18, crit: 6, regen: .1, cost: .95, refund: .35, splash: .22, big: { n: 'Holy Light', base: 1580, spread: .1, coef: .714, cast: 2.5, cost: 660 }, fast: { n: 'Flash of Light', base: 303, spread: .1, coef: .429, cast: 1.5, cost: 140 } },
  DRUID: { name: 'Restoration', blurb: 'Rejuvenation on everyone. Great against party damage, slower in an emergency.', mana: 1, heal: 1.3, crit: 4, regen: .26, cost: .78, big: { n: 'Healing Touch', base: 2332, spread: .165, coef: 1, cast: 3, cost: 800 }, fast: { n: 'Regrowth', base: 1021, spread: .11, coef: .286, cast: 2, cost: 880 }, hot: { n: 'Rejuvenation', per: 230, ticks: 4, every: 3, coef: .25, cost: 300 } },
  SHAMAN: { name: 'Restoration', blurb: 'Chain Heal hits the whole party, and totems keep the mana flowing.', mana: 1, heal: 1.15, crit: 3, regen: .2, cost: .9, flatRegen: 9, big: { n: 'Healing Wave', base: 1615, spread: .13, coef: .857, cast: 2.5, cost: 620 }, fast: { n: 'Lesser Healing Wave', base: 820, spread: .11, coef: .429, cast: 1.5, cost: 380 }, chain: { n: 'Chain Heal', base: 490, spread: .13, coef: .714, cast: 2.5, cost: 405, jumps: [1, .5, .25] } },
};

export const TUNE = {
  tank: { WARRIOR: { taken: .865 }, PALADIN: { taken: .835 }, DRUID: { taken: .915 } },
  heal: { PALADIN: { heal: 1.07 }, PRIEST: { heal: 1.17 }, SHAMAN: { heal: 1.27 }, DRUID: { heal: 1.44 } },
  spec: { frost: 1.1, fire: 1.1, arcane: 1.1 },
};
export const TUNE3 = { tank: { WARRIOR: { taken: .8 }, PALADIN: { taken: .8 } } };
export const TUNE4 = { heal: { SHAMAN: { heal: 1.2 } } };
export const RAID_TUNE = { mc: { surv: 1.3, fury: 1.22, destro: 1.25, mut: 1.22, ret: 1.22, fire: 1.04, ele: 1.18, arms: 1.1, enh: 1.06, demo: 1.1, shock: 1.08, bm: 1.07, afflic: 1.05, combat: 1.04, shadow: 1.04 } };
const tuned = (table, role, h) => (h.v >= 2 ? { ...table[h.cls], ...TUNE[role][h.cls], ...(h.v >= 3 && TUNE3[role] && TUNE3[role][h.cls]), ...(h.v >= 4 && TUNE4[role] && TUNE4[role][h.cls]) } : table[h.cls]);

const TARGET_DPS = 285, EVENNESS = .8;
const SPEC_DPS = { shadow: 384, frost: 379, fire: 361, afflic: 360, arcane: 357, demo: 344, arms: 316, destro: 312, cat: 275, mut: 267, fury: 262, combat: 255, moon: 253, surv: 249, bm: 244, enh: 241, ret: 232, mm: 232, ele: 211, shock: 137 };
const SPEC_TUNE = { arms: 1.22, cat: 1.2, moon: 1.15, afflic: 1.18, ret: 1.05, combat: 1.05, frost: 1.03, enh: .9, bm: .92, ele: .95 };
export const specPower = (build) => (TARGET_DPS / (SPEC_DPS[build] || TARGET_DPS)) ** EVENNESS * (SPEC_TUNE[build] || 1);

export const BONUS = {
  tank: {
    WARRIOR: { n: 'Sunder Armor', text: 'Boss armor -2,250, so physical damage hits harder.', fx: { armor: 2250 } },
    PALADIN: { n: 'Fire Resistance Aura', text: '+60 Fire Resistance for the party.', all: { rfire: 60 }, once: 'rfire' },
    DRUID: { n: 'Mark of the Wild', text: '+12 to all stats and +285 armor for the party.', all: { str: 12, agi: 12, sta: 12, int: 12, spi: 12, armor: 285 } },
  },
  heal: {
    PRIEST: { n: 'Power Word: Fortitude', text: '+54 Stamina for the party.', all: { sta: 54 } },
    PALADIN: { n: 'Blessing of Kings', text: '+22 to main stats for the party.', all: { str: 22, agi: 22, sta: 22, int: 22 } },
    DRUID: { n: 'Gift of the Wild', text: '+16 to all stats and +20 to all resistances for the party.', all: { str: 16, agi: 16, sta: 16, int: 16, spi: 16, rfire: 20, rshadow: 20, rarcane: 20 } },
    SHAMAN: { n: 'Windfury Totem', text: 'Melee damage dealers hit 12% harder.', fx: { melee: 1.12 }, once: 'windfury' },
  },
  dps: {
    WARRIOR: { n: 'Battle Shout', text: '+230 Attack Power for melee.', phys: { ap: 230 } },
    PALADIN: { n: 'Blessing of Wisdom', text: 'Your healer gains 33 mana per 5.', healer: { mp5: 33 } },
    HUNTER: { n: 'Trueshot Aura', text: '+100 Attack Power for the party.', phys: { ap: 100, rap: 100 } },
    ROGUE: { n: 'Expose Armor', text: 'Boss armor -1,700. Does not stack with Sunder Armor.', fx: { armor: 1700 } },
    PRIEST: { n: 'Vampiric Embrace', text: 'Heals the party for 15% of shadow damage dealt.', fx: { leech: .15 } },
    SHAMAN: { n: 'Mana Spring Totem', text: 'Your healer gains 22 mana per 5.', healer: { mp5: 22 } },
    MAGE: { n: 'Arcane Intellect', text: '+31 Intellect for the party.', all: { int: 31 } },
    WARLOCK: { n: 'Blood Pact', text: '+42 Stamina for the party.', all: { sta: 42 } },
    DRUID: { n: 'Moonkin or Leader of the Pack', text: '+3% crit for the party.', all: { crit: 3, scrit: 3 } },
  },
};
const TOTEMS = {
  windfury: BONUS.heal.SHAMAN,
  manaspring: { n: 'Mana Spring Totem', text: 'Your healer gains 25 mana per 5.', healer: { mp5: 25 }, once: 'manaspring' },
  strength: { n: 'Strength of Earth Totem', text: '+77 Strength for the party.', all: { str: 77 }, once: 'strength' },
  grace: { n: 'Grace of Air Totem', text: '+77 Agility for the party.', all: { agi: 77 }, once: 'grace' },
  nature: { n: 'Nature Resistance Totem', text: '+60 Nature Resistance for the party.', all: { rnature: 60 }, once: 'rnature' },
  fireres: { n: 'Fire Resistance Totem', text: '+60 Fire Resistance for the party.', all: { rfire: 60 }, once: 'rfire' },
  frostres: { n: 'Frost Resistance Totem', text: '+60 Frost Resistance for the party.', all: { rfrost: 60 }, once: 'rfrost' },
};
const totems = (first) => [first, ...Object.keys(TOTEMS).filter((k) => k !== first)].map((id) => ({ id, ...TOTEMS[id] }));
export const CHOICES = {
  tank: {
    PALADIN: { label: 'Choose your aura', suggest: { zg: 'devotion' }, list: [
      { id: 'fire', ...BONUS.tank.PALADIN },
      { id: 'devotion', n: 'Devotion Aura', text: '+735 armor for the party.', all: { armor: 735 }, once: 'devotion' },
      { id: 'frost', n: 'Frost Resistance Aura', text: '+60 Frost Resistance for the party.', all: { rfrost: 60 }, once: 'rfrost' },
      { id: 'shadow', n: 'Shadow Resistance Aura', text: '+60 Shadow Resistance for the party.', all: { rshadow: 60 }, once: 'rshadow' },
    ] },
  },
  heal: { SHAMAN: { label: 'Choose your totem', list: totems('windfury') } },
  dps: { SHAMAN: { label: 'Choose your totem', list: totems('manaspring') } },
};
export const choiceOf = (role, cls) => (CHOICES[role] && CHOICES[role][cls]) || null;
export const bonusOf = (h) => { const c = h.v >= 3 && choiceOf(h.role, h.cls); return c ? c.list.find((x) => x.id === h.pick) || c.list[0] : BONUS[h.role][h.cls]; };
const BUFF_ID = 990100;
export const DEFENSE_CAP = 440, CRIT_AT_ZERO = 20;
const TOUGHNESS = .6;

export const stacks = (b, others) => !b.once || !others.some((o) => o.once === b.once);

export function partyBonuses(heroes) {
  const out = [];
  for (const h of heroes) { if (!h) continue; const b = { role: h.role, cls: h.cls, ...bonusOf(h) }; if (stacks(b, out)) out.push(b); }
  return out;
}

function stamp(pool, i, h, bonuses) {
  const stats = {}, add = (from) => { for (const [k, v] of Object.entries(from || {})) stats[k] = (stats[k] || 0) + v; };
  for (const b of bonuses) {
    add(b.all);
    if (h.role === 'dps') add(b.phys);
    if (h.role === 'heal') add(b.healer);
  }
  pool.items[BUFF_ID + i] = ['Party bonuses', 1, 1, 4, 0, 4, 0, stats, null, 0, null, null, [], 0];
  return { ...h.picks, shirt: BUFF_ID + i };
}

export function makeParty(pool, heroes, iterations = 12, extra = [], raid) {
  const bonuses = [...partyBonuses(heroes), ...extra.map((all) => ({ all }))], fx = { armor: 0, melee: 1, leech: 0 };
  for (const b of bonuses) { fx.armor = Math.max(fx.armor, (b.fx && b.fx.armor) || 0); fx.melee *= (b.fx && b.fx.melee) || 1; fx.leech += (b.fx && b.fx.leech) || 0; }
  return heroes.map((h, i) => ({ ...makeHero(pool, { ...h, picks: stamp(pool, i, h, bonuses), seed: 7, raid }, iterations), fx }));
}

export const damageBuilds = (cls) => BUILDS[cls].filter((b) => !/d$/.test(b.id) && b.id !== 'catm').map((b) => ({ id: b.id, name: b.name, blurb: b.blurb }));

const health = (cls, sta, mult = 1) => BASE_HP[cls] + Math.min(sta, 20) + Math.max(0, sta * mult - 20) * 10;

export function makeHero(pool, h, iterations = 12) {
  const gear = gearStats(pool, h.picks).stats, anyBuild = BUILDS[h.cls][0].id, base = sheet(pool, h.cls, anyBuild, h.picks).base;
  const res = { fire: gear.rfire || 0, frost: gear.rfrost || 0, nature: gear.rnature || 0, shadow: gear.rshadow || 0, arcane: gear.rarcane || 0, holy: gear.rholy || 0 };
  const out = { role: h.role, cls: h.cls, build: h.build, res, armor: (gear.armor || 0) + base.agi * 2 };
  if (h.role === 'tank') {
    const k = tuned(TANKS, 'tank', h), def = 300 + (gear.def || 0) + k.def, skill = (def - 300) * .04;
    const shield = k.shield && h.picks.off && pool.items[h.picks.off][5] === 4 && pool.items[h.picks.off][6] === 6;
    const main = h.picks.main && pool.items[h.picks.main][8], wdps = main ? (main.min + main.max) / 2 / (main.delay / 1000) : 2;
    return {
      ...out, k, hp: health(h.cls, base.sta, k.sta || 1), armor: ((gear.armor || 0) + base.agi * 2) * k.armor + (k.flatArmor || 0), def,
      miss: 5 + skill - .6, dodge: 5 + base.agi / AGI_DODGE[h.cls] + (gear.dodge || 0) + (k.dodge || 0) + skill - .6, parry: h.cls === 'DRUID' ? 0 : 5 + k.parry + (gear.parry || 0) + skill - .6,
      block: shield ? 5 + k.block + (gear.block || 0) + skill - .6 : 0, blockValue: shield ? (gear.blockValue || 0) + base.str / 20 : 0, critTaken: Math.max(0, CRIT_AT_ZERO * (1 - (def + (h.cls === 'DRUID' ? base.agi * TOUGHNESS : 0) - 300) / (DEFENSE_CAP - 300)) + (k.critTaken || 0)),
      dps: (h.cls === 'DRUID' ? (54 + base.ap / 14 * 2.5) / 2.5 * 1.1 : (wdps + base.ap / 14) * .9) * k.threat * (1 + (gear.crit || 0) * .012) * (1 + Math.min(gear.hit || 0, 9) * .015), log: null,
    };
  }
  if (h.role === 'heal') {
    const k = tuned(HEALERS, 'heal', h), [r0, r1] = REGEN[h.cls];
    return {
      ...out, k, hp: health(h.cls, base.sta), mana: base.mana, heal: (gear.heal || 0) + (h.cls === 'PRIEST' ? base.spi * .25 : 0), crit: (gear.scrit || 0) + base.scrit + k.crit,
      regen: ((r0 + base.spi / r1) / 2 + (gear.mp5 || 0) / 5 + (k.flatRegen || 0)), castRegen: k.regen,
    };
  }
  const run = simulate(pool, h.cls, h.build, h.picks, h.seed || 1, iterations, true);
  const power = specPower(h.build) * ((h.v >= 2 && TUNE.spec[h.build]) || 1) * ((h.v >= 5 && RAID_TUNE[h.raid] && RAID_TUNE[h.raid][h.build]) || 1);
  return { ...out, hp: health(h.cls, base.sta), power, dps: run.dps * power, log: run.log, by: run.by, melee: !RANGED.has(h.cls) && !CAST.test(h.build) && !['fire', 'frost', 'arcane', 'afflic', 'demo', 'destro'].includes(h.build) };
}

export const roleOf = (hero) => hero.role;
