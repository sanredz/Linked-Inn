import { CONSUMABLES, CONSUMABLE, TIERS, SOURCES, CAP, fits, whyNot } from './consumables.js?v=20261127180000';
import { RAIDS } from './bosses.js?v=20261127180000';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SLOTS = 20;
let OPEN = { any: 0, dream: 0, have: {} };
export const setOpen = (o) => { OPEN = { ...OPEN, ...o }; };
export const known = (c, have = OPEN.have) => (have[c.id] || 0) > 0 || (OPEN.have[c.id] || 0) > 0 || !!(c.src ? OPEN.dream : OPEN.any);
const hint = (c) => (c.src ? 'Revealed once you open the Emerald Dream' : 'Revealed once you free a world boss');
export const mysteryIcon = (cls = 'consq') => `<span class="${cls}" aria-hidden="true">?</span>`;
const CLASS = { WARRIOR: 'Warrior', PALADIN: 'Paladin', HUNTER: 'Hunter', ROGUE: 'Rogue', PRIEST: 'Priest', SHAMAN: 'Shaman', MAGE: 'Mage', WARLOCK: 'Warlock', DRUID: 'Druid' };

export function satchelCss() {
  if (!document.querySelector('link[href*="raid/satchel.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="raid/satchel.css?v=20261127180000">');
}

const whereFrom = (c) => {
  if (c.src) return `Drops from ${RAIDS[c.src[0]].bosses[c.src[1]].name} in ${RAIDS[c.src[0]].name}, rarely`;
  const r = RAIDS[c.raid], mid = r.bosses[SOURCES[c.raid].mid].name, fin = r.bosses[SOURCES[c.raid].final].name;
  return c.tier === 'minor' ? `Drops from ${mid} or ${fin} in ${r.name}` : `Drops from ${fin} in ${r.name}, rarely`;
};

export function satchelHtml(have = {}, opts = {}) {
  const left = (id) => (have[id] || 0) - ((opts.reserved && opts.reserved[id]) || 0);
  const slot = (c) => {
    const n = left(c.id), owned = (have[c.id] || 0) > 0, mine = opts.current === c.id, cant = opts.hero && !fits(c, opts.hero);
    if (!known(c, have)) return `<button type="button" class="satslot none mystery" data-sat="${c.id}" aria-label="Unknown consumable">${mysteryIcon()}</button>`;
    return `<button type="button" class="satslot ${owned ? 'has' : 'none'} ${cant ? 'dim' : ''} ${mine ? 'sel' : ''}" data-sat="${c.id}" style="--q:${TIERS[c.tier].color}" aria-label="${esc(c.name)}, ${n > 0 ? n : 0} held"><img src="assets/icons/${c.icon}.png" alt="">${owned ? `<b>${Math.max(0, n)}</b>` : ''}</button>`;
  };
  const total = CONSUMABLES.reduce((a, c) => a + (have[c.id] || 0), 0);
  return `<div class="sat ${opts.compact ? 'compact' : ''}"><div class="satbag"><i class="satflap" aria-hidden="true"></i><div class="satgrid">${CONSUMABLES.map(slot).join('')}${'<i class="satslot empty"></i>'.repeat(SLOTS - CONSUMABLES.length)}</div></div>
    <div class="satinfo" aria-live="polite">${total ? `<p class="satnone">${opts.hero ? `Pick something for your ${esc(CLASS[opts.hero.cls] || '')}.` : 'Tap an item to read it.'}</p>` : (opts.sealed ? '<p class="satnone">Empty for now. Free a world boss first; after that, consumables drop rarely from raid bosses.</p>' : '<p class="satnone">Your satchel is empty. Consumables drop rarely from raid bosses.</p>')}</div><button type="button" class="satlist" data-satlist>Where each one drops</button></div>`;
}

export function infoHtml(c, have, opts = {}) {
  if (!known(c, have)) return `<div class="satcard mystery">${mysteryIcon()}<div><b>Unknown consumable</b><small>A mystery for now</small><span class="satfx">${esc(hint(c))}</span><span class="satsrc">${esc(whereFrom(c))}</span></div></div>`;
  const n = (have[c.id] || 0) - ((opts.reserved && opts.reserved[c.id]) || 0), cant = opts.hero && !fits(c, opts.hero), mine = opts.current === c.id;
  const act = !opts.hero ? '' : mine ? '<button type="button" class="satgo off" data-satuse="0">Take it back</button>' : cant ? `<p class="satwhy">${esc(whyNot(c))}</p>` : n > 0 ? `<button type="button" class="satgo" data-satuse="${c.id}">Use on your ${esc(CLASS[opts.hero.cls] || 'hero')}</button>` : '<p class="satwhy">None left to use.</p>';
  return `<div class="satcard" style="--q:${TIERS[c.tier].color}"><img src="assets/icons/${c.icon}.png" alt=""><div><b>${esc(c.name)}</b><small>${TIERS[c.tier].name} consumable</small><span class="satfx">${esc(c.line)}</span><span class="satsrc">${esc(whereFrom(c))}</span><span class="satcount">You hold ${Math.max(0, have[c.id] || 0)} of ${CAP}</span></div></div>${act}`;
}

const LIST_NAME = { mc: 'Molten Core', zg: "Zul'Gurub", aq20: "Ruins of Ahn'Qiraj" };
export const dropsIn = (raid) => CONSUMABLES.filter((c) => c.raid === raid || (c.src && c.src[0] === raid)).map((c) => ({ c, at: c.src ? [c.src[1]] : c.tier === 'minor' ? [SOURCES[raid].mid, SOURCES[raid].final] : [SOURCES[raid].final] })).sort((a, b) => a.at[0] - b.at[0] || a.at.length - b.at.length);
export const dropBosses = (raid, at) => at.map((i) => RAIDS[raid].bosses[i].name).join(' or ');
const where = (c) => {
  if (c.src) return `${RAIDS[c.src[0]].bosses[c.src[1]].name}, rare`;
  const s = SOURCES[c.raid], r = RAIDS[c.raid];
  return c.tier === 'minor' ? `${r.bosses[s.mid].name} or ${r.bosses[s.final].name}, rare` : `${r.bosses[s.final].name}, ${c.tier === 'major' ? 'rare' : 'very rare'}`;
};

export function openDropList(have = {}, opts = {}) {
  satchelCss();
  if (!document.querySelector('link[href*="raid/dream.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="raid/dream.css?v=20261127180000">');
  const chance = (c) => (c.src ? 'rare' : c.tier === 'minor' ? 'rare' : c.tier === 'major' ? 'rare' : 'very rare');
  const row = (r) => ({ c, at }) => (!known(c, have) ? `<li class="mystery">${mysteryIcon()}<span><i class="dlboss">${esc(dropBosses(r, at))} · ${chance(c)}</i><b>Unknown consumable</b><small>${esc(hint(c))}</small></span><em></em></li>` : `<li style="--q:${TIERS[c.tier].color}"><img src="assets/icons/${c.icon}.png" alt=""><span><i class="dlboss">${esc(dropBosses(r, at))} · ${chance(c)}</i><b>${esc(c.name)}</b><small>${esc(c.line)}</small></span><em class="${have[c.id] ? 'has' : ''}">${have[c.id] ? `${have[c.id]} held` : ''}</em></li>`);
  const groups = Object.keys(LIST_NAME).filter((r) => !opts.raid || r === opts.raid).map((r) => [`${LIST_NAME[r]}<small>drops once a world boss is freed</small>`, dropsIn(r).map(row(r))]);
  const box = document.createElement('div');
  box.className = 'dlistbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Where consumables drop');
  box.innerHTML = `<div class="dlistcard"><header><div><h3>Where each one drops</h3><small>One consumable per hero, picked before a World Boss pull. You can hold ${CAP} of each.</small></div><button type="button" class="dlistx" aria-label="Close">&times;</button></header>${groups.map(([h, list]) => `<section class="dlistgrp"><h4>${h}</h4><ul>${list.join('')}</ul></section>`).join('')}</div>`;
  document.body.append(box);
  requestAnimationFrame(() => box.classList.add('in'));
  const close = () => { box.classList.remove('in'); removeEventListener('keydown', key); setTimeout(() => box.remove(), 250); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', key);
  box.querySelector('.dlistx').onclick = close;
  box.onclick = (e) => { if (e.target === box) close(); };
}

export function bindSatchel(box, have, opts = {}) {
  const info = box.querySelector('.satinfo'), list = box.querySelector('[data-satlist]');
  if (list) list.onclick = () => openDropList(have);
  for (const b of box.querySelectorAll('[data-sat]')) b.onclick = () => {
    const c = CONSUMABLE[+b.dataset.sat];
    for (const x of box.querySelectorAll('[data-sat].chosen')) x.classList.remove('chosen');
    b.classList.add('chosen');
    info.innerHTML = infoHtml(c, have, opts);
    const go = info.querySelector('[data-satuse]');
    if (go && opts.onUse) go.onclick = () => opts.onUse(+go.dataset.satuse);
  };
}

export function openSatchel(have, opts) {
  satchelCss();
  const box = document.createElement('div');
  box.className = 'satpick';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `<div class="satpickbox"><header><small>${esc(opts.title || 'Your satchel')}</small><b>One consumable for this fight</b><button type="button" class="satx" aria-label="Close">&times;</button></header>${satchelHtml(have, opts)}</div>`;
  document.body.append(box);
  requestAnimationFrame(() => box.classList.add('in'));
  const close = () => { box.classList.remove('in'); document.removeEventListener('keydown', key); setTimeout(() => box.remove(), 250); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', key);
  box.querySelector('.satx').onclick = close;
  box.onclick = (e) => { if (e.target === box) close(); };
  bindSatchel(box, have, { ...opts, onUse: (id) => { close(); opts.onUse(id); } });
  const first = opts.current ? box.querySelector(`[data-sat="${opts.current}"]`) : null;
  if (first) first.click();
}
