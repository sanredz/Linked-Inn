import { hash, rng, BUILDS } from '../draft/core.js?v=20261127163000';

export const DAILY_EPOCH = 20784;
export const DAILY_BOARD = 100;
const DAY = 864e5, RESET = 5 * 36e5;
export const dayNow = (at = Date.now()) => Math.floor((at - RESET) / DAY);
export const dayEnds = (day) => (day + 1) * DAY + RESET;
export const TWISTS = [
  { rule: 'veil', name: 'The Veiled Dream', short: 'Veiled', icon: 132123, color: '#b8c8ff', text: 'Every item is hidden in mist. You see only its slot, its rarity and a whisper of its stats until you keep it. Three redreams reshape your latest pick.' },
  { rule: 'grow', name: 'Overgrowth', short: 'Overgrowth', icon: 136074, color: '#8fd67a', text: 'Each time you keep an item, the Dream grows one of the others into your hero. Wither the ones you do not want first.' },
  { rule: 'fade', name: 'Fading Paths', short: 'Fading', icon: 136041, color: '#d8c99a', text: 'Only three slots are on offer each round, the rest are lost in the fog. Reach into the mist for a hidden item, or light one of three lanterns to see every slot.' },
  { rule: 'duel', name: 'The Shade Takes First', short: 'The Shade', icon: 136223, color: '#c79bff', text: 'A Shade drafts beside you from the same offers and always takes first. When both heroes are done they fight, and you are ranked by how far you out-damage the Shade, or how close you come.' },
];
export const TWIST = Object.fromEntries(TWISTS.map((t) => [t.rule, t]));
const CLASSES = Object.keys(BUILDS);

const memo = new Map();
export function dailyOf(day) {
  const d = Math.max(DAILY_EPOCH, day);
  if (memo.has(d)) return memo.get(d);
  let t = 0, c = 0;
  for (let i = DAILY_EPOCH; i <= d; i++) {
    const r = rng(hash('daily', i));
    if (i === DAILY_EPOCH) { t = (r() * TWISTS.length) | 0; c = (r() * CLASSES.length) | 0; continue; }
    t = (t + 1 + ((r() * (TWISTS.length - 1)) | 0)) % TWISTS.length;
    c = (c + 1 + ((r() * (CLASSES.length - 1)) | 0)) % CLASSES.length;
  }
  const out = { day: d, rule: TWISTS[t].rule, cls: CLASSES[c], tree: 'daily' };
  memo.set(d, out);
  return out;
}
