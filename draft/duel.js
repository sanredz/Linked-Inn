import * as C from './core.js?v=20261125170451';
import { PLANS, fight as duelFight } from '../pvp/engine.js';
import { askName, heroName, nameOk } from '../pvp/name.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const SEEN = 'duelSeen', LAST = 'duelLast';
const MODES = {
  dps: { name: 'DPS check', icon: 'assets/icons/135358.png', line: 'Same class, same first spin. Highest DPS wins.' },
  duel: { name: 'Arena duel', icon: 'assets/icons/132349.png', line: 'Any class, same seed. Your heroes fight it out.' },
};
const QUALITY = { 2: '#1eff00', 3: '#0070dd', 4: '#a335ee', 5: '#ff8000' };
let lib, row, box, ring = null, mine = [], stats = null, pickMode = 'dps', pickCls = 'MAGE', current = null, busy = false;

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const link = (id) => `${location.origin}${location.pathname}#duel=${id}`;
const classIcon = (c) => `<img class="dcls" src="assets/classes/${c}.png" alt="${C.CLASS_NAME[c]}" title="${C.CLASS_NAME[c]}">`;
const itemOf = (id) => lib.pool().items[id];

async function api(path, body = {}) {
  const r = await fetch(lib.API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: lib.key(), ...body }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error || 'server'), { code: d.error || 'server' });
  return d;
}

export function mountDuel(host, opts) {
  lib = opts;
  row = host;
  ({ pickMode = 'dps', pickCls = 'MAGE' } = read(LAST, {}));
  if (!C.BUILDS[pickCls]) pickCls = 'MAGE';
  drawRow();
  refreshMine();
}

export async function refreshMine() {
  try { ({ duels: mine = [], stats = null } = await api('/duel/mine')); } catch { mine = []; stats = null; }
  drawRow();
}

function badge() {
  const seen = read(SEEN, []), turn = mine.filter((d) => d.state === 'yours').length, fresh = mine.filter((d) => d.state === 'done' && d.role === 'a' && !seen.includes(d.id)).length;
  if (fresh) return `<em class="dbadge hot">${fresh === 1 ? 'New result' : `${fresh} new results`}</em>`;
  if (turn) return `<em class="dbadge hot">Your turn</em>`;
  const wait = mine.filter((d) => d.state === 'waiting').length;
  return wait ? `<em class="dbadge">${wait} waiting</em>` : '';
}

function drawRow() {
  if (!row) return;
  row.innerHTML = `<button class="duelrow" type="button"><span class="demb"><img src="assets/icons/132147.png" alt=""></span><span class="dsay"><b>Challenge a friend</b><small>Same spins, your choices. Send a link and see who drafts better.</small></span>${badge()}<i class="dgo" aria-hidden="true">&rsaquo;</i></button>`;
  row.querySelector('.duelrow').onclick = () => openSheet();
}

function overlay(html, klass = '') {
  close();
  box = document.createElement('div');
  box.className = `duelover ${klass}`;
  box.innerHTML = `<div class="duelbox" role="dialog" aria-modal="true"><button class="dx" type="button" aria-label="Close">&times;</button>${html}</div>`;
  box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('.dx')) { close(); if (current && current.home) lib.home(); } });
  document.body.append(box);
  requestAnimationFrame(() => box.classList.add('in'));
  return box.querySelector('.duelbox');
}

function close() {
  if (!box) return;
  const b = box;
  box = null;
  b.classList.remove('in');
  setTimeout(() => b.remove(), 220);
}

const ago = (t) => { const m = Math.max(0, (Date.now() - t) / 60000); return m < 60 ? `${Math.max(1, Math.round(m))}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };
const tag = (d) => (d.state === 'done' ? (d.won > 0 ? 'Won' : d.won < 0 ? 'Lost' : 'Draw') : d.state === 'yours' ? 'Play' : 'Share');
const rowHtml = (d, extra = '') => `<li class="${extra}"><button type="button" data-open="${d.id}" class="${d.state} ${d.won > 0 ? 'won' : d.won < 0 ? 'lost' : d.won === 0 ? 'draw' : ''}"><img src="${MODES[d.mode].icon}" alt="" class="dmi ${d.mode}"><span>${d.state === 'waiting' ? `<b>${MODES[d.mode].name}${d.cls ? ` · ${C.CLASS_NAME[d.cls]}` : ''}</b><small>Sent ${ago(d.at)}</small>` : `<b>vs ${esc(d.them || 'Unnamed')}</b><small>${MODES[d.mode].name}${d.cls ? ` · ${C.CLASS_NAME[d.cls]}` : ''} · ${ago(d.at)}</small>`}</span><em>${tag(d)}</em></button></li>`;
const RECENT = 5;
function recordHtml() {
  const n = stats ? stats.w + stats.l + stats.d : 0;
  if (!n) return '';
  const pct = Math.round((stats.w / n) * 100), r = stats.rival;
  return `<div class="drec"><div class="drecn"><small>Record</small><b><i class="w">${stats.w}</i>–<i class="l">${stats.l}</i>${stats.d ? `<s>${stats.d} draw${stats.d > 1 ? 's' : ''}</s>` : ''}</b></div><div class="drecbar" style="--w:${(stats.w / n) * 100}%;--d:${(stats.d / n) * 100}%" title="${pct}% won"></div><small class="drecp">${pct}% won${r ? ` · Rival <b>${esc(r.name)}</b> ${r.w}–${r.l}` : ''}</small></div>`;
}
function listHtml() {
  const turn = mine.filter((d) => d.state === 'yours'), wait = mine.filter((d) => d.state === 'waiting'), done = mine.filter((d) => d.state === 'done');
  const part = (title, rows, more = false) => (rows.length ? `<h4 class="dsub">${title}${rows.length > 1 && !more ? ` <span>${rows.length}</span>` : ''}</h4><ul class="dlist">${rows.map((d, i) => rowHtml(d, more && i >= RECENT ? 'dextra' : '')).join('')}</ul>${more && rows.length > RECENT ? `<button type="button" class="dmore">Show ${rows.length - RECENT} more</button>` : ''}` : '');
  return recordHtml() + part('Your turn', turn) + part('Waiting on them', wait) + part('Recent', done, true);
}

function openSheet() {
  current = null;
  const el = overlay(`<small class="dkick">Challenge</small><h2>Challenge a friend</h2><p class="dlead">You draft first, then send a link. They get the same first spin, and nobody sees your result until they finish.</p>
    <div class="dmodes" role="radiogroup">${Object.entries(MODES).map(([id, m]) => `<button type="button" role="radio" data-mode="${id}" aria-checked="${id === pickMode}" class="${id === pickMode ? 'on' : ''}"><img src="${m.icon}" alt="" class="dmi ${id}"><b>${m.name}</b><small>${m.line}</small></button>`).join('')}</div>
    <div class="dclsrow"><small class="dclslab"></small><div class="dclasses">${Object.keys(C.BUILDS).map((c) => `<button type="button" data-cls="${c}" style="--cc:${C.CLASS_COLOR[c]}" aria-label="${C.CLASS_NAME[c]}">${classIcon(c)}</button>`).join('')}</div></div>
    <button class="rforge dstart" type="button"><span></span></button><p class="dmsg" role="status"></p>${listHtml()}`, 'sheet');
  const paint = () => {
    for (const b of el.querySelectorAll('[data-mode]')) { b.classList.toggle('on', b.dataset.mode === pickMode); b.setAttribute('aria-checked', b.dataset.mode === pickMode); }
    for (const b of el.querySelectorAll('[data-cls]')) b.classList.toggle('on', b.dataset.cls === pickCls);
    el.querySelector('.dclslab').textContent = pickMode === 'dps' ? 'Class for both of you' : 'Your class (they pick their own)';
    el.querySelector('.dstart span').textContent = `Draft a ${C.CLASS_NAME[pickCls]}`;
  };
  for (const b of el.querySelectorAll('[data-mode]')) b.onclick = () => { pickMode = b.dataset.mode; write(LAST, { pickMode, pickCls }); paint(); };
  for (const b of el.querySelectorAll('[data-cls]')) b.onclick = () => { pickCls = b.dataset.cls; write(LAST, { pickMode, pickCls }); paint(); };
  for (const b of el.querySelectorAll('[data-open]')) b.onclick = () => open(b.dataset.open);
  const more = el.querySelector('.dmore');
  if (more) more.onclick = () => { more.closest('.duelbox').classList.add('dall'); more.remove(); };
  el.querySelector('.dstart').onclick = () => create(pickMode, pickCls, el.querySelector('.dmsg'));
  paint();
}

async function create(mode, cls, msg) {
  if (busy) return;
  if (!nameOk() && !(await askName())) return;
  busy = true;
  if (msg) msg.textContent = 'Setting the table...';
  try {
    const d = await api('/duel/new', { mode, cls });
    close();
    current = { ...d, mode, myCls: cls, role: 'a' };
    lib.draft(current, cls);
  } catch (e) {
    if (msg) msg.textContent = e.code === 'slow' ? 'That is a lot of challenges. Try again in a while.' : 'The Inn could not be reached. Try again.';
  }
  busy = false;
}

export async function open(id) {
  const el = overlay('<p class="dwait">Reading the challenge...</p>', 'invite');
  let d;
  try { d = await api('/duel/get', { id }); } catch (e) {
    el.innerHTML = `<button class="dx" type="button" aria-label="Close">&times;</button><small class="dkick">Challenge</small><h2>${e.code === 'gone' ? 'No such challenge' : 'Could not reach the Inn'}</h2><p class="dlead">${e.code === 'gone' ? 'This link does not lead anywhere. Ask your friend to send it again.' : 'Try again in a moment.'}</p>`;
    return;
  }
  current = d;
  if (d.state === 'done') return reveal(d);
  if (d.state === 'waiting') return waiting(d);
  if (d.state === 'new') {
    el.innerHTML = `<button class="dx" type="button" aria-label="Close">&times;</button><small class="dkick">Challenge</small><h2>Not ready yet</h2><p class="dlead">${d.role === 'a' ? 'You have not finished your own draft for this one.' : 'Your friend has not finished drafting yet. Open the link again once they have.'}</p>`;
    return;
  }
  if (d.state === 'taken') {
    el.innerHTML = `<button class="dx" type="button" aria-label="Close">&times;</button><small class="dkick">Challenge</small><h2>Already answered</h2><p class="dlead">Someone else has taken ${esc(d.from)}'s challenge. Ask for a new link, or send one yourself.</p><button class="rforge" type="button" data-mine><span>Challenge a friend</span></button>`;
    el.querySelector('[data-mine]').onclick = () => openSheet();
    return;
  }
  invite(d);
}

function invite(d) {
  const m = MODES[d.mode];
  let cls = d.mode === 'dps' ? d.cls : (C.BUILDS[pickCls] ? pickCls : 'WARRIOR');
  const el = overlay(`<div class="dinv"><span class="demb big"><img src="assets/icons/132147.png" alt=""></span><small class="dkick">${esc(m.name)}</small><h2><span>${esc(d.from)}</span> challenges you</h2><p class="dlead">${d.mode === 'dps' ? `Draft a ${C.CLASS_NAME[d.cls]} from the same first spin. Whoever does more damage wins.` : 'Draft any class from the same seed and pick a tactic. Then your heroes fight.'}</p>
    ${d.mode === 'dps' ? `<div class="dfixed" style="--cc:${C.CLASS_COLOR[d.cls]}">${classIcon(d.cls)}<b>${C.CLASS_NAME[d.cls]}</b></div>` : `<div class="dclsrow"><small class="dclslab">Your class</small><div class="dclasses">${Object.keys(C.BUILDS).map((c) => `<button type="button" data-cls="${c}" style="--cc:${C.CLASS_COLOR[c]}" aria-label="${C.CLASS_NAME[c]}">${classIcon(c)}</button>`).join('')}</div></div>`}
    <button class="rforge dstart" type="button"><span></span></button><p class="dmsg" role="status"></p><small class="dfine">${d.state === 'yours' ? 'You accepted this one. Your draft starts over from the same spin.' : 'Accepting holds it for you for an hour.'}</small></div>`, 'invite');
  const paint = () => {
    for (const b of el.querySelectorAll('[data-cls]')) b.classList.toggle('on', b.dataset.cls === cls);
    el.querySelector('.dstart span').textContent = `${d.state === 'yours' ? 'Draft' : 'Accept and draft'} a ${C.CLASS_NAME[cls]}`;
  };
  for (const b of el.querySelectorAll('[data-cls]')) b.onclick = () => { cls = b.dataset.cls; paint(); };
  el.querySelector('.dstart').onclick = async () => {
    if (busy) return;
    if (!nameOk() && !(await askName())) return;
    busy = true;
    try {
      const t = d.state === 'yours' ? d : await api('/duel/take', { id: d.id });
      close();
      current = { ...t, myCls: cls };
      lib.draft(current, cls);
    } catch (e) {
      el.querySelector('.dmsg').textContent = e.code === 'taken' ? 'Someone else just took it.' : e.code === 'waiting' ? 'You cannot answer your own challenge.' : 'The Inn could not be reached. Try again.';
    }
    busy = false;
  };
  paint();
}

export const active = () => current;
export const tactics = (cls) => Object.entries(PLANS[cls]).map(([id, p]) => ({ id, ...p }));

export async function submit({ cls, moves, build, plan }) {
  const d = current;
  const el = overlay('<p class="dwait">Sealing your draft...</p>', 'sent');
  current = { ...d, home: true };
  let r;
  try { r = await api('/duel/play', { id: d.id, cls, moves, build, plan, name: nameOk() ? heroName() : '' }); } catch (e) {
    el.innerHTML = `<button class="dx" type="button" aria-label="Close">&times;</button><small class="dkick">Challenge</small><h2>Not saved</h2><p class="dlead">${e.code === 'taken' ? 'Your hold on this challenge ran out and someone else answered it.' : e.code === 'run' ? 'This page is out of date. Press Ctrl+F5 and try again.' : ['waiting', 'done', 'open'].includes(e.code) ? 'This challenge already has your draft.' : 'The Inn could not be reached, so this draft was not saved.'}</p>`;
    return;
  }
  current = { ...r, home: true };
  refreshMine();
  if (r.state === 'done') return reveal(r, true);
  waiting(r);
}

function waiting(d) {
  const share = link(d.id), me = d.a;
  current = { ...d, home: current && current.home };
  const el = overlay(`<div class="dinv"><span class="demb big"><img src="assets/icons/132147.png" alt=""></span><small class="dkick">${MODES[d.mode].name}${d.cls ? ` · ${C.CLASS_NAME[d.cls]}` : ''}</small><h2>Your challenge is ready</h2>
    <p class="dlead">${me && d.mode === 'dps' ? `You set <b>${me.score.toFixed(1)} DPS</b>. ` : me ? `${C.CLASS_NAME[me.cls]}, ${esc(PLANS[me.cls][me.plan].label)}. ` : ''}Send this link to a friend. They will not see your result until they have drafted.</p>
    <div class="dlink"><code>${esc(share.replace(/^https?:\/\//, ''))}</code><button class="spec" type="button" data-copy>Copy</button></div>
    ${navigator.share ? '<button class="rforge" type="button" data-share><span>Share the link</span></button>' : ''}<small class="dfine">Anyone with the link can answer. You will see the result here and on the home page.</small></div>`, 'sent');
  el.querySelector('[data-copy]').onclick = async (e) => { try { await navigator.clipboard.writeText(share); e.target.textContent = 'Copied'; } catch { e.target.textContent = 'Copy failed'; } setTimeout(() => { e.target.textContent = 'Copy'; }, 1600); };
  const sh = el.querySelector('[data-share]');
  if (sh) sh.onclick = () => navigator.share({ title: 'A challenge at the Inn', text: `${MODES[d.mode].name}: can you out-draft me?`, url: share }).catch(() => {});
}

function splitHtml(d, me) {
  const sides = [d.a, d.b], mineSide = sides[me], them = sides[1 - me], pool = lib.pool();
  const gearRow = (s) => s.moves.filter((m) => m !== '!').map((m) => { const slot = String(m).split('>').pop(), id = s.picks[slot]; const it = id && itemOf(id); return it ? `<img src="assets/icons/${it[4]}.png" alt="${esc(it[0])}" title="${esc(it[0])}" style="--q:${QUALITY[it[1]] || '#888'}">` : ''; }).join('');
  let head = '';
  if (d.mode === 'dps') {
    const n = Math.min(mineSide.moves.length, them.moves.length);
    let i = 0;
    while (i < n && mineSide.moves[i] === them.moves[i]) i++;
    const kept = (s) => {
      const m = s.moves[i];
      if (m === undefined) return '<i>nothing</i>';
      if (m === '!') return '<i>a mulligan</i>';
      const r = C.replay(pool, d.seed, s.cls, s.moves, true), [offer] = r.log[i], [slot] = String(m).split('>'), it = itemOf(offer[slot]);
      return it ? `<span class="dit"><img src="assets/icons/${it[4]}.png" alt=""><b style="color:${QUALITY[it[1]] || '#ddd'}">${esc(it[0])}</b></span>` : '<i>an item</i>';
    };
    head = i >= n ? '<p class="dsplitlead">You drafted the exact same gear.</p>' : `<p class="dsplitlead">${i ? `Same first ${i === 1 ? 'pick' : `${i} picks`}, then you split in round ${i + 1}.` : 'You split on the very first pick.'}</p><div class="dfork"><div><small>You kept</small>${kept(mineSide)}</div><div><small>${esc(them.name)} kept</small>${kept(them)}</div></div>`;
  }
  return `<div class="dsplit"><h4 class="dsub">${d.mode === 'dps' ? 'Where you split' : 'What you each drafted'}</h4>${head}<div class="dgear"><small>You</small><div>${gearRow(mineSide)}</div></div><div class="dgear"><small>${esc(them.name)}</small><div>${gearRow(them)}</div></div></div>`;
}

function verdict(d, me) {
  if (d.winner === -1) return ['Dead even', 'draw'];
  if (me === null) return [`${esc([d.a, d.b][d.winner].name)} wins`, 'win'];
  return d.winner === me ? ['Victory', 'win'] : ['Defeat', 'lose'];
}

async function reveal(d, fresh) {
  const seen = read(SEEN, []);
  if (!seen.includes(d.id)) write(SEEN, [...seen, d.id].slice(-60));
  drawRow();
  const me = d.role === 'a' ? 0 : d.role === 'b' ? 1 : null, view = me === null ? 0 : me, sides = [d.a, d.b];
  let fightInfo = null;
  if (d.mode === 'duel') fightInfo = await watchDuel(d, fresh);
  const [title, tone] = verdict(d, me);
  const L = sides[view], R = sides[1 - view], who = (s, i) => (me === null ? esc(s.name) : i === me ? 'You' : esc(s.name));
  const sideHtml = (s, i) => `<div class="dside ${d.winner === i ? 'win' : ''}" style="--cc:${C.CLASS_COLOR[s.cls]}"><span class="dport"><img src="assets/classes/${s.cls}.png" alt=""></span><b>${who(s, i)}</b><small>${d.mode === 'dps' ? esc(C.BUILDS[s.cls].find((x) => x.id === s.build)?.name || '') : `${C.CLASS_NAME[s.cls]} · ${esc(PLANS[s.cls][s.plan].label)}`}</small>${d.mode === 'dps' ? `<span class="dnum" data-to="${s.score}">0.0</span><small class="dunit">DPS</small><i class="dbar"><i data-w="${(100 * s.score) / Math.max(d.a.score, d.b.score, 1)}"></i></i>` : fightInfo ? `<span class="dnum small">${Math.round(fightInfo.dealt[i]).toLocaleString('en-US')}</span><small class="dunit">damage dealt</small>` : ''}</div>`;
  const rec = d.record && me !== null ? `<p class="drec">Your record against ${esc(R.name)}: <b>${d.record.w}</b> – <b>${d.record.l}</b></p>` : '';
  const el = overlay(`<small class="dkick">${MODES[d.mode].name}${d.cls ? ` · ${C.CLASS_NAME[d.cls]}` : ''}</small><h2 class="dverdict ${tone}">${title}</h2>${fightInfo ? `<p class="dlead">${fightInfo.time.toFixed(0)} seconds in the ring.</p>` : ''}
    <div class="dvs">${sideHtml(L, view)}<em>vs</em>${sideHtml(R, 1 - view)}</div>${rec}${me !== null ? splitHtml(d, me) : ''}
    <div class="dacts">${d.mode === 'duel' ? '<button class="spec" type="button" data-rewatch>Watch again</button>' : ''}${me !== null ? '<button class="rforge" type="button" data-rematch><span>Rematch</span></button>' : ''}<button class="spec" type="button" data-done>Done</button></div>`, `result ${tone}`);
  current = { ...d, home: current && current.home };
  el.querySelector('[data-done]').onclick = () => { close(); if (current && current.home) lib.home(); };
  const rm = el.querySelector('[data-rematch]');
  if (rm) rm.onclick = () => create(d.mode, d.mode === 'dps' ? d.cls : sides[me].cls, el.querySelector('.drec') || null);
  const rw = el.querySelector('[data-rewatch]');
  if (rw) rw.onclick = () => reveal(d, true);
  for (const n of el.querySelectorAll('.dnum[data-to]')) {
    const to = +n.dataset.to, start = performance.now(), dur = calm ? 1 : 1800;
    const tick = () => { const p = Math.min(1, (performance.now() - start) / dur), e = 1 - Math.pow(1 - p, 3); n.textContent = (to * e).toFixed(1); if (p < 1) requestAnimationFrame(tick); else el.querySelector('.dvs').classList.add('landed'); };
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(() => { for (const b of el.querySelectorAll('.dbar i[data-w]')) b.style.width = `${b.dataset.w}%`; });
}

async function watchDuel(d, show) {
  const { sideOf } = await import('../pvp/run.js'), { references } = await import('../pvp/gear.js');
  const pool = lib.pool(), REF = (lib.ref ||= references(pool)), snap = (s) => ({ cls: s.cls, plan: s.plan, picks: s.picks, enchants: {}, consumes: [], boons: [] });
  const rec = { events: [], frames: [] }, x = duelFight(sideOf(pool, snap(d.a), REF), sideOf(pool, snap(d.b), REF), d.fseed, rec);
  const info = { time: x.time, dealt: [x.a.dealt, x.b.dealt] };
  if (!show) return info;
  const [{ Arena, THEMES }, { FightHud, classColor }] = await Promise.all([import('../pvp/arena.js'), import('../pvp/hud.js')]);
  const el = overlay('<div class="dstage"></div><div class="dfoot"><button class="spec" type="button" data-skip>Skip to the result</button></div>', 'fight');
  if (!ring) {
    const scene = document.createElement('div');
    scene.className = 'gscene';
    el.querySelector('.dstage').append(scene);
    const arena = new Arena(scene, lib.gear(), pool);
    await arena.init();
    ring = { scene, arena, hud: new FightHud(scene) };
  } else {
    el.querySelector('.dstage').append(ring.scene);
    ring.arena.stageA.resume();
    dispatchEvent(new Event('resize'));
  }
  const { scene, arena, hud } = ring, names = [d.a.name, d.b.name];
  arena.theme(THEMES[parseInt(d.id, 36) % THEMES.length]);
  const hid = hud.intro({ name: names[0], sub: C.CLASS_NAME[d.a.cls], color: classColor(d.a.cls), portrait: `assets/classes/${d.a.cls}.png` }, { name: names[1], sub: C.CLASS_NAME[d.b.cls], color: classColor(d.b.cls), portrait: `assets/classes/${d.b.cls}.png` }, MODES.duel.name);
  scene.classList.add('dressing');
  await arena.stageFight([snap(d.a), snap(d.b)], names).catch(() => {});
  scene.classList.remove('dressing');
  await hud.countdown(hid, 1400);
  await new Promise((done) => {
    let over = false;
    const end = () => { if (over) return; over = true; hud.end(); setTimeout(done, calm ? 0 : 1400); };
    arena.play(rec, x, { onLine: (e) => { hud.speed = arena.speed; hud.event(e, arena.playing && arena.playing.t >= 1e4); }, onEnd: end });
    hud.play(arena, rec);
    el.querySelector('[data-skip]').onclick = () => { arena.skip(); };
  });
  try { hud.clear(); arena.stageA.pause(); } catch {}
  return info;
}
