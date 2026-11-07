const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const CC = { WARRIOR: '#C69B6D', PALADIN: '#F48CBA', HUNTER: '#AAD372', ROGUE: '#FFF468', PRIEST: '#FFFFFF', SHAMAN: '#0070DD', MAGE: '#3FC7EB', WARLOCK: '#8788EE', DRUID: '#FF7C0A' };
const SCHOOL = { fire: '#ff8a3c', frost: '#8fd0ff', arcane: '#e09bff', shadow: '#b18cff', nature: '#7dff8a', holy: '#ffe680', phys: '#ffffff' };
const STATE = { stun: 'Stunned', fear: 'Feared', poly: 'Polymorphed', root: 'Rooted', block: 'Immune', stealth: 'Stealthed' };
const STATE_IC = { stun: 'spell_frost_stun', fear: 'spell_shadow_possession', poly: 'spell_nature_polymorph', root: 'spell_frost_frostnova', block: 'spell_holy_divineintervention', stealth: 'ability_stealth' };
const RI = (n) => `https://render.worldofwarcraft.com/us/icons/56/${n}.jpg`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n) => Math.round(n).toLocaleString('en-US');

let SPELLS = null;
const spellMap = () => (SPELLS = SPELLS || new Promise((done) => {
  if (window.LI_SPELLS) { done(window.LI_SPELLS); return; }
  const sc = document.createElement('script');
  sc.src = 'spellicons.js';
  sc.onload = () => done(window.LI_SPELLS || {});
  sc.onerror = () => done({});
  document.head.appendChild(sc);
}));

export const classColor = (cls) => CC[cls] || '#f8d36b';

export class FightHud {
  constructor(host) {
    this.host = host;
    this.map = {};
    spellMap().then((m) => { this.map = m || {}; });
    let el = host.querySelector(':scope > .fhud');
    if (!el) {
      el = document.createElement('div');
      el.className = 'fhud';
      host.appendChild(el);
    }
    this.el = el;
    host.classList.add('fhud-on');
    this.runId = 0;
  }

  icon(name, fallback) {
    if (/^(Melee|Auto Shot|Shoot|Wand)$/i.test(name || '') && fallback) return fallback;
    const id = this.map[String(name || '').toLowerCase()];
    return id ? `https://render.worldofwarcraft.com/us/icons/56/${id}.jpg` : (fallback || 'assets/game/ui/inv_misc_questionmark.png');
  }

  frameHtml(s, i) {
    return `<div class="fh-uf ${i ? 'b' : 'a'}" style="--cc:${s.color}"><div class="fh-pt"><img src="${s.portrait}" alt=""><i>${esc(s.badge || '')}</i></div>
      <div class="fh-bars"><b class="fh-nm">${esc(s.name)}</b><div class="fh-hp"><em></em><i></i><span></span></div><div class="fh-rs"><i></i></div><div class="fh-cb"><i></i><span></span></div></div></div>`;
  }

  intro(a, b, place) {
    const id = ++this.runId;
    this.sides = [a, b];
    this.el.innerHTML = `<div class="fh-top">${this.frameHtml(a, 0)}<div class="fh-clock"><b>0.0</b><small>sec</small></div>${this.frameHtml(b, 1)}</div>
      <div class="fh-call a"></div><div class="fh-call b"></div><div class="fh-flash"></div>
      <div class="fh-intro"><div class="fh-half a" style="--cc:${a.color}"><span class="fh-med"><img src="${a.portrait}" alt=""></span><div class="fh-who"><b>${esc(a.name)}</b><small>${esc(a.sub || '')}</small></div></div><div class="fh-half b" style="--cc:${b.color}"><span class="fh-med"><img src="${b.portrait}" alt=""></span><div class="fh-who"><b>${esc(b.name)}</b><small>${esc(b.sub || '')}</small></div></div><div class="fh-vs"><span>VS</span></div>${place ? `<div class="fh-where">${esc(place)}</div>` : ''}</div>
      <div class="fh-cd"></div><div class="fh-end"></div>`;
    this.el.className = 'fhud intro';
    this.skipIntro = false;
    this.el.onclick = () => { if (this.el.classList.contains('intro')) this.skipIntro = true; };
    void this.el.offsetWidth;
    this.el.classList.add('in');
    return id;
  }

  wait(ms, id) {
    return new Promise((done) => { const s = performance.now(); const tick = () => { if (id !== this.runId || this.skipIntro || performance.now() - s >= ms) done(); else setTimeout(tick, 50); }; tick(); });
  }

  async countdown(id, minIntro = 2400, ready = Promise.resolve()) {
    await Promise.all([ready, this.wait(CALM ? 400 : minIntro, id)]);
    if (id !== this.runId) return false;
    this.el.classList.add('out');
    this.el.classList.remove('intro');
    const cd = this.el.querySelector('.fh-cd');
    const show = (html, ms) => { cd.innerHTML = html; cd.classList.remove('show'); void cd.offsetWidth; cd.classList.add('show'); return this.wait(ms, id); };
    this.skipIntro = false;
    if (!CALM) {
      await this.wait(450, id);
      for (const n of ['3', '2', '1']) { if (this.skipIntro || id !== this.runId) break; await show(`<span>${n}</span>`, 700); }
    }
    if (id !== this.runId) return false;
    show('<span class="go">Duel!</span>', 0);
    this.el.classList.add('live');
    return true;
  }

  bars(i, f) {
    const uf = this.el.querySelector(`.fh-uf.${i ? 'b' : 'a'}`);
    if (!uf || !f) return;
    const pct = Math.max(0, Math.min(100, (100 * Math.max(0, f.hp)) / f.max));
    uf.querySelector('.fh-hp i').style.width = pct + '%';
    uf.querySelector('.fh-hp em').style.width = pct + '%';
    uf.querySelector('.fh-hp span').textContent = `${fmt(Math.max(0, f.hp))} / ${fmt(f.max)}`;
    uf.classList.toggle('low', pct < 25 && pct > 0);
    const rs = uf.querySelector('.fh-rs');
    rs.dataset.k = f.resKind;
    rs.querySelector('i').style.width = Math.max(0, Math.min(100, (100 * f.res) / (f.resMax || 100))) + '%';
  }

  play(arena, rec) {
    const id = this.runId;
    this.rec = rec;
    this.bars(0, rec.frames[0].a);
    this.bars(1, rec.frames[0].b);
    let shown = -1;
    const endT = rec.frames[rec.frames.length - 1].t;
    const tick = () => {
      if (id !== this.runId) return;
      const p = arena.playing;
      if (!p) return;
      const t = Math.min(endT, p.t), i = Math.min(rec.frames.length - 1, Math.floor(t / 0.2) + 1);
      if (i !== shown) { shown = i; const f = rec.frames[i]; this.bars(0, f.a); this.bars(1, f.b); this.el.querySelector('.fh-clock b').textContent = f.t.toFixed(1); }
      this.host.classList.toggle('fh-slow', endT - t < 1 && !CALM && p.t < 1e4);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  call(side, html, color) {
    const box = this.el.querySelector(`.fh-call.${side ? 'b' : 'a'}`);
    if (!box) return;
    const c = document.createElement('div');
    c.className = 'fh-c';
    if (color) c.style.setProperty('--tc', color);
    c.innerHTML = html;
    box.appendChild(c);
    while (box.childElementCount > 3) box.firstElementChild.remove();
    setTimeout(() => c.remove(), 2200);
  }

  event(e, skipping) {
    const s = this.sides && this.sides[e.side];
    if (!s) return;
    if (e.type === 'cast') {
      const cb = this.el.querySelector(`.fh-uf.${e.side ? 'b' : 'a'} .fh-cb`);
      cb.querySelector('span').innerHTML = `<img src="${this.icon(e.name)}" alt="">${esc(e.name)}`;
      cb.classList.remove('go', 'cut');
      void cb.offsetWidth;
      cb.style.setProperty('--ct', `${Math.max(0.3, e.amount || 1.5) / (this.speed || 1)}s`);
      cb.classList.add('go');
      return;
    }
    if (skipping) return;
    if (e.type === 'interrupt') {
      const cb = this.el.querySelector(`.fh-uf.${e.side ? 'b' : 'a'} .fh-cb`);
      cb.classList.remove('go');
      cb.classList.add('cut');
      this.call(e.side, 'Interrupted!', '#ff6a5a');
    } else if (e.type === 'cc') this.call(e.side, `<img src="${RI(STATE_IC[e.name] || 'spell_frost_stun')}" alt="">${STATE[e.name] || esc(e.name)}`, '#ffd36b');
    else if (e.type === 'buff' || e.type === 'move' || e.type === 'trinket') this.call(e.side, `<img src="${this.icon(e.type === 'trinket' ? 'PvP Trinket' : e.name)}" alt="">${esc(e.type === 'trinket' ? 'Breaks free!' : e.name)}`, '#9fe0ff');
    else if (e.type === 'hit' && e.crit && e.amount) {
      this.call(e.side, `<img src="${this.icon(e.name)}" alt="">${esc(e.name)} crit!`, '#ffe14d');
      if (!CALM) {
        const fl = this.el.querySelector('.fh-flash');
        fl.style.setProperty('--fc', SCHOOL[e.school] || '#fff');
        fl.classList.remove('on');
        void fl.offsetWidth;
        fl.classList.add('on');
      }
    }
  }

  logLine(box, e, names) {
    if (!box) return;
    const who = names[e.side], other = names[1 - e.side];
    const ic = (n) => `<img src="${this.icon(n)}" alt="">`;
    const sc = e.school ? ` style="color:${SCHOOL[e.school] || '#fff'}"` : '';
    const map = {
      hit: () => (e.amount ? `${ic(e.name)}<b>${esc(who)}</b>'s <span${sc}>${esc(e.name)}</span> hits ${esc(other)} for <em${e.crit ? ' class="cr"' : ''}>${fmt(e.amount)}${e.crit ? ' crit' : ''}</em>` : null),
      heal: () => `${ic(e.name)}<b>${esc(who)}</b> heals for <em class="hl">${fmt(e.amount)}</em> with ${esc(e.name)}`,
      cc: () => `<img src="${RI(STATE_IC[e.name] || 'spell_frost_stun')}" alt=""><b>${esc(who)}</b> is ${(STATE[e.name] || e.name).toLowerCase()} for ${(+e.amount).toFixed(1)}s`,
      buff: () => `${ic(e.name)}<b>${esc(who)}</b> uses ${esc(e.name)}`,
      move: () => `${ic(e.name)}<b>${esc(who)}</b> uses ${esc(e.name)}`,
      trinket: () => `${ic('PvP Trinket')}<b>${esc(who)}</b> breaks free!`,
      interrupt: () => `${ic(e.name)}<b>${esc(who)}</b>'s ${esc(e.name)} is interrupted`,
      miss: () => `${ic(e.name)}<b>${esc(who)}</b>'s ${esc(e.name)} misses`,
      dodge: () => `${ic(e.name)}${esc(other)} dodges ${esc(who)}'s ${esc(e.name)}`,
      parry: () => `${ic(e.name)}${esc(other)} parries ${esc(who)}'s ${esc(e.name)}`,
      resist: () => `${ic(e.name)}${esc(other)} resists ${esc(who)}'s ${esc(e.name)}`,
    }[e.type];
    const body = map && map();
    if (!body) return;
    box.insertAdjacentHTML('beforeend', `<div class="fh-l ${e.side ? 'b' : 'a'}"><time>${e.t.toFixed(1)}</time><span>${body}</span></div>`);
    while (box.childElementCount > 150) box.firstElementChild.remove();
    box.scrollTop = box.scrollHeight;
  }

  end() {
    this.host.classList.remove('fh-slow');
    this.el.querySelectorAll('.fh-cb').forEach((c) => c.classList.remove('go'));
    if (this.rec) { const f = this.rec.frames[this.rec.frames.length - 1]; this.bars(0, f.a); this.bars(1, f.b); this.el.querySelector('.fh-clock b').textContent = f.t.toFixed(1); }
  }

  clear() {
    this.runId++;
    this.host.classList.remove('fh-slow');
    this.el.className = 'fhud';
    this.el.innerHTML = '';
  }
}
