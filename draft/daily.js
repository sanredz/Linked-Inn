import { CLASS_NAME, CLASS_COLOR, BUILDS, SLOTS } from './core.js?v=20261127183000';
import { TWISTS, TWIST, DAILY_EPOCH, dayNow } from '../raid/daily.js?v=20261127183000';
import { titleOf } from './paths.js?v=20261127183000';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const QUALITY = ['#9d9d9d', '#ffffff', '#1eff00', '#0070dd', '#a335ee', '#ff8000'];
const specOf = (cls, b) => (BUILDS[cls].find((x) => x.id === b) || {}).name || '';
const until = (t) => { const m = Math.max(1, Math.ceil((t - Date.now()) / 60000)); return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`; };
const dayNo = (d) => d - DAILY_EPOCH + 1;
const known = () => !!(info && info.you);
const signed = (v) => `${v > 0 ? '+' : v < 0 ? '\u2212' : ''}${Math.abs(v).toFixed(1)}`;
const val = (r) => (r.rule === 'duel' && r.shade != null ? `<b class="${r.score > 0 ? 'up' : 'down'}" title="${r.dps.toFixed(1)} DPS vs the Shade's ${r.shade.toFixed(1)}">${signed(r.score)}</b>` : `<b>${r.dps.toFixed(1)}</b>`);

let lib = null, row = null, info = null, tick = 0, sheet = null, pool = null;

async function api(path, body = {}) {
  const r = await fetch(lib.API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: lib.key(), ...body }) });
  const d = await r.json().catch(() => ({}));
  return r.ok ? d : { ...d, error: d.error || 'down' };
}
const items = () => (pool ||= fetch('draft/pool.json').then((r) => r.json()));

export function mountDaily(host, opts) {
  lib = opts;
  row = host;
  refreshDaily();
  clearInterval(tick);
  tick = setInterval(() => { if (info && Date.now() >= info.next) refreshDaily(); else drawRow(); }, 30000);
}

export async function refreshDaily() {
  const d = await api('/daily/get');
  if (d.error) { if (!info) row.innerHTML = ''; return; }
  const first = !info;
  info = d;
  drawRow();
  if (sheet) drawSheet();
  if (first && location.hash === '#daily') { history.replaceState(null, '', location.pathname + location.search); openSheet(); }
}

const dial = (rule, big) => `<span class="dydial${big ? ' big' : ''}" role="img" aria-label="Today's twist is ${esc(TWIST[rule].name)}, one of ${TWISTS.length} that rotate daily">${TWISTS.map((t) => `<i class="${t.rule === rule ? 'on' : ''}" style="--tw:${t.color}" title="${esc(t.name)}${t.rule === rule ? ' · today' : ''}"><img src="assets/icons/${t.icon}.png" alt="">${big ? `<em>${esc(t.short)}</em>` : ''}</i>`).join('')}</span>`;

function state() {
  const y = info.you;
  if (!y) return { badge: '<em class="dbadge hot">Play</em>', act: 'play' };
  if (y.state === 'live') return { badge: '<em class="dbadge hot">Continue</em>', act: 'play' };
  if (y.state === 'done') return { badge: `<em class="dbadge dyplace">${y.pos === 1 ? '<b>1st</b> today' : `<b>#${y.pos}</b> of ${info.played}`}</em>`, act: 'board' };
  return { badge: '', act: 'board' };
}

function drawRow() {
  if (!info || !row) return;
  const t = TWIST[info.rule], st = state();
  row.innerHTML = `<button type="button" class="dailyrow" style="--tw:${t.color}">
    <span class="dyemb"><img src="assets/icons/${t.icon}.png" alt=""></span>
    <span class="dysay"><small>Daily Draft · Day ${dayNo(info.day)}</small><b>${esc(t.name)}</b><span>${known() ? `<i style="color:${CLASS_COLOR[info.cls]}">${CLASS_NAME[info.cls]}</i> for everyone` : '<i class="dyq">?</i> Hidden class'} · ${info.played} ${info.played === 1 ? 'hero' : 'heroes'} so far</span></span>
    <span class="dyright">${dial(info.rule)}<small>Next twist in ${until(info.next)}</small></span>
    ${st.badge}<em class="dgo">&rsaquo;</em>
  </button>`;
  row.querySelector('.dailyrow').onclick = () => (st.act === 'play' && info.you && !info.test ? play() : openSheet());
}

async function play() {
  const d = info, m = await import('../raid/trialsui.js?v=20261127183000');
  m.openTrial('daily', {
    API: lib.API,
    daily: { day: d.day, rule: d.rule, cls: d.cls, epoch: DAILY_EPOCH, moves: d.you && d.you.moves },
    post: (path, body) => api(path, body),
    name: lib.name,
    after: () => refreshDaily(),
    board: () => { refreshDaily().then(() => openSheet()); },
  });
  closeSheet();
}

function closeSheet() {
  if (!sheet) return;
  const s = sheet;
  sheet = null;
  s.classList.remove('in');
  removeEventListener('keydown', onKey);
  setTimeout(() => s.remove(), 220);
}
const onKey = (e) => { if (e.key === 'Escape') closeSheet(); };

function openSheet() {
  if (sheet) return;
  sheet = document.createElement('div');
  sheet.className = 'duelover dyover';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', 'Daily Draft');
  sheet.dataset.tab = 'today';
  document.body.append(sheet);
  sheet.onclick = (e) => { if (e.target === sheet) closeSheet(); };
  addEventListener('keydown', onKey);
  drawSheet();
  requestAnimationFrame(() => sheet && sheet.classList.add('in'));
}

async function drawSheet() {
  if (!sheet || !info) return;
  const it = (await items()).items, tab = sheet.dataset.tab;
  const t = TWIST[info.rule], y = info.yesterday;
  const gear = (picks) => SLOTS.map(([s]) => picks[s]).filter((id) => id && it[id]).map((id) => `<img src="assets/icons/${it[id][4]}.png" alt="${esc(it[id][0])}" data-item="${id}" style="--q:${QUALITY[it[id][1]]}">`).join('');
  const gears = new Map();
  const line = (r, key) => { gears.set(key, r.picks); return `<li class="${r.mine ? 'me' : ''}" data-row="${key}"><button type="button" aria-expanded="false"><span class="dypos">${r.pos <= 3 ? `<i class="m${r.pos}">${r.pos}</i>` : r.pos}</span><span class="dyname">${esc(r.name)}${titleOf(r.t) ? `<small>${esc(titleOf(r.t))}</small>` : ''}</span><span class="dyspec">${r.rule === 'duel' && r.shade != null ? `${r.dps.toFixed(1)} vs ${r.shade.toFixed(1)}` : known() ? esc(specOf(r.cls, r.build)) : ''}</span>${val(r)}</button></li>`; };
  const board = (rows, me, pre, played) => {
    const inList = rows.find((r) => r.mine);
    if (me) gears.set('me', me.picks);
    const bar = me ? `<button type="button" class="dyme" data-me="${inList ? `${pre}${inList.pos}` : 'me'}" aria-expanded="false"><span class="dymepos"><small>Your place</small><b>#${me.pos}</b></span><span class="dymeof">of ${played} ${played === 1 ? 'hero' : 'heroes'}${me.pos > rows.length ? `<small>Top ${rows.length} shown above</small>` : ''}</span><span class="dyspec">${me.rule === 'duel' && me.shade != null ? `${me.dps.toFixed(1)} vs ${me.shade.toFixed(1)}` : esc(specOf(info.cls, me.build))}</span>${val(me)}</button>` : '';
    return `<div class="dyboard"><ol class="dylist dyscroll">${rows.map((r) => line(r, `${pre}${r.pos}`)).join('')}</ol>${bar}</div>`;
  };
  const you = info.you;
  const cta = !you ? `<button type="button" class="dyplay" data-play>Begin today's draft</button><p class="dyonce">One walk per day. It counts as soon as you begin.</p>` : you.state === 'live' ? '<button type="button" class="dyplay" data-play>Continue your draft</button>' : you.state === 'done' ? `<p class="dyyou">You placed <b>${you.pos === 1 ? 'first' : `#${you.pos}`}</b> with <b>${you.rule === 'duel' && you.shade != null ? `${signed(you.score)}</b> DPS against the Shade` : `${you.dps.toFixed(1)}</b> DPS`}. Come back after the reset for a new twist.</p>` : '';
  const today = `<div class="dyhero" style="--tw:${t.color}">
      ${dial(info.rule, true)}${info.test ? '<p class="dytest">Preview only: tap any twist to start it fresh, even mid-walk.</p>' : ''}
      <h2>${esc(t.name)}</h2>
      <p class="dyrule">${esc(t.text)}</p>
      <p class="dymeta">${known() ? `<span style="--cc:${CLASS_COLOR[info.cls]}"><img src="assets/classes/${info.cls}.png" alt="">${CLASS_NAME[info.cls]} for everyone</span>` : '<span class="dyhid"><i class="dyq">?</i>The Dream picks the class when you begin</span>'}<span>Same offers for every hero</span><span>Next twist in ${until(info.next)}</span></p>
      ${cta}
    </div>
    <h4 class="dyh">Today's heroes<small>${info.played} ${info.played === 1 ? 'has' : 'have'} walked${known() ? ' · tap a hero to see their gear' : ''}</small></h4>
    ${info.rows.length ? board(info.rows, you && you.state === 'done' ? you : null, 't', info.played) : '<p class="dyempty">No one has walked today\'s Dream yet. Be the first.</p>'}`;
  const past = y ? `<div class="dyhero small" style="--tw:${TWIST[y.rule].color}">${dial(y.rule)}<h2>${esc(TWIST[y.rule].name)}</h2><p class="dymeta"><span style="--cc:${CLASS_COLOR[y.cls]}"><img src="assets/classes/${y.cls}.png" alt="">${CLASS_NAME[y.cls]}</span><span>${y.played} ${y.played === 1 ? 'hero' : 'heroes'}</span>${y.you ? `<span>You placed #${y.you.pos}</span>` : ''}</p></div>
    ${y.rows.length ? `<h4 class="dyh">Top heroes</h4>${board(y.rows, y.you, 'y', y.played)}` : '<p class="dyempty">No heroes walked that day.</p>'}` : '<p class="dyempty">The first Daily Draft is today.</p>';
  sheet.innerHTML = `<div class="duelbox dybox"><button type="button" class="dx" aria-label="Close">&times;</button>
    <span class="dkick">Daily Draft · Day ${dayNo(info.day)}</span>
    <div class="dytabs" role="tablist"><button type="button" role="tab" data-tab="today" aria-selected="${tab === 'today'}" class="${tab === 'today' ? 'on' : ''}">Today</button><button type="button" role="tab" data-tab="yesterday" aria-selected="${tab !== 'today'}" class="${tab !== 'today' ? 'on' : ''}" ${y ? '' : 'disabled'}>Yesterday</button></div>
    ${tab === 'today' ? today : past}
  </div>`;
  sheet.querySelector('.dx').onclick = closeSheet;
  for (const b of sheet.querySelectorAll('[data-tab]')) b.onclick = () => { sheet.dataset.tab = b.dataset.tab; drawSheet(); };
  const toggle = (host, key, after) => {
    const had = after ? host.nextElementSibling && host.nextElementSibling.classList.contains('dygear') : host.querySelector('.dygear');
    if (had) { (after ? host.nextElementSibling : host.querySelector('.dygear')).remove(); host.setAttribute('aria-expanded', 'false'); if (!after) host.firstElementChild.setAttribute('aria-expanded', 'false'); return false; }
    const g = `<div class="dygear">${gear(gears.get(key) || {})}</div>`;
    if (after) host.insertAdjacentHTML('afterend', g); else host.insertAdjacentHTML('beforeend', g);
    (after ? host : host.firstElementChild).setAttribute('aria-expanded', 'true');
    return true;
  };
  for (const b of sheet.querySelectorAll('[data-row] > button')) b.onclick = () => { if (tab === 'today' && !known()) return; toggle(b.parentElement, b.parentElement.dataset.row); };
  for (const b of sheet.querySelectorAll('[data-me]')) b.onclick = () => {
    const li = b.dataset.me !== 'me' && sheet.querySelector(`[data-row="${b.dataset.me}"]`);
    if (!li) { toggle(b, 'me', true); return; }
    const list = li.parentElement;
    list.scrollTo({ top: li.offsetTop - list.clientHeight / 2 + li.offsetHeight / 2, behavior: 'smooth' });
    if (!li.querySelector('.dygear')) toggle(li, li.dataset.row);
    li.classList.remove('flash'); void li.offsetWidth; li.classList.add('flash');
  };
  const mine = sheet.querySelector('.dyscroll li.me');
  if (mine) { const list = mine.parentElement; list.scrollTop = Math.max(0, mine.offsetTop - list.clientHeight / 2 + mine.offsetHeight / 2); }
  if (info.test && tab === 'today') for (const [i, s] of sheet.querySelectorAll('.dyhero .dydial i').entries()) { s.classList.add('pickable'); s.onclick = async () => { const r = await api('/daily/test', { rule: TWISTS[i].rule, name: lib.name() }); if (!r.ok) return; await refreshDaily(); play(); }; }
  const p = sheet.querySelector('[data-play]');
  if (p) p.onclick = () => { if (dayNow() !== info.day) { refreshDaily(); return; } play(); };
}
