export const VERSION = 1;
export const FIGHT = 120;
export const ROUNDS = 16;
export const SLOTS = [
  ['head', 'Head'], ['neck', 'Neck'], ['shoulder', 'Shoulder'], ['back', 'Back'], ['chest', 'Chest'], ['wrist', 'Wrist'],
  ['hands', 'Hands'], ['waist', 'Waist'], ['legs', 'Legs'], ['feet', 'Feet'], ['finger1', 'Ring'], ['finger2', 'Ring'],
  ['trinket1', 'Trinket'], ['trinket2', 'Trinket'], ['main', 'Main Hand'], ['off', 'Off Hand'], ['ranged', 'Ranged'],
];
const POOL_OF = { finger1: 'finger', finger2: 'finger', trinket1: 'trinket', trinket2: 'trinket' };
const TIERS = [['l', .012], ['t', .17], ['e', .15], ['c', .13], ['b', .29], ['g', .248]];
export const TIER_NAME = { l: 'Legendary', t: 'Tier set', e: 'Epic', c: 'Crafted', b: 'Rare', g: 'Uncommon' };
const TIER_FULL = 10;
const DUAL = new Set(['WARRIOR', 'ROGUE', 'HUNTER']);
export const CLASS_NAME = { WARRIOR: 'Warrior', PALADIN: 'Paladin', HUNTER: 'Hunter', ROGUE: 'Rogue', PRIEST: 'Priest', SHAMAN: 'Shaman', MAGE: 'Mage', WARLOCK: 'Warlock', DRUID: 'Druid' };
export const CLASS_COLOR = { WARRIOR: '#c79c6e', PALADIN: '#f58cba', HUNTER: '#abd473', ROGUE: '#fff569', PRIEST: '#ffffff', SHAMAN: '#0070de', MAGE: '#69ccf0', WARLOCK: '#9482c9', DRUID: '#ff7d0a' };

const BASE = {
  WARRIOR: { str: 120, agi: 80, sta: 110, int: 30, spi: 45, mana: 0, meleeCrit: 20, spellCrit: 0, ap: 160, str2: 2, agi2: 0, crit: 5, scrit: 0 },
  PALADIN: { str: 105, agi: 65, sta: 100, int: 65, spi: 70, mana: 1500, meleeCrit: 20, spellCrit: 54, ap: 160, str2: 2, agi2: 0, crit: 5, scrit: 3.5 },
  HUNTER: { str: 60, agi: 130, sta: 95, int: 60, spi: 65, mana: 1700, meleeCrit: 53, spellCrit: 60, ap: 100, str2: 1, agi2: 1, rap: 110, crit: 5, scrit: 0 },
  ROGUE: { str: 85, agi: 130, sta: 75, int: 35, spi: 50, mana: 0, meleeCrit: 29, spellCrit: 0, ap: 100, str2: 1, agi2: 1, crit: 5, scrit: 0 },
  PRIEST: { str: 35, agi: 40, sta: 50, int: 120, spi: 130, mana: 1400, meleeCrit: 20, spellCrit: 59, ap: 0, str2: 1, agi2: 0, crit: 3, scrit: .8 },
  SHAMAN: { str: 85, agi: 50, sta: 95, int: 90, spi: 100, mana: 1500, meleeCrit: 20, spellCrit: 59, ap: 100, str2: 2, agi2: 0, crit: 5, scrit: 2.3 },
  MAGE: { str: 30, agi: 35, sta: 45, int: 125, spi: 120, mana: 1300, meleeCrit: 20, spellCrit: 60, ap: 0, str2: 1, agi2: 0, crit: 3, scrit: .9 },
  WARLOCK: { str: 45, agi: 50, sta: 70, int: 110, spi: 115, mana: 1400, meleeCrit: 20, spellCrit: 60, ap: 0, str2: 1, agi2: 0, crit: 3, scrit: 1.7 },
  DRUID: { str: 70, agi: 55, sta: 70, int: 100, spi: 110, mana: 1300, meleeCrit: 20, spellCrit: 60, ap: 100, str2: 2, agi2: 0, crit: 5, scrit: 1.8 },
};

const TARGET_ARMOR = 2000;
const MANA_COST = .55;
const PHYSICAL = 1.2;
const DW_MISS = 19, GLANCE = 40, CRIT_AURA = 3, SPELL_MISS = 17, SPELL_RESIST = .94, PROC_PPM = 1.5, BASE_SKILL = 300, BOSS_DEFENSE = 315;

const melee = (o) => ({ kind: 'melee', ...o });
const ranged = (o) => ({ kind: 'ranged', ...o });
const caster = (o) => ({ kind: 'caster', ...o });

export const BUILDS = {
  WARRIOR: [
    { id: 'ms', name: 'Arms', split: '33/18/0', blurb: "Mortal Strike and Whirlwind with a two-hander.", talents: [105941, 105947, 105948, 105950, 105944, 105939], wants: '2H', kit: melee({ res: 'rage', crit: 7, critMult: .2, dmg: { two: 1.03 }, deep: .2,
      abilities: [{ n: 'Mortal Strike', weapon: 1, flat: 160, cost: 30, cd: 6 }, { n: 'Whirlwind', weapon: 1, flat: 0, cost: 25, cd: 10 }, { n: 'Heroic Strike', queue: 1, flat: 157, cost: 13, above: 55 }] }) },
    { id: 'bt', name: 'Fury', split: '17/34/0', blurb: "Two weapons, Flurry and Bloodthirst.", talents: [105930, 105928, 105933, 105939, 105927, 105977], kit: melee({ res: 'rage', crit: 5, flurry: .15, offMult: .75, ohHit: 10,
      abilities: [{ n: 'Death Wish', buff: { dmg: .2 }, dur: 30, cd: 180, free: 1, cost: 10 }, { n: 'Bloodthirst', ap: .35, flat: 200, cost: 30, cd: 6 }, { n: 'Whirlwind', weapon: 1, both: 1, cost: 25, cd: 10 }, { n: 'Heroic Strike', queue: 1, flat: 157, cost: 12, above: 60 }] }) },
    { id: 'slam', name: 'Protection', split: '5/15/31', blurb: "Shield Slam and Revenge. 10% more damage with a shield equipped.", talents: [105959, 105962, 105961, 105939], wants: 'shield', kit: melee({ res: 'rage', crit: 5, shieldDmg: 1.1,
      abilities: [{ n: 'Shield Slam', flat: 430, ap: .12, cost: 17, cd: 6, needShield: 1, school: 'phys', noWeapon: 1 }, { n: 'Revenge', flat: 170, cost: 5, cd: 5, noWeapon: 1 }, { n: 'Heroic Strike', queue: 1, flat: 157, cost: 12, above: 40 }] }) },
  ],
  PALADIN: [
    { id: 'ret', name: 'Retribution', split: '10/5/36', blurb: "Seal of Command, Holy Strike and Judgement with a two-hander.", talents: [105696, 105700, 105697, 105693, 105703, 110882], wants: '2H', kit: melee({ res: 'mana', crit: 5, dmg: { two: 1.06, all: 1.1 }, spFromInt: .5, seal: { p: .28, weapon: .7 },
      abilities: [{ n: 'Judgement', flat: 240, sp: .43, school: 'holy', cost: 80, cd: 9, instant: 1 }, { n: 'Holy Strike', weapon: 1, flat: 120, cost: 110, cd: 6, mult: 1.2 }, { n: 'Consecration', dot: { ticks: 8, every: 1, dmg: 48, sp: .042 }, school: 'holy', cost: 260, cd: 8 }] }) },
    { id: 'shock', name: 'Holy', split: '36/0/15', blurb: "Holy Shock, Exorcism and Consecration. Scales with spell damage.", talents: [105323, 105321, 105324, 105320, 105334], kit: caster({ res: 'mana', scrit: 9, shit: 9, school: 'holy', dmg: { all: 1.09 }, swing: 1,
      abilities: [{ n: 'Holy Shock', base: [640, 700], sp: .43, cost: 230, cd: 7, school: 'holy', crit: 15 }, { n: 'Exorcism', base: [505, 565], sp: .43, cost: 190, cd: 12, school: 'holy' }, { n: 'Judgement', flat: 240, sp: .43, school: 'holy', cost: 80, cd: 9, instant: 1 }, { n: 'Holy Wrath', base: [490, 576], sp: .19, cost: 300, cd: 30, cast: 2, school: 'holy' }, { n: 'Consecration', dot: { ticks: 8, every: 1, dmg: 48, sp: .042 }, school: 'holy', cost: 260, cd: 8 }] }) },
    { id: 'guard', name: 'Protection', split: '5/36/10', blurb: "One-hander and shield with Holy Shield and Seal of Righteousness.", talents: [105628, 105629, 105638, 105625], wants: 'shield', kit: melee({ res: 'mana', hit: 3, crit: 0, dmg: { one: 1.06 }, seal: { p: 1, flat: 32, sp: .09 }, shieldDmg: 1.04,
      abilities: [{ n: 'Holy Shield', flat: 150, sp: .05, ticks: 4, school: 'holy', cost: 135, cd: 10, needShield: 1 }, { n: 'Judgement', flat: 240, sp: .43, school: 'holy', cost: 80, cd: 9, instant: 1 }, { n: 'Holy Strike', weapon: 1, flat: 100, cost: 110, cd: 6 }] }) },
  ],
  HUNTER: [
    { id: 'mm', name: 'Marksmanship', split: '5/36/10', blurb: "Aimed Shot, Multi-Shot and Arcane Shot. Damage comes from the ranged weapon.", talents: [104997, 104998, 105002, 105001, 105011], wants: 'ranged', kit: ranged({ res: 'mana', crit: 5, critMult: .3, dmg: { ranged: 1.05 },
      abilities: [{ n: 'Aimed Shot', weapon: 1, flat: 600, cost: 310, cd: 6, cast: 2.5, mult: 1.15 }, { n: 'Multi-Shot', weapon: 1, flat: 150, cost: 230, cd: 10, mult: 1.15 }, { n: 'Arcane Shot', flat: 183, rap: .15, cost: 225, cd: 4.5 }, { n: 'Serpent Sting', dot: { ticks: 5, every: 3, dmg: 110, rap: .02 }, cost: 215, cd: 15, mult: 1.3, school: 'nature' }] }) },
    { id: 'bm', name: 'Beast Mastery', split: '36/15/0', blurb: "Pet and Bestial Wrath with Auto Shot. Ranged attack power scales the pet.", talents: [104961, 104962, 104969, 104975, 104966], wants: 'ranged', kit: ranged({ res: 'mana', crit: 0, dmg: { all: 1.04 }, pet: { dps: 48, rap: .055, mult: 1.15 }, haste: 15,
      abilities: [{ n: 'Bestial Wrath', buff: { pet: .5 }, dur: 18, cd: 120, free: 1, cost: 0 }, { n: 'Multi-Shot', weapon: 1, flat: 150, cost: 230, cd: 10 }, { n: 'Arcane Shot', flat: 183, rap: .15, cost: 225, cd: 6 }, { n: 'Serpent Sting', dot: { ticks: 5, every: 3, dmg: 110, rap: .02 }, cost: 215, cd: 15, school: 'nature' }] }) },
    { id: 'surv', name: 'Survival', split: '0/15/36', blurb: "Melee hunter with two weapons. Mongoose Bite, Strider Kick and Raptor Strike.", talents: [104984, 110859, 110861, 104993, 104981], kit: melee({ res: 'mana', crit: 3, statMult: { agi: 1.15 }, critMult: .3, offMult: 1, dmg: {},
      abilities: [{ n: 'Strider Kick', weapon: 1, cost: 100, cd: 8 }, { n: 'Raptor Strike', queue: 1, flat: 140, cost: 95, cd: 6 }, { n: 'Mongoose Bite', flat: 115, ap: .2, cost: 90, cd: 5, bleed: .4 }] }) },
  ],
  ROGUE: [
    { id: 'combat', name: 'Combat', split: '19/32/0', blurb: "Sinister Strike, Slice and Dice, Blade Flurry and Adrenaline Rush.", talents: [105724, 105728, 105727, 105740, 105722], kit: melee({ res: 'energy', crit: 5, hit: 3, offMult: 1, snd: .3, poison: { p: .2, dmg: 130 }, swordProc: .05,
      abilities: [{ n: 'Adrenaline Rush', buff: { energy: 1 }, dur: 15, cd: 300, free: 1, cost: 0 }, { n: 'Blade Flurry', buff: { haste: 20 }, dur: 15, cd: 120, free: 1, cost: 20 }, { n: 'Slice and Dice', finisher: 'snd', cost: 25 }, { n: 'Eviscerate', finisher: 'evis', cost: 35, mult: 1.2 }, { n: 'Sinister Strike', weapon: 1, flat: 68, cost: 38, cp: 1, mult: 1.06 }] }) },
    { id: 'mut', name: 'Assassination', split: '36/15/0', blurb: "Mutilate with both weapons plus poisons. Stronger with daggers.", talents: [105709, 105712, 105710, 105714, 105716, 105722], wants: 'dagger', kit: melee({ res: 'energy', crit: 5, critMult: .3, offMult: .75, snd: .3, poison: { p: .34, dmg: 195 },
      abilities: [{ n: 'Cold Blood', buff: { crit: 100 }, dur: 6, cd: 180, free: 1, cost: 0 }, { n: 'Slice and Dice', finisher: 'snd', cost: 25 }, { n: 'Eviscerate', finisher: 'evis', cost: 35 }, { n: 'Mutilate', weapon: .75, flat: 85, both: 1, cost: 55, cp: 2, daggerBonus: 1.2 }] }) },
    { id: 'hemo', name: 'Subtlety', split: '15/0/36', blurb: "Hemorrhage, Ghostly Strike and Rupture. Ignores 9% of armor.", talents: [105748, 105752, 110866, 105754, 105760], kit: melee({ res: 'energy', crit: 0, offMult: .5, snd: .3, poison: { p: .2, dmg: 130 }, armorIgnore: .09,
      abilities: [{ n: 'Slice and Dice', finisher: 'snd', cost: 25 }, { n: 'Rupture', finisher: 'rup', cost: 25, mult: 1.3 }, { n: 'Ghostly Strike', weapon: 1.25, cost: 40, cd: 20, cp: 1 }, { n: 'Hemorrhage', weapon: 1, cost: 35, cp: 1, daggerBonus: 1.45 }] }) },
  ],
  PRIEST: [
    { id: 'shadow', name: 'Shadow', split: '13/0/38', blurb: "Shadowform with Mind Blast, Mind Flay and Shadow Word: Pain.", talents: [105817, 105818, 105821, 105826, 105825], kit: caster({ res: 'mana', school: 'shadow', dmg: { shadow: 1.18 }, costMult: .8,
      abilities: [{ n: 'Shadow Word: Pain', dot: { ticks: 8, every: 3, dmg: 188, sp: .183 }, cost: 470, cd: 24, school: 'shadow' }, { n: 'Mind Blast', base: [508, 537], sp: .43, cost: 350, cd: 5.5, cast: 1.5, school: 'shadow' }, { n: 'Mind Flay', channel: { ticks: 3, every: 1, dmg: 142, sp: .15 }, cost: 205, school: 'shadow', mult: 1.2 }] }) },
    { id: 'smite', name: 'Holy', split: '20/31/0', blurb: "Holy Fire and Smite. Spirit adds spell damage.", talents: [105857, 105853, 110855, 110853, 110852], kit: caster({ res: 'mana', school: 'holy', scrit: 5, shit: 9, dmg: { holy: .98 }, spFromSpi: .08,
      abilities: [{ n: 'Holy Fire', base: [530, 665], sp: .86, cost: 290, cd: 15, cast: 3, school: 'holy', dot: { ticks: 4, every: 2.5, dmg: 42, sp: .02 } }, { n: 'Smite', base: [445, 490], sp: .71, cost: 230, cast: 2, school: 'holy', mult: 1.15 }] }) },
    { id: 'penance', name: 'Discipline', split: '36/15/0', blurb: "Penance, Holy Fire and Smite with Power Infusion.", talents: [105834, 105836, 105849, 110852, 105837], kit: caster({ res: 'mana', school: 'holy', shit: 9, statMult: { int: 1.15 }, dmg: { holy: .96 },
      abilities: [{ n: 'Power Infusion', buff: { dmg: .2 }, dur: 15, cd: 120, free: 1, cost: 0 }, { n: 'Holy Fire', base: [530, 665], sp: .86, cost: 290, cd: 15, cast: 3, school: 'holy' }, { n: 'Penance', channel: { ticks: 3, every: 1, dmg: 290, sp: .26 }, tickCrit: 1, cost: 300, cd: 12, school: 'holy' }, { n: 'Smite', base: [445, 490], sp: .71, cost: 230, cast: 2, school: 'holy', mult: 1.15 }] }) },
  ],
  SHAMAN: [
    { id: 'ele', name: 'Elemental', split: '36/15/0', blurb: "Lava Burst, Lightning Bolt and Flame Shock with Lightning Overload.", talents: [104760, 104759, 104766, 104772, 104771], kit: caster({ res: 'mana', school: 'nature', scrit: 3, critMult: .5, overload: .3, dmg: { nature: 1.28, fire: 1.22 },
      abilities: [{ n: 'Flame Shock', base: [292, 292], sp: .21, dot: { ticks: 4, every: 3, dmg: 80, sp: .1 }, cost: 300, cd: 12, school: 'fire', mult: 1.15 }, { n: 'Lava Burst', base: [570, 730], sp: .86, cost: 310, cd: 8, cast: 2, school: 'fire', crit: 100 }, { n: 'Lightning Bolt', base: [419, 467], sp: .857, cost: 245, cast: 2.2, school: 'nature' }] }) },
    { id: 'enh', name: 'Enhancement', split: '5/36/10', blurb: "Windfury, Stormstrike and Earth Shock. Intellect adds Attack Power.", talents: [104743, 104747, 104755, 104740, 104753], wants: '2H', kit: melee({ res: 'mana', crit: 5, flurry: .15, apFromInt: 1, wf: { p: .2, ap: 315, mult: 1.13 },
      abilities: [{ n: 'Rage of the Farseer', buff: { haste: 30 }, dur: 25, cd: 180, free: 1, cost: 0 }, { n: 'Stormstrike', weapon: 1, cost: 120, cd: 12 }, { n: 'Earth Shock', base: [517, 545], sp: .43, cost: 180, cd: 6, school: 'nature', mult: 1.2 }] }) },
    { id: 'storm', name: 'Enhancement Caster', split: '15/36/0', blurb: "Melee with free Lightning Bolts and Earth Shock. Uses attack and spell stats.", talents: [104741, 104744, 104753, 104742, 104743], kit: melee({ res: 'mana', crit: 5, spFromInt: .3, wf: { p: .2, ap: 315, mult: 1 },
      abilities: [{ n: 'Maelstrom Bolt', base: [419, 467], sp: .857, cost: 0, cd: 8, school: 'nature' }, { n: 'Stormstrike', weapon: 1, cost: 120, cd: 12 }, { n: 'Earth Shock', base: [517, 545], sp: .43, cost: 180, cd: 6, school: 'nature' }] }) },
  ],
  MAGE: [
    { id: 'fire', name: 'Fire', split: '12/36/3', blurb: "Fireball and Fire Blast with Ignite and Combustion.", talents: [105781, 105794, 105782, 105784, 105790], kit: caster({ res: 'mana', school: 'fire', scrit: 10, shit: 6, dmg: { fire: 1.08 }, ignite: .4,
      abilities: [{ n: 'Combustion', buff: { scrit: 40 }, dur: 12, cd: 180, free: 1, cost: 0 }, { n: 'Fire Blast', base: [446, 524], sp: .43, cost: 215, cd: 6, school: 'fire', crit: 6 }, { n: 'Fireball', base: [596, 760], sp: 1, cost: 410, cast: 3, school: 'fire' }] }) },
    { id: 'frost', name: 'Frost', split: '10/3/38', blurb: "Frostbolt and Ice Lance with bonus crit damage.", talents: [105766, 105777, 105773, 105779, 105764], kit: caster({ res: 'mana', school: 'frost', shit: 6, critMult: .5, dmg: { frost: 1.06 },
      abilities: [{ n: 'Ice Lance', base: [165, 195], sp: .14, cost: 110, cd: 8, school: 'frost', mult: 3 }, { n: 'Frostbolt', base: [515, 555], sp: .814, cost: 290, cast: 2.5, school: 'frost' }] }) },
    { id: 'arcane', name: 'Arcane', split: '40/11/0', blurb: "Arcane Blast with Arcane Power.", talents: [105798, 105800, 105806, 105801, 105810], kit: caster({ res: 'mana', school: 'arcane', scrit: 8, shit: 2, critMult: .5, statMult: { int: 1.1 }, dmg: { arcane: 1.03 }, clear: .1,
      abilities: [{ n: 'Arcane Power', buff: { dmg: .3 }, dur: 15, cd: 120, free: 1, cost: 0 }, { n: 'Arcane Blast', base: [495, 560], sp: .71, cost: 300, cast: 2.5, school: 'arcane', mult: 1.12 }] }) },
  ],
  WARLOCK: [
    { id: 'afflic', name: 'Affliction', split: '36/15/0', blurb: "Corruption, Bane of Agony, Siphon Life and Wrack.", talents: [105909, 105912, 105924, 110876, 105914], kit: caster({ res: 'mana', school: 'shadow', scrit: 5, dmg: { shadow: 1.1 }, lifeTap: 1,
      abilities: [{ n: 'Corruption', dot: { ticks: 6, every: 3, dmg: 137, sp: .156 }, cost: 290, cd: 18, school: 'shadow', mult: 1.1 }, { n: 'Bane of Agony', dot: { ticks: 12, every: 2, dmg: 87, sp: .083 }, cost: 215, cd: 24, school: 'shadow' }, { n: 'Siphon Life', dot: { ticks: 10, every: 3, dmg: 45, sp: .05 }, cost: 250, cd: 30, school: 'shadow' }, { n: 'Wrack', channel: { ticks: 6, every: 1, dmg: 150, sp: .15 }, cost: 340, cd: 12, school: 'shadow' }, { n: 'Shadow Bolt', base: [455, 507], sp: .857, cost: 370, cast: 2.5, school: 'shadow' }] }) },
    { id: 'demo', name: 'Demonology', split: '5/36/10', blurb: "Shadow Bolt and Corruption with an Imp. Demonic Knowledge adds spell damage.", talents: [105890, 105891, 105893, 105908, 105906], kit: caster({ res: 'mana', school: 'shadow', spFlat: 60, dmg: { shadow: 1.1, fire: 1.1 }, pet: { dps: 42, sp: .08, mult: 1.2 }, lifeTap: 1,
      abilities: [{ n: 'Corruption', dot: { ticks: 6, every: 3, dmg: 137, sp: .156 }, cost: 290, cd: 18, school: 'shadow' }, { n: 'Shadow Bolt', base: [455, 507], sp: .857, cost: 370, cast: 2.5, school: 'shadow' }] }) },
    { id: 'destro', name: 'Destruction', split: '0/10/41', blurb: "Immolate, Conflagrate and Incinerate with bonus crit damage.", talents: [105874, 105880, 105883, 105888, 105879], kit: caster({ res: 'mana', school: 'fire', critMult: .5, dmg: { fire: 1.05, shadow: 1.05 }, lifeTap: 1,
      abilities: [{ n: 'Immolate', base: [279, 279], sp: .2, mult: 1.5, dot: { ticks: 5, every: 3, dmg: 102, sp: .13 }, cost: 380, cd: 15, cast: 1.5, school: 'fire' }, { n: 'Conflagrate', base: [510, 640], sp: .43, cost: 165, cd: 10, school: 'fire', crit: 25 }, { n: 'Incinerate', base: [475, 545], sp: .71, cost: 300, cast: 2.5, school: 'fire', mult: 1.1 }] }) },
  ],
  DRUID: [
    { id: 'moon', name: 'Balance', split: '36/0/15', blurb: "Moonkin Form with Starfire and Moonfire.", talents: [104937, 104936, 104935, 104932, 104934], kit: caster({ res: 'mana', school: 'arcane', scrit: 8, shit: 4, critMult: .2, dmg: { arcane: 1.4, nature: 1.4 }, costMult: .9,
      abilities: [{ n: 'Moonfire', base: [195, 228], sp: .15, dot: { ticks: 4, every: 3, dmg: 96, sp: .13 }, cost: 340, cd: 12, school: 'arcane', mult: 1.06 }, { n: 'Starfire', base: [540, 660], sp: 1, cost: 340, cast: 2.8, school: 'arcane' }] }) },
    { id: 'cat', name: 'Feral Cat', split: '0/36/15', blurb: "Shred, Rip and Ferocious Bite. Weapon damage is not used.", talents: [104956, 104953, 104948, 104950, 104946], kit: melee({ res: 'energy', form: { speed: 1, min: 54, max: 80 }, crit: 2, critMult: .2, feral: 45, agiToAp: 1, dmg: { all: 1.06 },
      abilities: [{ n: "Tiger's Fury", buff: { flat: 40 }, dur: 6, cd: 18, free: 1, cost: 0, noGcdCost: 1 }, { n: 'Rip', finisher: 'rip', cost: 30, mult: 1.2 }, { n: 'Ferocious Bite', finisher: 'bite', cost: 35 }, { n: 'Shred', pct: 2.25, flat: 180, cost: 42, cp: 1, mult: 1.2 }] }) },
    { id: 'bear', name: 'Feral Bear', split: '0/40/11', blurb: "Dire Bear Form with Maul, Primal Bite and Lacerate. Weapon damage is not used.", talents: [104949, 104952, 104955, 104946, 104945], kit: melee({ res: 'rage', form: { speed: 2.5, min: 165, max: 215 }, crit: 2, critMult: .2, feral: 45, dmg: { all: 1.03 },
      abilities: [{ n: 'Primal Bite', pct: 1, flat: 130, cost: 15, cd: 6 }, { n: 'Lacerate', dot: { ticks: 5, every: 3, dmg: 62, ap: .02 }, cost: 13, cd: 15 }, { n: 'Maul', queue: 1, flat: 128, cost: 10, above: 25 }] }) },
  ],
};

export function hash(...parts) {
  let h = 2166136261;
  for (const c of parts.join('|')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const item = (pool, id) => pool.items[id];
const isTwoHand = (it) => it && it[3] === 17;
const isShield = (it) => it && it[5] === 4 && it[6] === 6;
export const hasShield = (pool, picks) => !!(picks.off && isShield(item(pool, picks.off)));

function candidates(pool, cls, slot, picks) {
  const p = pool.pools[cls];
  const base = p[POOL_OF[slot] || slot] || {};
  const out = {};
  for (const [t, ids] of Object.entries(base)) out[t] = ids;
  if (slot === 'off' && DUAL.has(cls)) {
    for (const [t, ids] of Object.entries(p.main || {})) {
      const ones = ids.filter((i) => item(pool, i)[3] === 13);
      out[t] = (out[t] || []).concat(ones);
    }
  }
  if (slot === 'main' && picks.off) {
    for (const t of Object.keys(out)) out[t] = out[t].filter((i) => !isTwoHand(item(pool, i)));
  }
  return out;
}

function roll(pool, cls, slot, picks, r, taken) {
  const c = candidates(pool, cls, slot, picks);
  const free = (i) => !taken.has(item(pool, i)[0]);
  const open = TIERS.map(([t, w]) => {
    const ids = (c[t] || []).filter(free);
    return [ids, t === 'l' ? w : w * Math.min(1, ids.length / TIER_FULL)];
  }).filter(([ids]) => ids.length);
  if (!open.length) return 0;
  let x = r() * open.reduce((sum, o) => sum + o[1], 0);
  for (const [ids, w] of open) {
    if (x < w) return ids[Math.floor(r() * ids.length)];
    x -= w;
  }
  const last = open[open.length - 1][0];
  return last[Math.floor(r() * last.length)];
}

export const remaining = (run) => SLOTS.map((s) => s[0]).filter((s) => !(s in run.picks));

export function newRun(seed, cls) {
  return { seed: seed >>> 0, cls, picks: {}, round: 0, mulligan: 1, moves: [] };
}

export function offers(pool, run) {
  const r = rng(hash(run.seed, run.cls, run.round));
  const out = {};
  const taken = new Set(Object.values(run.picks).filter(Boolean).map((i) => item(pool, i)[0]));
  for (const slot of remaining(run)) {
    const id = roll(pool, run.cls, slot, run.picks, r, taken);
    if (id) taken.add(item(pool, id)[0]);
    out[slot] = id;
  }
  return out;
}

export function hands(pool, run, slot, id) {
  if ((slot !== 'main' && slot !== 'off') || !DUAL.has(run.cls) || item(pool, id)[3] !== 13) return [];
  return ['main', 'off'].filter((s) => !(s in run.picks));
}

export function pick(pool, run, slot, to = slot) {
  const offer = offers(pool, run);
  const id = offer[slot];
  if (!id) throw new Error('bad pick');
  if (to !== slot && !hands(pool, run, slot, id).includes(to)) throw new Error('bad hand');
  run.picks[to] = id;
  run.moves.push(to === slot ? slot : slot + '>' + to);
  run.round++;
  if (to === 'main' && isTwoHand(item(pool, id))) run.picks.off = 0;
  for (const s of remaining(run)) if (!offers(pool, run)[s]) run.picks[s] = 0;
  return id;
}

export function mulligan(pool, run) {
  if (!run.mulligan) throw new Error('no mulligan');
  run.mulligan = 0;
  run.moves.push('!');
  run.round++;
}

export const finished = (run) => remaining(run).length === 0;

export function replay(pool, seed, cls, moves) {
  if (!BUILDS[cls] || !Array.isArray(moves) || moves.length > 24) throw new Error('bad run');
  const run = newRun(seed, cls);
  for (const m of moves) {
    if (m === '!') mulligan(pool, run);
    else {
      const [slot, to = slot] = String(m).split('>');
      if (!remaining(run).includes(slot) || !remaining(run).includes(to)) throw new Error('bad move');
      pick(pool, run, slot, to);
    }
  }
  if (!finished(run)) throw new Error('unfinished');
  return run;
}

function addStats(to, from, k = 1) {
  for (const [s, v] of Object.entries(from || {})) to[s] = (to[s] || 0) + v * k;
}

export function gearStats(pool, picks) {
  const s = {}, counts = {};
  let setPct = 0;
  for (const id of Object.values(picks)) {
    if (!id) continue;
    const it = item(pool, id);
    addStats(s, it[7]);
    if (it[9]) counts[it[9]] = (counts[it[9]] || 0) + 1;
  }
  const active = [];
  for (const [sid, n] of Object.entries(counts)) {
    const set = pool.sets[sid];
    if (!set) continue;
    for (const [need, stats, text] of set.b) {
      if (n >= need) {
        addStats(s, stats);
        if (!Object.keys(stats).length && /damage|critical|attack|spell|chance/i.test(text || '')) setPct += .015;
        active.push([set.n, need, text]);
      }
    }
  }
  s.setPct = setPct;
  return { stats: s, active };
}

function character(pool, cls, build, picks) {
  const g = gearStats(pool, picks), base = BASE[cls], k = build.kit, s = g.stats;
  const mult = (x) => (k.statMult && k.statMult[x]) || 1;
  const str = (base.str + (s.str || 0)) * mult('str'), agi = (base.agi + (s.agi || 0)) * mult('agi');
  const int = (base.int + (s.int || 0)) * mult('int'), spi = base.spi + (s.spi || 0);
  let ap = base.ap + str * base.str2 + agi * base.agi2 + (s.ap || 0);
  if (k.agiToAp) ap += agi;
  if (k.feral) ap += k.feral * 1;
  if (k.apFromInt) ap += int * k.apFromInt;
  const rap = (base.rap || 0) + agi * 2 + (s.rap || 0) + (s.ap || 0);
  let sp = (s.sp || 0) + (k.spFlat || 0);
  if (k.spFromInt) sp += int * k.spFromInt;
  if (k.spFromSpi) sp += spi * k.spFromSpi;
  const school = (x) => sp + (s['s' + x] || 0);
  return {
    str, agi, int, spi, ap, rap, sp, school, active: g.active, setMult: 1 + (s.setPct || 0),
    crit: (base.crit || 0) + agi / base.meleeCrit + (s.crit || 0) + (k.crit || 0), skills: s,
    scrit: (base.scrit || 0) + (base.spellCrit ? int / base.spellCrit : 0) + (s.scrit || 0) + (k.scrit || 0),
    hit: (s.hit || 0) + (k.hit || 0), shit: (s.shit || 0) + (k.shit || 0),
    haste: (s.haste || 0) + (k.haste || 0), shaste: s.shaste || 0,
    mana: base.mana ? base.mana + int * 15 : 0, mp5: (s.mp5 || 0) + spi / 4,
    sta: base.sta + (s.sta || 0), armor: s.armor || 0, skill: s.skill || 0,
  };
}

function view(c) {
  const r1 = (v) => Math.round(v * 10) / 10;
  return {
    str: Math.round(c.str), agi: Math.round(c.agi), sta: Math.round(c.sta), int: Math.round(c.int), spi: Math.round(c.spi), armor: Math.round(c.armor),
    ap: Math.round(c.ap), rap: Math.round(c.rap), sp: Math.round(c.sp), crit: r1(c.crit), scrit: r1(c.scrit), hit: r1(c.hit), shit: r1(c.shit),
    haste: r1(c.haste), mana: Math.round(c.mana),
  };
}

const LABEL = { all: 'All damage', one: 'One-hand damage', two: 'Two-hand damage', ranged: 'Ranged damage', fire: 'Fire damage', frost: 'Frost damage', arcane: 'Arcane damage', shadow: 'Shadow damage', nature: 'Nature damage', holy: 'Holy damage' };

function bonuses(k) {
  const out = [];
  for (const [key, v] of Object.entries(k.dmg || {})) if (v !== 1 && LABEL[key]) out.push(`${LABEL[key]} ${v > 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`);
  if (k.critMult) out.push(`Crit damage +${Math.round(k.critMult * 100)} points`);
  if (k.shieldDmg) out.push(`All damage +${Math.round((k.shieldDmg - 1) * 100)}% with a shield`);
  if (k.flurry) out.push(`Attack speed +${Math.round(k.flurry * 100)}% after a crit`);
  if (k.ignite) out.push(`Fire crits burn for +${Math.round(k.ignite * 100)}%`);
  if (k.armorIgnore) out.push(`Ignores ${Math.round(k.armorIgnore * 100)}% of armor`);
  if (k.offMult) out.push(`Off-hand damage ${Math.round(k.offMult * 100)}%`);
  return out;
}

export function sheet(pool, cls, buildId, picks) {
  const build = BUILDS[cls].find((b) => b.id === buildId);
  const school = build.kit.school;
  const c = character(pool, cls, build, picks), base = character(pool, cls, { kit: {} }, picks);
  return { now: view(c), base: view(base), school, schoolDmg: school ? Math.round(c.school(school)) : 0, bonuses: bonuses(build.kit) };
}

function weaponOf(pool, id) {
  const it = id ? item(pool, id) : null;
  const d = it && it[8];
  if (!d || !d.delay) return null;
  const kind = it[3] === 17 ? 'two' : 'one';
  return { min: d.min, max: d.max, speed: d.delay / 1000, kind, sub: it[6], dagger: it[5] === 2 && it[6] === 15 };
}

function procsOf(pool, picks) {
  const out = [];
  for (const [slot, id] of Object.entries(picks)) {
    if (!id) continue;
    const it = item(pool, id);
    if (it[11]) out.push({ ...it[11], name: it[0], slot });
  }
  return out;
}

function usesOf(pool, picks) {
  const out = [];
  for (const id of Object.values(picks)) {
    if (!id) continue;
    const it = item(pool, id);
    if (it[10]) out.push({ n: it[0], ...it[10] });
  }
  return out;
}

function once(pool, cls, build, picks, c, r, log) {
  const k = build.kit, resource = k.res, isMelee = k.kind === 'melee', isRanged = k.kind === 'ranged';
  const shield = hasShield(pool, picks);
  let main = weaponOf(pool, picks.main), off = picks.off ? weaponOf(pool, picks.off) : null;
  const bow = isRanged ? weaponOf(pool, picks.ranged) : null;
  if (k.form) { main = { ...k.form, kind: 'form' }; off = null; }
  if (isRanged && !bow) main = main || null;
  const procs = procsOf(pool, picks), uses = usesOf(pool, picks);
  const by = {};
  const buffs = [], cds = {}, dots = [];
  const flatMult = (k.dmg && k.dmg.all || 1) * c.setMult * (shield && k.shieldDmg ? k.shieldDmg : 1);
  const twoMult = main && k.dmg ? (main.kind === 'two' ? k.dmg.two || 1 : main.kind === 'one' ? k.dmg.one || 1 : 1) : 1;
  const armorMult = PHYSICAL * (1 - TARGET_ARMOR * (1 - (k.armorIgnore || 0)) / (TARGET_ARMOR * (1 - (k.armorIgnore || 0)) + 400 + 85 * 60));
  let t = 0, total = 0, res = resource === 'mana' ? c.mana : resource === 'energy' ? 100 : 0;
  let gcd = 0, busy = 0, mainAt = .1, offAt = .1 + (off ? off.speed / 2 : 0), rangedAt = .1, flurry = 0, cp = 0, queued = null, sndUntil = 0;
  let channel = null, castAbility = null, nextTick = 0, regenAt = 0, petAt = 1, clear = 0;
  const buff = (key) => { let v = 0; for (const b of buffs) if (b.until > t && b.fx[key]) v += b.fx[key]; return v; };
  const useStat = (key) => buff(key);
  const base = BASE[cls];
  const skillOf = (w) => BASE_SKILL + ((w && c.skills['sk' + w.sub]) || 0);
  const table = (w) => {
    const d = Math.max(0, BOSS_DEFENSE - skillOf(w));
    return {
      miss: d > 10 ? 6 + d * .2 : 5 + d * .1, dodge: 5 + d * .1, crit: CRIT_AURA + d * .12,
      glance: d >= 15 ? .65 : d >= 10 ? .65 + (15 - d) * .04 : Math.min(.95, .85 + (10 - d) * .03),
    };
  };
  const curHit = () => c.hit + buff('hit');
  const curCrit = (w) => c.crit + buff('crit') + buff('agi') / base.meleeCrit - table(w).crit;
  const curSpellCrit = () => c.scrit + buff('scrit') + (base.spellCrit ? buff('int') / base.spellCrit : 0);
  const spellMiss = () => Math.max(1, SPELL_MISS - c.shit - buff('shit'));
  const curAp = () => c.ap + useStat('ap') + useStat('str') * base.str2 + useStat('agi') * base.agi2;
  const curRap = () => c.rap + useStat('rap') + useStat('ap') + useStat('agi') * 2;
  const curSp = (school) => c.school(school) + useStat('sp') + useStat('s' + school);
  const speedMult = () => 1 + (c.haste + useStat('haste') + (sndUntil > t ? (k.snd || 0) * 100 : 0)) / 100 + (flurry > 0 ? (k.flurry || 0) : 0);
  const note = (n, dmg, crit, school) => {
    total += dmg; by[n] = (by[n] || 0) + dmg;
    if (log && dmg > 0) log.push([Math.round(t * 100) / 100, n, Math.round(dmg), crit ? 1 : 0, school || 'phys']);
  };
  const schoolMult = (school) => (k.dmg && k.dmg[school]) || 1;
  const allMult = () => flatMult * (1 + buff('dmg'));
  const critDmg = (spell) => (spell ? 1.5 : 2) + (k.critMult || 0);

  const onHit = (mh, crit, dmg, depth) => {
    if (k.flurry && crit) flurry = 3;
    if (k.deep && crit) note('Deep Wounds', dmg * k.deep, false, 'phys');
    if (resource === 'rage') res = Math.min(100, res + dmg / 230.6 * 7.5);
    if (k.seal && r() < k.seal.p) {
      const w = main;
      const v = k.seal.weapon ? (w.min + r() * (w.max - w.min) + curAp() / 14 * w.speed) * k.seal.weapon : k.seal.flat + curSp('holy') * (k.seal.sp || 0) * (w ? w.speed : 2);
      note('Seal', v * allMult() * (r() * 100 < curCrit(w) ? critDmg(false) : 1), false, 'holy');
    }
    if (k.poison && r() < k.poison.p) note('Poison', k.poison.dmg * allMult() * SPELL_RESIST, false, 'nature');
    if (k.wf && mh && depth === 0 && r() < k.wf.p) {
      swing(true, depth + 1, k.wf.ap * k.wf.mult, 'Windfury');
      swing(true, depth + 1, k.wf.ap * k.wf.mult, 'Windfury');
    }
    if (depth === 0) {
      const w = mh ? main : off;
      for (const p of procs) {
        if ((p.slot === 'main' && !mh) || (p.slot === 'off' && mh) || p.slot === 'ranged' || !w) continue;
        if (r() >= (p.p ?? w.speed * PROC_PPM / 60)) continue;
        if (p.extra) for (let n = 0; n < p.extra; n++) swing(true, depth + 1, 0, 'Extra Attack');
        else if (p.dmg) note(p.name, p.dmg * allMult() * SPELL_RESIST, false, 'nature');
        else if (p.buff) buffs.push({ until: t + (p.dur || 10), fx: p.buff });
      }
    }
    if (k.swordProc && mh && depth === 0 && main && r() < k.swordProc) swing(true, depth + 1, 0, 'Sword Spec');
  };

  function swing(mh, depth, bonusAp, name) {
    const w = mh ? main : off;
    if (!w) return;
    const isQueue = mh && queued && depth === 0;
    const tb = table(w), label0 = name || (mh ? 'Melee' : 'Off Hand');
    const dw = !!off && !queued;
    const missC = Math.max(0, tb.miss + (dw ? DW_MISS : 0) - curHit() - (!mh && k.ohHit ? k.ohHit : 0));
    let x = r() * 100;
    if (x < missC) return note(label0, 0);
    x -= missC;
    if (x < tb.dodge) return note(label0, 0);
    x -= tb.dodge;
    let dmg = w.min + r() * (w.max - w.min) + (curAp() + (bonusAp || 0)) / 14 * w.speed;
    if (!mh) dmg *= (k.offMult || .5);
    let crit = false, label = label0;
    if (isQueue) {
      dmg += queued.flat;
      res -= queued.cost;
      label = queued.n;
      queued = null;
      if (r() * 100 < curCrit(w)) { dmg *= critDmg(false); crit = true; }
    } else if (x < GLANCE) {
      dmg *= tb.glance;
    } else if (x - GLANCE < curCrit(w)) {
      dmg *= critDmg(false);
      crit = true;
    }
    dmg *= armorMult * allMult() * twoMult;
    note(label, dmg, crit, 'phys');
    onHit(mh, crit, dmg, depth);
  }

  function ranged() {
    if (!bow) return;
    const tb = table(bow);
    if (r() * 100 < Math.max(0, tb.miss - curHit())) return note('Auto Shot', 0);
    let dmg = bow.min + r() * (bow.max - bow.min) + 20 * bow.speed + curRap() / 14 * bow.speed, crit = false;
    if (r() * 100 < curCrit(bow)) { dmg *= critDmg(false); crit = true; }
    dmg *= armorMult * allMult() * ((k.dmg && k.dmg.ranged) || 1);
    note('Auto Shot', dmg, crit, 'phys');
    for (const p of procs) if (p.dmg && p.slot === 'ranged' && r() < bow.speed * PROC_PPM / 60) note(p.name, p.dmg * allMult(), false, 'nature');
  }

  function applyDot(a, school) {
    const d = a.dot, sp = curSp(school), resist = school === 'phys' ? 1 : SPELL_RESIST;
    const per = (d.dmg + sp * (d.sp || 0) + curAp() * (d.ap || 0) + curRap() * (d.rap || 0)) * (a.mult || 1) * allMult() * schoolMult(school) * resist;
    const existing = dots.find((x) => x.n === a.n);
    const dot = { n: a.n, per, every: d.every, left: d.ticks, next: t + d.every, school };
    if (existing) Object.assign(existing, dot); else dots.push(dot);
  }

  function spellHit(a, school, value, label) {
    if (r() * 100 < spellMiss()) { note(label || a.n, 0); return 0; }
    let dmg = value * (a.mult || 1) * allMult() * schoolMult(school) * SPELL_RESIST, crit = false;
    if (r() * 100 < curSpellCrit() + (a.crit || 0)) {
      dmg *= critDmg(true); crit = true;
      if (k.ignite) note('Ignite', dmg * k.ignite, false, 'fire');
    }
    note(label || a.n, dmg, crit, school);
    if (k.overload && a.n === 'Lightning Bolt' && r() < k.overload) note('Lightning Overload', dmg * .5, false, 'nature');
    if (k.clear && r() < k.clear) clear = 1;
    return dmg;
  }

  function finish(a) {
    const n = cp;
    if (a.finisher === 'snd') { sndUntil = t + 9 + n * 3; cp = 0; return; }
    if (a.finisher === 'evis' || a.finisher === 'bite') {
      const v = (a.finisher === 'evis' ? 223 + n * 170 : 90 + n * 140) + curAp() * .03 * n;
      let dmg = v * (a.mult || 1) * allMult() * armorMult, crit = false;
      if (r() * 100 < curCrit(main)) { dmg *= critDmg(false); crit = true; }
      note(a.n, dmg, crit, 'phys');
    } else {
      const per = (a.finisher === 'rip' ? 40 + n * 24 + curAp() * .055 : 40 + n * 22 + curAp() * .02) * (a.mult || 1) * allMult();
      const existing = dots.find((x) => x.n === a.n);
      const dot = { n: a.n, per, every: 2, left: 4 + n, next: t + 2, school: 'phys' };
      if (existing) Object.assign(existing, dot); else dots.push(dot);
    }
    cp = 0;
  }

  function instant(a, school) {
    const w = main;
    if (a.noWeapon || (!a.weapon && !a.pct && !a.base)) {
      const v = (a.flat || 0) + curAp() * (a.ap || 0) + curRap() * (a.rap || 0) + (a.sp ? curSp(school) * a.sp : 0);
      if (school !== 'phys' && a.sp) return spellHit(a, school, v);
      const tb = table(w);
      if (r() * 100 < Math.max(0, tb.miss - curHit()) + tb.dodge) return note(a.n, 0);
      let dmg = v * (a.mult || 1) * allMult() * (school === 'phys' ? armorMult : 1), crit = false;
      if (r() * 100 < curCrit(w)) { dmg *= critDmg(false); crit = true; }
      note(a.n, dmg, crit, school);
      onHit(true, crit, dmg, 1);
      if (a.bleed) note(a.n + ' Bleed', dmg * a.bleed, false, 'phys');
      return;
    }
    if (a.base) {
      const v = a.base[0] + r() * (a.base[1] - a.base[0]) + (a.sp || 0) * curSp(school);
      return spellHit(a, school, v);
    }
    const hitW = (wp, mh) => {
      if (!wp) return;
      const tb = table(wp);
      if (r() * 100 < Math.max(0, tb.miss - curHit()) + tb.dodge) return note(a.n, 0);
      const bonus = wp.dagger && a.daggerBonus ? a.daggerBonus : 1;
      let dmg = ((wp.min + r() * (wp.max - wp.min) + curAp() / 14 * (a.pct ? wp.speed : Math.max(wp.speed, 2.4))) * (a.pct || a.weapon) + (a.flat || 0) + buff('flat') + curAp() * (a.ap || 0)) * bonus * (mh ? 1 : k.offMult || .5);
      let crit = false;
      if (r() * 100 < curCrit(wp) + (a.crit || 0)) { dmg *= critDmg(false); crit = true; }
      dmg *= (a.mult || 1) * allMult() * armorMult * twoMult;
      note(a.n, dmg, crit, 'phys');
      onHit(mh, crit, dmg, 1);
    };
    hitW(w, true);
    if (a.both) hitW(off, false);
  }

  const cooled = (a) => (cds[a.n] || 0) <= t;
  function act() {
    for (const a of k.abilities) {
      const school = a.school || (k.kind === 'caster' ? k.school : 'phys');
      if (a.queue) {
        if (!queued && res >= (a.above || a.cost) && cooled(a)) { queued = a; if (a.cd) cds[a.n] = t + a.cd; }
        continue;
      }
      if (a.needShield && !shield) continue;
      if (!cooled(a)) continue;
      if (a.finisher === 'snd' && (cp < 2 || sndUntil > t + 2)) continue;
      if (a.finisher && a.finisher !== 'snd' && cp < 5) continue;
      if (a.finisher === 'rip' && dots.some((d) => d.n === a.n)) continue;
      const cost = (a.cost || 0) * (resource === 'mana' ? MANA_COST * (k.costMult || 1) * (clear ? 0 : 1) : 1);
      if (res < cost) continue;
      if (a.buff) {
        res -= cost;
        buffs.push({ until: t + a.dur, fx: a.buff });
        cds[a.n] = t + a.cd;
        if (!a.free) gcd = t + 1.5;
        continue;
      }
      if (gcd > t || busy > t) return;
      res -= cost;
      clear = 0;
      if (a.cd) cds[a.n] = t + a.cd;
      gcd = t + (k.res === 'energy' ? 1 : 1.5);
      if (a.finisher) return finish(a);
      if (a.channel) {
        const ch = a.channel, per = (ch.dmg + curSp(school) * (ch.sp || 0));
        const hits = r() * 100 >= spellMiss();
        if (!hits) note(a.n, 0);
        channel = { a, school, per, hits, left: ch.ticks, every: ch.every / (1 + c.shaste / 100), next: t + ch.every };
        busy = t + ch.ticks * ch.every / (1 + c.shaste / 100);
        gcd = Math.max(gcd, busy);
        return;
      }
      if (a.cast) {
        const dur = a.cast / (1 + (c.shaste + useStat('shaste')) / 100);
        castAbility = { a, school, at: t + dur };
        busy = t + dur;
        gcd = Math.max(gcd, busy);
        return;
      }
      if (a.dot && !a.base) {
        if (school !== 'phys' && r() * 100 < spellMiss()) { note(a.n, 0); return; }
        applyDot(a, school);
        return;
      }
      if (a.ticks) {
        for (let i = 0; i < a.ticks; i++) note(a.n, ((a.flat || 0) + curSp(school) * (a.sp || 0)) * allMult(), false, school);
        return;
      }
      const landed = instant(a, school);
      if (a.dot && landed !== 0) applyDot(a, school);
      if (a.cp) cp = Math.min(5, cp + a.cp);
      return;
    }
    if (k.lifeTap && res < 420 && gcd <= t) { res += 420 + c.sp * .1; gcd = t + 1.5; }
  }

  const uses2 = uses.map((u) => ({ ...u, ready: 0 }));
  const step = .05;
  for (t = 0; t < FIGHT; t += step) {
    for (const u of uses2) {
      if (u.ready > t) continue;
      if (u.dmg) note(u.n, u.dmg * allMult() * SPELL_RESIST, false, 'fire');
      else buffs.push({ until: t + u.dur, fx: u.buff });
      u.ready = t + u.cd;
      for (const o of uses2) if (o !== u) o.ready = Math.max(o.ready, t + (u.lock || 0));
    }
    if (t >= regenAt) {
      regenAt = t + 2;
      if (resource === 'mana') res = Math.min(c.mana, res + c.mp5 * .4 + c.mana * .002);
      if (resource === 'energy') res = Math.min(100, res + 20 * (1 + buff('energy')));
      if (k.res === 'rage' && k.form) res = Math.min(100, res + 2);
    }
    if (castAbility && castAbility.at <= t) {
      const { a, school } = castAbility;
      castAbility = null;
      if (isRanged) {
        const w = bow;
        if (w && r() * 100 >= Math.max(0, table(w).miss - curHit())) {
          let dmg = (w.min + r() * (w.max - w.min) + 20 * w.speed + curRap() / 14 * w.speed) * a.weapon + (a.flat || 0), crit = false;
          if (r() * 100 < curCrit(w)) { dmg *= critDmg(false); crit = true; }
          note(a.n, dmg * (a.mult || 1) * allMult() * armorMult * ((k.dmg && k.dmg.ranged) || 1), crit, 'phys');
        } else note(a.n, 0);
      } else {
        const v = a.base[0] + r() * (a.base[1] - a.base[0]) + (a.sp || 0) * curSp(school);
        const landed = spellHit(a, school, v);
        if (a.dot && landed !== 0) applyDot(a, school);
      }
    }
    if (channel && channel.next <= t) {
      channel.next = t + channel.every;
      channel.left--;
      if (channel.hits) {
        const a = channel.a, crit = a.tickCrit && r() * 100 < curSpellCrit();
        note(a.n, channel.per * (a.mult || 1) * allMult() * schoolMult(channel.school) * SPELL_RESIST * (crit ? critDmg(true) : 1), crit, channel.school);
      }
      if (channel.left <= 0) channel = null;
    }
    for (const d of dots) {
      if (d.left > 0 && d.next <= t) {
        d.left--; d.next = t + d.every;
        note(d.n, d.per, false, d.school);
      }
    }
    for (let i = dots.length - 1; i >= 0; i--) if (dots[i].left <= 0) dots.splice(i, 1);
    if ((isMelee || k.swing) && main) {
      const sp = speedMult();
      if (mainAt <= t && !(busy > t && !isMelee)) {
        mainAt = t + main.speed / sp;
        if (flurry > 0) flurry--;
        swing(true, 0);
      }
      if (off && offAt <= t) {
        offAt = t + off.speed / sp;
        if (flurry > 0) flurry--;
        swing(false, 0);
      }
    }
    if (isRanged && bow && rangedAt <= t && !(busy > t)) {
      rangedAt = t + bow.speed / speedMult();
      ranged();
    }
    if (k.pet && petAt <= t) {
      petAt = t + 2;
      const base = (k.pet.dps + curRap() * (k.pet.rap || 0) + curSp('shadow') * (k.pet.sp || 0)) * 2;
      note('Pet', base * k.pet.mult * (1 + buff('pet')), r() < .1, 'phys');
    }
    if (busy <= t) act();
  }
  return { total, by };
}

export function simulate(pool, cls, buildId, picks, seed, iterations = 12, wantLog = false) {
  const build = BUILDS[cls].find((b) => b.id === buildId);
  if (!build) throw new Error('bad build');
  const c = character(pool, cls, build, picks);
  let sum = 0, by = {}, log = null, runs = [];
  for (let i = 0; i < iterations; i++) {
    const l = wantLog && i === 0 ? [] : null;
    const res = once(pool, cls, build, picks, c, rng(hash(seed, cls, buildId, i)), l);
    sum += res.total;
    runs.push(res.total / FIGHT);
    for (const [k, v] of Object.entries(res.by)) by[k] = (by[k] || 0) + v;
    if (l) log = l;
  }
  const dps = sum / iterations / FIGHT;
  for (const k of Object.keys(by)) by[k] = Math.round(by[k] / sum * 1000) / 10;
  return {
    dps: Math.round(dps * 10) / 10, by, log, sets: c.active,
    sheet: view(c),
  };
}

export function score(pool, run, buildId) {
  return simulate(pool, run.cls, buildId, run.picks, run.seed, 12, false).dps;
}

const NAME_A = ['Wandering', 'Sleepy', 'Lost', 'Grumpy', 'Lucky', 'Soggy', 'Tipsy', 'Rusty', 'Humble', 'Dusty', 'Hungry', 'Nervous', 'Stubborn', 'Fearless', 'Clumsy', 'Quiet'];
const NAME_B = ['Murloc', 'Kobold', 'Gnoll', 'Defias', 'Harvest Golem', 'Peon', 'Peasant', 'Boar', 'Raptor', 'Wisp', 'Spiderling', 'Trogg', 'Gryphon', 'Innkeeper', 'Moonkin', 'Mailbox'];
export function randomName(seed) {
  const r = rng(hash(seed, 'name'));
  return NAME_A[Math.floor(r() * NAME_A.length)] + ' ' + NAME_B[Math.floor(r() * NAME_B.length)];
}
