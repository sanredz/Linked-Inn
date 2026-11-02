import { PLANS, PRESETS } from './engine.js';
import { SLOTS, offers } from './gear.js';
import { CONSUME, ENCHANT } from './shop.js';
import { BOON, BOON_WINS, boonSum } from './boons.js';
import { ALL_TIERS, GOLD, LIVES, MAX_WINS, slotPrice } from './run.js';

const isName = (v) => typeof v === 'string' && v.length <= 20;
const isClass = (v) => typeof v === 'string' && Object.hasOwn(PRESETS, v);
const list = (pool, cls, slot, memo) => (memo[slot] ||= new Set(offers(pool, cls, slot, ALL_TIERS)));

function wornFine(pool, cls, picks) {
  if (!picks || typeof picks !== 'object' || Array.isArray(picks)) return false;
  const memo = {}, names = new Set();
  let items = 0;
  for (const [slot, id] of Object.entries(picks)) {
    if (!SLOTS.includes(slot) || !list(pool, cls, slot, memo).has(id)) return false;
    const name = pool.items[id][0];
    if (names.has(name)) return false;
    names.add(name);
    items++;
  }
  return items > 0;
}

function enchantCost(cls, picks, enchants) {
  if (!enchants || typeof enchants !== 'object' || Array.isArray(enchants)) return -1;
  let cost = 0;
  for (const [slot, id] of Object.entries(enchants)) {
    const e = Object.hasOwn(ENCHANT, id) ? ENCHANT[id] : null;
    if (!e || e.slot !== slot || !e.use.includes(cls) || !picks[slot]) return -1;
    cost += e.price;
  }
  return cost;
}

const boonsFine = (boons, wins) => Array.isArray(boons) && boons.length <= 1 + BOON_WINS.filter((w) => w <= wins).length && new Set(boons).size === boons.length && boons.every((id) => Object.hasOwn(BOON, id));

const bought = (pool, cls, picks) => {
  const green = new Set(SLOTS.flatMap((s) => offers(pool, cls, s, ['g'])));
  return Object.entries(picks).reduce((sum, [slot, id]) => sum + (green.has(id) ? 0 : slotPrice(cls, slot)), 0);
};

export function checkBuild(pool, b, wins, losses) {
  if (!b || !isClass(b.cls) || !Object.hasOwn(PLANS[b.cls], b.plan) || !wornFine(pool, b.cls, b.picks)) return false;
  const consumes = b.consumes || [];
  if (!Array.isArray(consumes) || new Set(consumes).size !== consumes.length) return false;
  let price = 0;
  for (const id of consumes) {
    const c = Object.hasOwn(CONSUME, id) ? CONSUME[id] : null;
    if (!c || !c.use.includes(b.cls)) return false;
    price += c.price;
  }
  const paid = enchantCost(b.cls, b.picks, b.enchants), boons = b.boons || [], income = GOLD + boonSum(boons, 'gold');
  if (paid < 0 || !boonsFine(boons, wins) || price > income + boonSum(boons, 'carry')) return false;
  return bought(pool, b.cls, b.picks) + paid + price <= income * (wins + losses + 1);
}

export function checkResult(pool, r) {
  const { cls, plan, wins, losses, picks, enchants, fights, boons = [] } = r || {};
  if (!isClass(cls) || !Object.hasOwn(PLANS[cls], plan)) return false;
  if (!Number.isInteger(wins) || !Number.isInteger(losses) || !Array.isArray(fights)) return false;
  if (wins < 0 || wins > MAX_WINS || losses < 0 || losses > LIVES) return false;
  if ((wins !== MAX_WINS && losses !== LIVES) || fights.length !== wins + losses) return false;
  let w = 0, l = 0;
  for (const f of fights) {
    if (w === MAX_WINS || l === LIVES || !f || typeof f.won !== 'boolean') return false;
    if (f.foe && (!isClass(f.foe.cls) || !isName(f.foe.name))) return false;
    if (f.won) w++; else l++;
  }
  if (w !== wins || l !== losses || !wornFine(pool, cls, picks)) return false;
  const paid = enchantCost(cls, picks, enchants);
  return paid >= 0 && boonsFine(boons, wins) && bought(pool, cls, picks) + paid <= (GOLD + boonSum(boons, 'gold')) * fights.length;
}
