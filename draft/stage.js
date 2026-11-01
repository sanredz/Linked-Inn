import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ROOT = 'assets/draft/';
const RACE = { WARRIOR: 'human', PALADIN: 'human', HUNTER: 'orc', ROGUE: 'human', PRIEST: 'human', SHAMAN: 'orc', MAGE: 'human', WARLOCK: 'human', DRUID: 'nightelf' };
const REGION = {
  arm_upper: [0, 0, 128, 64], arm_lower: [0, 64, 128, 64], hand: [0, 128, 128, 32], torso_upper: [128, 0, 128, 64], torso_lower: [128, 64, 128, 32],
  leg_upper: [128, 96, 128, 64], leg_lower: [128, 160, 128, 64], foot: [128, 224, 128, 32],
};
const PAINT = ['legs', 'feet', 'chest', 'wrist', 'waist', 'hands'];
const SCHOOL = { fire: 0xff7a2a, frost: 0x7fd4ff, arcane: 0xd27dff, shadow: 0x9a5cff, nature: 0x7dff8a, holy: 0xffe680, phys: 0xffffff };
const HAIR = 6;
const STOW = .62;
const REST = { x: 0, y: 1.02, z: 5.7, tx: 0, ty: .98 };
const DUMMY_HEIGHT = 2.15;
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
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shade), transparent: true, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(.72, .76, 64), new THREE.MeshBasicMaterial({ color: 0xf8d36b, transparent: true, opacity: .4, side: THREE.DoubleSide }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = .01;
    this.scene.add(this.ring);
    this.bolts = [];
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

  async setClass(cls) {
    const race = RACE[cls], rig = this.gear.rigs[race];
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
    g.scene.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
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
    await this.repaint();
    this.applyGeosets();
    this.pulse();
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
  }

  reset() {
    this.fightOn = false;
    if (this.dummy) this.dummy.visible = false;
    if (this.rig) { this.rig.position.set(0, 0, 0); this.rig.rotation.y = 0; }
    this.ring.visible = true;
    this.want = { ...REST };
    this.pose('idle');
  }

  hit(school) {
    if (this.dummy) this.shake = 1;
    if (this.kind === 'melee' || !this.rig) return;
    const color = SCHOOL[school] ?? 0xffffff;
    const m = new THREE.Mesh(new THREE.SphereGeometry(this.kind === 'ranged' ? .035 : .1, 10, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .95 }));
    m.position.set(this.rig.position.x + .3, 1.35, 0);
    m.userData.to = this.dummy.position.x;
    m.userData.v = this.kind === 'ranged' ? 16 : 9;
    this.scene.add(m);
    this.bolts.push(m);
  }

  anchor() {
    if (!this.dummy) return { x: .5, y: .3 };
    const v = new THREE.Vector3(this.dummy.position.x, 1.9, 0).project(this.camera);
    return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
  }

  frame() {
    const dt = Math.min(.05, this.clock.getDelta());
    if (this.mixer) this.mixer.update(dt);
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
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.position.x += b.userData.v * dt;
      if (b.position.x >= b.userData.to) { this.scene.remove(b); this.bolts.splice(i, 1); }
    }
    this.renderer.render(this.scene, this.camera);
  }
}
