import { rng, hash, FIGHT, BUILDS } from '../draft/core.js';
import { SCALE } from './bosses.js';

const STEP = .1, MAX_TIME = 420, DUMMY_ARMOR = 3731, ARMOR_K = 400 + 85 * 60, CRUSH = 15, DUMMY_RESIST = .94, SWAP = .7, STAND_DAMAGE = .8, STAND_AVOID = .1, STAND_AGILE = .25, STAND_TAKEN = .85, FALLEN_BASE = 1.5, FALLEN_RAMP = .3;
const CAST_SPELLS = new Set(Object.values(BUILDS).flat().flatMap((b) => b.kit.abilities.filter((a) => a.cast).map((a) => a.n)));
const dr = (armor) => armor / (armor + ARMOR_K);
const resisted = (res, school) => Math.min(.75, Math.max(res, 0) / 315 * .75) * (school === 'phys' ? 0 : 1);

export function factors(boss, fx = {}) {
  const phys = (1 - dr(Math.max(0, boss.armor - (fx.armor || 0)))) / (1 - dr(DUMMY_ARMOR));
  return (school) => {
    if (school === 'phys') return phys;
    const swap = (boss.immune || []).includes(school) ? SWAP : 1, res = (boss.resist || {})[school] || 0;
    return swap * (1 - Math.min(.75, Math.max(res, 0) / 315 * .75)) / DUMMY_RESIST * (res < 0 ? 1 - res / 315 * .75 : 1);
  };
}

export const bossHealth = (boss, twist) => boss.health * (boss.tune || 1) * SCALE.health * (1 + (boss.endless ? 0 : (boss.step || 0) * SCALE.rampHealth)) * ((twist && twist.health) || 1);
export const enrageTime = (boss, twist) => (boss.endless ? 0 : bossHealth(boss, twist) / (SCALE.enrageDps + (boss.step || 0) * SCALE.enrageRamp) * ((twist && twist.enrage) || 1) * (boss.enrageBy || 1));

export function fight(heroes, boss, seed, twist = null, mods = {}) {
  const r = rng(hash(seed, boss.id)), between = ([a, b]) => a + r() * (b - a);
  const party = heroes.map((h, i) => ({ ...h, i, max: h.hp * (mods && mods.hp || 1), hp: h.hp * (mods && mods.hp || 1), maxMana: (h.mana || 0) * (mods && mods.mana || 1), curMana: (h.mana || 0) * (mods && mods.mana || 1), gone: 0, silenced: 0, stunned: 0, knocked: 0, dead: false, took: 0, dealt: 0, healed: 0, overheal: 0, dots: [], casting: null, lastCast: -9, used: {}, maxHit: 0, logAt: 0, lastAt: 0, wall: 0, oomAt: 0, killedBy: '' }));
  const tank = party.find((h) => h.role === 'tank'), healer = party.find((h) => h.role === 'heal'), dps = party.find((h) => h.role === 'dps');
  const ramp = (key) => 1 + (boss.endless ? 0 : (boss.step || 0) * key);
  const m = mods || {}, maxHp = bossHealth(boss, twist), enrageAt = enrageTime(boss, twist) * (m.enrage || 1), tw = twist || {};
  const b = { hp: maxHp, max: maxHp, shield: 0, buffs: [], swing: 1, enraged: { speed: 0, damage: 0 }, ticks: [] };
  const adds = boss.adds ? Array.from({ length: boss.adds.count }, (_, i) => ({ i, hp: boss.adds.health * SCALE.health, max: boss.adds.health * SCALE.health, swing: 1 + i * .4, healAt: 6 + i * 3 })) : [];
  const curses = [], delayed = [], timers = boss.abilities.map((a) => ({ a, next: a.first ?? 0, used: false }));
  const fx = heroes[0].fx || {}, mult = factors(boss, fx), events = [], frames = [];
  let t = 0, fell = 0, fury = 1, score = 0, hots = [], burns = [], enraged = false, pulseAt = 3, landed = !boss.air, weakAt = -1;
  const weakOff = boss.weak ? Math.floor(r() * boss.weak.schools.length) : 0;
  const weakNow = () => boss.weak.schools[(Math.floor(t / boss.weak.every) + weakOff) % boss.weak.schools.length];
  const flying = () => !landed && b.hp / b.max > boss.air;
  const say = (e) => events.push({ t: Math.round(t * 10) / 10, ...e });
  const curse = (key, base) => curses.reduce((v, c) => (c.until > t && c.fx[key] ? v * c.fx[key] : v), base);
  const buff = (key, base) => b.buffs.reduce((v, x) => (x.until > t && x.fx[key] ? v * x.fx[key] : v), base);
  const hasBuff = (key) => b.buffs.some((x) => x.until > t && x.fx[key]);
  const alive = () => party.filter((h) => !h.dead);
  const front = () => [tank, dps, healer].find((h) => !h.dead);
  const pick = (to) => {
    const live = alive();
    if (to === 'tank') return [front()].filter(Boolean);
    if (to === 'party') return live;
    if (to === 'melee') return live.filter((h) => h.role === 'tank' || h.melee);
    if (to === 'heal') return [healer].filter((h) => !h.dead);
    if (to === 'dps') return [dps].filter((h) => !h.dead);
    const others = live.length > 1 ? live.filter((h) => h !== tank) : live;
    return [others[Math.floor(r() * others.length)]].filter(Boolean);
  };
  const die = (h, by) => { h.dead = true; h.hp = 0; h.killedBy = by; h.dots = []; h.casting = null; say({ k: 'death', i: h.i, by }); if (boss.levelUp) { b.enraged.damage += boss.levelUp.damage; say({ k: 'boss', n: boss.levelUp.n }); } if (h === tank) { fell = t; if (!dps.dead) say({ k: 'save', i: dps.i, n: 'Takes the boss' }); } };
  const hurt = (h, raw, school, n, opts = {}) => {
    if (h.dead) return;
    let v = raw * (school === 'phys' ? SCALE.melee * (opts.spike ? SCALE.spike : 1) : SCALE.damage) * fury * ramp(SCALE.rampDamage) * (tw.damage || 1) * (boss.hit || 1);
    if (school === 'phys') v *= opts.noArmor ? 1 : 1 - dr(h.armor);
    else {
      v *= 1 - resisted(h.res[school] || 0, school);
      v = curse('magic', v);
    }
    if (h.k && h.k.taken) v *= h.k.taken;
    if (h.wall > t) v *= h.k.wall.taken;
    if (h === tank) v *= m.tankTaken || 1;
    else if (tank.dead) v *= (FALLEN_BASE + (t - fell) * FALLEN_RAMP) * (h.melee && school === 'phys' ? STAND_TAKEN : 1);
    h.hp -= v; h.took += v;
    if (v > h.maxHit) h.maxHit = v;
    say({ k: 'hit', i: h.i, n, v: Math.round(v), school });
    if (h.hp <= 0 && h === tank && m.undying && !h.used.undying) { h.used.undying = 1; h.hp = h.max * .3; say({ k: 'save', i: h.i, n: 'Undying Resolve' }); }
    if (h.hp <= 0) saves(h, n);
    if (h.hp <= 0) die(h, n);
    return v;
  };
  const saves = (h, n) => {
    const k = h.k || {};
    if (k.stand && !h.used.stand) { h.used.stand = 1; h.max *= 1 + k.stand.hp; h.hp = Math.max(h.hp, 0) + h.max * k.stand.hp; say({ k: 'save', i: h.i, n: 'Last Stand' }); }
    else if (k.hands && !h.used.hands) { h.used.hands = 1; h.hp = h.max; say({ k: 'save', i: h.i, n: 'Lay on Hands' }); }
  };
  const emergency = (h) => {
    const k = h.k || {};
    if (k.wall && !h.used.wall && h.hp / h.max < k.wall.below) { h.used.wall = 1; h.wall = t + k.wall.dur; say({ k: 'save', i: h.i, n: 'Shield Wall' }); }
    if (k.hands && !h.used.hands && h.hp / h.max < k.hands.below) { h.used.hands = 1; h.hp = h.max; say({ k: 'save', i: h.i, n: 'Lay on Hands' }); }
    if (k.regen && !h.used.regen && h.hp / h.max < k.regen.below) { h.used.regen = 1; h.dots.push({ n: 'Frenzied Regeneration', heal: h.max * k.regen.hp / k.regen.dur, every: 1, next: t + 1, left: k.regen.dur }); say({ k: 'save', i: h.i, n: 'Frenzied Regeneration' }); }
  };
  const swingBoss = (raw, name) => {
    const h = front();
    if (!h) return;
    const dmg = () => (between(raw) * buff('damage', 1) * (1 + b.enraged.damage));
    if (h !== tank) {
      if (h.melee && r() < (/^(cat|catm|combat|mut)$/.test(h.build) ? STAND_AGILE : STAND_AVOID)) { say({ k: 'avoid', i: h.i, n: 'dodge' }); return; }
      return hurt(h, dmg(), 'phys', name, { spike: 1 });
    }
    let x = r() * 100, v = dmg(), tag = 'hit';
    const avoid = [['miss', h.miss], ['dodge', h.dodge], ['parry', h.parry]];
    for (const [key, chance] of avoid) { if (x < chance) { say({ k: 'avoid', i: h.i, n: key }); return; } x -= chance; }
    if (x < h.block) { v = Math.max(0, v - h.blockValue / SCALE.melee / SCALE.spike); tag = 'block'; } else {
      x -= h.block;
      const critChance = m.noCrit ? 0 : h.critTaken;
      if (x < critChance) { v *= 2; tag = 'crit'; } else { x -= critChance; if (x < CRUSH) { v *= 1.5; tag = 'crush'; } }
    }
    hurt(h, v, 'phys', tag === 'hit' ? name : `${name} (${tag})`, { spike: 1 });
  };
  const dealBoss = (v, school, n, h, crit) => {
    if (hasBuff('vanish')) return;
    let amount = v * (h.power || 1) * mult(school) * (school === 'phys' ? (tw.physTaken || 1) * (h.melee ? fx.melee || 1 : 1) : tw.magicTaken || 1);
    if (school !== 'phys') amount = buff('magicTaken', amount);
    amount = buff('allTaken', amount);
    if (CAST_SPELLS.has(n)) amount /= curse('castTime', 1);
    if (boss.air && flying() && (h.melee || h === tank)) amount *= boss.airHit || 0;
    if (boss.weak && school !== 'phys' && school === weakNow()) amount *= boss.weak.up;
    amount *= (m.damage || 1) * (m.opening && t < 20 ? m.opening : 1) * (m.execute && b.hp / b.max < .3 ? m.execute : 1) * (h === tank ? m.tankDamage || 1 : 1) * (h === dps && tank.dead ? STAND_DAMAGE : 1);
    if (school === 'shadow' && fx.weave) amount *= 1 + fx.weave * Math.min(1, t / 15);
    if (school === 'nature' && fx.storm && h.role === 'dps') amount *= 1 + fx.storm;
    if (school === 'shadow' && fx.leech) for (const x of alive()) x.hp = Math.min(x.max, x.hp + amount * fx.leech / 3);
    const add = adds.find((a) => a.hp > 0 && !boss.adds.unkillable);
    if (hasBuff('reflectSpells') && school !== 'phys') { hurt(h, v * .07, school, 'Reflected', {}); amount *= .6; }
    if (hasBuff('thorns') && school === 'phys' && r() < .3) hurt(h, 250, 'arcane', 'Damage Shield');
    h.dealt += amount;
    if (add) {
      add.hp -= amount;
      if (add.hp <= 0) {
        say({ k: 'add', n: boss.adds.n });
        const d = boss.adds.death;
        if (d) {
          for (const x of pick(d.to)) hurt(x, between(d.dmg), d.school, d.n);
          if (d.enrage) { b.enraged.speed += d.enrage.speed; b.enraged.damage += d.enrage.damage; }
          if (d.bossDamage && !boss.endless) b.hp = Math.max(1, b.hp - b.max * d.bossDamage);
        }
      }
    } else if (b.shield > 0) {
      const taken = Math.min(b.shield, amount);
      b.shield -= taken;
      if (!boss.endless) b.hp -= amount - taken;
    } else if (boss.endless) score += amount; else b.hp -= amount;
    if (boss.endless) b.hp = Math.max(1, b.max * (1 - Math.min(.99, score / b.max / 4)));
    say({ k: 'deal', i: h.i, n, v: Math.round(amount), school, crit: crit ? 1 : 0 });
  };
  const useAbility = (a) => {
    if (a.below && b.hp / b.max >= a.below) return;
    if (a.curse && !a.to) { curses.push({ fx: a.curse, until: t + a.dur }); say({ k: 'boss', n: a.n }); return; }
    if (a.mend) { if (!boss.endless) b.hp = Math.min(b.max, b.hp + b.max * a.mend); say({ k: 'boss', n: a.n }); return; }
    if (a.control) { const h = a.control === 'heal' ? healer : dps; if (!h.dead) { h.gone = Math.max(h.gone, t + a.dur); h.casting = null; } say({ k: 'boss', n: a.n }); return; }
    if (a.boss && !a.to) { b.buffs.push({ fx: a.boss, until: t + a.dur }); say({ k: 'boss', n: a.n }); if (a.tick) b.ticks.push({ ...a.tick, next: t + a.tick.every, until: t + a.dur }); return; }
    if (a.tick) { b.ticks.push({ ...a.tick, next: t + a.tick.every, until: t + a.dur }); say({ k: 'boss', n: a.n }); return; }
    if (a.fear) { for (const h of party) if (h !== tank && !h.dead) h.gone = Math.max(h.gone, t + a.dur); say({ k: 'boss', n: a.n }); return; }
    if (a.silence) { const h = a.silence === 'heal' ? healer : dps; if (!h.dead) { h.silenced = t + a.dur; h.casting = null; } say({ k: 'boss', n: a.n }); return; }
    if (a.burn) { if (!healer.dead) burns.push({ ...a.burn, next: t, left: a.burn.ticks }); say({ k: 'boss', n: a.n }); return; }
    if (a.dispel) { hots = []; say({ k: 'boss', n: a.n }); return; }
    if (a.hinder) { if (dps.melee && !dps.dead) dps.knocked = t + a.dur; say({ k: 'boss', n: a.n }); return; }
    if (a.shield) { b.hp = b.max; b.shield = a.shield * SCALE.health; say({ k: 'boss', n: a.n }); return; }
    if (a.halve) { say({ k: 'boss', n: a.n }); for (const h of pick(a.to)) { const v = h.hp * a.halve; h.hp -= v; h.took += v; say({ k: 'hit', i: h.i, n: a.n, v: Math.round(v), school: 'phys' }); } return; }
    if (a.wave) { b.ticks.push({ ...a.wave, school: 'phys', to: 'tank', next: t + a.wave.every, until: t + a.wave.every * a.wave.ticks }); say({ k: 'boss', n: a.n }); return; }
    say({ k: 'boss', n: a.n });
    if (a.curse) curses.push({ fx: a.curse, until: t + a.dur });
    if (a.boss) b.buffs.push({ fx: a.boss, until: t + a.dur });
    for (const h of pick(a.to)) {
      if (a.delay) delayed.push({ at: t + a.delay, a, h });
      else if (a.dmg) { const v = hurt(h, between(a.dmg), a.school, a.n); if (a.drain && v && !boss.endless) b.hp = Math.min(b.max, b.hp + v * a.drain); }
      if (a.dot) h.dots.push({ ...a.dot, next: t + a.dot.every, left: a.dot.ticks });
      if (a.stun && !h.dead) h.stunned = t + a.stun;
      if (a.knock && h.melee) h.knocked = t + a.knock;
    }
  };
  const healAmount = (h, s) => {
    const k = h.k, value = (s.base * (1 + (r() - .5) * s.spread) + h.heal * s.coef) * k.heal * (m.heal || 1);
    return { value, crit: r() * 100 < h.crit };
  };
  const applyHeal = (h, target, v, n, crit) => {
    const amount = curse('heal', v * (crit ? 1.5 : 1)), room = Math.max(0, target.max - target.hp), real = Math.min(room, amount);
    target.hp += real; h.healed += real; h.overheal += amount - real;
    say({ k: 'heal', i: target.i, n, v: Math.round(real), crit: crit ? 1 : 0 });
    if (crit && h.k.refund) h.curMana = Math.min(h.maxMana, h.curMana + (h.casting?.s?.cost || 0) * h.k.refund);
  };
  const think = (h) => {
    if (h.dead || h.casting || h.gone > t || h.silenced > t || h.stunned > t) return;
    const k = h.k, live = alive(), hurtMost = live.reduce((m, x) => (x.hp / x.max < m.hp / m.max ? x : m), live[0]), missing = hurtMost.max - hurtMost.hp, cost = (s) => curse('cost', s.cost * k.cost * (tw.cost || 1) * (m.cost || 1)), castTime = (s) => s.cast / (m.castSpeed || 1) * curse('castTime', 1);
    const wounded = live.filter((x) => x.hp / x.max < .8).length;
    const healPower = curse('heal', 1);
    let s = null, target = hurtMost;
    if (k.chain && wounded >= 2 && live.reduce((n, x) => n + x.max - x.hp, 0) > 900 && h.curMana >= cost(k.chain)) s = k.chain;
    else if (hurtMost.hp / hurtMost.max < .45 && h.curMana >= cost(k.fast)) s = k.fast;
    else if (missing > (k.big.base + h.heal * k.big.coef) * k.heal * healPower * .8 && h.curMana >= cost(k.big)) s = k.big;
    else if (missing > (k.fast.base + h.heal * k.fast.coef) * k.heal * healPower * .7 && h.curMana >= cost(k.fast)) s = k.fast;
    else if (k.hot && missing > 150) {
      const free = live.filter((x) => !hots.some((o) => o.to === x && o.left > 1)).sort((x, y) => x.hp / x.max - y.hp / y.max)[0];
      if (free && free.hp < free.max && h.curMana >= cost(k.hot)) {
        h.curMana -= cost(k.hot); h.lastCast = t;
        hots.push({ to: free, from: h, per: (k.hot.per + h.heal * k.hot.coef) * k.heal, every: k.hot.every, next: t + k.hot.every, left: k.hot.ticks, n: k.hot.n });
        h.casting = { s: { cast: 1.5, cost: 0 }, at: t + 1.5, instant: 1 };
        return;
      }
    }
    if (!s) {
      if (!h.oomAt && live.some((x) => x.hp < x.max * .9) && h.curMana < cost(k.fast)) { h.oomAt = t; say({ k: 'oom', i: h.i }); }
      return;
    }
    h.curMana -= cost(s); h.lastCast = t;
    h.casting = { s, target, at: t + castTime(s) };
    say({ k: 'cast', i: h.i, n: s.n, dur: castTime(s) });
  };
  const damageHero = (h) => {
    if (h.dead || h.gone > t || h.stunned > t || h.knocked > t) return;
    if (h.log) {
      const at = t % FIGHT;
      if (at < h.lastAt) h.logAt = 0;
      h.lastAt = at;
      while (h.logAt < h.log.length && h.log[h.logAt][0] <= at) {
        const [, n, v, crit, school] = h.log[h.logAt++];
        dealBoss(v, school, n, h, crit);
      }
    } else dealBoss(h.dps * STEP, 'phys', 'Attacks', h, 0);
  };
  const dotTick = (h) => {
    for (const d of h.dots) if (d.next <= t && d.left > 0) {
      d.next = t + d.every; d.left--;
      if (d.heal) applyHeal(h, h, d.heal, d.n, false); else hurt(h, d.per, d.school, d.n);
    }
    h.dots = h.dots.filter((d) => d.left > 0);
  };
  while (t < MAX_TIME) {
    t = Math.round((t + STEP) * 10) / 10;
    if (boss.fury && t >= boss.fury.after) fury = 1 + Math.floor((t - boss.fury.after) / boss.fury.every + 1) * boss.fury.damage;
    if (enrageAt && t >= enrageAt) {
      if (!enraged) { enraged = true; say({ k: 'boss', n: 'Enrage' }); }
      fury = 1 + (Math.floor((t - enrageAt) / 5) + 1) * .15;
    }
    if (boss.air && !landed && !flying()) { landed = true; say({ k: 'boss', n: 'Lands' }); }
    if (boss.weak) { const w = weakNow(); if (w !== weakAt) { weakAt = w; say({ k: 'boss', n: `Weakness: ${w[0].toUpperCase()}${w.slice(1)}` }); } }
    if (tw.pulse && t >= pulseAt) { pulseAt = t + tw.pulse.every; for (const h of alive()) hurt(h, between(tw.pulse.dmg), tw.pulse.school, tw.pulse.n); }
    for (const x of timers) {
      if (x.a.once && x.used) continue;
      if (x.a.below && !x.armed) { if (b.hp / b.max < x.a.below) { x.armed = true; x.next = t; } else continue; }
      if (x.next <= t) { x.next = t + between(x.a.every || [1e9, 1e9]); x.used = true; useAbility(x.a); }
    }
    for (const x of b.ticks) if (x.next <= t && x.until >= t) { x.next = t + x.every; for (const h of pick(x.to)) hurt(h, between(x.dmg), x.school, x.n); }
    b.ticks = b.ticks.filter((x) => x.until >= t);
    for (const x of delayed) if (x.at <= t && !x.done) { x.done = true; if (!x.h.dead) hurt(x.h, between(x.a.dmg), x.a.school, x.a.n); }
    for (const x of burns) if (x.next <= t && x.left > 0) { x.next = t + x.every; x.left--; healer.curMana = Math.max(0, healer.curMana - x.per * SCALE.damage); }
    burns = burns.filter((x) => x.left > 0);
    if (b.swing <= t && (hasBuff('vanish') || (boss.air && flying()))) b.swing = t + .5;
    else if (b.swing <= t) { b.swing = t + boss.melee[2] * SCALE.spike / (buff('speed', 1) * (1 + b.enraged.speed) * (tw.speed || 1)); swingBoss(boss.melee, 'Melee'); }
    for (const a of adds) {
      if (a.hp <= 0) continue;
      if (boss.adds.melee[0] && a.swing <= t) { a.swing = t + boss.adds.melee[2] * SCALE.spike; swingBoss(boss.adds.melee, boss.adds.n); }
      const heals = boss.adds.heals;
      if (heals && a.healAt <= t) { a.healAt = t + heals.every; b.hp = Math.min(b.max, b.hp + heals.amount * SCALE.health * 4); say({ k: 'boss', n: heals.n }); }
    }
    for (const h of party) { dotTick(h); if (!h.dead) emergency(h); }
    for (const o of hots) if (o.next <= t && o.left > 0) { o.next = t + o.every; o.left--; if (!o.to.dead) applyHeal(o.from, o.to, o.per, o.n, false); }
    hots = hots.filter((o) => o.left > 0 && !o.from.dead);
    if (!healer.dead) {
      const sinceCast = t - healer.lastCast, rate = healer.regen * (sinceCast >= 5 ? 1 : healer.castRegen) * (m.regen || 1);
      healer.curMana = Math.min(healer.maxMana, healer.curMana + rate * STEP);
      if (healer.casting && healer.casting.at <= t) {
        const c = healer.casting;
        if (!c.instant && c.s.jumps) {
          const order = alive().sort((x, y) => x.hp / x.max - y.hp / y.max);
          order.slice(0, 3).forEach((x, i) => { const { value, crit } = healAmount(healer, c.s); applyHeal(healer, x, value * c.s.jumps[i], c.s.n, crit); });
        } else if (!c.instant && !c.target.dead) {
          const { value, crit } = healAmount(healer, c.s);
          applyHeal(healer, c.target, value, c.s.n, crit);
          if (healer.k.splash) for (const x of alive()) if (x !== c.target) applyHeal(healer, x, value * healer.k.splash, 'Holy Light', false);
        }
        healer.casting = null;
      }
      think(healer);
    }
    damageHero(tank);
    damageHero(dps);
    if (Math.round(t * 10) % 5 === 0) frames.push({ t, boss: b.hp / b.max, shield: b.shield, adds: adds.filter((a) => a.hp > 0).length, score: Math.round(score), party: party.map((h) => [Math.max(0, Math.round(h.hp)), Math.round(h.max), h.maxMana ? Math.round(h.curMana) : 0]) });
    if (dps.dead && (tank.dead || healer.dead) || !alive().length) break;
    if (!boss.endless && b.hp <= 0) break;
  }
  const won = !boss.endless && b.hp <= 0;
  const totals = party.map((h) => ({ role: h.role, cls: h.cls, dead: h.dead, killedBy: h.killedBy, took: Math.round(h.took), maxHit: Math.round(h.maxHit), dealt: Math.round(h.dealt), healed: Math.round(h.healed), overheal: Math.round(h.overheal), oomAt: h.oomAt, mana: Math.round(h.curMana) }));
  return { boss: boss.id, won, enraged, time: t, score: Math.round(score), health: Math.max(0, b.hp / b.max), events, frames, totals };
}

export function explain(result) {
  const s = (x) => Math.round(x / Math.max(result.time, 1));
  const [tank, healer, dps] = result.totals, dead = result.totals.filter((h) => h.dead);
  const tanked = `Your tank took ${s(tank.took).toLocaleString('en-US')} damage a second and your healer restored ${s(healer.healed).toLocaleString('en-US')}.`;
  if (result.won) return `Killed in ${Math.round(result.time)} seconds. ${tanked}`;
  const first = dead[0];
  if (result.enraged) return `Your party was too slow and the boss enraged. ${tanked}`;
  if (healer.oomAt) return `Your healer ran out of mana after ${Math.round(healer.oomAt)} seconds. ${tanked}`;
  if (first) return `Your ${first.role === 'heal' ? 'healer' : first.role === 'tank' ? 'tank' : 'damage dealer'} fell to ${first.killedBy}. ${tanked}`;
  return `Your party ran out of time. Damage dealt: ${(dps.dealt + tank.dealt).toLocaleString('en-US')}.`;
}
