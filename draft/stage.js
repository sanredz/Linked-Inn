import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ROOT = 'assets/draft/';
const RACE = { WARRIOR: 'human', PALADIN: 'human', HUNTER: 'orc', ROGUE: 'human', PRIEST: 'human', SHAMAN: 'orc', MAGE: 'human', WARLOCK: 'human', DRUID: 'nightelf' };
const REGION = {
  arm_upper: [0, 0, 128, 64], arm_lower: [0, 64, 128, 64], hand: [0, 128, 128, 32], torso_upper: [128, 0, 128, 64], torso_lower: [128, 64, 128, 32],
  leg_upper: [128, 96, 128, 64], leg_lower: [128, 160, 128, 64], foot: [128, 224, 128, 32],
};
const PAINT = ['legs', 'feet', 'chest', 'wrist', 'waist', 'hands'];
const HAIR = 6;
const STOW = .62;
const REST = { x: 0, y: 1.02, z: 5.7, tx: 0, ty: .98 };
const DUMMY_HEIGHT = 2.15;
const HOLD = 1500;
const MINION = {
  whelp: { melee: 1, x: -.75, y: .9, z: -1.4, scale: .7, clip: 'cast', speed: 1 },
  skeleton: { melee: 1, x: -.8, z: .8, scale: .9, clip: 'attack', speed: 2.2 },
  eskhandar: { melee: 1, x: -1, z: -.6, scale: .7, clip: 'attack', speed: 2.2, ghost: .6 },
  shahram: { x: .5, z: -1.6, scale: .75, clip: 'cast', speed: 1 },
  cat: { melee: 1, x: -1.25, z: .65, scale: .7, clip: 'attack', speed: 2 },
};
const LIMIT = 340;
const PAL = {
  fire: [0xff6a1a, 0xffe2a0], frost: [0x58b8ff, 0xe4f6ff], arcane: [0xc266ff, 0xf4dcff], shadow: [0x7a3cff, 0xd9c4ff], nature: [0x46e860, 0xdcffd8],
  holy: [0xffc94a, 0xfff6cf], moon: [0x8fb4ff, 0xf0f5ff], fel: [0x5de08a, 0xe2ffe6], phys: [0xfff0d0, 0xffffff], arrow: [0xfff0c0, 0xffffff],
};
const LOOK = {
  Fireball: { fx: 'bolt', pal: 'fire', size: .36, speed: 9, lift: .15, trail: 3, hit: 1 },
  Incinerate: { fx: 'bolt', pal: 'fire', size: .22, speed: 15, trail: 2, hit: .7 },
  'Lava Burst': { fx: 'bolt', pal: 'fire', size: .46, speed: 8, lift: .9, trail: 4, hit: 1.4 },
  'Shadow Bolt': { fx: 'bolt', pal: 'shadow', size: .32, speed: 9, lift: .1, trail: 3, hit: 1 },
  'Arcane Blast': { fx: 'bolt', pal: 'arcane', size: .3, speed: 13, trail: 2, hit: 1.1 },
  'Arcane Shot': { fx: 'bolt', pal: 'arcane', size: .16, speed: 20, trail: 2, hit: .6 },
  Wand: { fx: 'bolt', pal: 'arcane', size: .13, speed: 15, trail: 1, hit: .4 },
  Frostbolt: { fx: 'shard', pal: 'frost', size: .36, speed: 11, trail: 3, hit: 1.1 },
  'Auto Shot': { fx: 'arrow', pal: 'arrow', speed: 24, size: 1, hit: .3 },
  'Aimed Shot': { fx: 'arrow', pal: 'holy', speed: 26, size: 1.5, trail: 3, hit: .9 },
  'Lightning Bolt': { fx: 'lightning', pal: 'frost', width: .05, hit: .9 },
  'Lightning Overload': { fx: 'lightning', pal: 'frost', width: .028, hit: .5 },
  'Mind Flay': { fx: 'tether', pal: 'shadow', width: .09, hit: .4 },
  Moonfire: { fx: 'beam', pal: 'moon', width: .55, hit: .8 },
  Starfire: { fx: 'beam', pal: 'holy', width: 1, hit: 1.3 },
  Judgement: { fx: 'beam', pal: 'holy', width: .6, hit: 1 },
  'Fire Blast': { fx: 'blast', pal: 'fire', hit: 1.1 },
  Conflagrate: { fx: 'blast', pal: 'fire', hit: 1.5 },
  Shadowburn: { fx: 'blast', pal: 'shadow', hit: 1.3 },
  'Mind Blast': { fx: 'blast', pal: 'shadow', hit: 1.2, ring: 1 },
  'Holy Shock': { fx: 'blast', pal: 'holy', hit: 1.2 },
  Consecration: { fx: 'ground', pal: 'holy' },
  'Summon Hawk': { fx: 'dive', pal: 'holy', hit: .7 },
  Corruption: { fx: 'wisp', pal: 'shadow' }, 'Bane of Agony': { fx: 'wisp', pal: 'shadow' }, 'Shadow Word: Pain': { fx: 'wisp', pal: 'shadow' },
  'Siphon Life': { fx: 'wisp', pal: 'fel' }, 'Serpent Sting': { fx: 'wisp', pal: 'nature' }, Ignite: { fx: 'wisp', pal: 'fire' },
  Immolate: { fx: 'wisp', pal: 'fire' }, 'Flame Shock': { fx: 'wisp', pal: 'fire' },
};

function glowTexture(draw) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const softGlow = (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(.25, 'rgba(255,255,255,.75)');
  r.addColorStop(.6, 'rgba(255,255,255,.18)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
};
const softColumn = (g) => {
  const r = g.createLinearGradient(0, 0, 64, 0);
  r.addColorStop(0, 'rgba(255,255,255,0)');
  r.addColorStop(.5, 'rgba(255,255,255,1)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
};
const starGlow = (g) => {
  g.fillStyle = '#fff';
  g.translate(32, 32);
  for (let i = 0; i < 4; i++) {
    g.rotate(Math.PI / 2);
    g.beginPath();
    g.moveTo(-4, 0);
    g.lineTo(0, 30);
    g.lineTo(4, 0);
    g.fill();
  }
  g.globalCompositeOperation = 'lighter';
  g.translate(-32, -32);
  softGlow(g);
};
const additive = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const NAKED = { 4: 1, 5: 1, 7: 2, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 15: 1 };

const images = new Map();
function image(url) {
  if (!images.has(url)) {
    images.set(url, new Promise((ok) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ok(null);
      i.src = url;
    }));
  }
  return images.get(url);
}

export class Stage {
  constructor(canvas, gear) {
    this.canvas = canvas;
    this.gear = gear;
    this.loader = new GLTFLoader();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
    this.clock = new THREE.Clock();
    this.scene.add(new THREE.HemisphereLight(0xfff0d8, 0x34281c, 2.1));
    const key = new THREE.DirectionalLight(0xfff2dc, 2.4);
    key.position.set(2, 4, 4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffb060, 1.2);
    rim.position.set(-3, 2, -3);
    this.scene.add(rim);
    const shade = document.createElement('canvas');
    shade.width = shade.height = 256;
    const sc = shade.getContext('2d'), grad = sc.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, 'rgba(0,0,0,.62)');
    grad.addColorStop(.55, 'rgba(0,0,0,.34)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sc.fillStyle = grad;
    sc.fillRect(0, 0, 256, 256);
    const floor = this.shadow = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shade), transparent: true, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(.72, .76, 64), new THREE.MeshBasicMaterial({ color: 0xf8d36b, transparent: true, opacity: .4, side: THREE.DoubleSide }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = .01;
    this.scene.add(this.ring);
    this.fx = [];
    this.parts = [];
    this.spares = [];
    this.minions = {};
    this.view = { ...REST };
    this.want = { ...REST };
    this.mixer = null;
    this.spin = 0;
    this.fightOn = false;
    this.yaw = 0;
    canvas.addEventListener('pointerdown', (e) => { this.drag = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (this.drag == null) return; this.yaw += (e.clientX - this.drag) * .012; this.drag = e.clientX; });
    const end = () => { this.drag = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement);
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  resize() {
    const p = this.canvas.parentElement, w = p.clientWidth || 1, h = p.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  async setClass(cls, body) {
    this.real = false;
    const race = (body && this.gear.rigs[body] && body) || RACE[cls], rig = this.gear.rigs[race];
    if (this.rig && this.race === race) {
      this.yaw = 0;
      await this.strip();
      this.pose('idle');
      return;
    }
    if (this.rig) this.scene.remove(this.rig);
    this.race = race;
    this.groups = { ...NAKED };
    this.worn = {};
    this.attached = {};
    this.rangedFile = null;
    this.yaw = 0;
    this.hideHair = false;
    const g = await this.loader.loadAsync(ROOT + 'chars/' + rig.glb);
    this.rig = g.scene;
    this.scene.add(this.rig);
    this.mixer = new THREE.AnimationMixer(this.rig);
    this.clips = {};
    for (const c of g.animations) this.clips[c.name] = this.mixer.clipAction(c);
    this.canvas2d = document.createElement('canvas');
    this.base = await image(ROOT + 'chars/' + rig.skin);
    this.canvas2d.width = this.canvas2d.height = this.base ? this.base.width : 512;
    this.skin = new THREE.CanvasTexture(this.canvas2d);
    this.skin.flipY = false;
    this.skin.colorSpace = THREE.SRGBColorSpace;
    this.skin.wrapS = this.skin.wrapT = THREE.RepeatWrapping;
    const hair = await new THREE.TextureLoader().loadAsync(ROOT + 'chars/' + rig.hair).catch(() => null);
    if (hair) { hair.flipY = false; hair.colorSpace = THREE.SRGBColorSpace; hair.wrapS = hair.wrapT = THREE.RepeatWrapping; }
    this.rig.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      const m = o.material.name;
      if (m === 'skin' || m === 'fur') { o.material = o.material.clone(); o.material.map = this.skin; o.material.needsUpdate = true; }
      if (m === 'hair' && hair) { o.material = o.material.clone(); o.material.map = hair; o.material.needsUpdate = true; }
    });
    await this.repaint();
    this.applyGeosets();
    this.pose('idle');
  }

  async setLook(look, P) {
    const { buildCharacter } = await import(new URL(P.code.replace(/armoryview\.js$/, 'charbuilder.js'), location.href).href);
    const ch = await buildCharacter(look, P);
    if (this.rig) this.scene.remove(this.rig);
    if (this.mixer) this.mixer.stopAllAction();
    this.current = null;
    this.race = 'look';
    this.real = true;
    this.groups = { ...NAKED };
    this.worn = {};
    this.attached = {};
    this.rangedFile = null;
    this.yaw = 0;
    this.hideHair = false;
    this.rig = ch.root;
    this.rig.traverse((o) => {
      if (o.isMesh) o.frustumCulled = false;
      if (/^att\d+$/.test(o.name) && o.children.length && !this.attached[o.name]) this.attached[o.name] = o.children[0];
    });
    this.scene.add(this.rig);
    this.mixer = new THREE.AnimationMixer(this.rig);
    this.clips = {};
    for (const c of ch.animations) this.clips[c.name] = this.mixer.clipAction(c);
    this.pose('idle');
  }

  pose(name, speed = 1) {
    const a = this.clips && this.clips[name];
    if (!a) return;
    if (this.current === a) { a.timeScale = speed; return; }
    a.reset();
    a.timeScale = speed;
    a.fadeIn(.18).play();
    if (this.current) this.current.fadeOut(.18);
    this.current = a;
  }

  applyGeosets() {
    if (!this.rig) return;
    this.rig.traverse((o) => {
      if (!o.isMesh) return;
      const m = /^g(\d+)/.exec(o.name);
      if (!m) return;
      const id = +m[1], group = Math.floor(id / 100);
      if (group === 0) o.visible = id === 0 || (id === HAIR && !this.hideHair) || (id === 1 && this.hideHair);
      else if (group <= 3) o.visible = id % 100 === 1;
      else o.visible = id === group * 100 + (this.groups[group] ?? 1);
    });
  }

  async repaint() {
    const ctx = this.canvas2d.getContext('2d'), k = this.canvas2d.width / 256;
    await Promise.all(PAINT.flatMap((slot) => Object.values((this.worn[slot] && this.worn[slot].t) || {}).map((file) => image(ROOT + 'skin/' + file))));
    ctx.globalCompositeOperation = 'source-over';
    if (this.base) ctx.drawImage(this.base, 0, 0, this.canvas2d.width, this.canvas2d.height);
    for (const slot of PAINT) {
      const e = this.worn[slot];
      if (!e || !e.t) continue;
      for (const [section, file] of Object.entries(e.t)) {
        const r = REGION[section], img = await image(ROOT + 'skin/' + file);
        if (r && img) ctx.drawImage(img, r[0] * k, r[1] * k, r[2] * k, r[3] * k);
      }
    }
    this.skin.needsUpdate = true;
  }

  async attach(slot, att, file) {
    const old = this.attached[att];
    if (old) old.removeFromParent();
    delete this.attached[att];
    if (!file) return;
    const node = this.rig.getObjectByName(att);
    if (!node) return;
    const g = await this.loader.loadAsync(ROOT + 'gear/' + file).catch(() => null);
    if (!g) return;
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      const blend = o.material.userData.blend;
      if (blend === 3 || blend === 4) { o.material.blending = THREE.AdditiveBlending; o.material.depthWrite = false; }
      if (blend === 5 || blend === 6) o.visible = false;
    });
    if (att === 'att31') {
      g.scene.rotation.order = 'ZXY';
      g.scene.rotation.set(-Math.PI / 2, 0, STOW);
      g.scene.position.set(.06, this.stowDrop * 1.6, -.16);
    }
    node.add(g.scene);
    this.attached[att] = g.scene;
  }

  async wear(slot, id, row, ranged) {
    const e = this.gear.items[id];
    if (!e || !this.rig) { this.pulse(); return; }
    this.worn[slot] = e;
    if (slot === 'head') {
      const file = e.h && e.h[this.race];
      if (file) { this.hideHair = true; await this.attach(slot, 'att11', file); }
    } else if (slot === 'shoulder') {
      if (e.l) await this.attach(slot, 'att6', e.l);
      if (e.r) await this.attach(slot, 'att5', e.r);
    } else if (slot === 'main') {
      await this.attach(slot, 'att1', e.m);
    } else if (slot === 'off') {
      const shield = row && row[5] === 4 && row[6] === 6;
      await this.attach(slot, shield ? 'att0' : 'att2', e.m);
    } else if (slot === 'ranged') {
      this.rangedFile = e.m;
      this.stowDrop = row && row[6] === 2 ? 0 : .32 * -1;
      await this.attach(slot, row && (row[6] === 19 || row[6] === 16) ? 'att32' : 'att31', e.m);
    } else if (slot === 'back' && e.c) {
      const tex = await new THREE.TextureLoader().loadAsync(ROOT + 'skin/' + e.c).catch(() => null);
      if (tex) {
        tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        this.rig.traverse((o) => { if (o.isMesh && o.material.name === 'cape') { o.material = o.material.clone(); o.material.map = tex; o.material.needsUpdate = true; } });
      }
      this.groups[15] = 1 + (e.g && e.g[0] || 1);
    }
    const g = e.g || [0, 0, 0];
    if (slot === 'hands' && g[0]) this.groups[4] = 1 + g[0];
    if (slot === 'feet' && g[0]) this.groups[5] = 1 + g[0];
    if (slot === 'legs') { if (g[0]) this.groups[9] = 1 + g[0]; if (g[2]) this.groups[13] = 1 + g[2]; }
    if (slot === 'chest') { if (g[0]) this.groups[8] = 1 + g[0]; if (g[1]) this.groups[10] = 1 + g[1]; if (g[2]) this.groups[13] = 1 + g[2]; }
    if (this.quiet) return;
    await this.repaint();
    this.applyGeosets();
    this.pulse();
  }

  async outfit(items, ready) {
    this.quiet = true;
    const jobs = items.map(([slot, id, row]) => this.wear(slot, id, row));
    const painted = this.repaint();
    await Promise.race([painted, new Promise((done) => { setTimeout(done, 400); })]);
    this.applyGeosets();
    ready();
    await Promise.all([painted, ...jobs]);
    this.quiet = false;
    this.applyGeosets();
    this.skin.needsUpdate = true;
  }

  pause() {
    this.renderer.setAnimationLoop(null);
  }

  resume() {
    this.renderer.setAnimationLoop(() => this.frame());
  }

  async strip() {
    for (const node of Object.values(this.attached)) node.removeFromParent();
    this.attached = {};
    this.worn = {};
    this.groups = { ...NAKED };
    this.hideHair = false;
    this.rangedFile = null;
    this.canvas2d.getContext('2d').clearRect(0, 0, this.canvas2d.width, this.canvas2d.height);
    await this.repaint();
    this.applyGeosets();
  }

  pulse() {
    this.pulseAt = performance.now();
  }

  async buildDummy() {
    if (this.dummy) return;
    const real = await this.loader.loadAsync(ROOT + 'gear/dummy.glb').catch(() => null);
    if (real) {
      real.scene.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
      const box = new THREE.Box3().setFromObject(real.scene);
      real.scene.scale.setScalar(DUMMY_HEIGHT / (box.max.y - box.min.y));
      real.scene.position.y = -box.min.y * real.scene.scale.y;
      this.dummy = new THREE.Group();
      this.dummy.add(real.scene);
      this.scene.add(this.dummy);
      return;
    }
    const d = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a28, roughness: .9 });
    const sack = new THREE.MeshStandardMaterial({ color: 0xb29a6c, roughness: 1 });
    const rope = new THREE.MeshStandardMaterial({ color: 0x4d3a20, roughness: 1 });
    const add = (geo, mat, x, y, z, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.z = rz; d.add(m); return m; };
    add(new THREE.CylinderGeometry(.07, .09, 1.9, 10), wood, 0, .95, 0);
    add(new THREE.CylinderGeometry(.05, .05, 1.3, 10), wood, 0, 1.42, 0, Math.PI / 2);
    add(new THREE.SphereGeometry(.2, 16, 12), sack, 0, 1.92, 0);
    const body = add(new THREE.CylinderGeometry(.26, .22, .78, 14), sack, 0, 1.22, 0);
    body.scale.z = .75;
    add(new THREE.TorusGeometry(.26, .02, 8, 22), rope, 0, 1.4, 0).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(.22, .02, 8, 22), rope, 0, 1.0, 0).rotation.x = Math.PI / 2;
    add(new THREE.CylinderGeometry(.42, .5, .1, 14), wood, 0, .05, 0);
    d.position.set(1, 0, 0);
    this.scene.add(d);
    this.dummy = d;
  }

  async fight(kind, two) {
    await this.buildDummy();
    this.kind = kind;
    const gap = kind === 'melee' ? 1.7 : 3.6;
    this.rig.position.set(-gap / 2 - .1, 0, 0);
    this.rig.rotation.y = Math.PI / 2;
    this.dummy.position.set(gap / 2 + .1, 0, 0);
    this.dummy.visible = true;
    this.ring.visible = false;
    const span = gap + 2.2, z = Math.max(8, span / 2 / .268 / this.camera.aspect);
    this.want = { x: 0, y: 1.5, z, tx: 0, ty: 1.45 };
    if (kind === 'ranged' && this.rangedFile) {
      await this.attach('ranged', 'att31', null);
      await this.attach('ranged', 'att2', this.rangedFile);
    }
    this.two = two;
    this.fightOn = true;
    this.pose(kind === 'melee' ? (two ? 'attack2h' : 'attack1h') : kind === 'ranged' ? 'attackbow' : 'castdirected', kind === 'melee' ? 2.6 : 1.8);
  }

  stopFight() {
    this.fightOn = false;
    this.pose(this.kind === 'melee' ? (this.two ? 'ready2h' : 'ready1h') : 'idle');
    for (const m of Object.values(this.minions)) this.play(m, 'idle', 1);
  }

  async prepare(kinds) {
    await Promise.all(kinds.map(async (kind) => {
      if (this.minions[kind]) return;
      const g = await this.loader.loadAsync(ROOT + 'gear/summon_' + kind + '.glb').catch(() => null);
      if (!g || this.minions[kind]) return;
      const place = MINION[kind], root = new THREE.Group(), mixer = new THREE.AnimationMixer(g.scene), clips = {};
      for (const c of g.animations) clips[c.name] = mixer.clipAction(c);
      g.scene.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        if (place.ghost) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = place.ghost; o.material.depthWrite = false; }
      });
      root.add(g.scene);
      root.visible = false;
      this.scene.add(root);
      this.minions[kind] = { root, mixer, clips, place, size: 0, count: 0, hold: 0, current: null };
    }));
  }

  play(m, name, speed) {
    const a = m.clips[name] || m.clips.idle;
    if (!a) return;
    a.timeScale = speed;
    if (m.current === a) return;
    a.reset().fadeIn(.15).play();
    if (m.current) m.current.fadeOut(.15);
    m.current = a;
  }

  summon(kind) {
    const m = this.minions[kind];
    if (!m) return;
    m.count++;
    m.hold = performance.now() + HOLD;
    if (m.root.visible) return;
    const x = (m.place.melee ? this.dummy.position.x : this.rig.position.x) + m.place.x, z = m.place.z;
    m.root.position.set(x, m.place.y || 0, z);
    m.root.rotation.y = Math.atan2(this.dummy.position.x - x, -z);
    m.root.scale.setScalar(.001);
    m.root.visible = true;
    m.size = 0;
    this.play(m, m.place.clip, m.place.speed);
  }

  dismiss(kind) {
    const m = this.minions[kind];
    if (m) m.count = Math.max(0, m.count - 1);
  }

  clearMinions() {
    for (const m of Object.values(this.minions)) { m.count = 0; m.hold = 0; m.size = 0; m.root.visible = false; }
  }

  clearEffects() {
    while (this.fx.length) {
      const running = this.fx;
      this.fx = [];
      for (const step of running) step(99);
    }
    for (const p of this.parts) { this.scene.remove(p.s); this.spares.push(p.s); }
    this.parts = [];
  }

  reset() {
    this.fightOn = false;
    this.clearEffects();
    this.clearMinions();
    if (this.dummy) this.dummy.visible = false;
    if (this.rig) { this.rig.position.set(0, 0, 0); this.rig.rotation.y = 0; }
    this.ring.visible = true;
    this.want = { ...REST };
    this.pose('idle');
  }

  hit(school, minion, name, crit) {
    if (!this.dummy) return;
    if (minion || !this.rig) { this.shake = 1; return; }
    const look = LOOK[name];
    if (look && this.fx.length < 36) return this[look.fx](look, crit);
    if (this.kind === 'melee') {
      this.shake = 1;
      if (school !== 'phys') this.impact(school, .7);
      else if (crit) this.impact('phys', .6);
      return;
    }
    if (this.fx.length < 36) this.bolt({ pal: school, size: .16, speed: 14, trail: 1, hit: .5 }, crit);
    else this.shake = 1;
  }

  spark(x, y, z, o) {
    if (this.parts.length >= LIMIT) return;
    this.glow ||= glowTexture(softGlow);
    this.star ||= glowTexture(starGlow);
    const s = this.spares.pop() || new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.material.blending = o.dust ? THREE.NormalBlending : THREE.AdditiveBlending;
    s.material.map = o.star ? this.star : this.glow;
    s.material.color.setHex(o.color);
    s.material.rotation = Math.random() * 6.28;
    s.material.opacity = o.opacity ?? 1;
    s.position.set(x, y, z);
    s.scale.setScalar(o.size);
    this.scene.add(s);
    this.parts.push({ s, age: 0, life: o.life || .4, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, fall: o.fall || 0, size: o.size, grow: o.grow ?? 1, opacity: o.opacity ?? 1 });
  }

  hand() {
    return new THREE.Vector3(this.rig.position.x + .6 * (this.face || 1), 1.45, 0);
  }

  target() {
    return new THREE.Vector3(this.dummy.position.x, 1.35 + (Math.random() - .5) * .5, (Math.random() - .5) * .2);
  }

  impact(pal, power, at) {
    const [outer, inner] = PAL[pal] || PAL.phys, t = at || this.target();
    this.shake = 1;
    this.spark(t.x, t.y, t.z + .1, { color: inner, size: .5 * power, life: .16, grow: 1.4 });
    this.spark(t.x, t.y, t.z + .1, { color: outer, size: 1 * power, life: .28, grow: .7, opacity: .7 });
    for (let i = 0, n = Math.round(9 * power); i < n; i++) {
      const a = Math.random() * 6.28, v = (1 + Math.random() * 2.4) * power;
      this.spark(t.x, t.y, t.z + .1, { color: i % 2 ? outer : inner, size: .1 + Math.random() * .12, life: .3 + Math.random() * .25, vx: Math.cos(a) * v, vy: Math.sin(a) * v + .5, vz: (Math.random() - .5) * v, fall: 3, star: i % 3 === 0, grow: -.6 });
    }
  }

  flight(look, crit, body) {
    const from = this.hand(), to = this.target(), span = Math.max(.3, Math.abs(to.x - from.x)), [outer, inner] = PAL[look.pal], way = this.face || 1;
    let p = 0;
    const size = look.size * (crit ? 1.25 : 1), pos = from.clone();
    this.fx.push((dt) => {
      p += dt * look.speed / span;
      pos.lerpVectors(from, to, Math.min(1, p));
      pos.y += Math.sin(Math.min(1, p) * Math.PI) * (look.lift || 0);
      if (body) body(pos, Math.min(1, p));
      for (let i = 0; i < (look.trail || 0); i++) {
        this.spark(pos.x - Math.random() * .12, pos.y + (Math.random() - .5) * size * .5, pos.z + (Math.random() - .5) * size * .5, { color: Math.random() < .6 ? outer : inner, size: size * (.4 + Math.random() * .4), life: .2 + Math.random() * .2, vx: (-.6 - Math.random()) * way, vy: (Math.random() - .3) * .8, grow: -.5, opacity: .8 });
      }
      if (p < 1) return false;
      this.impact(look.pal, look.hit * (crit ? 1.3 : 1), to);
      return true;
    });
    return { size, outer, inner };
  }

  bolt(look, crit) {
    const { size, outer, inner } = this.flight(look, crit, (pos) => {
      this.spark(pos.x, pos.y, pos.z, { color: outer, size: size * 1.5, life: .05, grow: 0, opacity: .8 });
      this.spark(pos.x, pos.y, pos.z, { color: inner, size: size * .7, life: .05, grow: 0 });
    });
  }

  shard(look, crit) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(look.size * .3, look.size * 1.5, 6), additive(PAL.frost[1], .95));
    m.rotation.z = -Math.PI / 2 * (this.face || 1);
    this.scene.add(m);
    this.flight(look, crit, (pos, p) => {
      m.position.copy(pos);
      this.spark(pos.x - look.size * .4, pos.y, pos.z, { color: PAL.frost[0], size: look.size * 1.4, life: .05, grow: 0, opacity: .7 });
      if (p >= 1) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    });
  }

  arrow(look, crit) {
    const scale = look.size, shaft = new THREE.Mesh(new THREE.CylinderGeometry(.008 * scale, .008 * scale, .62 * scale, 5), new THREE.MeshBasicMaterial({ color: 0x8a6a42 }));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.024 * scale, .09 * scale, 6), new THREE.MeshBasicMaterial({ color: 0xdfe4ea }));
    const tail = new THREE.Mesh(new THREE.PlaneGeometry(.13 * scale, .05 * scale), new THREE.MeshBasicMaterial({ color: 0xf2efe4, side: THREE.DoubleSide }));
    const group = new THREE.Group();
    shaft.rotation.z = tip.rotation.z = -Math.PI / 2;
    tip.position.x = .35 * scale;
    tail.position.x = -.27 * scale;
    group.add(shaft, tip, tail);
    group.scale.x = this.face || 1;
    this.scene.add(group);
    const [outer] = PAL[look.pal], start = this.hand();
    let last = start.clone();
    this.flight({ ...look, size: .12 * scale }, crit, (pos, p) => {
      group.position.copy(pos);
      if (look.pal !== 'arrow' || crit) this.spark(pos.x - .3, pos.y, pos.z, { color: outer, size: .3 * scale, life: .1, grow: 0, opacity: .6 });
      if (pos.distanceTo(last) < .5) this.ribbonLine(last, pos, outer, .012 * scale, .08);
      last = pos.clone();
      if (p >= 1) {
        this.scene.remove(group);
        for (const c of group.children) { c.geometry.dispose(); c.material.dispose(); }
      }
    });
  }

  ribbon(points, width, color, life, opacity = 1) {
    const verts = [], index = [];
    points.forEach((p, i) => {
      verts.push(p.x, p.y - width / 2, p.z, p.x, p.y + width / 2, p.z);
      if (i) index.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(index);
    const m = new THREE.Mesh(geo, additive(color, opacity));
    m.frustumCulled = false;
    this.scene.add(m);
    let age = 0;
    this.fx.push((dt) => {
      age += dt;
      m.material.opacity = opacity * Math.max(0, 1 - age / life);
      if (age < life) return false;
      this.scene.remove(m);
      geo.dispose();
      m.material.dispose();
      return true;
    });
  }

  ribbonLine(a, b, color, width, life) {
    if (this.fx.length < 36) this.ribbon([a.clone(), b.clone()], width, color, life, .35);
  }

  jagged(from, to, parts, wobble) {
    return Array.from({ length: parts + 1 }, (_, i) => {
      const p = from.clone().lerp(to, i / parts);
      if (i && i < parts) { p.y += (Math.random() - .5) * wobble; p.z += (Math.random() - .5) * wobble * .4; }
      return p;
    });
  }

  lightning(look, crit) {
    const from = this.hand(), to = this.target(), width = look.width * (crit ? 1.4 : 1), [outer, inner] = PAL[look.pal];
    for (let i = 0; i < 2; i++) {
      const line = this.jagged(from, to, 10, .5);
      this.ribbon(line, width * 2.4, outer, .2, .55);
      this.ribbon(line, width * .7, inner, .16);
    }
    this.impact(look.pal, look.hit * (crit ? 1.3 : 1));
  }

  tether(look, crit) {
    const from = this.hand(), to = this.target(), [outer, inner] = PAL[look.pal];
    this.ribbon(this.jagged(from, to, 14, .22), look.width * 2, outer, .3, .55);
    this.ribbon(this.jagged(from, to, 14, .12), look.width * .6, inner, .24);
    this.impact(look.pal, look.hit * (crit ? 1.3 : 1));
  }

  beam(look, crit) {
    const x = this.dummy.position.x, w = look.width * (crit ? 1.3 : 1), [outer, inner] = PAL[look.pal];
    for (const [size, color, opacity] of [[w, outer, .5], [w * .35, inner, .95]]) {
      this.column ||= glowTexture(softColumn);
      const geo = new THREE.PlaneGeometry(size, 7), m = new THREE.Mesh(geo, additive(color, opacity));
      m.material.map = this.column;
      m.position.set(x, 3.5, .1);
      this.scene.add(m);
      let age = 0;
      this.fx.push((dt) => {
        age += dt;
        m.scale.x = Math.max(.05, 1 - age / .36);
        m.material.opacity = opacity * Math.max(0, 1 - age / .36);
        if (age < .36) return false;
        this.scene.remove(m);
        geo.dispose();
        m.material.dispose();
        return true;
      });
    }
    this.impact(look.pal, look.hit * (crit ? 1.3 : 1));
  }

  blast(look, crit) {
    const power = look.hit * (crit ? 1.3 : 1);
    this.impact(look.pal, power);
    if (look.ring || crit) this.ground({ pal: look.pal, y: 1.35, flat: 1 });
  }

  ground(look) {
    const color = PAL[look.pal][0], geo = new THREE.RingGeometry(.2, .36, 40), m = new THREE.Mesh(geo, additive(color, .9));
    m.position.set(this.dummy.position.x, look.y || .05, .05);
    if (!look.flat) m.rotation.x = -Math.PI / 2;
    this.scene.add(m);
    let age = 0;
    this.shake = 1;
    this.fx.push((dt) => {
      age += dt;
      m.scale.setScalar(1 + age * 5);
      m.material.opacity = .9 * Math.max(0, 1 - age / .5);
      if (age < .5) return false;
      this.scene.remove(m);
      geo.dispose();
      m.material.dispose();
      return true;
    });
  }

  wisp(look) {
    const [outer, inner] = PAL[look.pal];
    this.shake = Math.max(this.shake || 0, .4);
    for (let i = 0; i < 6; i++) {
      const t = this.target();
      this.spark(t.x + (Math.random() - .5) * .45, t.y - .5, .15, { color: i % 2 ? outer : inner, size: .12 + Math.random() * .16, life: .45 + Math.random() * .3, vy: 1 + Math.random() * .8, vx: (Math.random() - .5) * .4, grow: .4, opacity: .75 });
    }
  }

  dive(look, crit) {
    const to = this.target(), from = new THREE.Vector3(to.x - 1.8 - Math.random(), 4.2, -.4);
    this.flight({ ...look, size: .14, speed: 13, trail: 3 }, crit, (pos, p) => {
      pos.lerpVectors(from, to, p);
      this.spark(pos.x, pos.y, pos.z, { color: PAL.holy[1], size: .3, life: .06, grow: 0, opacity: .9 });
    });
  }

  anchor() {
    if (!this.dummy) return { x: .5, y: .3 };
    const v = new THREE.Vector3(this.dummy.position.x, 1.9, 0).project(this.camera);
    return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
  }

  frame() {
    const dt = Math.min(.05, this.clock.getDelta()) * (this.timeScale ?? 1);
    if (this.mixer) this.mixer.update(dt);
    for (const m of Object.values(this.minions)) {
      if (!m.root.visible) continue;
      m.mixer.update(dt);
      const stay = !this.fightOn || m.count > 0 || performance.now() < m.hold;
      m.size = Math.min(1, Math.max(0, m.size + (stay ? dt : -dt) * 5));
      m.root.scale.setScalar(Math.max(.001, m.size * m.place.scale));
      if (!stay && m.size === 0) m.root.visible = false;
    }
    if (this.rig && !this.fightOn && this.rig.position.x === 0) this.rig.rotation.y = this.yaw + (this.drag != null ? 0 : Math.sin(performance.now() / 3200) * .12);
    const v = this.view, w = this.want;
    for (const k of Object.keys(v)) v[k] += (w[k] - v[k]) * Math.min(1, dt * 4);
    this.camera.position.set(v.x, v.y, v.z);
    this.camera.lookAt(v.tx, v.ty, 0);
    if (this.pulseAt) {
      const p = (performance.now() - this.pulseAt) / 500;
      this.ring.scale.setScalar(1 + Math.max(0, 1 - p) * .35);
      this.ring.material.opacity = .4 + Math.max(0, 1 - p) * .6;
    }
    if (this.dummy && this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 6);
      this.dummy.rotation.z = Math.sin(performance.now() / 22) * .05 * this.shake;
    }
    const running = this.fx;
    this.fx = [];
    this.fx = [...running.filter((step) => !step(dt)), ...this.fx];
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.scene.remove(p.s);
        this.spares.push(p.s);
        this.parts.splice(i, 1);
        continue;
      }
      const a = p.age / p.life;
      p.vy -= p.fall * dt;
      p.s.position.x += p.vx * dt;
      p.s.position.y += p.vy * dt;
      p.s.position.z += p.vz * dt;
      p.s.scale.setScalar(Math.max(.001, p.size * (1 + p.grow * a)));
      p.s.material.opacity = p.opacity * (1 - a);
    }
    if (this.onFrame) this.onFrame(dt);
    this.renderer.render(this.scene, this.camera);
  }
}
