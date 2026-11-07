(() => {
  const AR = () => window.LI_ARMORY;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SCHOOL = { fire: '#ff8a3c', frost: '#8fd0ff', arcane: '#e09bff', shadow: '#b18cff', nature: '#7dff8a', holy: '#ffe680', phys: '#ffffff' };
  const STATE = { stun: 'Stunned', fear: 'Feared', poly: 'Polymorphed', root: 'Rooted', block: 'Immune', stealth: 'Stealthed' };
  const STATE_IC = { stun: 'spell_frost_stun', fear: 'spell_shadow_possession', poly: 'spell_nature_polymorph', root: 'spell_frost_frostnova', block: 'spell_holy_divineintervention', stealth: 'ability_stealth' };
  const ARENAS = [['scenes/ruinsoflordaeron', 'the Ruins of Lordaeron'], ['art/land-badlands', 'the Badlands'], ['art/land-thousandneedles', 'Thousand Needles'], ['scenes/kalimdor', 'the Barrens'], ['art/land-swamp', 'the Swamp of Sorrows'], ['scenes/easternkingdom', 'Elwynn Forest']];
  const LINES = {
    win: ['{w} stands victorious over {l}.', '{l} yields. {w} takes the duel.', '{w} wins, and {l} will be hearing about it.', 'The crowd roars for {w}.'],
    close: ['A razor-thin finish. {w} survives on {hp}% health.', '{w} wins by a hair, on {hp}% health.'],
    stomp: ['{w} barely broke a sweat.', 'That was over quickly. {w} untouched at {hp}%.'],
    time: ['Time runs out. {w} is ahead on health.'],
  };
  let ENG = null, SPELLS = null, run = null, H = null;
  const engine = () => (ENG = ENG || import('./pvp/engine.js'));
  const spells = () => (SPELLS = SPELLS || new Promise((done) => {
    if (window.LI_SPELLS) { done(window.LI_SPELLS); return; }
    const sc = document.createElement('script');
    sc.src = 'spellicons.js';
    sc.onload = () => done(window.LI_SPELLS || {});
    sc.onerror = () => done({});
    document.head.appendChild(sc);
  }));

  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  const weapon = (g) => {
    if (!g || !g.wpn || !g.wpn[0]) return null;
    const m = String(g.wpn[0]).match(/(\d+)\s*-\s*(\d+)/), sp = String(g.wpn[1] || '').match(/([\d.]+)/);
    return m && sp ? { min: +m[1], max: +m[2], speed: +sp[1] } : null;
  };
  const clsKey = (c) => String(c || '').toUpperCase().replace(/\s+/g, '');

  function sideOf(D, E, r, edge) {
    const S = D.stats || {}, cls = clsKey(D.c.c), G = {};
    D.gear.forEach((g) => { G[g.slot] = g; });
    const plans = Object.keys(E.PLANS[cls]);
    const luck = (r() * 2 - 1) * 0.12;
    return {
      cls, plan: E.PLANS[cls][plans[Math.floor(r() * plans.length)]],
      stats: { str: S.str || 0, agi: S.agi || 0, sta: S.sta || 0, int: S.int || 0, spi: S.spi || 0, armor: S.arm || 0, ap: S.ap || 0, rap: S.rap || 0, sp: S.sp || 0, crit: S.crit || 0, scrit: S.scrit || 0, hit: S.hit || 0, shit: S.shit || 0, mana: S.pt === 'Mana' ? S.pw || 0 : 0, mp5: 0 },
      main: weapon(G.MAIN_HAND), off: weapon(G.OFF_HAND), bow: weapon(G.RANGED),
      extra: { boon: { dmg: luck + edge.dmg, taken: edge.taken } },
    };
  }

  function edges(la, lb) {
    const d = la - lb, up = Math.min(2.5, Math.abs(d) * 0.06), tough = Math.min(0.75, Math.abs(d) * 0.025), weak = Math.min(0.75, Math.abs(d) * 0.025);
    if (!d) return [{ dmg: 0, taken: 0 }, { dmg: 0, taken: 0 }];
    const hi = { dmg: up, taken: tough }, lo = { dmg: -weak, taken: -Math.min(1.5, Math.abs(d) * 0.04) };
    return d > 0 ? [hi, lo] : [lo, hi];
  }

  const spellIcon = (name, D) => {
    if (/^(Melee|Auto Shot|Shoot|Off-hand)$/i.test(name)) {
      const g = D.gear.find((x) => x.slot === (/Shot|Shoot/i.test(name) ? 'RANGED' : 'MAIN_HAND'));
      if (g) return AR().icon(g);
    }
    const id = SPELLS_MAP[String(name || '').toLowerCase()];
    return id ? `https://render.worldofwarcraft.com/us/icons/56/${id}.jpg` : AR().H.UI('inv_misc_questionmark');
  };
  let SPELLS_MAP = {};

  const SLOT3 = { HEAD: 'head', SHOULDER: 'shoulder', BACK: 'back', CHEST: 'chest', WRIST: 'wrist', HANDS: 'hands', WAIST: 'waist', LEGS: 'legs', FEET: 'feet', MAIN_HAND: 'main', OFF_HAND: 'off', RANGED: 'ranged' };
  const INV = { head: [1], shoulder: [3], back: [16], chest: [5, 20], wrist: [9], hands: [10], waist: [6], legs: [7], feet: [8], main: [13, 17, 21], off: [13, 14, 22, 23], ranged: [15, 25, 26] };
  const ARMOR = { Cloth: 1, Leather: 2, Mail: 3, Plate: 4 };
  const WPN = { Axe: [0, 1], Mace: [4, 5], Sword: [7, 8], Staff: [10], Polearm: [6], Dagger: [15], 'Fist Weapon': [13], Bow: [2], Gun: [3], Crossbow: [18], Wand: [19], Thrown: [16], 'Fishing Pole': [20] };
  const BODY = { Human: 'human', Dwarf: 'human', Gnome: 'human', Undead: 'human', 'High Order Skyborne': 'human', Orc: 'orc', Troll: 'orc', Tauren: 'orc', 'Night Elf': 'nightelf', 'Windshaper Skyborne': 'nightelf' };
  let D3 = null;

  function index3d(pool, gear) {
    const by = {};
    for (const id of Object.keys(gear.items)) {
      const r = pool.items[id];
      if (!r) continue;
      for (const [slot, inv] of Object.entries(INV)) if (inv.includes(r[3])) (by[slot] = by[slot] || []).push(+id);
    }
    return by;
  }

  function pick3d(g, slot, cls) {
    const { pool, gear, by } = D3;
    if (gear.items[g.id]) return { id: g.id, row: pool.items[g.id] || null };
    const two = /two-hand/i.test(g.inv || ''), list = by[slot] || [];
    let subs = null, klass = 4;
    if (slot === 'main' || slot === 'ranged' || (slot === 'off' && WPN[g.sub])) { klass = 2; subs = WPN[g.sub] || null; if (subs && slot === 'main' && subs.length > 1) subs = two ? [subs[1]] : [subs[0]]; }
    else if (slot === 'off' && /shield/i.test(g.sub || '')) subs = [6];
    else if (ARMOR[g.sub]) subs = [ARMOR[g.sub]];
    let pool2 = list.filter((id) => { const r = pool.items[id]; return r[5] === klass && (!subs || subs.includes(r[6])) && (slot !== 'main' || (two ? r[3] === 17 : r[3] !== 17)); });
    if (!pool2.length && slot === 'main') pool2 = list.filter((id) => (two ? pool.items[id][3] === 17 : pool.items[id][3] !== 17));
    if (!pool2.length) pool2 = list;
    if (!pool2.length) return null;
    const near = pool2.slice().sort((a, b) => (Math.abs(pool.items[a][2] - g.il) + 6 * Math.abs(pool.items[a][1] - g.q)) - (Math.abs(pool.items[b][2] - g.il) + 6 * Math.abs(pool.items[b][1] - g.q))).slice(0, 5);
    const id = near[g.id % near.length];
    return { id, row: pool.items[id] };
  }

  function side3d(D) {
    const cls = clsKey(D.c.c), picks = {}, rows = {};
    for (const g of D.gear) {
      const slot = SLOT3[g.slot];
      if (!slot) continue;
      const p3 = pick3d(g, slot, cls);
      if (!p3) continue;
      picks[slot] = p3.id;
      rows[p3.id] = p3.row || [g.n, g.q, g.il, 0, 0, 4, 0];
    }
    return { cls, picks, rows, boons: [], body: BODY[D.c.r] || null };
  }

  async function arena3d() {
    if (D3) return D3;
    if (!window.WebGLRenderingContext) throw new Error('no webgl');
    const [mod, pool, gear] = await Promise.all([import('./pvp/arena.js'), fetch('draft/pool.json').then((r) => r.json()), fetch('draft/gear.json').then((r) => r.json())]);
    const host = document.createElement('div');
    host.className = 'du-3dhost';
    const P = { items: {} };
    const arena = new mod.Arena(host, gear, P);
    D3 = { mod, pool, gear, host, P, arena, by: index3d(pool, gear), ready: null };
    document.body.appendChild(host);
    host.style.cssText = 'position:fixed;left:-9999px;top:0;width:600px;height:400px';
    await arena.init();
    host.style.cssText = '';
    host.remove();
    return D3;
  }

  function nameOf(D) { return D.c.n; }
  function full(D) { return D.c.n + (D.c.s ? ' ' + D.c.s : ''); }

  function frameHtml(D, i) {
    const k = clsKey(D.c.c), cc = AR().H.CC[k] || '#f8d36b';
    return `<div class="du-uf ${i ? 'b' : 'a'}" style="--cc:${cc}">
      <div class="du-pt">${AR().H.icoR(AR().H.apRace(D.c.r), D.c.f, 52)}${D.media.avatar ? `<img class="du-av" src="${esc(D.media.avatar)}" alt="" onerror="this.remove()">` : ''}<i>${D.c.lv}</i></div>
      <div class="du-bars"><b class="du-nm" style="color:${cc}">${esc(nameOf(D))}</b>
        <div class="du-hp"><em></em><i></i><span></span></div>
        <div class="du-rs"><i></i></div>
        <div class="du-cb"><i></i><span></span></div>
      </div></div>`;
  }

  function figHtml(D, i) {
    const k = clsKey(D.c.c), cc = AR().H.CC[k] || '#f8d36b';
    return `<div class="du-fig ${i ? 'b' : 'a'}" style="--cc:${cc}"><div class="du-body"><div class="du-glow"></div>${D.media.main ? `<img class="du-ren" src="${esc(D.media.main)}" alt="" onerror="this.closest('.du-fig').classList.add('noimg')">` : ''}<div class="du-alt">${AR().H.icoR(AR().H.apRace(D.c.r), D.c.f, 110)}</div><div class="du-bubble"></div><div class="du-poly"><img src="${AR().RI('spell_nature_polymorph')}" alt=""></div></div><div class="du-st"></div><div class="du-fx"></div></div>`;
  }

  function stageHtml(A, B, arena, three) {
    const ka = clsKey(A.c.c), kb = clsKey(B.c.c), ca = AR().H.CC[ka] || '#f8d36b', cb = AR().H.CC[kb] || '#f8d36b';
    return `<section class="du${three ? ' three' : ''}" style="--ca:${ca};--cb:${cb}">
      <div class="du-stage" style="--bg:url('assets/game/${arena[0]}.jpg')">
        <div class="du-sky"></div><div class="du-floor"></div>
        <div class="du-top">${frameHtml(A, 0)}<div class="du-clock"><b>0.0</b><small>sec</small></div>${frameHtml(B, 1)}</div>
        ${three ? '<div class="du-3d"></div><div class="du-call a"></div><div class="du-call b"></div>' : figHtml(A, 0) + figHtml(B, 1)}
        <div class="du-flash"></div>
        <div class="du-intro"><div class="du-half a" style="--cc:${ca}">${A.media.main ? `<img src="${esc(A.media.main)}" alt="">` : ''}<div class="du-who"><b>${esc(full(A))}</b><small>Level ${A.c.lv} ${esc(A.c.r)} ${esc(A.c.c)}</small></div></div><div class="du-half b" style="--cc:${cb}">${B.media.main ? `<img src="${esc(B.media.main)}" alt="">` : ''}<div class="du-who"><b>${esc(full(B))}</b><small>Level ${B.c.lv} ${esc(B.c.r)} ${esc(B.c.c)}</small></div></div><div class="du-vs"><span>VS</span></div><div class="du-where">A duel in ${esc(arena[1])}</div></div>
        <div class="du-cd"></div>
        <div class="du-end"></div>
        <div class="du-ctl"><button data-sp="1" class="on">1×</button><button data-sp="2">2×</button><button data-sp="4">4×</button><button data-sp="skip">Skip</button></div>
      </div>
      <div class="du-log"><div class="du-lh">Combat log</div><div class="du-ll"></div></div>
    </section><div class="du-after"></div>`;
  }

  const fmt = (n) => Math.round(n).toLocaleString('en-US');

  function setBars(root, i, f) {
    const uf = root.querySelector(`.du-uf.${i ? 'b' : 'a'}`);
    const hp = Math.max(0, f.hp), pct = Math.max(0, Math.min(100, (100 * hp) / f.max));
    uf.querySelector('.du-hp i').style.width = pct + '%';
    uf.querySelector('.du-hp em').style.width = pct + '%';
    uf.querySelector('.du-hp span').textContent = `${fmt(hp)} / ${fmt(f.max)}`;
    uf.classList.toggle('low', pct < 25 && pct > 0);
    const rs = uf.querySelector('.du-rs');
    rs.dataset.k = f.resKind;
    rs.querySelector('i').style.width = Math.max(0, Math.min(100, (100 * f.res) / (f.resMax || 100))) + '%';
    const fig = root.querySelector(`.du-fig.${i ? 'b' : 'a'}`);
    if (!fig) return;
    fig.dataset.state = f.state || '';
    fig.classList.toggle('shield', !!(f.shield || f.absorb));
    fig.classList.toggle('casting', !!f.cast);
    fig.style.setProperty('--sc', SCHOOL[f.school] || '#ffe2b0');
    const st = fig.querySelector('.du-st');
    const want = f.state ? `<img src="${AR().RI(STATE_IC[f.state] || 'spell_frost_stun')}" alt="">${STATE[f.state] || f.state}` : '';
    if (st.dataset.v !== f.state) { st.dataset.v = f.state || ''; st.innerHTML = want; }
  }

  function castBar(root, i, e, D) {
    const cb = root.querySelector(`.du-uf.${i ? 'b' : 'a'} .du-cb`);
    cb.querySelector('span').innerHTML = `<img src="${spellIcon(e.name, D)}" alt="">${esc(e.name)}`;
    cb.classList.remove('go', 'cut');
    void cb.offsetWidth;
    cb.style.setProperty('--ct', `${Math.max(0.3, e.amount || 1.5) / run.speed}s`);
    cb.classList.add('go');
  }

  function fct(root, side, text, kind, color, icon) {
    const fig = root.querySelector(`.du-fig.${side ? 'b' : 'a'} .du-fx`);
    if (!fig || fig.childElementCount > 7) return;
    const el = document.createElement('div');
    el.className = `du-n ${kind}`;
    el.style.setProperty('--x', `${Math.round((Math.random() - 0.5) * 70)}px`);
    if (color) el.style.color = color;
    el.innerHTML = `${icon ? `<img src="${icon}" alt="">` : ''}${text}`;
    fig.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  function pulse(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    clearTimeout(el['_' + cls]);
    el['_' + cls] = setTimeout(() => el.classList.remove(cls), ms);
  }

  function logLine(root, e, names, Ds) {
    const who = names[e.side], other = names[1 - e.side], D = Ds[e.side];
    const ic = (n) => `<img src="${spellIcon(n, D)}" alt="">`;
    const sc = e.school ? ` style="color:${SCHOOL[e.school] || '#fff'}"` : '';
    const map = {
      hit: () => (e.amount ? `${ic(e.name)}<b>${esc(who)}</b>'s <span${sc}>${esc(e.name)}</span> hits ${esc(other)} for <em${e.crit ? ' class="cr"' : ''}>${fmt(e.amount)}${e.crit ? ' crit' : ''}</em>` : `${ic(e.name)}<b>${esc(who)}</b> uses <span${sc}>${esc(e.name)}</span>`),
      heal: () => `${ic(e.name)}<b>${esc(who)}</b> heals for <em class="hl">${fmt(e.amount)}</em> with ${esc(e.name)}`,
      cc: () => `<img src="${AR().RI(STATE_IC[e.name] || 'spell_frost_stun')}" alt=""><b>${esc(who)}</b> is ${(STATE[e.name] || e.name).toLowerCase()} for ${(+e.amount).toFixed(1)}s`,
      buff: () => `${ic(e.name)}<b>${esc(who)}</b> uses ${esc(e.name)}`,
      move: () => `${ic(e.name)}<b>${esc(who)}</b> uses ${esc(e.name)}`,
      trinket: () => `${ic('PvP Trinket')}<b>${esc(who)}</b> breaks free!`,
      interrupt: () => `${ic(e.name)}<b>${esc(who)}</b>'s ${esc(e.name)} is interrupted`,
      miss: () => `${ic(e.name)}<b>${esc(who)}</b>'s ${esc(e.name)} misses`,
      dodge: () => `${ic(e.name)}${esc(other)} dodges ${esc(who)}'s ${esc(e.name)}`,
      parry: () => `${ic(e.name)}${esc(other)} parries ${esc(who)}'s ${esc(e.name)}`,
      resist: () => `${ic(e.name)}${esc(other)} resists ${esc(who)}'s ${esc(e.name)}`,
      ground: () => `${ic('Grounding Totem')}${esc(e.name)} hits a Grounding Totem`,
    }[e.type];
    if (!map) return;
    const box = root.querySelector('.du-ll');
    box.insertAdjacentHTML('beforeend', `<div class="du-l ${e.side ? 'b' : 'a'}"><time>${e.t.toFixed(1)}</time><span>${map()}</span></div>`);
    while (box.childElementCount > 120) box.firstElementChild.remove();
    box.scrollTop = box.scrollHeight;
  }

  function onEvent(root, e, names, Ds, x) {
    const atk = root.querySelector(`.du-fig.${e.side ? 'b' : 'a'}`), tgt = root.querySelector(`.du-fig.${e.side ? 'a' : 'b'}`);
    const stage = root.querySelector('.du-stage');
    if (e.type === 'hit') {
      if (e.amount) {
        const big = e.crit || e.amount > 600;
        fct(root, 1 - e.side, `${fmt(e.amount)}${e.crit ? '!' : ''}`, e.crit ? 'crit' : 'dmg', e.school && e.school !== 'phys' ? SCHOOL[e.school] : null, e.crit ? spellIcon(e.name, Ds[e.side]) : null);
        pulse(atk, 'lunge', 260);
        tgt.style.setProperty('--hc', SCHOOL[e.school] || '#ff4a3a');
        pulse(tgt, 'hurt', 380);
        if (big && !CALM) pulse(stage, 'shake', 420);
        if (e.crit) { stage.querySelector('.du-flash').style.setProperty('--fc', SCHOOL[e.school] || '#fff'); pulse(stage, 'flashing', 260); }
      } else fct(root, 1 - e.side, esc(e.name), 'tag', SCHOOL[e.school] || '#ffd36b');
    } else if (e.type === 'heal') {
      fct(root, e.side, `+${fmt(e.amount)}`, 'heal');
      pulse(atk, 'healed', 700);
    } else if (e.type === 'miss' || e.type === 'dodge' || e.type === 'parry' || e.type === 'resist') {
      fct(root, 1 - e.side, { miss: 'Miss', dodge: 'Dodge', parry: 'Parry', resist: 'Resist' }[e.type], 'tag');
      pulse(atk, 'lunge', 260);
      pulse(tgt, e.type === 'dodge' ? 'evade' : 'block', 380);
    } else if (e.type === 'cast') castBar(root, e.side, e, Ds[e.side]);
    else if (e.type === 'interrupt') {
      const cb = root.querySelector(`.du-uf.${e.side ? 'b' : 'a'} .du-cb`);
      cb.classList.remove('go');
      cb.classList.add('cut');
      fct(root, e.side, 'Interrupted', 'tag', '#ff6a5a');
    } else if (e.type === 'cc') {
      fct(root, e.side, STATE[e.name] || e.name, 'cc', '#ffd36b');
    } else if (e.type === 'move') {
      pulse(atk, 'dash', 500);
      fct(root, e.side, esc(e.name), 'tag', '#ffe9b0', spellIcon(e.name, Ds[e.side]));
    } else if (e.type === 'buff' || e.type === 'trinket') {
      fct(root, e.side, esc(e.name), 'buff', '#9fe0ff', spellIcon(e.type === 'trinket' ? 'PvP Trinket' : e.name, Ds[e.side]));
      pulse(atk, 'buffed', 700);
    }
    if (e.type !== 'cast') logLine(root, e, names, Ds);
  }

  function place(root, d) {
    const w = root.querySelector('.du-stage').clientWidth, narrow = w < 560;
    const gap = narrow ? Math.max(36, Math.min(66, 34 + (d / 45) * 40)) : Math.max(16, Math.min(56, 14 + (d / 45) * 46));
    root.querySelector('.du-fig.a').style.left = `${50 - gap / 2}%`;
    root.querySelector('.du-fig.b').style.left = `${50 + gap / 2}%`;
  }

  function stats(rec, x, Ds) {
    const s = [0, 1].map(() => ({ big: 0, bigName: '', crits: 0, hits: 0, cc: 0, heals: 0 }));
    for (const e of rec.events) {
      if (e.type === 'hit' && e.amount) { const o = s[e.side]; o.hits++; if (e.crit) o.crits++; if (e.amount > o.big) { o.big = e.amount; o.bigName = e.name; } }
      if (e.type === 'cc') s[1 - e.side].cc += +e.amount || 0;
      if (e.type === 'heal') s[e.side].heals += e.amount || 0;
    }
    return s;
  }

  function verdict(x, names) {
    const W = x.winner, w = names[W], l = names[1 - W], F = W ? x.b : x.a, hp = Math.max(1, Math.round((100 * F.hp) / F.max));
    const pool = x.timedOut ? LINES.time : hp < 15 ? LINES.close : hp > 75 ? LINES.stomp : LINES.win;
    return pool[Math.floor(Math.random() * pool.length)].replace('{w}', w).replace('{l}', l).replace('{hp}', hp);
  }

  function after(host, rec, x, Ds, names, again) {
    const s = stats(rec, x, Ds), W = x.winner, wD = Ds[W], H2 = AR().H;
    const rows = [
      ['Damage done', Math.round(x.a.dealt), Math.round(x.b.dealt), fmt],
      ['Healing', Math.round(x.a.healed), Math.round(x.b.healed), fmt],
      ['Biggest hit', s[0].big, s[1].big, fmt],
      ['Critical hits', s[0].crits, s[1].crits, fmt],
      ['Kept the foe locked down', s[0].cc, s[1].cc, (v) => `${v.toFixed(1)}s`],
    ];
    const bar = ([lb, a, b, f]) => { const m = Math.max(a, b) || 1; return `<div class="du-cr"><span class="v a">${f(a)}</span><div class="t a"><i style="width:${(100 * a) / m}%"></i></div><span class="lb">${lb}</span><div class="t b"><i style="width:${(100 * b) / m}%"></i></div><span class="v b">${f(b)}</span></div>`; };
    const big = s[W].bigName ? `<div class="du-mvp"><img src="${spellIcon(s[W].bigName, wD)}" alt=""><span>${esc(names[W])}'s hardest hit: <b>${esc(s[W].bigName)}</b> for ${fmt(s[W].big)}</span></div>` : '';
    host.innerHTML = `<section class="frame panel s12 du-res" style="--ca:${H2.CC[clsKey(Ds[0].c.c)] || '#f8d36b'};--cb:${H2.CC[clsKey(Ds[1].c.c)] || '#f8d36b'}"><div class="in slab">
      <div class="du-rhead" style="--cc:${H2.CC[clsKey(wD.c.c)] || '#f8d36b'}"><span class="du-crown"></span>${wD.media.avatar ? `<img class="du-rav" src="${esc(wD.media.avatar)}" alt="">` : H2.icoR(H2.apRace(wD.c.r), wD.c.f, 80)}<div><small>Winner after ${x.time.toFixed(1)} seconds</small><h2>${esc(full(wD))}</h2><p>${esc(verdict(x, names))}</p></div></div>
      <div class="du-cmp"><div class="du-ch"><b style="color:${H2.CC[clsKey(Ds[0].c.c)]}">${esc(names[0])}</b><b style="color:${H2.CC[clsKey(Ds[1].c.c)]}">${esc(names[1])}</b></div>${rows.map(bar).join('')}</div>${big}
      <div class="du-btns"><button class="main" data-act="again"><img src="${H2.UI('ability_parry')}" alt="">Rematch</button><button data-act="swap"><img src="${H2.UI('inv_misc_note_01')}" alt="">New opponent</button><button data-act="share"><img src="${H2.UI('inv_misc_book_09')}" alt="">Share this duel</button></div>
      <div class="du-links"><a href="${AR().link(Ds[0].c.rg, Ds[0].c.slug)}">${esc(full(Ds[0]))}'s armory</a><a href="${AR().link(Ds[1].c.rg, Ds[1].c.slug)}">${esc(full(Ds[1]))}'s armory</a></div>
      <p class="du-fine">Just for fun: a simulation using their real gear and stats from the armory, run through the Gear Draft duel engine. Every rematch plays out differently.</p>
    </div></section>`;
    host.querySelector('[data-act="again"]').onclick = again;
    host.querySelector('[data-act="swap"]').onclick = () => challenge(Ds[0]);
    host.querySelector('[data-act="share"]').onclick = async (ev) => {
      const url = location.href, b = ev.currentTarget;
      try {
        if (navigator.share && matchMedia('(hover: none)').matches) await navigator.share({ title: `${names[0]} vs ${names[1]}`, url });
        else { await navigator.clipboard.writeText(url); b.lastChild.textContent = 'Link copied'; }
      } catch (e) {}
    };
  }

  let run0 = 0;
  async function page(el, a, b, seed) {
    if (run) run.dead = true;
    const R0 = ++run0;
    el.innerHTML = `<section class="frame ar-wait s12"><div class="in"><span class="ar-spin"></span><b>The duelists approach…</b><small>Reading both characters live from the armory</small></div></section>`;
    const [E, , A, B] = await Promise.all([engine(), spells().then((m) => { SPELLS_MAP = m || {}; }), AR().load(a[0], a[1]), AR().load(b[0], b[1])]);
    if (!document.body.contains(el)) return null;
    const bad = [A, B].find((D) => !D || D.missing || D.error);
    if (bad) {
      el.innerHTML = `<section class="frame ar-land s12"><div class="in"><img class="ar-lic" src="${AR().H.UI('ability_parry')}" alt=""><h2>The duel is off</h2><p>One of the duelists could not be found in the armory right now.</p></div></section>`;
      return null;
    }
    seed = seed || Math.floor(Math.random() * 1e9);
    const r = rng(seed), [ea, eb] = edges(A.c.lv, B.c.lv);
    const arena = ARENAS[seed % ARENAS.length];
    const rec = { events: [], frames: [] };
    const x = E.fight(sideOf(A, E, r, ea), sideOf(B, E, r, eb), seed, rec);
    const names = A.c.n === B.c.n ? [full(A), full(B)] : [A.c.n, B.c.n];
    let G3 = null;
    try { G3 = await arena3d(); } catch (e) { G3 = null; }
    if (R0 !== run0) return null;
    if (G3) return page3d(el, A, B, x, rec, names, seed, G3);
    el.innerHTML = stageHtml(A, B, arena);
    const root = el.querySelector('.du');
    const R = { dead: false, speed: 1, t: 0, at: 0, last: 0, phase: 'intro', seed };
    run = R;
    setBars(root, 0, rec.frames[0].a);
    setBars(root, 1, rec.frames[0].b);
    place(root, rec.frames[0].d);
    const stageEl = root.querySelector('.du-stage');
    const again = () => { const h = location.hash.split('/'); h[5] = String(Math.floor(Math.random() * 1e9)); location.hash = h.slice(0, 6).join('/'); };
    root.querySelectorAll('[data-sp]').forEach((bt) => {
      bt.onclick = () => {
        if (bt.dataset.sp === 'skip') { R.skip = true; return; }
        R.speed = +bt.dataset.sp;
        root.querySelectorAll('[data-sp]').forEach((y) => y.classList.toggle('on', y === bt));
      };
    });
    const intro = root.querySelector('.du-intro'), cd = root.querySelector('.du-cd');
    const wait = (ms) => new Promise((done) => { const s = performance.now(); const tick = () => { if (R.dead || R.skipIntro || performance.now() - s >= ms) done(); else setTimeout(tick, 50); }; tick(); });
    stageEl.onclick = (e) => { if (R.phase === 'intro' && !e.target.closest('.du-ctl')) R.skipIntro = true; };
    stageEl.classList.add('intro');
    await wait(CALM ? 600 : 2600);
    intro.classList.add('out');
    stageEl.classList.remove('intro');
    if (!R.skipIntro && !CALM) {
      for (const n of ['3', '2', '1']) {
        if (R.dead || R.skipIntro) break;
        cd.innerHTML = `<span>${n}</span>`;
        pulse(cd, 'show', 650);
        await wait(720);
      }
    }
    if (R.dead) return x;
    cd.innerHTML = '<span class="go">Duel!</span>';
    pulse(cd, 'show', 900);
    R.phase = 'fight';
    const endT = rec.frames[rec.frames.length - 1].t;
    let shown = -1;
    R.last = performance.now();
    await new Promise((done) => {
      const next = () => (document.hidden ? setTimeout(step, 50) : requestAnimationFrame(step));
      const step = () => {
        if (R.dead) { done(); return; }
        const now = performance.now(), dt = Math.min(0.1, (now - R.last) / 1000);
        R.last = now;
        const near = endT - R.t < 1.3;
        stageEl.classList.toggle('slowmo', near && !R.skip && !CALM);
        R.t = R.skip ? endT : Math.min(endT, R.t + dt * R.speed * (near && !CALM ? 0.35 : 1));
        const i = Math.min(rec.frames.length - 1, Math.floor(R.t / 0.2) + 1);
        if (i !== shown) {
          const f = rec.frames[i];
          shown = i;
          setBars(root, 0, f.a);
          setBars(root, 1, f.b);
          place(root, f.d);
          root.querySelector('.du-clock b').textContent = f.t.toFixed(1);
        }
        while (R.at < rec.events.length && rec.events[R.at].t <= R.t) {
          const e = rec.events[R.at++];
          if (R.skip) { if (e.type !== 'cast') logLine(root, e, names, [A, B]); } else onEvent(root, e, names, [A, B], x);
        }
        if (R.t >= endT) { done(); return; }
        next();
      };
      next();
    });
    if (R.dead) return x;
    R.phase = 'end';
    stageEl.classList.remove('slowmo');
    const W = x.winner;
    root.querySelector(`.du-fig.${W ? 'a' : 'b'}`).classList.add('fallen');
    root.querySelector(`.du-fig.${W ? 'b' : 'a'}`).classList.add('victor');
    root.querySelectorAll('.du-cb').forEach((c) => c.classList.remove('go'));
    await wait(R.skip ? 200 : 1100);
    const wD = W ? B : A;
    const endEl = root.querySelector('.du-end');
    endEl.style.setProperty('--cc', AR().H.CC[clsKey(wD.c.c)] || '#f8d36b');
    endEl.innerHTML = `<i class="du-rays"></i><small>${x.timedOut ? 'Time!' : 'Victory'}</small><b>${esc(full(wD))}</b><span>${esc(names[1 - W])} has been defeated${x.timedOut ? ' on points' : ''}</span><button class="du-see">See the breakdown</button>`;
    endEl.classList.add('on');
    stageEl.classList.add('done');
    const aft = el.querySelector('.du-after');
    after(aft, rec, x, [A, B], names, again);
    endEl.querySelector('.du-see').onclick = () => aft.scrollIntoView({ behavior: CALM ? 'auto' : 'smooth', block: 'start' });
    root.querySelector('.du-log').classList.add('done');
    return { A, B, x };
  }

  function call(root, side, html, color) {
    const box = root.querySelector(`.du-call.${side ? 'b' : 'a'}`);
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'du-c';
    if (color) el.style.setProperty('--tc', color);
    el.innerHTML = html;
    box.appendChild(el);
    while (box.childElementCount > 3) box.firstElementChild.remove();
    setTimeout(() => el.remove(), 2200);
  }

  async function page3d(el, A, B, x, rec, names, seed, G3) {
    const { arena, host, P, mod } = G3;
    const theme = mod.THEMES[seed % mod.THEMES.length];
    el.innerHTML = stageHtml(A, B, [ARENAS[0][0], theme.name], true);
    const root = el.querySelector('.du');
    const R = { dead: false, speed: 1, phase: 'intro', seed, three: true };
    run = R;
    const stageEl = root.querySelector('.du-stage');
    root.querySelector('.du-3d').appendChild(host);
    arena.stageA.resume();
    arena.stageA.resize();
    arena.speed = 1;
    const sa = side3d(A), sb = side3d(B);
    P.items = Object.assign({}, sa.rows, sb.rows);
    setBars(root, 0, rec.frames[0].a);
    setBars(root, 1, rec.frames[0].b);
    const again = () => { const h = location.hash.split('/'); h[5] = String(Math.floor(Math.random() * 1e9)); location.hash = h.slice(0, 6).join('/'); };
    root.querySelectorAll('[data-sp]').forEach((bt) => {
      bt.onclick = () => {
        if (bt.dataset.sp === 'skip') { R.skip = true; arena.skip(); return; }
        R.speed = arena.speed = +bt.dataset.sp;
        root.querySelectorAll('[data-sp]').forEach((y) => y.classList.toggle('on', y === bt));
      };
    });
    const wait = (ms) => new Promise((done) => { const s = performance.now(); const tick = () => { if (R.dead || R.skipIntro || performance.now() - s >= ms) done(); else setTimeout(tick, 50); }; tick(); });
    stageEl.onclick = (e) => { if (R.phase === 'intro' && !e.target.closest('.du-ctl')) R.skipIntro = true; };
    stageEl.classList.add('intro', 'loading');
    arena.theme(theme);
    const dressed = arena.stageFight([sa, sb], names).catch(() => null);
    await Promise.all([Promise.race([dressed, new Promise((d) => { setTimeout(d, 20000); })]), wait(CALM ? 600 : 2800)]);
    if (R.dead) return null;
    stageEl.classList.remove('loading');
    R.skipIntro = false;
    await wait(CALM ? 0 : 500);
    root.querySelector('.du-intro').classList.add('out');
    stageEl.classList.remove('intro');
    const cd = root.querySelector('.du-cd');
    if (!CALM) {
      await wait(500);
      for (const n of ['3', '2', '1']) {
        if (R.dead || R.skipIntro) break;
        cd.innerHTML = `<span>${n}</span>`;
        pulse(cd, 'show', 650);
        await wait(720);
      }
    }
    if (R.dead) return null;
    cd.innerHTML = '<span class="go">Duel!</span>';
    pulse(cd, 'show', 900);
    R.phase = 'fight';
    const Ds = [A, B];
    let shown = -1;
    const ended = new Promise((done) => {
      arena.play(rec, x, {
        onLine: (e) => {
          if (R.dead) return;
          if (e.type === 'cast') castBar(root, e.side, e, Ds[e.side]);
          else logLine(root, e, names, Ds);
          if (R.skip) return;
          if (e.type === 'interrupt') { const cb = root.querySelector(`.du-uf.${e.side ? 'b' : 'a'} .du-cb`); cb.classList.remove('go'); cb.classList.add('cut'); call(root, e.side, 'Interrupted!', '#ff6a5a'); }
          else if (e.type === 'cc') call(root, e.side, `<img src="${AR().RI(STATE_IC[e.name] || 'spell_frost_stun')}" alt="">${STATE[e.name] || e.name}`, '#ffd36b');
          else if (e.type === 'buff' || e.type === 'move' || e.type === 'trinket') call(root, e.side, `<img src="${spellIcon(e.type === 'trinket' ? 'PvP Trinket' : e.name, Ds[e.side])}" alt="">${esc(e.type === 'trinket' ? 'Breaks free!' : e.name)}`, '#9fe0ff');
          else if (e.type === 'hit' && e.crit && e.amount) { call(1 - e.side === 0 ? root : root, e.side, `<img src="${spellIcon(e.name, Ds[e.side])}" alt="">${esc(e.name)} crit!`, '#ffe14d'); if (!CALM) pulse(stageEl, 'flashing', 260); }
        },
        onEnd: (r) => done(r),
      });
      const tick = () => {
        if (R.dead) { done(null); return; }
        const p = arena.playing;
        if (p) {
          const endT = rec.frames[rec.frames.length - 1].t, t = Math.min(endT, p.t);
          const i = Math.min(rec.frames.length - 1, Math.floor(t / 0.2) + 1);
          if (i !== shown) { shown = i; const f = rec.frames[i]; setBars(root, 0, f.a); setBars(root, 1, f.b); root.querySelector('.du-clock b').textContent = f.t.toFixed(1); }
          stageEl.classList.toggle('slowmo', endT - t < 1 && !CALM);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const res = await ended;
    if (R.dead || !res) return null;
    const last = rec.frames[rec.frames.length - 1];
    setBars(root, 0, last.a);
    setBars(root, 1, last.b);
    root.querySelector('.du-clock b').textContent = last.t.toFixed(1);
    R.phase = 'end';
    stageEl.classList.remove('slowmo');
    root.querySelectorAll('.du-cb').forEach((c) => c.classList.remove('go'));
    await wait(R.skip ? 200 : 900);
    const W = x.winner, wD = W ? B : A;
    const endEl = root.querySelector('.du-end');
    endEl.style.setProperty('--cc', AR().H.CC[clsKey(wD.c.c)] || '#f8d36b');
    endEl.innerHTML = `<i class="du-rays"></i><small>${x.timedOut ? 'Time!' : 'Victory'}</small><b>${esc(full(wD))}</b><span>${esc(names[1 - W])} has been defeated${x.timedOut ? ' on points' : ''}</span><button class="du-see">See the breakdown</button>`;
    endEl.classList.add('on');
    stageEl.classList.add('done');
    const aft = el.querySelector('.du-after');
    after(aft, rec, x, Ds, names, again);
    endEl.querySelector('.du-see').onclick = () => aft.scrollIntoView({ behavior: CALM ? 'auto' : 'smooth', block: 'start' });
    root.querySelector('.du-log').classList.add('done');
    return { A, B, x };
  }

  function challenge(D) {
    const H2 = AR().H, C = window.API_DATA && API_DATA.census;
    const pool = ((C && C.leaders && C.leaders.all) || []).filter((p) => !(p.rg === D.c.rg && p.slug === D.c.slug));
    const near = pool.slice().sort((p, q) => Math.abs(p.lv - D.c.lv) - Math.abs(q.lv - D.c.lv)).slice(0, 8);
    const old = document.querySelector('.du-pick');
    if (old) old.remove();
    const m = document.createElement('div');
    m.className = 'du-pick';
    m.innerHTML = `<div class="du-pbox"><button class="du-px" aria-label="Close">×</button><img class="du-pic" src="${H2.UI('ability_parry')}" alt=""><h3>Who will ${esc(D.c.n)} duel?</h3><p>Search for anyone on Forever, or pick a rival below.</p>${AR().searchHtml('dupq', true)}
      ${near.length ? `<div class="du-riv">${near.map((p) => `<button data-rg="${p.rg}" data-slug="${esc(p.slug)}" style="--cc:${H2.CC[clsKey(p.c)] || '#fff'}">${H2.icoR(H2.apRace(p.r), p.f, 34)}<span><b>${esc(p.n)}</b><small>${p.lv} ${esc(p.c)}</small></span></button>`).join('')}</div><button class="du-rand">Surprise me</button>` : ''}</div>`;
    document.body.appendChild(m);
    const go = (rg, slug) => { m.remove(); location.hash = `duel/${D.c.rg}/${encodeURIComponent(D.c.slug)}/${rg}/${encodeURIComponent(slug)}/${Math.floor(Math.random() * 1e9)}`; };
    AR().bind('dupq', go);
    m.querySelectorAll('.du-riv button').forEach((b) => { b.onclick = () => go(b.dataset.rg, b.dataset.slug); });
    const rb = m.querySelector('.du-rand');
    if (rb) rb.onclick = () => { const p = pool[Math.floor(Math.random() * pool.length)]; if (p) go(p.rg, p.slug); };
    m.onclick = (e) => { if (e.target === m || e.target.closest('.du-px')) m.remove(); };
    setTimeout(() => { if (matchMedia('(hover: hover)').matches) document.getElementById('dupq').focus(); }, 30);
  }

  function stop() {
    if (run) run.dead = true;
    const m = document.querySelector('.du-pick');
    if (m) m.remove();
    if (D3) { D3.arena.playing = null; D3.arena.reset(); D3.arena.stageA.pause(); D3.host.remove(); }
  }

  window.LI_DUEL = { page, challenge, stop };
})();
