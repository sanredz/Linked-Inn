import { titleOf } from '../draft/paths.js?v=20261127190000';
import { variance, WORLD, SLOTS, newWorld, addHero, gearOffers, handsFor, takeGear, mulligan, worldParty, pullWorld, dayOf, resetAt, dropsOf } from './world.js?v=20261127190000';
import * as W from './world.js?v=20261127190000';
import { ROLES, ROLE_NAME, CLASS_NAME, classesFor, specsFor } from './run.js?v=20261127190000';
import { BONUS, choiceOf, partyBonuses, stacks } from './roles.js?v=20261127190000';
import { bossHealth, explain, fight } from './engine.js?v=20261127190000';
import { resultHtml } from '../pvp/arena.js?v=20261127190000';
import { CLASS_COLOR, TIER_NAME } from '../draft/core.js?v=20261127190000';
import { walkout } from './wloot.js?v=20261127190000';
import { KEY as DARK_KEY } from './worldloot.js?v=20261127190000';
import { PIECES, LIGHT, WHISPERS, CHANCE } from './attune.js?v=20261127190000';
import { breakSeals, whisper, whisperSeen } from './seals.js?v=20261127190000';
import { CONSUMABLE, TIERS } from './consumables.js?v=20261127190000';
import { openSatchel, openDropList, setOpen } from './satchel.js?v=20261127190000';
import { DRAGONS, DRAGON_IDS, dragonOf, TREES, VISIONS } from './dream.js?v=20261127190000';
import { dreamCss, summonDragon, enterDream, vision, visionSeen } from './dreamfx.js?v=20261127190000';

const PREVIEW = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /^(life-preview|azeroth-preview)\./.test(location.hostname);
const PRETEND = PREVIEW ? new URLSearchParams(location.search).get('seals') : null;
const DREAMING = PREVIEW ? new URLSearchParams(location.search).get('dream') : null;
const fakeDream = (n, forged = 0) => ({ trees: Object.fromEntries(TREES.map((t, i) => [t.id, i < n ? 1 : 0])), steps: n, ready: n === TREES.length ? 1 : 0, forged, pretend: 1 });
const pretendSteps = (v) => (v === 'ready' || v === 'all' ? 6 : v === 'drop' || v === 'light' ? 1 : Math.max(0, Math.min(6, parseInt(v, 10) || 0)));
function fakeAttune(n, forged = 0) {
  const pieces = {}, light = {};
  PIECES.forEach((p, i) => { pieces[p.raid] = i < n ? 1 : 0; });
  LIGHT.forEach((l, i) => { light[l.raid] = i + 3 < n ? 1 : 0; });
  if (PRETEND === 'light') { pieces.mc = 0; light.mc = 1; }
  return { pieces, light, steps: n, ready: n === 6 ? 1 : 0, forged, pretend: 1 };
}

const KEY = 'worldRun';
const SLOT_NAME = { head: 'Head', neck: 'Neck', shoulder: 'Shoulders', back: 'Back', chest: 'Chest', wrist: 'Wrists', hands: 'Hands', waist: 'Waist', legs: 'Legs', feet: 'Feet', finger1: 'Ring', finger2: 'Ring', trinket1: 'Trinket', trinket2: 'Trinket', main: 'Main Hand', off: 'Off Hand', ranged: 'Ranged' };
const STAT = { sta: 'Sta', str: 'Str', agi: 'Agi', int: 'Int', spi: 'Spi', def: 'Defense', dodge: 'Dodge', parry: 'Parry', block: 'Block', blockValue: 'Block value', heal: 'Healing', sp: 'Spell power', mp5: 'Mp5', ap: 'AP', rap: 'Ranged AP', crit: 'Crit', hit: 'Hit', scrit: 'Spell crit', shit: 'Spell hit', sfire: 'Fire power', sfrost: 'Frost power', sshadow: 'Shadow power', sarcane: 'Arcane power', snature: 'Nature power', sholy: 'Holy power', rshadow: 'Shadow res', rfire: 'Fire res' };
const PERCENT = new Set(['dodge', 'parry', 'block', 'crit', 'hit', 'scrit', 'shit']);
const LEFT = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist'], RIGHT = ['legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2', 'main', 'off', 'ranged'];
const VERDICT = [[0, 'Deadly', 'bad'], [.35, 'Close', 'mid'], [.7, 'Comfortable', 'good']];
const RARITY = { Common: '#ffffff', Uncommon: '#1eff00', Rare: '#0070dd', Epic: '#a335ee', Legendary: '#ff8000' };
const THEME = { zone: 'blasted' };
const RES_NAME = { shadow: 'Shadow res', nature: 'Nature res', arcane: 'Arcane res' };

export function makeWorld(ctx) {
  const { root, scene, pool, API } = ctx;
  if (!document.querySelector('link[href*="raid/world.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="raid/world.css?v=20261127190000">');
  if (!document.querySelector('link[href*="raid/satchel.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="raid/satchel.css?v=20261127190000">');
  dreamCss();
  let rolled = '', fresh = '', justTook = '', run = null, status = {}, chosenCls = '', chosenSpec = '', chosenPick = '', viewing = 0, hands = '', busy = false, verdict = null, pulled = null, error = '', shownRole = -1, board = null, pasts = [], pastResult = null, pastMine = [], pastAll = null, pastScope = 'mine';
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (v) => Math.round(v).toLocaleString('en-US');
  const icon = (id) => `assets/icons/${pool.items[id][4]}.png`;
  const save = () => { if (run && run.past) return; try { if (run && !run.over) localStorage.setItem(KEY, JSON.stringify(run)); else localStorage.removeItem(KEY); } catch {} };
  const load = () => { try { const r = JSON.parse(localStorage.getItem(KEY) || 'null'); return r && r.day === dayOf() ? r : null; } catch { return null; } };
  const left = (at) => { const ms = Math.max(0, at - Date.now()), h = Math.floor(ms / 36e5), m = Math.ceil((ms % 36e5) / 6e4); return h ? `${h}h ${m}m` : `${m}m`; };
  const boss = () => (run ? W.bossOf(run) : WORLD.kazzak);
  const host = () => WORLD[run ? run.raid : 'kazzak'];
  const cache = {};
  const team = () => { const key = JSON.stringify([run.consume, run.heroes.map((h) => [h.cls, h.build, h.pick, h.picks])]); if (cache.key !== key) { cache.key = key; cache.heroes = worldParty(pool, run); } return cache.heroes; };

  let fake = null, dreamFake = null;
  async function refresh(id) {
    const ids = id ? [id] : Object.keys(WORLD);
    await Promise.all(ids.map(async (k) => { try { const r = await fetch(`${API}/world/status?boss=${k}&who=${ctx.who()}`); status[k] = r.ok ? await r.json() : null; } catch { status[k] = null; } }));
    { const f = (k) => !!(status[k] && status[k].attune && status[k].attune.forged); setOpen({ any: f('kazzak') || f('dream'), dream: f('dream'), have: ((status.kazzak || status.dream) || {}).satchel || {} }); }
    if (ids.includes('kazzak') && PRETEND !== null && status.kazzak && status.kazzak.attune) { status.kazzak.attune = fake || (fake = fakeAttune(pretendSteps(PRETEND))); if (!fake.forged && fake.steps && !fake.whispered) { fake.whispered = 1; setTimeout(() => whisper(fake.steps), PRETEND === 'drop' || PRETEND === 'light' ? 1800 : 600); } }
    if (ids.includes('dream') && DREAMING !== null && status.dream && status.dream.attune) { status.dream.attune = dreamFake || (dreamFake = fakeDream(DREAMING === 'ready' ? TREES.length : Math.max(0, Math.min(TREES.length, parseInt(DREAMING, 10) || 0)))); if (!dreamFake.forged && dreamFake.steps && !dreamFake.told) { dreamFake.told = 1; setTimeout(() => vision(dreamFake.steps, dreamFake), 900); } }
    const a = status.kazzak && status.kazzak.attune;
    if (ids.includes('kazzak') && a && !a.pretend && !a.forged && a.steps > whisperSeen()) whisper(a.steps);
    const d = status.dream && status.dream.attune;
    if (ids.includes('dream') && d && !d.pretend && !d.forged && d.steps > visionSeen()) setTimeout(() => vision(d.steps, d), a && !a.forged && a.steps > whisperSeen() ? 7000 : 300);
    if (!run) ctx.redraw();
  }

  const sealed = (id) => { const a = status[id] && status[id].attune; return a && !a.forged ? a : null; };
  const folded = (k, def) => { try { const v = localStorage.getItem(`fold:${k}`); return v === null ? def : v === '1'; } catch { return def; } };
  const foldBtn = (k, what, on) => `<button type="button" class="wbfold" data-fold="${k}" aria-expanded="${!on}"><span>${on ? `Show ${what}` : `Hide ${what}`}</span><i aria-hidden="true"></i></button>`;
  const SCRAMBLE = (t) => [...t].map((c, i) => (c === ' ' ? ' ' : '▒▓░▓▒'[i % 5])).join('');
  function sealedHtml(b, a) {
    const sigil = (on, icon, name, need, kind) => `<li class="wbsigil ${kind} ${on ? 'on' : ''}"><img src="assets/icons/${icon}.png" alt=""><span><b>${esc(name)}</b><small>${on ? (kind === 'piece' ? 'Found' : 'The Light answered') : esc(need)}</small></span><i aria-hidden="true">${on ? '✓' : ''}</i></li>`;
    const pieces = PIECES.map((p) => sigil(a.pieces[p.raid], p.icon, p.name, `${Math.round(CHANCE * 100)}% chance when you reach ${p.from}`, 'piece')).join('');
    const light = LIGHT.map((l) => sigil(a.light[l.raid], l.icon, l.name, `Reach ${l.place} with a Paladin tank, a Paladin healer and a Paladin damage dealer`, 'light')).join('');
    const said = a.steps ? WHISPERS[a.steps - 1] : 'Something sleeps beyond the Dark Portal. Six seals hold it there.';
    const st = status[b.id] || {};
    const prev = st.early ? `<span class="wbprevs"><button class="wbprev" data-act="worldseal" data-how="stock" data-raid="${b.id}">Fill satchel (preview)</button><button class="wbprev" data-act="worldseal" data-how="grant" data-raid="${b.id}">Grant next seal (preview only)</button><button class="wbprev" data-act="worldseal" data-how="grantall" data-raid="${b.id}">Grant all</button><button class="wbprev" data-act="worldseal" data-how="reset" data-raid="${b.id}">Reset attunement</button></span>` : '';
    const note = a.pretend ? '<span class="wbpretend">Preview pretend mode: nothing is saved</span>' : '';
    const fold = !a.ready && folded(b.id, !a.steps);
    return `${note}<div class="wbwrap"><div class="wbcard wbsealed ${a.ready ? 'ready' : ''} ${fold ? 'folded' : ''}" data-foldbox data-raid="${b.id}"><i class="wbart" style="background-image:url(assets/draft/arena/raid-${b.id}.jpg)"></i><i class="wbfel" aria-hidden="true"></i>
      <span class="wbsay"><small class="wbkick">World Boss · Sealed</small><b class="wbname wbglitch" data-text="${esc(SCRAMBLE(b.name))}" aria-label="A sealed world boss">${esc(SCRAMBLE(b.name))}</b><span class="wbwhis">“${esc(said)}”</span>
      <span class="wbfoldrow"><span class="wbprog"><b>${a.steps}</b> of 6 seals broken</span>${a.ready ? '' : foldBtn(b.id, 'the seals', fold)}</span>
      <span class="wbmore"><ul class="wbsigils">${pieces}${light}</ul>
      ${a.ready ? `<button class="wbbreak" data-act="worldforge" data-raid="${b.id}">Break the seals</button>` : '<span class="wbhint">Quest pieces drop from the final boss of each raid. The Light trials need three Paladins. Once he is free, rare raid consumables help you fight him.</span>'}</span></span></div>${prev}</div>`;
  }

  async function sealAct(id, how) {
    if (busy) return;
    if (id === 'dream' && dreamFake) {
      if (how === 'forge') { await enterDream(); dreamFake.forged = Date.now(); }
      else if (how === 'reset') dreamFake = fakeDream(0);
      else if (how === 'grantall') dreamFake = fakeDream(TREES.length);
      else if (how === 'grant') { dreamFake = fakeDream(Math.min(TREES.length, dreamFake.steps + 1)); vision(dreamFake.steps, dreamFake); dreamFake.told = 1; }
      return refresh(id);
    }
    if (fake && id !== 'dream') {
      if (how === 'forge') { await breakSeals(); fake.forged = Date.now(); }
      else if (how === 'reset') fake = fakeAttune(0);
      else if (how === 'grantall') fake = fakeAttune(6);
      else if (how === 'grant') { fake = fakeAttune(Math.min(6, fake.steps + 1)); whisper(fake.steps); fake.whispered = 1; }
      return refresh(id);
    }
    busy = true;
    try {
      const r = await fetch(`${API}/world/attune`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ who: ctx.who(), boss: id, act: how }) });
      const d = await r.json().catch(() => null);
      if (d && d.attune && status[id]) status[id].attune = d.attune;
      if (d && d.satchel && status[id]) status[id].satchel = d.satchel;
      if (how === 'forge' && d && d.ok) { busy = false; await (id === 'dream' ? enterDream() : breakSeals()); ctx.after(); }
      if (how !== 'forge') ctx.after();
      if (how === 'reset') { try { localStorage.removeItem(id === 'dream' ? 'dreamSeen' : 'attuneSeen'); } catch {} }
      if (how === 'grant' && id === 'dream' && d && d.attune) vision(d.attune.steps, d.attune);
    } catch {}
    busy = false;
    await refresh(id);
  }

  const clockOf = (at) => { const ms = Math.max(0, at - Date.now()), t = Math.floor(ms / 1000); return `${Math.floor(t / 3600)}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  const localTime = (at) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  let ticker = 0;
  const tick = () => {
    const els = document.querySelectorAll('[data-wbleft]');
    if (!els.length) { clearInterval(ticker); ticker = 0; return; }
    for (const el of els) { const at = +el.dataset.wbleft; el.textContent = clockOf(at); if (at <= Date.now()) { clearInterval(ticker); ticker = 0; refresh(); } }
  };

  function dreamSealedHtml(b, a) {
    const st = status[b.id] || {}, next = TREES.find((t) => !a.trees[t.id]);
    const cell = (t, i) => { const on = a.trees[t.id], go = next && next.id === t.id, line = on ? 'Awake' : go ? `${t.need} · ${a.echo && a.echo[t.id] ? `${a.echo[t.id]} of ${t.times} walks` : t.times > 1 ? `walk it ${t.times} times` : 'walk the Dream'}` : `${t.need} · wake ${TREES[i - 1].name} first`; return `<${go ? 'button type="button"' : 'div'} class="dbtree p${i} ${on ? 'on' : ''} ${go ? 'next' : ''}" ${go ? `data-act="dreamtrial" data-how="${t.id}"` : ''}><img src="assets/icons/${t.icon}.png" alt=""><span><em>${esc(t.mode)} · ${esc(t.zone)}</em><b>${esc(t.name)}</b><small>${esc(line)}</small></span></${go ? 'button' : 'div'}>`; };
    const roots = [[0, 22], [100, 22], [0, 78], [100, 78]].map(([x, y], i) => `<path class="${a.trees[TREES[i].id] ? 'on' : ''}" d="M${x} ${y} Q ${(x + 50) / 2} ${y < 50 ? 30 : 70} 50 50" pathLength="100"/>`).join('');
    const said = a.steps ? VISIONS[Math.min(VISIONS.length, a.steps) - 1] : 'Somewhere in the Emerald Dream, four of Ysera\'s chosen have stopped answering.';
    const prev = st.early ? `<span class="wbprevs"><button class="wbprev" data-act="worldseal" data-how="grant" data-raid="${b.id}">Wake next tree (preview only)</button><button class="wbprev" data-act="worldseal" data-how="grantall" data-raid="${b.id}">Wake all</button><button class="wbprev" data-act="worldseal" data-how="reset" data-raid="${b.id}">Reset trees</button></span>` : '';
    const note = a.pretend ? '<span class="wbpretend">Preview pretend mode: nothing is saved</span>' : '';
    const fold = !a.ready && folded(b.id, !a.steps && !(a.echo && Object.values(a.echo).some(Boolean)));
    return `${note}<div class="wbwrap"><div class="wbcard wbsealed dreamseal ${a.ready ? 'ready' : ''} ${fold ? 'folded' : ''}" data-foldbox data-raid="${b.id}"><i class="wbart" style="background-image:url(assets/draft/arena/raid-${b.id}.jpg)"></i><i class="dbmist" aria-hidden="true"></i>
      <span class="wbsay"><small class="wbkick">World Boss · The Emerald Dream</small><b class="dbsleep">The Great Trees sleep</b><span class="dbvis">“${esc(said)}”</span>
      <span class="wbfoldrow"><span class="dbprog"><b>${a.steps}</b> of ${TREES.length} Great Trees awake</span>${a.ready ? '' : foldBtn(b.id, 'the trees', fold)}</span>
      <span class="wbmore"><div class="dbmap">${TREES.map(cell).join('')}<div class="dbheart" aria-hidden="true" style="--p:${a.steps / TREES.length}"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${roots}</svg><i class="dbcore"></i></div></div>
      ${a.ready ? `<button class="wbbreak dbenter" data-act="worldforge" data-raid="${b.id}">Enter the Dream</button>` : '<span class="dbhint">Each Great Tree is guarded by a Dream Trial: a Gear Draft with a twist and a DPS mark for your class. Walk them in order, as often as you like.</span>'}</span></span></div>${prev}</div>`;
  }

  function dreamCardHtml(b) {
    const st = status[b.id], saved = load(), mid = saved && saved.raid === b.id, away = st && st.tried && !st.done && !st.mine && !mid, done = st && (st.done || away), today = st && st.today;
    const met = today && today.dragon ? DRAGONS[today.dragon] : mid && Number.isInteger(saved.seed) ? DRAGONS[dragonOf(saved.seed)] : null;
    const drags = `<span class="dbdrags" aria-label="Ysondre, Lethon, Emeriss and Taerar">${DRAGON_IDS.map((k, i) => `<span class="dbdrag ${met && met.id === k ? 'today' : ''}" style="--c:${DRAGONS[k].color};--i:${i}"><i><img src="${DRAGONS[k].portrait}" alt=""></i><small>${esc(DRAGONS[k].name)}</small></span>`).join('')}</span>`;
    const said = st && st.done && today ? `<span class="wbtoday ${today.won ? 'won' : 'lost'}"><b>${met ? esc(met.name) : 'The dragon'} ${today.won ? `slain in ${mmss(today.time)}` : `stood at ${Math.round(today.health * 100)}%`}</b><span class="wbparty">${today.party.map((c) => `<img src="assets/classes/${c}.png" alt="">`).join('')}</span></span>` : away ? '<span class="wbtoday lost"><b>Your attempt is under way on another device</b></span>' : '';
    const go = done ? said : `<span class="wbgo">${mid ? `Continue against ${met ? esc(met.name) : 'the dragon'}` : 'Call the Nightmare'}</span>`;
    const side = done ? `<span class="wbtally wbwait"><small>The Dream opens in</small><b data-wbleft="${st.next}">${clockOf(st.next)}</b><small>at ${localTime(st.next)}</small></span>` : `<span class="wbtally"><b>${num(st ? st.kills || 0 : 0)}</b><small>${st && st.kills === 1 ? 'kill' : 'kills'}</small></span>`;
    const chip = done ? '' : `<span class="wbstate ${mid ? 'live' : 'ready'}"><b>${mid ? 'Under way' : 'Ready'}</b><small>${mid ? 'Pick up where you left off' : 'One of four answers · one attempt today'}</small></span>`;
    const keyBtn = done && st && st.done && st.keys > 0 ? `<button class="wbkeybtn" data-act="worldkey" data-raid="${b.id}"><img src="assets/icons/${DARK_KEY.icon}.png" alt="">Use a ${esc(DARK_KEY.name)} <small>(${st.keys} held)</small></button>` : '';
    const pastBtn = st && st.tries > 0 ? `<button class="wbpastbtn" data-act="worldpast" data-raid="${b.id}">Your past attempts <small>(${st.tries > 10 ? 'last 10' : st.tries})</small></button>` : '';
    const reset = st && st.early ? `<span class="wbprevs">${done ? `<button class="wbprev" data-act="worldreset" data-raid="${b.id}">Reset lockout (preview only)</button>` : ''}${st.attune ? `<button class="wbprev" data-act="worldseal" data-how="reset" data-raid="${b.id}">Reset trees (preview only)</button>` : ''}<button class="wbprev" data-act="worldseal" data-how="stock" data-raid="${b.id}">Fill satchel (preview)</button><button class="wbprev" data-act="worldseal" data-how="unstock" data-raid="${b.id}">Empty satchel (preview)</button></span>` : '';
    return `<div class="wbwrap"><button class="wbcard dream ${done ? 'locked' : ''} ${today && today.won ? 'slain' : ''}" data-act="world" data-raid="${b.id}" ${done ? 'aria-disabled="true"' : ''}><i class="wbart" style="background-image:url(assets/draft/arena/raid-${b.id}.jpg)"></i><span class="wbsay"><small class="wbkick">World Boss · ${esc(b.zone)}</small><b class="wbname">${esc(b.name)}</b><span class="wbtext">${esc(b.blurb)}</span>${drags}${st && st.total ? `<span class="wbset">${b.loot.map((l) => `<i class="${(st.have || []).includes(l.id) ? 'on' : ''}" title="${esc(l.name)}"></i>`).join('')}<small>${st.owned} of ${st.total} collected</small></span>` : ''}${chip}${go}</span>${side}</button>${keyBtn}${pastBtn}${reset}</div>`;
  }

  function cardHtml() {
    if (!ticker) ticker = setInterval(tick, 1000);
    return Object.values(WORLD).map((b) => {
      if (b.dragons) return sealed(b.id) ? dreamSealedHtml(b, sealed(b.id)) : dreamCardHtml(b);
      if (sealed(b.id)) return sealedHtml(b, sealed(b.id));
      const st = status[b.id], saved = load(), mid = saved && saved.raid === b.id, away = st && st.tried && !st.done && !st.mine && !mid, done = st && (st.done || away), today = st && st.today;
      const loot = today && today.drops && today.drops.length ? `<span class="wbgot">${today.drops.map((id) => b.loot.find((l) => l.id === id)).filter(Boolean).map((d) => `<img src="assets/icons/${d.icon}.png" alt="${esc(d.name)}" title="${esc(d.name)}" style="--r:${RARITY[d.rarity]}">`).join('')}</span>` : '';
      const said = st && st.done && today ? `<span class="wbtoday ${today.won ? 'won' : 'lost'}"><b>${today.won ? `Slain in ${mmss(today.time)}` : `He stood at ${Math.round(today.health * 100)}%`}</b><span class="wbparty">${today.party.map((c) => `<img src="assets/classes/${c}.png" alt="">`).join('')}</span>${loot}</span>` : away ? '<span class="wbtoday lost"><b>Your attempt is under way on another device</b></span>' : '';
      const go = done ? said : `<span class="wbgo">${mid ? 'Continue your attempt' : 'Begin the hunt'}</span>`;
      const side = done ? `<span class="wbtally wbwait"><small>Returns in</small><b data-wbleft="${st.next}">${clockOf(st.next)}</b><small>at ${localTime(st.next)}</small></span>` : `<span class="wbtally"><b>${num(st ? st.kills || 0 : 0)}</b><small>${st && st.kills === 1 ? 'kill' : 'kills'}</small></span>`;
      const chip = done ? '' : `<span class="wbstate ${mid ? 'live' : 'ready'}"><b>${mid ? 'Under way' : 'Ready'}</b><small>${mid ? 'Pick up where you left off' : 'One attempt today'}</small></span>`;
      const satN = Object.values((st && st.satchel) || {}).reduce((n, x) => n + x, 0);
      const sat = `<span class="wbsat">${satN ? `Satchel: ${satN} consumable${satN === 1 ? '' : 's'}. One per hero, picked before the pull.` : 'Rare consumables from raids can help here: one per hero, picked before the pull.'}</span>`;
      const pips = st && st.total ? `<span class="wbset">${b.loot.map((l) => `<i class="${(st.have || []).includes(l.id) ? 'on' : ''}" title="${esc(l.name)}"></i>`).join('')}<small>${st.owned} of ${st.total} collected</small></span>` : '';
      const keyBtn = done && st && st.done && st.keys > 0 ? `<button class="wbkeybtn" data-act="worldkey" data-raid="${b.id}"><img src="assets/icons/${DARK_KEY.icon}.png" alt="">Use a ${esc(DARK_KEY.name)} <small>(${st.keys} held)</small></button>` : '';
      const pastBtn = st && st.tries > 0 ? `<button class="wbpastbtn" data-act="worldpast" data-raid="${b.id}">Your past attempts <small>(${st.tries > 10 ? 'last 10' : st.tries})</small></button>` : '';
      const reset = st && st.early ? `<span class="wbprevs">${done ? `<button class="wbprev" data-act="worldreset" data-raid="${b.id}">Reset lockout (preview only)</button>` : ''}${st.attune ? `<button class="wbprev" data-act="worldseal" data-how="reset" data-raid="${b.id}">Reset attunement (preview only)</button>` : ''}<button class="wbprev" data-act="worldseal" data-how="stock" data-raid="${b.id}">Fill satchel (preview)</button><button class="wbprev" data-act="worldseal" data-how="unstock" data-raid="${b.id}">Empty satchel (preview)</button></span>` : '';
      return `<div class="wbwrap"><button class="wbcard ${done ? 'locked' : ''} ${today && today.won ? 'slain' : ''}" data-act="world" data-raid="${b.id}" ${done ? 'aria-disabled="true"' : ''}><i class="wbart" style="background-image:url(assets/draft/arena/raid-${b.id}.jpg)"></i><span class="wbsay"><small class="wbkick">World Boss · ${esc(b.zone)}</small><b class="wbname">${esc(b.name)}</b><span class="wbtext">${esc(b.blurb)}</span>${pips}${sat}${chip}${go}</span>${side}</button>${keyBtn}${pastBtn}${reset}</div>`;
    }).join('');
  }

  async function begin(id, how = '') {
    if (busy) return;
    const saved = load();
    if (saved && saved.raid === id) { run = saved; afterLoad(); return; }
    if (sealed(id)) { toast(WORLD[id].dragons ? 'The Great Trees sleep' : 'Something is sealed away', WORLD[id].dragons ? 'Wake all four to enter the Dream' : 'Break the six seals to call it forth'); return; }
    const st = status[id], again = how === 'reset' || new URLSearchParams(location.search).has('again'), key = how === 'key';
    if (st && (st.done || (st.tried && !st.mine)) && !again && !key) {
      const card = root.querySelector(`.wbcard[data-raid="${id}"]`);
      if (card) { card.classList.remove('nope'); void card.offsetWidth; card.classList.add('nope'); }
      if (WORLD[id].dragons) toast(st.today && st.today.won ? 'Today\'s dragon is slain' : 'The Dream is closed until tomorrow', `It opens again at ${localTime(st.next)}, in ${left(st.next)}`);
      else toast(st.today && st.today.won ? `${WORLD[id].short} is already slain today` : `${WORLD[id].short} is waiting for tomorrow`, `He returns at ${localTime(st.next)}, in ${left(st.next)}`);
      return;
    }
    busy = true;
    error = '';
    try {
      const r = await fetch(`${API}/world/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ who: ctx.who(), boss: id, again: again ? 1 : 0, key: key ? 1 : 0 }) });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d || !d.ok) { busy = false; await refresh(id); return; }
      run = newWorld(id, d.day, 0, d.seed);
    } catch { busy = false; return; }
    if (WORLD[id].dragons) await summonDragon(dragonOf(run.seed));
    busy = false;
    afterLoad();
  }

  function afterLoad() {
    viewing = Math.min(run.at, 2);
    chosenCls = '';
    chosenSpec = '';
    verdict = null;
    pulled = null;
    scene.theme(boss().theme || THEME);
    save();
    render();
    showHero();
  }

  function exit() {
    const was = run && run.past;
    run = null;
    pastResult = null;
    if (!was) save();
    scene.theme(ctx.raidTheme());
    refresh();
    ctx.redraw();
    ctx.showHero();
  }

  const heroStats = (i) => {
    const h = team()[i], key = boss().res || 'shadow', res = Math.round(h.res[key] || 0), label = RES_NAME[key] || 'Shadow res';
    if (h.role === 'tank') return `<span>Health <b>${num(h.hp)}</b></span><span>Armor <b>${num(h.armor)}</b></span><span>${label} <b>${res}</b></span>`;
    if (h.role === 'heal') return `<span>Health <b>${num(h.hp)}</b></span><span>Mana <b>${num(h.mana)}</b></span><span>Healing <b>${num(h.heal)}</b></span>`;
    return `<span>Health <b>${num(h.hp)}</b></span><span>DPS <b>${num(h.dps)}</b></span><span>${label} <b>${res}</b></span>`;
  };

  function partyHtml() {
    return ROLES.map((role, i) => {
      const h = run.heroes[i], now = (run.step === 'gear' || run.step === 'party') && run.at === i, filled = h ? SLOTS.filter((s) => s in h.picks).length : 0;
      return `<button class="rhero role-${role} ${now ? 'now' : ''} ${h ? 'set' : ''} ${(h || now) && viewing === i ? 'view' : ''}" ${h || now ? `data-wview="${i}"` : 'disabled'}>${h ? `<img src="assets/classes/${h.cls}.png" alt="">` : '<em></em>'}<div><small>${ROLE_NAME[role]}</small><b>${h ? CLASS_NAME[h.cls] : 'Empty'}</b>${h && run.heroes.every(Boolean) || (h && !now) ? `<div class="rline">${heroStats(i)}</div>` : ''}${h && now ? `<div class="wbfill"><i style="--p:${filled / SLOTS.length}"></i><small>${filled} of ${SLOTS.length} slots</small></div>` : ''}</div></button>`;
    }).join('');
  }

  function knowHtml(compact) {
    return `<div class="wbknow ${compact ? 'compact' : ''}"><h4>Know your enemy</h4><ul>${boss().know.map((k) => `<li title="${esc(k.text)}" ${compact ? 'data-wknow tabindex="0"' : ''}><img src="assets/icons/${k.icon}.png" alt=""><span><b>${esc(k.n)}</b><small>${esc(k.text)}</small></span></li>`).join('')}</ul></div>`;
  }

  const artOf = ctx.artOf;
  const resting = () => ((run && status[run.raid]) || {}).resting || [];
  const restFor = (cls) => run.at === ROLES.length - 1 && W.isResting([...run.heroes.slice(0, run.at).map((h) => h.cls), cls], resting());
  function restHtml(full) {
    const list = resting();
    if (!list.length) return '';
    const comp = (c, i) => `<li><small>${i ? 'The attempt before' : 'Your last attempt'}</small><span>${c.map((cls, k) => `<i style="--cc:${CLASS_COLOR[cls]}"><img src="assets/classes/${cls}.png" alt=""><b>${CLASS_NAME[cls]}</b><em>${ROLE_NAME[ROLES[k]]}</em></i>`).join('')}</span></li>`;
    return `<div class="wrest ${full ? 'full' : ''}"><div class="wresthead"><b>Resting parties</b><small>Your last ${list.length === 1 ? 'party needs' : 'two parties need'} rest and can't face ${esc(boss().name)} again yet. The same classes in different roles are fine.</small></div><ul>${list.map(comp).join('')}</ul>${full ? '<button class="wrestok" data-wact="restok">Choose a new party</button>' : ''}</div>`;
  }
  function pickerHtml() {
    const role = ROLES[run.at], classes = classesFor(role);
    if (!classes.includes(chosenCls)) chosenCls = classes[0];
    const specs = specsFor(role, chosenCls);
    if (!specs.some((s) => s.id === chosenSpec)) chosenSpec = specs.length === 1 ? specs[0].id : '';
    const spec = specs.find((s) => s.id === chosenSpec), choice = choiceOf(role, chosenCls), enter = shownRole !== run.at;
    shownRole = run.at;
    if (choice && !choice.list.some((x) => x.id === chosenPick)) chosenPick = role === 'tank' ? 'shadow' : choice.list[0].id;
    const bonus = choice ? choice.list.find((x) => x.id === chosenPick) : BONUS[role][chosenCls], short = (n) => n.replace(/ (Aura|Totem)$/, '').replace(/ Resistance$/, '');
    const before = partyBonuses(run.heroes.slice(0, run.at)), clash = (x) => before.find((o) => o.once && o.once === x.once), dup = clash(bonus);
    const choices = choice ? `<div class="rchoices">${choice.list.map((x) => `<button class="${x.id === chosenPick ? 'on' : ''} ${stacks(x, before) ? '' : 'dup'}" data-waura="${x.id}" title="${esc(stacks(x, before) ? x.text : `Does not stack with ${clash(x).n}`)}">${esc(short(x.n))}</button>`).join('')}</div>` : '';
    const banners = classes.map((c, i) => `<button class="rbanner ${c === chosenCls ? 'on' : ''} ${restFor(c) ? 'resting' : ''}" data-wcls="${c}" style="--cc:${CLASS_COLOR[c]};--i:${i}" ${restFor(c) ? 'title="This party is resting"' : ''}><span class="rbannerface"><i class="rbannerart" style="background-image:url(${artOf(role, c)})"></i><img src="assets/classes/${c}.png" alt=""><b>${CLASS_NAME[c]}</b>${restFor(c) ? '<em class="wresttag">Resting</em>' : ''}</span></button>`).join('');
    const tabs = specs.length > 1 ? `<div class="rspecpick ${spec ? '' : 'need'}"><small>Choose a spec</small><div class="rpickspecs">${specs.map((s) => `<button class="${s.id === chosenSpec ? 'on' : ''}" data-wspec="${s.id}">${esc(s.name)}</button>`).join('')}</div></div>` : `<small class="rpickspec">${esc(spec.name)}</small>`;
    const named = !run.at && spec;
    return `<div class="rpicker ${enter ? 'enter' : ''}" style="--cc:${CLASS_COLOR[chosenCls]}"><i class="rpickart" style="background-image:url(${artOf(role, chosenCls)})"></i><div class="rembers">${'<i></i>'.repeat(12)}</div><div class="rpickhead">${run.at === ROLES.length - 1 && classes.some(restFor) ? restHtml(false) : ''}<small>Hero ${run.at + 1} of ${ROLES.length} · ${esc(boss().name)}</small><h3>Choose your ${role === 'dps' ? 'damage dealer' : ROLE_NAME[role].toLowerCase()}</h3>${run.at ? '' : `<p class="wbrule">Every hero starts with nothing and drafts all 17 slots. One mulligan for the whole party, one pull, no second chances.</p>${ctx.nameField()}`}</div><div class="rbanners ${classes.length > 3 ? 'many' : ''}">${banners}</div><div class="rpickinfo"><h4>${CLASS_NAME[chosenCls]}</h4>${tabs}${spec ? `<p class="rblurb">${esc(spec.blurb)}</p>` : ''}<div class="rseal"><i></i><div><small>${choice ? esc(choice.label) : 'Party bonus'}</small><b>${esc(bonus.n)}</b><span>${esc(bonus.text)}</span>${dup ? `<em class="rnostack">Does not stack with your ${esc(CLASS_NAME[dup.cls])}'s ${esc(dup.n)}.</em>` : ''}${choices}</div></div></div><button class="rforge" data-wact="hero" ${spec && !restFor(chosenCls) ? '' : 'disabled'} ${named ? `data-named ${ctx.nameOk() ? '' : 'disabled'}` : ''}><span>${restFor(chosenCls) ? 'This party is resting' : spec ? `Gear up your ${CLASS_NAME[chosenCls]}` : 'Choose a spec first'}</span></button></div>${knowHtml(false)}${!run.restSeen && resting().length ? `<div class="wrestpop" role="dialog" aria-modal="true" aria-label="Resting parties">${restHtml(true)}</div>` : ''}`;
  }

  const gains = (id) => { const want = `r${boss().res || 'shadow'}`; return Object.entries(pool.items[id][7]).filter(([k]) => STAT[k]).sort((a, b) => (b[0] === want) - (a[0] === want) || b[1] - a[1]).slice(0, 3).map(([k, v]) => `<span class="${k === want ? 'wres' : ''}">+${v}${PERCENT.has(k) ? '%' : ''} ${STAT[k]}</span>`).join(''); };

  const touch = matchMedia('(hover: none)').matches;
  const GROUP = { finger1: 'finger', finger2: 'finger', trinket1: 'trinket', trinket2: 'trinket' };
  const tierOf = (hero, slot, id) => { const g = pool.pools[hero.role][hero.cls][GROUP[slot] || slot] || {}; for (const [t, ids] of Object.entries(g)) if (ids.includes(id)) return TIER_NAME[t]; return ''; };
  const pair = (s) => !!GROUP[s];

  function slotHtml(hero, offer, s) {
    const id = hero.picks[s];
    if (s in hero.picks) {
      if (!id) return `<div class="slot blocked"><span class="ic"></span><span class="tx"><b>${s === 'off' ? 'Two-hand weapon' : ''}</b><small>${SLOT_NAME[s]}</small></span></div>`;
      const it = pool.items[id];
      return `<div class="slot kept ${justTook === s ? 'took' : ''}" data-item="${id}" style="--q:${ctx.QUALITY[it[1]]}"><span class="ic"><img src="${icon(id)}" alt=""></span><span class="tx"><b style="color:${ctx.QUALITY[it[1]]}">${esc(it[0])}</b><small>${SLOT_NAME[s]} · kept</small></span></div>`;
    }
    const o = offer[s];
    if (!o) return `<div class="slot blocked"><span class="ic"></span><span class="tx"><b></b><small>${SLOT_NAME[s]}</small></span></div>`;
    const it = pool.items[o], two = hands === s ? handsFor(pool, run, s, o) : [];
    if (two.length > 1) return `<div class="slot offer ask" style="--q:${ctx.QUALITY[it[1]]}"><span class="ic"><img src="${icon(o)}" alt=""></span><span class="tx"><b>Which hand?</b><span class="wwhich">${two.map((t) => `<button data-wtake="${s}|${t}">${SLOT_NAME[t]}</button>`).join('')}</span></span></div>`;
    return `<button class="slot offer ${it[1] >= 4 ? 'epic' : ''} ${it[1] >= 5 ? 'legend' : ''}" data-wslot="${s}" data-item="${o}" style="--q:${ctx.QUALITY[it[1]]};--i:${SLOTS.indexOf(s)}"><span class="ic"><img src="${icon(o)}" alt=""></span><span class="tx"><b style="color:${ctx.QUALITY[it[1]]}">${esc(it[0])}</b><small>${[SLOT_NAME[s], tierOf(hero, s, o)].filter(Boolean).join(' · ')}</small></span></button>`;
  }

  function gearHtml() {
    const hero = run.heroes[run.at], offer = gearOffers(pool, run), filled = SLOTS.filter((s) => s in hero.picks).length, key = `${run.at}|${hero.round}|${run.rolls}`;
    fresh = key !== rolled ? 'roll' : '';
    rolled = key;
    return `<div class="wghead"><div><small>${ROLE_NAME[hero.role]} · ${filled} of ${SLOTS.length} slots</small><h3>Gear up your ${CLASS_NAME[hero.cls]}</h3><span class="wghint">${touch ? 'Tap an item to inspect it' : 'Keep one item, the rest reroll'}</span></div><button class="gmini wmull" data-wact="mull" ${run.mulligan ? '' : 'disabled'} title="One mulligan for the whole party">${run.mulligan ? 'Mulligan (1 for the party)' : 'Mulligan used'}</button></div><div class="col wcol l ${fresh}">${LEFT.map((s) => slotHtml(hero, offer, s)).join('')}</div><div class="col wcol r ${fresh}">${RIGHT.map((s) => slotHtml(hero, offer, s)).join('')}</div>${knowHtml(true)}`;
  }

  function inspect(slot) {
    const id = gearOffers(pool, run)[slot], sheet = document.getElementById('sheet');
    if (!id || !sheet) return take(slot);
    const both = pair(slot) ? [slot] : handsFor(pool, run, slot, id), hero = run.heroes[run.at];
    document.getElementById('sheetBody').innerHTML = ctx.tooltip(id, hero.picks);
    const keep = document.getElementById('sheetKeep'), close = () => { sheet.hidden = true; };
    keep.hidden = both.length > 1;
    keep.onclick = (e) => { e.stopPropagation(); close(); take(slot, slot); };
    for (const [el, to] of [['sheetMain', 'main'], ['sheetOff', 'off']]) {
      const b = document.getElementById(el);
      b.hidden = !(both.length > 1 && both.includes(to));
      b.onclick = (e) => { e.stopPropagation(); close(); take(slot, to); };
    }
    sheet.hidden = false;
  }

  function forecast() {
    if (verdict) return verdict;
    const heroes = team(), b = boss(), runs = [11, 23, 37, 41, 53, 67, 71, 83].map((s) => fight(heroes, b, s * 7919 + run.day, variance(s * 7919 + run.day, W.ROLL || 1), {}));
    const avg = (f) => runs.reduce((a, r) => a + f(r), 0) / runs.length;
    verdict = { wins: runs.filter((r) => r.won).length / runs.length, tank: avg((r) => r.totals[0].took / r.time), heal: avg((r) => r.totals[1].healed / r.time), dps: avg((r) => (r.totals[0].dealt + r.totals[2].dealt) / r.time), oom: runs.filter((r) => r.totals[1].oomAt).length };
    return verdict;
  }

  function bossHtml() {
    const b = boss(), f = forecast(), [, word, tone] = [...VERDICT].reverse().find(([at]) => f.wins >= at), hp = bossHealth(b, null);
    return `<div class="gpanel rboss-card wbpull"><div class="rtitle"><div><small>World Boss · ${esc(b.zone)}</small><h3>${esc(b.name)}</h3></div><span class="rverdict ${tone}">${word}</span></div><p>${esc(b.blurb)}</p>
      <div class="rtests"><div><b>Survive</b><span>Tank takes ${num(f.tank)} a second</span></div><div><b>Heal</b><span>Healer restores ${num(f.heal)} a second${f.oom ? ', runs out of mana' : ''}</span></div><div><b>Burn</b><span>${num(f.dps)} DPS against ${num(hp)} health before ${esc(b.clockAt || 'Supreme Mode')} at ${Math.floor(b.supreme / 60)}:${String(b.supreme % 60).padStart(2, '0')}</span></div></div>
      <h4 class="wconsh">Consumables</h4>${consHtml()}
      ${error ? `<p class="rwarn">${esc(error)}</p>` : ''}<div class="rpulls one"><button class="rforge wbforge" data-wact="pull" ${busy ? 'disabled' : ''}><span>${busy ? 'Summoning…' : `Face ${esc(b.name)}`}</span></button></div><p class="wbonce">This is your only attempt today. There is no second pull.</p></div>${knowHtml(true)}`;
  }

  const newDrops = () => (pulled && pulled.drops ? pulled.drops.map((id) => boss().loot.find((l) => l.id === id)).filter(Boolean) : []);

  function overHtml() {
    const b = boss(), r = run.result, st = status[run.raid] || {}, next = (pulled && pulled.next) || resetAt(run.day), kills = pulled ? pulled.kills : st.kills;
    const dupes = dropsOf(run).filter((d) => !newDrops().some((n) => n.id === d.id));
    return `<div class="gpanel rsummary wbover ${r.won ? 'won' : 'lost'}"><small>World Boss · ${esc(b.zone)}</small><h2>${r.won ? `${esc(b.name)} is slain` : `${esc(b.name)} stands`}</h2><div class="rbig">${r.won ? '<i class="wbrays"></i>' : ''}${r.won ? mmss(r.time) : `${Math.round(r.health * 100)}%`}</div><p class="rlabel">${r.won ? 'time to kill' : `health left · ${b.dragon ? 'the Dream opens again' : 'he returns'} at ${localTime(next)}`}</p>
      ${newDrops().map((d) => `<button class="wbdropbtn" data-winn="${d.id}" style="--r:${RARITY[d.rarity]}"><img src="assets/icons/${d.icon}.png" alt=""><span><small>${d.rarity} collectible · new</small><b>${esc(d.name)}</b></span><em>See it in the Inn</em></button>`).join('')}${dupes.length ? `<p class="wbdupe">${dupes.map((d) => esc(d.name)).join(', ')} dropped again, but you already own it.</p>` : ''}
      ${pulled && pulled.keyed ? `<div class="wbdropbtn wbkeygot" style="--r:#3dffb0"><img src="assets/icons/${DARK_KEY.icon}.png" alt=""><span><small>Mythic · new</small><b>${esc(DARK_KEY.name)}</b></span><em>${pulled.keys} held</em></div>` : ''}${pulled && pulled.complete ? '<p class="wbdupe wbdone">Collection complete. Keys of the Dark Portal can now drop.</p>' : ''}
      <div class="wbstats"><span><b>${num(kills || 0)}</b><small>${kills === 1 ? 'kill' : 'kills'} of ${esc(host().short)}</small></span><span><b data-wbleft="${next}">${clockOf(next)}</b><small>${b.dragon ? 'until the Dream opens' : 'until he returns'}</small></span></div>
      <div class="rsumparty">${run.heroes.map((h) => `<div class="rsumhero"><img src="assets/classes/${h.cls}.png" alt=""><span><small>${ROLE_NAME[h.role]}</small><b>${CLASS_NAME[h.cls]}</b></span></div>`).join('')}</div>
      <button class="gbtn big" data-wact="leave">Back to the raids</button></div>`;
  }

  function startTick() {
    if (!ticker) ticker = setInterval(tick, 1000);
  }

  function render() {
    if (!run) return;
    root.dataset.step = run.step === 'gear' ? 'draft' : run.step;
    root.dataset.mode = 'world';
    root.dataset.wboss = boss().dragon ? 'dream' : 'kazzak';
    document.body.classList.add('raidrun');
    const side = root.querySelector('.rside');
    root.querySelector('.rtop').innerHTML = `<div class="wbhead"><img src="${boss().dragon ? boss().portrait : 'assets/icons/136224.png'}" alt="" style="object-fit:cover"><span><small>${run.past ? 'World Boss · your past attempts' : 'World Boss · one attempt today'}</small><b>${esc(boss().name)}</b></span></div>${run.past ? '' : `<div class="rparty">${partyHtml()}</div>`}`;
    if (run.step === 'party') side.innerHTML = pickerHtml();
    else if (run.step === 'gear') side.innerHTML = gearHtml();
    else if (run.step === 'boss') side.innerHTML = bossHtml();
    else if (run.step === 'over') { side.innerHTML = overHtml(); startTick(); }
    else if (run.step === 'past') side.innerHTML = pastHtml();
    else side.innerHTML = '';
    const shown = run.heroes[viewing];
    root.querySelector('.portrait').src = `assets/classes/${shown ? shown.cls : chosenCls || 'WARRIOR'}.png`;
    root.querySelector('.peekwho').textContent = shown ? CLASS_NAME[shown.cls] : CLASS_NAME[chosenCls] || '';
    root.querySelector('.rstage .sub').textContent = shown ? ROLE_NAME[shown.role] : ROLE_NAME[ROLES[run.at]] || '';
    root.querySelector('.rstage').className = `rstage ${shown ? `role-${shown.role}` : run.step === 'party' ? `role-${ROLES[run.at]}` : ''}`;
    root.querySelector('.peekdoll').innerHTML = run.step === 'fight' ? '' : dollHtml();
    root.querySelector('.rctl').innerHTML = run.step === 'fight' ? `${[1, 2, 4].map((n) => `<button class="gmini sp ${scene.speed === n ? 'on' : ''}" data-wspeed="${n}">${n}x</button>`).join('')}<button class="gmini" data-wact="skip">Skip</button>` : '';
    ctx.bindName(root);
    bind();
  }

  function dollHtml() {
    const hero = run.heroes[viewing];
    if (!hero) return '';
    const art = (s) => (s.startsWith('finger') ? 'finger' : s.startsWith('trinket') ? 'trinket' : s);
    return ctx.PANE.map(([s, x, y]) => {
      if (s === 'tabard' && run.step !== 'party' && run.step !== 'over' && (!run.past || (run.consume || [])[viewing])) { const c = CONSUMABLE[(run.consume || [])[viewing]]; return `<button class="ps wvial${c ? ' on' : ''}" data-wvial="${viewing}" title="${c ? esc(c.name) : 'Consumable slot: tap to open your satchel'}" aria-label="${c ? esc(c.name) : 'Consumable slot'}" style="left:calc(var(--u)*${x});top:calc(var(--u)*${y})${c ? `;--q:${TIERS[c.tier].color}` : ''}">${c ? `<img src="assets/icons/${c.icon}.png" alt="">` : '<i>+</i>'}</button>`; }
      const id = hero.picks[s], dead = s === 'shirt' || s === 'tabard';
      return `<button class="ps${id ? ' on' : ''}${dead ? ' dead' : ''}" data-pslot="${s}" data-item="${id || ''}" style="left:calc(var(--u)*${x});top:calc(var(--u)*${y});background-image:url(assets/draft/ui/${art(s)}.png)${id ? `;--q:${ctx.QUALITY[pool.items[id][1]]}` : ''}" tabindex="-1">${id ? `<img src="${icon(id)}" alt="">` : ''}</button>`;
    }).join('');
  }

  function bind() {
    const on = (sel, fn) => { for (const el of root.querySelectorAll(sel)) el.onclick = (e) => fn(el, e); };
    on('[data-wact]', (el) => act(el.dataset.wact));
    on('[data-wcls]', (el) => { chosenCls = el.dataset.wcls; chosenSpec = ''; viewing = run.at; render(); showHero(); });
    on('[data-wspec]', (el) => { chosenSpec = el.dataset.wspec; viewing = run.at; render(); showHero(); });
    on('[data-waura]', (el) => { chosenPick = el.dataset.waura; render(); });
    on('[data-wslot]', (el) => (touch ? inspect(el.dataset.wslot) : take(el.dataset.wslot)));
    on('[data-wtake]', (el) => { const [s, to] = el.dataset.wtake.split('|'); take(s, to); });
    on('[data-wview]', (el) => { if (run.step === 'fight') return; viewing = +el.dataset.wview; render(); showHero(); });
    on('[data-wknow]', (el) => { const was = el.classList.contains('open'); for (const x of root.querySelectorAll('[data-wknow].open')) x.classList.remove('open'); el.classList.toggle('open', !was); });
    on('[data-winn]', (el) => openInn(+el.dataset.winn));
    on('[data-wvial]', (el) => pickConsumable(+el.dataset.wvial));
    on('[data-wcon]', (el) => { viewing = +el.dataset.wcon; render(); showHero(); pickConsumable(viewing); });
    on('[data-wpast]', (el) => showPast(+el.dataset.wpast));
    on('[data-wscope]', (el) => { const to = el.dataset.wscope, list = to === 'all' ? pastAll : pastMine; if (!list || !list.length || to === pastScope) return; pastScope = to; pasts = list; showPast(0); });
    on('[data-wspeed]', (el) => { scene.speed = +el.dataset.wspeed; for (const b of root.querySelectorAll('[data-wspeed]')) b.classList.toggle('on', b === el); });
  }

  function fly(from, slot) {
    const target = root.querySelector(`.peekdoll [data-pslot="${slot}"]`);
    if (!from || !target || matchMedia('(prefers-reduced-motion: reduce)').matches) { if (target) target.classList.add('land'); return; }
    const a = from.rect, b = target.getBoundingClientRect(), f = new Image();
    if (!a.width || !b.width || b.bottom < 0 || b.top > innerHeight) { target.classList.add('land'); return; }
    f.src = from.src;
    f.className = 'flight';
    f.style.left = `${a.left}px`;
    f.style.top = `${a.top}px`;
    document.body.append(f);
    requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transform = `translate(${b.left - a.left - 4}px,${b.top - a.top - 4}px) scale(.8)`; }));
    setTimeout(() => { f.remove(); target.classList.add('land'); }, 390);
  }

  function take(slot, to) {
    const offer = gearOffers(pool, run), id = offer[slot];
    if (!id) return;
    const both = pair(slot) ? [slot] : handsFor(pool, run, slot, id);
    if (!to && both.length > 1) { hands = slot; render(); return; }
    hands = '';
    const at = run.at, img = root.querySelector(`[data-wslot="${slot}"] img, .slot.ask img`), from = img && { src: img.src, rect: img.getBoundingClientRect() };
    takeGear(pool, run, slot, to || slot);
    verdict = null;
    save();
    if (run.at !== at) {
      const done = run.heroes[at];
      viewing = Math.min(run.at, 2);
      render();
      showHero();
      const card = root.querySelector(`[data-wview="${at}"]`);
      if (card) card.classList.add('geared');
      toast(`${CLASS_NAME[done.cls]} is ready`, run.at >= 3 ? `Your party is complete. Face ${boss().name}.` : `${SLOTS.filter((s) => done.picks[s]).length} items kept`);
      return;
    }
    justTook = to || slot;
    render();
    justTook = '';
    fly(from, to || slot);
    ctx.dress(() => scene.wear(to || slot, id));
  }

  function toast(title, line) {
    const t = document.createElement('div');
    t.className = 'wbtoast';
    t.innerHTML = `<b>${esc(title)}</b><small>${esc(line)}</small>`;
    document.body.append(t);
    setTimeout(() => t.classList.add('out'), 2200);
    setTimeout(() => t.remove(), 2600);
  }

  function showHero() {
    if (run.step === 'party' && !run.heroes[viewing]) { const role = ROLES[run.at], cls = chosenCls || classesFor(role)[0]; return ctx.dress(() => scene.hero({ cls, picks: {}, role, build: chosenSpec || specsFor(role, cls)[0].id })); }
    const h = run.heroes[viewing];
    if (!h) return null;
    return ctx.dress(() => scene.hero({ cls: h.cls, picks: { ...h.picks }, role: h.role, build: h.build }));
  }

  function satchel() { return (status[run ? run.raid : 'kazzak'] || {}).satchel || {}; }
  function pickConsumable(i) {
    const hero = run && run.heroes[i];
    if (!hero || busy || run.past || run.step === 'fight' || run.step === 'over') return;
    run.consume ||= [0, 0, 0];
    const reserved = {};
    run.consume.forEach((id, k) => { if (id && k !== i) reserved[id] = (reserved[id] || 0) + 1; });
    openSatchel(satchel(), { hero, reserved, current: run.consume[i] || 0, title: `${CLASS_NAME[hero.cls]} · consumable`, onUse: (id) => {
      run.consume[i] = id;
      verdict = null;
      save();
      render();
      const v = root.querySelector('[data-wvial]');
      if (v && id) { v.classList.add('drink'); toast(`${CONSUMABLE[id].name} uncorked`, CONSUMABLE[id].line); }
    } });
  }
  function consHtml() {
    const c = run.consume || [];
    return `<div class="wcons" aria-label="Consumables">${run.heroes.map((h, i) => { const k = CONSUMABLE[c[i]]; return `<button type="button" class="${k ? 'on' : ''}" data-wcon="${i}" style="${k ? `--q:${TIERS[k.tier].color}` : ''}">${k ? `<img src="assets/icons/${k.icon}.png" alt="">` : '<i>+</i>'}${CLASS_NAME[h.cls]}: ${k ? esc(k.line) : 'no consumable'}</button>`; }).join('')}</div>`;
  }

  async function pull() {
    if (busy || run.step !== 'boss') return;
    busy = true;
    error = '';
    render();
    let d = null;
    try {
      const r = await fetch(`${API}/world/pull`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ who: ctx.who(), name: ctx.heroName(), boss: run.raid, day: run.day, moves: run.moves, consume: run.consume || [0, 0, 0], roll: W.ROLL || 1 }) });
      d = await r.json().catch(() => null);
      if (!r.ok || !d || !d.ok) { busy = false; if (d && d.error === 'satchel') { run.consume = [0, 0, 0]; save(); await refresh(run.raid); error = 'Your satchel changed. Pick your consumables again.'; render(); return; } error = d && d.error === 'resting' ? 'This party is resting from one of your last two attempts. Start over with a different party.' : d && d.error === 'locked' ? 'Your attempt for today is already spent.' : `${boss().short} could not be reached. Try again.`; if (d && d.error === 'locked') { run = null; save(); refresh(); ctx.redraw(); return; } render(); return; }
    } catch { busy = false; error = `${boss().short} could not be reached. Try again.`; render(); return; }
    pulled = d;
    if (d.satchel && status[run.raid]) status[run.raid].satchel = d.satchel;
    run.roll = d.roll === 2 ? 2 : 1;
    const heroes = team(), b = boss(), result = pullWorld(pool, run, d.salt, heroes), why = explain(result).replace('the boss enraged', b.lost);
    try { localStorage.setItem(`${KEY}Done`, JSON.stringify({ day: run.day, raid: run.raid })); } catch {}
    save();
    run.step = 'fight';
    render();
    root.querySelector('.rscene').scrollIntoView({ block: 'start', behavior: 'smooth' });
    await ctx.dress(() => scene.stageRaid(run.heroes.map((h, i) => ({ ...h, ...heroes[i] })), b, { world: true, title: b.title, theme: b.theme || THEME }));
    scene.banner(`<small>World Boss · ${esc(b.zone)}</small><h2>${esc(b.name)}</h2><small>One attempt. Make it count.</small>`, 'vs');
    await new Promise((done) => { setTimeout(done, 1500); });
    busy = false;
    scene.play(result, null, { onEnd: () => finished(result, why) });
  }

  function breakdownHtml(result) {
    const dealt = result.totals.reduce((n, h) => n + h.dealt, 0) || 1, top = Math.max(...result.totals.map((h) => h.dealt), 1), k = (n) => (n >= 1e4 ? `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}k` : num(n));
    return `<ul class="rbreak">${result.totals.map((t, i) => {
      const h = run.heroes[i], spec = (specsFor(h.role, h.cls).find((x) => x.id === h.build) || {}).name || CLASS_NAME[h.cls];
      const side = h.role === 'tank' ? `Took ${k(t.took)}` : h.role === 'heal' ? `Healed ${k(t.healed)}` : `${Math.round(t.dealt / Math.max(1, result.time))} dps`;
      return `<li class="${t.dead ? 'dead' : ''}" style="--k:${CLASS_COLOR[h.cls]};--w:${t.dealt / top}"><img src="assets/classes/${h.cls}.png" alt=""><span><b>${esc(spec)} ${CLASS_NAME[h.cls]}</b><small>${side}${t.dead ? ' · died' : ''}</small></span><i></i><em>${k(t.dealt)}<small>${Math.round(t.dealt / dealt * 100)}%</small></em></li>`;
    }).join('')}</ul>`;
  }

  const openInn = (id) => import('../draft/hearth.js?v=20261127190000').then((m) => m.openInn(id)).catch(() => {});

  function toOver() {
    run.step = 'over';
    ctx.after();
    refresh(run.raid);
    render();
    showHero();
    ctx.loadBoard(run.raid);
    root.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function finished(result, why) {
    const b = boss(), drops = newDrops(), dealt = result.totals.reduce((n, h) => n + h.dealt, 0);
    const stats = result.won ? [[mmss(result.time), 'Time to kill'], [num(dealt), 'Damage dealt'], [num(pulled.kills || 1), `${b.short} ${pulled.kills === 1 ? 'kill' : 'kills'}`]] : [[`${Math.round(result.health * 100)}%`, 'Health left'], [num(dealt), 'Damage dealt'], [Math.round(result.time), 'Seconds']];
    const hoard = !result.won ? '' : b.dragon ? `<div class="wbtease" style="--r:#8dffc0"><i></i><span><b>${esc(b.name)} fades back into the Dream</b><small>Search what it left behind</small></span></div>` : `<div class="wbtease" style="--r:#ffd76a"><i></i><span><b>${esc(b.name)}'s hoard lies open</b><small>Search it and see what the Highlord left behind</small></span></div>`;
    scene.banner(resultHtml({ title: result.won ? 'Victory' : 'Defeat', stats, note: esc(why), extra: breakdownHtml(result) + hoard, action: result.won ? 'Search the remains' : 'See your run' }), `result ${result.won ? 'win loot' : 'lose'}`);
    root.querySelector('[data-next]').onclick = async () => {
      if (!result.won) { toOver(); return; }
      root.querySelector('.banner3d').hidden = true;
      const have = Object.fromEntries((pulled.have || []).map((id) => [id, 1]));
      await walkout({ title: `${b.name}'s hoard`, from: b.name, drops, keyed: pulled.keyed, complete: pulled.complete, owned: pulled.owned || 0, full: (pulled.owned || 0) >= b.loot.length, loot: b.loot, have, key: DARK_KEY, keys: pulled.keys || 1, onInn: (d) => setTimeout(() => openInn(d.id), 350) });
      toOver();
    };
  }

  function act(a) {
    if (a === 'restok') { run.restSeen = 1; save(); render(); return; }
    if (a === 'hero') {
      if (!chosenSpec || restFor(chosenCls)) return;
      addHero(run, chosenCls, chosenSpec, chosenPick || undefined);
      chosenPick = '';
      viewing = run.at;
      save();
      render();
      showHero();
    } else if (a === 'mull') {
      if (!run.mulligan) return;
      const box = root.querySelector('.wcol.l');
      if (box && !matchMedia('(prefers-reduced-motion: reduce)').matches) for (const c of root.querySelectorAll('.wcol')) c.classList.add('mull');
      setTimeout(() => { if (mulligan(run)) { hands = ''; save(); render(); } }, box ? 260 : 0);
    }
    else if (a === 'pull') pull();
    else if (a === 'watch') watch();
    else if (a === 'skip') scene.skip();
    else if (a === 'leave') exit();
  }

  async function openPast(id = 'kazzak') {
    if (busy) return;
    busy = true;
    let key = null;
    try { key = localStorage.getItem('draftKey'); } catch {}
    const mine = fetch(`${API}/world/mine?boss=${id}&who=${ctx.who()}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const all = key ? fetch(`${API}/world/all`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, boss: id }) }).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null);
    const [d, e] = await Promise.all([mine, all]);
    busy = false;
    pastMine = ((d && d.runs) || []).map((x) => ({ ...x, raid: id }));
    pastAll = e && e.runs ? e.runs.map((x) => ({ ...x, raid: id })) : null;
    pastScope = pastMine.length || !pastAll ? 'mine' : 'all';
    pasts = pastScope === 'mine' ? pastMine : pastAll;
    if (!pasts.length) { toast('No attempts to show yet', d ? `Face ${WORLD[id].short} first` : `${WORLD[id].short} could not be reached. Try again.`); return; }
    showPast(0);
  }

  function showPast(i) {
    const e = pasts[i];
    if (!e || busy) return;
    let r;
    try { r = newPast(e); } catch { toast('This attempt could not be replayed', 'It was made with an older version of the draft'); return; }
    run = r.run;
    pastResult = r.result;
    viewing = Math.min(viewing, 2);
    verdict = null;
    scene.theme(boss().theme || THEME);
    render();
    showHero();
  }

  function newPast(e) {
    const r = W.replayDraft(pool, e.raid, e.day, e.moves, e.seed);
    r.consume = e.used || [0, 0, 0];
    r.salt = e.salt;
    r.past = e;
    r.over = true;
    const party = worldParty(pool, r), b = W.bossOf(r), seed = W.fightSeed(r);
    const same = (x) => !!x.won === !!e.won && Math.round(x.time * 10) / 10 === e.time && Math.round(Math.max(0, x.health) * 1000) / 1000 === e.health;
    let result = null;
    for (const roll of [1, 2]) { const x = fight(party, b, seed, variance(seed, roll), {}); if (same(x)) { result = x; r.roll = roll; break; } if (!result) result = x; }
    r.step = 'past';
    return { run: r, result };
  }

  const dayName = (at) => new Date(at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  function pastHtml() {
    const e = run.past, r = pastResult, sel = pasts.indexOf(e), k = (n) => (n >= 1e4 ? `${(n / 1e3).toFixed(1)}k` : num(n));
    const who = (x) => (WORLD[x.raid] && WORLD[x.raid].dragons && Number.isInteger(x.seed) ? DRAGONS[dragonOf(x.seed)].name : ''), verdictOf = (x) => (x.won ? `${who(x) ? `${who(x)} slain` : 'Slain'} in ${mmss(x.time)}` : `${who(x) || 'He'} stood at ${Math.max(1, Math.round(x.health * 100))}%`);
    const rows = pasts.map((x, n) => {
      const party = x.moves.filter((m) => m[0] === 'h').map((m) => m[1]), cons = (x.used || []).map((id) => CONSUMABLE[id]).filter(Boolean);
      return `<li><button type="button" class="${n === sel ? 'on' : ''} ${x.won ? 'won' : 'lost'}" data-wpast="${n}" aria-pressed="${n === sel}"><span class="wbpwhen">${pastScope === 'all' ? `<b>${esc(x.name || 'Unknown')}</b><small>${esc(dayName(x.at))} ${esc(localTime(x.at))}</small>` : `<b>${esc(dayName(x.at))}</b><small>${esc(localTime(x.at))}</small>`}</span><span class="wbpparty">${party.map((c) => `<img src="assets/classes/${c}.png" alt="${CLASS_NAME[c]}">`).join('')}</span><span class="wbpcons">${cons.map((c) => `<img src="assets/icons/${c.icon}.png" alt="${esc(c.name)}" title="${esc(c.name)}" style="--q:${TIERS[c.tier].color}">`).join('')}</span><span class="wbpres">${verdictOf(x)}</span></button></li>`;
    }).join('');
    const tabs = run.heroes.map((h, n) => {
      const t = r && r.totals[n], spec = (specsFor(h.role, h.cls).find((x) => x.id === h.build) || {}).name || '';
      const line = t ? (h.role === 'tank' ? `Took ${k(t.took)}` : h.role === 'heal' ? `Healed ${k(t.healed)}` : `Dealt ${k(t.dealt)}`) + (t.dead ? ' · died' : '') : '';
      return `<button type="button" role="tab" aria-selected="${n === viewing}" class="role-${h.role} ${n === viewing ? 'on' : ''}" data-wview="${n}" style="--cc:${CLASS_COLOR[h.cls]}"><img src="assets/classes/${h.cls}.png" alt=""><span><small>${ROLE_NAME[h.role]}</small><b><i class="wbpspec">${esc(spec)} </i>${CLASS_NAME[h.cls]}</b><em>${line}</em></span></button>`;
    }).join('');
    const hero = run.heroes[viewing], c = CONSUMABLE[(run.consume || [])[viewing]];
    const drink = c ? `<li class="wbpdrink" style="--q:${TIERS[c.tier].color}"><img src="assets/icons/${c.icon}.png" alt=""><span><b style="color:${TIERS[c.tier].color}">${esc(c.name)}</b><small>Consumable · ${esc(c.line)}</small></span></li>` : '';
    const items = hero ? SLOTS.filter((s) => hero.picks[s]).map((s) => { const it = pool.items[hero.picks[s]]; return `<li data-item="${hero.picks[s]}"><img src="${icon(hero.picks[s])}" alt=""><span><b style="color:${ctx.QUALITY[it[1]]}">${esc(it[0])}</b><small>${SLOT_NAME[s]}</small></span></li>`; }).join('') : '';
    return `<div class="gpanel wbpast"><div class="wbphead"><div><h3>${pastScope === 'all' ? 'All attempts' : 'Your attempts'}</h3><small>${pastScope === 'all' ? `The last ${pasts.length} attempts by everyone. Moderators only.` : `Your last ${pasts.length === 1 ? 'attempt' : `${pasts.length} attempts`} at ${esc(host().name)}.`} Pick one to look at it.</small></div><button type="button" class="gmini" data-wact="leave">Back</button></div>
      ${pastAll ? `<div class="wbpscope" role="tablist"><button type="button" role="tab" aria-selected="${pastScope === 'mine'}" class="${pastScope === 'mine' ? 'on' : ''}" data-wscope="mine" ${pastMine.length ? '' : 'disabled'}>Mine (${pastMine.length})</button><button type="button" role="tab" aria-selected="${pastScope === 'all'}" class="${pastScope === 'all' ? 'on' : ''}" data-wscope="all">Everyone (${pastAll.length})</button></div>` : ''}
      <ol class="wbplog ${pastScope === 'all' ? 'all' : ''}">${rows}</ol>
      <div class="wbpsel"><div class="wbpbar"><span>${pastScope === 'all' ? `<b>${esc(e.name || 'Unknown')}</b> · ${esc(dayName(e.at))}` : `<b>${esc(dayName(e.at))}</b>`} · ${verdictOf(e)}${e.won ? '' : ` after ${mmss(e.time)}`}</span><button type="button" class="gmini wbpwatch" data-wact="watch">&#9654; Watch the replay</button></div>
      <p class="wbptabsh">Pick a hero to see their gear</p><div class="wbptabs" role="tablist" aria-label="Heroes">${tabs}</div>
      <ul class="wbpgear" role="tabpanel">${drink}${items}</ul></div></div>`;
  }

  async function watch() {
    if (busy || !run || !run.past || !pastResult) return;
    busy = true;
    const b = boss(), result = pastResult, heroes = team(), why = explain(result).replace('the boss enraged', b.lost);
    run.step = 'fight';
    render();
    root.querySelector('.rscene').scrollIntoView({ block: 'start', behavior: 'smooth' });
    await ctx.dress(() => scene.stageRaid(run.heroes.map((h, i) => ({ ...h, ...heroes[i] })), b, { world: true, title: b.title, theme: b.theme || THEME }));
    scene.banner(`<small>Replay · ${esc(dayName(run.past.at))}</small><h2>${esc(b.name)}</h2><small>Your attempt, exactly as it happened</small>`, 'vs');
    await new Promise((done) => { setTimeout(done, 1200); });
    busy = false;
    scene.play(result, null, { onEnd: () => {
      if (!run || !run.past) return;
      const dealt = result.totals.reduce((n, h) => n + h.dealt, 0);
      const stats = result.won ? [[mmss(result.time), 'Time to kill'], [num(dealt), 'Damage dealt']] : [[`${Math.round(result.health * 100)}%`, 'Health left'], [num(dealt), 'Damage dealt'], [Math.round(result.time), 'Seconds']];
      scene.banner(resultHtml({ title: result.won ? 'Victory' : 'Defeat', stats, note: esc(why), extra: breakdownHtml(result), action: 'Back to your attempt' }), `result ${result.won ? 'win' : 'lose'}`);
      const next = root.querySelector('[data-next]');
      if (next) next.onclick = () => { const bn = root.querySelector('.banner3d'); if (bn) bn.hidden = true; run.step = 'past'; render(); showHero(); };
    } });
  }

  async function loadBoard(id = 'kazzak') {
    try { const r = await fetch(`${API}/world/board?boss=${id}&who=${ctx.who()}`); board = r.ok ? await r.json() : null; } catch { board = null; }
  }

  function boardHtml(id = 'kazzak') {
    const b = WORLD[id];
    if (!board) return '<p>The board could not be reached.</p>';
    const time = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '');
    const head = `<p class="rboardcount">${num(board.kills)} ${board.kills === 1 ? 'kill' : 'kills'} in ${num(board.tries)} ${board.tries === 1 ? 'attempt' : 'attempts'} · today ${num(board.today.kills)} of ${num(board.today.tries)}</p>`;
    if (!board.rows.length) return `${head}<p>Nobody has slain ${esc(b.name)} yet.</p>`;
    return head + `<div class="wbrows"><div class="wbrowhead"><span></span><b>Name</b><em>Kills</em><em>Fastest</em></div>${board.rows.map((r) => `<div class="wbrow ${r.mine ? 'mine' : ''}"><span>${r.pos}</span><b>${esc(r.name)}${titleOf(r.t) ? `<small class="ttl">${esc(titleOf(r.t))}</small>` : ''}</b><em>${num(r.kills)}</em><em>${time(r.best)}</em></div>`).join('')}</div>`;
  }

  const saved = load();
  if (saved) run = null;
  refresh();
  async function resetLock(id) {
    try { await fetch(`${API}/world/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ who: ctx.who(), boss: id, again: 1, only: 1 }) }); } catch {}
    try { localStorage.removeItem(KEY); } catch {}
    await refresh(id);
  }

  const trial = (tree) => import('./trialsui.js?v=20261127190000').then((m) => m.openTrial(tree, { API, who: ctx.who, attune: () => status.dream && status.dream.attune, after: (a) => { if (a && status.dream) status.dream.attune = a; ctx.redraw(); } }));
  const dropList = () => openDropList((status.dream || status.kazzak || {}).satchel || {});
  return { cardHtml, dropList, trial, begin, past: openPast, useKey: (id) => begin(id, 'key'), reset: resetLock, seal: sealAct, attune: (id = 'kazzak') => (status[id] && status[id].attune) || null, active: () => !!run, render, showHero, loadBoard, boardHtml, refresh, resume: () => { const s = load(); if (s) { run = s; afterLoad(); } } };
}
