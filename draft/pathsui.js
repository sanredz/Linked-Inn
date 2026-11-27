import { bannerThumb, loadEmblems } from './banners.js?v=20261127193000';
import { PATHS, PATH, REWARDS, REWARD, POINTS, TIER_COLOR, RANKS, RENOWN_MAX, REWARD_MOUNT, rewardFor } from './paths.js?v=20261127193000';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (n) => Math.round(n || 0).toLocaleString('en-US');
const SEEN = 'pathSeen';
const KIND = { title: 'Title', frame: 'Portrait frame', glow: 'Weapon glow', mount: 'Mount', decor: 'Inn decor', portrait: 'Portrait' };

export function pathsCss() {
  loadEmblems();
  if (!document.querySelector('link[href*="draft/frames.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="draft/frames.css?v=20261127193000">');
  if (!document.querySelector('link[href*="draft/paths.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="draft/paths.css?v=20261127193000">');
}

const rewardsAt = (pid, rank) => REWARDS.filter((r) => r.path === pid && r.rank === rank);
const nextReward = (p) => (p.rank < RANKS ? rewardsAt(p.path.id, p.rank + 1)[0] : null);

export function rewardIcon(r) {
  if (r.kind === 'portrait') return `<img src="assets/draft/arena/boons/${r.portrait.slice(5)}.jpg" alt="">`;
  if (r.kind === 'mount') return `<img src="assets/icons/${(REWARD_MOUNT.find((m) => m.id === r.mount) || { icon: 136103 }).icon}.png" alt="">`;
  if (r.kind === 'glow') return `<i class="prglow" style="--g:${r.color}"></i>`;
  if (r.kind === 'frame') return `<i class="prframe" data-frame="${r.id}"></i>`;
  if (r.kind === 'decor' && r.banner && bannerThumb(r.banner)) return `<img class="prban" src="${bannerThumb(r.banner)}" alt="">`;
  if (r.kind === 'decor' && r.color) return `<i class="prglow" style="--g:${r.color}"></i>`;
  if (r.kind === 'decor') return `<i class="prdecor"><svg viewBox="0 0 24 24"><path d="M6 3h12v14l-6-3-6 3Z"/></svg></i>`;
  return '<i class="prtitle">T</i>';
}

const track = (p) => `<span class="pbar" aria-hidden="true">${Array.from({ length: RANKS }, (_, i) => `<i class="${i < p.rank ? 'on' : ''}">${i === p.rank ? `<b style="width:${Math.round(p.frac * 100)}%"></b>` : ''}</i>`).join('')}</span>`;

function row(p) {
  const nx = nextReward(p);
  return `<button type="button" class="prow ${p.rank ? '' : 'zero'}" data-path="${p.path.id}" style="--c:${p.path.color}">
    <span class="pico"><img src="${p.path.icon}" alt=""><em>${p.rank}</em></span>
    <span class="pmid"><span class="ptop"><b>${esc(p.path.name)}</b><em>${esc(p.rankName)}</em></span>${track(p)}
    <small>${p.rank >= RANKS ? 'Every rank earned' : `${num(p.toNext)} points to ${esc(p.path.ranks[p.rank])}${nx ? ` · unlocks ${esc(nx.name)}` : ''}`}</small></span>
    ${nx ? `<span class="pnext" title="${esc(nx.name)}">${rewardIcon(nx)}</span>` : '<span class="pnext done">✓</span>'}
  </button>`;
}

export function pathsPanel(st) {
  return `<div class="ppanel">
    <div class="prenown"><span class="pring" style="--p:${st.renown / RENOWN_MAX}"><b>${st.renown}</b></span><span><small>Renown</small><b>${st.renown} of ${RENOWN_MAX} ranks</b><em>Every rank on every Path adds one. Renown unlocks portrait frames.</em></span></div>
    <div class="prows">${st.paths.map(row).join('')}</div>
  </div>`;
}

function deedRow(x) {
  if (x.deed.hidden && !x.done) return '';
  const full = !x.next, goal = full ? 'Done' : x.deed.low ? (x.v ? `#${num(x.v)} · goal top ${x.next.at}` : `goal top ${x.next.at}`) : x.deed.of ? `${num(x.v)} of ${x.deed.of}` : `${num(x.v)} / ${num(x.next.at)}`;
  const steps = x.steps.map((s) => `<i class="${s.done ? 'on' : ''}" style="--t:${TIER_COLOR[s.tier]}" title="${esc(s.label || (x.deed.low ? `Top ${s.at}` : num(s.at)))} · +${POINTS[s.tier]}"><span>${esc(s.label || (x.deed.low ? `Top ${s.at}` : num(s.at)))}</span></i>`).join('');
  const gifts = REWARDS.filter((r) => r.deed === x.deed.id);
  return `<li class="pdeed ${full ? 'full' : ''} ${x.deed.bonus ? 'bonus' : ''}"><div class="pdtop"><b>${x.deed.bonus ? '<i class="pdbonus">Bonus</i>' : ''}${esc(x.deed.name)}</b><em>${esc(goal)}</em></div>${x.deed.text || x.deed.hint ? `<small>${esc(x.deed.text || x.deed.hint)}</small>` : ''}<div class="pdsteps">${steps}</div>${gifts.length ? `<div class="pdgifts">${gifts.map((g) => `<span class="plgift ${x.done >= g.step ? 'got' : ''}" title="${esc(rewardFor(g))}">${rewardIcon(g)}<em>${esc(g.name)}</em></span>`).join('')}</div>` : ''}<span class="pdpts">${x.pts} / ${x.max}</span></li>`;
}

export function pathDetail(st, id) {
  const p = st.paths.find((x) => x.path.id === id), hidden = p.deeds.filter((x) => x.deed.hidden && !x.done).length;
  const ladder = p.path.ranks.map((name, i) => {
    const r = i + 1, on = p.rank >= r, gifts = rewardsAt(id, r);
    return `<li class="${on ? 'on' : ''} ${p.rank + 1 === r ? 'now' : ''}"><span class="plnum">${r}</span><span class="plname"><b>${esc(name)}</b><small>${num(p.marks[i])} points</small></span><span class="plgifts">${gifts.map((g) => `<span class="plgift" title="${esc(KIND[g.kind])}: ${esc(g.name)}">${rewardIcon(g)}<em>${esc(g.name)}</em></span>`).join('')}</span></li>`;
  }).join('');
  return `<div class="pdetail" style="--c:${p.path.color}">
    <div class="pdhead"><span class="pico big"><img src="${p.path.icon}" alt=""><em>${p.rank}</em></span><span><small>${esc(p.path.blurb)}</small><b>${esc(p.path.name)} · ${esc(p.rankName)}</b><em>${num(p.pts)} points${p.rank < RANKS ? ` · ${num(p.toNext)} to the next rank` : ''}</em></span></div>
    ${track(p)}
    <div class="ptabs" role="tablist"><button type="button" role="tab" class="on" data-ptab="ranks" aria-selected="true"><b>Ranks</b><small>what you unlock</small></button><button type="button" role="tab" data-ptab="deeds" aria-selected="false"><b>Deeds</b><small>how you earn points · ${num(p.pts)} of ${num(p.max)}</small></button></div>
    <section class="ppane" data-pane="ranks"><ol class="pladder">${ladder}</ol></section>
    <section class="ppane" data-pane="deeds" hidden><ul class="pdeeds">${p.deeds.map(deedRow).join('')}</ul>${hidden ? `<p class="phidden">${hidden} hidden ${hidden === 1 ? 'deed' : 'deeds'} still to discover.</p>` : ''}</section>
  </div>`;
}

export function openPath(st, id) {
  pathsCss();
  const box = document.createElement('div');
  box.className = 'psheet';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `<div class="psheetbox"><button type="button" class="px" aria-label="Close">&times;</button>${pathDetail(st, id)}</div>`;
  document.body.append(box);
  requestAnimationFrame(() => box.classList.add('in'));
  const close = () => { box.classList.remove('in'); document.removeEventListener('keydown', key); setTimeout(() => box.remove(), 250); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', key);
  box.querySelector('.px').onclick = close;
  box.onclick = (e) => { if (e.target === box) close(); };
  for (const t of box.querySelectorAll('[data-ptab]')) t.onclick = () => {
    for (const x of box.querySelectorAll('[data-ptab]')) { x.classList.toggle('on', x === t); x.setAttribute('aria-selected', String(x === t)); }
    for (const pane of box.querySelectorAll('[data-pane]')) pane.hidden = pane.dataset.pane !== t.dataset.ptab;
  };
}

export function bindPaths(el, st) {
  for (const b of el.querySelectorAll('[data-path]')) b.onclick = () => openPath(st, b.dataset.path);
}

const LOOKS = [['title', 'Title'], ['frame', 'Portrait frame'], ['glow', 'Weapon glow'], ['ride', 'Mount']];

function lookOptions(kind, st, rides) {
  if (kind === 'ride') return [{ id: 0, name: 'On foot', icon: '<i class="prnone"></i>', open: true }, ...rides.map((m) => ({ id: m.id, name: m.name, icon: `<img src="assets/icons/${m.icon}.png" alt="">`, open: m.have, need: m.need }))];
  const none = { id: '', name: 'None', icon: '<i class="prnone"></i>', open: true };
  return [none, ...REWARDS.filter((r) => r.kind === kind).map((r) => ({ id: r.id, name: kind === 'title' ? r.name : r.name.replace(/ (glow|frame)$/, ''), icon: kind === 'title' ? '<i class="prtitle">T</i>' : rewardIcon(r), open: st.open.has(r.id), need: rewardFor(r) }))];
}

const current = (kind, profile) => (kind === 'ride' ? profile.ride || 0 : profile[kind] || '');

export function lookHtml(st, profile, rides) {
  return `<div class="plooks">${LOOKS.map(([kind, label]) => {
    const list = lookOptions(kind, st, rides), on = list.find((o) => o.id === current(kind, profile)) || list[0], have = list.filter((o) => o.open).length - 1;
    return `<button type="button" class="plslot" data-slot="${kind}"><span class="plsicon">${on.icon}</span><span class="plstext"><small>${label}</small><b>${esc(on.name)}</b><em>${have} of ${list.length - 1} unlocked</em></span><i class="plschev" aria-hidden="true"></i></button>`;
  }).join('')}</div>`;
}

function openLook(kind, st, profile, rides, save) {
  pathsCss();
  const list = lookOptions(kind, st, rides), now = current(kind, profile), label = LOOKS.find((x) => x[0] === kind)[1];
  const box = document.createElement('div');
  box.className = 'psheet plpick';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `<div class="psheetbox"><button type="button" class="px" aria-label="Close">&times;</button><div class="plhead"><small>Your look</small><b>Choose your ${label.toLowerCase()}</b></div>
    <div class="plgrid">${list.map((o) => `<button type="button" class="plopt ${o.id === now ? 'on' : ''} ${o.open ? '' : 'locked'}" data-id="${o.id}" ${o.open ? '' : `data-need="${esc(o.need || '')}"`}><span class="plsicon">${o.icon}</span><span><b>${esc(o.name)}</b><small>${o.id === now ? 'Wearing' : o.open ? (o.need ? `From ${esc(o.need)}` : 'Always yours') : `Unlocks at ${esc(o.need || '')}`}</small></span></button>`).join('')}</div></div>`;
  document.body.append(box);
  requestAnimationFrame(() => box.classList.add('in'));
  const close = () => { box.classList.remove('in'); document.removeEventListener('keydown', key); setTimeout(() => box.remove(), 250); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', key);
  box.querySelector('.px').onclick = close;
  box.onclick = (e) => { if (e.target === box) close(); };
  for (const b of box.querySelectorAll('.plopt')) b.onclick = () => {
    if (b.dataset.need != null) { b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); return; }
    close();
    save(kind === 'ride' ? { ride: +b.dataset.id } : { [kind]: b.dataset.id });
  };
  const first = box.querySelector('.plopt.on') || box.querySelector('.plopt');
  if (first) first.focus({ preventScroll: true });
}

export function bindLook(el, save, st, profile, rides) {
  for (const b of el.querySelectorAll('[data-slot]')) b.onclick = () => openLook(b.dataset.slot, st, profile, rides, save);
}

export const frameAttr = (id) => {
  const f = REWARD[id];
  return f && f.kind === 'frame' ? ` data-frame="${f.id}" style="--fr:${f.color}"` : '';
};

const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN) || 'null'); } catch { return null; } };
const writeSeen = (st) => { try { localStorage.setItem(SEEN, JSON.stringify(Object.fromEntries(st.paths.map((p) => [p.path.id, p.rank])))); } catch {} };

export async function revealPaths(st, opts = {}) {
  const seen = readSeen(), force = opts.force;
  if (!force && seen && st.paths.every((p) => (seen[p.path.id] || 0) >= p.rank)) { if (!seen || Object.keys(seen).length < PATHS.length) writeSeen(st); return; }
  const first = force || !seen, up = first ? st.paths.filter((p) => p.rank > 0) : st.paths.filter((p) => p.rank > (seen[p.path.id] || 0));
  if (!first && !up.length) return;
  pathsCss();
  const was = (id) => (first ? 0 : seen[id] || 0);
  const gifts = up.flatMap((p) => REWARDS.filter((r) => r.path === p.path.id && r.rank > was(p.path.id) && r.rank <= p.rank));
  const before = first ? 0 : PATHS.reduce((n, p) => n + (seen[p.id] || 0), 0);
  const renownGifts = REWARDS.filter((r) => r.renown && r.renown > before && r.renown <= st.renown);
  const all = [...gifts, ...renownGifts];
  const box = document.createElement('div');
  box.className = `preveal ${first ? 'first' : 'up'}`;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const rows = (first ? st.paths : up).map((p) => `<li style="--c:${p.path.color}" data-rank="${p.rank}" data-from="${was(p.path.id)}"><span class="pico"><img src="${p.path.icon}" alt=""><em>${was(p.path.id)}</em></span><span class="prvmid"><b>${esc(p.path.name)}</b><em>${esc(p.rankName)}</em>${track({ ...p, rank: was(p.path.id), frac: 0 })}</span></li>`).join('');
  box.innerHTML = `<div class="prvbox"><i class="prvrays" aria-hidden="true"></i>
    <small>${first ? 'Badges have become Paths' : 'Rank up'}</small>
    <h2>${first ? 'Your deeds have been counted' : up.length === 1 ? `${esc(up[0].path.name)} · ${esc(up[0].rankName)}` : 'You climbed the Paths'}</h2>
    ${first ? '<p>Seven Paths, five ranks each. Everything you have already done counts. Every rank unlocks something to show off.</p>' : ''}
    <ul class="prvrows">${rows}</ul>
    ${first ? `<div class="prvrenown"><span class="pring" style="--p:0"><b>0</b></span><span><small>Renown</small><b>${st.renown} of ${RENOWN_MAX}</b></span></div>` : ''}
    ${all.length ? `<h4>Unlocked</h4><div class="prvgifts">${all.map((g) => `<span class="prvgift">${rewardIcon(g)}<span><b>${esc(g.name)}</b><small>${esc(KIND[g.kind])}</small></span></span>`).join('')}</div>` : ''}
    <div class="prvgo">${all.some((g) => ['title', 'frame', 'glow', 'mount'].includes(g.kind)) && opts.onLook ? '<button type="button" class="prvlook">Choose your look</button>' : ''}<button type="button" class="prvok">${first ? 'Onwards' : 'Nice'}</button></div>
  </div>`;
  document.body.append(box);
  writeSeen(st);
  requestAnimationFrame(() => box.classList.add('in'));
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lis = [...box.querySelectorAll('.prvrows li')];
  const ring = box.querySelector('.prvrenown .pring');
  let shown = 0;
  const climb = async () => {
    for (const li of lis) {
      const to = +li.dataset.rank, pips = li.querySelectorAll('.pbar i'), n = li.querySelector('.pico em');
      for (let r = +li.dataset.from + 1; r <= to; r++) {
        if (!calm) await new Promise((d) => setTimeout(d, first ? 170 : 380));
        if (pips[r - 1]) pips[r - 1].classList.add('on', 'pop');
        n.textContent = r;
        li.classList.add('lit');
        if (ring) { shown++; ring.style.setProperty('--p', shown / RENOWN_MAX); ring.querySelector('b').textContent = shown; }
      }
    }
    box.classList.add('done');
  };
  climb();
  return new Promise((done) => {
    const close = (look) => { box.classList.remove('in'); setTimeout(() => box.remove(), 300); done(); if (look && opts.onLook) opts.onLook(); };
    box.querySelector('.prvok').onclick = () => close(false);
    const lk = box.querySelector('.prvlook');
    if (lk) lk.onclick = () => close(true);
  });
}
