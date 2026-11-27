import { RELICS, MOUNTS, forged, count } from './feats.js?v=20261127173000';
import { LOOT } from '../raid/worldloot.js?v=20261127173000';

const DPS_MARKS = { WARRIOR: [260, 280, 310], PALADIN: [215, 230, 245], HUNTER: [255, 270, 285], ROGUE: [270, 285, 310], PRIEST: [370, 385, 405], SHAMAN: [265, 290, 315], MAGE: [400, 425, 455], WARLOCK: [365, 390, 415], DRUID: [240, 255, 280] };
const CLASS_LIST = ['WARRIOR', 'PALADIN', 'HUNTER', 'ROGUE', 'PRIEST', 'SHAMAN', 'MAGE', 'WARLOCK', 'DRUID'];
export const POINTS = { bronze: 5, silver: 10, gold: 20, legend: 40 };
export const TIER_COLOR = { bronze: '#c98a4f', silver: '#cfd6e0', gold: '#f8d36b', legend: '#ff8a1e' };

const raid = (s, id) => (s.raids && s.raids[id]) || {};
const raids = (s) => Object.values(s.raids || {});
const sum = (s, k) => raids(s).reduce((n, r) => n + (r[k] || 0), 0);
const world = (s) => (s.world && s.world.kazzak) || {};
const dream = (s) => (s.world && s.world.dream) || {};
const worlds = (s) => Object.values(s.world || {});
const wsum = (s, k) => worlds(s).reduce((n, w) => n + (w[k] || 0), 0);
const bestDps = (s, c) => (s.gear.bestOf[c] && s.gear.bestOf[c].dps) || 0;
const classesAt = (s, i) => CLASS_LIST.filter((c) => bestDps(s, c) >= DPS_MARKS[c][i]).length;
const arenaAt = (s, n) => CLASS_LIST.filter((c) => ((s.arena.bestBy || {})[c] || 0) >= n).length;
const HEROIC = { mc: 5, zg: 5, aq20: 3 };
const FINAL = { mc: 'Ragnaros', zg: 'Hakkar', aq20: 'Ossirian' };
const ALL_RELICS = RELICS.filter((x) => !x.forged);
const LEGENDS = RELICS.filter((x) => x.forged);
const REWARD_MOUNTS = MOUNTS;

const d = (id, name, icon, value, steps, opts = {}) => ({ id, name, icon, value, steps: steps.map(([at, tier, label]) => ({ at, tier, label })), ...opts });

export const PATHS = [
  {
    id: 'drafter', name: 'Drafter', mode: 'gear', icon: 'assets/icons/134939.png', color: '#e6b35a', blurb: 'Gear Draft',
    marks: [5, 38, 102, 186, 275],
    ranks: ['Apprentice', 'Journeyman', 'Expert', 'Artisan', 'Master'],
    deeds: [
      d('d_runs', 'Gear Drafts finished', 133741, (s) => s.gear.runs, [[1, 'bronze'], [10, 'bronze'], [25, 'silver'], [100, 'gold'], [250, 'legend']]),
      d('d_played', 'Classes drafted', 132090, (s) => s.gear.classes.length, [[3, 'bronze'], [6, 'silver'], [9, 'gold']], { of: 9 }),
      d('d_adept', 'Classes at Adept DPS', 136101, (s) => classesAt(s, 0), [[1, 'bronze'], [3, 'silver'], [6, 'gold'], [9, 'gold']], { of: 9, hint: 'Each class has its own DPS mark' }),
      d('d_champ', 'Classes at Champion DPS', 135957, (s) => classesAt(s, 1), [[1, 'silver'], [3, 'gold'], [9, 'legend']], { of: 9, hint: 'A higher DPS mark for each class' }),
      d('d_legend', 'Classes at Legend DPS', 135349, (s) => classesAt(s, 2), [[1, 'gold'], [3, 'legend']], { of: 9, hint: 'The top DPS mark for each class' }),
      d('d_item', 'Draft a legendary item', 135349, (s) => (s.items && s.items.legendary) || 0, [[1, 'gold']]),
      d('d_board', 'Class board', 133784, (s) => s.gear.classRank || 0, [[3, 'legend', 'Top 3'], [1, 'legend', '#1']], { low: 1, bonus: 1, hint: 'Bonus: not needed for any rank. Your best place on any one class board.' }),
      d('d_humble', 'Humble Beginnings', 134414, (s) => (s.gear.runs > 0 && s.gear.worst < 150 ? 1 : 0), [[1, 'bronze']], { hidden: 1, text: 'Finish a Gear Draft under 150 DPS' }),
    ],
  },
  {
    id: 'gladiator', name: 'Gladiator', mode: 'arena', icon: 'assets/icons/132349.png', color: '#e05a4a', blurb: 'Arena Draft',
    marks: [5, 44, 117, 212, 314],
    ranks: ['Private', 'Sergeant', 'Knight', 'Commander', 'Warlord'],
    deeds: [
      d('a_wins', 'Duels won', 132147, (s) => s.arena.wins, [[1, 'bronze'], [25, 'silver'], [100, 'gold'], [500, 'legend']]),
      d('a_best', 'Best Arena run', 132351, (s) => s.arena.best, [[3, 'bronze', '3 wins'], [5, 'silver', '5 wins'], [10, 'gold', '10 wins']], { of: 10, show: (v) => `${v} wins` }),
      d('a_tens', '10-win runs', 132349, (s) => s.arena.tens, [[1, 'gold'], [3, 'gold'], [10, 'legend']]),
      d('a_duelist', 'Classes with a 5-win run', 132090, (s) => arenaAt(s, 5), [[1, 'bronze'], [3, 'silver'], [9, 'gold']], { of: 9, hint: 'Reach 5 wins in a single Arena run with that class' }),
      d('a_glad', 'Classes with a 10-win run', 132358, (s) => arenaAt(s, 10), [[1, 'gold'], [3, 'legend'], [9, 'legend']], { of: 9, hint: 'Reach 10 wins in a single Arena run with that class' }),
      d('a_flawless', 'Flawless', 135987, (s) => s.arena.flawless, [[1, 'legend']], { text: 'Reach 10 wins without a single loss' }),
      d('a_clutch', 'Clutch', 132333, (s) => s.arena.clutch || 0, [[1, 'gold']], { hidden: 1, text: 'Reach 10 wins with two losses already on the board' }),
    ],
  },
  {
    id: 'raider', name: 'Raider', mode: 'raid', icon: 'assets/icons/135824.png', color: '#ff8a3a', blurb: "Molten Core, Zul'Gurub and Ruins of Ahn'Qiraj",
    marks: [5, 32, 85, 154, 228],
    ranks: ['Initiate', 'Vanguard', 'Veteran', 'Champion', 'Conqueror'],
    deeds: [
      d('r_kills', 'Raid bosses killed', 133783, (s) => sum(s, 'kills'), [[10, 'bronze'], [100, 'silver'], [500, 'gold'], [1500, 'legend']]),
      d('r_finals', 'Final bosses reached', 132242, (s) => sum(s, 'finales'), [[1, 'silver'], [10, 'gold'], [50, 'legend']], { hint: 'Ragnaros, Hakkar or Ossirian' }),
      d('r_every', 'Raids taken to the end', 134414, (s) => Object.keys(FINAL).filter((r) => raid(s, r).finales > 0).length, [[1, 'silver'], [3, 'gold']], { of: 3, hint: 'Reach the final boss of each raid' }),
      d('r_heroic', 'Heroic raids', 135883, (s) => Object.keys(HEROIC).filter((r) => (raid(s, r).heroics || 0) >= HEROIC[r]).length, [[1, 'silver'], [3, 'gold']], { of: 3, hint: "Kill 5 Heroic bosses in one run (3 in Ahn'Qiraj)" }),
      d('r_bane', 'Banes of the final bosses', 135820, (s) => Object.keys(FINAL).filter((r) => (raid(s, r).score || 0) >= 150000).length, [[1, 'gold'], [3, 'legend']], { of: 3, hint: 'Deal 150,000 damage to a final boss' }),
      d('r_fresh', 'Fresh Meat', 136152, (s) => (raids(s).some((r) => (r.early || 0) > 0) ? 1 : 0), [[1, 'bronze']], { hidden: 1, text: 'Wipe on the very first boss of a raid' }),
    ],
  },
  {
    id: 'doomslayer', name: 'Doomslayer', mode: 'world', icon: 'assets/icons/237558.png', color: '#7dff5a', blurb: 'Lord Kazzak',
    marks: [5, 29, 78, 142, 211],
    ranks: ['Seeker', 'Sealbreaker', 'Demonbane', 'Doomwalker', 'Bane of the Legion'],
    deeds: [
      d('w_seals', 'Seals broken', 136122, (s) => (s.attune && s.attune.kazzak ? (s.attune.kazzak.forged ? 6 : s.attune.kazzak.steps || 0) : 0), [[1, 'bronze'], [3, 'silver'], [6, 'gold']], { of: 6 }),
      d('w_tries', 'Kazzak attempts', 136224, (s) => world(s).tries || 0, [[1, 'bronze'], [10, 'silver'], [30, 'gold']]),
      d('w_kills', 'Kazzak kills', 237558, (s) => world(s).kills || 0, [[1, 'gold'], [5, 'legend'], [20, 'legend']]),
      d('w_drank', 'Consumables used', 134842, (s) => world(s).drank || 0, [[1, 'bronze'], [10, 'silver'], [30, 'gold']]),
      d('w_bare', 'Bare-handed', 132334, (s) => world(s).bare || 0, [[1, 'legend']], { text: 'Kill Kazzak without any consumables' }),
    ],
  },
  {
    id: 'dreamwalker', name: 'Dreamwalker', mode: 'world', icon: 'assets/icons/134157.png', color: '#5dffb0', blurb: 'Dragons of Nightmare',
    marks: [5, 38, 102, 186, 275],
    ranks: ['Dreamer', 'Treewaker', 'Nightmare Hunter', 'Dragonbane', 'Keeper of the Dream'],
    deeds: [
      d('n_trees', 'Great Trees awake', 132123, (s) => (s.attune && s.attune.dream ? (s.attune.dream.forged ? 4 : s.attune.dream.steps || 0) : 0), [[1, 'bronze'], [2, 'silver'], [4, 'gold']], { of: 4, hint: 'Pass the four Dream Trials' }),
      d('n_tries', 'Dragon attempts', 136224, (s) => dream(s).tries || 0, [[1, 'bronze'], [10, 'silver'], [30, 'gold']]),
      d('n_kills', 'Dragon kills', 134157, (s) => dream(s).kills || 0, [[1, 'gold'], [5, 'gold'], [10, 'legend']]),
      d('n_four', 'Dragons slain', 136116, (s) => Object.keys(dream(s).slain || {}).length, [[1, 'silver'], [2, 'silver'], [4, 'legend']], { of: 4, hint: 'Ysondre, Lethon, Emeriss and Taerar' }),
      d('n_relics', 'Shrine of the Four', 134123, (s) => [990216, 990217, 990218, 990219].filter((id) => dream(s).drops && dream(s).drops[id]).length, [[1, 'silver'], [2, 'gold'], [4, 'legend']], { of: 4, hint: 'One relic from each dragon' }),
      d('n_bare', 'Dreamless', 132334, (s) => dream(s).bare || 0, [[1, 'legend']], { text: 'Kill a dragon without any consumables' }),
    ],
  },
  {
    id: 'slayer', name: 'Slayer', mode: 'world', icon: 'assets/icons/136224.png', color: '#7fc8ff', blurb: 'Every World Boss',
    marks: [5, 37, 99, 180, 267],
    ranks: ['Hunter', 'Challenger', 'Giantsbane', 'Kingslayer', 'Worldslayer'],
    deeds: [
      d('s_tries', 'World boss attempts', 136224, (s) => wsum(s, 'tries'), [[1, 'bronze'], [10, 'silver'], [30, 'gold'], [100, 'legend']]),
      d('s_kills', 'World boss kills', 237558, (s) => wsum(s, 'kills'), [[1, 'gold'], [5, 'legend'], [20, 'legend']]),
      d('s_bosses', 'World bosses defeated', 136122, (s) => worlds(s).filter((w) => w.kills > 0).length, [[1, 'silver'], [2, 'gold']], { of: 2, hint: 'Lord Kazzak and the Dragons of Nightmare' }),
      d('s_drank', 'Consumables used', 134842, (s) => wsum(s, 'drank'), [[1, 'bronze'], [10, 'silver'], [30, 'gold']]),
      d('s_comps', 'Winning party comps', 132090, (s) => wsum(s, 'comps'), [[3, 'silver'], [6, 'gold']], { hint: 'Different class trios that killed a world boss' }),
      d('s_bare', 'Bare-handed', 132334, (s) => wsum(s, 'bare'), [[2, 'legend']], { text: 'Kill world bosses twice without any consumables' }),
    ],
  },
  {
    id: 'collector', name: 'Collector', mode: 'inn', icon: 'assets/icons/133062.png', color: '#c07dff', blurb: 'The Inn',
    marks: [5, 32, 85, 154, 228],
    ranks: ['Curious', 'Hoarder', 'Curator', 'Keeper', 'Lorekeeper'],
    deeds: [
      d('c_relics', 'Raid relics found', 135988, (s) => ALL_RELICS.filter((x) => count(s, x.id) > 0).length, [[1, 'bronze'], [4, 'silver'], [8, 'gold']], { of: ALL_RELICS.length, hint: 'Bindings, shards, the Eye, ingots and the head of Ossirian' }),
      d('c_legend', 'Legendaries forged', 135349, (s) => LEGENDS.filter((x) => forged(s, x.id)).length, [[1, 'gold'], [2, 'gold'], [3, 'legend']], { of: LEGENDS.length, hint: 'Thunderfury, Sulfuras and the Scepter' }),
      d('c_mounts', 'Rare mounts found', 132253, (s) => REWARD_MOUNTS.filter((x) => count(s, x.id) > 0).length + (world(s).drops && world(s).drops[990204] ? 1 : 0), [[1, 'gold'], [3, 'legend']], { of: REWARD_MOUNTS.length + 1, hint: "Zul'Gurub's raptor and tiger, and the Dreadsteed" }),
      d('c_hoard', "Kazzak's hoard", 136218, (s) => LOOT.filter((x) => world(s).drops && world(s).drops[x.id]).length, [[1, 'silver'], [3, 'gold'], [5, 'legend']], { of: LOOT.length }),
      d('c_key', 'Key of the Dark Portal', 134246, (s) => s.keys || 0, [[1, 'gold']]),
      d('c_explorer', 'Explorer', 134269, (s) => (s.gear.runs > 0 && s.arena.runs > 0 && raid(s, 'mc').runs > 0 && raid(s, 'zg').runs > 0 && raid(s, 'aq20').runs > 0 ? 1 : 0), [[1, 'silver']], { hidden: 1, text: 'Play Gear Draft, Arena and all three raids' }),
      d('c_heard', 'Voice of the Inn', 134939, (s) => s.heard || 0, [[1, 'legend']], { hidden: 1, text: 'Send feedback that makes it into the game' }),
    ],
  },
];
export const PATH = Object.fromEntries(PATHS.map((p) => [p.id, p]));

export const REWARDS = [
  { id: 'p_medivh', kind: 'portrait', path: 'drafter', rank: 1, name: 'Medivh portrait', portrait: 'hero:medivh' },
  { id: 't_drafter', kind: 'title', path: 'drafter', rank: 2, name: 'the Drafter' },
  { id: 'g_crusader', kind: 'glow', path: 'drafter', rank: 3, name: 'Crusader', color: '#ff3a3a', sparks: '#ffb0a0', fx: 'holy' },
  { id: 't_master', kind: 'title', path: 'drafter', rank: 5, name: 'Master Drafter' },
  { id: 'p_illidan', kind: 'portrait', path: 'drafter', rank: 5, name: 'Illidan portrait', portrait: 'hero:illidan' },

  { id: 'p_grom', kind: 'portrait', path: 'gladiator', rank: 1, name: 'Grommash portrait', portrait: 'hero:grom' },
  { id: 't_duelist', kind: 'title', path: 'gladiator', rank: 2, name: 'the Duelist' },
  { id: 'g_icy', kind: 'glow', path: 'gladiator', rank: 3, name: 'Icy Chill', color: '#5ac8ff', sparks: '#d8f4ff', fx: 'frost' },
  { id: 'm_wolf', kind: 'mount', path: 'gladiator', rank: 4, name: 'Black War Wolf', mount: 990601 },
  { id: 'i_frostfire', kind: 'decor', path: 'gladiator', rank: 4, name: 'Frostfire', slot: 'fire', color: '#5ac8ff' },
  { id: 't_warlord', kind: 'title', path: 'gladiator', rank: 5, name: 'Warlord' },
  { id: 'p_arthas', kind: 'portrait', path: 'gladiator', rank: 5, name: 'Arthas portrait', portrait: 'hero:arthas' },

  { id: 'p_ragnaros', kind: 'portrait', path: 'raider', rank: 1, name: 'Ragnaros portrait', portrait: 'hero:ragnaros' },
  { id: 't_raider', kind: 'title', path: 'raider', rank: 2, name: 'the Raider' },
  { id: 'p_voljin', kind: 'portrait', path: 'raider', rank: 2, name: "Vol'jin portrait", portrait: 'hero:voljin' },
  { id: 'g_fiery', kind: 'glow', path: 'raider', rank: 3, name: 'Fiery', color: '#ff6a1a', sparks: '#ffd27a', fx: 'fire' },
  { id: 'i_emberfire', kind: 'decor', path: 'raider', rank: 3, name: 'Emberfire', slot: 'fire', color: '#ff2a1a' },
  { id: 't_conqueror', kind: 'title', path: 'raider', rank: 5, name: 'the Conqueror' },
  { id: 'p_onyxia', kind: 'portrait', path: 'raider', rank: 5, name: 'Onyxia portrait', portrait: 'hero:onyxia' },

  { id: 'g_fel', kind: 'glow', path: 'doomslayer', rank: 1, name: 'Felfire', color: '#3aff2a', sparks: '#c8ffb0', fx: 'fel' },
  { id: 't_sealbreaker', kind: 'title', path: 'doomslayer', rank: 2, name: 'Sealbreaker' },
  { id: 'i_felbrazier', kind: 'decor', path: 'doomslayer', rank: 3, name: 'Fel Brazier', slot: 'brazier' },
  { id: 'i_felfire', kind: 'decor', path: 'doomslayer', rank: 3, name: 'Felfire', slot: 'fire', color: '#4aff2a' },
  { id: 'p_kelthuzad', kind: 'portrait', path: 'doomslayer', rank: 4, name: "Kel'Thuzad portrait", portrait: 'hero:kelthuzad' },
  { id: 't_doomslayer', kind: 'title', path: 'doomslayer', rank: 5, name: 'Doomslayer' },
  { id: 'm_felsteed', kind: 'mount', path: 'doomslayer', rank: 5, name: 'Felsteed', mount: 990602 },

  { id: 't_dreamer', kind: 'title', path: 'dreamwalker', rank: 1, name: 'the Dreamer' },
  { id: 't_dreamwalker', kind: 'title', path: 'dreamwalker', rank: 2, name: 'Dreamwalker' },
  { id: 'g_dream', kind: 'glow', path: 'dreamwalker', rank: 3, name: 'Emerald Dream', color: '#5dff9a', sparks: '#d8ffe8', fx: 'dream' },
  { id: 'i_dreamfire', kind: 'decor', path: 'dreamwalker', rank: 4, name: 'Dreamfire', slot: 'fire', color: '#3dffb0' },
  { id: 't_nightmare', kind: 'title', path: 'dreamwalker', rank: 5, name: 'Bane of the Nightmare' },

  { id: 't_bold', kind: 'title', path: 'slayer', rank: 1, name: 'the Bold' },
  { id: 'g_storm', kind: 'glow', path: 'slayer', rank: 3, name: 'Stormforged', color: '#7fc8ff', sparks: '#e8f6ff', fx: 'storm' },
  { id: 'i_spiritfire', kind: 'decor', path: 'slayer', rank: 4, name: 'Spiritfire', slot: 'fire', color: '#bfe8ff' },
  { id: 't_worldslayer', kind: 'title', path: 'slayer', rank: 5, name: 'Worldslayer' },
  { id: 'm_kodo', kind: 'mount', path: 'slayer', rank: 5, name: 'Black War Kodo', mount: 990603 },

  { id: 'p_mekkatorque', kind: 'portrait', path: 'collector', rank: 1, name: 'Mekkatorque portrait', portrait: 'hero:mekkatorque' },
  { id: 't_collector', kind: 'title', path: 'collector', rank: 2, name: 'the Collector' },
  { id: 'g_shadow', kind: 'glow', path: 'collector', rank: 3, name: 'Unholy Shadow', color: '#7a2aff', sparks: '#e2c4ff', fx: 'shadow' },
  { id: 'p_moira', kind: 'portrait', path: 'collector', rank: 3, name: 'Moira portrait', portrait: 'hero:moira' },
  { id: 'i_arcanefire', kind: 'decor', path: 'collector', rank: 4, name: 'Arcane fire', slot: 'fire', color: '#9a6aff' },
  { id: 't_lorekeeper', kind: 'title', path: 'collector', rank: 5, name: 'Lorekeeper' },
  { id: 'p_bolvar', kind: 'portrait', path: 'collector', rank: 5, name: 'Bolvar portrait', portrait: 'hero:bolvar' },

  { id: 'f_podium', kind: 'frame', deed: 'd_board', step: 1, name: 'Podium frame', color: '#eef0ff' },
  { id: 't_unrivaled', kind: 'title', deed: 'd_board', step: 2, name: 'the Unrivaled' },
  { id: 'f_bronze', kind: 'frame', renown: 3, name: 'Bronze frame', color: '#c98a4f' },
  { id: 'f_silver', kind: 'frame', renown: 7, name: 'Silver frame', color: '#dfe6f0' },
  { id: 'f_gold', kind: 'frame', renown: 12, name: 'Gold frame', color: '#f8d36b' },
  { id: 'p_gallywix', kind: 'portrait', renown: 15, name: 'Gallywix portrait', portrait: 'hero:gallywix' },
  { id: 'f_fel', kind: 'frame', renown: 18, name: 'Fel frame', color: '#5aff3a' },
  { id: 't_renowned', kind: 'title', renown: 22, name: 'the Renowned' },
  { id: 'f_legend', kind: 'frame', renown: 25, name: 'Legendary frame', color: '#ff8a1e' },
];
const rd = (s, r) => (s.raids && s.raids[r]) || {};
const wd = (s, id) => (s.wield && s.wield[id]) || { finals: 0, best: {} };
const big = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : `${Math.round(n)}`);
const part = (text, have, need, show) => ({ text, have, need, show });
const rankPart = (pid, r) => part(`Reach rank ${r} on the ${pid[0].toUpperCase() + pid.slice(1)} Path`, (s, c) => c.rank[pid] || 0, r, (v) => `rank ${v}`);
const heroic = (r, n) => part('Clear every boss on Heroic in one run', (s) => rd(s, r).heroics || 0, n, (v) => `${v} of ${n} Heroic`);
const lifetime = (r, n, boss) => part(`Deal ${big(n)} damage to ${boss} across all your runs`, (s) => rd(s, r).total || 0, n, (v) => `${big(v)} of ${big(n)}`);
const forgedPart = (id, name) => part(`Forge ${name}`, (s) => (s.forge && s.forge[id] && s.forge[id].done ? 1 : 0), 1);
const wieldPart = (id, n, name) => part(`Reach a final boss ${n} times wielding ${name}`, (s) => wd(s, id).finals, n, (v) => `${v} of ${n}`);
const ragWith = (n) => part(`Deal ${big(n)} damage to Ragnaros in one run wielding Sulfuras`, (s) => wd(s, 17182).best.mc || 0, n, (v) => `best ${big(v)}`);
const headPart = part('Claim the Head of Ossirian', (s) => Object.values(s.raids || {}).reduce((n, r) => n + ((r.drops || {})[21220] || 0), 0), 1);
const ossBest = part('Deal 150K damage to Ossirian in one run', (s) => rd(s, 'aq20').score || 0, 150000, (v) => `best ${big(v)}`);
const kz = (s) => (s.world && s.world.kazzak) || {};
const renownPart = (n) => part(`Reach Renown ${n}`, (s, c) => c.renown, n, (v) => `${v} of ${n}`);
const pathTiers = (pid) => [[rankPart(pid, 3)], [rankPart(pid, 4)], [rankPart(pid, 5)]];

export const BANNER_TIERS = ['I', 'II', 'III'];
export const BANNERS = [
  { id: 'drafter', name: 'Banner of the Draft', cloth: '#1c3566', ink: '#f3e6c8', emblem: 100, group: 'Paths', path: 'drafter', tiers: pathTiers('drafter') },
  { id: 'gladiator', name: 'Banner of the Arena', cloth: '#6e1414', ink: '#f3e6c8', emblem: 128, group: 'Paths', path: 'gladiator', tiers: pathTiers('gladiator') },
  { id: 'raider', name: 'Banner of the Raid', cloth: '#7a3208', ink: '#ffd27a', emblem: 105, group: 'Paths', path: 'raider', tiers: pathTiers('raider') },
  { id: 'doomslayer', name: 'Banner of the Sealbreaker', cloth: '#12300e', ink: '#9dff7a', emblem: 166, group: 'Paths', path: 'doomslayer', tiers: pathTiers('doomslayer') },
  { id: 'collector', name: 'Banner of the Curator', cloth: '#35184f', ink: '#ead8ff', emblem: 8, group: 'Paths', path: 'collector', tiers: pathTiers('collector') },
  { id: 'mc', name: 'Banner of Molten Core', cloth: '#4a0e06', ink: '#ffb04a', emblem: 111, group: 'Raids', tiers: [[heroic('mc', 9)], [lifetime('mc', 2e6, 'Ragnaros')], [lifetime('mc', 4e6, 'Ragnaros')]] },
  { id: 'zg', name: "Banner of Zul'Gurub", cloth: '#0c3328', ink: '#ff7a8a', emblem: 36, group: 'Raids', tiers: [[heroic('zg', 9)], [lifetime('zg', 1.5e6, 'Hakkar')], [lifetime('zg', 3e6, 'Hakkar')]] },
  { id: 'aq20', name: "Banner of Ahn'Qiraj", cloth: '#8a6a2a', ink: '#24160a', emblem: 133, group: 'Raids', tiers: [[heroic('aq20', 5)], [lifetime('aq20', 1e6, 'Ossirian')], [lifetime('aq20', 2e6, 'Ossirian')]] },
  { id: 'thunderfury', name: 'Banner of the Windseeker', cloth: '#0f2752', ink: '#d8f4ff', emblem: 126, group: 'Legendaries', tiers: [[forgedPart(19019, 'Thunderfury')], [wieldPart(19019, 10, 'Thunderfury')], [wieldPart(19019, 50, 'Thunderfury')]] },
  { id: 'sulfuras', name: 'Banner of Sulfuras', cloth: '#2a0b05', ink: '#ff9a3a', emblem: 116, group: 'Legendaries', tiers: [[forgedPart(17182, 'Sulfuras')], [ragWith(150000)], [ragWith(200000)]] },
  { id: 'scepter', name: 'Banner of the Scarab Lord', cloth: '#4a3a0e', ink: '#ffe39a', emblem: 189, group: 'Legendaries', tiers: [[forgedPart(21175, 'the Scepter of the Shifting Sands')], [headPart], [ossBest]] },
  { id: 'kazzak', name: 'Banner of the Fallen Doom Lord', cloth: '#141410', ink: '#7dff5a', emblem: 43, group: 'Prestige', tiers: [[part('Slay Lord Kazzak', (s) => kz(s).kills || 0, 1)], [part('Slay Lord Kazzak 5 times', (s) => kz(s).kills || 0, 5, (v) => `${v} of 5`)], [part('Slay him 10 times', (s) => kz(s).kills || 0, 10, (v) => `${v} of 10`), part('3 of those without any consumables', (s) => kz(s).bare || 0, 3, (v) => `${v} of 3`), part('with 3 different party comps (class trios)', (s) => kz(s).comps || 0, 3, (v) => `${v} of 3`)]] },
  { id: 'renown', name: 'Banner of Renown', cloth: '#e8dcc0', ink: '#7a4e10', emblem: 11, group: 'Prestige', tiers: [[renownPart(20)], [renownPart(23)], [renownPart(25)]] },
];
const partVal = (x, st, c) => { try { return +x.have(st, c) || 0; } catch { return 0; } };
export function bannerTiers(st, c) {
  const out = {};
  for (const b of BANNERS) { let t = 0; for (const tier of b.tiers) { if (tier.every((x) => partVal(x, st, c) >= x.need)) t++; else break; } out[b.id] = t; }
  return out;
}
export function bannerProgress(id, st, c) {
  const b = BANNERS.find((x) => x.id === id);
  if (!b || !st) return [];
  return b.tiers.map((tier, i) => ({ tier: BANNER_TIERS[i], parts: tier.map((x) => { const v = partVal(x, st, c || { rank: {}, renown: 0 }); return { text: x.text, done: v >= x.need, now: x.show ? x.show(Math.min(v, x.need)) : '' }; }) }));
}
for (const b of BANNERS) { b.how = b.tiers[0].map((x) => x.text).join(', and '); REWARDS.push({ id: `b_${b.id}`, kind: 'decor', slot: 'banner', banner: b.id, name: b.name, banner1: 1, ...(b.path ? { path: b.path, rank: 3 } : { how: b.how }) }); b.need = `b_${b.id}`; }
export const REWARD = Object.fromEntries(REWARDS.map((r) => [r.id, r]));

export const FIRES = [
  { id: 'classic', name: 'Hearthfire', need: '', flame: ['#ff8a2a', '#ffd27a'], bed: '#ff5a1a', spark: 0xffa24a, light: 0xff9a4a },
  { id: 'ember', name: 'Emberfire', need: 'i_emberfire', flame: ['#ff2a1a', '#ff9a6a'], bed: '#c80a0a', spark: 0xff5a3a, light: 0xff3a2a },
  { id: 'frost', name: 'Frostfire', need: 'i_frostfire', flame: ['#3aa8ff', '#d8f4ff'], bed: '#1a5aff', spark: 0xa8e0ff, light: 0x6ab8ff },
  { id: 'fel', name: 'Felfire', need: 'i_felfire', flame: ['#3aff2a', '#d8ffb0'], bed: '#1ac80a', spark: 0x9aff7a, light: 0x5aff3a },
  { id: 'arcane', name: 'Arcane fire', need: 'i_arcanefire', flame: ['#8a5aff', '#d8c8ff'], bed: '#5a2aff', spark: 0xc8a8ff, light: 0x9a7aff },
  { id: 'spirit', name: 'Spiritfire', need: 'i_spiritfire', flame: ['#bfe8ff', '#ffffff'], bed: '#5a8aff', spark: 0xe0f4ff, light: 0xa8d8ff },
  { id: 'dream', name: 'Dreamfire', need: 'i_dreamfire', flame: ['#3dffb0', '#e0fff0'], bed: '#0a9a6a', spark: 0x9dffd0, light: 0x4dffb0 },
];
export const BANNER_HOOKS = 4;

export function decorOf(saved, open) {
  const has = (need) => !need || open.has(need);
  let d = saved;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
  const fire = d && FIRES.find((f) => f.id === d.fire && has(f.need));
  const banners = d && Array.isArray(d.banners) ? [...new Set(d.banners)].filter((id) => BANNERS.some((b) => b.id === id && has(b.need))).slice(0, BANNER_HOOKS) : [...BANNERS].reverse().filter((b) => has(b.need)).map((b) => b.id).slice(0, BANNER_HOOKS);
  const brazier = open.has('i_felbrazier') && (d && 'brazier' in d ? !!d.brazier : true);
  const head = d && ['ysondre', 'lethon', 'emeriss', 'taerar'].includes(d.head) ? d.head : '';
  return { fire: fire ? fire.id : 'classic', banners, brazier, head };
}
export const RANKS = 5;
export const RENOWN_MAX = PATHS.length * RANKS;

export const REWARD_MOUNT = [
  { id: 990601, name: 'Black War Wolf', icon: 132224, model: 'mount_warwolf', scale: 1, reward: 'm_wolf' },
  { id: 990602, name: 'Felsteed', icon: 136103, model: 'mount_felsteed', scale: 1, reward: 'm_felsteed' },
  { id: 990603, name: 'Black War Kodo', icon: 132243, model: 'mount_warkodo', scale: .62, reward: 'm_kodo' },
];

const safe = (f, s) => { try { return +f(s) || 0; } catch { return 0; } };
const stepDone = (deed, v, st) => (deed.low ? v > 0 && v <= st.at : v >= st.at);

export function deedOf(deed, s) {
  const v = safe(deed.value, s), steps = deed.steps.map((st) => ({ ...st, done: stepDone(deed, v, st) }));
  const done = steps.filter((x) => x.done), next = steps.find((x) => !x.done);
  const pts = done.reduce((n, x) => n + POINTS[x.tier], 0), max = steps.reduce((n, x) => n + POINTS[x.tier], 0);
  let near = 0;
  if (next) {
    const prev = [...done].pop();
    if (deed.low) near = v > 0 ? Math.max(0, Math.min(.99, (1000 - v) / (1000 - next.at))) : 0;
    else { const from = prev ? prev.at : 0; near = Math.max(0, Math.min(.99, (v - from) / (next.at - from))); }
  }
  return { deed, v, steps, done: done.length, next, pts, max, near };
}

export function pathOf(path, s) {
  const deeds = path.deeds.map((x) => deedOf(x, s)), pts = deeds.reduce((n, x) => n + x.pts, 0);
  const max = deeds.filter((x) => !x.deed.hidden && !x.deed.bonus).reduce((n, x) => n + x.max, 0), marks = path.marks;
  const rank = marks.filter((m) => pts >= m).length, lo = rank ? marks[rank - 1] : 0, hi = marks[rank] || marks[RANKS - 1];
  return { path, deeds, pts, max, marks, rank, rankName: rank ? path.ranks[rank - 1] : 'Unranked', toNext: rank < RANKS ? hi - pts : 0, frac: rank >= RANKS ? 1 : (pts - lo) / Math.max(1, hi - lo) };
}

export function standing(s) {
  const paths = PATHS.map((p) => pathOf(p, s)), renown = paths.reduce((n, p) => n + p.rank, 0), at = Object.fromEntries(paths.map((p) => [p.path.id, p.rank]));
  const deedDone = Object.fromEntries(paths.flatMap((p) => p.deeds.map((x) => [x.deed.id, x.done])));
  const ctx = { rank: at, renown }, tiers = bannerTiers(s, ctx);
  const open = new Set(REWARDS.filter((r) => (r.banner1 ? tiers[r.banner] > 0 : r.when ? safe((x) => (r.when(x) ? 1 : 0), s) > 0 : r.deed ? (deedDone[r.deed] || 0) >= r.step : r.renown ? renown >= r.renown : at[r.path] >= r.rank)).map((r) => r.id));
  return { paths, renown, open, tiers, ctx };
}

const DEED = Object.fromEntries(PATHS.flatMap((p) => p.deeds.map((x) => [x.id, x])));
export const rewardFor = (r) => (r.how ? r.how : r.deed === 'd_board' ? `${DEED[r.deed].steps[r.step - 1].label} on a class board` : r.deed ? `${DEED[r.deed].name}: ${DEED[r.deed].steps[r.step - 1].at}${DEED[r.deed].of ? ` of ${DEED[r.deed].of}` : ''}` : r.renown ? `Renown ${r.renown}` : `${PATH[r.path].ranks[r.rank - 1]} ${PATH[r.path].name}`);
export const portraitNeeds = Object.fromEntries(REWARDS.filter((r) => r.kind === 'portrait').map((r) => [r.portrait, r.id]));
export const titleOf = (id) => (REWARD[id] && REWARD[id].kind === 'title' ? REWARD[id].name : '');
export const frameOf = (id) => (REWARD[id] && REWARD[id].kind === 'frame' ? REWARD[id] : null);
export const glowOf = (id) => (REWARD[id] && REWARD[id].kind === 'glow' ? REWARD[id] : null);
