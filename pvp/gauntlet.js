import { CLASS_COLOR } from '../draft/core.js';
import { bindName, heroName, nameField, nameOk } from './name.js';
import { BOON, BOON_KIND, boonIcon, boonsOf } from './boons.js';
import { PLANS, PRESETS, fight } from './engine.js';
import { Arena, THEMES, resultHtml } from './arena.js';
import { CLASSES, gear, references, statsOf } from './gear.js';
import { CONSUME, ENCHANT } from './shop.js';
import { LIVES, MAX_WINS, buyConsume, buyEnchant, className, fakeName, finishRound, itemCount, lowestQuality, makeBot, newRun, paySlot, pickBoon, planNames, rerollPrice, rerollShop, rollShop, sideOf, slotFloor, slotPrice, snapshot, takeItem } from './run.js';

const KEY = 'gauntletRun', WHO = 'gauntletWho';
const API = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'http://localhost:8789' : 'https://azeroth-draft.sanredz.workers.dev';
const SLOT_NAME = { head: 'Head', neck: 'Neck', shoulder: 'Shoulders', back: 'Back', chest: 'Chest', wrist: 'Wrists', hands: 'Hands', waist: 'Waist', legs: 'Legs', feet: 'Feet', finger1: 'Ring', finger2: 'Ring', trinket1: 'Trinket', trinket2: 'Trinket', main: 'Main Hand', off: 'Off Hand', ranged: 'Ranged' };
const RANGED_NAME = { SHAMAN: 'Totem', PALADIN: 'Libram', DRUID: 'Idol', MAGE: 'Wand', PRIEST: 'Wand', WARLOCK: 'Wand' };
const slotName = (s) => (s === 'ranged' && run && RANGED_NAME[run.cls]) || SLOT_NAME[s];
const SLOT_ART = (s) => (s.startsWith('finger') ? 'finger' : s.startsWith('trinket') ? 'trinket' : s);
const ART = { WARRIOR: 'warriorarms', PALADIN: 'priestholy', HUNTER: 'hunterbeastmastery', ROGUE: 'roguecombat', PRIEST: 'priestshadow', SHAMAN: 'shamanrestoration', MAGE: 'magefire', WARLOCK: 'magearcane', DRUID: 'druidferalcombat' };
const FRAME = '<svg class="wframe" viewBox="0 0 240 400" aria-hidden="true"><path class="wline" d="M7 393V120C7 54 55 7 120 7s113 47 113 113v273z"/><path class="wthin" d="M15 385V121C15 60 60 15 120 15s105 45 105 106v264z"/><path class="wleaf" d="M7 318c10 2 16 8 18 18-8-1-16-7-18-18zm226 0c-10 2-16 8-18 18 8-1 16-7 18-18zM7 150c10-2 16-8 18-18-8 1-16 7-18 18zm226 0c-10-2-16-8-18-18 8 1 16 7 18 18z"/><path class="wkey" d="M120 0l13 13-13 13-13-13z"/><path class="wgem" d="M120 6l7 7-7 7-7-7z"/><path class="wkey" d="M120 380l13 13-13 7-13-7z"/><path class="wgem" d="M120 386l6 7-6 4-6-4z"/><circle class="wstud" cx="7" cy="234" r="4"/><circle class="wstud" cx="233" cy="234" r="4"/></svg>';
const RARITY = { 2: 'Uncommon', 3: 'Rare', 4: 'Epic', 5: 'Legendary' };
const BEST = { ROGUE: 'burst', WARRIOR: 'aggressive', DRUID: 'heal', MAGE: 'turtle', WARLOCK: 'drain', PRIEST: 'drain', HUNTER: 'drain', PALADIN: 'fight', SHAMAN: 'ground' };
const BLURB = {
  WARRIOR: 'Charge in, Hamstring and Mortal Strike. Strong until someone keeps you away.',
  PALADIN: 'A two-hander, a six second stun, and a Divine Shield to turn the fight around.',
  HUNTER: 'Shoot from range while your cat bites them. Slows and traps keep them away.',
  ROGUE: 'Start in stealth, stun them, and finish before they act.',
  PRIEST: 'Shadow damage that heals you, with Fear and a shield to stay alive.',
  SHAMAN: 'Fast shocks, Windfury swings and quick heals.',
  MAGE: 'Freeze, Blink away and shatter them with Ice Lance.',
  WARLOCK: 'Stack damage over time, Fear them away, and let your Felhunter do the rest.',
  DRUID: 'Stalk as a cat, bleed them out, and shift out to heal.',
};

let dressNow = 0, shownPick = '', shownShop = '', shownGold = null;
let boardCls = '', boardRows = [], boardOpen = 0, boardMine = false, viewed = null;
let root, ui, arena, pool, gearData, REF, run, screen = 'pick', pickCls = 'WARRIOR', tip, busy = false, tooltip, PANE, QUALITY, dressing = Promise.resolve();
const previews = {};

const save = () => { try { if (run && !run.over) localStorage.setItem(KEY, JSON.stringify(run)); else localStorage.removeItem(KEY); } catch {} };
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const who = () => {
  try {
    let id = localStorage.getItem(WHO);
    if (!id) { id = Math.random().toString(36).slice(2, 14); localStorage.setItem(WHO, id); }
    return id;
  } catch { return 'anon'; }
};
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ago = (at) => {
  const m = Math.floor((Date.now() - at) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
};
const iconOf = (id) => `assets/icons/${pool.items[id][4]}.png`;
const hearts = () => '<span class="heart"></span>'.repeat(LIVES - run.losses) + '<span class="heart gone"></span>'.repeat(run.losses);

function ladder() {
  let html = '';
  for (let i = 1; i <= MAX_WINS; i++) html += `<i class="${i <= run.wins ? 'won' : i === run.wins + 1 ? 'now' : ''}">${i}</i>`;
  return `<div class="ladder">${html}</div>`;
}

function topbar() {
  return `<header class="gbar"><div class="gwho"><img src="assets/classes/${run.cls}.png" alt=""><div><b>${className(run.cls)}</b><div class="gsub"><span>Round ${run.round}</span><div class="glives" title="Lives left">${hearts()}</div></div></div></div>
    <div class="ggold ${shownGold !== null && shownGold !== run.gold ? 'bump' : ''}" title="Gold this round. It does not carry over."><em></em><b>${run.gold}</b></div>
    ${screen === 'shop' ? '<button class="gmini" data-act="quit">Leave</button>' : ''}${ladder()}</header>`;
}

function statsLine() {
  const s = statsOf(pool, run.cls, run.picks), hp = Math.round(s.sta);
  const caster = PRESETS[run.cls].kind === 'caster';
  return `<div class="gstats"><span>Stamina <b>${hp}</b></span><span>Armor <b>${Math.round(s.armor)}</b></span><span>${caster ? 'Spell power' : 'Attack power'} <b>${Math.round(caster ? s.sp : s.ap)}</b></span><span>Crit <b>${(caster ? s.scrit : s.crit).toFixed(1)}%</b></span></div>`;
}

function doll() {
  const art = (s) => (s === 'finger1' || s === 'finger2' ? 'finger' : s === 'trinket1' || s === 'trinket2' ? 'trinket' : s);
  return PANE.map(([s, left, top]) => {
    const id = worn()[s], ench = screen === 'pick' ? '' : run.enchants[s], dead = s === 'shirt' || s === 'tabard';
    return `<button class="ps${id ? ' on' : ''}${dead ? ' dead' : ''}" data-item="${id || ''}" data-extra="${ench ? `Enchanted: ${ENCHANT[ench].name}` : ''}" style="left:calc(var(--u)*${left});top:calc(var(--u)*${top});background-image:url(assets/draft/ui/${art(s)}.png)${id ? `;--q:${QUALITY[pool.items[id][1]]}` : ''}" tabindex="-1">${id ? `<img src="${iconOf(id)}" alt="">` : ''}</button>`;
  }).join('');
}

const boonRow = (ids = []) => (ids.length ? `<span class="gboonrow">${boonsOf(ids).map((b) => `<button data-boonid="${b.id}" aria-label="${esc(b.hero)}: ${esc(b.title)}" title="${esc(b.hero)}: ${esc(b.title)}. ${esc(b.text)}"><img src="${boonIcon(b.id)}" alt=""></button>`).join('')}</span>` : '');
const coin = (n, off) => `<span class="gtag ${off ? 'short' : ''}"><i></i>${n}</span>`;

function shopHtml() {
  const s = run.shop, foe = run.foe, spent = (k) => s.sold.includes(k), key = [run.round, ...s.items, ...s.consumes, ...s.enchants].join(), enter = key !== shownShop;
  shownShop = key;
  const items = s.items.filter((slot) => !spent(slot)).map((slot, i) => {
    const cur = run.picks[slot], bought = run.buys[slot] || 0, price = slotPrice(run.cls, slot), off = run.gold < price, low = lowestQuality(pool, run, slot), tone = QUALITY[low];
    return `<button class="gplinth" data-slot="${slot}" style="--q:${tone};--i:${i}" ${off ? 'disabled' : ''}><span class="gplinthicon"><img src="${cur ? iconOf(cur) : `assets/draft/ui/${SLOT_ART(slot)}.png`}" alt=""></span><b>${slotName(slot)}</b><em style="color:${tone}">${RARITY[low]}+</em><small>Item level ${slotFloor(run, slot)}+${bought ? ` · Bought ${bought}x` : ''}</small>${coin(price, off)}</button>`;
  }).join('');
  const shelf = (attr, id, icon, name, text, price, i) => `<button class="gcard" ${attr}="${id}" style="--i:${i}" ${run.gold < price ? 'disabled' : ''}><span class="gico"><img src="assets/icons/${icon}.png" alt=""></span><span class="gtxt"><b>${name}</b><small>${text}</small></span>${coin(price, run.gold < price)}</button>`;
  const cons = s.consumes.filter((id) => !spent(id)).map((id, i) => { const c = CONSUME[id]; return shelf('data-con', id, c.icon, c.name, c.text, c.price, i + 3); }).join('');
  const ench = s.enchants.filter((id) => !spent(id)).map((id, i) => { const e = ENCHANT[id]; return shelf('data-ench', id, e.icon, e.name, `${slotName(e.slot)}: ${e.text}`, e.price, i + 5); }).join('');
  const plans = planNames(run.cls).map((k) => `<button class="gplan ${k === run.plan ? 'on' : ''}" data-plan="${k}" aria-pressed="${k === run.plan}"><b>${PLANS[run.cls][k].label}</b><small>${PLANS[run.cls][k].tip}</small></button>`).join('');
  const rival = foe ? `<div class="gduelside foe"><img src="assets/classes/${foe.cls}.png" alt=""><b>${esc(foe.name)}</b><small>${className(foe.cls)} · ${run.wins} ${run.wins === 1 ? 'win' : 'wins'}</small>${boonRow(foe.boons)}</div>` : '<div class="gduelside foe"><em></em><b>Finding an opponent</b></div>';
  return `<div class="gduel"><div class="gduelside"><img src="assets/classes/${run.cls}.png" alt=""><b>${esc(heroName())}</b><small>${className(run.cls)} · ${run.wins} ${run.wins === 1 ? 'win' : 'wins'}</small>${boonRow(run.boons)}</div><span class="gvs">VS</span>${rival}<div class="gacts"><span class="ggold gpurse ${shownGold !== null && shownGold !== run.gold ? 'bump' : ''}" title="Gold this round"><em></em><b>${run.gold}</b></span><button class="rforge" data-act="fight" ${foe ? '' : 'disabled'}><span>Fight</span></button></div></div>
      <section class="gstall armor ${enter ? 'enter' : ''}"><header><div><h3>Armorer</h3><em>Pay, then pick 1 of ${itemCount(run)} items. The color shows the lowest rarity you can get.</em></div><button class="greroll" data-act="reroll" ${run.gold < rerollPrice(run) ? 'disabled' : ''}>Reroll ${coin(rerollPrice(run) || 'Free', run.gold < rerollPrice(run))}</button></header><div class="gplinths">${items || '<p class="gsold">Sold out</p>'}</div></section>
      <div class="gcols ${enter ? 'enter' : ''}"><section class="gstall alch"><header><div><h3>Alchemist</h3><em>Next fight only</em></div></header>${cons || '<p class="gsold">Sold out</p>'}</section><section class="gstall ench"><header><div><h3>Enchanter</h3><em>Lasts the whole run</em></div></header>${ench || '<p class="gsold">Nothing to enchant</p>'}</section></div>
      <section class="gstall plan"><header><div><h3>Battle plan</h3><em>How your hero fights</em></div></header><div class="gplans">${plans}</div></section>`;
}

function pickHtml() {
  const saved = load(), fresh = pickCls !== shownPick, enter = !shownPick, art = (c) => `assets/game/art-${ART[c]}.jpg`;
  shownPick = pickCls;
  const banners = CLASSES.map((c, i) => `<button class="rbanner ${c === pickCls ? 'on' : ''} ${c === pickCls && fresh ? 'fresh' : ''}" data-c="${c}" style="--cc:${CLASS_COLOR[c]};--i:${i}"><span class="rbannerface"><i class="rbannerart" style="background-image:url(${art(c)})"></i><img src="assets/classes/${c}.png" alt=""><b>${className(c)}</b></span></button>`).join('');
  return `<div class="rpicker ${enter ? 'enter' : ''}" style="--cc:${CLASS_COLOR[pickCls]}"><i class="rpickart" style="background-image:url(${art(pickCls)})"></i><div class="rembers">${'<i></i>'.repeat(12)}</div><div class="rpickhead"><h3>Choose your champion</h3>${nameField()}</div><div class="rbanners many">${banners}</div><div class="rpickinfo ${fresh ? 'fresh' : ''}"><h4>${className(pickCls)}</h4><small class="rpickspec">${esc(PRESETS[pickCls].name)}</small><p class="rblurb">${BLURB[pickCls]}</p><ul class="grules"><li>Start in simple green gear</li><li>Buy gear, potions and enchants</li><li>Set your plan, then fight</li><li>Face players with your win count</li></ul></div><button class="rforge" data-act="begin" data-named ${nameOk() ? '' : 'disabled'}><span>Begin as ${className(pickCls)}</span></button>${saved ? '<button class="gresume" data-act="resume">Continue your run</button>' : ''}</div>`;
}

function fightHtml() {
  return '<div class="glog"></div>';
}

function speedHtml() {
  return `<button class="gmini sp ${arena.speed === 1 ? 'on' : ''}" data-speed="1">1x</button><button class="gmini sp ${arena.speed === 2 ? 'on' : ''}" data-speed="2">2x</button><button class="gmini sp ${arena.speed === 4 ? 'on' : ''}" data-speed="4">4x</button><button class="gmini" data-act="skip">Skip</button>`;
}

function render() {
  const top = root.querySelector('.gtop'), under = root.querySelector('.gunder'), side = root.querySelector('.gside'), cls = run && screen !== 'pick' ? run.cls : pickCls;
  hideTip();
  root.querySelector('.gpane .portrait').src = `assets/classes/${cls}.png`;
  root.querySelector('.gpane .peekwho').textContent = className(cls);
  root.querySelector('.gpane .sub').textContent = screen === 'pick' ? 'Choose your class' : `Round ${run.round}`;
  root.querySelector('.gpane .peekdoll').innerHTML = screen === 'fight' ? '' : doll();
  root.querySelector('.gctl').innerHTML = screen === 'fight' ? speedHtml() : '';
  if (screen === 'pick') {
    top.innerHTML = '';
    under.innerHTML = '';
    side.innerHTML = pickHtml();
  } else if (screen === 'shop') {
    top.innerHTML = topbar();
    under.innerHTML = `${statsLine()}${run.consumes.length ? `<div class="gbag"><span>Ready for this fight:</span>${run.consumes.map((id) => `<img src="assets/icons/${CONSUME[id].icon}.png" title="${CONSUME[id].name}" alt="">`).join('')}</div>` : ''}`;
    side.innerHTML = shopHtml();
  } else {
    top.innerHTML = topbar();
    under.innerHTML = fightHtml();
    side.innerHTML = '';
  }
  shownGold = run ? run.gold : null;
  root.dataset.step = screen;
  document.body.classList.toggle('arenarun', screen !== 'pick');
  wire();
}

function hideTip() { if (tip) tip.hidden = true; }

function runDetail(r) {
  const items = PANE.filter(([slot]) => r.picks[slot] && pool.items[r.picks[slot]]).map(([slot]) => {
    const id = r.picks[slot], ench = r.enchants[slot];
    return `<button class="ps on" data-item="${id}" data-extra="${ench && ENCHANT[ench] ? `Enchanted: ${ENCHANT[ench].name}` : ''}" style="--q:${QUALITY[pool.items[id][1]]}" tabindex="-1"><img src="${iconOf(id)}" alt=""></button>`;
  }).join('');
  const fights = r.fights.map((f) => `<div class="gbf ${f.won ? 'win' : 'loss'}">${f.foe && CLASSES.includes(f.foe.cls) ? `<img src="assets/classes/${f.foe.cls}.png" alt="">` : ''}<span>${esc(f.foe ? f.foe.name : 'Unknown')}</span><em>${f.won ? 'Won' : 'Lost'}</em></div>`).join('');
  const plan = PLANS[r.cls] && PLANS[r.cls][r.plan];
  return `<div class="gbdetail"><div><h4>Finished with</h4><div class="gbitems">${items}</div>${plan ? `<p class="gtip">Plan: ${plan.label}</p>` : ''}</div><div><h4>Fights</h4><div class="gbfights">${fights}</div></div></div>`;
}

function boardList() {
  if (!boardRows) return '<p>The board could not be reached.</p>';
  if (!boardRows.length) return `<p>${boardMine ? 'You have not' : 'Nobody has'} finished a ${boardCls ? `${boardCls[0]}${boardCls.slice(1).toLowerCase()} ` : ''}run yet.</p>`;
  return boardRows.map((r) => `<div class="gbrun ${r.id === boardOpen ? 'open' : ''} ${r.mine ? 'mine' : ''}" data-owner="${r.id}"><button class="gbrow" data-run="${r.id}" aria-expanded="${r.id === boardOpen}"><img src="assets/classes/${r.cls}.png" alt=""><span class="gbname"><b>${esc(r.name || 'Unknown')}${r.mine && !boardMine ? ' <em>you</em>' : ''}</b><small>${className(r.cls)}</small></span><span class="gbwins ${r.wins >= MAX_WINS ? 'full' : ''}"><b>${r.wins}</b>/${MAX_WINS}</span><span class="gbago">${ago(r.at)}</span></button>${r.id === boardOpen ? runDetail(r) : ''}</div>`).join('');
}

function drawBoard() {
  const box = root.querySelector('.gboard'), chip = (c) => `<button class="gbclass ${c === boardCls ? 'on' : ''}" data-board="${c}" title="${c ? `${c[0]}${c.slice(1).toLowerCase()}` : 'All classes'}">${c ? `<img src="assets/classes/${c}.png" alt="${c}">` : 'All'}</button>`;
  box.innerHTML = `<div class="gbhead"><div><div class="gbtabs"><button class="${boardMine ? '' : 'on'}" data-mine="">Best recent runs</button><button class="${boardMine ? 'on' : ''}" data-mine="1">My runs</button></div><p>${boardMine ? 'Your last ten finished runs.' : 'The latest ten runs with the most wins.'}</p></div></div><div class="gbclasses">${['', ...CLASSES].map(chip).join('')}</div><div class="gblist">${boardList()}</div>`;
  for (const b of box.querySelectorAll('[data-board]')) b.onclick = () => loadBoard(b.dataset.board);
  for (const b of box.querySelectorAll('[data-mine]')) b.onclick = () => { boardMine = !!b.dataset.mine; boardOpen = 0; loadBoard(); };
  for (const b of box.querySelectorAll('[data-run]')) b.onclick = () => { boardOpen = +b.dataset.run === boardOpen ? 0 : +b.dataset.run; drawBoard(); };
  for (const b of box.querySelectorAll('[data-owner]')) {
    b.onmouseenter = () => { viewed = boardRows.find((r) => r.id === +b.dataset.owner).picks; };
    b.onmouseleave = () => { viewed = null; };
  }
}

async function loadBoard(cls = boardCls) {
  boardCls = cls;
  try {
    const r = await fetch(`${API}/gauntlet/board?cls=${cls}&who=${who()}&mine=${boardMine ? 1 : 0}`);
    boardRows = r.ok ? (await r.json()).rows : null;
  } catch { boardRows = null; }
  if (cls === boardCls) drawBoard();
}

function postResult() {
  const body = { who: who(), name: heroName(), cls: run.cls, plan: run.plan, wins: run.wins, losses: run.losses, picks: run.picks, enchants: run.enchants, fights: run.history, boons: run.boons || [] };
  return fetch(`${API}/gauntlet/finish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(() => loadBoard()).catch(() => {});
}

function wire() {
  ui = root;
  bindName(root);
  for (const el of ui.querySelectorAll('[data-boonid]')) el.onclick = () => showBoon(el.dataset.boonid);
  for (const el of ui.querySelectorAll('[data-c]')) el.onclick = () => { pickCls = el.dataset.c; render(); };
  for (const el of ui.querySelectorAll('[data-act]')) el.onclick = () => action(el.dataset.act);
  for (const el of ui.querySelectorAll('[data-slot]')) el.onclick = () => chooseItem(el.dataset.slot);
  for (const el of ui.querySelectorAll('[data-con]')) el.onclick = () => { if (buyConsume(run, CONSUME[el.dataset.con])) { save(); render(); } };
  for (const el of ui.querySelectorAll('[data-ench]')) el.onclick = () => { if (buyEnchant(run, ENCHANT[el.dataset.ench])) { save(); render(); } };
  for (const el of ui.querySelectorAll('[data-plan]')) el.onclick = () => { run.plan = el.dataset.plan; save(); render(); };
  for (const el of ui.querySelectorAll('[data-speed]')) el.onclick = () => { arena.speed = +el.dataset.speed; for (const b of ui.querySelectorAll('.sp')) b.classList.toggle('on', b === el); };
}

function chooseItem(slot) {
  if (!paySlot(pool, run, slot)) return;
  save();
  render();
  showChoices();
}

function showChoices() {
  const { slot, ids } = run.pending, box = document.createElement('div'), cur = run.picks[slot];
  box.className = 'gmodal';
  box.innerHTML = `<div class="gmodalbox"><h2>Choose your ${slotName(slot).toLowerCase()}</h2>
    <div class="gchoices" style="--n:${ids.length}">${ids.map((id, i) => `<button class="gchoice" data-id="${id}" ${cur ? `data-item="${cur}" data-head="Currently equipped"` : ''} style="--q:${QUALITY[pool.items[id][1]]};--i:${i}"><img src="${iconOf(id)}" alt=""><div class="gtt">${tooltip(id, run.picks)}</div></button>`).join('')}</div>
    ${cur ? `<details class="gnow"><summary>Compare with what you wear</summary><div class="gtt">${tooltip(cur, run.picks)}</div></details>` : ''}
    <button class="gskip" data-skip="1">Take nothing and lose your ${slotPrice(run.cls, slot)} gold</button></div>`;
  document.body.append(box);
  const done = (id) => {
    const hadOff = run.picks.off;
    takeItem(pool, run, id);
    box.remove();
    if (id) dress(() => (hadOff && !run.picks.off ? arena.hero(snapshot(run)) : arena.wear(slot, id)));
    save();
    render();
  };
  for (const b of box.querySelectorAll('[data-id]')) b.onclick = () => done(+b.dataset.id);
  box.querySelector('[data-skip]').onclick = () => done(0);
}

function showBoon(id) {
  const b = BOON[id], box = document.createElement('div');
  box.className = 'gmodal';
  box.innerHTML = `<div class="gmodalbox gboonbox"><img src="${boonIcon(id)}" alt=""><small>${esc(b.hero)}</small><h2>${esc(b.title)}</h2><p>${esc(b.text)}</p><button class="gmini" data-close="1">Close</button></div>`;
  document.body.append(box);
  box.onclick = (e) => { if (e.target === box || e.target.dataset.close) box.remove(); };
}

function showBoons() {
  const ids = run.boonChoice, box = document.createElement('div'), round = run.boons.length;
  box.className = 'wboon';
  box.innerHTML = `<div class="wsky"><i></i><i></i><i></i></div><div class="wring"></div><div class="wbody"><p class="wkick">${round ? `${run.wins} victories` : 'Before your first battle'}</p><h2>Choose your War Boon</h2><p class="wsub">A legend of Azeroth offers you their favor. It stays with you for the whole run.</p><div class="wcards">${ids.map((id, i) => { const b = BOON[id]; return `<button class="wcard ${b.kind}" data-boon="${id}" style="--i:${i}"><i class="wart" style="background-image:url(assets/game/art-${b.art}.jpg)"></i><i class="wveil"></i><i class="whalo"></i><span class="wsparks">${'<i></i>'.repeat(7)}</span><span class="wface"><img src="${boonIcon(id)}" alt=""></span><span class="wtext"><small>${esc(b.hero)}</small><b>${esc(b.title)}</b><i class="wrule"></i><em>${esc(b.text)}</em><span class="wkind">${BOON_KIND[b.kind]}</span></span><i class="wglare"></i>${FRAME}</button>`; }).join('')}</div></div>`;
  document.body.append(box);
  for (const card of box.querySelectorAll('[data-boon]')) {
    card.onpointermove = (e) => {
      if (e.pointerType !== 'mouse' || box.classList.contains('chosen')) return;
      const rect = card.getBoundingClientRect(), x = (e.clientX - rect.left) / rect.width, y = (e.clientY - rect.top) / rect.height;
      card.style.setProperty('--ry', `${(x - .5) * 13}deg`);
      card.style.setProperty('--rx', `${(.5 - y) * 11}deg`);
      card.style.setProperty('--mx', `${x * 100}%`);
      card.style.setProperty('--my', `${y * 100}%`);
    };
    card.onpointerleave = () => { card.style.setProperty('--ry', '0deg'); card.style.setProperty('--rx', '0deg'); };
    card.onclick = () => {
      if (box.classList.contains('chosen')) return;
      box.classList.add('chosen');
      card.classList.add('picked');
      pickBoon(pool, run, card.dataset.boon);
      save();
      setTimeout(() => {
        box.remove();
        render();
        if (run.pending) showChoices();
      }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 1300);
    };
  }
}

async function findFoe() {
  if (run.foe) return;
  try {
    const r = await fetch(`${API}/gauntlet/foe?wins=${run.wins}&losses=${run.losses}&who=${who()}`);
    const d = r.ok ? await r.json() : null;
    if (d && d.foe && d.foe.cls && CLASSES.includes(d.foe.cls)) run.foe = { ...d.foe, name: !d.foe.name || d.foe.name === 'You' ? fakeName(Math.random) : d.foe.name };
  } catch {}
  if (!run.foe) run.foe = makeBot(pool, run.round);
  run.shop = rollShop(pool, run);
  save();
}

async function toShop() {
  screen = 'shop';
  arena.heroShift = 0;
  render();
  arena.stageA.resize();
  root.scrollIntoView({ block: 'start', behavior: 'smooth' });
  if (run.boonChoice) showBoons();
  else if (run.pending) showChoices();
  const dressed = dress(() => arena.hero(snapshot(run)));
  if (!run.foe) { await findFoe(); render(); }
  await dressed;
}

function dress(step) {
  const box = root.querySelector('.gscene');
  dressNow++;
  box.classList.add('dressing');
  dressing = dressing.then(step).catch(() => {}).finally(() => { if (!--dressNow) box.classList.remove('dressing'); });
  return dressing;
}

function preview(cls) {
  if (!previews[cls]) {
    const seed = Math.floor(Math.random() * 1e9);
    previews[cls] = { seed, picks: gear(pool, cls, ['g'], seed, 8) };
  }
  return previews[cls];
}

const worn = () => (screen === 'pick' ? preview(pickCls).picks : run.picks);

function logLine(e) {
  if (!['hit', 'heal', 'interrupt', 'trinket', 'cc'].includes(e.type) || (e.type === 'hit' && !e.amount)) return;
  const box = ui.querySelector('.glog');
  if (!box) return;
  const who2 = arena.names[e.side], them = arena.names[1 - e.side];
  const t = e.type === 'hit' ? `${who2}: ${e.name} ${e.amount}${e.crit ? ' crit' : ''}` : e.type === 'heal' ? `${who2}: ${e.name} +${e.amount}` : e.type === 'interrupt' ? `${who2}: ${e.name} interrupted` : e.type === 'trinket' ? `${who2} breaks free` : `${who2} is ${{ stun: 'stunned', fear: 'feared', poly: 'disoriented', root: 'rooted', pet: 'without a pet' }[e.name] || e.name}`;
  box.insertAdjacentHTML('beforeend', `<div class="${e.side ? 'b' : 'a'}">${t}</div>`);
  while (box.children.length > 7) box.firstChild.remove();
  return them;
}

async function startFight() {
  if (busy || !run.foe) return;
  busy = true;
  const snap = snapshot(run), foe = run.foe;
  try { fetch(`${API}/gauntlet/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ who: who(), wins: run.wins, losses: run.losses, name: heroName(), build: snap }) }).catch(() => {}); } catch {}
  screen = 'fight';
  render();
  root.querySelector('.gscene').scrollIntoView({ block: 'center', behavior: 'smooth' });
  arena.theme(THEMES[run.round % THEMES.length]);
  const names = [heroName(), foe.name];
  await dress(() => arena.stageFight([snap, foe], names));
  arena.banner(`<small>${THEMES[run.round % THEMES.length].name} · Round ${run.round}</small><h2>${names[0]}</h2><em>versus</em><h2>${foe.name}</h2><small>${className(foe.cls)}</small>`, 'vs');
  await new Promise((done) => { setTimeout(done, 1900); });
  const rec = { events: [], frames: [] }, x = fight(sideOf(pool, snap, REF), sideOf(pool, foe, REF), Math.floor(Math.random() * 1e9), rec);
  run.fought = x.winner === 0 ? 'won' : 'lost';
  save();
  arena.play(rec, x, { onLine: logLine, onEnd: finish });
  busy = false;
}

function settle() {
  const won = run.fought === 'won';
  delete run.fought;
  finishRound(pool, run, won);
  save();
  if (run.over) postResult();
}

function winPips() {
  return `<div class="bpips">${Array.from({ length: MAX_WINS }, (_, i) => `<i class="${i < run.wins ? 'on' : ''}" style="--i:${i}"></i>`).join('')}</div>`;
}

function recap() {
  return `<div class="grecap">${run.history.map((f) => `<i class="${f.won ? 'win' : 'loss'}"><img src="assets/classes/${f.foe.cls}.png" alt="${f.won ? 'Won' : 'Lost'} against ${className(f.foe.cls)}"></i>`).join('')}</div>`;
}

function finish(x) {
  const won = x.winner === 0;
  settle();
  const over = run.over, champion = run.wins >= MAX_WINS;
  const left = LIVES - run.losses, record = over ? `${run.wins} ${run.wins === 1 ? 'win' : 'wins'} with ${className(run.cls)}` : `${run.wins} of ${MAX_WINS} wins · ${left} ${left === 1 ? 'life' : 'lives'} left`;
  arena.banner(resultHtml({ title: over ? (champion ? 'Champion' : 'Run over') : won ? 'Victory' : 'Defeat', stats: [[x.time.toFixed(0), 'Seconds'], [Math.round(x.a.dealt).toLocaleString('en-US'), 'Damage dealt'], [Math.round(x.b.dealt).toLocaleString('en-US'), 'Damage taken']], note: record, extra: over ? `${winPips()}${recap()}` : '', action: over ? 'New run' : 'Back to the shop', badge: over ? `assets/classes/${run.cls}.png` : '' }), `result ${won || champion ? 'win' : 'lose'}`);
  root.querySelector('[data-next]').onclick = () => {
    if (over) { run = null; save(); screen = 'pick'; render(); } else toShop();
  };
}

function action(a) {
  if (a === 'begin') {
    run = newRun(pool, pickCls, preview(pickCls).seed);
    delete previews[pickCls];
    if (BEST[pickCls]) run.plan = BEST[pickCls];
    save();
    toShop();
  } else if (a === 'resume') {
    run = load();
    run.boons ||= [];
    if (run.fought) settle();
    if (run.over) { run = null; save(); render(); } else toShop();
  } else if (a === 'fight') startFight();
  else if (a === 'reroll') { if (rerollShop(pool, run)) { save(); render(); } }
  else if (a === 'skip') arena.skip();
  else if (a === 'quit') { save(); screen = 'pick'; render(); }
}

export async function openGauntlet(data, host) {
  if (root) { arena.stageA.resize(); return; }
  pool = data.pool;
  gearData = data.gear;
  ({ tooltip, PANE, QUALITY } = data);
  data.ownedBy(() => viewed || worn());
  REF = references(pool);
  root = host;
  root.id = 'gauntlet';
  root.innerHTML = '<div class="gtop"></div><div class="gmain"><div class="gstagecol"><div class="pane gpane"><img class="portrait" alt=""><div class="frameart"></div><div class="viewport"><div class="gscene"></div></div><div class="peekwho"></div><div class="sub"></div><div class="peekdoll"></div><div class="gctl"></div></div><div class="gunder"></div></div><div class="gside"></div></div><section class="gboard gpanel"></section>';
  ui = root;
  tip = document.getElementById('tip');
  arena = new Arena(root.querySelector('.gscene'), gearData, pool);
  await arena.init();
  run = null;
  screen = 'pick';
  render();
  loadBoard();
  window.gauntlet = { arena, get run() { return run; }, set run(v) { run = v; }, render, toShop };
}
