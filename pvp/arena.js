import * as THREE from 'three';
import { Stage } from '../draft/stage.js';
import { PRESETS } from './engine.js';
import { SLOTS } from './gear.js';

const SCHOOL = { fire: '#ff8a3c', frost: '#8fd0ff', arcane: '#d59bff', shadow: '#b18cff', nature: '#7dff8a', holy: '#ffe680', phys: '#ffffff' };
const TONE = { fire: 0xff7a2a, frost: 0x7fd4ff, arcane: 0xd27dff, shadow: 0x9a5cff, nature: 0x7dff8a, holy: 0xffe680 };
const STATE = { stun: 'Stunned', fear: 'Feared', poly: 'Disoriented', root: 'Rooted', block: 'Immune', stealth: 'Stealthed' };
const PROP_SIZE = { druidcat: .55, sheep: .7, felhound: .42, cat: .5, whelp: .7, skeleton: 1, eskhandar: .55 };
const ACT = { dead: 'death', stun: 'stun', run: 'run', cast: 'idle', attack: 'attack', idle: 'idle' };
export const THEMES = [
  { name: 'The Gurubashi Arena', floor: 'terrain_sand', wall: 'terrain_rock', fog: 0x2a1a0c, light: 0xffc27a },
  { name: 'Ring of Valor', floor: 'stone', wall: 'stone', fog: 0x141016, light: 0xff9d5c },
  { name: 'The Crossroads', floor: 'terrain_dirt', wall: 'terrain_rock', fog: 0x1e1610, light: 0xffb36b },
  { name: 'Elwynn Glade', floor: 'terrain_grass', wall: 'terrain_rock', fog: 0x0c1610, light: 0xbfe0a0 },
];

function tileTexture(name, repeat) {
  const t = new THREE.TextureLoader().load(`assets/draft/arena/${name}.png`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

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
    this.extras = [0, 1].map(() => ({ block: this.ball(0x9fd8ff, 1, .22), shield: this.ball(0xffe9a8, .95, .1), ring: this.rootRing(), shadow: this.blob(), alpha: 1, tick: 0 }));
    this.props = Promise.all(this.extras.flatMap((x) => [['cat', 'druidcat'], ['sheep', 'sheep'], ['pet', 'felhound'], ['beast', 'cat']].map(async ([key, file]) => { x[key] = await this.prop(file); })));
    requestAnimationFrame(() => this.loop());
  }

  buildWorld() {
    const s = new THREE.Group();
    this.stageA.scene.add(s);
    this.world = s;
    this.backColor = new THREE.Color(0x0b0806);
    this.fogNear = new THREE.Fog(0x0b0806, 15, 34);
    this.floor = new THREE.Mesh(new THREE.CircleGeometry(19, 64), new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 }));
    this.floor.rotation.x = -Math.PI / 2;
    s.add(this.floor);
    this.wall = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 9, 64, 1, true), new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.BackSide }));
    this.wall.position.y = 4.5;
    s.add(this.wall);
    this.torches = [];
    const trim = new THREE.MeshStandardMaterial({ color: 0x3b2a1a, roughness: .9 });
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + .3, x = Math.cos(a) * 17.6, z = Math.sin(a) * 17.6;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.55, .75, 7.5, 12), trim);
      pillar.position.set(x, 3.75, z);
      s.add(pillar);
      const light = new THREE.PointLight(0xffa050, 26, 15, 1.8);
      light.position.set(x * .93, 4.2, z * .93);
      s.add(light);
      this.torches.push({ light, x: x * .93, z: z * .93, seed: Math.random() * 10 });
    }
    this.moon = new THREE.PointLight(0xffd8a0, 40, 24, 1.6);
    this.moon.position.set(0, 8, 3);
    s.add(this.moon);
    const n = 90, pos = new Float32Array(n * 3);
    this.moteSeed = [];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - .5) * 22;
      pos[i * 3 + 1] = Math.random() * 6;
      pos[i * 3 + 2] = (Math.random() - .6) * 14;
      this.moteSeed.push(Math.random() * 6.28);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.motes = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffc27a, size: .055, transparent: true, opacity: .65, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.add(this.motes);
    this.theme(THEMES[1]);
  }

  theme(t) {
    this.floor.material.map = tileTexture(t.floor, [16, 16]);
    this.floor.material.needsUpdate = true;
    this.wall.material.map = tileTexture(t.wall, [28, 3]);
    this.wall.material.needsUpdate = true;
    this.backColor.setHex(t.fog);
    this.fogNear.color.setHex(t.fog);
    for (const x of this.torches || []) x.light.color.setHex(t.light);
  }

  showWorld(on) {
    const s = this.stageA.scene;
    this.world.visible = on;
    s.background = on ? this.backColor : null;
    s.fog = on ? this.fogNear : null;
    this.q('.vignette').hidden = !on;
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
    }
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
    a.scene.add(b.rig);
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
    a.want = { x: 0, y: 2.1, z: 15, tx: 0, ty: 1.3 };
    a.view = { ...a.want };
    for (const x of this.extras) x.shadow.visible = true;
  }

  place(d) {
    const aspect = this.stageA.camera.aspect, room = 2 * 11 * .268 * aspect - 1.7, gap = Math.max(1.3, Math.min(7, room, d / 30 * 6.4)), a = this.stageA.rig, b = this.stageB.rig, f = this.fx;
    a.position.set(-gap / 2 + f.lunge[0] * .3, 0, 0);
    b.position.set(gap / 2 - f.lunge[1] * .3, 0, 0);
    const z = Math.min(11, Math.max(7.4, (gap + 1.8) / 2 / .268 / aspect));
    this.stageA.want = { x: 0, y: 1.7, z, tx: 0, ty: 1.35 };
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

  animOf(f, prev, kind, d, dead) {
    if (dead) return 'dead';
    if (f.state === 'stun' || f.state === 'poly') return 'stun';
    if (f.state === 'fear') return 'run';
    if (f.cast) return 'cast';
    if (prev && Math.abs(prev.d - d) > .1 && d > 5) return 'run';
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
    rig.rotation.y = dir * Math.PI / 2 + (f.state === 'fear' ? Math.PI : 0);
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
    }
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
    const i = Math.min(rec.frames.length - 1, Math.floor(run.t / .2)), f = rec.frames[i], prev = rec.frames[Math.max(0, i - 2)], end = i >= rec.frames.length - 1;
    this.place(f.d);
    this.frame(0, f.a, names[0]);
    this.frame(1, f.b, names[1]);
    this.plate(0, f.a, names[0]);
    this.plate(1, f.b, names[1]);
    this.q('.castbar.a').textContent = f.a.cast;
    this.q('.castbar.b').textContent = f.b.cast;
    this.q('.gapline').textContent = `${Math.round(f.d)} yards`;
    const animA = this.animOf(f.a, prev, this.kinds[0], f.d, end && x.winner === 1), animB = this.animOf(f.b, prev, this.kinds[1], f.d, end && x.winner === 0);
    this.pose(this.stageA, animA, this.kinds[0], this.two[0], 0);
    this.pose(this.stageB, animB, this.kinds[1], this.two[1], 1);
    this.dress3d(0, f.a, f.b, this.stageA, animA, dt, f.t);
    this.dress3d(1, f.b, f.a, this.stageB, animB, dt, f.t);
    while (run.at < rec.events.length && rec.events[run.at].t <= run.t) {
      const e = rec.events[run.at++];
      if (['hit', 'heal', 'miss', 'dodge', 'parry', 'resist'].includes(e.type)) this.float(e.type === 'heal' ? e.side : 1 - e.side, e);
      if (e.type === 'hit') this.fire(e);
      if (this.onLine) this.onLine(e);
    }
    if (end) {
      this.playing = null;
      const win = x.winner, rig = (win ? this.stageB : this.stageA).rig;
      this.stageA.want = { x: rig.position.x, y: 1.5, z: 5.2, tx: rig.position.x, ty: 1.2 };
      if (this.onEnd) setTimeout(() => this.onEnd(x), 700);
    }
  }

  loop() {
    const now = performance.now(), dt = Math.min(.1, (now - this.last) / 1000);
    this.last = now;
    requestAnimationFrame(() => this.loop());
    if (this.stageB.mixer && this.mode === 'fight') this.stageB.mixer.update(dt);
    for (const x of this.torches || []) x.light.intensity = 22 + Math.sin(now / 90 + x.seed) * 5 + Math.sin(now / 37 + x.seed) * 3;
    if (this.motes) {
      const p = this.motes.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) + dt * .22;
        if (y > 6) y = 0;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(now / 1400 + this.moteSeed[i]) * dt * .15);
      }
      p.needsUpdate = true;
    }
    const f = this.fx;
    for (const i of [0, 1]) {
      f.lunge[i] = Math.max(0, f.lunge[i] - dt * 6);
      f.wound[i] = Math.max(0, f.wound[i] - dt);
      if (f.flash[i] > 0) {
        f.flash[i] = Math.max(0, f.flash[i] - dt * 5);
        for (const m of this.mats[i]) { m.emissive.setRGB(f.flash[i], f.flash[i] * .15, f.flash[i] * .1); }
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
