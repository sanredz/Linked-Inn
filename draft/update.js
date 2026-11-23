const ID = 'update-2026-11-23', UNTIL = Date.parse('2026-12-07T00:00:00Z');
const read = () => { try { return localStorage.getItem(ID) === 'done'; } catch { return false; } };
const done = () => { try { localStorage.setItem(ID, 'done'); } catch {} };

const NOTES = [
  ['Badges are now Paths', [
    'Five Paths with five ranks each: Drafter, Gladiator, Raider, Doomslayer and Collector.',
    'Everything you have already done counts. Open your Hearth to see where you stand.',
    'Every rank adds one Renown. Tap a Path to see its deeds, your progress and what each rank unlocks.',
  ]],
  ['Rewards to show off', [
    'Titles under your name in chat, in your Hearth and on every leaderboard.',
    'Portrait frames from Renown, from bronze up to a legendary frame with an aura.',
    'Weapon enchants on your heroes in every mode: Fiery, Felfire, Icy Chill, Crusader and Unholy Shadow.',
    'Two new mounts, the Black War Wolf and the Felsteed. Your mount now carries you through Gear Draft too.',
    'Top 3 or #1 on any class board earns the Podium frame and the title "the Unrivaled".',
  ]],
  ['Decorate your Inn', [
    'A Decorate button in the Inn: choose your hearthfire colour, which banners hang on the pillars and the Fel Brazier.',
    '13 banners to earn, each with three tiers that get richer as you go.',
  ]],
  ['Fixes', [
    'Fights now start with full health and mana.',
    'A slain boss now shows 0%, also after Skip, and a wipe ends with the whole party down.',
    'Priest, Paladin, Hunter and Warrior DPS marks lowered so every class is equally hard.',
  ]],
];

function css() {
  if (document.getElementById('updcss')) return;
  const s = document.createElement('style');
  s.id = 'updcss';
  s.textContent = `
.updbar { display: flex; align-items: center; gap: 12px; margin: 12px 0 0; padding: 10px 12px 10px 14px; border: 1px solid #b08a3e; border-radius: 10px; background: linear-gradient(90deg, rgba(248, 211, 107, .16), rgba(248, 211, 107, .04) 60%), #140d07; box-shadow: 0 0 18px rgba(248, 211, 107, .12); animation: updin .45s ease; }
@keyframes updin { from { opacity: 0; transform: translateY(-6px); } }
.updnew { flex: none; padding: 2px 9px; font: 12px "Morpheus", serif; letter-spacing: .08em; color: #1a1006; background: linear-gradient(#ffe39a, #d5a548); border-radius: 999px; }
.updtext { flex: 1; min-width: 0; font: 14.5px/1.35 "Friz", serif; color: #e9dfcb; }
.updtext b { font-weight: normal; color: #ffe39a; }
.updgo { flex: none; padding: 7px 14px; font: 14px "Friz", serif; color: #1a1006; cursor: pointer; border: 1px solid #ffe39a; border-radius: 999px; background: linear-gradient(#ffe39a, #d5a548); }
.updx { flex: none; width: 32px; height: 32px; font-size: 20px; color: #8f8170; cursor: pointer; background: none; border: 0; }
.updx:hover { color: #ffe39a; }
@media (max-width: 640px) { .updbar { flex-wrap: wrap; } .updtext { flex-basis: calc(100% - 90px); } .updgo { margin-left: auto; } }
.updmodal { position: fixed; inset: 0; z-index: 1900; display: grid; place-items: center; padding: 16px; background: rgba(6, 3, 1, .82); opacity: 0; transition: opacity .25s ease; }
.updmodal.in { opacity: 1; }
.updbox { position: relative; width: min(600px, 100%); max-height: calc(100vh - 32px); overflow-y: auto; padding: 22px 22px 18px; border: 1px solid #8a6a2a; border-radius: 14px; background: radial-gradient(120% 60% at 50% 0%, #33210d, #130b05 70%); box-shadow: 0 24px 70px rgba(0, 0, 0, .75); }
.updbox small { font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: #c9a24a; }
.updbox h2 { margin: 2px 0 12px; font: 26px/1.15 "Morpheus", serif; font-weight: normal; color: #ffe39a; }
.updbox h3 { margin: 16px 0 6px; font: 15px "Friz", serif; font-weight: normal; letter-spacing: .08em; text-transform: uppercase; color: #c9a24a; }
.updbox ul { margin: 0; padding-left: 20px; }
.updbox li { margin: 4px 0; font: 14.5px/1.45 "Friz", serif; color: #e9dfcb; }
.updbox .updx { position: absolute; right: 8px; top: 8px; }
.updfoot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
`;
  document.head.append(s);
}

function notes() {
  css();
  const box = document.createElement('div');
  box.className = 'updmodal';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-labelledby', 'updT');
  box.innerHTML = `<div class="updbox"><button type="button" class="updx" aria-label="Close">&times;</button><small>Patch notes · November 23</small><h2 id="updT">Paths, enchants and a better Inn</h2>${NOTES.map(([h, list]) => `<h3>${h}</h3><ul>${list.map((x) => `<li>${x}</li>`).join('')}</ul>`).join('')}<div class="updfoot"><button type="button" class="updgo" data-hearth-open>Open my Hearth</button></div></div>`;
  document.body.append(box);
  requestAnimationFrame(() => box.classList.add('in'));
  const close = () => { box.classList.remove('in'); document.removeEventListener('keydown', key); setTimeout(() => box.remove(), 250); };
  const key = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', key);
  box.querySelector('.updx').onclick = close;
  box.onclick = (e) => { if (e.target === box) close(); };
  box.querySelector('[data-hearth-open]').onclick = () => { close(); const b = document.querySelector('#hearthBar [data-hearth]'); if (b) b.click(); };
}

export function showUpdate() {
  if (read() || Date.now() > UNTIL || document.querySelector('.updbar')) return;
  const main = document.querySelector('main.wrap');
  if (!main) return;
  css();
  const bar = document.createElement('div');
  bar.className = 'updbar';
  bar.setAttribute('role', 'status');
  bar.innerHTML = '<span class="updnew">New</span><span class="updtext"><b>Badges are now Paths.</b> Earn titles, portrait frames, weapon enchants, mounts and Inn banners.</span><button type="button" class="updgo">Read the patch notes</button><button type="button" class="updx" aria-label="Dismiss">&times;</button>';
  main.prepend(bar);
  bar.querySelector('.updgo').onclick = () => { notes(); done(); bar.remove(); };
  bar.querySelector('.updx').onclick = () => { done(); bar.remove(); };
}
