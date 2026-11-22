import { CONSUMABLES, CONSUMABLE, TIERS, SOURCES, CAP, fits, whyNot } from './consumables.js';
import { RAIDS } from './bosses.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SLOTS = 12;
const CLASS = { WARRIOR: 'Warrior', PALADIN: 'Paladin', HUNTER: 'Hunter', ROGUE: 'Rogue', PRIEST: 'Priest', SHAMAN: 'Shaman', MAGE: 'Mage', WARLOCK: 'Warlock', DRUID: 'Druid' };

export function satchelCss() {
  if (!document.querySelector('link[href$="raid/satchel.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="raid/satchel.css">');
}

const whereFrom = (c) => {
  const r = RAIDS[c.raid], mid = r.bosses[SOURCES[c.raid].mid].name, fin = r.bosses[SOURCES[c.raid].final].name;
  return c.tier === 'minor' ? `Drops from ${mid} or ${fin} in ${r.name}` : `Drops from ${fin} in ${r.name}, rarely`;
};

export function satchelHtml(have = {}, opts = {}) {
  const left = (id) => (have[id] || 0) - ((opts.reserved && opts.reserved[id]) || 0);
  const slot = (c) => {
    const n = left(c.id), owned = (have[c.id] || 0) > 0, mine = opts.current === c.id, cant = opts.hero && !fits(c, opts.hero);
    return `<button type="button" class="satslot ${owned ? 'has' : 'none'} ${cant ? 'dim' : ''} ${mine ? 'sel' : ''}" data-sat="${c.id}" style="--q:${TIERS[c.tier].color}" aria-label="${esc(c.name)}, ${n > 0 ? n : 0} held"><img src="assets/icons/${c.icon}.png" alt="">${owned ? `<b>${Math.max(0, n)}</b>` : ''}</button>`;
  };
  const total = CONSUMABLES.reduce((a, c) => a + (have[c.id] || 0), 0);
  return `<div class="sat ${opts.compact ? 'compact' : ''}"><div class="satbag"><i class="satflap" aria-hidden="true"></i><div class="satgrid">${CONSUMABLES.map(slot).join('')}${'<i class="satslot empty"></i>'.repeat(SLOTS - CONSUMABLES.length)}</div></div>
    <div class="satinfo" aria-live="polite">${total ? `<p class="satnone">${opts.hero ? `Pick something for your ${esc(CLASS[opts.hero.cls] || '')}.` : 'Tap an item to read it.'}</p>` : (opts.sealed ? '<p class="satnone">Empty for now. Break the six seals first; after that, consumables drop rarely from the middle and final bosses of each raid.</p>' : '<p class="satnone">Your satchel is empty. Consumables drop rarely from the middle and final bosses of each raid.</p>')}</div></div>`;
}

export function infoHtml(c, have, opts = {}) {
  const n = (have[c.id] || 0) - ((opts.reserved && opts.reserved[c.id]) || 0), cant = opts.hero && !fits(c, opts.hero), mine = opts.current === c.id;
  const act = !opts.hero ? '' : mine ? '<button type="button" class="satgo off" data-satuse="0">Take it back</button>' : cant ? `<p class="satwhy">${esc(whyNot(c))}</p>` : n > 0 ? `<button type="button" class="satgo" data-satuse="${c.id}">Use on your ${esc(CLASS[opts.hero.cls] || 'hero')}</button>` : '<p class="satwhy">None left to use.</p>';
  return `<div class="satcard" style="--q:${TIERS[c.tier].color}"><img src="assets/icons/${c.icon}.png" alt=""><div><b>${esc(c.name)}</b><small>${TIERS[c.tier].name} consumable</small><span class="satfx">${esc(c.line)}</span><span class="satsrc">${esc(whereFrom(c))}</span><span class="satcount">You hold ${Math.max(0, have[c.id] || 0)} of ${CAP}</span></div></div>${act}`;
}

export function bindSatchel(box, have, opts = {}) {
  const info = box.querySelector('.satinfo');
  for (const b of box.querySelectorAll('[data-sat]')) b.onclick = () => {
    const c = CONSUMABLE[+b.dataset.sat];
    for (const x of box.querySelectorAll('[data-sat].pick')) x.classList.remove('pick');
    b.classList.add('pick');
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
