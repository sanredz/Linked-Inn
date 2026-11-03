import { boonsOf } from './boons.js';

const CASTER = ['PRIEST', 'MAGE', 'WARLOCK'];
const MANA = ['PALADIN', 'HUNTER', 'PRIEST', 'SHAMAN', 'MAGE', 'WARLOCK', 'DRUID'];
const PHYS = ['WARRIOR', 'PALADIN', 'HUNTER', 'ROGUE', 'SHAMAN', 'DRUID'];
const ALL = [...new Set([...MANA, ...PHYS])];
const MELEE = ['WARRIOR', 'PALADIN', 'ROGUE', 'SHAMAN', 'DRUID'];
const STR = ['WARRIOR', 'PALADIN', 'SHAMAN', 'DRUID'];
const AGILE = ['ROGUE', 'HUNTER', 'DRUID'];

export const CONSUMES = [
  { id: 'mongoose', name: 'Elixir of the Mongoose', icon: 134812, text: '+25 Agility and +2% crit', use: ['HUNTER', 'ROGUE', 'DRUID', 'WARRIOR'], stats: { agi: 25, crit: 2 }, price: 1 },
  { id: 'giants', name: 'Elixir of Giants', icon: 134841, text: '+25 Strength', use: STR, stats: { str: 25 }, price: 1 },
  { id: 'juju', name: 'Juju Might', icon: 134309, text: '+40 attack power', use: PHYS, stats: { ap: 40, rap: 40 }, price: 1 },
  { id: 'arcane', name: 'Greater Arcane Elixir', icon: 134805, text: '+35 spell damage', use: CASTER, stats: { sp: 35 }, price: 1 },
  { id: 'supreme', name: 'Flask of Supreme Power', icon: 134821, text: '+150 spell damage', use: CASTER, stats: { sp: 150 }, price: 4 },
  { id: 'titans', name: 'Flask of the Titans', icon: 134842, text: '+1200 health', use: ALL, hp: 1200, price: 4 },
  { id: 'wisdom', name: 'Flask of Distilled Wisdom', icon: 134877, text: '+2000 mana', use: MANA, mana: 2000, price: 1 },
  { id: 'fort', name: 'Elixir of Fortitude', icon: 134823, text: '+120 health', use: ALL, hp: 120, price: 1 },
  { id: 'defense', name: 'Elixir of Superior Defense', icon: 134846, text: '+450 armor', use: ALL, stats: { armor: 450 }, price: 1 },
  { id: 'stone', name: 'Greater Stoneshield Potion', icon: 134849, text: '+2000 armor', use: ALL, stats: { armor: 2000 }, price: 3 },
  { id: 'blood', name: 'Mageblood Potion', icon: 134825, text: '12 mana every 5 sec', use: MANA, stats: { mp5: 12 }, price: 1 },
  { id: 'heal', name: 'Major Healing Potion', icon: 236885, text: 'Restores 1350 to 1650 health when you are low', use: ALL, kit: 'heal', price: 4 },
  { id: 'mana', name: 'Major Mana Potion', icon: 134856, text: 'Restores 1350 to 2250 mana when you run low', use: MANA, kit: 'mana', price: 1 },
  { id: 'action', name: 'Free Action Potion', icon: 134715, text: 'Immune to stuns, roots and slows for 30 sec', use: ALL, kit: 'action', price: 4 },
  { id: 'invuln', name: 'Limited Invulnerability Potion', icon: 134842, text: 'Immune to physical attacks for 6 sec', use: ALL, kit: 'invuln', price: 3 },
  { id: 'swift', name: 'Swiftness Potion', icon: 134875, text: '+50% run speed for 15 sec', use: ALL, kit: 'swift', price: 1 },
  { id: 'rage', name: 'Mighty Rage Potion', icon: 134821, text: '+45 to 75 rage and +60 Strength for 20 sec', use: ['WARRIOR'], kit: 'rage', price: 3 },
  { id: 'grenade', name: 'Thorium Grenade', icon: 133716, text: '300 to 500 damage and a 3 sec stun', use: ALL, kit: 'grenade', price: 3 },
  { id: 'sapper', name: 'Goblin Sapper Charge', icon: 135826, text: '450 to 750 damage, but it hurts you too', use: ALL, kit: 'sapper', price: 1 },
  { id: 'dynamite', name: 'Dense Dynamite', icon: 133714, text: '340 to 460 damage', use: ALL, kit: 'dynamite', price: 1 },
  { id: 'shadow', name: 'Greater Shadow Protection Potion', icon: 134803, text: 'Absorbs 800 to 1300 Shadow damage', use: ALL, kit: 'shadow', price: 3, against: ['PRIEST', 'WARLOCK'] },
  { id: 'frost', name: 'Greater Frost Protection Potion', icon: 134800, text: 'Absorbs 800 to 1300 Frost damage', use: ALL, kit: 'frost', price: 3, against: ['MAGE'] },
  { id: 'nature', name: 'Greater Nature Protection Potion', icon: 134802, text: 'Absorbs 800 to 1300 Nature damage', use: ALL, kit: 'nature', price: 3, against: ['SHAMAN', 'HUNTER'] },
  { id: 'stonesharp', name: 'Elemental Sharpening Stone', icon: 135228, text: '+2% crit', use: MELEE, stats: { crit: 2 }, price: 1 },
  { id: 'wizard', name: 'Brilliant Wizard Oil', icon: 134727, text: '+36 spell damage and +1% spell crit', use: CASTER, stats: { sp: 36, scrit: 1 }, price: 1 },
  { id: 'roids', name: 'R.O.I.D.S.', icon: 135241, text: '+25 Strength', use: STR, stats: { str: 25 }, price: 1 },
  { id: 'scorpok', name: 'Ground Scorpok Assay', icon: 133849, text: '+25 Agility', use: AGILE, stats: { agi: 25 }, price: 1 },
  { id: 'firewater', name: 'Winterfall Firewater', icon: 134872, text: '+35 attack power', use: PHYS, stats: { ap: 35, rap: 35 }, price: 1 },
  { id: 'lung', name: 'Lung Juice Cocktail', icon: 132799, text: '+25 Stamina', use: ALL, stats: { sta: 25 }, price: 1 },
  { id: 'cortex', name: 'Cerebral Cortex Compound', icon: 134812, text: '+25 Intellect', use: MANA, stats: { int: 25 }, price: 1 },
  { id: 'gint', name: 'Elixir of Greater Intellect', icon: 134721, text: '+25 Intellect', use: MANA, stats: { int: 25 }, price: 1 },
  { id: 'shadowpow', name: 'Elixir of Shadow Power', icon: 134828, text: '+40 Shadow damage', use: ['PRIEST', 'WARLOCK'], stats: { sp: 40 }, price: 2 },
  { id: 'frostpow', name: 'Elixir of Frost Power', icon: 134856, text: '+15 Frost damage', use: ['MAGE'], stats: { sp: 15 }, price: 1 },
  { id: 'eagi', name: 'Elixir of Agility', icon: 134873, text: '+15 Agility', use: AGILE, stats: { agi: 15 }, price: 1 },
  { id: 'scrollagi', name: 'Scroll of Agility IV', icon: 134938, text: '+17 Agility', use: AGILE, stats: { agi: 17 }, price: 1 },
  { id: 'scrollstr', name: 'Scroll of Strength IV', icon: 134938, text: '+17 Strength', use: STR, stats: { str: 17 }, price: 1 },
  { id: 'scrollarm', name: 'Scroll of Protection IV', icon: 134943, text: '+240 armor', use: ALL, stats: { armor: 240 }, price: 1 },
  { id: 'rumsey', name: 'Rumsey Rum Black Label', icon: 132791, text: '+15 Stamina', use: ALL, stats: { sta: 15 }, price: 1 },
  { id: 'zanza', name: 'Spirit of Zanza', icon: 134810, text: '+50 Stamina and +50 Spirit', use: ALL, stats: { sta: 50, spi: 50 }, price: 2 },
  { id: 'dumplings', name: 'Smoked Desert Dumplings', icon: 134020, text: '+20 Strength', use: STR, stats: { str: 20 }, price: 1 },
  { id: 'squid', name: 'Grilled Squid', icon: 133899, text: '+1% crit', use: PHYS, stats: { crit: 1 }, price: 1 },
  { id: 'nightfin', name: 'Nightfin Soup', icon: 132804, text: '+22 spell damage', use: CASTER, stats: { sp: 22 }, price: 1 },
  { id: 'sagefish', name: 'Sagefish Delight', icon: 133907, text: '+7 spell damage', use: CASTER, stats: { sp: 7 }, price: 1 },
  { id: 'tuber', name: 'Runn Tum Tuber Surprise', icon: 134019, text: '+15 Intellect', use: MANA, stats: { int: 15 }, price: 1 },
];

const ICON = 136244;
export const ENCHANTS = [
  { id: 'crusader', slot: 'main', name: 'Crusader', text: 'Chance on hit for +100 Strength for 15 sec', use: MELEE, crusader: 1, price: 2 },
  { id: 'wagi', slot: 'main', name: 'Agility', text: '+15 Agility', use: ['ROGUE', 'HUNTER', 'WARRIOR'], stats: { agi: 15 }, price: 2 },
  { id: 'wstr', slot: 'main', name: 'Strength', text: '+15 Strength', use: STR, stats: { str: 15 }, price: 2 },
  { id: 'wstrike', slot: 'main', name: 'Superior Striking', text: '+5 weapon damage', use: MELEE, weapon: 5, price: 2 },
  { id: 'wspell', slot: 'main', name: 'Spell Power', text: '+30 spell damage', use: CASTER, stats: { sp: 30 }, price: 3 },
  { id: 'cstats', slot: 'chest', name: 'Greater Stats', text: '+4 to all stats', use: ALL, stats: { str: 4, agi: 4, sta: 4, int: 4, spi: 4 }, price: 2 },
  { id: 'chealth', slot: 'chest', name: 'Major Health', text: '+100 health', use: ALL, hp: 100, price: 2 },
  { id: 'cmana', slot: 'chest', name: 'Major Mana', text: '+100 mana', use: MANA, mana: 100, price: 1 },
  { id: 'bstr', slot: 'wrist', name: 'Superior Strength', text: '+9 Strength', use: STR, stats: { str: 9 }, price: 1 },
  { id: 'bsta', slot: 'wrist', name: 'Superior Stamina', text: '+9 Stamina', use: ALL, stats: { sta: 9 }, price: 2 },
  { id: 'bint', slot: 'wrist', name: 'Greater Intellect', text: '+7 Intellect', use: MANA, stats: { int: 7 }, price: 1 },
  { id: 'fagi', slot: 'feet', name: 'Greater Agility', text: '+7 Agility', use: AGILE, stats: { agi: 7 }, price: 1 },
  { id: 'fsta', slot: 'feet', name: 'Greater Stamina', text: '+7 Stamina', use: ALL, stats: { sta: 7 }, price: 2 },
  { id: 'hstr', slot: 'hands', name: 'Greater Strength', text: '+7 Strength', use: STR, stats: { str: 7 }, price: 1 },
  { id: 'hagi', slot: 'hands', name: 'Greater Agility', text: '+7 Agility', use: AGILE, stats: { agi: 7 }, price: 1 },
  { id: 'hshadow', slot: 'hands', name: 'Shadow Power', text: '+20 Shadow damage', use: ['PRIEST', 'WARLOCK'], stats: { sp: 20 }, price: 2 },
  { id: 'hfrost', slot: 'hands', name: 'Frost Power', text: '+20 Frost damage', use: ['MAGE'], stats: { sp: 20 }, price: 2 },
  { id: 'cagi', slot: 'back', name: 'Lesser Agility', text: '+3 Agility', use: AGILE, stats: { agi: 3 }, price: 1 },
  { id: 'carm', slot: 'back', name: 'Superior Defense', text: '+70 armor', use: ALL, stats: { armor: 70 }, price: 1 },
  { id: 'wstrike4', slot: 'main', name: 'Greater Striking', text: '+4 weapon damage', use: MELEE, weapon: 4, price: 1 },
  { id: 'wint', slot: 'main', name: 'Mighty Intellect', text: '+22 Intellect', use: CASTER, stats: { int: 22 }, price: 2 },
  { id: 'cstats3', slot: 'chest', name: 'Stats', text: '+3 to all stats', use: ALL, stats: { str: 3, agi: 3, sta: 3, int: 3, spi: 3 }, price: 1 },
  { id: 'bstr7', slot: 'wrist', name: 'Greater Strength', text: '+7 Strength', use: STR, stats: { str: 7 }, price: 1 },
  { id: 'bsta7', slot: 'wrist', name: 'Greater Stamina', text: '+7 Stamina', use: ALL, stats: { sta: 7 }, price: 1 },
  { id: 'bmp5', slot: 'wrist', name: 'Mana Regeneration', text: '4 mana every 5 sec', use: MANA, stats: { mp5: 4 }, price: 1 },
  { id: 'fagi5', slot: 'feet', name: 'Agility', text: '+5 Agility', use: AGILE, stats: { agi: 5 }, price: 1 },
  { id: 'fsta5', slot: 'feet', name: 'Stamina', text: '+5 Stamina', use: ALL, stats: { sta: 5 }, price: 1 },
  { id: 'hagi15', slot: 'hands', name: 'Superior Agility', text: '+15 Agility', use: AGILE, stats: { agi: 15 }, price: 2 },
  { id: 'hagi5', slot: 'hands', name: 'Agility', text: '+5 Agility', use: AGILE, stats: { agi: 5 }, price: 1 },
  { id: 'afocus', slot: 'head', name: 'Arcanum of Focus', text: '+8 spell damage', use: CASTER, stats: { sp: 8 }, price: 1 },
  { id: 'aconst', slot: 'head', name: 'Arcanum of Constitution', text: '+100 health', use: ALL, hp: 100, price: 2 },
  { id: 'avorstr', slot: 'head', name: 'Arcanum of Voracity', text: '+8 Strength', use: STR, stats: { str: 8 }, price: 1 },
  { id: 'avoragi', slot: 'head', name: 'Arcanum of Voracity', text: '+8 Agility', use: AGILE, stats: { agi: 8 }, price: 1 },
  { id: 'lvorsta', slot: 'legs', name: 'Arcanum of Voracity', text: '+8 Stamina', use: ALL, stats: { sta: 8 }, price: 1 },
  { id: 'lvorint', slot: 'legs', name: 'Arcanum of Voracity', text: '+8 Intellect', use: MANA, stats: { int: 8 }, price: 1 },
  { id: 'lrumin', slot: 'legs', name: 'Arcanum of Rumination', text: '+150 mana', use: MANA, mana: 150, price: 1 },
  { id: 'smight', slot: 'shoulder', name: 'Zandalar Signet of Might', text: '+30 attack power', use: PHYS, stats: { ap: 30, rap: 30 }, price: 2 },
  { id: 'smojo', slot: 'shoulder', name: 'Zandalar Signet of Mojo', text: '+18 spell damage', use: CASTER, stats: { sp: 18 }, price: 2 },
  { id: 'sfort', slot: 'shoulder', name: 'Fortitude of the Scourge', text: '+16 Stamina and +100 armor', use: ALL, stats: { sta: 16, armor: 100 }, price: 2 },
].map((e) => ({ ...e, icon: ICON }));

const STR_AP = { WARRIOR: 2, PALADIN: 2, SHAMAN: 2, DRUID: 2, HUNTER: 1, ROGUE: 1, PRIEST: 1, MAGE: 1, WARLOCK: 1 };
const AGI_AP = { ROGUE: 1, HUNTER: 1, DRUID: 2, WARRIOR: 0, PALADIN: 0, SHAMAN: 0, PRIEST: 0, MAGE: 0, WARLOCK: 0 };
const AGI_CRIT = { WARRIOR: 20, PALADIN: 19.8, HUNTER: 52.9, ROGUE: 29, PRIEST: 20, SHAMAN: 19.7, MAGE: 19.5, WARLOCK: 20, DRUID: 20 };
const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
export const CONSUME = byId(CONSUMES);
export const ENCHANT = byId(ENCHANTS);

export function extraOf(cls, consumes = [], enchants = {}, boons = []) {
  const stats = {}, kit = [], chosen = boonsOf(boons), list = [...consumes.map((id) => CONSUME[id]), ...Object.values(enchants).map((id) => ENCHANT[id]), ...chosen].filter(Boolean), boon = {};
  for (const { boon: b } of chosen) {
    for (const [k, v] of Object.entries(b || {})) {
      if (k === 'ally') (boon.allies ||= []).push(v);
      else if (typeof v === 'number') boon[k] = (boon[k] || 0) + v;
      else boon[k] = v;
    }
  }
  let hp = 0, mana = 0, crusader = 0;
  const add = (k, v) => { stats[k] = (stats[k] || 0) + v; };
  for (const x of list) {
    hp += x.hp || 0;
    mana += x.mana || 0;
    crusader += x.crusader || 0;
    if (x.kit) kit.push(x.kit);
    if (x.weapon) add('ap', x.weapon * 14 / 2.5);
    for (const [k, v] of Object.entries(x.stats || {})) {
      if (k === 'str') add('ap', v * STR_AP[cls]);
      else if (k === 'agi') { add('agi', v); add('ap', v * AGI_AP[cls]); add('crit', v / AGI_CRIT[cls]); if (cls === 'HUNTER') add('rap', v * 2); } else if (k === 'int') { mana += v * 15; add('scrit', v / 60); } else add(k, v);
    }
  }
  return { stats, hp, mana, kit, crusader, boon };
}
