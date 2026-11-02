export const SCALE = { health: .036, damage: .218, melee: .34, spike: 1.7, rampHealth: .085, rampDamage: .06, enrageDps: 190, enrageRamp: 20, twistChance: .6 };

export const MILESTONES = [[10000, 'Spark'], [25000, 'Ember'], [40000, 'Flame'], [60000, 'Blaze'], [80000, 'Inferno'], [100000, 'Eruption'], [120000, 'Cataclysm'], [150000, "Firelord's Bane"]];
export const tierOf = (score) => MILESTONES.reduce((best, m, i) => (score >= m[0] ? i : best), -1);

export const TWISTS = [
  { id: 'enraged', name: 'Enraged', text: 'Hits 25% harder.', tone: 'bad', damage: 1.25 },
  { id: 'hide', name: 'Iron Hide', text: 'Has 25% more health.', tone: 'bad', health: 1.25 },
  { id: 'frenzied', name: 'Frenzied', text: 'Attacks 35% faster.', tone: 'bad', speed: 1.35 },
  { id: 'hunger', name: 'Mana Hunger', text: 'Spells cost 30% more mana.', tone: 'bad', cost: 1.3 },
  { id: 'searing', name: 'Searing Aura', text: 'Fire burns the whole party every 4 seconds.', tone: 'bad', pulse: { n: 'Searing Aura', school: 'fire', dmg: [650, 800], every: 4 } },
  { id: 'gloom', name: 'Gloom', text: 'Shadow burns the whole party every 4 seconds.', tone: 'bad', pulse: { n: 'Gloom', school: 'shadow', dmg: [650, 800], every: 4 } },
  { id: 'impatient', name: 'Impatient', text: 'Enrages 30% sooner.', tone: 'bad', enrage: .7 },
  { id: 'stone', name: 'Stone Skin', text: 'Takes 30% less physical damage.', tone: 'bad', physTaken: .7 },
  { id: 'warded', name: 'Warded', text: 'Takes 30% less spell damage.', tone: 'bad', magicTaken: .7 },
  { id: 'weakened', name: 'Weakened', text: 'Hits 15% softer.', tone: 'good', damage: .85 },
  { id: 'wounded', name: 'Wounded', text: 'Has 15% less health.', tone: 'good', health: .85 },
];

const FIRE = 'fire', SHADOW = 'shadow', ARCANE = 'arcane', PHYS = 'phys';

export const RAIDS = {
  mc: {
    id: 'mc',
    name: 'Molten Core',
    blurb: 'Ten bosses of fire and shadow. Ragnaros never falls.',
    theme: { floor: 'terrain_rock', wall: 'terrain_rock', fog: 0x2a0c04, light: 0xff6a2a },
    bosses: [
      {
        id: 'lucifron', name: 'Lucifron', loot: 'Lucifron', model: 13031, health: 351780, armor: 3795, resist: { shadow: 186, fire: 93 }, melee: [1635, 2165, 2],
        tip: 'Curses make spells cost double. Your healer needs a deep mana pool.',
        abilities: [
          { n: 'Shadow Shock', first: 6, every: [6, 6], school: SHADOW, dmg: [420, 487], to: 'party' },
          { n: 'Impending Doom', first: 10, every: [20, 20], school: SHADOW, dmg: [2001, 2001], to: 'party', delay: 10 },
          { n: "Lucifron's Curse", first: 20, every: [15, 15], curse: { cost: 2 }, dur: 300 },
        ],
      },
      {
        id: 'magmadar', name: 'Magmadar', loot: 'Magmadar', model: 10193, health: 826088, armor: 4691, melee: [1867, 2475, 2],
        tip: 'Frenzy makes him attack much faster, and Panic stops your healer.',
        abilities: [
          { n: 'Frenzy', first: 30, every: [15, 20], boss: { speed: 1.6 }, dur: 8, tick: { n: 'Lava Breath', every: 4, school: FIRE, dmg: [1158, 1345], to: 'tank' } },
          { n: 'Panic', first: 8, every: [30, 35], fear: 'others', dur: 4 },
          { n: 'Lava Bomb', first: 12, every: [12, 15], dot: { n: 'Conflagration', school: FIRE, per: 520, every: 1, ticks: 8 }, to: 'random' },
        ],
      },
      {
        id: 'gehennas', name: 'Gehennas', loot: 'Gehennas', model: 13030, health: 351780, armor: 3795, resist: { fire: 186, shadow: 93 }, melee: [1635, 2165, 2],
        tip: 'His curse cuts all healing by 75%. Kill him fast.',
        abilities: [
          { n: "Gehennas' Curse", first: 7, every: [25, 30], curse: { heal: .4 }, dur: 20 },
          { n: 'Rain of Fire', first: 9, every: [6, 12], dot: { n: 'Rain of Fire', school: FIRE, per: 1000, every: 2, ticks: 3 }, to: 'random' },
          { n: 'Shadow Bolt', first: 4, every: [3, 6], cast: .5, school: SHADOW, dmg: [2251, 2751], to: 'random' },
        ],
      },
      {
        id: 'garr', name: 'Garr', loot: 'Garr', model: 12110, health: 659538, armor: 4691, melee: [1976, 2621, 2],
        tip: 'Two Firesworn guard him. Each one explodes when it dies and makes Garr angrier.',
        adds: { n: 'Firesworn', count: 2, health: 61040, melee: [1455, 1931, 2], armor: 3791, death: { n: 'Eruption', school: FIRE, dmg: [1200, 1500], to: 'party', enrage: { speed: .04, damage: .02 } } },
        abilities: [
          { n: 'Antimagic Pulse', first: 10, every: [15, 20], dispel: 1 },
          { n: 'Magma Shackles', first: 15, every: [10, 15], hinder: 1, dur: 3 },
        ],
      },
      {
        id: 'geddon', name: 'Baron Geddon', loot: 'Baron Geddon', model: 12129, health: 586256, armor: 4691, immune: [FIRE], melee: [1537, 2038, 2],
        tip: 'Immune to Fire. Ignite Mana burns your healer dry, and Inferno punishes melee.',
        abilities: [
          { n: 'Ignite Mana', first: 12, every: [20, 30], burn: { per: 400, every: 3, ticks: 5 } },
          { n: 'Living Bomb', first: 17, every: [12, 15], school: FIRE, dmg: [3200, 3200], to: 'random', delay: 8 },
          { n: 'Inferno', first: 21, every: [18, 24], tick: { n: 'Inferno', every: 1, school: FIRE, dmg: [500, 1000], to: 'melee' }, dur: 8 },
        ],
      },
      {
        id: 'shazzrah', name: 'Shazzrah', loot: 'Shazzrah', model: 13032, health: 351780, armor: 3795, resist: { arcane: 186, fire: 93 }, melee: [1635, 2165, 2],
        tip: 'Constant Arcane blasts, and his curse doubles all magic damage. Arcane Resistance shines here.',
        abilities: [
          { n: 'Arcane Explosion', first: 2, every: [4, 6], cast: .5, school: ARCANE, dmg: [620, 620], to: 'party' },
          { n: "Shazzrah's Curse", first: 10, every: [20, 20], curse: { magic: 2 }, dur: 300 },
          { n: 'Deaden Magic', first: 5, every: [30, 30], boss: { magicTaken: .5 }, dur: 15 },
          { n: 'Counterspell', first: 15, every: [16, 18], silence: 'heal', dur: 4 },
        ],
      },
      {
        id: 'sulfuron', name: 'Sulfuron Harbinger', loot: 'Sulfuron Harbinger', model: 13030, health: 439692, armor: 5864, resist: { fire: 93 }, melee: [1757, 2330, 2],
        tip: 'The heaviest armor in the Core. Spell damage ignores it.',
        adds: { n: 'Flamewaker Priest', count: 2, health: 67980, melee: [988, 1378, 2], armor: 2223, heals: { n: 'Dark Mending', amount: 2200, every: 12 } },
        abilities: [
          { n: 'Hand of Ragnaros', first: 6, every: [12, 15], school: FIRE, dmg: [300, 400], to: 'tank', stun: 2 },
          { n: 'Flame Spear', first: 2, every: [12, 16], school: FIRE, dmg: [850, 1150], to: 'random' },
          { n: 'Inspire', first: 10, every: [16, 20], boss: { speed: 1.4, damage: 1.4 }, dur: 12 },
        ],
      },
      {
        id: 'golemagg', name: 'Golemagg the Incinerator', loot: 'Golemagg the Incinerator', model: 11986, health: 826088, tune: .6, armor: 4691, resist: { fire: 186 }, melee: [1950, 2600, 2],
        tip: 'The hardest hitter before Ragnaros. A pure test of your tank.',
        adds: { n: 'Core Rager', count: 1, health: 80925, melee: [1511, 2003, 2], armor: 4391, unkillable: 1 },
        abilities: [
          { n: 'Pyroblast', first: 7, every: [7, 7], school: FIRE, dmg: [1389, 1613], to: 'random', dot: { n: 'Pyroblast', school: FIRE, per: 201, every: 3, ticks: 4 } },
          { n: 'Mangle', first: 5, every: [10, 10], school: PHYS, dot: { n: 'Mangle', school: PHYS, per: 301, every: 2, ticks: 10 }, to: 'tank' },
          { n: 'Earthquake', below: .1, every: [5, 5], school: PHYS, dmg: [1389, 1613], to: 'party' },
        ],
      },
      {
        id: 'majordomo', name: 'Majordomo Executus', loot: 'Ragnaros', model: 12029, enrageBy: 1.6, health: 666200, armor: 4691, resist: { fire: 95 }, melee: [1537, 2038, 2],
        tip: 'He trades shields: one reflects spells, the other burns whoever hits him. Aegis restores him once.',
        abilities: [
          { n: 'Magic Reflection', first: 30, every: [30, 30], boss: { reflectSpells: .5 }, dur: 10 },
          { n: 'Damage Shield', first: 15, every: [30, 30], boss: { thorns: 40 }, dur: 10 },
          { n: 'Teleport', first: 20, every: [20, 30], dot: { n: 'Burning Coals', school: FIRE, per: 650, every: 1, ticks: 5 }, to: 'random' },
          { n: 'Aegis of Ragnaros', below: .5, once: 1, shield: 30000 },
        ],
      },
      {
        id: 'ragnaros', name: 'Ragnaros', loot: 'Ragnaros', model: 11121, health: 1099230, armor: 4691, immune: [FIRE], resist: { frost: -40 }, melee: [1999, 2651, 2.8], endless: 1,
        tip: 'The Final Stand. He cannot die and he only gets stronger. Deal as much damage as you can before he burns you down. That number is your score.',
        fury: { after: 45, every: 15, damage: .08 },
        abilities: [
          { n: 'Wrath of Ragnaros', first: 25, every: [25, 30], school: FIRE, dmg: [1001, 1001], to: 'party', knock: 3 },
          { n: 'Elemental Fire', first: 8, every: [10, 14], school: FIRE, dmg: [2160, 2640], to: 'tank', dot: { n: 'Elemental Fire', school: FIRE, per: 600, every: 1, ticks: 8 } },
          { n: 'Lava Burst', first: 12, every: [15, 20], school: FIRE, dmg: [1000, 1500], to: 'random' },
          { n: 'Might of Ragnaros', first: 12, every: [10, 15], burn: { per: 400, every: 1, ticks: 1 } },
          { n: 'Sons of Flame', first: 90, every: [90, 90], school: FIRE, wave: { n: 'Son of Flame', every: 2, dmg: [1247, 1655], ticks: 8 }, to: 'tank' },
        ],
      },
    ],
  },
};

for (const raid of Object.values(RAIDS)) raid.bosses.forEach((b, i) => { b.step = i; });
