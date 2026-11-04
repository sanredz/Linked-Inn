import { PORTRAIT } from './feats.js';
import { seasonOf } from './seasons.js';

const CLASSES = ['WARRIOR', 'PALADIN', 'HUNTER', 'ROGUE', 'PRIEST', 'SHAMAN', 'MAGE', 'WARLOCK', 'DRUID'];
const CLASS_NAME = Object.fromEntries(CLASSES.map((c) => [c, c[0] + c.slice(1).toLowerCase()]));
const RAID_NAME = { mc: 'Molten Core', zg: "Zul'Gurub" }, FINAL = { mc: 'Ragnaros', zg: 'Hakkar' };
const TOP = 10;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (n) => Math.round(n || 0).toLocaleString('en-US');
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : num(n));
const face = (p) => (PORTRAIT[p.f] || PORTRAIT['hero:thrall'] || {}).src || '';
const square = (p) => (p.f || '').startsWith('class:');

let root = null, data = null, me = () => '', raidPick = 'all';
const finds = {};

function ensureStyle() {
  if (document.querySelector('link[data-hall]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.dataset.hall = '1';
  link.href = new URL('./hall.css', import.meta.url).href;
  document.head.append(link);
}

const byWins = () => seasonOf(data && data.season).arena === 'wins';
const played = (key) => (data.played || {})[key === 'raid' ? raidPick : key] || 0;
const raidScore = (p) => (raidPick === 'all' ? Object.values(p.d).reduce((a, b) => a + b, 0) : p.d[raidPick] || 0);
const raidKills = (p) => (raidPick === 'all' ? Object.values(p.k).reduce((a, b) => a + b, 0) : p.k[raidPick] || 0);

const BOARDS = {
  gear: {
    title: 'Gear Draft', art: 'assets/draft/arena/card-draft.jpg', blurb: 'Mastery: how your best run in each class ranks against everyone, across all nine classes.',
    list: () => data.gear,
    value: (p) => [p.s.toFixed(1), 'mastery'],
    extra: (p) => `<span class="hlmeter" aria-label="Classes: ${p.c.map((v, i) => `${CLASS_NAME[CLASSES[i]]} ${v}`).join(', ')}">${p.c.map((v, i) => `<i style="--v:${v / 100}" title="${CLASS_NAME[CLASSES[i]]}: better than ${v}%"></i>`).join('')}</span>`,
  },
  arena: {
    title: 'Arena Draft', art: 'assets/draft/arena/card-gauntlet.jpg',
    blurb: () => (byWins() ? 'Most duels won across all your runs. Ties go to ten-win runs.' : 'Most runs with ten wins. Ties go to flawless runs, then total wins.'),
    list: () => data.arena,
    value: (p) => (byWins() ? [num(p.w), p.w === 1 ? 'duel won' : 'duels won'] : [num(p.t), p.t === 1 ? 'ten-win run' : 'ten-win runs']),
    extra: (p) => (byWins()
      ? `<small>${p.t ? `${p.t} ten-win · ` : ''}${num(p.r)} ${p.r === 1 ? 'run' : 'runs'}</small>`
      : `<small>${p.x ? `${p.x} flawless · ` : ''}${num(p.w)} wins</small>`),
  },
  raid: {
    title: 'Raid Draft', art: 'assets/draft/arena/card-raid.jpg', blurb: 'Total damage dealt to the final boss across all your runs.',
    list: () => data.raid.filter((p) => raidScore(p) > 0).sort((a, b) => raidScore(b) - raidScore(a) || raidKills(b) - raidKills(a)),
    value: (p) => [short(raidScore(p)), 'damage'],
    extra: (p) => `<small>Reached ${raidPick === 'all' ? 'a final boss' : FINAL[raidPick]} ${raidKills(p) === 1 ? 'once' : `${num(raidKills(p))} times`}</small>`,
  },
};

function podium(key, list) {
  const b = BOARDS[key], spot = (p, i) => {
    if (!p) return `<div class="hpod empty p${i + 1}"><span class="hpface"></span><b>Open seat</b><em>&nbsp;</em><i class="hpstep">${i + 1}</i></div>`;
    const [v, unit] = b.value(p);
    return `<div class="hpod p${i + 1} ${p.n === me() ? 'me' : ''}"><span class="hpface ${square(p) ? 'sq' : ''}"><span class="hpimg"><img src="${face(p)}" alt="" loading="lazy"></span>${i === 0 ? '<i class="hpcrown"></i>' : ''}</span><b title="${esc(p.n)}">${esc(p.n)}</b><em>${v}<small>${unit}</small></em><i class="hpstep">${i + 1}</i></div>`;
  };
  return `<div class="hpodium">${[1, 0, 2].map((i) => spot(list[i], i)).join('')}</div>`;
}

const row = (key, p, rank) => {
  const [v, unit] = BOARDS[key].value(p);
  return `<li class="${p.n === me() ? 'me' : ''}"><span class="hlpos">${rank}</span><span class="hlface ${square(p) ? 'sq' : ''}"><img src="${face(p)}" alt="" loading="lazy"></span><span class="hlwho"><b>${esc(p.n)}</b>${BOARDS[key].extra(p)}</span><em title="${v} ${unit}">${v}</em></li>`;
};

function body(key) {
  const list = BOARDS[key].list(), q = (finds[key] || '').trim().toLowerCase();
  const ranked = list.map((p, i) => [p, i + 1]);
  let rows;
  if (q) {
    const hits = ranked.filter(([p]) => p.n.toLowerCase().includes(q)).slice(0, TOP);
    rows = hits.length ? hits.map(([p, r]) => row(key, p, r)).join('') : '<li class="hlnone">No champion by that name yet.</li>';
  } else rows = ranked.slice(3, TOP).map(([p, r]) => row(key, p, r)).join('');
  const mine = me() && ranked.find(([p]) => p.n === me()), mineShown = mine && (q ? mine[0].n.toLowerCase().includes(q) && mine[1] <= TOP : mine[1] <= TOP);
  const you = mine && !mineShown ? `<ol class="hlist hyou">${row(key, mine[0], mine[1])}</ol>` : '';
  return `${q ? '' : podium(key, list)}<ol class="hlist" start="4">${rows}</ol>${you}<p class="hcount">${num(played(key))} ${played(key) === 1 ? 'player' : 'players'} this season</p>`;
}

function card(key) {
  const b = BOARDS[key], toggle = key === 'raid' ? `<div class="hraid" role="group" aria-label="Raid">${[['all', 'Both'], ...data.raids.map((r) => [r, RAID_NAME[r] || r])].map(([id, n]) => `<button class="${raidPick === id ? 'on' : ''}" data-raid="${id}">${esc(n)}</button>`).join('')}</div>` : '<div class="hslot"></div>';
  return `<article class="hcard" data-board="${key}"><header class="hctop" style="background-image:url(${b.art})"><b>${b.title}</b><small>${typeof b.blurb === 'function' ? b.blurb() : b.blurb}</small></header>${toggle}<div class="hfind"><input type="search" maxlength="20" placeholder="Find a player" aria-label="Find a player on the ${b.title} board" value="${esc(finds[key] || '')}" autocomplete="off"></div><div class="hcbody">${body(key)}</div></article>`;
}

function draw() {
  const season = seasonOf(data.season);
  root.innerHTML = `<header class="hallhead"><i></i><div><h2>Hall of Champions</h2><span><em>${esc(season.name)}</em> season</span></div><i></i></header><div class="hallgrid">${Object.keys(BOARDS).map(card).join('')}</div>`;
  for (const el of root.querySelectorAll('.hcard')) {
    const key = el.dataset.board, box = el.querySelector('.hcbody');
    el.querySelector('input').oninput = (e) => { finds[key] = e.target.value; box.innerHTML = body(key); };
    for (const b of el.querySelectorAll('[data-raid]')) b.onclick = () => {
      raidPick = b.dataset.raid;
      for (const x of el.querySelectorAll('[data-raid]')) x.classList.toggle('on', x === b);
      box.innerHTML = body(key);
    };
  }
  root.hidden = false;
}

export async function mountHall(host, opts) {
  root = host;
  me = opts.me || me;
  ensureStyle();
  const r = await fetch(`${opts.API}/hall${opts.season ? `?season=${encodeURIComponent(opts.season)}` : ''}`).catch(() => null);
  if (!r || !r.ok) return;
  data = await r.json();
  draw();
}

export function refreshHall() { if (root && data) draw(); }
