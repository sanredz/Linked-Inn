import { BOONS } from '../pvp/boons.js';

export const ANY = { id: 'any', name: 'Hearth', art: 'assets/icons/134414.png' };
export const MODES = [
  { id: 'gear', name: 'Gear Draft', art: 'assets/draft/arena/card-draft.jpg' },
  { id: 'arena', name: 'Arena Draft', art: 'assets/draft/arena/card-gauntlet.jpg' },
  { id: 'mc', name: 'Molten Core', art: 'assets/draft/arena/raid-mc.jpg', raid: 1 },
  { id: 'zg', name: "Zul'Gurub", art: 'assets/draft/arena/raid-zg.jpg', raid: 1 },
];

export const TIERS = { bronze: '#c98a4f', silver: '#cfd6e0', gold: '#f8d36b', legend: '#ff8a1e' };

const raid = (s, id) => (s.raids && s.raids[id]) || {};
const drop = (s, id, item) => ((raid(s, id).drops || {})[item] || 0);

export const FEATS = [
  { id: 'g_first', mode: 'gear', tier: 'bronze', name: 'First Draft', text: 'Finish a Gear Draft.', test: (s) => s.gear.runs >= 1, value: (s) => `${s.gear.runs} Gear Drafts finished` },
  { id: 'g_25', mode: 'gear', tier: 'silver', name: 'Regular', text: 'Finish 25 Gear Drafts.', test: (s) => s.gear.runs >= 25, value: (s) => `${s.gear.runs} Gear Drafts finished` },
  { id: 'g_100', mode: 'gear', tier: 'gold', name: 'Draft Veteran', text: 'Finish 100 Gear Drafts.', test: (s) => s.gear.runs >= 100, value: (s) => `${s.gear.runs} Gear Drafts finished` },
  { id: 'g_classes', mode: 'gear', tier: 'gold', name: 'Jack of All Trades', text: 'Finish a Gear Draft with all nine classes.', test: (s) => s.gear.classes.length >= 9, value: (s) => `${s.gear.classes.length} of 9 classes` },
  { id: 'g_legend', mode: 'gear', tier: 'gold', name: "It's Legendary", text: 'Draft a legendary item.', icon: 135349, test: (s) => s.items.legendary >= 1 },
  { id: 'g_top100', mode: 'gear', tier: 'gold', name: 'Top 100', text: 'Place in the top 100 of the Gear Draft board.', test: (s) => s.gear.rank > 0 && s.gear.rank <= 100, value: (s) => (s.gear.rank ? `Your best run is #${s.gear.rank.toLocaleString('en-US')}` : '') },
  { id: 'g_top10', mode: 'gear', tier: 'legend', name: 'Top 10', text: 'Place in the top 10 of the Gear Draft board.', test: (s) => s.gear.rank > 0 && s.gear.rank <= 10, value: (s) => (s.gear.rank ? `Your best run is #${s.gear.rank.toLocaleString('en-US')}` : '') },
  { id: 'a_first', mode: 'arena', tier: 'bronze', name: 'First Blood', text: 'Win an Arena duel.', test: (s) => s.arena.wins >= 1 },
  { id: 'a_five', mode: 'arena', tier: 'silver', name: 'Halfway There', text: 'Reach 5 wins in one Arena run.', test: (s) => s.arena.best >= 5, value: (s) => `Your best: ${s.arena.best} wins` },
  { id: 'a_fights', mode: 'arena', tier: 'silver', name: 'Bloodthirsty', text: 'Fight 100 Arena duels.', test: (s) => s.arena.fights >= 100, value: (s) => `${s.arena.fights} duels fought` },
  { id: 'a_ten', mode: 'arena', tier: 'gold', name: 'Gladiator', text: 'Reach 10 wins in one Arena run.', test: (s) => s.arena.tens >= 1 },
  { id: 'a_three', mode: 'arena', tier: 'gold', name: 'Warlord', text: 'Reach 10 wins three times.', test: (s) => s.arena.tens >= 3, value: (s) => `${s.arena.tens} runs with 10 wins` },
  { id: 'a_flawless', mode: 'arena', tier: 'legend', name: 'Flawless', text: 'Reach 10 wins without a single loss.', test: (s) => s.arena.flawless >= 1 },
  { id: 'a_faces', mode: 'arena', tier: 'legend', name: 'Many Faces', text: 'Reach 10 wins with three different classes.', test: (s) => s.arena.tenClasses.length >= 3, value: (s) => `${s.arena.tenClasses.length} classes with 10 wins` },
  { id: 'mc_first', mode: 'mc', tier: 'bronze', name: 'Into the Core', text: 'Start a Molten Core run.', test: (s) => raid(s, 'mc').runs >= 1 },
  { id: 'mc_half', mode: 'mc', tier: 'silver', name: 'Halfway Down', text: 'Kill five Molten Core bosses in one run.', test: (s) => raid(s, 'mc').best >= 5, value: (s) => `Your best: ${raid(s, 'mc').best || 0} bosses` },
  { id: 'mc_heroic', mode: 'mc', tier: 'silver', name: 'Heroic Spirit', text: 'Kill five Molten Core bosses on Heroic in one run.', test: (s) => raid(s, 'mc').heroics >= 5, value: (s) => `Your best: ${raid(s, 'mc').heroics || 0} Heroic kills in a run` },
  { id: 'mc_final', mode: 'mc', tier: 'gold', name: 'Firelord Faced', text: 'Reach Ragnaros.', test: (s) => raid(s, 'mc').finales >= 1 },
  { id: 'mc_bane', mode: 'mc', tier: 'legend', name: "Firelord's Bane", text: 'Deal 150,000 damage to Ragnaros.', test: (s) => raid(s, 'mc').score >= 150000, value: (s) => (raid(s, 'mc').score ? `Your best: ${raid(s, 'mc').score.toLocaleString('en-US')} damage` : '') },
  { id: 'mc_left', mode: 'mc', tier: 'gold', name: 'Left Binding', text: 'Garr dropped the Left Binding of the Windseeker.', icon: 135988, test: (s) => drop(s, 'mc', 18563) >= 1 },
  { id: 'mc_right', mode: 'mc', tier: 'gold', name: 'Right Binding', text: 'Baron Geddon dropped the Right Binding of the Windseeker.', icon: 135988, test: (s) => drop(s, 'mc', 18564) >= 1 },
  { id: 'mc_tf', mode: 'mc', tier: 'legend', name: 'Thunderfury', text: 'Forge Thunderfury, Blessed Blade of the Windseeker.', icon: 135349, test: (s) => forged(s, 19019) },
  { id: 'mc_eye', mode: 'mc', tier: 'legend', name: 'Eye of Sulfuras', text: 'Ragnaros dropped the Eye of Sulfuras.', icon: 134124, test: (s) => drop(s, 'mc', 17204) >= 1 },
  { id: 'mc_hand', mode: 'mc', tier: 'legend', name: 'Hand of Ragnaros', text: 'Forge Sulfuras, Hand of Ragnaros.', icon: 133066, test: (s) => forged(s, 17182) },
  { id: 'zg_first', mode: 'zg', tier: 'bronze', name: 'Into the Jungle', text: "Start a Zul'Gurub run.", test: (s) => raid(s, 'zg').runs >= 1 },
  { id: 'zg_half', mode: 'zg', tier: 'silver', name: 'Edge of Madness', text: "Kill five Zul'Gurub bosses in one run.", test: (s) => raid(s, 'zg').best >= 5, value: (s) => `Your best: ${raid(s, 'zg').best || 0} bosses` },
  { id: 'zg_heroic', mode: 'zg', tier: 'silver', name: 'Blood Oath', text: "Kill five Zul'Gurub bosses on Heroic in one run.", test: (s) => raid(s, 'zg').heroics >= 5, value: (s) => `Your best: ${raid(s, 'zg').heroics || 0} Heroic kills in a run` },
  { id: 'zg_final', mode: 'zg', tier: 'gold', name: 'Soulflayer Faced', text: 'Reach Hakkar.', test: (s) => raid(s, 'zg').finales >= 1 },
  { id: 'zg_bane', mode: 'zg', tier: 'legend', name: "Soulflayer's Bane", text: 'Deal 150,000 damage to Hakkar.', test: (s) => raid(s, 'zg').score >= 150000, value: (s) => (raid(s, 'zg').score ? `Your best: ${raid(s, 'zg').score.toLocaleString('en-US')} damage` : '') },
  { id: 'zg_raptor', mode: 'zg', tier: 'gold', name: 'Swift Razzashi Raptor', text: 'Bloodlord Mandokir dropped his raptor.', icon: 132253, test: (s) => drop(s, 'zg', 19872) >= 1 },
  { id: 'zg_tiger', mode: 'zg', tier: 'gold', name: 'Swift Zulian Tiger', text: 'High Priest Thekal dropped his tiger.', icon: 132242, test: (s) => drop(s, 'zg', 19902) >= 1 },
  { id: 'zg_stable', mode: 'zg', tier: 'legend', name: 'Zandalari Stable', text: "Collect both of Zul'Gurub's mounts.", icon: 132253, test: (s) => drop(s, 'zg', 19872) >= 1 && drop(s, 'zg', 19902) >= 1 },
];

const CLASS_LIST = ['WARRIOR', 'PALADIN', 'HUNTER', 'ROGUE', 'PRIEST', 'SHAMAN', 'MAGE', 'WARLOCK', 'DRUID'];
const PRETTY = (c) => c[0] + c.slice(1).toLowerCase();
const DPS_MARKS = { WARRIOR: [260, 280, 315], PALADIN: [215, 230, 250], HUNTER: [255, 270, 290], ROGUE: [270, 285, 310], PRIEST: [380, 395, 415], SHAMAN: [265, 290, 315], MAGE: [400, 425, 455], WARLOCK: [365, 390, 415], DRUID: [240, 255, 280] };
const bestDps = (s, c) => (s.gear.bestOf[c] && s.gear.bestOf[c].dps) || 0;
const arenaBest = (s, c) => (s.arena.bestBy && s.arena.bestBy[c]) || 0;
const dpsLine = (s, c) => (bestDps(s, c) ? `Your best ${PRETTY(c)}: ${bestDps(s, c).toFixed(1)} DPS` : `No ${PRETTY(c)} run yet`);
const winLine = (s, c) => (s.arena.bestBy && c in s.arena.bestBy ? `Your best ${PRETTY(c)} run: ${arenaBest(s, c)} wins` : `No ${PRETTY(c)} run yet`);
for (const c of CLASS_LIST) {
  const [a, b, l] = DPS_MARKS[c], art = `assets/classes/${c}.png`, n = PRETTY(c);
  FEATS.push(
    { id: `g_${c}_1`, mode: 'gear', tier: 'silver', art, name: `${n} Adept`, text: `Reach ${a} DPS as a ${n} in Gear Draft.`, test: (s) => bestDps(s, c) >= a, value: (s) => dpsLine(s, c) },
    { id: `g_${c}_2`, mode: 'gear', tier: 'gold', art, name: `${n} Champion`, text: `Reach ${b} DPS as a ${n} in Gear Draft.`, test: (s) => bestDps(s, c) >= b, value: (s) => dpsLine(s, c) },
    { id: `g_${c}_3`, mode: 'gear', tier: 'legend', art, name: `${n} Legend`, text: `Reach ${l} DPS as a ${n} in Gear Draft.`, test: (s) => bestDps(s, c) >= l, value: (s) => dpsLine(s, c) },
    { id: `a_${c}_5`, mode: 'arena', tier: 'silver', art, name: `${n} Duelist`, text: `Reach 5 wins in one Arena run as a ${n}.`, test: (s) => arenaBest(s, c) >= 5, value: (s) => winLine(s, c) },
    { id: `a_${c}_10`, mode: 'arena', tier: 'gold', art, name: `${n} Gladiator`, text: `Reach 10 wins in one Arena run as a ${n}.`, test: (s) => arenaBest(s, c) >= 10, value: (s) => winLine(s, c) },
  );
}
FEATS.push(
  { id: 'x_explorer', mode: 'any', tier: 'silver', hidden: 1, name: 'Explorer', text: "Play Gear Draft, Arena, Molten Core and Zul'Gurub.", test: (s) => s.gear.runs > 0 && s.arena.runs > 0 && raid(s, 'mc').runs > 0 && raid(s, 'zg').runs > 0 },
  { id: 'g_humble', mode: 'gear', tier: 'bronze', hidden: 1, name: 'Humble Beginnings', text: 'Finish a Gear Draft under 150 DPS.', test: (s) => s.gear.runs > 0 && s.gear.worst < 150 },
  { id: 'a_clutch', mode: 'arena', tier: 'gold', hidden: 1, name: 'Clutch', text: 'Reach 10 wins with two losses already on the board.', test: (s) => (s.arena.clutch || 0) >= 1 },
  { id: 'r_fresh', mode: 'any', tier: 'bronze', hidden: 1, name: 'Fresh Meat', text: 'Wipe on the very first boss of a raid.', test: (s) => Object.values(s.raids || {}).some((r) => (r.early || 0) > 0) },
  { id: 'r_lucky', mode: 'any', tier: 'gold', hidden: 1, name: 'Lucky Day', text: 'Get any rare mount or relic to drop.', test: (s) => Object.values(s.raids || {}).some((r) => Object.keys(r.drops || {}).length > 0) },
);

export const MOUNTS = [
  { id: 19872, name: 'Swift Razzashi Raptor', icon: 132253, model: 'mount_raptor', raid: 'zg', from: 'Bloodlord Mandokir', scale: 1 },
  { id: 19902, name: 'Swift Zulian Tiger', icon: 132242, model: 'mount_tiger', raid: 'zg', from: 'High Priest Thekal', scale: 1.5 },
];

export const RELICS = [
  { id: 18563, name: 'Left Binding of the Windseeker', icon: 135988, raid: 'mc', from: 'Garr' },
  { id: 18564, name: 'Right Binding of the Windseeker', icon: 135988, raid: 'mc', from: 'Baron Geddon' },
  { id: 19019, name: 'Thunderfury, Blessed Blade of the Windseeker', short: 'Thunderfury', icon: 135349, raid: 'mc', forged: [18563, 18564], theme: 'storm' },
  { id: 17204, name: 'Eye of Sulfuras', icon: 134124, raid: 'mc', from: 'Ragnaros' },
  { id: 17203, name: 'Sulfuron Ingot', icon: 135824, raid: 'mc', from: 'Golemagg the Incinerator', stack: 8 },
  { id: 17182, name: 'Sulfuras, Hand of Ragnaros', short: 'Sulfuras', icon: 133066, raid: 'mc', forged: [17204, 17203], theme: 'fire' },
];

const LOCKED = { ragnaros: 'mc_final', onyxia: 'mc_bane', kelthuzad: 'a_ten', arthas: 'a_flawless', illidan: 'g_classes', medivh: 'g_100', voljin: 'zg_final', grom: 'a_three', bolvar: 'mc_tf', gallywix: 'g_top100', moira: 'zg_bane', mekkatorque: 'mc_eye' };
const CLASSES = ['WARRIOR', 'PALADIN', 'HUNTER', 'ROGUE', 'PRIEST', 'SHAMAN', 'MAGE', 'WARLOCK', 'DRUID'];
export const PORTRAITS = [
  ...CLASSES.map((c) => ({ id: `class:${c}`, name: c[0] + c.slice(1).toLowerCase(), src: `assets/classes/${c}.png` })),
  ...BOONS.map((b) => ({ id: `hero:${b.id}`, name: b.hero, src: `assets/draft/arena/boons/${b.id}.jpg`, needs: LOCKED[b.id] })),
];
export const PORTRAIT = Object.fromEntries(PORTRAITS.map((p) => [p.id, p]));

export const valueOf = (stats, feat) => { try { return feat.value ? feat.value(stats) : ''; } catch { return ''; } };
export const has = (stats, feat) => { try { return !!feat.test(stats); } catch { return false; } };
export const earned = (stats) => new Set(FEATS.filter((f) => has(stats, f)).map((f) => f.id));
export const count = (stats, id) => Object.values(stats.raids || {}).reduce((n, r) => n + ((r.drops || {})[id] || 0), 0);
export const forged = (stats, id) => !!(stats.forge && stats.forge[id] && stats.forge[id].done);
export const forgeReady = (stats, item) => !!(item.forged && stats.forge && stats.forge[item.id] && stats.forge[item.id].ready && !stats.forge[item.id].done);
export const owned = (stats, item) => (item.forged ? forged(stats, item.id) : count(stats, item.id) > 0);
export const usedIn = (stats, item) => RELICS.find((r) => r.forged && r.forged.includes(item.id) && forged(stats, r.id));
export function forgeSteps(stats, item) {
  const n = (id) => count(stats, id);
  const trial = (id) => !!(stats.forge && stats.forge[id] && (stats.forge[id].trial || stats.forge[id].ready));
  if (item.id === 19019) return [['Left Binding of the Windseeker', n(18563) > 0], ['Right Binding of the Windseeker', n(18564) > 0], ['Deal 120,000 damage to Ragnaros with both Bindings', trial(19019)]];
  if (item.id === 17182) return [['Eye of Sulfuras', n(17204) > 0], [`Sulfuron Ingots ${Math.min(n(17203), 8)} of 8`, n(17203) >= 8], ['Deal 125,000 damage to Ragnaros with the Eye', trial(17182)]];
  return [];
}
export const portraitOpen = (got, p) => !p.needs || got.has(p.needs);
