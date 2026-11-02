export const BOON_WINS = [3, 6, 9];
export const BOON_CHOICES = 4;

export const BOONS = [
  { id: 'magni', kind: 'guard', art: 'warriorarms', hero: 'Magni Bronzebeard', title: 'Ironforge Bulwark', text: '+1100 armor', icon: 'spell_nature_stoneskintotem', stats: { armor: 1100 } },
  { id: 'cairne', kind: 'guard', art: 'druidrestoration', hero: 'Cairne Bloodhoof', title: "Earthmother's Vigor", text: '+500 health', icon: 'spell_nature_earthquake', hp: 500 },
  { id: 'varian', kind: 'might', art: 'warriorarms', hero: 'Varian Wrynn', title: "Lion's Fury", text: '+8% damage', icon: 'ability_warrior_rallyingcry', boon: { dmg: .08 } },
  { id: 'uther', kind: 'guard', art: 'priestholy', hero: 'Prophet Velen', title: 'Light of the Naaru', text: '7% less damage taken', icon: 'spell_holy_devotionaura', boon: { taken: .07 } },
  { id: 'illidan', kind: 'might', art: 'priestshadow', hero: 'Illidan Stormrage', title: "Demon's Focus", text: '+6% crit with attacks and spells', icon: 'spell_shadow_demonform', stats: { crit: 6, scrit: 6 } },
  { id: 'thrall', kind: 'might', art: 'shamanrestoration', hero: 'Thrall', title: 'Fury of the Doomhammer', text: 'Lightning strikes your enemy every 12 sec', icon: 'spell_nature_chainlightning', boon: { pulse: { every: 12, dmg: 125, school: 'nature', name: 'Doomhammer Bolt' } } },
  { id: 'sylvanas', kind: 'might', art: 'priestshadow', hero: 'Sylvanas Windrunner', title: "Banshee's Hunger", text: 'Heal for 10% of the damage you deal', icon: 'spell_shadow_lifedrain02', boon: { leech: .1 } },
  { id: 'jaina', kind: 'guard', art: 'magearcane', hero: 'Jaina Proudmoore', title: 'Ice Barrier', text: 'Start each fight with a 700 damage shield', icon: 'spell_frost_frostward', boon: { shield: 700 } },
  { id: 'tyrande', kind: 'guard', art: 'druidferalcombat', hero: 'Tyrande Whisperwind', title: "Elune's Grace", text: 'Restore 0.7% of your health every 2 sec', icon: 'spell_holy_elunesgrace', boon: { hot: .007 } },
  { id: 'malfurion', kind: 'guard', art: 'druidrestoration', hero: 'Genn Greymane', title: 'Savage Retaliation', text: 'Attackers take 50 Nature damage per hit', icon: 'spell_nature_thorns', boon: { thorns: 50 } },
  { id: 'bolvar', kind: 'guard', art: 'priestholy', hero: "Kael'thas Sunstrider", title: 'Phoenix Rebirth', text: 'Once per fight, heal 10% when below 20% health', icon: 'spell_holy_divineintervention', boon: { save: .1 } },
  { id: 'voljin', kind: 'guard', art: 'shamanrestoration', hero: "Zul'jin", title: 'Unbroken Will', text: 'Stuns, fears and other crowd control last 50% shorter', icon: 'spell_shadow_requiem', boon: { ccShort: .5 } },
  { id: 'grom', kind: 'might', art: 'hunterbeastmastery', hero: 'Garrosh Hellscream', title: 'Blood Frenzy', text: '+20% damage while below 40% health', icon: 'ability_warrior_innerrage', boon: { rage: .2 } },
  { id: 'chen', kind: 'guard', art: 'roguecombat', hero: 'Lady Vashj', title: "Serpent's Grace", text: '8% chance to avoid any attack or spell', icon: 'inv_drink_05', boon: { dodge: .08 } },
  { id: 'medivh', kind: 'might', art: 'magearcane', hero: 'Medivh', title: 'Opening Gambit', text: '+18% damage for the first 15 sec', icon: 'spell_arcane_arcanetorrent', boon: { opening: .18 } },
  { id: 'arthas', kind: 'might', art: 'magearcane', hero: 'Arthas Menethil', title: 'Frostmourne Hungers', text: 'Your enemy heals 35% less', icon: 'inv_sword_39', boon: { grievous: .35 } },
  { id: 'ragnaros', kind: 'might', art: 'magefire', hero: 'Ragnaros the Firelord', title: 'By Fire Be Purged', text: '+25% damage to enemies below 35% health', icon: 'spell_fire_elementaldevastation', boon: { execute: .25 } },
  { id: 'onyxia', kind: 'summon', art: 'magefire', hero: 'Onyxia', title: 'Brood Mother', text: 'A whelp fights at your side', icon: 'inv_misc_head_dragon_black', boon: { ally: { model: 'whelp', name: 'Onyxian Whelp', dmg: 31 } } },
  { id: 'kelthuzad', kind: 'summon', art: 'priestshadow', hero: "Kel'Thuzad", title: 'Raise the Fallen', text: 'A skeleton fights at your side', icon: 'spell_shadow_raisedead', boon: { ally: { model: 'skeleton', name: 'Risen Skeleton', dmg: 31 } } },
  { id: 'rexxar', kind: 'summon', art: 'hunterbeastmastery', hero: 'Rexxar', title: 'Beast Bond', text: 'A spirit tiger fights at your side', icon: 'ability_mount_whitetiger', boon: { ally: { model: 'eskhandar', name: 'Spirit Tiger', dmg: 31 } } },
  { id: 'gazlowe', kind: 'fortune', art: 'roguecombat', hero: 'Edwin VanCleef', title: 'Defias Plunder', text: '+3 gold every round, and your first reroll is free', icon: 'inv_misc_coin_02', gold: 3, freeReroll: 1 },
  { id: 'gallywix', kind: 'fortune', art: 'roguecombat', hero: 'Jastor Gallywix', title: 'Golden Parachute', text: '+3 gold every round, and keep up to 6 unspent gold', icon: 'inv_misc_coin_17', gold: 3, carry: 6 },
  { id: 'mekkatorque', kind: 'fortune', art: 'warriorarms', hero: 'Gelbin Mekkatorque', title: 'Gnomish Workbench', text: 'The Armorer shows a 5th slot, and you pick from 4 items instead of 3', icon: 'inv_misc_gear_01', tinker: 1 },
  { id: 'moira', kind: 'fortune', art: 'magefire', hero: 'Moira Thaurissan', title: 'Black Iron Forge', text: 'Armorer items are 7 item levels higher', icon: 'inv_hammer_05', forge: 7 },
];

export const BOON_KIND = { guard: 'Protection', might: 'Might', summon: 'Companion', fortune: 'Fortune' };
export const BOON = Object.fromEntries(BOONS.map((b) => [b.id, b]));
export const boonIcon = (id) => `assets/draft/arena/boons/${id}.jpg`;
export const boonsOf = (ids = []) => ids.map((id) => BOON[id]).filter(Boolean);
export const boonSum = (ids, key) => boonsOf(ids).reduce((sum, b) => sum + (b[key] || 0), 0);
