(() => {
  const QS = new URLSearchParams(location.search);
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API = (LOCAL && QS.get('api')) || 'https://forever-live.sanredz.workers.dev/v1';
  const CHAR = (LOCAL && QS.get('charapi')) || API;
  const CLASS = { 1: 'Warrior', 2: 'Paladin', 3: 'Hunter', 4: 'Rogue', 5: 'Priest', 7: 'Shaman', 8: 'Mage', 9: 'Warlock', 11: 'Druid' };
  const RACE = { 1: 'Human', 2: 'Orc', 3: 'Dwarf', 4: 'Night Elf', 5: 'Undead', 6: 'Tauren', 7: 'Gnome', 8: 'Troll', 95: 'High Order Skyborne', 96: 'Windshaper Skyborne' };
  const QC = ['#9d9d9d', '#ffffff', '#1eff00', '#3a95f5', '#b94cf7', '#ff8000', '#e6cc80', '#00ccff'];
  const LEFT = ['HEAD', 'NECK', 'SHOULDER', 'BACK', 'CHEST', 'SHIRT', 'TABARD', 'WRIST'];
  const RIGHT = ['HANDS', 'WAIST', 'LEGS', 'FEET', 'FINGER_1', 'FINGER_2', 'TRINKET_1', 'TRINKET_2'];
  const BOTTOM = ['MAIN_HAND', 'OFF_HAND', 'RANGED'];
  const SLOTN = { HEAD: 'Head', NECK: 'Neck', SHOULDER: 'Shoulders', BACK: 'Back', CHEST: 'Chest', SHIRT: 'Shirt', TABARD: 'Tabard', WRIST: 'Wrists', HANDS: 'Hands', WAIST: 'Waist', LEGS: 'Legs', FEET: 'Feet', FINGER_1: 'Ring', FINGER_2: 'Ring', TRINKET_1: 'Trinket', TRINKET_2: 'Trinket', MAIN_HAND: 'Main hand', OFF_HAND: 'Off hand', RANGED: 'Ranged' };
  const SCENE = { Human: 'scenes/easternkingdom', Dwarf: 'scenes/oldironforge', Gnome: 'scenes/gnomeregan', 'Night Elf': 'art/land-darnassus', Orc: 'art/land-orccamp', Undead: 'art/land-tirisfall', Tauren: 'art/land-thunderbluff', Troll: 'scenes/darkspearislands', 'High Order Skyborne': 'scenes/zephrasisle', 'Windshaper Skyborne': 'scenes/zephrasisle' };
  const RES = [['fire', 'Fire', '#ff7a3c', 'spell_fire_firearmor'], ['frost', 'Frost', '#7cc8ff', 'spell_frost_frostarmor02'], ['nature', 'Nature', '#7fe05a', 'spell_nature_resistnature'], ['shadow', 'Shadow', '#b07cff', 'spell_shadow_antishadow'], ['arcane', 'Arcane', '#f2a0ff', 'spell_nature_starfall']];
  const RI = (n) => `https://render.worldofwarcraft.com/us/icons/56/${n}.jpg`;
  const memo = {};
  let H = null, tipEl = null, lastTouch = 0;

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const title = (s) => (s ? s[0] + s.slice(1).toLowerCase() : '');
  const ago = (t) => {
    const s = Date.now() / 1000 - t;
    if (!t || s < 0) return '';
    if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return `${Math.round(s / 86400)} days ago`;
  };
  const link = (rg, slug) => `#armory/${rg}/${encodeURIComponent(slug)}`;

  function hitRow(x, i) {
    const c = CLASS[x.c] || '?', r = RACE[x.r] || '?', k = H.apCls(c), fac = title(x.f);
    return `<a class="ar-hit${i === 0 ? ' sel' : ''}" href="${link(x.rg, x.slug)}" data-rg="${x.rg}" data-slug="${esc(x.slug)}">${H.icoR(H.apRace(r), fac, 34)}<span class="ar-hn"><b style="color:${H.CC[k] || '#fff'}">${esc(x.n)}${x.s ? ' ' + esc(x.s) : ''}</b><small>Level ${x.lv || '?'} ${esc(r)} ${esc(c)}${x.g ? ` · &lt;${esc(x.g)}&gt;` : ''}</small></span><span class="ar-rg">${x.rg.toUpperCase()}</span></a>`;
  }

  function searchHtml(id, big) {
    return `<div class="ar-sbox${big ? ' big' : ''}"><svg class="ar-sic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg><input id="${id}" type="search" placeholder="Search any character, e.g. Vitochie" autocomplete="off" spellcheck="false" aria-label="Search characters"><div class="ar-drop" id="${id}-d"></div></div>`;
  }

  function bind(id, pick) {
    const box = document.getElementById(id), drop = document.getElementById(id + '-d');
    if (!box) return;
    let tok = 0, timer = 0;
    const show = (h) => { drop.innerHTML = h; drop.classList.toggle('on', !!h); };
    box.addEventListener('input', () => {
      clearTimeout(timer);
      const q = box.value.trim(), t = ++tok;
      if (!q) { show(''); return; }
      if (q.length < 2) { show('<div class="ar-hint">Keep typing…</div>'); return; }
      show('<div class="ar-hint">Searching…</div>');
      timer = setTimeout(async () => {
        try {
          const r = await fetch(`${API}/find/${encodeURIComponent(q.toLowerCase())}`);
          const d = await r.json();
          if (t !== tok) return;
          show(d.hits && d.hits.length ? d.hits.map(hitRow).join('') : `<div class="ar-hint">Nobody called “${esc(q)}” yet. Use their first name, then their surname.</div>`);
        } catch (e) { if (t === tok) show('<div class="ar-hint">Search is not reachable right now.</div>'); }
      }, 200);
    });
    box.addEventListener('keydown', (e) => {
      const L = [...drop.querySelectorAll('.ar-hit')];
      const i = L.findIndex((x) => x.classList.contains('sel'));
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!L.length) return;
        const j = (i + (e.key === 'ArrowDown' ? 1 : L.length - 1)) % L.length;
        L.forEach((x, k) => x.classList.toggle('sel', k === j));
      } else if (e.key === 'Enter') { const s = L[Math.max(0, i)]; if (s) { if (pick) { show(''); pick(s.dataset.rg, s.dataset.slug); } else location.hash = s.getAttribute('href'); } } else if (e.key === 'Escape') show('');
    });
    if (pick) drop.addEventListener('click', (e) => { const a = e.target.closest('.ar-hit'); if (!a) return; e.preventDefault(); show(''); box.value = ''; pick(a.dataset.rg, a.dataset.slug); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.ar-sbox')) show(''); });
  }

  function tip(g) {
    const L = [`<div class="ar-tn" style="color:${QC[g.q] || '#fff'}">${esc(g.n)}</div>`];
    if (g.il) L.push(`<div class="ar-tg">Item Level ${g.il}</div>`);
    if (g.bind) L.push(`<div>${esc(g.bind)}</div>`);
    if (g.inv || g.sub) L.push(`<div class="ar-t2"><span>${esc(g.inv || '')}</span><span>${esc(g.sub && g.sub !== 'Miscellaneous' ? g.sub : '')}</span></div>`);
    if (g.wpn) L.push(`<div class="ar-t2"><span>${esc(g.wpn[0])}</span><span>${esc(g.wpn[1])}</span></div><div>${esc(g.wpn[2])}</div>`);
    if (g.armor) L.push(`<div>${esc(g.armor)}</div>`);
    g.st.filter((s) => !s[1]).forEach((s) => L.push(`<div>${esc(s[0])}</div>`));
    g.en.forEach((s) => L.push(`<div class="ar-tgr">${esc(s)}</div>`));
    if (g.dur) L.push(`<div>${esc(g.dur)}</div>`);
    if (g.req) L.push(`<div>${esc(g.req)}</div>`);
    g.st.filter((s) => s[1]).forEach((s) => L.push(`<div class="ar-tgr">Equip: ${esc(String(s[0]).replace(/^\+/, 'Increases ').replace(/^Increases (\d+) (.+)$/, 'Increases $2 by $1.'))}</div>`));
    g.sp.forEach((s) => L.push(`<div class="ar-tgr">${esc(s)}</div>`));
    if (g.set) {
      L.push(`<div class="ar-tset">${esc(g.set.n)}</div>`);
      g.set.items.forEach(([n, on]) => L.push(`<div class="ar-tsi${on ? ' on' : ''}">${esc(n)}</div>`));
      g.set.fx.forEach(([n, on]) => L.push(`<div class="${on ? 'ar-tgr' : 'ar-tdim'}">${esc(n)}</div>`));
    }
    if (g.desc) L.push(`<div class="ar-tdesc">“${esc(g.desc)}”</div>`);
    return `<div class="ar-tip-in" style="--qc:${QC[g.q] || '#fff'}">${L.join('')}</div>`;
  }

  function icon(g) {
    const id = g.ic && (g.ic.match(/\/(\d+)\.jpg$/) || [])[1];
    return id ? `assets/icons/${id}.png` : g.ic || H.UI('inv_misc_questionmark');
  }

  function slot(s, G, side) {
    const g = G[s];
    if (!g) return `<div class="ar-slot empty ${side}"><span class="ar-ic"></span><span class="ar-sl"><small>${SLOTN[s]}</small><em>Empty</em></span></div>`;
    return `<button class="ar-slot ${side}" data-slot="${s}" style="--qc:${QC[g.q] || '#fff'}"><span class="ar-ic"><img src="${icon(g)}" alt="" onerror="if(!this.dataset.f){this.dataset.f=1;this.src='${esc(g.ic || '')}'}"><i>${g.il || ''}</i></span><span class="ar-sl"><small>${SLOTN[s]}</small><b>${esc(g.n)}</b>${g.en.length ? `<em>${esc(g.en[0].replace(/^Enchanted: /, ''))}</em>` : ''}</span></button>`;
  }

  function statRows(S, c) {
    if (!S) return '';
    const p = (v) => (v == null ? null : `${(+v).toFixed(2).replace(/\.?0+$/, '')}%`);
    const row = (k, v, cl) => (v == null || v === '' ? '' : `<div class="ar-sr"><span>${k}</span><b${cl ? ` style="color:${cl}"` : ''}>${typeof v === 'number' ? v.toLocaleString('en-US') : v}</b></div>`);
    const caster = ['Mage', 'Warlock', 'Priest'].includes(c);
    const grp = (t, ic, rows) => (rows.join('') ? `<div class="ar-sg"><h4><img src="${RI(ic)}" alt="">${t}</h4>${rows.join('')}</div>` : '');
    const power = { Mana: '#4f8cff', Rage: '#ff4d4d', Energy: '#ffe14d', Focus: '#ff9b4d' }[S.pt] || '#4f8cff';
    return [
      grp('Attributes', 'spell_holy_wordfortitude', [row('Health', S.hp, '#5fd35f'), row(S.pt || 'Power', S.pw, power), row('Strength', S.str), row('Agility', S.agi), row('Stamina', S.sta), row('Intellect', S.int), row('Spirit', S.spi), row('Armor', S.arm)]),
      caster ? '' : grp('Melee', 'ability_meleedamage', [row('Attack power', S.ap), row('Damage', S.mh ? `${S.mh[0]}–${S.mh[1]}` : null), row('Speed', S.mh && S.mh[2] ? (+S.mh[2]).toFixed(2) : null), row('Crit chance', p(S.crit)), row('Hit', S.hit ? p(S.hit) : null)]),
      ['Hunter', 'Warrior', 'Rogue'].includes(c) ? grp('Ranged', 'inv_weapon_bow_02', [row('Attack power', S.rap), row('Crit chance', p(S.rcrit))]) : '',
      ['Warrior', 'Rogue'].includes(c) ? '' : grp('Spell', 'spell_holy_magicalsentry', [row('Spell power', S.sp), row('Healing', S.heal), row('Crit chance', p(S.scrit)), row('Hit', S.shit ? p(S.shit) : null)]),
      grp('Defense', 'inv_shield_06', [row('Defense', S.def), row('Dodge', p(S.dodge)), row('Parry', S.parry ? p(S.parry) : null), row('Block', S.block ? p(S.block) : null)]),
    ].join('');
  }

  function sheet(D) {
    const c = D.c, k = H.apCls(c.c), cc = H.CC[k] || '#f8d36b';
    const G = {};
    D.gear.forEach((g) => { G[g.slot] = g; });
    const sc = SCENE[c.r] || 'scenes/dalaran';
    const fcrest = c.f === 'Alliance' || c.f === 'Horde' ? `<img class="ar-crest" src="assets/game/${c.f.toLowerCase()}-crest.png" alt="">` : '';
    const res = D.stats ? RES.map(([key, n, col, ic]) => `<span class="ar-res" style="--rc:${col}" title="${n} resistance"><img src="${RI(ic)}" alt="" onerror="this.style.visibility='hidden'"><b>${D.stats.res[key] ?? 0}</b><small>${n}</small></span>`).join('') : '';
    const chips = [
      [`${c.il}`, 'Item level', 'inv_helmet_25'],
      c.ach ? [c.ach.toLocaleString('en-US'), 'Achievement points', 'achievement_level_30'] : null,
      [c.rs, c.rg.toUpperCase(), 'inv_bannerpvp_01'],
      c.last ? [ago(c.last).replace(' ago', ''), 'Last played', 'inv_misc_pocketwatch_01'] : null,
    ].filter(Boolean).map(([v, l, ic]) => `<div class="ar-chip"><img src="${H.UI(ic)}" alt="" onerror="this.src='${H.UI('inv_misc_questionmark')}'"><span><b>${esc(v)}</b><small>${esc(l)}</small></span></div>`).join('');
    return `<section class="frame ar-sheet s12" style="--cc:${cc};--bg:url('assets/game/${sc}.jpg')"><div class="in">
      <div class="ar-head">${H.icoR(H.apRace(c.r), c.f, 64)}<div class="ar-name"><h2 style="color:${cc}">${esc(c.n)}${c.s ? ` <span>${esc(c.s)}</span>` : ''}</h2><div class="ar-line">Level <b>${c.lv}</b> ${esc(c.r)} <b style="color:${cc}">${esc(c.c)}</b>${c.g ? ` · <span class="ar-guild">&lt;${esc(c.g)}&gt;</span>` : ''}</div></div>${fcrest}</div>
      <div class="ar-chips">${chips}</div>
      <div class="ar-doll">
        <div class="ar-col l">${LEFT.map((s) => slot(s, G, 'l')).join('')}</div>
        <div class="ar-model">${D.media.main ? `<img class="ar-render" src="${esc(D.media.main)}" alt="${esc(c.n)}" onerror="this.closest('.ar-model').classList.add('nomodel')">` : ''}<div class="ar-noimg">${H.icoR(H.apRace(c.r), c.f, 120)}</div><div class="ar-lvl"><small>Level</small>${c.lv}</div></div>
        <div class="ar-col r">${RIGHT.map((s) => slot(s, G, 'r')).join('')}</div>
        <div class="ar-wpn">${BOTTOM.map((s) => slot(s, G, 'b')).join('')}</div>
      </div>
      <button class="ar-duel" data-duel="1"><img src="${H.UI('ability_parry')}" alt=""><span><b>Challenge to a duel</b><small>Pick anyone. Real stats, real gear.</small></span></button>
      <div class="ar-live"><span class="ar-dot"></span>Straight from the Forever armory · checked ${D.t ? ago(D.t).replace('1 min ago', 'just now') : 'just now'}</div>
    </div></section>
    <section class="frame panel s12 ar-stats"><div class="in slab"><div class="head"><h2>Character stats</h2></div><div class="ar-sgrid">${statRows(D.stats, c.c)}</div>${res ? `<div class="ar-resrow">${res}</div>` : ''}</div></section>`;
  }

  function ensureTip() {
    if (tipEl) return tipEl;
    tipEl = document.createElement('div');
    tipEl.className = 'ar-tip';
    document.body.appendChild(tipEl);
    document.addEventListener('touchstart', () => { lastTouch = Date.now(); }, { passive: true });
    document.addEventListener('click', (e) => {
      if (!tipEl.classList.contains('sheet')) return;
      if (!e.target.closest('.ar-slot') || e.target.closest('.ar-tip')) { tipEl.className = 'ar-tip'; }
    });
    return tipEl;
  }

  function wire(root, D) {
    const G = {};
    D.gear.forEach((g) => { G[g.slot] = g; });
    const T = ensureTip();
    const place = (e) => {
      const w = T.offsetWidth, h = T.offsetHeight;
      let x = e.clientX + 18, y = e.clientY + 14;
      if (x + w > innerWidth - 8) x = e.clientX - w - 18;
      if (y + h > innerHeight - 8) y = Math.max(8, innerHeight - h - 8);
      T.style.left = `${Math.max(8, x)}px`;
      T.style.top = `${y}px`;
    };
    root.querySelectorAll('.ar-slot[data-slot]').forEach((b) => {
      const g = G[b.dataset.slot];
      b.addEventListener('mousemove', (e) => {
        if (Date.now() - lastTouch < 800) return;
        if (!T.classList.contains('on')) { T.innerHTML = tip(g); T.className = 'ar-tip on'; }
        place(e);
      });
      b.addEventListener('mouseleave', () => { if (!T.classList.contains('sheet')) T.className = 'ar-tip'; });
      b.addEventListener('click', (e) => {
        if (Date.now() - lastTouch > 800) return;
        e.stopPropagation();
        T.innerHTML = `${tip(g)}<button class="ar-tx" aria-label="Close">×</button>`;
        T.className = 'ar-tip on sheet';
        T.style.left = '';
        T.style.top = '';
      });
    });
  }

  function landing(el) {
    const A = window.API_DATA && API_DATA.census;
    const L = ((A && A.leaders && A.leaders.all) || []).slice(0, 6);
    el.innerHTML = `<section class="frame ar-land s12"><div class="in"><img class="ar-lic" src="${H.UI('inv_misc_book_09')}" alt=""><h2>The Armory</h2><p>Look up anyone on WoW: Forever. You get their gear, stats and model as they are right now, straight from the armory.</p>${searchHtml('arq', true)}
      ${L.length ? `<div class="ar-try"><span>Highest levels right now</span>${L.map((p) => `<a href="${link(p.rg, p.slug)}" style="color:${H.CC[H.apCls(p.c)] || '#fff'}">${esc(p.n)}<small>${p.lv}</small></a>`).join('')}</div>` : ''}</div></section>`;
    bind('arq');
    setTimeout(() => { const q = document.getElementById('arq'); if (q && matchMedia('(hover: hover)').matches) q.focus(); }, 30);
  }

  async function load(rg, slug) {
    const key = rg + '/' + slug;
    if (memo[key]) return memo[key];
    let D;
    try {
      const r = await fetch(`${CHAR}/char/${rg}/${encodeURIComponent(slug)}`);
      D = r.ok ? await r.json() : { missing: true };
    } catch (e) { D = { error: true }; }
    if (!D.missing && !D.error) memo[key] = D;
    return D;
  }

  async function page(el, rg, slug) {
    if (!rg || !slug) { landing(el); return null; }
    el.innerHTML = `<section class="frame ar-wait s12"><div class="in"><span class="ar-spin"></span><b>Opening the armory…</b><small>Fetching ${esc(slug.replace(/-/g, ' '))} live from Forever</small></div></section>`;
    const D = await load(rg, slug);
    if (!document.body.contains(el)) return D;
    if (D.missing || D.error) {
      el.innerHTML = `<section class="frame ar-land s12"><div class="in"><img class="ar-lic" src="${H.UI('inv_misc_questionmark')}" alt=""><h2>${D.error ? 'The armory is not answering' : 'Nobody home'}</h2><p>${D.error ? 'Try again in a minute.' : 'This character could not be found. They may have been renamed, deleted, or asked to be left out.'}</p>${searchHtml('arq', true)}</div></section>`;
      bind('arq');
      return D;
    }
    el.innerHTML = `<div class="ar-top s12">${searchHtml('arq2')}</div>` + sheet(D);
    bind('arq2');
    wire(el, D);
    const db = el.querySelector('[data-duel]');
    if (db) db.onclick = () => { if (window.LI_DUEL) LI_DUEL.challenge(D); };
    const img = el.querySelector('.ar-render');
    if (img && img.complete && !img.naturalWidth) el.querySelector('.ar-model').classList.add('nomodel');
    return D;
  }

  window.LI_ARMORY = { init: (h) => { H = h; }, page, searchHtml, bind, link, load, tip, icon, get H() { return H; }, CLASS, RACE, QC, SCENE, RI };
})();
