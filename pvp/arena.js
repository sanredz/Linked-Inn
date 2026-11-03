import * as THREE from 'three';
import { Stage } from '../draft/stage.js';
import { PRESETS } from './engine.js';
import { SLOTS } from './gear.js';
import { Scenery } from './scenery.js';

const SCHOOL = { fire: '#ff8a3c', frost: '#8fd0ff', arcane: '#d59bff', shadow: '#b18cff', nature: '#7dff8a', holy: '#ffe680', phys: '#ffffff' };
const TONE = { fire: 0xff7a2a, frost: 0x7fd4ff, arcane: 0xd27dff, shadow: 0x9a5cff, nature: 0x7dff8a, holy: 0xffe680 };
const STATE = { stun: 'Stunned', fear: 'Feared', poly: 'Disoriented', root: 'Rooted', block: 'Immune', stealth: 'Stealthed' };
const PROP_SIZE = { druidcat: .55, sheep: .7, felhound: .42, cat: .5, whelp: .7, skeleton: 1, eskhandar: .55 };
const ACT = { dead: 'death', stun: 'stun', run: 'run', cast: 'idle', attack: 'attack', idle: 'idle' };
const DUST = 0x9a8a74;
export const THEMES = [
  { name: 'Stranglethorn Vale', zone: 'jungle' },
  { name: 'Arathi Highlands', zone: 'arathi' },
  { name: 'The Crossroads', zone: 'barrens' },
  { name: 'Elwynn Forest', zone: 'elwynn' },
];

function runeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.translate(128, 128);
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  for (const [r, w] of [[118, 5], [100, 2], [62, 3]]) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.lineWidth = w; g.stroke(); }
  for (let i = 0; i < 16; i++) {
    g.rotate(Math.PI / 8);
    g.fillRect(-2, -116, 4, i % 2 ? 10 : 16);
    if (i % 2) { g.beginPath(); g.moveTo(-7, -84); g.lineTo(0, -96); g.lineTo(7, -84); g.lineTo(0, -72); g.closePath(); g.fill(); }
  }
  g.beginPath();
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.lineTo(Math.cos(a) * 62, Math.sin(a) * 62); g.lineTo(Math.cos(a + Math.PI / 6) * 30, Math.sin(a + Math.PI / 6) * 30); }
  g.closePath();
  g.lineWidth = 2;
  g.stroke();
  return new THREE.CanvasTexture(c);
}

export const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;

import { boonsOf } from './boons.js';

export const resultHtml = ({ title, stats = [], note = '', extra = '', action, badge = '' }) => `<div class="bresult"><i class="brays"></i>${badge ? `<img class="bbadge" src="${badge}" alt="">` : ''}<h1>${title}</h1>${stats.length ? `<div class="bstats">${stats.map(([value, name], i) => `<span style="--i:${i}"><b>${value}</b><small>${name}</small></span>`).join('')}</div>` : ''}${note ? `<p class="bnote">${note}</p>` : ''}${extra}<button class="rforge" data-next="1"><span>${action}</span></button></div>`;

export class Arena {
  constructor(host, gearData, pool) {
    this.host = host;
    this.pool = pool;
    this.gearData = gearData;
    host.classList.add('arena3d');
    host.innerHTML = `<canvas class="arena-canvas"></canvas><canvas class="arena-other" hidden></canvas>
      <div class="plates"><div class="plate" data-p="0"></div><div class="plate" data-p="1"></div></div>
      <div class="frames"><div class="uframe" data-f="0"></div><div class="uframe right" data-f="1"></div></div>
      <div class="castbar a"></div><div class="castbar b"></div><div class="gapline"></div>
      <div class="banner3d" hidden></div><div class="vignette"></div>`;
    this.q = (s) => host.querySelector(s);
    this.stageA = new Stage(this.q('.arena-canvas'), gearData);
    this.stageB = new Stage(this.q('.arena-other'), gearData);
    this.stageB.pause();
    this.extras = [];
    this.fx = { shake: 0, flash: [0, 0], lunge: [0, 0], wound: [0, 0] };
    this.mode = 'idle';
    this.motes = null;
    this.playing = null;
    this.speed = 1;
    this.last = performance.now();
    this.names = ['', ''];
    this.mats = [[], []];
  }

  async init() {
    this.buildWorld();
    this.stageA.camera.far = 160;
    this.stageA.camera.updateProjectionMatrix();
    this.stageA.onFrame = (dt) => this.afterFrame(dt);
    this.quality = 2;
    this.perf = { n: 0, sum: 0, skip: 0 };
    this.trails = new Map();
    this.runeMap = runeTexture();
    this.extras = [0, 1].map(() => ({ block: this.ball(0x9fd8ff, 1, .22), shield: this.ball(0xffe9a8, .95, .1), ring: this.rootRing(), shadow: this.blob(), rune: this.rune(), orb: this.orb(), alpha: 1, tick: 0, dust: 0, dash: 0 }));
    this.props = Promise.all(this.extras.flatMap((x) => [['cat', 'druidcat'], ['sheep', 'sheep'], ['pet', 'felhound'], ['beast', 'cat']].map(async ([key, file]) => { x[key] = await this.prop(file); })));
    requestAnimationFrame(() => this.loop());
  }

  buildWorld() {
    this.scenery = new Scenery(this.stageA);
    this.world = this.scenery.group;
    this.backColor = this.scenery.backColor;
    this.fogNear = this.scenery.fog;
  }

  theme(t) {
    this.scenery.theme(t);
  }

  showWorld(on) {
    const s = this.stageA.scene;
    this.world.visible = on;
    s.background = on ? this.backColor : null;
    s.fog = on ? this.fogNear : null;
    this.perf = { n: 0, sum: 0, skip: 90 };
    this.q('.vignette').hidden = !on;
  }

  rune() {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: this.runeMap, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = .04;
    m.visible = false;
    this.stageA.scene.add(m);
    return m;
  }

  orb() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(.3, 'rgba(255,255,255,.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.visible = false;
    this.stageA.scene.add(s);
    return s;
  }

  glyph(m, on, color, x, z, size, dt) {
    const want = on ? 1 : 0;
    m.userData.v = (m.userData.v || 0) + (want - (m.userData.v || 0)) * Math.min(1, dt * 8);
    const v = m.userData.v;
    m.visible = v > .02;
    if (!m.visible) return;
    if (on) m.material.color.setHex(color);
    m.position.x = x;
    m.position.z = z;
    m.rotation.z += dt * .9;
    m.scale.setScalar(size * (.75 + v * .25 + Math.sin(performance.now() / 160) * .03));
    m.material.opacity = v * .85;
  }

  shock(x, z, color, size = 1, life = .55) {
    const a = this.stageA, geo = new THREE.RingGeometry(.3, .42, 48), m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, .05, z);
    a.scene.add(m);
    let age = 0;
    a.fx.push((dt) => {
      age += dt;
      m.scale.setScalar(size * (1 + age / life * 5));
      m.material.opacity = .8 * Math.max(0, 1 - age / life);
      if (age < life) return false;
      a.scene.remove(m);
      geo.dispose();
      m.material.dispose();
      return true;
    });
  }

  puff(x, z, n = 8, power = 1) {
    const a = this.stageA;
    for (let i = 0; i < n; i++) {
      const ang = i / n * Math.PI * 2 + Math.random() * .4, v = (.8 + Math.random() * .9) * power;
      a.spark(x + Math.cos(ang) * .3, .18, z + Math.sin(ang) * .3, { dust: 1, color: DUST, size: .5 + Math.random() * .4, life: .8 + Math.random() * .5, vx: Math.cos(ang) * v, vz: Math.sin(ang) * v * .6, vy: .25 + Math.random() * .3, grow: 1.8, opacity: .3 });
    }
  }

  tipOf(w) {
    if (w.userData.tip !== undefined) return w.userData.tip;
    w.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(w.matrixWorld).invert(), v = new THREE.Vector3(), m = new THREE.Matrix4();
    let best = null, far = 0;
    w.traverse((o) => {
      if (!o.isMesh || !o.geometry.attributes.position) return;
      const p = o.geometry.attributes.position;
      m.multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < p.count; i += 2) {
        v.fromBufferAttribute(p, i).applyMatrix4(m);
        const d = v.lengthSq();
        if (d > far) { far = d; best = v.clone(); }
      }
    });
    w.userData.tip = far > .04 ? best : null;
    return w.userData.tip;
  }

  swing(stage, on, dt, color = 0xffe2b0) {
    const w = stage.attached && stage.attached.att1;
    let t = this.trails.get(stage);
    if (!t) {
      const n = 7, geo = new THREE.BufferGeometry(), index = [];
      for (let i = 0; i < n - 1; i++) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 8), 4));
      geo.setIndex(index);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      mesh.frustumCulled = false;
      this.stageA.scene.add(mesh);
      t = { n, mesh, pts: [], v: 0 };
      this.trails.set(stage, t);
    }
    const tip = w && w.parent && stage.rig && stage.rig.visible ? this.tipOf(w) : null;
    t.v += ((on && tip ? 1 : 0) - t.v) * Math.min(1, dt * 10);
    t.mesh.visible = t.v > .02 && !!tip;
    if (!t.mesh.visible) { t.pts.length = 0; return; }
    w.updateWorldMatrix(true, false);
    const end = tip.clone().applyMatrix4(w.matrixWorld), mid = tip.clone().multiplyScalar(.62).applyMatrix4(w.matrixWorld);
    t.pts.unshift([mid, end]);
    if (t.pts.length > t.n) t.pts.length = t.n;
    const pos = t.mesh.geometry.attributes.position, col = t.mesh.geometry.attributes.color, c = new THREE.Color(color);
    for (let i = 0; i < t.n; i++) {
      const [a, b] = t.pts[Math.min(i, t.pts.length - 1)], k = (Math.max(0, 1 - i / (t.pts.length - 1 || 1)) ** 1.6) * t.v * .32;
      pos.setXYZ(i * 2, a.x, a.y, a.z);
      pos.setXYZ(i * 2 + 1, b.x, b.y, b.z);
      col.setXYZW(i * 2, c.r, c.g, c.b, 0);
      col.setXYZW(i * 2 + 1, c.r, c.g, c.b, k);
    }
    pos.needsUpdate = col.needsUpdate = true;
  }

  afterFrame(dt) {
    if (this.mode !== 'fight' || !this.world.visible) return;
    const [a, b] = [this.stageA, this.stageB];
    this.swing(a, this.kinds && this.kinds[0] === 'melee' && this.anims && this.anims[0] === 'attack', dt);
    this.swing(b, this.kinds && this.kinds[1] === 'melee' && this.anims && this.anims[1] === 'attack', dt);
  }

  async prop(name) {
    const g = await this.stageA.loader.loadAsync(`assets/draft/gear/summon_${name}.glb`).catch(() => null);
    if (!g) return null;
    const mixer = new THREE.AnimationMixer(g.scene), clips = {};
    for (const c of g.animations) clips[c.name] = mixer.clipAction(c);
    if (clips.death) { clips.death.setLoop(THREE.LoopOnce, 1); clips.death.clampWhenFinished = true; }
    g.scene.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    g.scene.scale.setScalar(PROP_SIZE[name]);
    g.scene.visible = false;
    this.stageA.scene.add(g.scene);
    return { root: g.scene, mixer, clips, current: null };
  }

  ball(color, radius, opacity) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.visible = false;
    this.stageA.scene.add(m);
    return m;
  }

  rootRing() {
    const m = new THREE.Mesh(new THREE.RingGeometry(.45, .75, 32), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: .75, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    this.stageA.scene.add(m);
    return m;
  }

  blob() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    r.addColorStop(0, 'rgba(0,0,0,.75)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = .02;
    this.stageA.scene.add(m);
    return m;
  }

  act(p, name, speed) {
    const a = p.clips[name] || p.clips.idle;
    if (!a) return;
    a.timeScale = speed;
    if (p.current === a) return;
    a.reset().fadeIn(.12).play();
    if (p.current) p.current.fadeOut(.12);
    p.current = a;
  }

  fade(root, value) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material)) { m.transparent = value < 1; m.opacity = value; m.needsUpdate = true; }
    });
  }

  list(s) {
    return SLOTS.filter((k) => s.picks[k] && this.pool.items[s.picks[k]]).map((k) => [k, s.picks[k], this.pool.items[s.picks[k]]]);
  }

  async dressOne(stage, s) {
    await stage.setClass(s.cls);
    await new Promise((done) => { stage.outfit(this.list(s), () => {}).then(done); });
    if (PRESETS[s.cls].kind === 'ranged' && stage.rangedFile) {
      await stage.attach('ranged', 'att31', null);
      await stage.attach('ranged', 'att2', stage.rangedFile);
    }
    const death = stage.clips && stage.clips.death;
    if (death) { death.setLoop(THREE.LoopOnce, 1); death.clampWhenFinished = true; }
  }

  matsOf(rig) {
    const out = [];
    rig.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material)) if (m.emissive) out.push(m);
    });
    return out;
  }

  reset() {
    this.playing = null;
    this.stageA.clearEffects();
    for (const x of this.extras) {
      x.alpha = 1;
      for (const p of [x.cat, x.sheep, x.pet, x.beast, x.ally]) if (p) { p.root.visible = false; p.current = null; p.mixer.stopAllAction(); }
      x.block.visible = x.shield.visible = x.ring.visible = false;
      x.shadow.visible = false;
      if (x.rune) { x.rune.visible = x.orb.visible = false; x.rune.userData.v = x.orb.userData.v = 0; }
    }
    for (const t of (this.trails || new Map()).values()) { t.mesh.visible = false; t.v = 0; t.pts.length = 0; }
    this.fx.stop = 0;
    this.anims = null;
    if (this.world) this.still();
    this.q('.banner3d').hidden = true;
    this.q('.banner3d').innerHTML = '';
    this.q('.castbar.a').textContent = '';
    this.q('.castbar.b').textContent = '';
    this.q('.gapline').textContent = '';
  }

  async hero(s) {
    this.reset();
    this.mode = 'hero';
    this.host.classList.remove('fighting');
    if (this.stageB.rig && this.stageB.rig.parent === this.stageA.scene) this.stageA.scene.remove(this.stageB.rig);
    await this.dressOne(this.stageA, s);
    const a = this.stageA;
    a.rig.visible = true;
    this.fade(a.rig, 1);
    a.dummy = null;
    if (a.shadow) a.shadow.visible = true;
    this.showWorld(false);
    a.reset();
    a.rig.visible = true;
  }

  wear(slot, id) {
    return this.stageA.wear(slot, id, this.pool.items[id]);
  }

  async stageFight(sides, names) {
    this.reset();
    this.mode = 'fight';
    this.names = names;
    this.host.classList.add('fighting');
    const { stageA: a, stageB: b } = this;
    a.scene.remove(b.rig);
    if (b.rig) b.scene.add(b.rig);
    await Promise.all([this.dressOne(a, sides[0]), this.dressOne(b, sides[1]), this.props]);
    await Promise.all(this.extras.map(async (x, i) => {
      if (x.ally) x.ally.root.removeFromParent();
      const model = boonsOf(sides[i].boons).map((n) => n.boon && n.boon.ally).find(Boolean);
      x.ally = model ? await this.prop(model.model) : null;
      x.allyBack = !!(model && model.ranged);
    }));
    await Promise.race([this.scenery.ready, new Promise((done) => { setTimeout(done, 6000); })]);
    a.scene.add(b.rig);
    this.ground = { mx: 0, mz: 0, th: Math.random() * Math.PI * 2, turn: Math.random() < .5 ? -1 : 1, gap: null, speed: [0, 0] };
    this.showWorld(true);
    a.fightOn = true;
    a.ring.visible = false;
    a.dummy = b.rig;
    if (a.shadow) a.shadow.visible = false;
    for (const st of [a, b]) { st.rig.visible = true; this.fade(st.rig, 1); }
    this.mats = [this.matsOf(a.rig), this.matsOf(b.rig)];
    this.kinds = sides.map((s) => PRESETS[s.cls].kind);
    this.two = sides.map((s) => s.picks.main && this.pool.items[s.picks.main] && this.pool.items[s.picks.main][3] === 17);
    this.classes = sides.map((s) => s.cls);
    this.place(30);
    a.pose('ready1h');
    b.pose('ready1h');
    a.view = CALM ? { ...a.want } : { x: -6, y: 7.5, z: 26, tx: 0, ty: 2.4 };
    for (const x of this.extras) { x.shadow.visible = true; x.shadow.material.opacity = .6; x.wasCat = undefined; x.dash = 0; x.yaw = undefined; }
  }

  place(d, dt = 0) {
    const aspect = this.stageA.camera.aspect, room = 2 * 11 * .268 * aspect - 1.7, gap = Math.max(1.65, Math.min(7, room, d / 30 * 6.4)), a = this.stageA.rig, b = this.stageB.rig, f = this.fx;
    a.position.set(-gap / 2 + f.lunge[0] * .3, 0, 0);
    b.position.set(gap / 2 - f.lunge[1] * .3, 0, 0);
    if (this.ground) this.roam(gap, dt);
    const z = Math.min(11, Math.max(7.4, (gap + 1.8) / 2 / .268 / aspect)), t = CALM ? 0 : performance.now() / 1000;
    this.fogNear.near = z + 22;
    this.fogNear.far = z + 80;
    this.stageA.want = { x: Math.sin(t * .21) * .22, y: 1.75 + Math.sin(t * .29) * .08, z: z + .2 + Math.sin(t * .17) * .15, tx: Math.sin(t * .21) * .08, ty: 1.35 };
  }

  roam(gap, dt) {
    const s = this.ground, mv = this.movers || [false, false], V = 4.2, ax = Math.cos(s.th), az = Math.sin(s.th);
    if (s.gap === null) s.gap = gap;
    const dg = gap - s.gap, before = [[s.mx - ax * s.gap / 2, s.mz - az * s.gap / 2], [s.mx + ax * s.gap / 2, s.mz + az * s.gap / 2]];
    s.gap = gap;
    const turn = (pivot, w) => {
      const c = Math.cos(w), n = Math.sin(w), ox = s.mx - pivot[0], oz = s.mz - pivot[1];
      return [pivot[0] + ox * c - oz * n, pivot[1] + ox * n + oz * c];
    };
    const pick = (pivot, w) => {
      if (Math.hypot(s.mx, s.mz) < 3) return s.turn * w;
      const [a, b] = [turn(pivot, w), turn(pivot, -w)];
      return Math.hypot(...a) <= Math.hypot(...b) ? w : -w;
    };
    if (dt > 0 && mv[0] !== mv[1]) {
      const k = mv[0] ? -.5 : .5, pivot = mv[0] ? [s.mx + ax * gap / 2, s.mz + az * gap / 2] : [s.mx - ax * gap / 2, s.mz - az * gap / 2];
      s.mx += ax * dg * k;
      s.mz += az * dg * k;
      const radial = Math.abs(dg) / dt, w = pick(pivot, Math.min(1.1, Math.sqrt(Math.max(0, V * V - radial * radial)) / Math.max(gap, 1.6)) * dt);
      [s.mx, s.mz] = turn(pivot, w);
      s.th += w;
    } else if (dt > 0 && mv[0] && mv[1]) {
      const way = this.flee === 0 ? -1 : 1;
      s.mx += ax * way * V * .9 * dt;
      s.mz += az * way * V * .9 * dt;
      const w = pick([s.mx, s.mz], .5 * dt);
      s.th += Math.hypot(s.mx, s.mz) > 3 ? w * 2.2 : w;
    }
    const far = Math.hypot(s.mx, s.mz);
    if (far > 7.5) { s.mx *= 1 - dt * .8; s.mz *= 1 - dt * .8; }
    if (Math.random() < dt * .05) s.turn *= -1;
    const bx = Math.cos(s.th), bz = Math.sin(s.th), after = [[s.mx - bx * gap / 2, s.mz - bz * gap / 2], [s.mx + bx * gap / 2, s.mz + bz * gap / 2]];
    s.speed = after.map((p, i) => (dt > 0 ? Math.hypot(p[0] - before[i][0], p[1] - before[i][1]) / Math.max(dt, .016) : 0));
    const up = new THREE.Vector3(0, 1, 0);
    s.dir = after.map((p, i) => { const m = new THREE.Vector3(p[0] - before[i][0], 0, p[1] - before[i][1]).applyAxisAngle(up, s.th); return Math.atan2(m.x, m.z); });
    const v = new THREE.Vector3(s.mx, 0, s.mz).applyAxisAngle(up, s.th);
    this.world.rotation.y = s.th;
    this.world.position.set(-v.x, 0, -v.z);
  }

  still() {
    this.world.rotation.y = 0;
    this.world.position.set(0, 0, 0);
    this.ground = null;
  }

  frame(i, f, name) {
    const el = this.q(`.uframe[data-f="${i}"]`), hp = Math.max(0, f.hp) / f.max * 100, res = f.resMax ? f.res / f.resMax * 100 : 0, cls = this.classes[i];
    const tone = { mana: '#2f6fe0', rage: '#c8352a', energy: '#e6c837' }[f.resKind];
    if (!el.firstChild) el.innerHTML = `<div class="portrait3d"><img alt=""></div><div class="ubody"><div class="uname"></div><div class="ubar hp"><i></i><b></b></div><div class="ubar res"><i></i></div><div class="ustate"></div></div>`;
    el.querySelector('img').src = `assets/classes/${cls}.png`;
    el.querySelector('.uname').textContent = name;
    el.querySelector('.hp i').style.width = `${hp}%`;
    el.querySelector('.hp i').style.background = hp < 25 ? 'linear-gradient(#ff6a4a,#a01d10)' : '';
    el.querySelector('.hp b').textContent = `${Math.max(0, f.hp)} / ${f.max}`;
    const r = el.querySelector('.res i');
    r.style.width = `${res}%`;
    r.style.background = tone;
    el.querySelector('.ustate').textContent = STATE[f.state] || '';
  }

  plate(i, f, name) {
    const el = this.q(`.plate[data-p="${i}"]`), rig = i ? this.stageB.rig : this.stageA.rig, v = new THREE.Vector3(rig.position.x, f.cat ? 1.5 : 2.45, 0).project(this.stageA.camera);
    el.style.transform = `translate(-50%,-100%) translate(${(v.x + 1) / 2 * this.host.clientWidth}px,${(1 - v.y) / 2 * this.host.clientHeight}px)`;
    el.innerHTML = `<span>${name}</span><em style="width:${Math.max(0, f.hp) / f.max * 100}%"></em>`;
    el.style.opacity = f.state === 'stealth' ? .4 : 1;
  }

  whoMoves(f, prev) {
    const dd = prev ? f.d - prev.d : 0, kinds = this.kinds, can = [f.a, f.b].map((x) => x.hp > 0 && !x.cast && !['stun', 'poly', 'root'].includes(x.state));
    const out = [f.a.state === 'fear', f.b.state === 'fear'];
    this.flee = out[0] ? 0 : out[1] ? 1 : null;
    if (Math.abs(dd) > .1 && (f.d > 5 || prev.d > 5)) {
      const want = dd < 0 ? [kinds[0] === 'melee', kinds[1] === 'melee'] : [kinds[0] !== 'melee', kinds[1] !== 'melee'];
      const pick = want[0] || want[1] ? want : [true, true];
      for (const i of [0, 1]) if (pick[i] && can[i]) out[i] = true;
      if (!out[0] && !out[1]) for (const i of [0, 1]) if (can[i]) out[i] = true;
      if (dd > 0 && this.flee === null) this.flee = out[0] && !out[1] ? 0 : out[1] && !out[0] ? 1 : kinds[0] !== 'melee' ? 0 : 1;
    }
    return out;
  }

  animOf(f, prev, kind, d, dead, moving) {
    if (dead) return 'dead';
    if (f.state === 'stun' || f.state === 'poly') return 'stun';
    if (f.state === 'fear') return 'run';
    if (f.cast) return 'cast';
    if (moving) return 'run';
    if (kind === 'melee' && d <= 5) return 'attack';
    return 'idle';
  }

  pose(stage, name, kind, two, i) {
    if (name === 'dead') return stage.pose('death', 1);
    if (name === 'stun') return stage.pose('stun', 1);
    if (name === 'run') return stage.pose('run', 1.3);
    if (name === 'cast') return stage.pose('castdirected', 1.2);
    if (this.fx.wound[i] > 0 && name !== 'attack') return stage.pose('wound', 1.4);
    if (name === 'attack') return stage.pose(two ? 'attack2h' : 'attack1h', 1.8);
    return stage.pose(kind === 'ranged' ? 'attackbow' : two ? 'ready2h' : 'ready1h', 1);
  }

  dress3d(i, f, foe, stage, name, dt, t) {
    const x = this.extras[i], rig = stage.rig, here = rig.position, dir = i ? -1 : 1, cls = this.classes[i], form = x.cat && f.cat, sheep = x.sheep && f.sheep;
    const face = dir * Math.PI / 2 + (f.state === 'fear' ? Math.PI : 0), g = this.ground, goal = name === 'run' && g && g.speed[i] > 1.2 ? g.dir[i] : face;
    x.yaw = x.yaw === undefined ? goal : x.yaw + Math.atan2(Math.sin(goal - x.yaw), Math.cos(goal - x.yaw)) * Math.min(1, dt * 10);
    rig.rotation.y = x.yaw;
    rig.visible = !form && !sheep;
    x.shadow.position.x = here.x;
    for (const [p, show] of [[x.cat, form], [x.sheep, sheep]]) {
      if (!p) continue;
      p.root.visible = !!show;
      if (!show) continue;
      p.root.position.set(here.x, 0, 0);
      p.root.rotation.y = rig.rotation.y;
      p.mixer.update(dt);
      this.act(p, p === x.sheep ? 'idle' : ACT[name], name === 'attack' ? 1.6 : 1);
    }
    const want = f.state === 'stealth' ? .3 : 1;
    if (want !== x.alpha) {
      x.alpha = want;
      this.fade(rig, want);
      if (x.cat) this.fade(x.cat.root, want);
    }
    const isCat = !!f.cat;
    if (x.wasCat !== undefined && x.wasCat !== isCat && f.hp > 0) this.shift(here.x, isCat);
    x.wasCat = isCat;
    const magic = !!f.cast && !!f.school && f.school !== 'phys' && f.hp > 0;
    this.glyph(x.rune, magic, TONE[f.school] || 0xffffff, here.x, 0, 1, dt);
    this.glyph(x.orb, magic, TONE[f.school] || 0xffffff, here.x + .5 * dir, .15, .55, dt);
    x.orb.position.y = 1.45 + Math.sin(performance.now() / 120) * .03;
    const speed = this.ground ? this.ground.speed[i] : 0, away = f.state === 'fear' ? -dir : dir;
    x.dust -= dt;
    x.dash = Math.max(0, x.dash - dt);
    if (x.dust <= 0 && f.hp > 0 && (name === 'run' || speed > 2.5 || x.dash > 0) && !sheep) {
      const fast = speed > 7 || x.dash > 0;
      x.dust = fast ? .03 : .14;
      this.stageA.spark(here.x - away * .25, .15, (Math.random() - .5) * .5, { dust: 1, color: DUST, size: fast ? .75 : .45, life: .7, vy: .3, vx: -away * (fast ? 1.4 : .4), grow: 1.7, opacity: fast ? .42 : .26 });
      if (fast) this.stageA.spark(here.x - away * .4, .9 + Math.random() * .8, (Math.random() - .5) * .3, { color: 0xfff2d0, size: .25, life: .2, vx: -away * 6, grow: -.5, opacity: .6 });
    }
    x.block.visible = f.state === 'block';
    x.block.material.color.setHex(cls === 'PALADIN' ? 0xffd76a : 0x9fd8ff);
    x.block.position.set(here.x, 1.15, 0);
    x.shield.visible = !!f.shield && f.hp > 0;
    x.shield.position.set(here.x, 1.15, 0);
    x.ring.visible = f.state === 'root';
    x.ring.position.set(here.x, .03, 0);
    x.tick -= dt;
    if (x.tick <= 0) {
      x.tick = .12;
      const a = this.stageA;
      if (f.state === 'stun') { const n = performance.now() / 180; a.spark(here.x + Math.cos(n) * .4, 2.35, Math.sin(n) * .4, { color: 0xffe08a, size: .22, life: .35, star: 1, grow: -.3 }); }
      if (f.state === 'fear') a.spark(here.x + (Math.random() - .5) * .5, 2.2, .1, { color: 0x9a5cff, size: .3, life: .5, vy: .5, grow: .3, opacity: .7 });
      if (f.cast && f.school && f.school !== 'phys') a.spark(here.x + .55 * dir + (Math.random() - .5) * .2, 1.45 + (Math.random() - .5) * .3, .15, { color: TONE[f.school] || 0xffffff, size: .24, life: .3, vy: .4, grow: -.4 });
    }
    for (const [pet, owner] of [[x.pet, 'WARLOCK'], [x.beast, 'HUNTER'], [x.ally, cls]]) {
      if (!pet) continue;
      const up = cls === owner && f.hp > 0 && foe.hp > 0 && !f.petSheep;
      pet.root.visible = up;
      if (up) {
        const near = t >= 4, them = (i ? this.stageA : this.stageB).rig.position, back = pet === x.ally && x.allyBack, goal = near && !back ? them.x - dir * 1.1 : here.x + dir * (back ? -.7 : .3), r = pet.root;
        r.position.x += (goal - r.position.x) * Math.min(1, dt * 3);
        r.position.z = -1;
        r.rotation.y = Math.atan2(them.x - r.position.x, 1);
        pet.mixer.update(dt);
        this.act(pet, Math.abs(goal - r.position.x) > .25 ? 'run' : near ? (back ? 'cast' : 'attack') : 'idle', 1.4);
      }
    }
  }

  float(i, e) {
    if (this.playing && this.playing.t >= 1e4) return;
    const rig = i ? this.stageB.rig : this.stageA.rig, v = new THREE.Vector3(rig.position.x, 2.2, 0).project(this.stageA.camera), n = document.createElement('span');
    n.className = 'dmg' + (e.crit ? ' crit' : '') + (e.type === 'heal' ? ' heal' : '');
    n.style.left = `${(v.x + 1) / 2 * 100 + (Math.random() * 7 - 3.5)}%`;
    n.style.top = `${(1 - v.y) / 2 * 100}%`;
    n.style.color = e.type === 'heal' ? '#5dff7a' : e.crit ? '#ffd85a' : SCHOOL[e.school] || '#fff';
    n.style.setProperty('--dx', `${Math.round((Math.random() - .5) * 50)}px`);
    n.textContent = e.type === 'heal' ? `+${e.amount}` : e.amount ? e.amount : { miss: 'Miss', dodge: 'Dodge', parry: 'Parry', resist: 'Resist' }[e.type] || e.name;
    this.host.append(n);
    setTimeout(() => n.remove(), 1000);
  }

  fire(e) {
    const a = e.side === 0, A = this.stageA, me = a ? A.rig : this.stageB.rig, them = a ? this.stageB.rig : A.rig, kind = this.kinds[e.side];
    const keep = [A.rig, A.dummy];
    A.rig = me;
    A.dummy = them;
    A.kind = kind;
    A.face = a ? 1 : -1;
    if (e.amount || e.name === 'Concussive Shot') A.hit(e.school || 'phys', e.name === 'Felhunter', e.name, e.crit);
    [A.rig, A.dummy] = keep;
    A.face = 1;
    A.shake = 0;
    const victim = a ? 1 : 0;
    if (e.amount) {
      this.fx.flash[victim] = e.crit ? 1 : .6;
      this.fx.wound[victim] = .25;
      if (e.crit) this.fx.shake = Math.max(this.fx.shake, .5);
      if (kind === 'melee') this.fx.lunge[e.side] = 1;
      if (e.crit) this.punch(.45);
    }
  }

  rigOf(side) {
    return (side ? this.stageB : this.stageA).rig;
  }

  burst(x, color, n = 14, power = 1, y = 1.2) {
    const a = this.stageA;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, v = (1 + Math.random() * 2) * power;
      a.spark(x, y + (Math.random() - .5) * .6, (Math.random() - .5) * .4, { color, size: .14 + Math.random() * .16, life: .45 + Math.random() * .35, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v * .7 + .6, vz: (Math.random() - .5) * v * .5, fall: 2, star: i % 3 === 0, grow: -.4, opacity: .9 });
    }
    a.spark(x, y, .1, { color, size: 1.4 * power, life: .3, grow: .8, opacity: .55 });
  }

  column(x, color, n = 12) {
    const a = this.stageA;
    for (let i = 0; i < n; i++) {
      const ang = i / n * Math.PI * 2;
      a.spark(x + Math.cos(ang) * .45, .1 + Math.random() * .3, Math.sin(ang) * .3, { color, size: .2 + Math.random() * .12, life: .8 + Math.random() * .4, vy: 1.6 + Math.random(), vx: -Math.cos(ang) * .15, grow: -.3, opacity: .85, star: i % 4 === 0 });
    }
    this.shock(x, 0, color, .55, .5);
  }

  shift(x, cat) {
    this.burst(x, cat ? 0x8dff7a : 0xfff0c0, 18, 1.1, 1);
    this.puff(x, 0, 10, .9);
    this.shock(x, 0, 0x8dff7a, .7, .5);
  }

  cue(e) {
    if (this.playing && this.playing.t >= 1e4) return;
    const x = this.rigOf(e.side).position.x, foe = this.rigOf(1 - e.side).position.x, side = this.extras[e.side];
    if (e.type === 'move' && e.name === 'Blink') {
      this.burst(x, 0xc8a6ff, 20, 1.2);
      this.shock(x, 0, 0xc8a6ff, .7, .4);
      setTimeout(() => { const now = this.rigOf(e.side).position.x; this.burst(now, 0xe6d6ff, 16, .9); this.shock(now, 0, 0xc8a6ff, .6, .4); }, 260);
    } else if (e.type === 'move') {
      side.dash = .45;
      this.shock(foe, 0, 0xffe2b0, .8, .5);
    } else if (e.type === 'heal' && !/Elune|Banshee/.test(e.name || '')) this.column(x, e.name && /Drain|Siphon|Life Tap/.test(e.name) ? 0xb18cff : 0x8dff9a, e.amount > 400 ? 16 : 9);
    else if (e.type === 'cc') {
      const tone = { fear: 0x9a5cff, poly: 0xff9ad8, stun: 0xffe08a, root: 0x8fd8ff }[e.name];
      if (tone) { this.burst(x, tone, 16, 1, 1.6); this.shock(x, 0, tone, .6, .45); }
    } else if (e.type === 'trinket') { this.burst(x, 0xffffff, 22, 1.3); this.column(x, 0xfff4d0, 10); }
    else if (e.type === 'interrupt') this.burst(foe, 0xff5a3a, 12, .9, 1.5);
    else if (e.type === 'buff') { this.burst(x, 0xffd77a, 10, .7, 1.1); this.shock(x, 0, 0xffd77a, .45, .4); }
  }

  punch(power) {
    if (CALM || (this.playing && this.playing.t >= 1e4)) return;
    this.fx.stop = Math.max(this.fx.stop || 0, .07 * power / .45);
    this.stageA.view.z -= power;
  }

  banner(html, klass = '') {
    const b = this.q('.banner3d');
    b.className = `banner3d ${klass}`;
    b.innerHTML = html;
    b.hidden = false;
  }

  play(rec, x, { onLine, onEnd }) {
    const run = { t: 0, at: 0, rec, x, slow: 1 };
    this.q('.banner3d').hidden = true;
    this.playing = run;
    this.onLine = onLine;
    this.onEnd = onEnd;
  }

  skip() {
    if (this.playing) this.playing.t = 1e4;
  }

  step(dt) {
    const run = this.playing, { rec, x } = run, names = this.names;
    const remaining = rec.frames[rec.frames.length - 1].t - run.t;
    run.t += dt * this.speed * (remaining < 1 ? .35 : 1);
    const last = rec.frames.length - 1, i = Math.min(last, Math.floor(run.t / .2)), f = rec.frames[i], prev = rec.frames[Math.max(0, i - 2)], end = i >= last, next = rec.frames[Math.min(last, i + 1)];
    const k = next.t > f.t ? Math.max(0, Math.min(1, (run.t - f.t) / (next.t - f.t))) : 0;
    this.place(f.d + (next.d - f.d) * k, dt);
    this.frame(0, f.a, names[0]);
    this.frame(1, f.b, names[1]);
    this.plate(0, f.a, names[0]);
    this.plate(1, f.b, names[1]);
    this.q('.castbar.a').textContent = f.a.cast;
    this.q('.castbar.b').textContent = f.b.cast;
    this.q('.gapline').textContent = `${Math.round(f.d)} yards`;
    const mv = this.whoMoves(f, prev);
    const animA = this.animOf(f.a, prev, this.kinds[0], f.d, end && x.winner === 1, mv[0]), animB = this.animOf(f.b, prev, this.kinds[1], f.d, end && x.winner === 0, mv[1]);
    this.movers = [animA === 'run', animB === 'run'];
    this.anims = [animA, animB];
    this.pose(this.stageA, animA, this.kinds[0], this.two[0], 0);
    this.pose(this.stageB, animB, this.kinds[1], this.two[1], 1);
    this.dress3d(0, f.a, f.b, this.stageA, animA, dt, f.t);
    this.dress3d(1, f.b, f.a, this.stageB, animB, dt, f.t);
    while (run.at < rec.events.length && rec.events[run.at].t <= run.t) {
      const e = rec.events[run.at++];
      if (['hit', 'heal', 'miss', 'dodge', 'parry', 'resist'].includes(e.type)) this.float(e.type === 'heal' ? e.side : 1 - e.side, e);
      if (e.type === 'hit') this.fire(e);
      this.cue(e);
      if (this.onLine) this.onLine(e);
    }
    if (end) {
      this.playing = null;
      const win = x.winner, rig = (win ? this.stageB : this.stageA).rig, fallen = (win ? this.stageA : this.stageB).rig.position.x;
      this.stageA.want = { x: rig.position.x, y: 1.5, z: 5.2, tx: rig.position.x, ty: 1.2 };
      for (const e of this.extras) { e.rune.visible = e.orb.visible = false; e.rune.userData.v = e.orb.userData.v = 0; }
      setTimeout(() => { if (this.mode === 'fight') { this.puff(fallen, 0, 14, 1.2); this.shock(fallen, 0, 0xffd8a0, .8, .6); } }, 650);
      if (this.onEnd) setTimeout(() => this.onEnd(x), 700);
    }
  }

  watch(dt) {
    const p = this.perf;
    if (this.mode !== 'fight' || document.hidden || this.quality <= 0) return;
    if (p.skip > 0) { p.skip--; return; }
    if (dt > .09) return;
    p.n++;
    p.sum += dt;
    if (p.n < 150) return;
    const slow = p.sum / p.n > 1 / 36;
    this.perf = { n: 0, sum: 0, skip: 30 };
    if (!slow) return;
    this.quality--;
    const r = this.stageA.renderer;
    if (this.quality === 1) { r.setPixelRatio(1); this.stageA.resize(); }
  }

  loop() {
    const now = performance.now(), real = Math.min(.1, (now - this.last) / 1000), f = this.fx;
    this.last = now;
    requestAnimationFrame(() => this.loop());
    f.stop = Math.max(0, (f.stop || 0) - real);
    this.scale = f.stop > 0 ? .06 : 1;
    this.stageA.timeScale = this.scale;
    const dt = real * this.scale;
    if (this.stageB.mixer && this.mode === 'fight') this.stageB.mixer.update(dt);
    if (this.world.visible) { this.scenery.update(real, now); this.watch(real); }
    for (const i of [0, 1]) {
      f.lunge[i] = Math.max(0, f.lunge[i] - dt * 6);
      f.wound[i] = Math.max(0, f.wound[i] - dt);
      if (f.flash[i] > 0) {
        f.flash[i] = Math.max(0, f.flash[i] - dt * 5);
        for (const m of this.mats[i]) { m.emissive.setRGB(f.flash[i] * .5, f.flash[i] * .08, f.flash[i] * .05); }
      }
    }
    if (this.playing) this.step(dt);
    if (f.shake > 0) {
      f.shake = Math.max(0, f.shake - dt * 2.4);
      this.stageA.view.x += (Math.random() - .5) * f.shake * .18;
      this.stageA.view.y += (Math.random() - .5) * f.shake * .12;
    }
  }
}
