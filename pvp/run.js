import { PLANS, PRESETS } from './engine.js';
import { CLASSES, SLOTS, gear, isTwoHand, offers, rand, side, suited, worth } from './gear.js';
import { CONSUMES, ENCHANTS, ENCHANT, extraOf } from './shop.js';
import { BOON, BOONS, BOON_CHOICES, BOON_WINS, boonSum } from './boons.js';

export const GOLD = 10, REROLL_PRICE = 2, MAX_WINS = 10, LIVES = 3, ARMORER_SLOTS = 4;
const SLOT_PRICES = { head: 3, chest: 3, legs: 3, shoulder: 3, hands: 3, feet: 3, waist: 3, wrist: 2, back: 3, neck: 3, finger1: 3, finger2: 3, trinket1: 2, trinket2: 2 };
const MELEE_WEAPON = { main: 4, off: 2, ranged: 1 }, CASTER_WEAPON = { main: 3, off: 2, ranged: 1 };
const WEAPON_PRICES = { WARRIOR: MELEE_WEAPON, PALADIN: MELEE_WEAPON, SHAMAN: MELEE_WEAPON, ROGUE: { main: 3, off: 2, ranged: 1 }, HUNTER: { main: 2, off: 1, ranged: 4 }, DRUID: { main: 2, off: 2, ranged: 1 }, PRIEST: CASTER_WEAPON, MAGE: CASTER_WEAPON, WARLOCK: CASTER_WEAPON };
const PAIRS = { finger1: 'finger2', trinket1: 'trinket2' };
const DUAL_WIELD = new Set(['ROGUE']);
export const itemCount = (run) => 3 + boonSum(run.boons, 'tinker');
export const slotPrice = (cls, slot) => SLOT_PRICES[slot] || WEAPON_PRICES[cls][slot];
const FLOOR = 50, PER_BUY = 6, PER_ROUND = 3, SPREAD = 8, TAIL = .015;
export const ALL_TIERS = ['g', 'c', 'b', 'e', 't', 'l'];
const FIRST = ['Mar', 'Thal', 'Bren', 'Kor', 'Vel', 'Sar', 'Lor', 'Dra', 'Ny', 'Gar', 'Tor', 'Eli', 'Ash', 'Zul', 'Fen', 'Rho', 'Ka', 'Mor', 'Syl', 'Gri'];
const LAST = ['dak', 'ric', 'wyn', 'ven', 'thas', 'gorn', 'ella', 'dris', 'mir', 'rok', 'lyn', 'zek', 'nor', 'ius', 'ara', 'dor', 'fang', 'sha', 'ten', 'bek'];

export const shuffle = (list, r) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const useful = (pool, cls, picks) => SLOTS.filter((s) => offers(pool, cls, s, ['g', 'b', 'e']).length && !(s === 'off' && isTwoHand(pool, picks.main)));
export const planNames = (cls) => Object.keys(PLANS[cls]);

export function newRun(pool, cls, seed = Math.floor(Math.random() * 1e9)) {
  const run = { cls, plan: planNames(cls)[0], seed, round: 1, wins: 0, losses: 0, gold: GOLD, picks: gear(pool, cls, ['g'], seed, 8), enchants: {}, buys: {}, consumes: [], foe: null, shop: null, history: [], boons: [], boonChoice: null };
  run.shop = rollShop(pool, run);
  offerBoons(run);
  return run;
}

export function offerBoons(run) {
  const left = BOONS.filter((b) => !run.boons.includes(b.id));
  run.boonChoice = shuffle(left, rand(run.seed + run.boons.length * 977 + 5)).slice(0, BOON_CHOICES).map((b) => b.id);
}

export function pickBoon(pool, run, id) {
  if (!(run.boonChoice || []).includes(id)) return false;
  run.boons.push(id);
  run.boonChoice = null;
  run.gold += BOON[id].gold || 0;
  if (BOON[id].forge || BOON[id].tinker) run.shop = rollShop(pool, run);
  return true;
}

export const rerollPrice = (run) => (boonSum(run.boons, 'freeReroll') && !run.shop.freeUsed ? 0 : REROLL_PRICE);

export function slotFloor(run, slot) {
  return FLOOR + PER_ROUND * (run.round - 1) + PER_BUY * (run.buys[slot] || 0) + boonSum(run.boons, 'forge');
}

function possible(pool, run, slot) {
  const worn = run.picks[slot] && pool.items[run.picks[slot]][0], every = suited(pool, run.cls, offers(pool, run.cls, slot, ALL_TIERS, run.picks)).filter((i) => pool.items[i][0] !== worn);
  let list = every.filter((i) => pool.items[i][2] >= slotFloor(run, slot));
  if (list.length < 3) list = every.sort((a, b) => pool.items[b][2] - pool.items[a][2]).slice(0, 8);
  const fit = (i) => worth(pool, run.cls, i) / pool.items[i][2], ranked = [...list].sort((a, b) => fit(b) - fit(a));
  return ranked.slice(0, Math.max(3, Math.ceil(ranked.length * .7)));
}

export const lowestQuality = (pool, run, slot) => Math.min(...possible(pool, run, slot).map((i) => pool.items[i][1]));

function lagging(run, slots) {
  const pairs = DUAL_WIELD.has(run.cls) ? { ...PAIRS, main: 'off' } : PAIRS;
  const skip = new Set(Object.entries(pairs).filter(([a, b]) => slots.includes(a) && slots.includes(b)).map(([a, b]) => ((run.buys[b] || 0) < (run.buys[a] || 0) ? a : b)));
  return slots.filter((s) => !skip.has(s));
}

export function itemChoices(pool, run, slot, r = Math.random) {
  const floor = slotFloor(run, slot), list = possible(pool, run, slot);
  const mean = floor + 3 + (run.round - 1) * .8, weight = (i) => {
    const it = pool.items[i], z = (it[2] - mean) / SPREAD;
    return (Math.exp(-z * z / 2) + TAIL) * (it[1] >= 5 ? .15 : 1);
  };
  const out = [], bag = [...list];
  while (out.length < itemCount(run) && bag.length) {
    let roll = r() * bag.reduce((s, i) => s + weight(i), 0), at = 0;
    for (; at < bag.length - 1; at++) { roll -= weight(bag[at]); if (roll <= 0) break; }
    out.push(bag.splice(at, 1)[0]);
  }
  return out;
}

export function rollShop(pool, run, r = Math.random) {
  const slots = shuffle(lagging(run, useful(pool, run.cls, run.picks)), r), fresh = slots.filter((s) => !run.buys[s]), items = [];
  if (fresh.length) items.push(fresh[0]);
  for (const s of slots) if (items.length < ARMORER_SLOTS + boonSum(run.boons, 'tinker') && !items.includes(s)) items.push(s);
  const against = run.foe ? run.foe.cls : null, consumes = CONSUMES.filter((c) => c.use.includes(run.cls) && (!c.against || !against || c.against.includes(against)));
  const enchants = ENCHANTS.filter((e) => e.use.includes(run.cls) && !(run.enchants[e.slot] === e.id) && run.picks[e.slot]);
  return { items: shuffle(items, r), consumes: shuffle(consumes, r).slice(0, 2).map((c) => c.id), enchants: shuffle(enchants, r).slice(0, 2).map((e) => e.id), sold: [] };
}

export function paySlot(pool, run, slot) {
  const price = slotPrice(run.cls, slot);
  if (run.gold < price || run.pending || run.shop.sold.includes(slot)) return false;
  run.gold -= price;
  run.shop.sold.push(slot);
  run.pending = { slot, ids: itemChoices(pool, run, slot) };
  return true;
}

function wear(pool, run, slot, id) {
  run.picks[slot] = id;
  run.buys[slot] = (run.buys[slot] || 0) + 1;
  delete run.enchants[slot];
  if (slot === 'main' && isTwoHand(pool, id)) {
    delete run.picks.off;
    delete run.enchants.off;
    run.shop.items = run.shop.items.filter((s) => s !== 'off');
  }
}

export function takeItem(pool, run, id) {
  const { slot } = run.pending;
  run.pending = null;
  if (id) wear(pool, run, slot, id);
}

export function rerollShop(pool, run) {
  const price = rerollPrice(run);
  if (run.gold < price || run.pending) return false;
  run.gold -= price;
  const freeUsed = run.shop.freeUsed || price === 0;
  run.shop = rollShop(pool, run);
  run.shop.freeUsed = freeUsed;
  return true;
}

export function buyItem(pool, run, slot, id) {
  const price = slotPrice(run.cls, slot);
  if (run.gold < price) return false;
  run.gold -= price;
  wear(pool, run, slot, id);
  run.shop.sold.push(slot);
  return true;
}

export function buyConsume(run, c) {
  if (run.gold < c.price || run.consumes.includes(c.id)) return false;
  run.gold -= c.price;
  run.consumes.push(c.id);
  run.shop.sold.push(c.id);
  return true;
}

export function buyEnchant(run, e) {
  if (run.gold < e.price || !run.picks[e.slot]) return false;
  run.gold -= e.price;
  run.enchants[e.slot] = e.id;
  run.shop.sold.push(e.id);
  return true;
}

export const snapshot = (run) => ({ cls: run.cls, plan: run.plan, picks: { ...run.picks }, enchants: { ...run.enchants }, consumes: [...run.consumes], boons: [...(run.boons || [])] });

export function sideOf(pool, snap, REF) {
  return { ...side(pool, snap.cls, snap.picks, snap.plan, REF[snap.cls]), extra: extraOf(snap.cls, snap.consumes, snap.enchants, snap.boons) };
}

export function finishRound(pool, run, won) {
  run.history.push({ round: run.round, won, foe: run.foe ? { name: run.foe.name, cls: run.foe.cls } : null });
  if (won) run.wins++; else run.losses++;
  run.consumes = [];
  run.foe = null;
  run.round++;
  run.gold = GOLD + boonSum(run.boons, 'gold') + Math.min(run.gold, boonSum(run.boons, 'carry'));
  run.over = run.wins >= MAX_WINS || run.losses >= LIVES;
  if (!run.over) run.shop = rollShop(pool, run);
  if (!run.over && won && BOON_WINS.includes(run.wins)) offerBoons(run);
  return run;
}

export function fakeName(r) {
  return FIRST[Math.floor(r() * FIRST.length)] + LAST[Math.floor(r() * LAST.length)];
}

function botShops(pool, bot, r) {
  bot.shop = rollShop(pool, bot, r);
  for (const slot of [...bot.shop.items]) {
    if (bot.gold < slotPrice(bot.cls, slot)) continue;
    const list = itemChoices(pool, bot, slot, r).sort((a, b) => worth(pool, bot.cls, b) - worth(pool, bot.cls, a));
    if (list[0]) buyItem(pool, bot, slot, list[0]);
  }
}

export function makeBot(pool, round, seed = Math.floor(Math.random() * 1e9)) {
  const r = rand(seed), cls = CLASSES[Math.floor(r() * CLASSES.length)];
  const fighters = BOONS.filter((b) => !b.gold && !b.carry && !b.freeReroll && !b.forge), held = 1 + Math.floor(Math.min(round - 1, 9) * .55 / 3);
  const bot = { cls, plan: planNames(cls)[Math.floor(r() * 3)], seed, round: 1, gold: GOLD, picks: gear(pool, cls, ['g'], seed, 8), enchants: {}, buys: {}, consumes: [], foe: null, shop: null, boons: shuffle(fighters, r).slice(0, held).map((b) => b.id) };
  for (; bot.round <= round; bot.round++) {
    bot.gold = GOLD;
    botShops(pool, bot, r);
    if (bot.round < round) bot.consumes = [];
  }
  bot.round = round;
  const list = CONSUMES.filter((c) => c.use.includes(cls) && c.price <= bot.gold);
  if (list.length) bot.consumes = [list[Math.floor(r() * list.length)].id];
  return { ...snapshot(bot), name: fakeName(r), bot: 1 };
}

export const className = (cls) => `${PRESETS[cls].name} ${cls[0]}${cls.slice(1).toLowerCase()}`;
export const enchantName = (id) => ENCHANT[id] ? ENCHANT[id].name : '';
