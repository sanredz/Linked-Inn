import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ROOT = 'assets/draft/hall/';
const HOME = { target: new THREE.Vector3(-2.2, 1.5, 0), yaw: 1.4, pitch: .13, dist: 9 };
const SPOTS = {
  19019: { at: [-4.4, 0, -2.8], theme: 'storm', look: 1.2, clear: 2 },
  17182: { at: [-4.4, 0, 2.8], theme: 'fire', look: 1.7, clear: 2 },
  21175: { at: [-4.9, 0, 0], theme: 'sand', look: 1.4, clear: 2, up: 1 },
  19872: { at: [-.4, 0, -3.9], yaw: .93, look: 1.15, clear: 2, y: 1.9, dist: 6.8 },
  19902: { at: [-.4, 0, 3.9], yaw: 2.21, look: 2.75, clear: 2, y: 1.1, dist: 5.2 },
};
const SWING = 1.15;
const pulse = { value: 0 };
const veil = new THREE.MeshBasicMaterial({ colorWrite: false });
const spirit = new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, depthWrite: false, depthFunc: THREE.LessEqualDepth, blending: THREE.AdditiveBlending });
spirit.onBeforeCompile = (sh) => {
  sh.uniforms.pulse = pulse;
  sh.fragmentShader = 'uniform float pulse;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
    float rim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.2);
    gl_FragColor = vec4(vec3(1.0, .76, .4) * (.035 + rim * (.55 + .18 * pulse)), 1.0);`);
};
function ghost(root) {
  root.traverse((m) => {
    if (!m.isMesh) return;
    const g = m.geometry, n = g.index ? g.index.count : g.attributes.position.count;
    g.clearGroups();
    g.addGroup(0, n, 0);
    g.addGroup(0, n, 1);
    m.material = [veil, spirit];
    m.renderOrder = 10;
  });
}
const THEME = {
  storm: { light: 0x7fc8ff, glow: '#9fdcff', spark: 0xbfe8ff },
  fire: { light: 0xff7a2a, glow: '#ffb15a', spark: 0xffa040 },
  sand: { light: 0xffcf6a, glow: '#ffe2a0', spark: 0xffd98a },
};
const FIRE = new THREE.Vector3(-6.4, 1.6, .06), HEARTH = new THREE.Vector3(-7.7, .25, .05);
const SEEN = 'trophySeen', MUTE = 'trophyMute';

class Sounds {
  constructor() {
    this.off = false;
    try { this.off = localStorage.getItem(MUTE) === '1'; } catch {}
    this.all = [];
    this.songs = [];
    this.track = 0;
  }
  clip(name, level, loop = false) {
    const a = new Audio(ROOT + 'sfx/' + name);
    a.loop = loop;
    a.volume = 0;
    a.level = level;
    this.all.push(a);
    return a;
  }
  fade(a, to, ms = 900) {
    clearInterval(a.fading);
    const from = a.volume, start = performance.now();
    a.fading = setInterval(() => { const k = Math.min(1, (performance.now() - start) / ms); a.volume = Math.max(0, Math.min(1, from + (to - from) * k)); if (k >= 1) clearInterval(a.fading); }, 30);
  }
  play(a, ms) { if (this.off) return; a.play().then(() => this.fade(a, a.level, ms)).catch(() => {}); }
  enter() {
    this.door = this.clip('door.ogg', .5);
    this.room = this.clip('tavern.ogg', .3, true);
    this.fire = this.clip('fire.ogg', .22, true);
    this.songs = [this.clip('music1.mp3', .32), this.clip('music2.mp3', .32)];
    for (const m of this.songs) m.onended = () => { this.wait = setTimeout(() => this.next(), 7000); };
    this.play(this.door, 1);
    this.timers = [setTimeout(() => { this.play(this.room, 2500); this.play(this.fire, 1200); }, 500), setTimeout(() => this.next(), 2200)];
  }
  next() {
    if (this.off || this.closed) return;
    const m = this.songs[this.track++ % this.songs.length];
    m.currentTime = 0;
    this.play(m, 2500);
  }
  toggle() {
    this.off = !this.off;
    try { localStorage.setItem(MUTE, this.off ? '1' : '0'); } catch {}
    if (this.off) for (const a of this.all) { this.fade(a, 0, 300); setTimeout(() => a.pause(), 320); }
    else { this.play(this.room, 1200); this.play(this.fire, 1200); this.next(); }
    return this.off;
  }
  pause(on) { for (const a of [this.room, this.fire, ...this.songs]) { if (!a) continue; if (on) a.pause(); else if (!this.off && a.volume > 0) a.play().catch(() => {}); } }
  stop() {
    this.closed = true;
    clearTimeout(this.wait);
    for (const t of this.timers || []) clearTimeout(t);
    for (const a of this.all) { this.fade(a, 0, 350); setTimeout(() => { a.pause(); a.src = ''; }, 380); }
  }
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ease = (x) => 1 - (1 - x) ** 3;

function glowTexture(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, color);
  r.addColorStop(.25, color + 'aa');
  r.addColorStop(1, color + '00');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function sparks(count, color, size) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) seed[i] = Math.random();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size, map: glowTexture('#ffffff'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat);
  pts.userData.seed = seed;
  pts.frustumCulled = false;
  return pts;
}

class Hall {
  constructor(box, items, opts) {
    this.box = box;
    this.items = items;
    this.opts = opts;
    this.canvas = box.querySelector('canvas');
    this.loader = new GLTFLoader();
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(max-width: 760px)').matches ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0805);
    this.scene.fog = new THREE.Fog(0x120a05, 14, 34);
    this.camera = new THREE.PerspectiveCamera(46, 1, .1, 120);
    this.clock = new THREE.Clock();
    this.view = { target: HOME.target.clone(), yaw: HOME.yaw - .9, pitch: .55, dist: 17 };
    this.want = { target: HOME.target.clone(), yaw: HOME.yaw, pitch: HOME.pitch, dist: HOME.dist };
    this.idle = 0;
    this.center = HOME.yaw;
    this.fx = [];
    this.spots = [];
    this.pick = [];
    this.focus = null;
    this.still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scene.add(new THREE.HemisphereLight(0xffdcae, 0x24160a, .55));
    this.fire = new THREE.PointLight(0xff9a4a, 26, 16, 1.4);
    this.fire.position.copy(FIRE);
    this.scene.add(this.fire);
    this.input();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(box);
    this.resize();
  }

  async build() {
    const plan = await fetch(ROOT + 'hall.json').then((r) => r.json());
    const files = [...new Set(plan.doodads.map((d) => d.f))];
    const [inn, ...models] = await Promise.all([this.load(ROOT + plan.inn), ...files.map((f) => this.load(ROOT + f))]);
    if (inn) {
      this.scene.add(this.dress(inn.scene));
      const down = new THREE.Raycaster(new THREE.Vector3(-2, 4, 0), new THREE.Vector3(0, -1, 0));
      const floor = down.intersectObject(inn.scene, true)[0];
      if (floor && floor.object.material.map) {
        const map = floor.object.material.map.clone();
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(2, 1);
        map.needsUpdate = true;
        this.stoneMap = map;
      }
    }
    const byFile = new Map(files.map((f, i) => [f, models[i]]));
    const spots = Object.values(SPOTS);
    for (const d of plan.doodads) {
      const g = byFile.get(d.f);
      if (!g || (d.p[1] < 2 && spots.some((p) => Math.hypot(d.p[0] - p.at[0], d.p[2] - p.at[2]) < p.clear))) continue;
      const o = g.scene.clone();
      o.position.fromArray(d.p);
      o.quaternion.fromArray(d.q);
      o.scale.setScalar(d.s);
      this.scene.add(this.dress(o));
    }
    for (const l of plan.lights) {
      if (l.p[1] > 6) continue;
      const p = new THREE.PointLight(new THREE.Color(l.c[0] / 255, l.c[1] / 255, l.c[2] / 255), 9, l.r * 1.6, 1.3);
      p.position.fromArray(l.p);
      this.scene.add(p);
    }
    this.embers();
    await Promise.all(this.items.map((x) => this.place(x)));
  }

  load(url) { return this.loader.loadAsync(url).catch(() => null); }

  dress(o) {
    o.traverse((m) => {
      if (!m.isMesh) return;
      m.frustumCulled = true;
      for (const mat of [].concat(m.material)) { if (mat.map) mat.map.anisotropy = 4; mat.metalness = 0; mat.roughness = 1; }
    });
    return o;
  }

  embers() {
    const flames = [];
    for (let i = 0; i < 7; i++) {
      const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(i % 3 ? '#ff8a2a' : '#ffd27a'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 }));
      f.position.set(HEARTH.x, HEARTH.y + .35, HEARTH.z + (i - 3) * .32);
      f.userData.k = Math.random() * 10;
      this.scene.add(f);
      flames.push(f);
    }
    const bed = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#ff5a1a'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 }));
    bed.position.set(HEARTH.x, HEARTH.y + .15, HEARTH.z);
    bed.scale.set(3, 1.1, 1);
    this.scene.add(bed);
    this.fx.push((t) => {
      const lit = this.lit();
      bed.material.opacity = .9 * lit;
      for (const f of flames) { const k = f.userData.k, h = (.9 + Math.sin(t * 6 + k) * .25 + Math.sin(t * 11 + k * 2) * .12) * lit; f.scale.set((.75 + Math.sin(t * 4 + k) * .1) * Math.min(1, lit * 1.4), h * 1.3, 1); f.position.y = HEARTH.y + .2 + h * .45; }
    });
    const n = 46, pts = sparks(n, 0xffa24a, .07);
    this.scene.add(pts);
    const s = pts.userData.seed, pos = pts.geometry.attributes.position;
    this.fx.push((t) => {
      for (let i = 0; i < n; i++) {
        const k = (t * (.18 + s[i] * .22) + s[i]) % 1;
        pos.setXYZ(i, HEARTH.x + .2 + Math.sin(s[i] * 40 + t) * .3 * k, HEARTH.y + .3 + k * 2.4, HEARTH.z + (s[i] - .5) * 1.8 + Math.cos(s[i] * 30 + t * .7) * .2);
      }
      pos.needsUpdate = true;
      pts.material.opacity = .9;
      this.fire.intensity = (24 + Math.sin(t * 7.3) * 2.5 + Math.sin(t * 13.1) * 1.6 + Math.sin(t * 3.1) * 2) * (.15 + .85 * this.lit());
      pts.material.opacity = .9 * Math.min(1, this.lit());
    });
  }

  async place(x) {
    const spot = SPOTS[x.id];
    if (!spot) return;
    const group = new THREE.Group();
    group.position.fromArray(spot.at);
    group.rotation.y = spot.yaw || 0;
    this.scene.add(group);
    const entry = { x, group, spot, look: null };
    this.spots.push(entry);
    if (x.kind === 'weapon') await this.weapon(entry);
    else await this.mount(entry);
    group.traverse((m) => { if (m.isMesh) { m.userData.trophy = entry; this.pick.push(m); } });
  }

  async weapon(entry) {
    const { x, group, spot } = entry, theme = THEME[spot.theme];
    const stone = new THREE.MeshStandardMaterial({ color: this.stoneMap ? 0xb8a890 : 0x4a3d30, map: this.stoneMap || null, roughness: .85 }), trim = new THREE.MeshStandardMaterial({ color: 0xb08a3e, roughness: .4, metalness: .6 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.62, .72, .18, 32), stone);
    base.position.y = .09;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.34, .42, .82, 24), stone);
    col.position.y = .59;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.55, .48, .12, 32), stone);
    top.position.y = 1.06;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.52, .025, 8, 48), trim);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.12;
    group.add(base, col, top, ring);
    const g = x.model ? await this.load(x.model) : null;
    const blade = new THREE.Group();
    blade.position.y = 2.35;
    group.add(blade);
    if (g) {
      const w = g.scene, box = new THREE.Box3().setFromObject(w), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
      const long = Math.max(size.x, size.y, size.z), k = 2.3 / long;
      w.position.sub(mid).multiplyScalar(k);
      w.scale.setScalar(k);
      const hold = new THREE.Group(), axis = size.x === long ? 'x' : size.y === long ? 'y' : 'z', tip = -mid[axis];
      hold.add(w);
      if (axis === 'x') hold.rotation.z = tip > 0 ? Math.PI / 2 : -Math.PI / 2;
      else if (axis === 'z') hold.rotation.x = tip > 0 ? -Math.PI / 2 : Math.PI / 2;
      else if (tip > 0) hold.rotation.x = Math.PI;
      if (spot.up) { const flip = new THREE.Group(); flip.rotation.x = Math.PI; flip.add(hold); blade.add(flip); } else blade.add(hold);
      if (!x.have) ghost(w);
    }
    entry.look = { yaw: spot.look, pitch: .1, dist: 4.6, y: 2.3 };
    if (!x.have) return;
    const light = new THREE.PointLight(theme.light, 7, 6, 1.6);
    light.position.y = 2.3;
    group.add(light);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(theme.glow), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .55 }));
    halo.scale.set(2.4, 2.4, 1);
    halo.position.y = 2.35;
    group.add(halo);
    const n = 34, pts = sparks(n, theme.spark, spot.theme === 'storm' ? .06 : .08);
    group.add(pts);
    const s = pts.userData.seed, pos = pts.geometry.attributes.position;
    this.fx.push((t) => {
      blade.rotation.y = t * .55;
      blade.position.y = 2.35 + Math.sin(t * 1.3) * .07;
      halo.material.opacity = .45 + Math.sin(t * 2.1) * .1;
      light.intensity = spot.theme === 'storm' ? 6 + (Math.sin(t * 23 + Math.sin(t * 5) * 4) > .93 ? 9 : 0) : 7 + Math.sin(t * 6.1) * 1.2;
      for (let i = 0; i < n; i++) {
        if (spot.theme === 'storm') {
          const a = s[i] * 6.283 + t * (1.2 + s[i]), r = .45 + s[i] * .35;
          pos.setXYZ(i, Math.cos(a) * r, 1.4 + ((s[i] * 7 + t * .4) % 1) * 1.6, Math.sin(a) * r);
        } else {
          const k = (t * (.3 + s[i] * .3) + s[i]) % 1;
          pos.setXYZ(i, Math.sin(s[i] * 50) * (.25 + k * .2), 1.25 + k * 1.9, Math.cos(s[i] * 50) * (.25 + k * .2));
        }
      }
      pos.needsUpdate = true;
    });
  }

  async mount(entry) {
    const { x, group } = entry;
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.6, .16, 48), new THREE.MeshStandardMaterial({ color: this.stoneMap ? 0xa89880 : 0x3a2e22, map: this.stoneMap || null, roughness: .9 }));
    plinth.position.y = .08;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.44, .03, 8, 64), new THREE.MeshStandardMaterial({ color: 0xb08a3e, roughness: .4, metalness: .6 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = .17;
    group.add(plinth, ring);
    const g = await this.load(x.model);
    if (!g) return;
    const body = g.scene;
    body.scale.setScalar(x.scale || 1);
    body.position.y = .16;
    group.add(body);
    const mixer = new THREE.AnimationMixer(body), idle = g.animations.find((a) => a.name === 'idle');
    if (idle) mixer.clipAction(idle).play();
    mixer.update(.4);
    if (x.have) this.fx.push((t, dt) => mixer.update(dt));
    if (x.have) {
      const spot = new THREE.SpotLight(0xffe0b0, 30, 9, .55, .6, 1.3);
      spot.position.set(0, 6, 0);
      spot.target = body;
      group.add(spot);
    } else {
      ghost(body);
    }
    entry.look = { yaw: entry.spot.look, pitch: .18, dist: entry.spot.dist, y: entry.spot.y };
  }

  input() {
    const c = this.canvas;
    let drag = null, moved = 0, pinch = null;
    c.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; moved = 0; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      moved += Math.abs(dx) + Math.abs(dy);
      drag = { x: e.clientX, y: e.clientY };
      this.want.yaw = Math.max(this.center - SWING, Math.min(this.center + SWING, this.want.yaw - dx * .006));
      this.want.pitch = Math.max(-.05, Math.min(.75, this.want.pitch + dy * .004));
      this.idle = 0;
    });
    c.addEventListener('pointerup', (e) => { if (drag && moved < 6) this.tap(e); drag = null; });
    c.addEventListener('pointercancel', () => { drag = null; });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.want.dist = Math.max(3, Math.min(12, this.want.dist * (1 + Math.sign(e.deltaY) * .1))); this.idle = 0; }, { passive: false });
    c.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 2) { pinch = null; return; }
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pinch) this.want.dist = Math.max(3, Math.min(12, this.want.dist * pinch / d));
      pinch = d;
    }, { passive: true });
  }

  tap(e) {
    const r = this.canvas.getBoundingClientRect(), p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(p, this.camera);
    const hit = ray.intersectObjects(this.pick, false)[0];
    if (hit) this.go(hit.object.userData.trophy);
    else if (this.focus) this.home();
  }

  go(entry) {
    if (!entry || !entry.look) { if (entry) this.card(entry); return; }
    const l = entry.look, w = entry.group.position;
    this.focus = entry;
    this.want = { target: new THREE.Vector3(w.x, l.y, w.z), yaw: l.yaw, pitch: l.pitch, dist: l.dist };
    this.center = l.yaw;
    this.idle = -6;
    this.card(entry);
  }

  home() {
    this.focus = null;
    this.want = { target: HOME.target.clone(), yaw: HOME.yaw, pitch: HOME.pitch, dist: HOME.dist };
    this.center = HOME.yaw;
    this.card(null);
  }

  card(entry) {
    for (const b of this.box.querySelectorAll('[data-go]')) b.classList.toggle('on', !!entry && +b.dataset.go === entry.x.id);
    const el = this.box.querySelector('.trcard');
    if (!entry) { el.classList.remove('show'); return; }
    const x = entry.x;
    el.innerHTML = `<img src="assets/icons/${x.icon}.png" alt=""><span><small>${x.kind === 'weapon' ? 'Legendary' : 'Mount'}</small><b class="${x.have ? '' : 'dim'}">${esc(x.have ? x.name : 'Not yet yours')}</b><em>${esc(x.line)}</em></span>`;
    el.classList.add('show');
  }

  resize() {
    const w = this.box.clientWidth || 1, h = this.box.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 58 : 46;
    this.reach = w < h ? Math.min(1.35, 1 + (h / w - 1) * .4) : 1;
    this.camera.updateProjectionMatrix();
  }

  frame() {
    const dt = Math.min(.05, this.clock.getDelta()), t = this.clock.elapsedTime;
    this.idle += dt;
    if (this.idle > 4 && !this.still) this.want.yaw = this.center + Math.sin((this.idle - 4) * .12) * SWING * .55;
    const v = this.view, w = this.want, k = 1 - Math.exp(-dt * 2.6);
    v.target.lerp(w.target, k);
    v.yaw += (w.yaw - v.yaw) * k;
    v.pitch += (w.pitch - v.pitch) * k;
    v.dist += (w.dist - v.dist) * k;
    const d = v.dist * (this.reach || 1);
    this.camera.position.set(v.target.x + Math.sin(v.yaw) * Math.cos(v.pitch) * d, v.target.y + Math.sin(v.pitch) * d, v.target.z + Math.cos(v.yaw) * Math.cos(v.pitch) * d);
    this.camera.lookAt(v.target);
    pulse.value = Math.sin(t * 1.4);
    for (const f of this.fx) f(t, dt);
    this.renderer.render(this.scene, this.camera);
  }

  lit() {
    if (this.litAt == null) return 0;
    const k = Math.max(0, Math.min(1, (this.clock.elapsedTime - this.litAt) / 1.5));
    return k * (1 + Math.sin(Math.PI * k) * .45);
  }

  start() { this.litAt = this.clock.elapsedTime + .35; this.renderer.setAnimationLoop(() => this.frame()); }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.ro.disconnect();
    this.renderer.dispose();
  }
}

let open = null;

export async function openTrophyHall(items) {
  if (open) return;
  const box = document.createElement('div');
  box.className = 'troph';
  const have = items.filter((x) => x.have).length;
  box.innerHTML = `<canvas></canvas><div class="trveil"><b>Lighting the hearth</b></div><header class="trtop"><span><small>Your Trophy Hall</small><b>The Lion's Pride Inn</b><em>${have} of ${items.length} trophies</em></span><span class="trbtns"><button class="trsound" aria-label="Sound"></button><button class="trclose" aria-label="Close">✕</button></span></header><div class="trcard"></div><nav class="trdots">${items.map((x) => `<button data-go="${x.id}" class="${x.have ? 'have' : ''}" title="${esc(x.have ? x.name : 'Not yet yours')}"><img src="assets/icons/${x.icon}.png" alt=""></button>`).join('')}</nav>`;
  if (!document.querySelector('link[data-trophy]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset.trophy = '1';
    link.href = new URL('./trophy.css', import.meta.url).href;
    document.head.append(link);
  }
  document.body.append(box);
  document.body.classList.add('trophyopen');
  const hall = new Hall(box, items), sound = new Sounds(), mute = box.querySelector('.trsound');
  open = hall;
  const showMute = () => { mute.textContent = sound.off ? '🔇' : '🔊'; mute.setAttribute('aria-pressed', sound.off ? 'true' : 'false'); mute.title = sound.off ? 'Sound off' : 'Sound on'; };
  showMute();
  mute.onclick = () => { sound.toggle(); showMute(); };
  const away = () => sound.pause(document.hidden);
  document.addEventListener('visibilitychange', away);
  const close = () => { sound.stop(); hall.dispose(); box.classList.add('out'); document.body.classList.remove('trophyopen'); document.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', away); setTimeout(() => box.remove(), 350); open = null; };
  const key = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', key);
  box.querySelector('.trclose').onclick = close;
  for (const b of box.querySelectorAll('[data-go]')) b.onclick = () => hall.go(hall.spots.find((s) => s.x.id === +b.dataset.go));
  window.trophyHall = hall;
  await hall.build();
  if (open !== hall) return;
  hall.start();
  sound.enter();
  box.querySelector('.trveil').classList.add('gone');
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch {}
  const fresh = hall.spots.find((s) => s.x.have && !seen.includes(s.x.id));
  try { localStorage.setItem(SEEN, JSON.stringify(items.filter((x) => x.have).map((x) => x.id))); } catch {}
  if (fresh) setTimeout(() => { if (open === hall) { hall.go(fresh); box.querySelector('.trcard').classList.add('new'); } }, 2600);
}
