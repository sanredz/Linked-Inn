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

const FIRE = 'fire', SHADOW = 'shadow', ARCANE = 'arcane', PHYS = 'phys', NATURE = 'nature', FROST = 'frost', HOLY = 'holy';

export const ZG_MILESTONES = [[10000, 'Whisper'], [25000, 'Hex'], [40000, 'Bloodletter'], [60000, 'Voodoo'], [80000, 'Soulreaver'], [100000, "Loa's Chosen"], [120000, 'Gurubashi Legend'], [150000, "Soulflayer's Bane"]];

export const AQ_MILESTONES = [[10000, 'Sandgrain'], [25000, 'Dune Walker'], [40000, 'Scarab'], [60000, 'Sandstorm'], [80000, 'Obsidian'], [100000, 'Crystal Breaker'], [120000, 'Qiraji Slayer'], [150000, "Unscarred's Bane"]];

export const RAIDS = {
  mc: {
    id: 'mc',
    name: 'Molten Core',
    blurb: 'Ten bosses of fire and shadow. Ragnaros never falls.',
    theme: { floor: 'terrain_rock', wall: 'terrain_rock', fog: 0x2a0c04, light: 0xff6a2a, set: 'molten' },
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
        id: 'garr', name: 'Garr', loot: 'Garr', model: 12110, health: 659538, armor: 4691, melee: [1976, 2621, 2], drop: { id: 18563, kind: 'relic', name: 'Left Binding of the Windseeker', icon: 135988, chance: .05 },
        tip: 'Two Firesworn guard him. Each one explodes when it dies and makes Garr angrier.',
        adds: { n: 'Firesworn', count: 2, health: 61040, melee: [1455, 1931, 2], armor: 3791, death: { n: 'Eruption', school: FIRE, dmg: [1200, 1500], to: 'party', enrage: { speed: .04, damage: .02 } } },
        abilities: [
          { n: 'Antimagic Pulse', first: 10, every: [15, 20], dispel: 1 },
          { n: 'Magma Shackles', first: 15, every: [10, 15], hinder: 1, dur: 3 },
        ],
      },
      {
        id: 'geddon', name: 'Baron Geddon', loot: 'Baron Geddon', model: 12129, health: 586256, armor: 4691, immune: [FIRE], melee: [1537, 2038, 2], drop: { id: 18564, kind: 'relic', name: 'Right Binding of the Windseeker', icon: 135988, chance: .05 },
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
        id: 'golemagg', name: 'Golemagg the Incinerator', loot: 'Golemagg the Incinerator', model: 11986, health: 826088, tune: .6, armor: 4691, resist: { fire: 186 }, melee: [1950, 2600, 2], drop: { id: 17203, kind: 'ingot', name: 'Sulfuron Ingot', icon: 135824, chance: .25 },
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
        id: 'ragnaros', name: 'Ragnaros', loot: 'Ragnaros', model: 11121, health: 1099230, armor: 4691, immune: [FIRE], resist: { frost: -40 }, melee: [1999, 2651, 2.8], endless: 1, drop: { id: 17204, kind: 'relic', name: 'Eye of Sulfuras', icon: 134124, chance: .05 },
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
  zg: {
    id: 'zg',
    name: "Zul'Gurub",
    blurb: 'Ten bosses of poison, blood and voodoo. Hakkar never falls.',
    theme: { floor: 'terrain_grass', wall: 'terrain_dirt', fog: 0x0b1a0c, light: 0x8fe36a, set: 'jungle' },
    finale: 'Hakkar',
    milestones: ZG_MILESTONES,
    bosses: [
      {
        id: 'jeklik', short: "Jeklik", name: 'High Priestess Jeklik', model: 15191, health: 360000, armor: 3795, resist: { shadow: 93, fire: 140 }, melee: [1600, 2120, 2],
        tip: 'A giant bat that silences your healer. At half health she turns back into a troll and heals herself. Burn her through it.',
        abilities: [
          { n: 'Sonic Burst', first: 9, every: [16, 20], silence: 'heal', dur: 3 },
          { n: 'Swoop', first: 5, every: [9, 12], school: PHYS, dmg: [900, 1200], to: 'tank', stun: 1 },
          { n: 'Shadow Word: Pain', below: .5, every: [10, 12], dot: { n: 'Shadow Word: Pain', school: SHADOW, per: 330, every: 3, ticks: 6 }, to: 'random' },
          { n: 'Great Heal', below: .5, every: [20, 24], mend: .08 },
          { n: 'Bomb Bats', below: .5, every: [12, 15], dot: { n: 'Throw Liquid Fire', school: FIRE, per: 450, every: 1, ticks: 5 }, to: 'random' },
        ],
      },
      {
        id: 'venoxis', short: "Venoxis", name: 'High Priest Venoxis', model: 15102, health: 600000, armor: 4691, resist: { nature: 186 }, melee: [1800, 2390, 2],
        tip: 'A priest of Hethiss. Holy Nova hits everyone, and at half health he becomes a giant snake that fills the room with poison.',
        abilities: [
          { n: 'Holy Nova', first: 6, every: [9, 12], school: HOLY, dmg: [560, 680], to: 'party' },
          { n: 'Renew', first: 14, every: [22, 26], mend: .04 },
          { n: 'Snake Form', below: .5, once: 1, boss: { speed: 1.3, damage: 1.1 }, dur: 999 },
          { n: 'Poison Cloud', below: .5, every: [10, 12], dot: { n: 'Poison Cloud', school: NATURE, per: 380, every: 2, ticks: 5 }, to: 'party' },
          { n: 'Venom Spit', below: .5, every: [7, 9], school: NATURE, dmg: [900, 1100], to: 'random' },
        ],
      },
      {
        id: 'marli', short: "Mar'li", name: "High Priestess Mar'li", model: 15939, health: 360000, armor: 3795, resist: { nature: 186 }, melee: [1600, 2120, 2],
        tip: 'Poison Bolt Volley hits the whole party, Drain Life heals her, and her spiders must die before she does. Nature Resistance helps.',
        adds: { n: 'Spawn of Mar\'li', count: 2, health: 54000, melee: [900, 1240, 2], armor: 2223 },
        abilities: [
          { n: 'Poison Bolt Volley', first: 5, every: [9, 11], cast: .5, school: NATURE, dmg: [480, 600], to: 'party' },
          { n: 'Drain Life', first: 12, every: [14, 18], school: SHADOW, dmg: [1100, 1300], to: 'random', drain: 3 },
          { n: 'Enveloping Webs', first: 18, every: [20, 25], hinder: 1, dur: 4 },
          { n: 'Corrosive Poison', first: 8, every: [12, 14], dot: { n: 'Corrosive Poison', school: NATURE, per: 420, every: 3, ticks: 5 }, to: 'tank' },
        ],
      },
      {
        id: 'mandokir', short: "Mandokir", name: 'Bloodlord Mandokir', model: 11319, health: 700000, armor: 4691, melee: [2080, 2760, 2.2], levelUp: { n: 'Level Up', damage: .25 }, drop: { id: 19872, kind: 'mount', name: 'Swift Razzashi Raptor', icon: 132253, chance: .05 },
        tip: 'Every hero who dies makes him stronger. His Threatening Gaze punishes your damage dealer, and Mortal Strike cuts the healing on your tank.',
        abilities: [
          { n: 'Threatening Gaze', first: 12, every: [18, 22], school: PHYS, dmg: [2600, 3000], to: 'dps', delay: 4 },
          { n: 'Mortal Strike', first: 7, every: [10, 12], school: PHYS, dmg: [1100, 1400], to: 'tank', curse: { heal: .5 }, dur: 5 },
          { n: 'Whirlwind', first: 16, every: [16, 20], tick: { n: 'Whirlwind', every: 1, school: PHYS, dmg: [500, 700], to: 'melee' }, dur: 2 },
          { n: 'Charge', first: 20, every: [20, 25], school: PHYS, dmg: [900, 1100], to: 'random', stun: 2 },
        ],
      },
      {
        id: 'madness', short: "Madness", name: 'Edge of Madness', model: 8390, health: 560000, armor: 4691, melee: [1700, 2250, 2],
        tip: 'One of four Madness bosses answers the call. Which one changes every run.',
        variants: [
          {
            id: 'grilek', name: "Gri'lek", model: 8390, health: 660000, armor: 5864, melee: [2050, 2700, 2.4],
            tip: 'The Avatar of Hakkar\'s iron fist. When he swells up he hits brutally hard but slowly. Roots stop your melee.',
            abilities: [
              { n: 'Avatar', first: 12, every: [24, 28], boss: { damage: 1.5, speed: .7 }, dur: 12 },
              { n: 'Entangling Roots', first: 7, every: [14, 18], hinder: 1, dur: 4 },
              { n: 'Ground Tremor', first: 18, every: [20, 24], school: PHYS, dmg: [600, 800], to: 'party', stun: 2 },
            ],
          },
          {
            id: 'hazzarah', name: "Hazza'rah", model: 692, health: 580000, armor: 3795, resist: { arcane: 186 }, melee: [1550, 2050, 2],
            tip: 'The Dreamweaver. Mana Burn drains your healer, Sleep stops them cold, and his Nightmare Illusions must be cut down.',
            adds: { n: 'Nightmare Illusion', count: 3, health: 30000, melee: [700, 950, 1.6], armor: 2223 },
            abilities: [
              { n: 'Mana Burn', first: 8, every: [12, 15], burn: { per: 520, every: 1, ticks: 1 } },
              { n: 'Sleep', first: 14, every: [22, 26], silence: 'heal', dur: 5 },
              { n: 'Chain Burn', first: 5, every: [9, 11], school: SHADOW, dmg: [650, 780], to: 'party' },
            ],
          },
          {
            id: 'renataki', name: 'Renataki', model: 592, health: 600000, armor: 4691, melee: [1800, 2380, 1.8],
            tip: 'Of the Thousand Blades. He vanishes where you cannot hit him, then Ambushes someone. Gouge stops your tank.',
            abilities: [
              { n: 'Vanish', first: 14, every: [24, 28], boss: { vanish: 1 }, dur: 5 },
              { n: 'Ambush', first: 19, every: [24, 28], school: PHYS, dmg: [2300, 2700], to: 'random' },
              { n: 'Gouge', first: 8, every: [12, 16], school: PHYS, dmg: [400, 500], to: 'tank', stun: 3 },
              { n: 'Thousand Blades', first: 10, every: [10, 12], tick: { n: 'Thousand Blades', every: 1, school: PHYS, dmg: [350, 450], to: 'melee' }, dur: 3 },
            ],
          },
          {
            id: 'wushoolay', name: 'Wushoolay', model: 590, health: 580000, armor: 3795, resist: { nature: 186 }, melee: [1550, 2050, 2],
            tip: 'The Storm Witch. Chain Lightning arcs through the party and her Lightning Cloud never stops. Nature Resistance shines.',
            abilities: [
              { n: 'Chain Lightning', first: 4, every: [7, 9], cast: .5, school: NATURE, dmg: [700, 860], to: 'party' },
              { n: 'Lightning Cloud', first: 10, every: [20, 22], tick: { n: 'Lightning Cloud', every: 2, school: NATURE, dmg: [400, 500], to: 'party' }, dur: 10 },
              { n: 'Forked Lightning', first: 15, every: [12, 15], school: NATURE, dmg: [1000, 1200], to: 'random' },
            ],
          },
        ],
        abilities: [],
      },
      {
        id: 'gahzranka', short: "Gahz'ranka", name: "Gahz'ranka", model: 15288, health: 720000, armor: 4691, resist: { frost: 186 }, melee: [1900, 2520, 2.4],
        tip: 'The great fish of the lagoon. Frost Breath drains mana from the whole party and Massive Geyser throws your melee around.',
        abilities: [
          { n: 'Frost Breath', first: 8, every: [12, 15], school: FROST, dmg: [700, 900], to: 'party' },
          { n: 'Chilling Mana', first: 9, every: [12, 15], burn: { per: 300, every: 1, ticks: 2 } },
          { n: 'Massive Geyser', first: 15, every: [18, 22], school: NATURE, dmg: [500, 700], to: 'party', knock: 4 },
          { n: 'Slam', first: 5, every: [8, 10], school: PHYS, dmg: [1200, 1500], to: 'tank' },
        ],
      },
      {
        id: 'thekal', short: "Thekal", name: 'High Priest Thekal', model: 11447, health: 470000, tune: .64, enrageBy: 1.85, armor: 5864, resist: { fire: 140 }, drop: { id: 19902, kind: 'mount', name: 'Swift Zulian Tiger', icon: 132242, chance: .05 }, melee: [1700, 2250, 2],
        tip: 'Zealot Lor\'Khan heals him and Zealot Zath stuns. Kill them first. When Thekal falls he rises again as a tiger.',
        adds: { n: 'Zealot', count: 2, health: 52000, melee: [950, 1320, 2], armor: 3200, heals: { n: 'Great Heal', amount: 1900, every: 14 } },
        abilities: [
          { n: 'Mortal Cleave', first: 6, every: [10, 12], school: PHYS, dmg: [1300, 1600], to: 'tank' },
          { n: 'Silence', first: 12, every: [18, 22], silence: 'heal', dur: 4 },
          { n: 'Tiger Form', below: .03, once: 1, boss: { speed: 1.35, damage: 1.15 }, dur: 999 },
          { n: 'Rise Again', below: .03, once: 1, shield: 26000 },
          { n: 'Force Punch', first: 22, every: [16, 20], school: PHYS, dmg: [700, 900], to: 'party', knock: 2 },
        ],
      },
      {
        id: 'arlokk', short: "Arlokk", name: 'High Priestess Arlokk', model: 11910, health: 640000, armor: 4691, resist: { fire: 140 }, melee: [1820, 2400, 1.8],
        tip: 'She vanishes and stalks you while her panthers attack, then Ravages someone from the shadows. Gouge stops your tank.',
        adds: { n: 'Zulian Prowler', count: 2, health: 40000, melee: [850, 1150, 1.6], armor: 2223 },
        abilities: [
          { n: 'Mark of Arlokk', first: 5, every: [18, 22], dot: { n: 'Mark of Arlokk', school: PHYS, per: 260, every: 2, ticks: 6 }, to: 'random' },
          { n: 'Vanish', first: 20, every: [28, 32], boss: { vanish: 1 }, dur: 6 },
          { n: 'Ravage', first: 26, every: [28, 32], school: PHYS, dmg: [2500, 2900], to: 'random', stun: 2 },
          { n: 'Gouge', first: 9, every: [14, 18], school: PHYS, dmg: [400, 500], to: 'tank', stun: 3 },
          { n: 'Whirlwind', first: 14, every: [16, 18], tick: { n: 'Whirlwind', every: 1, school: PHYS, dmg: [450, 600], to: 'melee' }, dur: 2 },
        ],
      },
      {
        id: 'jindo', short: "Jin'do", name: "Jin'do the Hexxer", model: 693, health: 680000, armor: 3795, resist: { shadow: 186, arcane: 140 }, melee: [1650, 2180, 2],
        tip: 'Hex turns your healer into a frog, Brain Wash takes your damage dealer, and his Healing Ward must die before he does.',
        adds: { n: 'Powerful Healing Ward', count: 1, health: 46000, melee: [0, 0, 999], armor: 0, heals: { n: 'Powerful Healing Ward', amount: 2900, every: 6 } },
        abilities: [
          { n: 'Hex', first: 10, every: [16, 20], silence: 'heal', dur: 5 },
          { n: 'Brain Wash', first: 18, every: [24, 28], control: 'dps', dur: 6 },
          { n: 'Delusions of Jin\'do', first: 6, every: [24, 24], curse: { magic: 1.5 }, dur: 16 },
          { n: 'Shadow Bolt', first: 4, every: [4, 6], cast: .5, school: SHADOW, dmg: [1500, 1900], to: 'random' },
        ],
      },
      {
        id: 'hakkar', name: 'Hakkar', model: 15295, health: 1099230, armor: 4691, resist: { nature: 93, fire: 140, arcane: 93 }, melee: [1999, 2651, 2.8], endless: 1,
        tip: 'The Final Stand. The Soulflayer cannot die and he only gets stronger. Deal as much damage as you can before he drinks you dry. That number is your score.',
        fury: { after: 45, every: 15, damage: .08 },
        abilities: [
          { n: 'Corrupted Blood', first: 10, every: [16, 20], dot: { n: 'Corrupted Blood', school: NATURE, per: 290, every: 2, ticks: 5 }, to: 'party' },
          { n: 'Blood Siphon', first: 60, every: [60, 60], school: NATURE, dmg: [1300, 1300], to: 'party', boss: { damage: 1.25 }, dur: 20 },
          { n: 'Cause Insanity', first: 25, every: [25, 30], control: 'dps', dur: 6 },
          { n: 'Will of Hakkar', first: 15, every: [20, 25], school: SHADOW, dmg: [1500, 1900], to: 'random' },
          { n: 'Poisonous Blood', first: 8, every: [10, 14], school: NATURE, dmg: [2160, 2640], to: 'tank', dot: { n: 'Poisonous Blood', school: NATURE, per: 500, every: 1, ticks: 8 } },
        ],
      },
    ],
  },
  aq20: {
    id: 'aq20',
    name: "Ruins of Ahn'Qiraj",
    blurb: 'Six bosses of sand and stone. Fewer fights, richer spoils. Ossirian never falls.',
    theme: { floor: 'terrain_sand', wall: 'terrain_sand', fog: 0x2a1d0a, light: 0xffc46a, set: 'desert', zone: 'ahnqiraj' },
    finale: 'Ossirian',
    milestones: AQ_MILESTONES,
    pace: 1.8,
    enrage: .86,
    hit: 1.16,
    bonusSpoils: 1,
    bosses: [
      {
        id: 'kurinnaxx', short: 'Kurinnaxx', name: 'Kurinnaxx', model: 15742, health: 430000, enrageBy: .78, armor: 3795, resist: { arcane: 140, fire: 140, frost: 140 }, melee: [1700, 2250, 2],
        tip: 'Sand-hardened scales turn spells aside, but steel bites deep. Every Mortal Wound cuts the healing on your tank a little more, and he enrages at the end.',
        abilities: [
          { n: 'Mortal Wound', first: 5, every: [6, 7], school: PHYS, dmg: [600, 800], to: 'tank', curse: { heal: .9 }, dur: 15 },
          { n: 'Sand Trap', first: 10, every: [12, 15], school: NATURE, dmg: [800, 1000], to: 'random', stun: 3 },
          { n: 'Wide Slash', first: 8, every: [10, 13], school: PHYS, dmg: [900, 1100], to: 'melee' },
          { n: 'Enrage', below: .3, once: 1, boss: { speed: 1.3, damage: 1.2 }, dur: 999 },
        ],
      },
      {
        id: 'rajaxx', short: 'Rajaxx', name: 'General Rajaxx', model: 15376, health: 560000, enrageBy: .95, armor: 3795, melee: [1750, 2300, 2], drop: { id: 21138, kind: 'relic', name: 'Red Scepter Shard', icon: 134130, chance: .06 },
        tip: 'His captains come first. Thundercrash then takes half of everyone\'s health at once, so keep the whole party topped up.',
        adds: { n: 'Qiraji Captain', count: 3, health: 42000, melee: [950, 1250, 2], armor: 3795 },
        abilities: [
          { n: 'Thundercrash', first: 18, every: [26, 30], halve: .5, to: 'party' },
          { n: 'Disarm', first: 9, every: [18, 22], hinder: 1, dur: 3 },
          { n: 'Frenzy', below: .4, once: 1, boss: { speed: 1.25 }, dur: 999 },
        ],
      },
      {
        id: 'moam', short: 'Moam', name: 'Moam', model: 15392, health: 760000, enrageBy: 1.26, armor: 5200, resist: { arcane: 186 }, melee: [1850, 2450, 2.2], drop: { id: 21137, kind: 'relic', name: 'Blue Scepter Shard', icon: 134133, chance: .06 },
        tip: 'A stone giant with the thickest hide in the Ruins, so spells beat steel. He drains your healer, turns to stone while his Mana Fiends blast the party, and erupts with all the mana he stole.',
        abilities: [
          { n: 'Drain Mana', first: 6, every: [6, 6], burn: { per: 200, every: 1, ticks: 1 } },
          { n: 'Stone Form', first: 30, every: [42, 46], boss: { vanish: 1 }, dur: 10, tick: { n: 'Mana Fiend', every: 2, school: ARCANE, dmg: [500, 640], to: 'party' } },
          { n: 'Arcane Eruption', first: 75, every: [75, 75], cast: 1, school: ARCANE, dmg: [2200, 2600], to: 'party' },
        ],
      },
      {
        id: 'buru', short: 'Buru', name: 'Buru the Gorger', model: 15654, health: 700000, enrageBy: .88, armor: 3795, resist: { arcane: 140, fire: 140, frost: 140 }, melee: [1900, 2500, 2.2],
        tip: 'His carapace shrugs off spells, so weapons do the work. Hit his eggs first: each one that bursts tears a chunk out of Buru. At the end he sheds his shell, takes more damage and spreads Creeping Plague.',
        adds: { n: 'Buru Egg', count: 4, health: 36000, melee: [0, 0, 999], armor: 0, death: { n: 'Egg Burst', school: NATURE, dmg: [500, 700], to: 'party', bossDamage: .06 } },
        abilities: [
          { n: 'Dismember', first: 6, every: [8, 10], school: PHYS, dot: { n: 'Dismember', school: PHYS, per: 280, every: 2, ticks: 6 }, to: 'tank' },
          { n: 'Gorge', first: 12, every: [15, 18], school: PHYS, dmg: [1500, 1800], to: 'dps' },
          { n: 'Full Speed', below: .2, once: 1, boss: { speed: 1.3, damage: 1.25, allTaken: 1.4 }, dur: 999, tick: { n: 'Creeping Plague', every: 2, school: NATURE, dmg: [300, 380], to: 'party' } },
        ],
      },
      {
        id: 'ayamiss', short: 'Ayamiss', name: 'Ayamiss the Hunter', model: 15431, health: 620000, enrageBy: 1.1, armor: 3795, resist: { nature: -40 }, melee: [1600, 2100, 1.6], air: .7, airHit: .65, drop: { id: 21139, kind: 'relic', name: 'Green Scepter Shard', icon: 134106, chance: .06 },
        tip: 'She stays in the air until 70% health. Melee only catch her on her dives, while spells and arrows hit her freely. Paralyze feeds a hero to her larva unless your healer keeps them alive.',
        abilities: [
          { n: 'Stinger Spray', first: 4, every: [6, 8], school: NATURE, dmg: [560, 700], to: 'party' },
          { n: 'Poison Stinger', first: 2, every: [3, 5], cast: .5, school: NATURE, dmg: [800, 1000], to: 'random' },
          { n: 'Paralyze', first: 14, every: [22, 26], stun: 8, to: 'random', school: NATURE, dmg: [2400, 2800], delay: 8 },
          { n: 'Frenzy', below: .2, once: 1, boss: { speed: 1.5 }, dur: 999 },
        ],
      },
      {
        id: 'ossirian', name: 'Ossirian the Unscarred', model: 15432, health: 1099230, armor: 4691, resist: { fire: 140, frost: 140, nature: 110, shadow: 90, arcane: 140 }, melee: [2050, 2700, 2.6], endless: 1, drop: { id: 21220, kind: 'relic', name: 'Head of Ossirian the Unscarred', icon: 132192, chance: .05 },
        weak: { every: 20, schools: [FIRE, FROST, NATURE, SHADOW, ARCANE], up: 2.6 },
        tip: 'The Final Stand. The Strength of Ossirian shrugs off magic, except the one school his crystal weakens, and that school changes every 20 seconds. His Curse of Tongues slows every spellcaster, healer included. Deal as much damage as you can before the sands bury you.',
        fury: { after: 45, every: 15, damage: .08 },
        abilities: [
          { n: 'War Stomp', first: 18, every: [20, 25], school: PHYS, dmg: [800, 1000], to: 'party', stun: 1 },
          { n: 'Cyclone', first: 10, every: [14, 18], school: PHYS, dmg: [1200, 1500], to: 'random', stun: 2 },
          { n: 'Curse of Tongues', first: 6, every: [30, 30], curse: { castTime: 1.4 }, dur: 12 },
          { n: 'Sandstorm', first: 30, every: [32, 36], tick: { n: 'Sandstorm', every: 2, school: NATURE, dmg: [380, 460], to: 'party' }, dur: 8 },
          { n: 'Crushing Blow', first: 8, every: [10, 14], school: PHYS, dmg: [2160, 2640], to: 'tank', dot: { n: 'Sand Wound', school: PHYS, per: 450, every: 1, ticks: 8 } },
        ],
      },
    ],
  },
};

for (const raid of Object.values(RAIDS)) raid.bosses.forEach((b, i) => { b.step = Math.round(i * (raid.pace || 1)); if (raid.enrage && !b.endless) b.enrageBy = (b.enrageBy || 1) * raid.enrage; if (raid.hit && !b.endless) b.hit = raid.hit; for (const v of b.variants || []) v.step = b.step; });
