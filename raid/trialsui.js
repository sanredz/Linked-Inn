import { SLOTS, BUILDS, CLASS_NAME, CLASS_COLOR, remaining, finished, hands, simulate, hash, rng } from '../draft/core.js?v=20261127193000';
import { TRIAL, TRIALS, CLASSES, trialRun, view, act, judge, reachSlot, fogOf, withersFor, redreamOf } from './trials.js?v=20261127193000';
import { TREES } from './dream.js?v=20261127193000';
import { TWIST } from './daily.js?v=20261127193000';
import { dreamCss, vision } from './dreamfx.js?v=20261127193000';
import { audio, bell, boom } from './wloot.js?v=20261127193000';
import { askName, heroName, nameOk } from '../pvp/name.js?v=20261127193000';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const QUALITY = ['#9d9d9d', '#ffffff', '#1eff00', '#0070dd', '#a335ee', '#ff8000'];
const RARE = ['Poor', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const STAT = { sta: 'Sta', str: 'Str', agi: 'Agi', int: 'Int', spi: 'Spi', ap: 'AP', rap: 'Ranged AP', crit: 'Crit', hit: 'Hit', sp: 'Spell power', scrit: 'Spell crit', shit: 'Spell hit', heal: 'Healing', mp5: 'Mp5', sfire: 'Fire power', sfrost: 'Frost power', sshadow: 'Shadow power', sarcane: 'Arcane power', snature: 'Nature power', sholy: 'Holy power', fap: 'Feral AP', rfire: 'Fire resistance', rfrost: 'Frost resistance', rnature: 'Nature resistance', rshadow: 'Shadow resistance', rarcane: 'Arcane resistance' };
const PCT = new Set(['crit', 'hit', 'scrit', 'shit']);
const NAME = Object.fromEntries(SLOTS);
const STAGES = [[.72, 'The tree sleeps'], [.86, 'The tree stirs'], [.96, 'Its leaves are waking'], [Infinity, 'On the edge of waking']];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let poolP = null;
const loadPool = () => (poolP ||= fetch('draft/pool.json').then((r) => r.json()));

function chime(kind) {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime + .02;
  if (kind === 'keep') { bell(ctx, t, 784, .7, .04); bell(ctx, t + .05, 1174.7, .5, .02); }
  else if (kind === 'tick') bell(ctx, t, 1567.98, .12, .015);
  else if (kind === 'land') { bell(ctx, t, 659.3, 1.4, .05); bell(ctx, t + .08, 987.8, 1.2, .04); }
  else if (kind === 'reach') { boom(ctx, t, .14, 55); [330, 415.3, 493.9].forEach((f, i) => bell(ctx, t + .15 + i * .12, f, 1.6, .03)); }
  else if (kind === 'dream') { [392, 523.3, 659.3, 784, 1046.5].forEach((f, i) => bell(ctx, t + i * .07, f, 1.4, .035)); }
  else if (kind === 'wither') { boom(ctx, t, .12, 90); bell(ctx, t + .02, 233.1, .5, .025); bell(ctx, t + .1, 174.6, .6, .02); }
  else if (kind === 'grow') { bell(ctx, t, 523.3, 1.1, .04); bell(ctx, t + .09, 659.3, 1, .03); }
  else if (kind === 'shade') { boom(ctx, t, .18, 70); bell(ctx, t, 155.6, 1.2, .03); }
  else if (kind === 'win') { boom(ctx, t, .4, 60); [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => bell(ctx, t + .1 + i * .09, f, 2.4, .07)); }
  else if (kind === 'stir') { [523.3, 659.3, 784].forEach((f, i) => bell(ctx, t + i * .1, f, 1.8, .05)); }
  else if (kind === 'lose') { boom(ctx, t, .3, 50); bell(ctx, t, 146.8, 2.4, .05); }
}

export async function openTrial(tree, ctx) {
  dreamCss();
  const daily = ctx.daily || null, pool = await loadPool(), T = daily ? { ...TWIST[daily.rule], times: 1 } : TRIAL[tree], at = TREES.findIndex((x) => x.id === tree), info = daily ? { icon: TWIST[daily.rule].icon, mode: 'Daily Draft', name: `Day ${daily.day - daily.epoch + 1}`, zone: 'the same for everyone' } : TREES[at], duel = T.rule === 'duel';
  let attune = (ctx.attune && ctx.attune()) || null, cls = '', run = null, ticket = null, busy = false, last = null, hand = '', done = null, roll = false, rolling = false, withered = [], unstick = 0;
  const box = document.createElement('div');
  box.className = `dtrial ${duel ? 'duel' : ''} ${daily ? 'daily' : ''}`;
  if (daily) box.style.setProperty('--tw', TWIST[daily.rule].color);
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', T.name);
  box.innerHTML = '<i class="dwmist"></i><i class="dwmist two"></i><div class="dtpanel"></div>';
  document.body.append(box);
  const scrollWas = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  requestAnimationFrame(() => box.classList.add('on'));
  const panel = box.querySelector('.dtpanel');
  const close = () => { document.documentElement.style.overflow = scrollWas; removeEventListener('keydown', onKey); box.classList.remove('on'); setTimeout(() => box.remove(), 400); if ((done || daily) && ctx.after) ctx.after(done); };
  const onKey = (e) => { const pop = box.querySelector('.dtrevpop'); if (pop) { if ((e.key === 'Escape' || e.key === 'Enter') && !pop.querySelector('.dtrevok').disabled) { e.preventDefault(); pop.querySelector('.dtrevok').click(); } return; } if (e.key === 'Escape' && !busy) close(); };
  addEventListener('keydown', onKey);
  const head = () => `<header class="dthead"><img src="assets/icons/${info.icon}.png" alt=""><div><small>${daily ? `Daily Draft · Day ${daily.day - daily.epoch + 1}${cls ? ` · ${CLASS_NAME[cls]}` : ''}` : `${esc(info.mode)} · ${esc(info.name)}, ${esc(info.zone)}`}</small><b>${esc(T.name)}</b></div><button type="button" class="dtx" aria-label="Close">&times;</button></header>`;
  const bind = () => { const x = panel.querySelector('.dtx'); if (x) x.onclick = () => { if (!busy) close(); }; };
  const echo = () => (attune && attune.echo && attune.echo[tree]) || 0;
  const mixed = () => CLASSES.map((c) => [c, Math.random()]).sort((x, y) => x[1] - y[1]).map(([c]) => c);
  const pips = (n, of) => (of > 1 ? `<span class="dtpips" aria-label="${n} of ${of} walks">${Array.from({ length: of }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>` : '');

  function intro(error = '') {
    if (daily) return dailyIntro(error);
    const goal = duel
      ? '<b>Draft a hero that out-damages the Shade</b><small>You both draft from the same offers, one item a round, and the Shade always chooses first. It wants the item that helps its own hero most. When both heroes are done, they fight. One mulligan.</small>'
      : `<b>Draft a hero strong enough to wake the tree</b><small>Every slot is drafted from nothing, with one mulligan. The Dream chooses your class each walk. Your best spec counts. Wake the tree on ${T.times} separate walks.</small>`;
    panel.innerHTML = `${head()}<p class="dtrule">${esc(T.text)}</p>
      <div class="dtgoal"><span>To wake ${esc(info.name)} ${pips(echo(), T.times)}</span>${goal}</div>
      <div class="dtwheel idle" aria-hidden="true"><div class="dtreel">${mixed().map((c) => `<span style="--cc:${CLASS_COLOR[c]}"><img src="assets/classes/${c}.png" alt=""></span>`).join('')}</div></div>
      ${error ? `<p class="dterr">${esc(error)}</p>` : ''}<button type="button" class="dtgo" data-go>Walk the Dream</button>`;
    bind();
    panel.querySelector('[data-go]').onclick = begin;
  }

  function dailyIntro(error) {
    const back = daily.moves && daily.moves.length;
    panel.innerHTML = `${head()}<p class="dtrule">${esc(T.text)}</p>
      <div class="dtgoal"><span>Today's Daily Draft</span><b>${duel ? `Out-damage the Shade by as much as you can` : `Draft the strongest hero you can`}</b><small>The Dream picks one class for everyone today, with the same offers and one mulligan. Your best spec counts${duel ? ', and every hero is ranked by DPS over (or under) the Shade' : ''}. You get one walk, and it counts as soon as you begin.</small></div>
      <div class="dtwheel idle" aria-hidden="true"><div class="dtreel">${mixed().map((c) => `<span style="--cc:${CLASS_COLOR[c]}"><img src="assets/classes/${c}.png" alt=""></span>`).join('')}</div></div>
      ${error ? `<p class="dterr">${esc(error)}</p>` : ''}<button type="button" class="dtgo" data-go>${back ? 'Continue your draft' : 'Begin today\'s draft'}</button>`;
    bind();
    panel.querySelector('[data-go]').onclick = begin;
  }

  let sent = 0, sending = null;
  function step() {
    if (!daily || !run || run.mine.length === sent || finished(run)) return;
    const moves = [...run.mine];
    sent = moves.length;
    sending = ctx.post('/daily/step', { day: daily.day, moves }).catch(() => {});
  }

  async function post(body) {
    if (daily) {
      const d = await ctx.post(body.act === 'start' ? '/daily/start' : '/daily/finish', { day: daily.day, moves: body.moves, name: nameOk() ? heroName() : '' }).catch(() => null);
      return d && d.ok ? d : { error: (d && d.error) || 'down' };
    }
    const r = await fetch(`${ctx.API}/dream/trial`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ who: ctx.who(), tree, name: nameOk() ? heroName() : '', ...body }) });
    const d = await r.json().catch(() => null);
    return r.ok && d ? d : { error: (d && d.error) || 'down', attune: d && d.attune };
  }

  async function spin(target) {
    const reel = panel.querySelector('.dtreel'), wheel = panel.querySelector('.dtwheel');
    const loops = 5, list = [];
    for (let l = 0; l <= loops; l++) list.push(...CLASSES);
    reel.innerHTML = list.map((c) => `<span style="--cc:${CLASS_COLOR[c]}"><img src="assets/classes/${c}.png" alt=""></span>`).join('');
    wheel.classList.remove('idle');
    wheel.classList.add('spin');
    const cell = reel.firstElementChild.getBoundingClientRect().width + 10, idx = (loops - 1) * CLASSES.length + CLASSES.indexOf(target);
    const center = wheel.getBoundingClientRect().width / 2 - (cell - 10) / 2 - 5, end = idx * cell - center, dur = reduced() ? 1 : 3200, t0 = performance.now();
    let tick = -1;
    await new Promise((res) => {
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4), x = end * e, k = Math.floor((x + center) / cell);
        reel.style.transform = `translateX(${-x}px)`;
        if (k !== tick) { tick = k; if (p < .97) chime('tick'); }
        if (p < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    reel.children[idx].classList.add('land');
    wheel.classList.add('landed');
    wheel.insertAdjacentHTML('afterend', `<p class="dtcls" style="--cc:${CLASS_COLOR[target]}">The Dream chose a <b>${CLASS_NAME[target]}</b></p>`);
    chime('land');
    await new Promise((r) => setTimeout(r, reduced() ? 200 : 1300));
  }

  async function begin() {
    if (busy) return;
    if (!nameOk() && !(await askName())) return;
    busy = true;
    const go = panel.querySelector('[data-go]');
    if (go) go.disabled = true;
    const d = await post({ act: 'start' });
    if (!d.ok) {
      busy = false;
      if (d.attune) attune = d.attune;
      intro(d.error === 'name' ? 'Choose a name for your hero first.' : d.error === 'played' ? 'You have already walked today\'s Dream. A new one comes at the daily reset.' : d.error === 'ip' ? 'Today\'s Dream was already walked from this connection on another Hearthstone. One walk per connection each day.' : d.error === 'order' ? 'Wake the trees before this one first.' : d.error === 'awake' ? 'This tree is already awake.' : d.error === 'slow down' ? 'The Dream needs a moment. Try again shortly.' : 'The Dream could not be reached. Try again.');
      return;
    }
    if (go) go.remove();
    if (daily && d.moves && d.moves.length) { const w = panel.querySelector('.dtwheel'); if (w) w.remove(); } else await spin(d.cls);
    busy = false;
    ticket = d;
    cls = d.cls;
    run = daily ? trialRun(d.seed, cls, 'daily', d.rule) : trialRun(d.seed, cls, tree);
    if (daily) { for (const m of d.moves || []) act(pool, run, m); sent = run.mine.length; }
    window.dreamPicks = () => run.picks;
    last = null;
    roll = true;
    draw();
  }

  const stats = (id) => { const x = pool.items[id][7] || {}; return Object.entries(x).filter(([k]) => (STAT[k] || /^sk\d/.test(k)) && !(k === 'heal' && x.sp === x.heal) && !(k === 'rap' && x.ap === x.rap)).sort((a, b) => b[1] - a[1]); };
  const statName = (k) => STAT[k] || (/^sk\d/.test(k) ? 'Weapon skill' : k === 'hit+' ? 'a Chance on hit' : k === 'use' ? 'a Use effect' : k === 'equip' ? 'an Equip effect' : k);
  const statLine = (id) => stats(id).slice(0, 3).map(([k, v]) => `+${v}${PCT.has(k) ? '%' : ''} ${statName(k)}`).join(' · ');
  const estimate = () => { let best = 0; for (const b of BUILDS[cls]) best = Math.max(best, simulate(pool, cls, b.id, run.picks, run.seed, 2, false).dps); return best; };
  const icon = (it) => `<span class="ic"><img src="assets/icons/${it[4]}.png" alt=""></span>`;
  const whisper = (id) => {
    const it = pool.items[id], lines = it[12] || [], extra = [...(lines.some((l) => /^Chance on hit|^Equip: Chance/.test(l)) ? [['hit+', 99]] : []), ...(lines.some((l) => /^Use:/.test(l)) ? [['use', 99]] : [])];
    if (!extra.length && !stats(id).length && lines.some((l) => /^Equip:/.test(l))) extra.push(['equip', 99]);
    const all = [...extra, ...stats(id)], top = all.find(([k]) => k !== 'sta') || all[0];
    if (!top) return 'The mist is silent';
    const rest = all.filter((e) => e !== top), r = rng(hash(run.seed, 'whisper', id)), two = rest.length ? [top, rest[(r() * rest.length) | 0]] : [top];
    if (r() < .5) two.reverse();
    return `Whispers of ${two.map(([k]) => statName(k)).join(' and ')}`;
  };
  const ICONS = Object.values(pool.items).map((x) => x[4]);

  function witherHead() {
    const n = withersFor(pool, run);
    return `<h4 class="dtwhead"><img src="assets/icons/136144.png" alt="">Wither first<small><span class="dtpetals">${Array.from({ length: n }, (_, i) => `<i class="${i < withered.length ? 'gone' : ''}"></i>`).join('')}</span>The Dream cannot grow what you wither</small></h4>`;
  }

  function wither(card) {
    const s = card.dataset.wither;
    if (rolling || withered.includes(s) || withered.length >= withersFor(pool, run) || card.classList.contains('crumble')) return;
    withered = [...withered, s];
    rolling = true;
    card.classList.add('crumble');
    const petal = panel.querySelectorAll('.dtpetals i')[withered.length - 1];
    if (petal) petal.classList.add('gone');
    chime('wither');
    setTimeout(() => {
      const list = panel.querySelector('.dtslots'), rest = [...list.children].filter((c) => c !== card), from = new Map(rest.map((c) => [c, c.getBoundingClientRect()]));
      card.remove();
      for (const c of rest) { const a = from.get(c), b = c.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top; if (!dx && !dy) continue; c.style.transition = 'none'; c.style.transform = `translate(${dx}px, ${dy}px)`; requestAnimationFrame(() => { c.style.transition = 'transform .28s cubic-bezier(.2, .8, .3, 1)'; c.style.transform = ''; }); }
      setTimeout(() => {
        rolling = false;
        if (withered.length < withersFor(pool, run)) return;
        const sec = panel.querySelector('.dtoffer');
        sec.classList.remove('withering');
        sec.classList.add('kept');
        sec.querySelector('h4').outerHTML = '<h4>On offer<small>Keep one</small></h4>';
        for (const c of sec.querySelectorAll('[data-wither]')) {
          c.classList.remove('wphase');
          c.dataset.take = c.dataset.wither;
          delete c.dataset.wither;
          c.querySelector('em').outerHTML = '<em>Keep</em>';
          c.onclick = () => { if (!rolling) take(c.dataset.take); };
        }
      }, reduced() ? 0 : 300);
    }, reduced() ? 0 : 520);
  }

  function reachHtml() {
    const fog = fogOf(pool, run);
    if (!fog.length) return '';
    const n = {}, legend = fog.some((f) => f.q === 5), rest = fog.filter((f) => f.q !== 5);
    for (const f of rest) n[f.q] = (n[f.q] || 0) + 1;
    const parts = Object.keys(n).sort().map((q) => [QUALITY[q], (n[q] / Math.max(1, rest.length)) * (legend ? .5 : 1)]);
    if (legend) parts.push([QUALITY[5], rest.length ? .5 : 1]);
    let at = 0;
    const stops = parts.map(([c, w]) => { const a = at; at += w; return `${c} ${(a * 100).toFixed(1)}% ${(at * 100).toFixed(1)}%`; }).join(', ');
    return `<button type="button" class="dtslot offer reach" data-reach style="--mist:conic-gradient(from 210deg, ${stops});--line:linear-gradient(90deg, ${stops})" title="The mist glows with the colours of what it hides"><span class="ic"><i></i></span><span class="tx"><b>Reach into the mist</b><small>Its glow hints at what the fog hides</small></span><em>Reach</em></button>`;
  }

  function offerHtml(s, v) {
    const id = v.offer[s], it = pool.items[id], q = QUALITY[it[1]], two = hand === s ? hands(pool, run, s, id) : [];
    if (two.length > 1) return `<div class="dtslot offer ask" style="--q:${q}">${icon(it)}<span class="tx"><b>Which hand?</b><span class="dthands">${two.map((t) => `<button type="button" data-take="${s}>${t}">${NAME[t]}</button>`).join('')}</span></span></div>`;
    if (run.rule === 'veil') return `<button type="button" class="dtslot offer veil" data-take="${s}" data-q="${it[1]}" style="--q:${q}"><span class="ic"><i></i></span><span class="tx"><b style="color:${q}">${RARE[it[1]]} ${NAME[s]}</b><small>${whisper(id)}</small></span><em>Keep</em></button>`;
    if (run.rule === 'grow' && withered.includes(s)) return '';
    if (run.rule === 'grow' && withered.length < withersFor(pool, run)) return `<button type="button" class="dtslot offer wphase" data-wither="${s}" data-item="${id}" style="--q:${q}">${icon(it)}<span class="tx"><b style="color:${q}">${esc(it[0])}</b><small>${NAME[s]} · ${statLine(id) || ''}</small></span><em class="dtrot"><img src="assets/icons/136144.png" alt="">Wither</em></button>`;
    return `<button type="button" class="dtslot offer" data-take="${s}" data-item="${id}" style="--q:${q}">${icon(it)}<span class="tx"><b style="color:${q}">${esc(it[0])}</b><small>${NAME[s]} · ${statLine(id) || ''}</small></span><em>Keep</em></button>`;
  }

  function heroHtml(picks, cls2, mark, shade) {
    const cells = SLOTS.map(([s]) => {
      if (!(s in picks)) return `<li class="hv empty" title="${NAME[s]}"><span class="ic"></span><small>${NAME[s]}</small></li>`;
      const id = picks[s];
      if (!id) return `<li class="hv dead"><span class="ic"></span><small>${s === 'off' ? 'Two-hand' : 'Empty'}</small></li>`;
      const it = pool.items[id], fresh = mark && mark.includes(s);
      return `<li class="hv ${fresh ? 'fresh' : ''}" style="--q:${QUALITY[it[1]]}" data-item="${id}">${icon(it)}<small>${NAME[s]}</small></li>`;
    }).join('');
    return `<section class="dthero ${shade ? 'shade' : ''}"><h4>${shade ? `<i class="dtshadeic"><img src="assets/classes/${cls2}.png" alt=""></i>The Shade's ${CLASS_NAME[cls2]}` : `<img src="assets/classes/${cls2}.png" alt="">Your ${CLASS_NAME[cls2]}`}<small>${Object.values(picks).filter(Boolean).length} kept</small></h4><ul>${cells}</ul></section>`;
  }

  function draw() {
    const v = view(pool, run), left = remaining(run).length, open = remaining(run).filter((s) => v.offer[s]), fog = remaining(run).filter((s) => !v.offer[s] && s !== v.stolen);
    step();
    let meter = '';
    if (!duel && !daily) {
      const r = estimate() / Math.max(1, ticket.mark), k = STAGES.findIndex(([m]) => r < m);
      meter = `<div class="dtstage" style="--k:${k}"><span class="dtleaves">${STAGES.map((_, i) => `<i class="${i <= k ? 'on' : ''}"></i>`).join('')}</span><b>${STAGES[k][1]}</b></div>`;
    }
    const shadeNote = v.stolen ? `<div class="dtsteal" data-item="${v.took}" style="--q:${QUALITY[pool.items[v.took][1]]}"><i class="dtshadeic"><img src="assets/classes/${cls}.png" alt=""></i><span><small>The Shade takes first</small><b>${esc(pool.items[v.took][0])}</b><small>${NAME[v.stolen]} · gone from your offer${!v.keep ? ', and the Shade lets it crumble to mist' : v.remade ? `, reshaped into <em style="color:${QUALITY[pool.items[v.put][1]]}">${esc(pool.items[v.put][0])}</em> for its ${NAME[v.to]}` : ''}</small></span></div>` : '';
    const note = last && last.reached ? `<p class="dtnote grow">You reached into the mist and pulled out <b style="color:${QUALITY[pool.items[last.reached][1]]}">${esc(pool.items[last.reached][0])}</b> for your ${NAME[last.slot]}.</p>` : last && last.grew ? `<p class="dtnote grow">The Dream grew into your ${NAME[last.grew.slot]}: <b style="color:${QUALITY[pool.items[last.grew.id][1]]}">${esc(pool.items[last.grew.id][0])}</b></p>` : '';
    const fresh = last ? [last.slot, last.grew && last.grew.slot].filter(Boolean) : [], rd = redreamOf(pool, run), done = finished(run);
    const dreamBtn = run.rule === 'veil' ? `<button type="button" class="dtredream" data-redream ${rd ? '' : 'disabled'} title="Re-roll your latest pick into an item of the same item level or higher"><span>${[0, 1, 2].map((i) => `<i class="${i < run.redreams ? 'on' : ''}"></i>`).join('')}</span>${rd ? `Redream your ${NAME[rd.slot]}` : run.redreams ? 'Redream your latest pick' : 'No redreams left'}</button>` : '';
    const revId = run.rule === 'veil' && last && !last.hide ? (last.redream ? last.redream.to : run.picks[last.slot]) : 0;
    const reveal = revId ? `<div class="dtreveal ${last.shown ? 'seen' : ''}" style="--q:${QUALITY[pool.items[revId][1]]}"><button type="button" class="dtrevcard" data-item="${revId}">${icon(pool.items[revId])}<span class="tx"><small>${last.redream ? `The Dream reshaped your ${NAME[last.redream.slot]}` : `The mist parts · your ${NAME[last.slot]}`}</small><b style="color:${QUALITY[pool.items[revId][1]]}">${esc(pool.items[revId][0])}</b><small>${statLine(revId) || RARE[pool.items[revId][1]]}</small></span></button><button type="button" class="dtrevx" data-revx aria-label="Dismiss">&times;</button></div>` : '';
    const dreamNote = last && last.redream ? `<p class="dtnote dream">The Dream reshaped <s>${esc(pool.items[last.redream.from][0])}</s> into <b style="color:${QUALITY[pool.items[last.redream.to][1]]}">${esc(pool.items[last.redream.to][0])}</b>.</p>` : '';
    panel.innerHTML = `${head()}<div class="dtbar">${meter || `<div class="dtstage"><b>${left} ${left === 1 ? 'round' : 'rounds'} ${daily ? 'left' : 'to the fight'}</b></div>`}${run.rule === 'fade' ? `<button type="button" class="dtlamp" data-lamp ${run.lanterns && run.lit !== run.round ? '' : 'disabled'} title="See every slot this round"><span>${[0, 1, 2].map((i) => `<i class="${i < run.lanterns ? 'on' : ''}"></i>`).join('')}</span>${run.lit === run.round ? 'Lantern lit' : run.lanterns ? 'Light a lantern' : 'No lanterns left'}</button>` : ''}${dreamBtn}<button type="button" class="dtmull" data-mull ${run.mulligan && !done ? '' : 'disabled'}>${run.mulligan ? 'Mulligan' : 'Mulligan used'}</button></div>
      ${shadeNote}${dreamNote || note}
      <div class="dtheroes">${heroHtml(run.picks, cls, fresh)}${duel ? heroHtml(v.stolen && v.keep ? { ...run.shade.picks, [v.to]: v.put, ...(v.to === 'main' && pool.items[v.put][3] === 17 ? { off: 0 } : {}) } : run.shade.picks, cls, v.stolen && v.keep ? [v.to] : [], true) : ''}</div>
      ${done ? `<section class="dtoffer dtready">${reveal}<h4>Your hero is complete<small>${run.redreams ? `${run.redreams} ${run.redreams === 1 ? 'redream' : 'redreams'} left` : 'no redreams left'}</small></h4><p>${rd ? `You can still redream your ${NAME[rd.slot]} before ${daily ? 'your hero is weighed' : 'the tree weighs your hero'}.` : daily ? 'Your hero is ready to be weighed.' : 'The tree is ready to weigh your hero.'}</p><button type="button" class="dtgo" data-wake>${daily ? 'Weigh my hero' : 'Wake the tree'}</button></section>` : `<section class="dtoffer ${run.rule === 'grow' && withered.length < withersFor(pool, run) ? 'withering' : ''}">${reveal}${run.rule === 'grow' && withered.length < withersFor(pool, run) ? witherHead() : '<h4>On offer<small>Keep one</small></h4>'}<div class="dtslots">${open.map((s) => offerHtml(s, v)).join('')}${reachHtml()}</div>${fog.length && run.rule === 'fade' ? `<p class="dtfog">Lost in the fog: ${fog.map((s) => NAME[s]).join(', ')}</p>` : ''}</section>`}
      <p class="dtleft">${left} ${left === 1 ? 'slot' : 'slots'} left${duel ? '' : ` · ${CLASS_NAME[cls]}`}</p>`;
    bind();
    for (const b of panel.querySelectorAll('[data-take]')) b.onclick = () => { if (!rolling) take(b.dataset.take); };
    if (last && last.redream) { const c = panel.querySelector('.dthero:not(.shade) .hv.fresh'); if (c) c.classList.add('redreamed'); }
    const rv = panel.querySelector('.dtreveal');
    if (rv) {
      if (!last.shown) { last.shown = 1; revealPop(revId); }
      rv.querySelector('[data-revx]').onclick = () => { last.hide = 1; rv.classList.add('gone'); setTimeout(() => rv.remove(), 220); };
    }
    const rb = panel.querySelector('[data-redream]');
    if (rb) rb.onclick = () => redream();
    const wake = panel.querySelector('[data-wake]');
    if (wake) wake.onclick = () => { if (!rolling) finish(); };
    for (const b of panel.querySelectorAll('[data-wither]')) b.onclick = () => wither(b);
    const reach = panel.querySelector('[data-reach]');
    if (reach) reach.onclick = () => {
      if (rolling || reach.classList.contains('reaching')) return;
      rolling = true;
      reach.classList.add('reaching');
      chime('reach');
      setTimeout(() => {
        rolling = false;
        const r = act(pool, run, 'R'), q = QUALITY[pool.items[r.took][1]];
        last = { slot: r.reached, reached: r.took };
        hand = '';
        roll = true;
        chime(pool.items[r.took][1] >= 4 ? 'win' : 'keep');
        if (finished(run)) { finish(); return; }
        draw();
        const cell = [...panel.querySelectorAll('.dthero:not(.shade) .hv')][SLOTS.findIndex(([x]) => x === r.reached)];
        if (cell) { cell.style.setProperty('--rq', q); cell.classList.add('pulled'); }
      }, reduced() ? 0 : 900);
    };
    const m = panel.querySelector('[data-mull]');
    const lamp = panel.querySelector('[data-lamp]');
    if (lamp) lamp.onclick = () => { if (rolling || !run.lanterns || run.lit === run.round) return; act(pool, run, 'L'); hand = ''; roll = true; chime('grow'); draw(); };
    if (m) m.onclick = () => { if (!run.mulligan || rolling) return; act(pool, run, '!'); last = null; hand = ''; withered = []; roll = true; draw(); };
    if (roll) { roll = false; spinOffers(); }
    if (v.stolen) chime('shade');
  }

  function spinOffers() {
    const list = [...panel.querySelectorAll('.dtoffer .dtslot.offer')];
    if (!list.length || reduced()) return;
    rolling = true;
    panel.querySelector('.dtoffer').classList.add('rolling');
    clearTimeout(unstick);
    unstick = setTimeout(() => { rolling = false; }, 400 + list.length * 34);
    const t0 = performance.now(), end = list.map((_, i) => 260 + i * 34), keep = list.map((b) => ({ img: b.querySelector('.ic img'), src: b.querySelector('.ic img') && b.querySelector('.ic img').src, q: b.style.getPropertyValue('--q') }));
    let last = 0;
    const step = (now) => {
      const t = now - t0;
      if (now - last > 65) {
        last = now;
        list.forEach((b, i) => {
          if (t >= end[i] || b.classList.contains('landed')) return;
          if (keep[i].img) keep[i].img.src = `assets/icons/${ICONS[(Math.random() * ICONS.length) | 0]}.png`;
          else b.style.setProperty('--q', QUALITY[2 + ((Math.random() * 3) | 0)]);
        });
      }
      list.forEach((b, i) => { if (t >= end[i] && !b.classList.contains('landed')) { b.classList.add('landed'); if (keep[i].img) keep[i].img.src = keep[i].src; b.style.setProperty('--q', keep[i].q); } });
      if (t < end[end.length - 1]) requestAnimationFrame(step);
      else { rolling = false; const o = panel.querySelector('.dtoffer'); if (o) o.classList.remove('rolling'); }
    };
    requestAnimationFrame(step);
  }

  function take(move) {
    const [slot, to] = move.split('>');
    const v = view(pool, run), id = v.offer[slot];
    if (!id) return;
    if (!to) { const two = hands(pool, run, slot, id); if (two.length > 1) { hand = slot; draw(); return; } }
    hand = '';
    const burn = withered.filter((x) => x !== slot);
    withered = [];
    const r = act(pool, run, (to ? move : slot) + (burn.length ? `|${burn.join(',')}` : ''));
    last = { slot: to || slot, grew: r.grew, shade: r.shade };
    roll = true;
    chime(r.grew ? 'grow' : 'keep');
    if (finished(run) && run.rule !== 'veil') finish(); else draw();
  }

  function revealPop(id) {
    const old = box.querySelector('.dtrevpop');
    if (old) old.remove();
    const it = pool.items[id], q = QUALITY[it[1]], lines = stats(id).slice(0, 4).map(([k, v]) => `<li>+${v}${PCT.has(k) ? '%' : ''} ${statName(k)}</li>`).join('');
    const pop = document.createElement('div');
    pop.className = 'dtrevpop';
    pop.style.setProperty('--q', q);
    pop.innerHTML = `<div class="dtrevbox" role="dialog" aria-label="Revealed item"><small>${last.redream ? `The Dream reshaped your ${NAME[last.redream.slot]}` : `The mist parts · your ${NAME[last.slot]}`}</small><button type="button" class="dtrevbig" data-item="${id}"><img src="assets/icons/${it[4]}.png" alt=""></button><b style="color:${q}">${esc(it[0])}</b><span class="dtrevmeta">${RARE[it[1]]} · item level ${it[2]}</span>${lines ? `<ul>${lines}</ul>` : ''}<button type="button" class="dtrevok" disabled>Walk on</button><span class="dtrevtip">Tap the item for its full tooltip</span></div>`;
    box.append(pop);
    const ok = pop.querySelector('.dtrevok');
    const shut = () => { if (ok.disabled) return; pop.classList.add('out'); setTimeout(() => pop.remove(), 260); };
    setTimeout(() => { ok.disabled = false; }, reduced() ? 0 : 750);
    ok.onclick = shut;
    pop.onclick = (e) => { if (e.target === pop) shut(); };
  }

  function redream() {
    const r = redreamOf(pool, run);
    if (!r || rolling) return;
    rolling = true;
    const cell = [...panel.querySelectorAll('.dthero:not(.shade) .hv')][SLOTS.findIndex(([s]) => s === r.slot)];
    if (cell) cell.classList.add('redreaming');
    chime('dream');
    setTimeout(() => {
      rolling = false;
      const d = act(pool, run, 'D');
      last = { slot: d.redream.slot, redream: d.redream };
      chime('keep');
      draw();
    }, reduced() ? 0 : 720);
  }

  const count = (el, to, dur) => new Promise((res) => { const t0 = performance.now(); const step = (now) => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = (to * e).toFixed(1); if (p < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });

  async function finish() {
    if (daily) return dailyFinish();
    busy = true;
    const local = judge(pool, run);
    if (duel) panel.innerHTML = `${head()}<div class="dtduel"><small>The heroes meet in the Twilight Grove</small><div class="dtvs"><div class="dtside me"><img src="assets/classes/${cls}.png" alt=""><span>You</span><b class="dtdps">0</b></div><em>vs</em><div class="dtside sh"><i class="dtshadeic"><img src="assets/classes/${cls}.png" alt=""></i><span>The Shade</span><b class="dtdps">0</b></div></div><div class="dtrace"><i class="me"></i><i class="sh"></i></div></div>`;
    else panel.innerHTML = `${head()}<div class="dtresult"><small>The Dream weighs your hero</small><b class="dtdps">0</b><span class="dtof">DPS</span></div>`;
    bind();
    const d = await post({ act: 'finish', seed: ticket.seed, sig: ticket.sig, moves: run.mine });
    const dps = d.ok ? d.dps : local.dps, mark = d.ok ? d.mark : local.mark, passed = d.ok ? d.passed : 0, dur = reduced() ? 1 : duel ? 2600 : 1600;
    if (d.attune) attune = d.attune;
    let res;
    if (duel) {
      const [a, b] = panel.querySelectorAll('.dtdps'), race = panel.querySelector('.dtrace'), top = Math.max(dps, mark, 1);
      race.style.setProperty('--a', dps / top);
      race.style.setProperty('--b', mark / top);
      race.classList.add('racing');
      await Promise.all([count(a, dps, dur), count(b, mark, dur)]);
      res = panel.querySelector('.dtduel');
      res.querySelector(passed ? '.me' : '.sh').classList.add('win');
    } else {
      await count(panel.querySelector('.dtdps'), dps, dur);
      res = panel.querySelector('.dtresult');
      res.querySelector('.dtof').textContent = `DPS · the tree needed ${mark}`;
    }
    busy = false;
    const spec = (BUILDS[cls].find((b) => b.id === (d.build || local.build)) || {}).name || '';
    res.classList.add(passed ? 'won' : 'lost');
    const awake = passed && attune && attune.trees[tree];
    chime(!passed ? 'lose' : awake ? 'win' : 'stir');
    if (!d.ok) res.insertAdjacentHTML('beforeend', '<p class="dterr">The Dream could not be reached, so this walk was not counted. Try again.</p><div class="dtbtns"><button type="button" class="dtgo" data-again>Walk again</button></div>');
    else if (awake) {
      done = attune;
      const next = TREES[at + 1];
      res.insertAdjacentHTML('beforeend', `<div class="dtwake"><span class="dvtree"><img src="assets/icons/${info.icon}.png" alt=""></span><b>${esc(info.name)} awakens</b><small>${esc(spec)} ${CLASS_NAME[cls]} · ${dps.toFixed(1)} DPS</small></div><div class="dtbtns">${next && !attune.trees[next.id] ? `<button type="button" class="dtgo" data-next="${next.id}">On to ${esc(next.name)}</button>` : ''}<button type="button" class="dtsoft" data-close>${next && !attune.trees[next.id] ? 'Later' : 'Back to the trees'}</button></div>`);
      setTimeout(() => vision(attune.steps, attune), 900);
    } else if (passed) {
      done = attune;
      res.insertAdjacentHTML('beforeend', `<div class="dtwake stir"><span class="dvtree"><img src="assets/icons/${info.icon}.png" alt=""></span><b>${esc(info.name)} stirs</b>${pips(echo(), T.times)}<small>${esc(spec)} ${CLASS_NAME[cls]} · ${dps.toFixed(1)} DPS. Walk the Dream ${T.times - echo() === 1 ? 'once more' : `${T.times - echo()} more times`} to wake it.</small></div><div class="dtbtns"><button type="button" class="dtgo" data-again>Walk again</button><button type="button" class="dtsoft" data-close>Later</button></div>`);
    } else res.insertAdjacentHTML('beforeend', `<p class="dtmiss">${duel ? `The Shade wins by ${(mark - dps).toFixed(1)} DPS. It fades back into the grove, waiting.` : `${(mark - dps).toFixed(1)} DPS short. The Dream fades, but the tree is still there.`}</p><div class="dtbtns"><button type="button" class="dtgo" data-again>Walk again</button><button type="button" class="dtsoft" data-close>Later</button></div>`);
    const again = panel.querySelector('[data-again]'), nxt = panel.querySelector('[data-next]'), cl = panel.querySelector('[data-close]');
    if (again) again.onclick = () => intro();
    if (cl) cl.onclick = close;
    if (nxt) nxt.onclick = () => { document.documentElement.style.overflow = scrollWas; removeEventListener('keydown', onKey); box.remove(); if (ctx.after) ctx.after(done); openTrial(nxt.dataset.next, { ...ctx, attune: () => done }); };
  }

  async function dailyFinish() {
    busy = true;
    if (duel) panel.innerHTML = `${head()}<div class="dtduel"><small>The heroes meet in the Dream</small><div class="dtvs"><div class="dtside me"><img src="assets/classes/${cls}.png" alt=""><span>You</span><b class="dtdps">0</b></div><em>vs</em><div class="dtside sh"><i class="dtshadeic"><img src="assets/classes/${cls}.png" alt=""></i><span>The Shade</span><b class="dtdps">0</b></div></div><div class="dtrace"><i class="me"></i><i class="sh"></i></div></div>`;
    else panel.innerHTML = `${head()}<div class="dtresult"><small>The Dream weighs your hero</small><b class="dtdps">0</b><span class="dtof">DPS</span></div>`;
    bind();
    if (sending) await sending;
    let d = await post({ act: 'finish', moves: run.mine });
    if (!d.ok && d.error === 'down') { await new Promise((r) => setTimeout(r, 1200)); d = await post({ act: 'finish', moves: run.mine }); }
    const local = judge(pool, run), dps = d.ok ? d.dps : local.dps, spec = (BUILDS[cls].find((b) => b.id === (d.build || local.build)) || {}).name || '';
    let res;
    if (duel) {
      const sh = d.ok ? d.shade : local.mark, [a, b] = panel.querySelectorAll('.dtdps'), race = panel.querySelector('.dtrace'), top = Math.max(dps, sh, 1), dur = reduced() ? 1 : 2600;
      race.style.setProperty('--a', dps / top);
      race.style.setProperty('--b', sh / top);
      race.classList.add('racing');
      await Promise.all([count(a, dps, dur), count(b, sh, dur)]);
      res = panel.querySelector('.dtduel');
      res.querySelector(dps > sh ? '.me' : '.sh').classList.add('win');
      const m = +(dps - sh).toFixed(1);
      res.insertAdjacentHTML('beforeend', `<p class="dtmargin ${m > 0 ? 'up' : 'down'}"><b>${m > 0 ? '+' : m < 0 ? '\u2212' : ''}${Math.abs(m).toFixed(1)}</b><small>${m > 0 ? 'DPS over the Shade' : m < 0 ? 'DPS behind the Shade' : 'dead even with the Shade'} · ${esc(spec)} ${CLASS_NAME[cls]}</small></p>`);
    } else {
      await count(panel.querySelector('.dtdps'), dps, reduced() ? 1 : 1600);
      res = panel.querySelector('.dtresult');
      res.querySelector('.dtof').textContent = `DPS · ${spec} ${CLASS_NAME[cls]}`;
    }
    busy = false;
    if (!d.ok) {
      res.classList.add('lost');
      res.insertAdjacentHTML('beforeend', `<p class="dterr">${d.error === 'played' ? 'This walk was already counted.' : 'The Dream could not be reached. Your draft is saved, so open the Daily Draft again to finish it.'}</p><div class="dtbtns"><button type="button" class="dtsoft" data-close>Close</button></div>`);
    } else {
      const pos = d.you && d.you.pos, of = d.played;
      done = d;
      res.classList.add('won');
      chime(pos === 1 ? 'win' : pos <= 10 ? 'stir' : 'keep');
      res.insertAdjacentHTML('beforeend', `<div class="dtplace"><b>${pos === 1 ? 'First' : `#${pos}`}</b><small>${pos === 1 && of === 1 ? 'You are the first to walk today\'s Dream' : `of ${of} ${of === 1 ? 'hero' : 'heroes'} today so far`}</small></div><div class="dtbtns"><button type="button" class="dtgo" data-board>See today's board</button><button type="button" class="dtsoft" data-close>Close</button></div>`);
    }
    const cl = panel.querySelector('[data-close]'), bd = panel.querySelector('[data-board]');
    if (cl) cl.onclick = close;
    if (bd) bd.onclick = () => { close(); if (ctx.board) setTimeout(() => ctx.board(d), 420); };
  }

  intro();
}

export const trialList = TRIALS;
