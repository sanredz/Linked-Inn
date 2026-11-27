import { hash, rng } from '../draft/core.js?v=20261127173000';
import { RAIDS } from './bosses.js?v=20261127173000';

export const ATTUNE_BOSS = 'kazzak';
export const CHANCE = .25;
export const ATTUNE_START = 1795271829811;
export const RAID_IDS = ['mc', 'zg', 'aq20'];

export const PIECES = [
  { raid: 'mc', from: 'Ragnaros', id: 990301, bit: 1, name: 'Ember of the Burning Legion', icon: 134084, text: 'A shard of fel crystal that never cools. Ragnaros kept it close to the heart of the Core.' },
  { raid: 'zg', from: 'Hakkar', id: 990302, bit: 2, name: 'Fel-Blooded Sigil', icon: 134417, text: 'Carved in a tongue older than the Gurubashi, and wet with blood that is not Hakkar\'s.' },
  { raid: 'aq20', from: 'Ossirian', id: 990303, bit: 4, name: 'Seal of the Scarab Gate', icon: 134890, text: 'Ossirian guarded it for a thousand years. Something on the other side was waiting for it.' },
];

export const LIGHT = [
  { raid: 'mc', bit: 8, name: 'Light in the Molten Core', icon: 135963, place: 'Ragnaros' },
  { raid: 'zg', bit: 16, name: 'Light in Zul\'Gurub', icon: 135970, place: 'Hakkar' },
  { raid: 'aq20', bit: 32, name: 'Light in the Ruins', icon: 135967, place: 'Ossirian' },
];

export const KEYSTONE = { id: 990300, name: 'The Dark Portal Keystone', icon: 134461, text: 'Three dark pieces of one thing, made whole. It hums like something breathing.' };

export const WHISPERS = [
  'Something stirs in the ash.',
  'The fragments hum with a fel heat.',
  'A name, half-burned on scorched hide: K...',
  'The Light recoils. Something waits beyond the Portal.',
  'Iron hooves on cracked red earth.',
  'All is ready. Break the seals.',
];

export const ALL = 63;
const finalOf = (raid) => RAIDS[raid].bosses.length - 1;
export const pieceRoll = (seed, raid) => rng(hash(seed, 'attune', raid))() < CHANCE;
export const reachedFinal = (raid, kills) => !!RAIDS[raid] && kills === finalOf(raid);
export const lightParty = (party) => party.length === 3 && party.every((h) => h.cls === 'PALADIN') && ['tank', 'heal', 'dps'].every((r) => party.some((h) => h.role === r));

export function earned(raid, kills, seed, party) {
  if (!reachedFinal(raid, kills)) return { piece: 0, light: 0 };
  return { piece: Number.isInteger(seed) && pieceRoll(seed, raid) ? 1 : 0, light: lightParty(party) ? 1 : 0 };
}

export function attuneOf(rows, granted = 0, since = 0, forged = 0) {
  const pieces = {}, light = {}, from = Math.max(since, ATTUNE_START);
  for (const id of RAID_IDS) { pieces[id] = 0; light[id] = 0; }
  for (const r of rows) {
    if (!pieces.hasOwnProperty(r.raid) || (r.at || 0) < from) continue;
    let party = r.party;
    if (typeof party === 'string') { try { party = JSON.parse(party); } catch { party = []; } }
    const e = earned(r.raid, r.kills, r.seed, party || []);
    if (e.piece && !pieces[r.raid]) pieces[r.raid] = r.at || 1;
    if (e.light && !light[r.raid]) light[r.raid] = r.at || 1;
  }
  for (const p of PIECES) if (granted & p.bit && !pieces[p.raid]) pieces[p.raid] = 1;
  for (const l of LIGHT) if (granted & l.bit && !light[l.raid]) light[l.raid] = 1;
  const steps = RAID_IDS.reduce((n, id) => n + (pieces[id] ? 1 : 0) + (light[id] ? 1 : 0), 0);
  return { pieces, light, steps, ready: steps === 6 ? 1 : 0, forged: forged || 0 };
}

export const nextBit = (a) => [...PIECES, ...LIGHT].find((x) => !(PIECES.includes(x) ? a.pieces[x.raid] : a.light[x.raid]));
