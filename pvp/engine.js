export const MATCHUP = {
  WARRIOR: { PALADIN: 1.124, SHAMAN: .955, MAGE: 1.063 },
  PALADIN: { WARRIOR: .86, HUNTER: 1.06, ROGUE: .81, PRIEST: 1.14, MAGE: 1.04, DRUID: 1.04, SHAMAN: 1.06 },
  SHAMAN: { WARRIOR: 1.048, ROGUE: 1.069, PRIEST: .925, MAGE: .933, WARLOCK: 1.08 },
  MAGE: { WARRIOR: .94, PALADIN: .975, PRIEST: .845, SHAMAN: 1.072, WARLOCK: 1.141 },
  HUNTER: { PALADIN: 1.091, PRIEST: .962, WARLOCK: 1.053, DRUID: .687 },
  ROGUE: { PALADIN: 1.171, PRIEST: 1.047, SHAMAN: .935, WARLOCK: .96 },
  PRIEST: { PALADIN: .902, HUNTER: 1.04, ROGUE: .955, SHAMAN: 1.081, MAGE: 1.183, WARLOCK: 1.056 },
  DRUID: { PALADIN: .949, HUNTER: 1.457 },
  WARLOCK: { HUNTER: .949, ROGUE: 1.042, PRIEST: .947, MAGE: .876, SHAMAN: .926 },
};
export const RULES = { gearKeep: .6, weaponKeep: .45, hpMult: 1.5, healFade: .012, damageRise: .006, fadeFrom: 30, maxTime: 150 };

const BASE_HP = { WARRIOR: 1689, PALADIN: 1381, HUNTER: 1467, ROGUE: 1523, PRIEST: 1387, SHAMAN: 1280, MAGE: 1360, WARLOCK: 1414, DRUID: 1483 };
const BASE_DODGE = { WARRIOR: 0, PALADIN: .7, HUNTER: 0, ROGUE: 0, PRIEST: 3, SHAMAN: 1.7, MAGE: 3.2, WARLOCK: 2, DRUID: .9 };
const AGI_DODGE = { WARRIOR: 20, PALADIN: 19.8, HUNTER: 52.9, ROGUE: 29, PRIEST: 20, SHAMAN: 19.7, MAGE: 19.5, WARLOCK: 20, DRUID: 20 };
const REGEN = { WARRIOR: [15, 5], PALADIN: [15, 5], HUNTER: [15, 5], ROGUE: [15, 5], PRIEST: [12.5, 4], SHAMAN: [17, 5], MAGE: [12.5, 4], WARLOCK: [15, 5], DRUID: [15, 5] };
const CAN_PARRY = new Set(['WARRIOR', 'PALADIN', 'HUNTER', 'ROGUE']);
const BREAK_DAMAGE = 25 * 60 - 150, SEEN_AT = 9, REACT = 1, CAT_COST = 1244 * .55 * .7;
const BEAR = { armor: 3, hand: 1.9, speed: 2.5, maul: 128, roar: 140, bash: 60 }, PHYSICAL = new Set(['WARRIOR', 'ROGUE', 'HUNTER', 'PALADIN']);
const STEP = .1, RUN = 7, MELEE = 5, ARMOR_K = 400 + 85 * 60, DR_RESET = 15, START = 30;
const SPELL_HIT = 96, BASE_MISS = 5, DW_MISS = 19;

export const PRESETS = {
  WARRIOR: { power: .9, build: 'arms', name: 'Arms', kind: 'melee', res: 'rage', range: 5, crit2: .2, all: 1.03 },
  PALADIN: { power: 1.02, build: 'ret', name: 'Retribution', kind: 'melee', res: 'mana', range: 5, crit2: 0, all: 1.15 },
  HUNTER: { power: .96, build: 'mm', name: 'Marksmanship', kind: 'ranged', res: 'mana', range: 35, crit2: .3, all: 1.2 },
  ROGUE: { power: .95, build: 'combat', name: 'Combat', kind: 'melee', res: 'energy', range: 5, crit2: .04, stealth: 1, offMult: .75 },
  PRIEST: { power: 1.03, build: 'shadow', name: 'Shadow', kind: 'caster', res: 'mana', range: 36, school: 'shadow', crit2: 0, spell: 1.2, form: 1.1, armor: 1395 },
  SHAMAN: { power: 1.12, build: 'enh', name: 'Enhancement', kind: 'melee', res: 'mana', range: 5, crit2: 0, all: 1 },
  MAGE: { power: 1.43, build: 'frost', name: 'Frost', kind: 'caster', res: 'mana', range: 30, school: 'frost', crit2: 1, spell: 1.05, cost: .85 },
  WARLOCK: { power: 1.01, build: 'afflic', name: 'Affliction', kind: 'caster', res: 'mana', range: 30, school: 'shadow', crit2: 1, spell: 1.2, armor: 570 },
  DRUID: { power: 1.14, pawScale: 2, build: 'cat', name: 'Feral', kind: 'melee', res: 'energy', range: 5, crit2: .2, stealth: 1, all: 1.19, cat: 1 },
};

export const PLANS = {
  WARRIOR: {
    aggressive: { label: 'All damage', tip: 'Charge at once and spend all rage on damage. No Shout.', opener: 'charge', shout: 'never', dump: 40 },
    patient: { label: 'Expect Fear', tip: 'Use Berserker Rage before a caster can Fear you, and Shout to stop their casts. Against melee, Berserker Rage does nothing.', opener: 'charge', shout: 'interrupt', expectFear: 1 },
    hold: { label: 'Hold Charge', tip: 'Walk in and save Charge for their first cast.', opener: 'hold', shout: 'interrupt' },
  },
  PALADIN: {
    fight: { label: 'Stand and fight', tip: 'Heal late and keep swinging.', healAt: .25, stunFirst: 1 },
    save: { label: 'Save the Hammer', tip: 'Keep Hammer of Justice for their casts.', healAt: .35, stunFirst: 0 },
    heal: { label: 'Outlast them', tip: 'Stun, then heal early and often.', healAt: .55, stunFirst: 1 },
  },
  HUNTER: {
    kite: { label: 'Kite', tip: 'Keep your distance with slows and traps.', kite: 1, aimed: 1, drain: 0 },
    drain: { label: 'Viper', tip: 'Drain their mana with Viper Sting.', kite: 1, aimed: 1, drain: 1 },
    hold: { label: 'Save Scatter', tip: 'Keep Scatter Shot to stop their casts.', kite: 1, aimed: 1, drain: 0, holdScatter: 1 },
  },
  ROGUE: {
    lockdown: { label: 'Lockdown', tip: 'Kidney Shot often, Gouge their casts, and Blind when you are hurt.', kidney: 1, blind: 1 },
    burst: { label: 'Burst', tip: 'Use cooldowns at once and spend on Eviscerate.', kidney: 0, burst: 1 },
    patient: { label: 'Patient', tip: 'Save Evasion and Vanish, and Kick every cast.', kidney: 1, evasionEarly: 1 },
  },
  PRIEST: {
    drain: { label: 'Drain them', tip: 'Heal at 40% and stay in Shadowform when you can.', healAt: .4, stayForm: 1, kite: 1 },
    burst: { label: 'Burst', tip: 'Heal late and keep the damage up.', healAt: .25, stayForm: 1, kite: 0 },
    sustain: { label: 'Sustain', tip: 'Heal early and stay out of Shadowform.', healAt: .6, stayForm: 0, kite: 1 },
  },
  SHAMAN: {
    fight: { label: 'Stand and fight', tip: 'Heal late and shock often.', healAt: .25, ground: 0 },
    ground: { label: 'Ground spells', tip: 'Drop Grounding Totem against casters.', healAt: .35, ground: 1 },
    heal: { label: 'Outlast them', tip: 'Heal early with Lesser Healing Wave.', healAt: .5, ground: 0 },
  },
  MAGE: {
    kite: { label: 'Kite', tip: 'Keep your distance and use Frostbolt.', keepAway: 1 },
    burst: { label: 'Shatter', tip: 'Close in on casters, Frost Nova and Ice Lance.', keepAway: 1, closeIn: 1 },
    turtle: { label: 'Turtle', tip: 'Ice Block early and play for time.', keepAway: 1, blockAt: .35 },
  },
  WARLOCK: {
    dots: { label: 'Dots and Fear', tip: 'Keep every dot up and Fear when they get close.', fearAt: 12 },
    drain: { label: 'Drain Life', tip: 'Drain Life early and play for time.', fearAt: 12, drainAt: .7 },
    bolt: { label: 'Shadow Bolt', tip: 'Fewer dots, more direct damage.', fearAt: 8, nuke: 1 },
  },
  DRUID: {
    bleed: { label: 'Bleed and Bear', tip: 'Open with Pounce, Rake and Rip, then tank in Bear Form against physical fighters. Heal at 35%.', healAt: .35, rip: 1, bear: 1 },
    burst: { label: 'Burst', tip: 'Spend on Ferocious Bite and heal late.', healAt: .3, rip: 0 },
    heal: { label: 'Outlast them', tip: 'Shift out and heal early.', healAt: .55, rip: 1 },
  },
};

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const kept = (v, ref) => (ref === undefined || v <= ref ? v : ref + (v - ref) * RULES.gearKeep);

export function makeFighter(side) {
  const { cls, stats, main, off, bow, plan, ref = {}, extra = {} } = side, p = PRESETS[cls], add = extra.stats || {}, c = (k) => kept(stats[k] || 0, ref[k]) + (add[k] || 0);
  const sta = c('sta'), hp = (BASE_HP[cls] + Math.min(sta, 20) + Math.max(0, sta - 20) * 10) * RULES.hpMult + (extra.hp || 0);
  const mana = stats.mana ? (stats.mana + (c('int') - (stats.int || 0)) * 15) + (extra.mana || 0) : 0;
  const weaponKeep = (w, base = ref.wdps) => {
    if (!w) return null;
    const dps = (w.min + w.max) / 2 / w.speed, scale = (dps <= (base || 1e9) ? dps : base + (dps - base) * RULES.weaponKeep) / dps;
    return { min: w.min * scale, max: w.max * scale, speed: w.speed };
  };
  const paw = 1 + (p.pawScale || 0) * Math.max(0, (stats.ap || 0) / (ref.ap || stats.ap || 1) - 1);
  const hand = p.cat ? { min: 54 * paw, max: 80 * paw, speed: 1 } : weaponKeep(main) || { min: 2, max: 4, speed: 2.5 };
  return {
    cls, plan, p, hp, max: hp, mana, maxMana: mana, rage: 0, energy: 100, cp: 0,
    ap: c('ap'), rap: c('rap') + (cls === 'HUNTER' ? 220 : 0), sp: c('sp'), crit: c('crit'), scrit: c('scrit'), hit: stats.hit || 0, shit: stats.shit || 0, armor: c('armor') + (p.armor || 0) + (cls === 'MAGE' ? c('int') * .75 : 0),
    agi: c('agi'), spi: c('spi'), mp5: c('mp5'), main: hand, off: weaponKeep(off), bow: weaponKeep(bow, ref.bdps),
    cd: {}, gcd: 0, swing: 0, swing2: .5, shot: 0, cast: null, channel: null, aura: {}, slows: {}, dr: {}, absorb: (extra.boon && extra.boon.shield) || 0, weakened: 0,
    form: cls === 'PRIEST' || cls === 'DRUID', stealth: !!p.stealth, dots: [], hots: [], lastCast: -9, overpower: 0, fingers: 0, night: 0, charged: 0, pushed: 0, flurry: 0,
    hold: 0, dealt: 0, healed: 0, absorbed: 0, ccd: 0, kit: new Set(extra.kit || []), crusader: (extra.crusader || 0), ward: null, boon: extra.boon || {}, boonAt: {},
  };
}

export function fight(a, b, seed, rec) {
  const r = rng(seed), A = makeFighter(a), B = makeFighter(b);
  A.foe = B; B.foe = A;
  A.side = 0; B.side = 1;
  let t = 0, d = START, regen = 2;
  const say = (type, f, name, amount, school, crit) => { if (rec) rec.events.push({ t: Math.round(t * 10) / 10, type, side: f.side, name, amount: Math.round(amount || 0), school, crit: crit ? 1 : 0 }); };
  const on = (f, k) => (f.aura[k] || 0) > t;
  const locked = (f) => on(f, 'stun') || on(f, 'fear') || on(f, 'poly');
  const rooted = (f) => locked(f) || on(f, 'root');
  const silenced = (f, school) => on(f, 'silence') || on(f, 'lock_' + school);
  const avail = (f, k) => (f.cd[k] || 0) <= t;
  const fade = () => Math.max(0, t - RULES.fadeFrom);
  const healMult = (f) => (on(f, 'wound') ? .5 : 1) * Math.max(.2, 1 - fade() * RULES.healFade) * (1 - (f.foe.boon.grievous || 0));
  const dmgMult = () => 1 + fade() * RULES.damageRise;
  const seen = (f) => {
    if (!f.stealth) return true;
    if (d > SEEN_AT) { f.spotted = 0; return false; }
    f.spotted ||= t;
    return t >= f.spotted + REACT;
  };
  const slowOf = (f) => {
    if (on(f, 'free')) return 1;
    let v = 1;
    for (const x of Object.values(f.slows)) if (x.until > t) v = Math.min(v, x.v);
    return v;
  };
  const slowed = (f) => slowOf(f) < 1;
  const slow = (f, key, v, dur) => { if (!on(f, 'free')) f.slows[key] = { v, until: t + dur }; };
  const boost = (f) => (on(f, 'sprint') ? 1.7 : on(f, 'dash') ? 1.6 : on(f, 'swift') ? 1.5 : on(f, 'wolf') ? 1.4 : f.cls === 'DRUID' && f.form ? 1.3 : 1);
  const stopCast = (f) => { f.cast = null; f.channel = null; };

  function diminish(f, group, dur) {
    const brief = 1 - (f.boon.ccShort || 0);
    if (!group) return brief;
    const g = f.dr[group] || { n: 0, until: 0 };
    if (g.until <= t) g.n = 0;
    const scale = [1, .5, .25, 0][Math.min(g.n, 3)];
    g.n++;
    g.until = t + dur * scale + DR_RESET;
    f.dr[group] = g;
    return scale * brief;
  }

  function control(f, kind, group, dur) {
    if (on(f, 'block') || (kind === 'fear' && on(f, 'fearproof')) || (kind === 'root' && on(f, 'free')) || (kind === 'stun' && on(f, 'action'))) return false;
    const scale = diminish(f, group, dur);
    if (!scale) return false;
    f.aura[kind] = t + dur * scale;
    f.ccd += dur * scale;
    stopCast(f);
    f.stealth = false;
    say('cc', f, kind, dur * scale);
    return true;
  }

  function hurt(f, amount, src, school, name, crit, periodic) {
    if (on(f, 'block') || amount <= 0) return 0;
    if (f.boon.dodge && !periodic && r() < f.boon.dodge) { say('dodge', f, name); return 0; }
    const S = src.boon, B = f.boon, power = (src.p.power || 1) * (MATCHUP[src.cls]?.[f.cls] || 1) * (1 + (S.dmg || 0)) * (t < 15 ? 1 + (S.opening || 0) : 1) * (f.hp / f.max < .35 ? 1 + (S.execute || 0) : 1) * (src.hp / src.max < .4 ? 1 + (S.rage || 0) : 1) * (1 - (B.taken || 0));
    let v = amount * power * dmgMult() * (f.cls === 'PRIEST' && f.form && school === 'phys' ? .85 : 1) * (on(f, 'bark') ? .8 : 1);
    if (f.ward && f.ward.school === school) {
      const used = Math.min(f.ward.left, v);
      f.ward.left -= used;
      v -= used;
      f.absorbed += used;
      if (f.ward.left <= 0) f.ward = null;
    }
    if (f.absorb > 0) {
      const used = Math.min(f.absorb, v);
      f.absorb -= used;
      v -= used;
      f.absorbed += used;
    }
    f.hp -= v;
    src.dealt += amount * power;
    if (S.leech && src.hp > 0) { const gain = Math.min(src.max - src.hp, v * S.leech); src.hp += gain; src.leeched = (src.leeched || 0) + gain; }
    if (B.save && !f.saved && f.hp < f.max * .2) { f.saved = 1; f.hp = Math.max(f.hp, 1) + f.max * B.save; say('heal', f, 'Phoenix Rebirth', f.max * B.save); }
    if (B.thorns && !periodic && school === 'phys' && f.hp > 0) hurt(src, B.thorns, f, 'nature', 'Thorns', false, true);
    if (f.p.res === 'rage' || f.bear) f.rage = Math.min(100, f.rage + 2.5 * v / 230.6);
    f.stealth = false;
    if (on(f, 'poly')) { f.aura.poly = 0; f.sheep = 0; }
    if (on(f, 'fear') && r() < v / BREAK_DAMAGE) f.aura.fear = 0;
    if (on(f, 'root') && r() < v / BREAK_DAMAGE) f.aura.root = 0;
    if (!periodic && v > 0 && (f.cast || f.channel) && r() >= (f.cls === 'PRIEST' ? .7 : 0)) {
      const delay = Math.max(.2, 1 - .2 * f.pushed++);
      if (f.cast) f.cast.at = Math.min(t + f.cast.time, f.cast.at + delay);
      else { f.channel.cut = (f.channel.cut || 0) + delay; if (f.channel.cut >= 1) { f.channel.cut -= 1; f.channel.left--; } }
    }
    say('hit', src, name, amount * power, school, crit);
    return v;
  }

  function heal(f, amount, name) {
    const v = Math.min(f.max - f.hp, amount * healMult(f));
    if (v <= 0) return 0;
    f.hp += v;
    f.healed += v;
    say('heal', f, name, v);
    return v;
  }

  const armorDr = (f) => { const a = Math.max(0, f.armor * (f.bear ? BEAR.armor : 1) - (on(f, 'faerie') ? 505 : 0)); return 1 - a / (a + ARMOR_K); };
  const roll = (w) => w.min + r() * (w.max - w.min);

  function strike(f, o = {}) {
    const e = f.foe, w = o.hand === 'off' ? f.off : f.main, x = r() * 100;
    if (on(e, 'block') || on(e, 'stoneform')) return null;
    f.stealth = false;
    const miss = Math.max(0, BASE_MISS + (o.white && f.off ? DW_MISS : 0) - f.hit), dodge = BASE_DODGE[e.cls] + e.agi / AGI_DODGE[e.cls] + (on(e, 'evade') ? 50 : 0) + (on(e, 'deter') ? 25 : 0), parry = CAN_PARRY.has(e.cls) ? 5 + (on(e, 'deter') ? 25 : 0) : 0;
    if (x < miss) { say('miss', f, o.name || 'Melee'); return null; }
    if (x < miss + dodge) { f.overpower = t + 5; say('dodge', f, o.name || 'Melee'); return null; }
    if (x < miss + dodge + parry) { say('parry', f, o.name || 'Melee'); return null; }
    const crit = x < miss + dodge + parry + f.crit + (o.crit || 0);
    const base = (roll(w) + (f.ap + (on(f, 'crus') ? 200 : 0) + (on(f, 'mighty') ? 120 : 0) - (on(f, 'roar') ? BEAR.roar : 0)) / 14 * (o.normal || w.speed)) * (o.pct ?? 1) + (o.flat || 0);
    const dmg = base * (o.hand === 'off' ? f.p.offMult || .5 : 1) * (crit ? 2 + (o.white ? 0 : f.p.crit2) : 1) * (f.p.all || 1) * armorDr(e);
    hurt(e, dmg, f, 'phys', o.name || 'Melee', crit);
    return { crit, dmg };
  }

  function shot(f, o = {}) {
    const e = f.foe, w = f.bow, x = r() * 100;
    if (!w || on(e, 'block') || on(e, 'stoneform')) return null;
    if (x < Math.max(0, BASE_MISS - f.hit)) { say('miss', f, o.name || 'Auto Shot'); return null; }
    const crit = x < BASE_MISS - f.hit + f.crit;
    const dmg = ((roll(w) + f.rap / 14 * w.speed) * (o.pct ?? 1) + (o.flat || 0)) * (crit ? 2 + f.p.crit2 : 1) * (f.p.all || 1) * armorDr(e);
    hurt(e, dmg, f, 'phys', o.name || 'Auto Shot', crit);
    return { crit, dmg };
  }

  function spell(f, value, school, name, o = {}) {
    const e = f.foe;
    if (on(e, 'block')) return null;
    f.stealth = false;
    if (on(e, 'ground') && !o.instant) { e.aura.ground = 0; say('ground', e, name); return null; }
    if (r() * 100 >= Math.min(99, SPELL_HIT + f.shit)) { say('resist', f, name); return null; }
    const frozen = on(e, 'root') && school === 'frost', crit = r() * 100 < f.scrit + (frozen || o.shatter ? 50 : 0) + (school === 'frost' && f.cls === 'MAGE' ? 10 : 0);
    let dmg = value * (f.cls === 'WARLOCK' && school !== 'shadow' ? 1 : f.p.spell || f.p.all || 1) * (crit ? 1.5 + f.p.crit2 / 2 : 1);
    if (f.cls === 'PRIEST' && f.form) dmg *= f.p.form;
    if (on(f, 'barrierFx') && school === 'frost') dmg *= 1.15;
    if (school === 'nature' && on(e, 'storm')) dmg *= 1.2;
    hurt(e, dmg, f, school, name, crit);
    return { crit, dmg, frozen };
  }

  function dot(e, name, per, n, every, f, school, extra = {}) {
    if (on(e, 'block')) return;
    const open = e.dots.find((x) => x.name === name), item = { name, per, left: n, next: t + every, every, from: f, school, ...extra };
    if (open) Object.assign(open, item); else e.dots.push(item);
  }

  const spend = (f, cost, mult = f.p.cost || 1) => {
    if (f.p.res === 'rage' || mult === 'rage') { if (f.rage < cost) return false; f.rage -= cost; return true; }
    if (f.p.res === 'energy' && mult !== 'mana') { if (f.energy < cost) return false; f.energy -= cost; return true; }
    const c = cost * (mult === 'mana' ? 1 : mult);
    if (f.mana < c) return false;
    f.mana -= c;
    f.lastCast = t;
    return true;
  };

  const gcd = (f, v = 1.5) => { f.gcd = t + v; };
  const startCast = (f, name, time, done, school) => { f.pushed = 0; f.cast = { name, at: t + time, time, done, school }; f.gcd = t + 1.5; say('cast', f, name, time); };

  function trinket(f) {
    if (!avail(f, 'trinket')) return false;
    for (const k of ['stun', 'fear', 'poly', 'root', 'silence']) f.aura[k] = 0;
    f.slows = {};
    f.cd.trinket = t + 300;
    say('trinket', f, 'Trinket');
    return true;
  }

  function breakOut(f, at = .55) {
    if (locked(f) && (f.hp < f.max * (f.p.kind === 'caster' && f.foe.p.kind === 'melee' ? (f.cls === 'WARLOCK' ? 1 : .8) : at) || (on(f, 'fear') && f.p.kind === 'melee' && f.foe.p.kind === 'caster'))) trinket(f);
    return locked(f);
  }

  function interrupt(f, e, lock) {
    e.aura['lock_' + e.cast.school] = t + lock;
    say('interrupt', e, e.cast.name);
    e.cast = null;
  }

  function dispel(f, need, cost) {
    const list = f.dots.filter((x) => x.school !== 'phys');
    if (list.length < need || !avail(f, 'dispel') || !spend(f, cost, 1)) return false;
    f.cd.dispel = t + 4;
    f.dots = f.dots.filter((x) => x !== list[0]);
    say('buff', f, 'Dispel');
    return true;
  }

  function consumables(f) {
    if (!f.kit.size || locked(f) || f.cast || f.channel) return;
    const e = f.foe, melee = e.p.kind === 'melee';
    const use = (k, ready, name, run) => {
      if (!f.kit.has(k) || !ready) return false;
      f.kit.delete(k);
      say('buff', f, name);
      run();
      return true;
    };
    use('heal', f.hp < f.max * .4, 'Major Healing Potion', () => heal(f, 1350 + r() * 300, 'Major Healing Potion'));
    use('mana', f.maxMana && f.mana < f.maxMana * .3, 'Major Mana Potion', () => { f.mana = Math.min(f.maxMana, f.mana + 1350 + r() * 900); });
    use('action', !melee || d <= 15, 'Free Action Potion', () => { f.aura.action = t + 30; f.aura.free = t + 30; f.aura.root = 0; f.slows = {}; });
    use('invuln', e.p.kind !== 'caster' && d <= 8 && f.hp < f.max * .6, 'Limited Invulnerability Potion', () => { f.aura.stoneform = t + 6; });
    use('swift', f.p.kind === 'melee' ? d > 12 : melee && d < 10, 'Swiftness Potion', () => { f.aura.swift = t + 15; });
    use('rage', f.p.res === 'rage' && f.rage < 25 && d <= 8, 'Mighty Rage Potion', () => { f.rage = Math.min(100, f.rage + 45 + r() * 30); f.aura.mighty = t + 20; });
    use('shadow', t > .1, 'Greater Shadow Protection Potion', () => { f.ward = { school: 'shadow', left: 800 + r() * 500 }; });
    use('frost', t > .1, 'Greater Frost Protection Potion', () => { f.ward = { school: 'frost', left: 800 + r() * 500 }; });
    use('nature', t > .1, 'Greater Nature Protection Potion', () => { f.ward = { school: 'nature', left: 800 + r() * 500 }; });
    if (f.gcd > t || !seen(e)) return;
    use('grenade', d <= 30 && !locked(e) && (!!e.cast || d <= 8), 'Thorium Grenade', () => { hurt(e, 300 + r() * 200, f, 'fire', 'Thorium Grenade'); control(e, 'stun', 'stun', 3); gcd(f, 1); });
    use('sapper', d <= 6, 'Goblin Sapper Charge', () => { hurt(e, 450 + r() * 300, f, 'fire', 'Goblin Sapper Charge'); f.hp -= 375 + r() * 250; gcd(f, 1); });
    use('dynamite', d <= 30, 'Dense Dynamite', () => { hurt(e, 340 + r() * 120, f, 'fire', 'Dense Dynamite'); gcd(f, 1); });
  }

  function meleeTrinket(f) {
    if (f.p.kind === 'melee' && slowOf(f) < .7 && d > MELEE && d < 20 && f.hp < f.max * .75) trinket(f);
  }

  function warrior(f) {
    const e = f.foe, near = d <= MELEE, plan = f.plan;
    if (plan.expectFear && !locked(f) && e.p.kind !== 'melee' && d <= 12 && avail(f, 'berserk')) { f.aura.fearproof = t + 10; f.cd.berserk = t + 30; f.rage = Math.min(100, f.rage + 5); say('buff', f, 'Berserker Rage'); }
    if (breakOut(f)) return;
    meleeTrinket(f);
    if (avail(f, 'bloodrage') && f.rage < 30) { f.rage = Math.min(100, f.rage + 30); f.hp -= 270; f.cd.bloodrage = t + 60; }
    if (f.gcd > t || !seen(e)) return;
    if (!f.charged && d >= 8 && d <= 25 && !on(f, 'root') && (plan.opener === 'charge' || e.cast || t > 6)) {
      f.charged = 1;
      f.rage = Math.min(100, f.rage + 21);
      d = MELEE;
      say('move', f, 'Charge');
      control(e, 'stun', 'stun', 1);
      return gcd(f);
    }
    if (f.charged && d >= 8 && d <= 25 && avail(f, 'intercept') && !on(f, 'root') && f.rage >= 10) {
      spend(f, 10);
      d = MELEE;
      say('move', f, 'Intercept');
      hurt(e, 65, f, 'phys', 'Intercept');
      control(e, 'stun', 'stun', 3);
      f.cd.intercept = t + 30;
      return gcd(f);
    }
    if (!near) return;
    if (e.cast && avail(f, 'pummel') && f.rage >= 10) {
      spend(f, 10);
      hurt(e, 50 * armorDr(e), f, 'phys', 'Pummel');
      interrupt(f, e, 4);
      f.cd.pummel = t + 10;
      return gcd(f);
    }
    if (e.hp < e.max * .2 && f.rage >= 15) {
      const extra = f.rage - 15;
      spend(f, f.rage);
      if (r() * 100 >= 5 + BASE_DODGE[e.cls] + e.agi / AGI_DODGE[e.cls]) hurt(e, (600 + extra * 15) * armorDr(e), f, 'phys', 'Execute');
      return gcd(f);
    }
    if (plan.shout === 'interrupt' && e.cast && avail(f, 'shout') && f.rage >= 25 && !on(e, 'stun')) {
      spend(f, 25);
      control(e, 'fear', 'fear', 8);
      f.cd.shout = t + 180;
      return gcd(f);
    }
    if (f.overpower > t && avail(f, 'overpower') && f.rage >= 5) {
      spend(f, 5);
      f.overpower = 0;
      f.cd.overpower = t + 5;
      strike(f, { flat: 35, name: 'Overpower', crit: 50, normal: 3.3 });
      return gcd(f);
    }
    if (e.p.kind !== 'melee' && !slowed(e) && f.rage >= 10) {
      spend(f, 10);
      if (strike(f, { pct: 0, flat: 45, name: 'Hamstring' })) slow(e, 'ham', .5, 10);
      return gcd(f);
    }
    if (avail(f, 'ms') && f.rage >= 30) {
      spend(f, 30);
      f.cd.ms = t + 6;
      if (strike(f, { flat: 160, name: 'Mortal Strike', normal: 3.3 })) e.aura.wound = t + 10;
      return gcd(f);
    }
    if (!slowed(e) && f.rage >= 10) {
      spend(f, 10);
      if (strike(f, { pct: 0, flat: 45, name: 'Hamstring' })) slow(e, 'ham', .5, 10);
      return gcd(f);
    }
    if (f.rage >= (plan.dump || 70)) { spend(f, 12); strike(f, { flat: 157, name: 'Heroic Strike', normal: 3.3 }); return gcd(f); }
  }

  function paladin(f) {
    const e = f.foe, plan = f.plan, near = d <= 10;
    if (f.hp < f.max * .2 && avail(f, 'bubble')) { f.aura.block = t + 12; f.cd.bubble = t + 300; for (const k of ['stun', 'fear', 'poly', 'root', 'silence']) f.aura[k] = 0; stopCast(f); say('buff', f, 'Divine Shield'); return; }
    if (breakOut(f)) return;
    if (f.cast) return;
    if (f.hp < f.max * .12 && avail(f, 'loh') && !on(f, 'wound')) { f.cd.loh = t + 3600; heal(f, f.max, 'Lay on Hands'); f.mana = 0; return; }
    if (f.gcd > t) return;
    if ((rooted(f) || slowed(f)) && d > MELEE && avail(f, 'freedom') && f.mana > 60) {
      f.aura.free = t + 10; f.aura.root = 0; f.slows = {}; f.cd.freedom = t + 20;
      say('buff', f, 'Blessing of Freedom');
      return gcd(f);
    }
    if (!seen(e)) return;
    if (near && avail(f, 'hammer') && (plan.stunFirst || e.cast) && !silenced(f, 'holy') && spend(f, 100)) {
      if (r() * 100 < SPELL_HIT + f.shit) control(e, 'stun', 'stun', 6);
      f.cd.hammer = t + 60;
      return gcd(f);
    }
    if (f.hp < f.max * plan.healAt && !silenced(f, 'holy') && f.mana >= 140) {
      if (locked(e) && !on(f, 'block')) startCast(f, 'Holy Light', 2.5, () => { if (spend(f, 660)) heal(f, 1590 + r() * 180 + f.sp * .714, 'Holy Light'); }, 'holy');
      else startCast(f, 'Flash of Light', 1.5, () => { if (spend(f, 140)) heal(f, 343 + r() * 40 + f.sp * .429, 'Flash of Light'); }, 'holy');
      return;
    }
    if (dispel(f, 2, 60)) return gcd(f);
    if (d > 10) return;
    if (avail(f, 'judge') && !silenced(f, 'holy') && spend(f, 76)) {
      f.cd.judge = t + 8;
      spell(f, 194 + r() * 17 + f.sp * .43, 'holy', 'Judgement', { instant: 1 });
      return gcd(f);
    }
    if (e.hp < e.max * .2 && avail(f, 'wrath') && !silenced(f, 'holy') && f.mana >= 425) {
      f.cd.wrath = t + 6;
      startCast(f, 'Hammer of Wrath', 1, () => { if (spend(f, 425)) spell(f, 504 + r() * 52 + f.sp * .429, 'holy', 'Hammer of Wrath'); }, 'holy');
      return;
    }
    if (d <= MELEE && avail(f, 'hstrike') && spend(f, 20)) {
      f.cd.hstrike = t + 10;
      strike(f, { pct: .5, flat: 109, name: 'Holy Strike', normal: 3.3 });
      return gcd(f);
    }
  }

  function hunter(f) {
    const e = f.foe, plan = f.plan, inShot = d >= 8 && d <= 35;
    if (f.hp < f.max * .35 && e.p.kind === 'melee' && d <= MELEE && avail(f, 'deter')) { f.aura.deter = t + 10; f.cd.deter = t + 300; say('buff', f, 'Deterrence'); }
    if (breakOut(f)) return;
    if (f.cast) return;
    if (f.gcd > t || !seen(e)) return;
    if ((plan.holdScatter ? e.cast : e.p.kind === 'melee') && d <= 15 && avail(f, 'scatter') && !on(e, 'stun') && !on(e, 'poly')) {
      f.cd.scatter = t + 30;
      shot(f, { pct: .5, name: 'Scatter Shot' });
      control(e, 'poly', 'scatter', 4);
      return gcd(f);
    }
    if (on(e, 'poly') && avail(f, 'trap') && d <= 12 && spend(f, 100)) {
      f.cd.trap = t + 15;
      f.pendingTrap = e.aura.poly;
      say('buff', f, 'Freezing Trap');
      return gcd(f);
    }
    if (d <= MELEE) {
      if (!slowed(e) && spend(f, 80)) {
        if (strike(f, { pct: 0, flat: 50, name: 'Wing Clip' })) slow(e, 'clip', .4, 10);
        return gcd(f);
      }
      if (avail(f, 'raptor') && spend(f, 100)) {
        f.cd.raptor = t + 6;
        strike(f, { flat: 140, name: 'Raptor Strike' });
        return gcd(f);
      }
      return;
    }
    if (!inShot) return;
    if (e.p.kind === 'melee' && avail(f, 'daze') && !slowed(e) && d <= 30) {
      f.cd.daze = t + 12;
      slow(e, 'daze', .5, 4);
      say('hit', f, 'Concussive Shot', 0, 'arcane');
      return gcd(f);
    }
    if (plan.drain && e.maxMana && e.mana > 300 && !e.dots.some((x) => x.name === 'Viper Sting') && spend(f, 215)) {
      dot(e, 'Viper Sting', 0, 4, 2, f, 'nature', { burn: 277 });
      return gcd(f);
    }
    if (!plan.drain && !e.dots.some((x) => x.name === 'Serpent Sting') && spend(f, 250)) {
      dot(e, 'Serpent Sting', (111 + f.rap * .02) * 1.2, 5, 3, f, 'nature');
      return gcd(f);
    }
    if (avail(f, 'arcane') && spend(f, 190)) {
      f.cd.arcane = t + 4.5;
      spell(f, 183 + f.rap * .15, 'arcane', 'Arcane Shot', { instant: 1 });
      return gcd(f);
    }
    if (plan.aimed && avail(f, 'aimed') && (d >= 15 || locked(e)) && f.mana >= 310) {
      f.cd.aimed = t + 6;
      startCast(f, 'Aimed Shot', 3, () => { if (spend(f, 310)) shot(f, { flat: 600, name: 'Aimed Shot' }); }, 'phys');
    }
  }

  function rogue(f) {
    const e = f.foe, plan = f.plan, near = d <= MELEE;
    if (f.stealth) {
      if (near && f.energy >= 60) {
        f.stealth = false;
        f.energy -= 60;
        f.cp = 2;
        control(e, 'stun', 'stun', 4);
        say('hit', f, 'Cheap Shot', 0, 'phys');
        return gcd(f, 1);
      }
      return;
    }
    if (f.hp < f.max * .3 && avail(f, 'vanish')) {
      f.cd.vanish = t + 300; f.stealth = true; f.slows = {}; f.aura.root = 0; f.aura.stun = 0; f.aura.fear = 0; f.aura.poly = 0;
      d = Math.min(45, d + 8);
      say('buff', f, 'Vanish');
      return;
    }
    if (breakOut(f)) return;
    if (avail(f, 'evade') && e.p.kind !== 'caster' && d <= MELEE && f.hp < f.max * (plan.evasionEarly ? .75 : .5)) { f.aura.evade = t + 15; f.cd.evade = t + 300; say('buff', f, 'Evasion'); }
    if (avail(f, 'sprint') && d > 10) { f.aura.sprint = t + 15; f.cd.sprint = t + 300; f.slows = {}; say('buff', f, 'Sprint'); }
    if (plan.burst && near && avail(f, 'rush')) { f.aura.rush = t + 15; f.cd.rush = t + 300; }
    if (plan.burst && near && avail(f, 'flurry')) { f.aura.haste = t + 15; f.cd.flurry = t + 120; }
    if (!plan.burst && near && avail(f, 'rush') && f.energy < 30) { f.aura.rush = t + 15; f.cd.rush = t + 300; }
    if (plan.kidney && near && avail(f, 'flurry') && on(e, 'stun')) { f.aura.haste = t + 15; f.cd.flurry = t + 120; }
    if (plan.blind && near && avail(f, 'rush') && on(e, 'stun')) { f.aura.rush = t + 15; f.cd.rush = t + 300; }
    meleeTrinket(f);
    if (f.gcd > t || !seen(e) || !near) return;
    if (e.cast && avail(f, 'kick') && spend(f, 25)) {
      hurt(e, 80 * armorDr(e), f, 'phys', 'Kick');
      interrupt(f, e, 5);
      f.cd.kick = t + 10;
      return gcd(f, 1);
    }
    if (plan.blind && f.hp < f.max * .5 && avail(f, 'blind') && !on(e, 'stun') && !on(e, 'poly') && spend(f, 30)) {
      control(e, 'poly', null, 10);
      f.cd.blind = t + 300;
      f.hold = t + 10;
      return gcd(f, 1);
    }
    if (on(e, 'poly') && f.hold > t && f.energy < 100) return;
    if (plan.kidney && f.cp >= 4 && avail(f, 'kidney') && !locked(e) && (e.maxMana || f.hp < f.max * .7) && spend(f, 25)) {
      control(e, 'stun', 'kidney', 1 + f.cp);
      f.cd.kidney = t + 20;
      f.cp = 0;
      return gcd(f, 1);
    }
    if (f.cp >= 5 || (f.cp >= 2 && e.hp < e.max * .15)) {
      if (spend(f, 25)) {
        const n = f.cp, crit = r() * 100 < f.crit, v = (108 + n * 170 + f.ap * .03 * n) * 1.27 * (crit ? 2 : 1) * armorDr(e);
        hurt(e, v, f, 'phys', 'Eviscerate', crit);
        f.cp = 0;
        return gcd(f, 1);
      }
      return;
    }
    if (avail(f, 'gouge') && plan.kidney && e.cast && !avail(f, 'kick') && spend(f, 45)) {
      f.cd.gouge = t + 10;
      if (strike(f, { pct: 0, flat: 75, name: 'Gouge' })) { control(e, 'poly', 'knock', 4); f.cp = Math.min(5, f.cp + 1); }
      return gcd(f, 1);
    }
    if (spend(f, 40)) {
      if (strike(f, { flat: 68, name: 'Sinister Strike', normal: 2.4 })) f.cp = Math.min(5, f.cp + 1);
      return gcd(f, 1);
    }
  }

  function mage(f) {
    const e = f.foe, plan = f.plan, range = f.p.range, frozen = on(e, 'root'), melee = e.p.kind === 'melee';
    if (f.hp < f.max * (plan.blockAt || .2) && avail(f, 'iceblock')) { f.aura.block = t + 10; f.cd.iceblock = t + 300; stopCast(f); for (const k of ['stun', 'fear', 'poly', 'root']) f.aura[k] = 0; say('buff', f, 'Ice Block'); return; }
    if (on(f, 'block') && !melee && f.aura.block - t < 7) { f.aura.block = 0; say('buff', f, 'Ice Block ends'); }
    if (on(f, 'block')) return;
    if ((on(f, 'stun') || on(f, 'root')) && d <= MELEE + 2 && avail(f, 'blink') && !silenced(f, 'arcane')) { f.aura.stun = 0; f.aura.root = 0; f.cd.blink = t + 15; d += 20; say('move', f, 'Blink'); return; }
    if (breakOut(f, .6)) return;
    if (f.cast && melee && d <= MELEE && avail(f, 'nova') && !frozen) f.cast = null;
    if (f.cast) return;
    if (f.gcd > t) return;
    if (avail(f, 'barrier') && f.absorb <= 0 && !silenced(f, 'frost') && spend(f, 305)) {
      f.absorb = 448 + f.sp * .1;
      f.aura.barrierFx = t + 60;
      f.cd.barrier = t + 30;
      say('buff', f, 'Ice Barrier');
      return gcd(f);
    }
    if (!seen(e)) return;
    if (e.cast && (e.cast.school === 'holy' || !melee) && avail(f, 'counter') && d <= 30 && !silenced(f, 'arcane') && spend(f, 100)) {
      interrupt(f, e, 10);
      f.cd.counter = t + 30;
      return gcd(f);
    }
    if (plan.closeIn && !melee && d > 9 && avail(f, 'nova') && !silenced(f, 'frost')) { f.closing = t + .2; return; }
    if (melee || plan.closeIn) {
      if (d <= 10 && avail(f, 'nova') && !frozen && !silenced(f, 'frost') && spend(f, 145)) {
        spell(f, 72 + r() * 8 + f.sp * .029, 'frost', 'Frost Nova', { instant: 1 });
        control(e, 'root', 'root', 8);
        f.cd.nova = t + 25;
        return gcd(f);
      }
      if (d <= MELEE + 3 && avail(f, 'blink') && !frozen && !silenced(f, 'arcane')) {
        d += 20;
        f.cd.blink = t + 15;
        say('move', f, 'Blink');
        return gcd(f);
      }
      if (d <= 8 && !frozen && !avail(f, 'nova') && !avail(f, 'blink') && !locked(e) && !silenced(f, 'arcane')) {
        startCast(f, 'Polymorph', 1.5, () => { if (spend(f, 150) && control(f.foe, 'poly', 'poly', 15)) { f.aura.run = t + 5; f.foe.sheep = 1; } }, 'arcane');
        return;
      }
      if (avail(f, 'snap') && !avail(f, 'nova') && !avail(f, 'blink') && d <= 10) { f.cd.nova = 0; f.cd.snap = t + 600; return gcd(f); }
      if (d <= 10 && avail(f, 'cone') && !silenced(f, 'frost') && spend(f, 555)) {
        spell(f, (335 + r() * 30 + f.sp * .129) * 1.35, 'frost', 'Cone of Cold', { instant: 1 });
        slow(e, 'cone', .5, 8);
        f.cd.cone = t + 10;
        return gcd(f);
      }
    }
    if (d > range) return;
    if (e.cls === 'WARLOCK' && !on(e, 'petSheep') && avail(f, 'petpoly') && !silenced(f, 'arcane') && f.mana >= 150) {
      f.cd.petpoly = t + 15;
      startCast(f, 'Polymorph', 1.5, () => { if (spend(f, 150)) { f.foe.aura.petSheep = t + 15; say('cc', f.foe, 'pet', 15); } }, 'arcane');
      return;
    }
    if (silenced(f, 'frost') && !on(f, 'silence') && !silenced(f, 'fire')) {
      if (avail(f, 'blast') && d <= 20 && spend(f, 340)) {
        spell(f, 431 + r() * 78 + f.sp * .429, 'fire', 'Fire Blast', { instant: 1 });
        f.cd.blast = t + 8;
        return gcd(f);
      }
      if (f.mana >= 170 * f.p.cost) startCast(f, 'Scorch', 1.5, () => { if (spend(f, 170)) spell(f, 237 + r() * 43 + f.sp * .429, 'fire', 'Scorch'); }, 'fire');
      return;
    }
    if ((f.fingers > 0 || (frozen && !plan.blockAt)) && !silenced(f, 'frost') && spend(f, 150)) {
      const free = f.fingers > 0;
      if (free) f.fingers--;
      spell(f, (145 + f.sp * .143) * 4, 'frost', 'Ice Lance', { shatter: free, instant: 1 });
      return gcd(f);
    }
    if (avail(f, 'blast') && !silenced(f, 'fire') && d <= 20 && (e.hp < e.max * .25 || (d <= 10 && plan.keepAway)) && spend(f, 340)) {
      spell(f, 431 + r() * 78 + f.sp * .429, 'fire', 'Fire Blast', { instant: 1 });
      f.cd.blast = t + 8;
      return gcd(f);
    }
    if (plan.keepAway && melee && d <= 11 && !on(e, 'root') && !locked(e)) return;
    if (on(e, 'poly') && on(f, 'run') && d < 26) return;
    if (!silenced(f, 'frost') && f.mana >= 290 * f.p.cost) {
      startCast(f, 'Frostbolt', 2.5, () => {
        if (!spend(f, 290)) return;
        if (spell(f, 515 + r() * 41 + f.sp * .814, 'frost', 'Frostbolt')) { slow(f.foe, 'chill', .6, 9); if (r() < .15) f.fingers = 2; }
      }, 'frost');
    }
  }

  function priest(f) {
    const e = f.foe, plan = f.plan, range = f.p.range;
    if (breakOut(f)) return;
    if (f.cast || f.channel) {
      if (f.channel && f.hp < f.max * plan.healAt && f.mana > 150) f.channel = null; else return;
    }
    if (f.gcd > t) return;
    const low = f.hp < f.max * plan.healAt, holy = !silenced(f, 'holy');
    if (low && holy && t >= f.weakened && avail(f, 'shield') && spend(f, 500, 1)) {
      f.form = false;
      f.absorb = 942 + f.sp * .1;
      f.weakened = t + 15;
      f.cd.shield = t + 4;
      say('buff', f, 'Power Word: Shield');
      return gcd(f);
    }
    if (e.p.kind === 'melee' && d <= 8 && seen(e) && avail(f, 'scream') && !silenced(f, 'shadow') && spend(f, 210, f.form ? .5 : 1)) {
      control(e, 'fear', 'fear', 8);
      f.cd.scream = t + 30;
      return gcd(f);
    }
    if (low && holy && !on(f, 'wound') && !f.hots.length && spend(f, 410, 1)) {
      f.form = false;
      f.hots.push({ name: 'Renew', per: (194 + f.sp * .2) * 1.05, left: 5, next: t + 3, every: 3 });
      return gcd(f);
    }
    if (low && holy && f.mana >= 380) {
      f.form = false;
      startCast(f, 'Flash Heal', 1.5, () => { if (spend(f, 380, 1)) heal(f, 812 + r() * 146 + f.sp * .429, 'Flash Heal'); }, 'holy');
      return;
    }
    if (dispel(f, 2, 125)) return gcd(f);
    if (!f.form && plan.stayForm && f.hp > f.max * .6) { f.form = true; say('buff', f, 'Shadowform'); return gcd(f); }
    if (!seen(e)) return;
    if (e.cast && avail(f, 'silence') && d <= 24 && spend(f, 225, 1)) {
      e.aura.silence = t + 5;
      say('interrupt', e, e.cast.name);
      e.cast = null;
      f.cd.silence = t + 45;
      return gcd(f);
    }
    if (d > range || silenced(f, 'shadow')) return;
    const cost = f.form ? .5 : 1;
    if (!e.dots.some((x) => x.name === 'Shadow Word: Pain') && spend(f, 470, cost)) {
      if (r() * 100 < SPELL_HIT + f.shit) dot(e, 'Shadow Word: Pain', (142 + f.sp * .167) * f.p.spell * (f.form ? f.p.form : 1), 8, 3, f, 'shadow', { vamp: .2 });
      return gcd(f);
    }
    if (avail(f, 'mblast') && f.mana >= 350 * cost) {
      f.cd.mblast = t + 6;
      startCast(f, 'Mind Blast', 1.5, () => { if (spend(f, 350, cost)) { const h = spell(f, 508 + r() * 28 + f.sp * .429, 'shadow', 'Mind Blast'); if (h) heal(f, h.dmg * .2, 'Vampiric Embrace'); } }, 'shadow');
      return;
    }
    if (d <= 24 && spend(f, 205, cost)) {
      f.pushed = 0;
      f.channel = { name: 'Mind Flay', left: 3, next: t + 1 };
      slow(e, 'flay', .5, 3);
      return gcd(f);
    }
  }

  function shaman(f) {
    const e = f.foe, plan = f.plan, near = d <= MELEE;
    if (breakOut(f)) return;
    if (f.cast) return;
    if (avail(f, 'farseer') && near) { f.aura.haste = t + 25; f.hasteBy = .3; f.cd.farseer = t + 180; say('buff', f, 'Rage of the Farseer'); }
    if (f.gcd > t) return;
    if (plan.ground && e.p.kind !== 'melee' && avail(f, 'ground') && !on(f, 'ground')) { f.aura.ground = t + 45; f.cd.ground = t + 15; say('buff', f, 'Grounding Totem'); return gcd(f, 1); }
    if (f.hp < f.max * plan.healAt && !silenced(f, 'nature') && f.mana >= 380) {
      startCast(f, 'Lesser Healing Wave', 1.5, () => { if (spend(f, 380)) heal(f, 832 + r() * 96 + f.sp * .429, 'Lesser Healing Wave'); }, 'nature');
      return;
    }
    if (!seen(e)) return;
    if (d > 15 && !on(f, 'wolf') && !silenced(f, 'nature') && f.mana > 100) {
      startCast(f, 'Ghost Wolf', 1, () => { if (spend(f, 100)) f.aura.wolf = t + 12; }, 'nature');
      return;
    }
    if (d <= 20 && avail(f, 'shock') && !silenced(f, 'nature')) {
      if (e.cast && spend(f, 248)) {
        spell(f, 517 + r() * 29 + f.sp * .386, 'nature', 'Earth Shock', { instant: 1 });
        if (e.cast) interrupt(f, e, 2);
        f.cd.shock = t + 6;
        return gcd(f);
      }
      if (!near && !slowed(e) && spend(f, 237)) {
        if (spell(f, 486 + r() * 28 + f.sp * .386, 'frost', 'Frost Shock', { instant: 1 })) slow(e, 'fshock', .5, 8 * diminish(e, 'root', 8));
        f.cd.shock = t + 6;
        return gcd(f);
      }
      if (near && spend(f, 248)) {
        spell(f, (517 + r() * 29 + f.sp * .386) * 1.26, 'nature', 'Earth Shock', { instant: 1 });
        f.cd.shock = t + 6;
        return gcd(f);
      }
    }
    if (avail(f, 'bolt') && d <= 30 && !silenced(f, 'nature')) {
      f.cd.bolt = t + 10;
      spell(f, (428 + r() * 49 + f.sp * .857) * 1.05, 'nature', 'Lightning Bolt', { instant: 1 });
      return gcd(f);
    }
    if (near && avail(f, 'storm') && spend(f, 121)) {
      f.cd.storm = t + 8;
      if (strike(f, { name: 'Stormstrike' })) e.aura.storm = t + 12;
      return gcd(f);
    }
  }

  function warlock(f) {
    const e = f.foe, plan = f.plan;
    if (breakOut(f)) return;
    if (f.channel) {
      if (d > 36 || (e.p.kind === 'melee' && d <= plan.fearAt && !locked(e))) f.channel = null; else return;
    }
    if (f.cast) return;
    if (f.gcd > t || !seen(e)) return;
    if (e.cast && avail(f, 'lock') && !on(f, 'petSheep')) {
      f.cd.lock = t + 30;
      e.aura.silence = t + 3;
      interrupt(f, e, 8);
    }
    if (f.hp < f.max * (e.p.kind === 'melee' ? .7 : .35) && avail(f, 'coil') && !silenced(f, 'shadow') && spend(f, 565)) {
      f.cd.coil = t + 120;
      const h = spell(f, 470 + f.sp * .214, 'shadow', 'Death Coil', { instant: 1 });
      if (h) { heal(f, h.dmg, 'Death Coil'); control(e, 'fear', 'coil', 3); }
      return gcd(f);
    }
    const kickReady = e.p.kind === 'melee' && d <= MELEE && ((e.cls === 'ROGUE' && avail(e, 'kick')) || (e.cls === 'WARRIOR' && avail(e, 'pummel')));
    if (kickReady && !locked(e) && !silenced(f, 'fire') && f.mana >= 168) {
      startCast(f, 'Searing Pain', 1.5, () => { if (spend(f, 168)) spell(f, 204 + r() * 36 + f.sp * .429, 'fire', 'Searing Pain'); }, 'fire');
      return;
    }
    if (e.p.kind === 'melee' && d <= plan.fearAt && !locked(e) && !silenced(f, 'shadow') && f.mana >= 180) {
      startCast(f, 'Fear', 1.5, () => { if (spend(f, 180)) control(f.foe, 'fear', 'lockfear', 15); }, 'shadow');
      return;
    }
    if (silenced(f, 'shadow') && !on(f, 'silence') && d <= 30 && f.mana >= 168) {
      startCast(f, 'Searing Pain', 1.5, () => { if (spend(f, 168)) spell(f, 204 + r() * 36 + f.sp * .429, 'fire', 'Searing Pain'); }, 'fire');
      return;
    }
    if (d > 30 || silenced(f, 'shadow')) return;
    const has = (n) => e.dots.some((x) => x.name === n);
    if (!has('Corruption') && spend(f, 340)) {
      dot(e, 'Corruption', (137 + f.sp * .167) * 1.1 * f.p.spell, 6, 3, f, 'shadow', { night: 1 });
      return gcd(f);
    }
    if (!has('Bane of Agony') && spend(f, 215)) {
      dot(e, 'Bane of Agony', (87 + f.sp * .083) * 1.02 * f.p.spell, 12, 2, f, 'shadow');
      return gcd(f);
    }
    if (!plan.nuke && !has('Siphon Life') && spend(f, 365)) {
      dot(e, 'Siphon Life', (45 + f.sp * .05) * f.p.spell, 10, 3, f, 'shadow', { vamp: 1 });
      return gcd(f);
    }
    if (f.mana < 450 && f.hp > f.max * .45) {
      f.mana = Math.min(f.maxMana, f.mana + 504);
      f.hp -= 420;
      return gcd(f);
    }
    if (f.hp < f.max * (plan.drainAt || .4) && f.mana >= 300 && spend(f, 300)) {
      f.pushed = 0;
      f.channel = { name: 'Drain Life', left: 5, next: t + 1, drain: 1 };
      return gcd(f);
    }
    if (f.night > t) {
      f.night = 0;
      if (spend(f, 380)) spell(f, 482 + r() * 57 + f.sp * .857, 'shadow', 'Shadow Bolt');
      return gcd(f);
    }
    if (f.mana >= 380) startCast(f, 'Shadow Bolt', 2.5, () => { if (spend(f, 380)) spell(f, 482 + r() * 57 + f.sp * .857, 'shadow', 'Shadow Bolt'); }, 'shadow');
  }

  function shape(f, bear) {
    if (!!f.bear === bear) return;
    if (bear) { f.catHand = f.catHand || f.main; f.main = { min: f.catHand.min * BEAR.hand, max: f.catHand.max * BEAR.hand, speed: BEAR.speed }; f.rage = Math.max(f.rage, 10); }
    else { f.main = f.catHand; f.rage = 0; }
    f.bear = bear;
    f.swing = Math.max(f.swing, t);
  }

  function druid(f) {
    const e = f.foe, plan = f.plan, near = d <= MELEE, wantBear = !!plan.bear && PHYSICAL.has(e.cls) && (f.ripped || t > 14);
    if (f.stealth) {
      if (near && f.energy >= 50) {
        f.stealth = false;
        f.energy -= 50;
        f.cp = 1;
        control(e, 'stun', 'stun', 2);
        dot(e, 'Pounce', 25, 6, 3, f, 'phys');
        return gcd(f, 1);
      }
      return;
    }
    if (breakOut(f)) return;
    if (f.cast) return;
    if (f.form && (on(f, 'root') || slowOf(f) < .7) && d > 6 && avail(f, 'shift') && f.gcd <= t && spend(f, CAT_COST, 'mana')) { f.cd.shift = t + 8; f.aura.root = 0; f.slows = {}; f.energy = Math.max(f.energy, 40); say('buff', f, 'Shapeshift'); return gcd(f); }
    if (avail(f, 'bark') && f.hp < f.max * .5) { f.aura.bark = t + 15; f.cd.bark = t + 60; say('buff', f, 'Barkskin'); }
    if (f.gcd > t) return;
    if (f.hp < f.max * plan.healAt && !silenced(f, 'nature') && f.mana >= (f.hots.some((x) => x.name === 'Rejuvenation') ? 880 : 360) + CAT_COST) {
      if (f.form) { f.form = false; shape(f, false); say('buff', f, 'Caster Form'); }
      if (!f.hots.some((x) => x.name === 'Rejuvenation') && spend(f, 360, 'mana')) { f.hots.push({ name: 'Rejuvenation', per: 222 + f.sp * .2, left: 4, next: t + 3, every: 3 }); return gcd(f); }
      if (f.mana >= 880 + CAT_COST) { startCast(f, 'Regrowth', 2, () => { if (spend(f, 880, 'mana')) { heal(f, 1003 + r() * 116 + f.sp * .286, 'Regrowth'); f.hots.push({ name: 'Regrowth', per: 152 + f.sp * .071, left: 7, next: t + 3, every: 3 }); } }, 'nature'); return; }
    }
    if (!f.form) { f.mana = Math.max(0, f.mana - CAT_COST); f.form = true; shape(f, wantBear); f.energy = Math.max(f.energy, 40); say('buff', f, wantBear ? 'Dire Bear Form' : 'Cat Form'); return gcd(f); }
    if (wantBear && !f.bear && f.cp === 0 && f.mana >= CAT_COST * 2) { f.mana -= CAT_COST; shape(f, true); say('buff', f, 'Dire Bear Form'); return gcd(f); }
    if (f.bear) {
      if (!seen(e) || !near) return;
      if (avail(f, 'bash') && !locked(e) && (e.cast || e.channel || f.hp < f.max * .6) && spend(f, 10, 'rage')) { f.cd.bash = t + BEAR.bash; control(e, 'stun', 'stun', 4); say('hit', f, 'Bash'); return gcd(f); }
      if (!on(e, 'roar') && e.p.kind !== 'caster' && spend(f, 10, 'rage')) { e.aura.roar = t + 30; say('hit', f, 'Demoralizing Roar'); return gcd(f); }
      if (f.rage >= 15 && spend(f, 15, 'rage')) { strike(f, { flat: BEAR.maul, name: 'Maul' }); return gcd(f, 1.5); }
      return;
    }
    if (avail(f, 'dash') && d > 10) { f.aura.dash = t + 15; f.cd.dash = t + 300; }
    if (!seen(e) || !near) return;
    if (f.cp >= 5 || (f.cp >= 3 && e.hp < e.max * .15)) {
      const useRip = plan.rip && e.hp > e.max * .3 && !e.dots.some((x) => x.name === 'Rip');
      if (useRip && spend(f, 30)) {
        const n = f.cp;
        dot(e, 'Rip', (18 + n * 26 + f.ap * .04) * f.p.all, 4 + n, 2, f, 'phys');
        f.cp = 0;
        f.ripped = 1;
        return gcd(f, 1);
      }
      if (!useRip && spend(f, 35)) {
        const n = f.cp, crit = r() * 100 < f.crit, v = (110 + n * 147 + f.ap * .03 * n + f.energy * 2.7) * f.p.all * (crit ? 2 : 1) * armorDr(e);
        f.energy = 0;
        hurt(e, v, f, 'phys', 'Ferocious Bite', crit);
        f.cp = 0;
        return gcd(f, 1);
      }
      return;
    }
    if (!on(e, 'faerie') && e.armor > 2000) {
      e.aura.faerie = t + 40;
      say('hit', f, 'Faerie Fire', 0, 'arcane');
      return gcd(f, 1);
    }
    if (!e.dots.some((x) => x.name === 'Rake') && spend(f, 40)) {
      if (strike(f, { pct: 0, flat: 58, name: 'Rake' })) { dot(e, 'Rake', 32 * f.p.all, 3, 3, f, 'phys'); f.cp = Math.min(5, f.cp + 1); }
      return gcd(f, 1);
    }
    if (spend(f, locked(e) ? 42 : 45)) {
      if (strike(f, locked(e) ? { pct: 2.25, flat: 80, name: 'Shred', normal: 1 } : { flat: 115, name: 'Claw', normal: 1 })) f.cp = Math.min(5, f.cp + 1);
      return gcd(f, 1);
    }
  }

  const brains = { WARRIOR: warrior, PALADIN: paladin, HUNTER: hunter, ROGUE: rogue, PRIEST: priest, SHAMAN: shaman, MAGE: mage, WARLOCK: warlock, DRUID: druid };

  function hitBonus(f, s, off) {
    if (!s) return;
    const e = f.foe;
    if (f.crusader && r() < f.crusader * (off ? f.off.speed : f.main.speed) / 60) f.aura.crus = t + 15;
    if (f.cls === 'PALADIN' && r() < .28) spell(f, ((f.main.min + f.main.max) / 2 + f.ap / 14 * f.main.speed) * .7, 'holy', 'Seal of Command', { instant: 1 });
    if (f.cls === 'ROGUE') {
      if (!off && r() < .2) spell(f, 112 + r() * 36, 'nature', 'Instant Poison', { instant: 1 });
      if (off && r() < .3) slow(e, 'crip', .3, 12);
    }
    if (f.cls === 'SHAMAN' && s.crit) f.flurry = 3;
    if (f.cls === 'SHAMAN' && t >= (f.windAt || 0) && r() < .35) {
      f.windAt = t + 3;
      strike(f, { flat: 445 * 1.4 / 14 * f.main.speed, name: 'Windfury', white: 1 });
    }
  }

  function tick(f) {
    if (f.hp <= 0) return;
    if (f.cast && f.cast.at <= t && !locked(f)) { const c = f.cast; f.cast = null; if (!silenced(f, c.school)) c.done(); }
    if (f.channel && f.channel.next <= t) {
      f.channel.next = t + 1;
      if (f.channel.drain) {
        const h = spell(f, 71 + f.sp * .1, 'shadow', 'Drain Life');
        if (h) heal(f, h.dmg, 'Drain Life');
      } else {
        const h = spell(f, 142 + f.sp * .15, 'shadow', 'Mind Flay');
        if (h) heal(f, h.dmg * .2, 'Vampiric Embrace');
      }
      if (f.channel && --f.channel.left <= 0) f.channel = null;
    }
    for (const x of f.dots) {
      if (x.left > 0 && x.next <= t) {
        x.next = t + x.every;
        x.left--;
        if (x.burn) { f.mana = Math.max(0, f.mana - x.burn); say('hit', x.from, x.name, 0, 'nature'); } else {
          hurt(f, x.per, x.from, x.school, x.name, false, true);
          if (x.vamp) heal(x.from, x.per * x.vamp, x.name);
          if (x.night && r() < .04) x.from.night = t + 12;
        }
      }
    }
    f.dots = f.dots.filter((x) => x.left > 0);
    for (const x of f.hots) if (x.left > 0 && x.next <= t) { x.next = t + x.every; x.left--; heal(f, x.per, x.name); }
    f.hots = f.hots.filter((x) => x.left > 0);
    if (f.pendingTrap && f.pendingTrap <= t) { f.pendingTrap = 0; control(f.foe, 'poly', 'freeze', 15); }
    if (f.hp <= 0) return;
    consumables(f);
    if (f.hp <= 0) return;
    brains[f.cls](f);
    const haste = (on(f, 'haste') ? 1 + (f.hasteBy || .2) : 1) * (f.flurry > 0 ? 1.25 : 1);
    const usable = !locked(f) && !on(f, 'block') && !f.stealth && !(on(f.foe, 'poly') && f.hold > t && f.energy < 100) && seen(f.foe) && !(f.cls === 'DRUID' && !f.form) && !f.cast && !f.channel;
    if (f.p.kind === 'melee' && d <= MELEE && usable) {
      if (f.swing <= t) {
        f.swing = t + f.main.speed / haste;
        if (f.flurry > 0) f.flurry--;
        const s = strike(f, { white: 1, name: 'Melee' });
        if (f.p.res === 'rage' || f.bear) f.rage = Math.min(100, f.rage + 3.46 * f.main.speed * 1.3 * (s && s.crit ? 2 : 1) * (s ? 1 : .5));
        hitBonus(f, s);
      }
      if (f.off && f.swing2 <= t) {
        f.swing2 = t + f.off.speed / haste;
        hitBonus(f, strike(f, { white: 1, hand: 'off', name: 'Off Hand' }), true);
      }
    }
    if (f.cls === 'HUNTER' && d >= 8 && d <= 35 && !locked(f) && !f.cast && f.shot <= t && seen(f.foe) && !kiting(f)) {
      f.shot = t + (f.bow ? f.bow.speed : 3) / 1.15;
      shot(f);
    }
    if (f.cls === 'WARLOCK' && d <= 30 && t >= 4 && (f.petAt || 0) <= t && !on(f, 'petSheep')) {
      f.petAt = t + 2;
      if (seen(f.foe)) hurt(f.foe, (110 + r() * 32) * armorDr(f.foe), f, 'phys', 'Felhunter', false, true);
    }
    boonTick(f);
    if (f.cls === 'HUNTER' && t >= 4 && (f.petAt || 0) <= t) {
      f.petAt = t + 2;
      if (seen(f.foe) && !on(f.foe, 'poly')) hurt(f.foe, (48 + f.rap * .055) * 2 * armorDr(f.foe), f, 'phys', 'Cat', false, true);
    }
  }

  function boonTick(f) {
    const e = f.foe, B = f.boon, might = Math.max(f.ap, f.rap, f.sp * 1.4), ready = (k, every) => {
      if ((f.boonAt[k] ??= 4) > t) return false;
      f.boonAt[k] = t + every;
      return true;
    };
    if (!seen(e) || on(e, 'poly')) return;
    if (B.pulse && ready('pulse', B.pulse.every)) hurt(e, B.pulse.dmg + might * .1, f, B.pulse.school, B.pulse.name, false, true);
    for (const a of B.allies || []) {
      if (!ready(a.name, a.every)) continue;
      hurt(e, (a.dmg + might * a.scale) * (a.school ? 1 : armorDr(e)), f, a.school || 'phys', a.name, false, true);
      if (a.slow) slow(e, a.name, a.slow, 2);
    }
  }

  function kiting(f) {
    const e = f.foe;
    if (!(f.plan.keepAway || f.plan.kite || f.cls === 'WARLOCK') || d >= 14 || e.p.kind !== 'melee' || !seen(e)) return false;
    return rooted(e) || (slowed(e) && !slowed(f));
  }

  function move() {
    const speed = (f) => (rooted(f) ? 0 : RUN * slowOf(f) * boost(f) * (f.stealth ? .7 : 1));
    const stand = (f) => !!(f.cast || f.channel);
    const chase = (f) => {
      if (stand(f) || on(f, 'block')) return 0;
      if (f.p.kind === 'melee') return d > MELEE - 1 ? speed(f) : 0;
      return d > f.p.range - 2 || (f.closing || 0) > t ? speed(f) : 0;
    };
    const flee = (f) => {
      if (stand(f) || locked(f) || f.foe.p.kind !== 'melee' || !seen(f.foe)) return 0;
      return kiting(f) || (on(f, 'run') && d < 28) ? speed(f) : 0;
    };
    const scared = (f) => (on(f, 'fear') ? RUN * .7 : 0);
    d = Math.max(MELEE - 1, Math.min(45, d + (flee(A) + flee(B) + scared(A) + scared(B) - chase(A) - chase(B)) * STEP));
  }

  function snap(f) {
    const mana = f.p.res === 'mana' || (f.cls === 'DRUID' && !f.form);
    return {
      hp: Math.round(f.hp), max: Math.round(f.max), res: Math.round(mana ? f.mana : f.p.res === 'rage' ? f.rage : f.energy), resMax: mana ? Math.round(f.maxMana) : 100, resKind: mana ? 'mana' : f.p.res,
      cast: f.cast ? f.cast.name : f.channel ? f.channel.name : '', school: f.cast ? f.cast.school : f.channel ? 'shadow' : '', cat: f.cls === 'DRUID' && f.form && !f.bear ? 1 : 0, bear: f.bear ? 1 : 0, petSheep: on(f, 'petSheep') ? 1 : 0, sheep: on(f, 'poly') && f.sheep ? 1 : 0, shield: f.absorb > 0 ? 1 : 0, mover: on(f, 'fear') ? 1 : 0, state: on(f, 'block') ? 'block' : on(f, 'stun') ? 'stun' : on(f, 'fear') ? 'fear' : on(f, 'poly') ? 'poly' : on(f, 'root') ? 'root' : f.stealth ? 'stealth' : '', absorb: Math.round(f.absorb),
    };
  }

  if (rec) rec.frames.push({ t: 0, d, a: snap(A), b: snap(B) });
  let frame = 1;
  while (t < RULES.maxTime && A.hp > 0 && B.hp > 0) {
    const first = r() < .5 ? A : B, second = first === A ? B : A;
    tick(first);
    tick(second);
    move();
    if (t >= regen) {
      regen = t + 2;
      for (const f of [A, B]) {
        if (f.boon.hot) { const gain = Math.min(f.max - f.hp, f.max * f.boon.hot * healMult(f)); f.hp += gain; if (gain >= 1 && f.hp > 0) say('heal', f, "Elune's Grace", gain); }
        if (f.leeched >= 1 && f.hp > 0) say('heal', f, "Banshee's Hunger", f.leeched);
        f.leeched = 0;
        if (f.maxMana) f.mana = Math.min(f.maxMana, f.mana + f.mp5 * .4 + (REGEN[f.cls][0] + f.spi / REGEN[f.cls][1]) * (t - f.lastCast < 5 ? (f.cls === 'PRIEST' ? .5 : 0) : 1));
        if (f.p.res === 'energy') f.energy = Math.min(100, f.energy + (on(f, 'rush') ? 40 : 20));
        if (f.p.res === 'rage') f.rage = Math.min(100, f.rage + 2 / 3);
      }
    }
    if (rec && frame++ % 2 === 0) rec.frames.push({ t: Math.round(t * 10) / 10, d: Math.round(d * 10) / 10, a: snap(A), b: snap(B) });
    t += STEP;
  }
  const winner = A.hp > 0 && B.hp <= 0 ? 0 : B.hp > 0 && A.hp <= 0 ? 1 : A.hp / A.max >= B.hp / B.max ? 0 : 1;
  if (rec) rec.frames.push({ t: Math.round(t * 10) / 10, d: Math.round(d * 10) / 10, a: snap(A), b: snap(B) });
  return { winner, time: t, timedOut: A.hp > 0 && B.hp > 0, a: A, b: B };
}
