import * as THREE from 'three';
import { Arena, CALM } from '../pvp/arena.js';
import { Stage } from '../draft/stage.js';
import { MILESTONES, tierOf } from './bosses.js';

const SIZE = { jeklik: 4.6, venoxis: 5.6, marli: 3.8, mandokir: 5.4, grilek: 5.4, hazzarah: 5.4, renataki: 5.4, wushoolay: 5.4, gahzranka: 7.6, thekal: 4.2, arlokk: 4.2, jindo: 5, hakkar: 10.5, lucifron: 5, magmadar: 4.6, gehennas: 5, garr: 5.4, geddon: 6.4, shazzrah: 5, sulfuron: 5.4, golemagg: 7.5, majordomo: 4.6, ragnaros: 11, kurinnaxx: 5.8, rajaxx: 4.4, moam: 6.6, buru: 6, ayamiss: 6.4, ossirian: 9 };
const TONE = { fire: 0xff7a2a, frost: 0x7fd4ff, arcane: 0xd27dff, shadow: 0x9a5cff, nature: 0x7dff8a, holy: 0xffe680, phys: 0xffffff };
const COLOR = { fire: '#ff8a3c', frost: '#8fd0ff', arcane: '#d59bff', shadow: '#b18cff', nature: '#7dff8a', holy: '#ffe680', phys: '#ffffff' };
const TIME = 3, BOSS_Z = -6, CAST = /^(moon|ele|shadow|shadowd|shock|fire|frost|arcane|afflic|demo|destro)$/;
const HOME = { tank: [0, -1.9], heal: [-2.5, 1.7], melee: [1.8, -1.7], ranged: [2.5, 1.7] };
const FORMS = { druidcat: ['assets/draft/gear/summon_druidcat.glb', 1.25], druidbear: ['assets/raid/gear/druidbear.glb', 1.9] };
const formOf = (h) => (h.cls !== 'DRUID' ? null : h.role === 'tank' ? 'druidbear' : /^(cat|catm)$/.test(h.build || '') ? 'druidcat' : null);

export class RaidScene extends Arena {
  constructor(host, gearData, pool) {
    super(host, gearData, pool);
    const third = document.createElement('canvas');
    third.hidden = true;
    third.className = 'arena-other';
    host.append(third);
    this.stageC = new Stage(third, gearData);
    this.stageC.pause();
    host.insertAdjacentHTML('beforeend', '<div class="rframes"></div><div class="rcast" hidden></div>');
    this.team = [];
    this.bossRig = null;
    this.speed = 1;
    this.forms = {};
  }

  async loadForm(name) {
    if (this.forms[name]) return this.forms[name];
    const g = await this.stageA.loader.loadAsync(FORMS[name][0]).catch(() => null);
    if (!g) return null;
    const root = g.scene, box = new THREE.Box3().setFromObject(root), mixer = new THREE.AnimationMixer(root), clips = {};
    for (const c of g.animations) clips[c.name] = mixer.clipAction(c);
    if (clips.death) { clips.death.setLoop(THREE.LoopOnce, 1); clips.death.clampWhenFinished = true; }
    root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    root.scale.setScalar(FORMS[name][1] / Math.max(.1, box.max.y - box.min.y));
    root.visible = false;
    this.stageA.scene.add(root);
    this.forms[name] = { root, mixer, clips, current: null, rig: null };
    return this.forms[name];
  }

  async showForm(stage, hero) {
    const name = formOf(hero), form = name && await this.loadForm(name);
    if (!form) return null;
    form.rig = stage.rig;
    form.root.visible = true;
    stage.rig.visible = false;
    form.current = null;
    form.mixer.stopAllAction();
    this.act(form, 'idle', 1);
    return form;
  }

  hideForms() {
    for (const form of Object.values(this.forms)) {
      form.root.visible = false;
      form.rig = null;
    }
  }

  list(s) {
    return super.list(s).filter(([, id, row]) => [2, 11, 12, 28].includes(row[3]) || this.gearData.items[id]);
  }

  async hero(s) {
    this.leaveRaid();
    await super.hero(s);
    await this.showForm(this.stageA, s);
  }

  wear(slot, id) {
    return this.gearData.items[id] ? super.wear(slot, id) : Promise.resolve();
  }

  leaveRaid() {
    const scene = this.stageA.scene;
    this.hideForms();
    this.host.classList.remove('raidfight');
    if (this.bossRig) { scene.remove(this.bossRig.root); this.bossRig = null; }
    for (const st of [this.stageB, this.stageC]) if (st.rig && st.rig.parent === scene) { scene.remove(st.rig); st.scene.add(st.rig); }
    if (this.stageA.rig) { this.stageA.rig.position.set(0, 0, 0); this.stageA.rig.rotation.set(0, 0, 0); }
    this.stageA.fightOn = false;
    for (const m of this.team) if (m.rune) m.rune.visible = false;
    if (this.bossRune) this.bossRune.visible = false;
    this.q('.rframes').innerHTML = '';
    this.q('.rcast').hidden = true;
  }

  async loadBoss(boss) {
    const g = await this.stageA.loader.loadAsync(`assets/raid/gear/${boss.id}.glb`).catch(() => null);
    if (!g) return null;
    const root = g.scene, box = new THREE.Box3().setFromObject(root), height = Math.max(.1, box.max.y - box.min.y), mixer = new THREE.AnimationMixer(root), clips = {};
    for (const c of g.animations) clips[c.name] = mixer.clipAction(c);
    if (clips.death) { clips.death.setLoop(THREE.LoopOnce, 1); clips.death.clampWhenFinished = true; }
    root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    root.scale.setScalar((SIZE[boss.id] || 3.4) / height);
    root.position.set(0, 0, BOSS_Z);
    return { root, mixer, clips, current: null };
  }

  async stageRaid(heroes, boss, raid = {}) {
    this.leaveRaid();
    this.reset();
    this.mode = 'fight';
    this.host.classList.add('fighting', 'raidfight');
    const stages = [this.stageA, this.stageB, this.stageC];
    this.stageA.resize();
    for (let i = 0; i < 3; i++) await this.dressOne(stages[i], heroes[i]);
    const a = this.stageA;
    for (const st of stages.slice(1)) a.scene.add(st.rig);
    this.bossRig = await this.loadBoss(boss);
    if (this.bossRig) { a.scene.add(this.bossRig.root); this.act(this.bossRig, 'idle', 1); }
    await Promise.race([this.scenery.ready, new Promise((done) => { setTimeout(done, 6000); })]);
    this.showWorld(true);
    a.fightOn = true;
    a.ring.visible = false;
    a.dummy = null;
    if (a.shadow) a.shadow.visible = false;
    this.team = heroes.map((h, i) => {
      const melee = h.role === 'dps' && !CAST.test(h.build) && h.cls !== 'HUNTER', at = HOME[h.role === 'dps' ? (melee ? 'melee' : 'ranged') : h.role], st = stages[i];
      st.rig.visible = true;
      this.fade(st.rig, 1);
      st.rig.position.set(at[0], 0, at[1]);
      st.rig.rotation.y = Math.atan2(-at[0], BOSS_Z - at[1]);
      const two = h.picks.main && this.pool.items[h.picks.main] && this.pool.items[h.picks.main][3] === 17;
      st.pose(two ? 'ready2h' : 'ready1h');
      return { stage: st, hero: h, melee, two, castUntil: 0, dead: false, home: [at[0], at[1]], goal: null, next: 1 + Math.random() * 3, moving: false };
    });
    for (const m of this.team) m.form = await this.showForm(m.stage, m.hero);
    const portrait = Math.min(1.4, Math.max(1, 1.25 / a.camera.aspect)), narrow = Math.min(1, a.camera.aspect / .95);
    this.team.forEach((m) => { m.stage.rig.position.x *= narrow; m.home[0] *= narrow; m.rune ||= this.rune(); m.rune.userData.v = 0; m.rune.visible = false; m.trail = m.melee || m.hero.role === 'tank'; });
    this.bossRune ||= this.rune();
    this.bossRune.userData.v = 0;
    a.scene.fog = new THREE.Fog(this.fogNear.color.getHex(), 26, 76);
    a.want = { x: 0, y: 4.6, z: 13.5 * portrait, tx: 0, ty: 2.6 };
    a.view = CALM ? { ...a.want } : { x: 0, y: 11, z: 13.5 * portrait + 14, tx: 0, ty: 3.4 };
    this.bossName = boss.name;
    this.endless = !!boss.endless;
    this.finale = raid.finale || 'Ragnaros';
    this.miles = raid.milestones || MILESTONES;
    this.shown = 0;
    this.tier = -1;
    this.size = (SIZE[boss.id] || 3.4) * .75;
    this.drawFrames(null);
  }

  drawFrames(f) {
    const box = this.q('.rframes');
    if (!box.firstChild) {
      box.innerHTML = `${this.endless ? `<div class="rfinal t-1"><span>Final Stand</span><b>0</b><em>Damage to ${this.finale}</em></div><div class="rmiles"></div>` : '<div class="rboss"><span class="rbname"></span><div class="ubar hp"><i></i><b></b></div></div>'}<div class="rteam">${this.team.map((m, i) => `<div class="rmember" data-m="${i}"><img src="assets/classes/${m.hero.cls}.png" alt=""><div><div class="ubar hp"><i></i><b></b></div><div class="ubar res"><i></i></div></div></div>`).join('')}</div>`;
      if (!this.endless) box.querySelector('.rbname').textContent = this.bossName;
    }
    if (!f) return;
    if (!this.endless) {
      box.querySelector('.rboss .hp i').style.width = `${Math.max(0, f.boss) * 100}%`;
      box.querySelector('.rboss .hp b').textContent = `${Math.round(Math.max(0, f.boss) * 100)}%`;
    }
    this.team.forEach((m, i) => {
      const row = box.querySelector(`[data-m="${i}"]`), [hp, max, mana] = f.party[i], maxMana = m.hero.mana || 0;
      row.classList.toggle('dead', hp <= 0);
      const fill = row.querySelector('.hp i'), pct = hp / max * 100;
      fill.style.width = `${pct}%`;
      fill.style.background = pct < 25 ? 'linear-gradient(#ff6a4a,#a01d10)' : '';
      row.querySelector('.hp b').textContent = hp.toLocaleString('en-US');
      const res = row.querySelector('.res');
      res.hidden = !maxMana;
      if (maxMana) res.querySelector('i').style.width = `${mana / maxMana * 100}%`;
    });
  }

  climb(score, dt) {
    const box = this.q('.rfinal');
    if (!box) return;
    this.shown += (score - this.shown) * Math.min(1, dt * 7);
    if (score - this.shown < 5) this.shown = score;
    box.querySelector('b').textContent = Math.round(this.shown).toLocaleString('en-US');
    const tier = tierOf(this.shown);
    if (tier === this.tier) return;
    this.tier = tier;
    box.className = `rfinal t${tier} hit`;
    setTimeout(() => box.classList.remove('hit'), 500);
    if (this.playing && this.playing.t >= 1e4) return;
    const [at, name] = this.miles[tier], mile = document.createElement('div');
    mile.className = `rmile t${tier}`;
    mile.innerHTML = `<b>${name}</b><span>${at.toLocaleString('en-US')} damage</span>`;
    this.q('.rmiles').append(mile);
    setTimeout(() => mile.remove(), 1700);
    this.fx.shake = Math.max(this.fx.shake, .8);
    const rig = this.bossRig && this.bossRig.root;
    if (rig) for (let i = 0; i < 14; i++) this.stageA.spark(rig.position.x + (Math.random() - .5) * 5, 2 + Math.random() * 6, rig.position.z + 1, { color: 0xffc04a, size: .5, life: .8, vy: 2, grow: .6, opacity: .9 });
  }

  spot(i) {
    const rig = i === 'boss' ? this.bossRig?.root : this.team[i]?.stage.rig;
    if (!rig) return { x: 50, y: 30 };
    const v = new THREE.Vector3(rig.position.x, i === 'boss' ? (this.size || 3) : 2.1, rig.position.z).project(this.stageA.camera);
    return { x: (v.x + 1) / 2 * 100, y: (1 - v.y) / 2 * 100 };
  }

  number(at, text, color, crit) {
    if (this.playing && this.playing.t >= 1e4) return;
    if (this.host.querySelectorAll('.dmg').length > 10) return;
    const n = document.createElement('span'), p = this.spot(at);
    n.className = `dmg${crit ? ' crit' : ''}`;
    n.style.left = `${p.x + (Math.random() * 10 - 5)}%`;
    n.style.top = `${p.y + (Math.random() * 4 - 2)}%`;
    n.style.color = color;
    n.textContent = text;
    this.host.append(n);
    setTimeout(() => n.remove(), 1000);
  }

  event(e) {
    const a = this.stageA, m = this.team[e.i];
    if (e.k === 'hit') { this.number(e.i, e.v, COLOR[e.school] || '#fff'); if (m) a.spark(m.stage.rig.position.x, 1.3, m.stage.rig.position.z, { color: TONE[e.school] || 0xffffff, size: .4, life: .35, grow: .6, opacity: .8 }); if (e.v > 300) { this.fx.shake = Math.max(this.fx.shake, .3); if (m) { this.shock(m.stage.rig.position.x, m.stage.rig.position.z, TONE[e.school] || 0xffd8a0, .7, .45); this.puff(m.stage.rig.position.x, m.stage.rig.position.z, 6, .8); } } }
    else if (e.k === 'deal') { if (e.v > 30) this.number('boss', e.v, e.crit ? '#ffd85a' : COLOR[e.school] || '#fff', e.crit); if (e.crit && e.v > 400) this.punch(.25); }
    else if (e.k === 'heal') { if (e.v > 0) this.number(e.i, `+${e.v}`, '#5dff7a', e.crit); if (m) a.spark(m.stage.rig.position.x, 1.6, m.stage.rig.position.z, { color: 0x7dff8a, size: .3, life: .5, vy: 1, grow: .3, opacity: .7 }); }
    else if (e.k === 'avoid') this.number(e.i, e.n[0].toUpperCase() + e.n.slice(1), '#c9b99a');
    else if (e.k === 'cast') { if (m) m.castUntil = this.playing.t + e.dur; }
    else if (e.k === 'boss') {
      const box = this.q('.rcast');
      box.textContent = e.n;
      box.hidden = false;
      clearTimeout(this.castTimer);
      this.castTimer = setTimeout(() => { box.hidden = true; }, 1300);
      if (this.bossRig) { this.act(this.bossRig, 'cast', 1); this.bossBusy = this.playing.t + 2; this.bossCast = this.playing.t + 2.4; }
      for (const m of this.team) if (!m.melee && m.hero.role !== 'tank' && Math.random() < .7) m.next = Math.random() * .4;
    } else if (e.k === 'save') { const box = this.q('.rcast'); box.textContent = e.n; box.hidden = false; clearTimeout(this.castTimer); this.castTimer = setTimeout(() => { box.hidden = true; }, 1300); }
    else if (e.k === 'death') { if (m) { m.dead = true; m.stage.pose('death', 1); if (m.form) this.act(m.form, 'death', 1); const p = m.stage.rig.position; setTimeout(() => this.puff(p.x, p.z, 12, 1), 550); } this.fx.shake = .6; }
  }

  play(rec, x, { onEnd }) {
    this.q('.banner3d').hidden = true;
    this.playing = { t: 0, at: 0, rec };
    this.onEnd = onEnd;
  }

  step(dt) {
    const run = this.playing, { rec } = run, last = rec.frames.length - 1;
    run.t += dt * this.speed * TIME;
    const i = Math.min(last, Math.max(0, Math.floor(run.t / .5))), f = rec.frames[i];
    if (f) { this.drawFrames(f); if (this.endless) this.climb(f.score, dt); }
    let shown = 0;
    while (run.at < rec.events.length && rec.events[run.at].t <= run.t) {
      const e = rec.events[run.at++];
      if (['hit', 'deal', 'heal', 'avoid'].includes(e.k) && ++shown > 3) continue;
      this.event(e);
    }
    for (const m of this.team) {
      if (m.dead) continue;
      const role = m.hero.role;
      if (this.wander(m, dt)) continue;
      if (m.form) this.act(m.form, 'attack', 1.2);
      if (role === 'heal') m.stage.pose(m.castUntil > run.t ? 'castdirected' : 'ready1h', 1.2);
      else if (m.melee || role === 'tank') m.stage.pose(m.two ? 'attack2h' : 'attack1h', 1.5);
      else m.stage.pose(m.hero.cls === 'HUNTER' ? 'attackbow' : 'castdirected', 1);
    }
    if (this.bossRig && (this.bossBusy || 0) < run.t) this.act(this.bossRig, 'attack', 1);
    if (run.t >= rec.time || i >= last) {
      this.playing = null;
      if (f) { this.drawFrames(f); if (this.endless) { this.shown = f.score; this.climb(rec.score, 1); this.shown = rec.score; this.climb(rec.score, 1); } }
      if (this.bossRig) this.act(this.bossRig, rec.won ? 'death' : 'idle', 1);
      for (const m of this.team) if (!m.dead && !rec.won) { m.stage.pose('ready1h'); if (m.form) this.act(m.form, 'idle', 1); }
      if (this.onEnd) setTimeout(() => this.onEnd(rec), 900);
    }
  }

  wander(m, dt) {
    const rig = m.stage.rig, p = rig.position, tank = m.hero.role === 'tank';
    m.next -= dt * this.speed;
    if (!m.goal && m.next <= 0 && !tank) {
      const spread = m.melee ? .9 : 2.2, a = Math.random() * Math.PI * 2, r = spread * (.4 + Math.random() * .6);
      m.goal = [m.home[0] + Math.cos(a) * r, m.home[1] + Math.sin(a) * r * .6];
      m.next = (m.melee ? 5 : 3.5) + Math.random() * 4;
    }
    if (!m.goal) { rig.rotation.y += (Math.atan2(-p.x, BOSS_Z - p.z) - rig.rotation.y) * Math.min(1, dt * 6); return false; }
    const dx = m.goal[0] - p.x, dz = m.goal[1] - p.z, d = Math.hypot(dx, dz), step = Math.min(d, dt * 3.4 * this.speed);
    if (d < .05) { m.goal = null; return false; }
    p.x += dx / d * step;
    p.z += dz / d * step;
    rig.rotation.y = Math.atan2(dx, dz);
    if (m.form) this.act(m.form, 'run', 1.3); else m.stage.pose('run', 1.3);
    return true;
  }

  afterFrame(dt) {
    if (this.mode !== 'fight' || !this.world.visible || !this.team.length || !this.bossRig) return;
    const t = this.playing ? this.playing.t : -1;
    for (const m of this.team) {
      const p = m.stage.rig.position;
      if (m.rune) this.glyph(m.rune, !m.dead && m.castUntil > t, m.hero.role === 'heal' ? 0x8dffa8 : 0xc89bff, p.x, p.z, 1, dt);
      this.swing(m.stage, m.trail && !m.dead && !!this.playing && !m.form, dt);
    }
    const b = this.bossRig.root.position;
    if (this.bossRune) this.glyph(this.bossRune, (this.bossCast || 0) > t, this.scenery.set === 'jungle' ? 0x8fe36a : this.scenery.set === 'ahnqiraj' ? 0xffc46a : 0xff6a2a, b.x, b.z + 1, Math.min(3.4, this.size * .5), dt);
  }

  loop() {
    const now = performance.now(), dt = Math.min(.1, (now - (this.lastC || now)) / 1000) * (this.scale ?? 1);
    this.lastC = now;
    if (this.mode === 'fight' && this.stageC.mixer) this.stageC.mixer.update(dt);
    if (this.bossRig) this.bossRig.mixer.update(dt);
    for (const form of Object.values(this.forms)) {
      if (!form.rig) continue;
      form.root.position.copy(form.rig.position);
      form.root.rotation.y = form.rig.rotation.y;
      form.rig.visible = false;
      form.mixer.update(dt);
    }
    super.loop();
  }
}
