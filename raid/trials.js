import { newRun, offers, pick, mulligan, remaining, finished, simulate, hash, rng, BUILDS, candidates } from '../draft/core.js?v=20261127183000';

export const TRIALS = [
  { id: 'seradane', rule: 'veil', name: 'The Veiled Dream', short: 'Veiled', icon: 132123, times: 2, text: 'Every item on offer is hidden in mist. You see only its slot and its rarity until you keep it.' },
  { id: 'bough', rule: 'grow', name: 'Overgrowth', short: 'Overgrowth', icon: 136074, times: 2, text: 'Each time you keep an item, the Dream grows one of the other items on offer into your hero. Wither the ones you do not want it to choose.' },
  { id: 'shadow', rule: 'fade', name: 'Fading Paths', short: 'Fading', icon: 136041, times: 2, text: 'Only three slots are on offer each round, the rest are lost in the fog. Reach into the mist to take a random item you cannot see, or light one of your three lanterns to see every slot for a round.' },
  { id: 'twilight', rule: 'duel', name: 'The Shade Takes First', short: 'The Shade', icon: 136223, times: 1, text: 'A Shade of the Nightmare drafts a hero of your class from the same offers, and it always chooses first. When both heroes are done, they fight for the Dream. Out-damage the Shade to wake the last tree.' },
];
export const TRIAL = Object.fromEntries(TRIALS.map((t) => [t.id, t]));
export const MARKS = { seradane: { WARRIOR: 248, PALADIN: 206, HUNTER: 240, ROGUE: 255, PRIEST: 357, SHAMAN: 259, MAGE: 382, WARLOCK: 345, DRUID: 227 }, bough: { WARRIOR: 228, PALADIN: 198, HUNTER: 236, ROGUE: 242, PRIEST: 346, SHAMAN: 246, MAGE: 366, WARLOCK: 329, DRUID: 224 }, shadow: { WARRIOR: 229, PALADIN: 208, HUNTER: 243, ROGUE: 248, PRIEST: 356, SHAMAN: 250, MAGE: 387, WARLOCK: 347, DRUID: 229 } };
export const SHADE_MIGHT = 1;
export const CLASSES = Object.keys(BUILDS);
export const classOf = (seed) => CLASSES[(rng(hash(seed, 'dreamcls'))() * CLASSES.length) | 0];

export function trialRun(seed, cls, tree, rule = TRIAL[tree] && TRIAL[tree].rule) {
  const run = newRun(seed, cls, `dream:${tree}`);
  run.tree = tree;
  run.rule = rule;
  run.mine = [];
  if (run.rule === 'fade') { run.lanterns = 3; run.lit = -1; }
  if (run.rule === 'veil') { run.redreams = 3; run.lastPick = ''; }
  if (run.rule === 'duel') {
    run.shade = newRun(hash(seed, 'shade') >>> 0, cls, 'dream:shade');
    const builds = BUILDS[cls];
    run.shade.build = builds[(rng(hash(seed, 'shadebuild'))() * builds.length) | 0].id;
  }
  return run;
}

const two = (pool, id) => !!(id && pool.items[id][3] === 17);
const place = (pool, picks, slot, id) => { const p = { ...picks, [slot]: id }; if (slot === 'main' && two(pool, id)) p.off = 0; return p; };
const worthOf = (pool, sh, picks) => Math.max(...BUILDS[sh.cls].map((b) => simulate(pool, sh.cls, b.id, picks, sh.seed, 2, false).dps));
const TWIN = { finger1: 'finger2', finger2: 'finger1', trinket1: 'trinket2', trinket2: 'trinket1' };
const into = (sh, s) => (s in sh.picks && TWIN[s] && !(TWIN[s] in sh.picks) ? TWIN[s] : s);
const gain = (pool, sh, slot, id) => worthOf(pool, sh, place(pool, sh.picks, into(sh, slot), id));
const shadeBestOf = (pool, sh, cands) => {
  const top = Math.max(...cands.map(([, id]) => pool.items[id][1]));
  let best = -1, at = null;
  for (const [s, id] of cands) { if (pool.items[id][1] < top) continue; const v = gain(pool, sh, s, id); if (v > best) { best = v; at = s; } }
  return at;
};

function remake(pool, sh, id, round) {
  const empty = remaining(sh);
  if (!empty.length) return null;
  const to = empty[Math.floor(rng(hash(sh.seed, 'remake', round))() * empty.length)], held = new Set(Object.values(sh.picks)), [, q, lvl] = pool.items[id];
  let best = 0, score = Infinity;
  for (const i of Object.values(candidates(pool, sh.cls, to, sh.picks)).flat()) { if (held.has(i)) continue; const x = pool.items[i], v = Math.abs(x[1] - q) * 1000 + Math.abs(x[2] - lvl); if (v < score) { score = v; best = i; } }
  return best ? { to, put: best } : null;
}

function shadeChoice(pool, run, all) {
  const sh = run.shade, key = `${run.round}|${Object.keys(run.picks).length}`;
  if (run.shadeKey === key) return run.shadeTake;
  const fits = (s) => !(s === 'off' && two(pool, sh.picks.main)), open = remaining(run).filter((s) => all[s] && fits(s));
  let take = null;
  if (open.length > 1) {
    const plan = (s) => { const to = into(sh, s); if (!(to in sh.picks)) return { to, put: all[s], keep: 1 }; const r = remake(pool, sh, all[s], run.round); return r ? { ...r, keep: 1, remade: 1 } : { to, put: all[s], keep: 0 }; };
    const top = Math.max(...open.map((s) => pool.items[all[s]][1]));
    let best = -1;
    for (const s of open) {
      if (pool.items[all[s]][1] < top) continue;
      const p = plan(s), v = worthOf(pool, sh, place(pool, sh.picks, p.to, p.put));
      if (v > best) { best = v; take = { slot: s, id: all[s], ...p }; }
    }
    if (!take.keep && best > worthOf(pool, sh, sh.picks)) take.keep = 1;
  }
  run.shadeKey = key;
  run.shadeTake = take;
  return take;
}

function shadeKeep(pool, sh, take) {
  if (!take.keep) return;
  sh.picks = place(pool, sh.picks, take.to, take.put);
}

function shadeOwn(pool, sh) {
  if (finished(sh)) return;
  const o = offers(pool, sh), open = remaining(sh).filter((s) => o[s]);
  if (!open.length) { for (const s of remaining(sh)) sh.picks[s] = 0; return; }
  pick(pool, sh, shadeBestOf(pool, sh, open.map((s) => [s, o[s]])));
}

export function view(pool, run) {
  const all = offers(pool, run), open = remaining(run).filter((s) => all[s]), out = {};
  if (run.rule === 'fade' && run.lit !== run.round) {
    const r = rng(hash(run.seed, 'fade', run.round)), order = open.map((s) => [s, r()]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([s]) => s);
    for (const s of open) out[s] = order.includes(s) ? all[s] : 0;
    return { offer: out, stolen: '' };
  }
  if (run.rule === 'duel') {
    const t = shadeChoice(pool, run, all);
    for (const s of open) out[s] = t && t.slot === s ? 0 : all[s];
    return { offer: out, stolen: t ? t.slot : '', took: t ? t.id : 0, keep: t ? t.keep : 0, to: t ? t.to : '', put: t ? t.put : 0, remade: t ? t.remade || 0 : 0 };
  }
  for (const s of open) out[s] = all[s];
  return { offer: out, stolen: '' };
}

export function fogOf(pool, run) {
  if (run.rule !== 'fade' || run.lit === run.round || finished(run)) return [];
  const v = view(pool, run).offer, all = offers(pool, run);
  return remaining(run).filter((s) => all[s] && !v[s]).map((s) => ({ slot: s, q: pool.items[all[s]][1] }));
}

export function reachSlot(pool, run) {
  if (run.rule !== 'fade' || run.lit === run.round || finished(run)) return '';
  const fog = fogOf(pool, run);
  if (!fog.length) return '';
  const r = rng(hash(run.seed, 'reach', run.round)), legend = fog.filter((s) => s.q === 5), rest = fog.filter((s) => s.q !== 5);
  const from = legend.length && (!rest.length || r() < .5) ? legend : rest;
  return from[Math.floor(r() * from.length)].slot;
}

export const withersFor = (pool, run) => { if (run.rule !== 'grow') return 0; const all = offers(pool, run), n = remaining(run).filter((s) => all[s]).length; return n >= 10 ? 3 : n >= 7 ? 2 : n >= 4 ? 1 : 0; };

export function grownSlot(pool, run, before, gone = []) {
  if (run.rule !== 'grow' || finished(run)) return '';
  const two = (s) => s === 'main' && pool.items[before[s]][3] === 17 && run.picks.off;
  const open = remaining(run).filter((s) => before[s] && !gone.includes(s) && !two(s));
  if (!open.length) return '';
  return open[Math.floor(rng(hash(run.seed, 'grow', run.round))() * open.length)];
}

export function redreamOf(pool, run) {
  const slot = run.lastPick, id = slot && run.picks[slot];
  if (run.rule !== 'veil' || !run.redreams || !id) return null;
  const cur = pool.items[id], two = (i) => pool.items[i][3] === 17, held = new Set(Object.entries(run.picks).filter(([s, i]) => i && s !== slot).map(([, i]) => pool.items[i][0]));
  const list = Object.values(candidates(pool, run.cls, slot, { ...run.picks, [slot]: undefined })).flat().filter((i) => i !== id && pool.items[i] && !held.has(pool.items[i][0]) && (slot !== 'main' || two(i) === two(id)));
  if (!list.length) return null;
  const up = list.filter((i) => pool.items[i][2] >= cur[2]), from = up.length ? up : [list.reduce((m, i) => (pool.items[i][2] > pool.items[m][2] ? i : m), list[0])];
  return { slot, from: id, to: from[Math.floor(rng(hash(run.seed, 'redream', slot, run.redreams))() * from.length)] };
}

export function act(pool, run, move) {
  if (move === 'D') {
    const r = redreamOf(pool, run);
    if (!r) throw new Error('bad move');
    run.picks[r.slot] = r.to;
    run.redreams--;
    run.mine.push('D');
    return { took: null, grew: null, redream: r };
  }
  if (move === '!') { mulligan(pool, run); run.mine.push('!'); return { took: null, grew: null }; }
  if (move === 'R') {
    const s = reachSlot(pool, run);
    if (!s) throw new Error('bad move');
    const took = pick(pool, run, s);
    run.mine.push('R');
    return { took, grew: null, reached: s };
  }
  if (move === 'L') { if (run.rule !== 'fade' || !run.lanterns || run.lit === run.round) throw new Error('bad move'); run.lanterns--; run.lit = run.round; run.mine.push('L'); return { took: null, grew: null, lit: 1 }; }
  const [head, burn = ''] = String(move).split('|'), [slot, to = slot] = head.split('>'), gone = burn ? burn.split(',') : [];
  const v = view(pool, run), before = offers(pool, run);
  if (!v.offer[slot] || !remaining(run).includes(to)) throw new Error('bad move');
  if (gone.length && (gone.length > withersFor(pool, run) || new Set(gone).size !== gone.length || gone.some((g) => g === slot || !v.offer[g]))) throw new Error('bad move');
  const shade = run.rule === 'duel' ? run.shadeTake : null;
  const took = pick(pool, run, slot, to);
  run.mine.push(move);
  if (run.rule === 'veil') run.lastPick = to;
  if (run.rule === 'duel') {
    if (shade) shadeKeep(pool, run.shade, shade); else shadeOwn(pool, run.shade);
    if (finished(run)) while (!finished(run.shade)) shadeOwn(pool, run.shade);
  }
  let grew = null;
  const g = grownSlot(pool, run, before, gone);
  if (g) { const id = before[g]; run.picks[g] = id; if (g === 'main' && pool.items[id][3] === 17) run.picks.off = 0; grew = { slot: g, id }; }
  return { took, grew, shade };
}

export function trialReplay(pool, seed, cls, tree, moves, rule) {
  if (!(TRIAL[tree] || rule) || !BUILDS[cls] || !Array.isArray(moves) || moves.length > 24) throw new Error('bad run');
  const run = trialRun(seed, cls, tree, rule);
  for (const m of moves) { if (finished(run) && m !== 'D') throw new Error('bad move'); act(pool, run, m); }
  if (!finished(run)) throw new Error('unfinished');
  return run;
}

export function bestBuild(pool, run, picks = run.picks, seed = run.seed) {
  let best = null;
  for (const b of BUILDS[run.cls]) { const dps = simulate(pool, run.cls, b.id, picks, seed, 12, false).dps; if (!best || dps > best.dps) best = { build: b.id, dps }; }
  return best;
}

export function shadeBest(pool, run) {
  const b = bestBuild(pool, run, run.shade.picks, run.shade.seed);
  return { build: b.build, dps: +(b.dps * SHADE_MIGHT).toFixed(1) };
}

export function judge(pool, run) {
  const me = bestBuild(pool, run);
  if (run.rule !== 'duel') { const mark = markOf(run.tree, run.cls); return { ...me, mark, passed: me.dps >= mark ? 1 : 0 }; }
  const sh = shadeBest(pool, run);
  return { ...me, mark: sh.dps, shade: sh, passed: me.dps > sh.dps ? 1 : 0 };
}

export const markOf = (tree, cls) => (MARKS[tree] && MARKS[tree][cls]) || 0;
