import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FIRES, BANNERS, BANNER_HOOKS, REWARD, decorOf, rewardFor } from './paths.js';
import { paintBanner, bannerThumb, loadEmblems } from './banners.js';
import { BANNER_TIERS } from './paths.js';

const ROOT = 'assets/draft/hall/';
const AREAS = [
  { id: 'hall', name: 'The Common Room', note: 'Legendaries, mounts and raid trophies', home: { target: [-2.2, 1.5, 0], yaw: 1.4, pitch: .13, dist: 9 }, swing: 1.15 },
  { id: 'cellar', name: 'The Cellar', note: 'World Boss trophies', home: { target: [2.2, -4.3, -33.4], yaw: 0, pitch: .1, dist: 7.2 }, swing: .42, min: 3, max: 7.4, wide: 72 },
  { id: 'loft', name: 'The Dreaming Loft', note: 'Dragons of Nightmare trophies', home: { target: [-4.3, 9.3, -27], yaw: 0, pitch: .14, dist: 8.2 }, swing: .55, min: 3, max: 8.8, wide: 72 },
];
const AREA = Object.fromEntries(AREAS.map((a) => [a.id, a]));
const REACH = { hall: 13, cellar: 9, loft: 8 };
const homeOf = (id) => { const h = AREA[id].home; return { target: new THREE.Vector3(...h.target), yaw: h.yaw, pitch: h.pitch, dist: h.dist }; };
const HOME = homeOf('hall');
const SPOTS = {
  19019: { at: [-4.4, 0, -2.8], theme: 'storm', look: 1.2, clear: 2 },
  17182: { at: [-4.4, 0, 2.8], theme: 'fire', look: 1.7, clear: 2 },
  21175: { at: [-2.4, 0, 0], theme: 'sand', look: 1.45, clear: 2, up: 1 },
  19872: { at: [-.4, 0, -3.9], yaw: .93, look: 1.15, clear: 2, y: 1.9, dist: 6.8 },
  19902: { at: [-.4, 0, 3.9], yaw: 2.21, look: 2.75, clear: 2, y: 1.1, dist: 5.2 },
  21220: { at: [-6.74, 4.12, .05], look: 1.5, clear: 0, y: 4.1, dist: 3.4 },
  990205: { at: [2.2, -3.05, -36.6], yaw: -Math.PI / 2, look: 0, clear: 2.6, y: -3.1, dist: 4.4, size: 1.4 },
  990201: { at: [-2.7, -3.0, -36.66], look: 0, clear: 1.2, y: -3.1, dist: 4.4 },
  17112: { at: [7.1, -3.7, -36.6], look: 0, clear: 1.2, y: -3.7, dist: 4.2 },
  990204: { at: [-1.5, -6.73, -34.1], yaw: .85, look: .2, clear: 2.4, y: -5.1, dist: 5.6 },
  990202: { at: [6.1, -6.73, -34.2], look: -.15, clear: 2.2, y: -5.3, dist: 3.4 },
  990215: { at: [-9.4, 9.9, -29.4], look: Math.PI / 2, clear: 1.6, y: 9.8, dist: 4.2, size: 1.3 },
  990211: { at: [-9.38, 9.2, -23.4], yaw: Math.PI / 2, look: Math.PI / 2, clear: 1.4, y: 9.1, dist: 4.4 },
  20577: { at: [.86, 9.0, -26.5], yaw: -Math.PI / 2, look: -Math.PI / 2, clear: 1.4, y: 9, dist: 4.2 },
  990214: { at: [-4.3, 7.29, -27.4], yaw: .6, look: .25, clear: 3, y: 9.2, dist: 6.4 },
  990212: { at: [-7.6, 7.29, -30.6], look: .35, clear: 1.4, y: 9.1, dist: 3.4 },
  990216: { at: [-.98, 7.29, -31.28], look: -1.35, clear: 1.6, y: 8.5, dist: 3 },
  990217: { at: [-.22, 7.29, -31.28], look: -1.35, clear: 1.6, y: 8.5, dist: 3 },
  990218: { at: [-.98, 7.29, -30.52], look: -1.35, clear: 1.6, y: 8.5, dist: 3 },
  990219: { at: [-.22, 7.29, -30.52], look: -1.35, clear: 1.6, y: 8.5, dist: 3 },
};
const SHRINE = [-.6, 7.29, -30.9];
const HEAD_IDS = [['ysondre', 'Ysondre'], ['lethon', 'Lethon'], ['emeriss', 'Emeriss'], ['taerar', 'Taerar']];
const HEADS = {
  21220: { model: 'assets/raid/gear/ossirian.glb', cut: 6.3, scale: .56, tilt: .22, at: [.54, -.5, 0] },
  990205: { model: 'assets/raid/gear/kazzak.glb', cut: 5.9, scale: .37, tilt: .2, at: [.5, -.36, 0], half: 1.9, back: -.4, top: 8.8, ring: 0x3a8a2a, glow: 0x7dff5a },
  990215: { model: 'assets/raid/gear/lethon.glb', cut: 3.2, scale: .22, tilt: .12, at: [.05, -.3, 0], half: 2.4, back: 4.6, shift: 4.6, top: 9.3, ring: 0x2f8a5c, glow: 0x6dffb0 },
};
const KIND = { weapon: 'Legendary', head: 'Trophy', mount: 'Mount', trophy: 'Trophy', painting: 'Painting', jar: 'Curio', rack: 'Weapon', steed: 'Mount', relic: 'Relic' };
const RARITY = { Common: '#ffffff', Uncommon: '#1eff00', Rare: '#0070dd', Epic: '#a335ee', Legendary: '#ff8000' };
const pulse = { value: 0 };
const veil = new THREE.MeshBasicMaterial({ colorWrite: false });
const spirit = new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, depthWrite: false, depthFunc: THREE.LessEqualDepth, blending: THREE.AdditiveBlending });
spirit.onBeforeCompile = (sh) => {
  sh.uniforms.pulse = pulse;
  sh.fragmentShader = 'uniform float pulse;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
    float rim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.2);
    gl_FragColor = vec4(vec3(1.0, .76, .4) * (.035 + rim * (.55 + .18 * pulse)), 1.0);`);
};
function ghost(root, planes) {
  const mats = planes ? [veil.clone(), spirit.clone()] : [veil, spirit];
  if (planes) { mats[1].onBeforeCompile = spirit.onBeforeCompile; for (const mt of mats) mt.clippingPlanes = planes; }
  root.traverse((m) => {
    if (!m.isMesh) return;
    const g = m.geometry, n = g.index ? g.index.count : g.attributes.position.count;
    g.clearGroups();
    g.addGroup(0, n, 0);
    g.addGroup(0, n, 1);
    m.material = mats;
    m.renderOrder = 10;
  });
}
const THEME = {
  storm: { light: 0x7fc8ff, glow: '#9fdcff', spark: 0xbfe8ff },
  fire: { light: 0xff7a2a, glow: '#ffb15a', spark: 0xffa040 },
  sand: { light: 0xffcf6a, glow: '#ffe2a0', spark: 0xffd98a },
};
const HOOKS = [[-6.74, 3.55, -3.95], [-6.74, 3.55, 2.85], [-6.74, 3.55, -3.15], [-6.74, 3.55, 3.65]];
const BRAZIER = [2.2, -6.73, -35.5];
const FIRE = new THREE.Vector3(-6.4, 1.6, .06), HEARTH = new THREE.Vector3(-7.7, .25, .05);
const SEEN = 'trophySeen', MUTE = 'trophyMute';
const areaOf = (x) => x.area || 'hall';

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
    this.decorOpen = new Set((opts && opts.decor && opts.decor.open) || []);
    this.tiers = (opts && opts.decor && opts.decor.tiers) || {};
    this.look = decorOf(opts && opts.decor ? opts.decor.pick : null, this.decorOpen);
    this.heads = (opts && opts.decor && opts.decor.heads) || [];
    this.hung = [];
    this.canvas = box.querySelector('canvas');
    this.loader = new GLTFLoader();
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(max-width: 760px)').matches ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.localClippingEnabled = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0805);
    this.scene.fog = new THREE.Fog(0x120a05, 14, 34);
    this.camera = new THREE.PerspectiveCamera(46, 1, .1, 120);
    this.clock = new THREE.Clock();
    this.area = 'hall';
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
      if (!g || spots.some((p) => (d.p[1] < 2 || (p.at[1] > 6 && Math.abs(d.p[1] - p.at[1]) < 3.5)) && Math.hypot(d.p[0] - p.at[0], d.p[2] - p.at[2]) < p.clear)) continue;
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
    this.cellar();
    this.loft();
    await loadEmblems();
    this.decorate();
    await Promise.all(this.items.map((x) => this.place(x)));
  }

  load(url) { return this.loader.loadAsync(url).catch(() => null); }

  decorate() {
    this.hangBanners(this.look.banners);
    this.setBrazier(this.look.brazier);
  }

  paintFire(id) {
    const f = FIRES.find((x) => x.id === id) || FIRES[0], h = this.hearthFx;
    if (!h) return;
    const swap = (mat, color) => { if (mat.map) mat.map.dispose(); mat.map = glowTexture(color); mat.needsUpdate = true; };
    h.flames.forEach((s, i) => swap(s.material, i % 3 ? f.flame[0] : f.flame[1]));
    swap(h.bed.material, f.bed);
    h.pts.material.color.setHex(f.spark);
    this.fire.color.setHex(f.light);
  }

  hangBanners(ids) {
    for (const g of this.hung) g.removeFromParent();
    this.hung = ids.slice(0, BANNER_HOOKS).map((id, i) => this.banner(BANNERS.find((b) => b.id === id), HOOKS[i]));
  }

  setBrazier(on) {
    if (on && !this.brazierGroup) this.brazier();
    if (this.brazierGroup) this.brazierGroup.visible = !!on;
  }

  setDecor(look) {
    this.look = look;
    this.paintFire(look.fire);
    this.hangBanners(look.banners);
    this.setBrazier(look.brazier);
    if (this.headOf() !== this.shownHead) this.setHead();
  }

  headOf() {
    return this.heads.includes(this.look.head) ? this.look.head : this.heads[0] || 'lethon';
  }

  async setHead() {
    const entry = this.spots.find((e) => e.x.id === 990215);
    if (!entry) return;
    const ticket = (this.headTicket = (this.headTicket || 0) + 1), next = new THREE.Group();
    next.position.copy(entry.group.position);
    next.rotation.copy(entry.group.rotation);
    next.scale.copy(entry.group.scale);
    const keep = entry.lights;
    entry.lights = keep ? [...keep] : null;
    await this.head(entry, next);
    if (ticket !== this.headTicket) return;
    if (this.renderer.compileAsync) await this.renderer.compileAsync(next, this.camera, this.scene).catch(() => {});
    if (ticket !== this.headTicket) return;
    this.pick = this.pick.filter((m) => m.userData.trophy !== entry);
    for (const c of [...entry.group.children]) if (!c.isLight) entry.group.remove(c);
    for (const c of [...next.children]) { if (c.isLight) { if (c.parent !== entry.group) entry.group.add(c); continue; } entry.group.add(c); }
    entry.group.updateMatrixWorld(true);
    entry.group.traverse((m) => { if (m.isMesh && !m.userData.skip) { m.userData.trophy = entry; this.pick.push(m); } });
  }

  lightArea(id) {
    const v = new THREE.Vector3(), c = new THREE.Vector3(...AREA[id].home.target);
    this.scene.updateMatrixWorld(true);
    this.scene.traverse((o) => {
      if (!o.isPointLight && !o.isSpotLight) return;
      o.getWorldPosition(v);
      o.visible = !o.distance || v.distanceTo(c) < o.distance + REACH[id];
    });
  }

  banner(b, at) {
    const tier = this.tiers[b.id] || 1, tex = new THREE.CanvasTexture(paintBanner(document.createElement('canvas'), b, tier));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const geo = new THREE.PlaneGeometry(.8, 1.6, 6, 12), base = geo.attributes.position.array.slice();
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .4, side: THREE.DoubleSide, roughness: .95, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: [0, .06, .16][tier - 1] });
    const cloth3 = new THREE.Mesh(geo, mat);
    const group = new THREE.Group();
    cloth3.position.y = -.8;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a2a, metalness: .7, roughness: .4 }));
    pole.rotation.z = Math.PI / 2;
    group.add(cloth3, pole);
    group.position.fromArray(at);
    group.rotation.y = Math.PI / 2;
    group.scale.setScalar(.85);
    this.scene.add(group);
    const k = Math.random() * 9, pos = geo.attributes.position;
    this.fx.push((t) => {
      if (this.still || !group.parent) return;
      for (let i = 0; i < pos.count; i++) {
        const y = base[i * 3 + 1], drop = (.8 - y) / 1.6;
        pos.array[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * 1.6 + k + y * 3 + base[i * 3] * 2) * .035 * drop;
      }
      pos.needsUpdate = true;
    });
    return group;
  }

  brazier() {
    const grp = this.brazierGroup = new THREE.Group();
    this.scene.add(grp);
    const at = new THREE.Vector3(...BRAZIER), iron = new THREE.MeshStandardMaterial({ color: 0x1e1a14, metalness: .7, roughness: .45 });
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.42, .22, .26, 18, 1, true), iron);
    bowl.position.set(at.x, at.y + .95, at.z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.06, .14, .9, 10), iron);
    stem.position.set(at.x, at.y + .45, at.z);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(.32, .38, .06, 18), iron);
    foot.position.set(at.x, at.y + .03, at.z);
    const coals = new THREE.Mesh(new THREE.CircleGeometry(.38, 18), new THREE.MeshBasicMaterial({ color: 0x3aff2a }));
    coals.rotation.x = -Math.PI / 2;
    coals.position.set(at.x, at.y + 1.02, at.z);
    const light = new THREE.PointLight(0x5aff3a, 9, 7, 1.5);
    light.position.set(at.x, at.y + 1.6, at.z);
    grp.add(bowl, stem, foot, coals, light);
    const flames = [];
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(i % 2 ? '#4aff2a' : '#c8ffb0'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .85 }));
      f.userData.k = Math.random() * 9;
      f.userData.dx = (Math.random() - .5) * .3;
      f.userData.dz = (Math.random() - .5) * .3;
      grp.add(f);
      flames.push(f);
    }
    const n = 30, pts = sparks(n, 0x8aff6a, .06);
    grp.add(pts);
    const seed = pts.userData.seed, pp = pts.geometry.attributes.position;
    this.fx.push((t) => {
      for (const f of flames) { const k = f.userData.k, h = .9 + Math.sin(t * 7 + k) * .25 + Math.sin(t * 13 + k) * .1; f.scale.set(.42, .8 * h, 1); f.position.set(at.x + f.userData.dx, at.y + 1.25 + h * .2, at.z + f.userData.dz); }
      light.intensity = 8 + Math.sin(t * 9) * 1.4 + Math.sin(t * 4.3) * 1.1;
      for (let i = 0; i < n; i++) { const q = (t * (.25 + seed[i] * .3) + seed[i]) % 1; pp.setXYZ(i, at.x + Math.sin(seed[i] * 50 + t) * .25 * q, at.y + 1.1 + q * 1.8, at.z + Math.cos(seed[i] * 40 + t) * .25 * q); }
      pp.needsUpdate = true;
    });
  }

  cellar() {
    const lamp = new THREE.PointLight(0xffb070, 16, 13, 1.4);
    lamp.position.set(2.2, -1.4, -31.5);
    const fill = new THREE.PointLight(0xff9a50, 6, 10, 1.6);
    fill.position.set(2.2, -2.4, -25.5);
    this.scene.add(lamp, fill);
    const owned = this.items.some((x) => areaOf(x) === 'cellar' && x.have);
    const wax = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: .7 }), iron = new THREE.MeshStandardMaterial({ color: 0x2a2018, metalness: .6, roughness: .5 });
    const flames = [];
    for (const x of [.15, 4.25]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(.08, .08, .34), iron);
      arm.position.set(x, -3.95, -36.52);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(.11, .08, .06, 12), iron);
      cup.position.set(x, -3.9, -36.38);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .26, 10), wax);
      candle.position.set(x, -3.74, -36.38);
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(owned ? '#9dff6a' : '#ffb04a'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      flame.position.set(x, -3.52, -36.38);
      flame.userData.k = Math.random() * 9;
      const glow = new THREE.PointLight(owned ? 0x8dff5a : 0xffa04a, 1.6, 3.2, 1.6);
      glow.position.set(x, -3.45, -36.1);
      this.scene.add(arm, cup, candle, flame, glow);
      flames.push([flame, glow]);
    }
    this.fx.push((t) => { for (const [f, l] of flames) { const k = f.userData.k, h = .9 + Math.sin(t * 9 + k) * .12 + Math.sin(t * 17 + k * 2) * .06; f.scale.set(.2 * h, .36 * h, 1); l.intensity = 1.4 * h; } });
    if (!owned) return;
    const n = 30, motes = sparks(n, 0x8dff5a, .05);
    this.scene.add(motes);
    const seed = motes.userData.seed, pos = motes.geometry.attributes.position;
    this.fx.push((t) => {
      for (let i = 0; i < n; i++) { const k = (t * (.04 + seed[i] * .05) + seed[i]) % 1; pos.setXYZ(i, -3.5 + seed[i] * 11 + Math.sin(t * .4 + seed[i] * 30) * .4, -6.6 + k * 5.6, -36.2 + ((seed[i] * 7.3) % 1) * 4); }
      pos.needsUpdate = true;
      motes.material.opacity = .55;
    });
    const fel = new THREE.PointLight(0x6dff4a, 1.6, 6, 1.8);
    fel.position.set(2.2, -4.6, -35.9);
    this.scene.add(fel);
    this.fx.push((t) => { fel.intensity = 1.5 + Math.sin(t * 2.3) * .4 + Math.sin(t * 7.1) * .15; });
  }

  loft() {
    const owned = this.items.some((x) => areaOf(x) === 'loft' && x.have);
    const moon = new THREE.PointLight(owned ? 0x7dffc0 : 0x9fb8d8, 14, 14, 1.4);
    moon.position.set(-4.3, 12.6, -30.5);
    const fill = new THREE.PointLight(0xffc88a, 7, 12, 1.5);
    fill.position.set(-4.3, 11.2, -19.5);
    const lamp = new THREE.PointLight(0xffb070, 5, 7, 1.6);
    lamp.position.set(-7.6, 9.6, -30.4);
    this.scene.add(moon, fill, lamp);
    if (!owned) return;
    const n = 36, motes = sparks(n, 0x8dffc0, .05);
    this.scene.add(motes);
    const seed = motes.userData.seed, pos = motes.geometry.attributes.position;
    this.fx.push((t) => {
      for (let i = 0; i < n; i++) { const k = (t * (.03 + seed[i] * .04) + seed[i]) % 1; pos.setXYZ(i, -9 + seed[i] * 9.5 + Math.sin(t * .35 + seed[i] * 30) * .5, 7.4 + k * 5.2, -32 + ((seed[i] * 7.3) % 1) * 14); }
      pos.needsUpdate = true;
      motes.material.opacity = .5;
      moon.intensity = 13 + Math.sin(t * .7) * 2;
    });
  }

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
      const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: null, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 }));
      f.position.set(HEARTH.x, HEARTH.y + .35, HEARTH.z + (i - 3) * .32);
      f.userData.k = Math.random() * 10;
      this.scene.add(f);
      flames.push(f);
    }
    const bed = new THREE.Sprite(new THREE.SpriteMaterial({ map: null, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 }));
    bed.position.set(HEARTH.x, HEARTH.y + .15, HEARTH.z);
    bed.scale.set(3, 1.1, 1);
    this.scene.add(bed);
    this.fx.push((t) => {
      const lit = this.lit();
      bed.material.opacity = .9 * lit;
      for (const f of flames) { const k = f.userData.k, h = (.9 + Math.sin(t * 6 + k) * .25 + Math.sin(t * 11 + k * 2) * .12) * lit; f.scale.set((.75 + Math.sin(t * 4 + k) * .1) * Math.min(1, lit * 1.4), h * 1.3, 1); f.position.y = HEARTH.y + .2 + h * .45; }
    });
    const n = 46, pts = sparks(n, 0xffa24a, .07);
    this.hearthFx = { flames, bed, pts };
    this.paintFire(this.look.fire);
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
    group.scale.setScalar(spot.size || 1);
    this.scene.add(group);
    const entry = { x, group, spot, look: null };
    this.spots.push(entry);
    if (x.kind === 'weapon') await this.weapon(entry);
    else if (x.kind === 'head' || x.kind === 'trophy') await this.head(entry);
    else if (x.kind === 'painting') await this.painting(entry);
    else if (x.kind === 'jar') await this.jar(entry);
    else if (x.kind === 'rack') await this.rack(entry);
    else if (x.kind === 'relic') this.relic(entry);
    else await this.mount(entry);
    group.traverse((m) => { if (m.isMesh && !m.userData.skip) { m.userData.trophy = entry; this.pick.push(m); } });
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

  async head(entry, into) {
    const { x, spot } = entry, group = into || entry.group, HEAD = { ...HEADS[x.id], ...((window.HEADTUNE || {})[x.id] || {}) };
    if (x.id === 990215) { this.shownHead = this.headOf(); HEAD.model = `assets/raid/gear/${this.shownHead}.glb`; }
    const board = new THREE.Mesh(new THREE.CylinderGeometry(.66, .7, .1, 40), new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: .8 }));
    board.rotation.z = Math.PI / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.67, .035, 8, 64), new THREE.MeshStandardMaterial({ color: HEAD.ring || 0xb08a3e, roughness: .4, metalness: .6, ...(HEAD.ring && { emissive: HEAD.ring, emissiveIntensity: .35 }) }));
    ring.rotation.y = Math.PI / 2;
    ring.position.x = .06;
    group.add(board, ring);
    entry.look = { yaw: spot.look, pitch: .12, dist: spot.dist, y: spot.y };
    const g = await this.load(HEAD.model);
    if (!g) return;
    const body = g.scene, idle = g.animations.find((a) => a.name === 'idle');
    if (idle) { const mixer = new THREE.AnimationMixer(body); mixer.clipAction(idle).play(); mixer.update(.4); }
    const hold = new THREE.Group(), turn = new THREE.Group();
    hold.position.fromArray(HEAD.at);
    hold.rotation.z = HEAD.tilt;
    turn.rotation.y = Math.PI / 2;
    body.scale.setScalar(HEAD.scale);
    body.position.y = -HEAD.cut * HEAD.scale;
    if (HEAD.shift) body.position.z = -HEAD.shift * HEAD.scale;
    turn.add(body);
    hold.add(turn);
    group.add(hold);
    group.updateMatrixWorld(true);
    const planes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -HEAD.cut)];
    if (HEAD.half) planes.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), HEAD.half), new THREE.Plane(new THREE.Vector3(-1, 0, 0), HEAD.half));
    if (HEAD.back != null) planes.push(new THREE.Plane(new THREE.Vector3(0, 0, 1), -HEAD.back));
    if (HEAD.top) planes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), HEAD.top));
    for (const p of planes) p.applyMatrix4(body.matrixWorld);
    body.traverse((m) => { if (!m.isMesh) return; m.frustumCulled = false; m.userData.skip = true; for (const mt of [].concat(m.material)) mt.clippingPlanes = planes; });
    if (!x.have) { ghost(body, planes); return; }
    const cap = new THREE.MeshBasicMaterial({ color: 0x4a2c14, side: THREE.BackSide, clippingPlanes: planes }), skins = [];
    body.traverse((m) => { if (m.isMesh) skins.push(m); });
    for (const m of skins) { const c = m.clone(); c.material = cap; c.userData.skip = true; m.parent.add(c); }
    if (!entry.lights) {
      const light = new THREE.SpotLight(0xffe0b0, 14, 5, .6, .6, 1.3);
      light.position.set(2.6, 1.4, 0);
      entry.lights = [light];
      if (HEAD.glow) { const g = new THREE.PointLight(HEAD.glow, 1, 2.6, 1.6); g.position.set(.9, .2, 0); entry.lights.push(g); this.fx.push((t) => { g.intensity = .9 + Math.sin(t * 2.7) * .3; }); }
    }
    entry.lights[0].target = hold;
    for (const l of entry.lights) if (!into || !l.parent) group.add(l);
  }

  frameBox(w, h, depth, color) {
    const wood = new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .25 }), out = new THREE.Group(), bar = .14;
    for (const [sx, sy, px, py] of [[w + bar * 2, bar, 0, h / 2 + bar / 2], [w + bar * 2, bar, 0, -h / 2 - bar / 2], [bar, h, -w / 2 - bar / 2, 0], [bar, h, w / 2 + bar / 2, 0]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, depth), wood);
      m.position.set(px, py, 0);
      out.add(m);
    }
    return out;
  }

  plate(text, w = .9) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 96;
    const g = c.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, 96);
    grad.addColorStop(0, '#f3d27a'); grad.addColorStop(.5, '#b8862e'); grad.addColorStop(1, '#7a5418');
    g.fillStyle = grad; g.fillRect(0, 0, 512, 96);
    g.strokeStyle = '#4a3010'; g.lineWidth = 6; g.strokeRect(6, 6, 500, 84);
    g.fillStyle = '#2a1806'; g.font = '44px Morpheus, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 256, 52, 470);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, w * 96 / 512, .03), new THREE.MeshStandardMaterial({ map: tex, metalness: .5, roughness: .45 }));
    m.userData.skip = true;
    return m;
  }

  async painting(entry) {
    const { x, group, spot } = entry, w = 2.7, h = 1.8;
    group.add(this.frameBox(w, h, .12, 0xb08a3e));
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0x1a0f08, roughness: 1 }));
    back.position.z = -.02;
    group.add(back);
    entry.look = { yaw: spot.look, pitch: .02, dist: spot.dist, y: spot.y };
    if (!x.have) { const sheen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), spirit); sheen.position.z = .01; sheen.renderOrder = 10; group.add(sheen); return; }
    const tex = await new THREE.TextureLoader().loadAsync(ROOT + (x.art || 'blasted.webp')).catch(() => null);
    if (!tex) return;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: .9 }));
    art.position.z = .01;
    group.add(art);
    const lip = this.frameBox(w - .06, h - .06, .05, 0x2a1806);
    lip.scale.setScalar(.985);
    lip.position.z = .03;
    group.add(lip);
    const tag = this.plate(x.name);
    tag.position.set(0, -h / 2 - .26, .06);
    group.add(tag);
    const light = new THREE.SpotLight(0xffe2b8, 18, 6, .5, .7, 1.2);
    light.position.set(0, 1.9, 1.8);
    light.target = art;
    group.add(light);
  }

  shrine() {
    if (this.shrineBase) return;
    const stone = new THREE.MeshStandardMaterial({ color: this.stoneMap ? 0xb8a890 : 0x4a3d30, map: this.stoneMap || null, roughness: .85 }), trim = new THREE.MeshStandardMaterial({ color: 0xb08a3e, roughness: .4, metalness: .6 });
    const g = new THREE.Group();
    g.position.fromArray(SHRINE);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.78, .9, .34, 8), stone);
    base.position.y = .17;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.72, .76, .1, 8), stone);
    top.position.y = .39;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.74, .022, 8, 48), trim);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = .44;
    g.add(base, top, ring);
    for (const [dx, dz] of [[-.38, -.38], [.38, -.38], [-.38, .38], [.38, .38]]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, .28, 10), stone);
      col.position.set(dx, .58, dz);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(.12, .06, .06, 12), trim);
      cup.position.set(dx, .75, dz);
      g.add(col, cup);
    }
    this.scene.add(g);
    this.shrineBase = g;
    const owned = this.items.filter((x) => x.kind === 'relic' && x.have).length;
    if (owned < 4) return;
    const heart = new THREE.PointLight(0x6dffb0, 6, 4, 1.5);
    heart.position.set(SHRINE[0], SHRINE[1] + 1.5, SHRINE[2]);
    this.scene.add(heart);
    const n = 24, motes = sparks(n, 0x9dffd0, .04);
    this.scene.add(motes);
    const seed = motes.userData.seed, pos = motes.geometry.attributes.position;
    this.fx.push((t) => {
      for (let i = 0; i < n; i++) { const a = t * (.4 + seed[i] * .5) + seed[i] * 20, k = (t * .12 + seed[i]) % 1; pos.setXYZ(i, SHRINE[0] + Math.cos(a) * (.25 + seed[i] * .4), SHRINE[1] + 1 + k * 1.6, SHRINE[2] + Math.sin(a) * (.25 + seed[i] * .4)); }
      pos.needsUpdate = true;
      motes.material.opacity = .8;
      heart.intensity = 5 + Math.sin(t * 1.3) * 1.5;
    });
  }

  relic(entry) {
    const { x, group, spot } = entry, c = x.color || 0x9dffd0;
    this.shrine();
    entry.look = { yaw: spot.look, pitch: .25, dist: spot.dist, y: spot.y };
    const mat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .55, roughness: .22, metalness: .25 });
    let gem;
    if (x.dragon === 'ysondre') { const pts = []; for (let i = 0; i <= 12; i++) { const a = i / 12; pts.push(new THREE.Vector2(Math.sin(a * Math.PI) * .1 * (1 - a * .55) + .001, a * .3)); } gem = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), mat); gem.rotation.x = Math.PI; gem.position.y = .3; }
    else if (x.dragon === 'lethon') { gem = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .035, 6), mat); gem.rotation.x = 1.1; }
    else if (x.dragon === 'emeriss') { gem = new THREE.Mesh(new THREE.IcosahedronGeometry(.12, 0), mat); gem.scale.set(1, 1.15, .9); }
    else { gem = new THREE.Mesh(new THREE.SphereGeometry(.1, 20, 14), mat); const iris = new THREE.Mesh(new THREE.TorusGeometry(.065, .018, 8, 24), new THREE.MeshStandardMaterial({ color: 0x0a1a3a, roughness: .4 })); iris.position.z = .085; gem.add(iris); }
    const hold = new THREE.Group();
    hold.position.y = .96;
    hold.add(gem);
    group.add(hold);
    if (!x.have) { ghost(hold); return; }
    const glow = new THREE.PointLight(c, 1.6, 1.8, 1.6);
    glow.position.y = 1;
    group.add(glow);
    const k = (x.id % 7) * .9;
    this.fx.push((t) => { hold.rotation.y = t * .6 + k; hold.position.y = .96 + Math.sin(t * 1.4 + k) * .03; glow.intensity = 1.4 + Math.sin(t * 2.3 + k) * .4; });
  }

  async jar(entry) {
    const { x, group, spot } = entry, stone = new THREE.MeshStandardMaterial({ color: this.stoneMap ? 0xb8a890 : 0x4a3d30, map: this.stoneMap || null, roughness: .85 }), trim = new THREE.MeshStandardMaterial({ color: 0xb08a3e, roughness: .4, metalness: .6 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.42, .5, 1.05, 24), stone);
    base.position.y = .52;
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(.5, .46, .08, 24), trim);
    lip.position.y = 1.08;
    const pane = new THREE.MeshStandardMaterial({ color: 0xbfffd0, transparent: true, opacity: .16, roughness: .05, metalness: .1, side: THREE.DoubleSide, depthWrite: false });
    let glass;
    if (x.dome) {
      const cushion = new THREE.Mesh(new THREE.CylinderGeometry(.4, .44, .1, 28), new THREE.MeshStandardMaterial({ color: 0x1f5a3a, roughness: .9 }));
      cushion.position.y = 1.17;
      glass = new THREE.Mesh(new THREE.SphereGeometry(.47, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), pane);
      glass.position.y = 1.12;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(.06, 12, 8), trim);
      knob.position.y = 1.62;
      group.add(base, lip, cushion, glass, knob);
    } else {
      glass = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .92, 32, 1, true), pane);
      glass.position.y = 1.58;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(.37, .37, .08, 24), trim);
      cap.position.y = 2.07;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), trim);
      knob.position.y = 2.16;
      group.add(base, lip, glass, cap, knob);
    }
    glass.userData.skip = true;
    entry.look = { yaw: spot.look, pitch: .12, dist: spot.dist, y: spot.y };
    const g = await this.load(x.inside || 'assets/raid/gear/imp.glb');
    if (!g) return;
    const imp = g.scene, box = new THREE.Box3().setFromObject(imp), size = box.getSize(new THREE.Vector3()), k = x.dome ? Math.min(.36 / Math.max(.1, size.y), .66 / Math.max(.1, size.x, size.z)) : .72 / Math.max(.1, size.y);
    imp.scale.setScalar(k);
    imp.position.y = x.dome ? 1.22 - box.min.y * k : 1.13;
    if (x.dome) { const c = box.getCenter(new THREE.Vector3()); imp.position.x = -c.x * k; imp.position.z = -c.z * k; }
    imp.rotation.y = .3;
    group.add(imp);
    const mixer = new THREE.AnimationMixer(imp), idle = g.animations.find((a) => a.name === 'idle');
    if (idle) mixer.clipAction(idle).play();
    mixer.update(.3);
    if (!x.have) { ghost(imp); return; }
    this.fx.push((t, dt) => { mixer.update(dt * (x.dome ? .35 : 1)); if (!x.dome) imp.rotation.y = .3 + Math.sin(t * .6) * .5; });
    const glow = new THREE.PointLight(x.glow || 0xff8a3a, 2.4, 2.4, 1.6);
    glow.position.y = x.dome ? 1.4 : 1.6;
    group.add(glow);
    this.fx.push((t) => { glow.intensity = 2 + Math.sin(t * 5.3) * .6 + Math.sin(t * 13) * .3; });
  }

  async rack(entry) {
    const { x, group, spot } = entry;
    const board = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.25, .1), new THREE.MeshStandardMaterial({ color: 0x1c0f07, roughness: .9 }));
    board.position.z = .02;
    group.add(board, this.frameBox(3.1, 1.25, .14, 0xb08a3e));
    for (const px of [-.85, .85]) { const peg = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .34, 10), new THREE.MeshStandardMaterial({ color: 0xb08a3e, metalness: .6, roughness: .4 })); peg.rotation.x = Math.PI / 2; peg.position.set(px, -.28, .2); group.add(peg); }
    entry.look = { yaw: spot.look, pitch: .02, dist: spot.dist, y: spot.y };
    const g = x.model ? await this.load(x.model) : null;
    if (!g) return;
    const w = g.scene, box = new THREE.Box3().setFromObject(w), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3()), long = Math.max(size.x, size.y, size.z), k = 2.45 / long;
    w.position.sub(mid).multiplyScalar(k);
    w.scale.setScalar(k);
    const hold = new THREE.Group(), turn = new THREE.Group(), axis = size.x === long ? 'x' : size.y === long ? 'y' : 'z';
    turn.add(w);
    if (axis === 'y') turn.rotation.z = Math.PI / 2;
    else if (axis === 'z') turn.rotation.y = Math.PI / 2;
    hold.add(turn);
    hold.rotation.z = .1;
    hold.position.z = .3;
    group.add(hold);
    if (!x.have) { ghost(w); return; }
    const light = new THREE.SpotLight(0xffe2b8, 8, 5, .55, .8, 1.3);
    light.position.set(0, 1.6, 1.6);
    light.target = hold;
    group.add(light);
  }

  async mount(entry) {
    const { x, group } = entry;
    if (x.kind === 'steed' && x.have) { const fel = new THREE.PointLight(x.glowColor || 0x6dff4a, 4, 5, 1.6); fel.position.set(0, .5, 0); group.add(fel); this.fx.push((t) => { fel.intensity = 3.4 + Math.sin(t * 3.1) * 1.1; }); }
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
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y, swing = this.swingOf();
      moved += Math.abs(dx) + Math.abs(dy);
      drag = { x: e.clientX, y: e.clientY };
      this.want.yaw = Math.max(this.center - swing, Math.min(this.center + swing, this.want.yaw - dx * .006));
      this.want.pitch = Math.max(-.05, Math.min(.75, this.want.pitch + dy * .004));
      this.idle = 0;
    });
    c.addEventListener('pointerup', (e) => { if (drag && moved < 6) this.tap(e); drag = null; });
    c.addEventListener('pointercancel', () => { drag = null; });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.want.dist = this.clampDist(this.want.dist * (1 + Math.sign(e.deltaY) * .1)); this.idle = 0; }, { passive: false });
    c.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 2) { pinch = null; return; }
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (pinch) this.want.dist = this.clampDist(this.want.dist * pinch / d);
      pinch = d;
    }, { passive: true });
  }

  swingOf() { const a = AREA[this.area]; return a.swing * (a.wide && this.camera.aspect < 1 ? 1.9 : 1); }

  fovFor(id) {
    const want = AREA[id].wide;
    if (!want || this.focus) return this.baseFov || 46;
    const v = 2 * Math.atan(Math.tan(want * Math.PI / 360) / Math.max(.4, this.camera.aspect)) * 180 / Math.PI;
    return Math.max(this.baseFov || 46, Math.min(84, v));
  }

  clampDist(d) { const a = AREA[this.area]; return Math.max(a.min || 3, Math.min(a.max || 12, d)); }

  enter(id, snap) {
    if (!AREA[id]) return;
    this.area = id;
    if (this.built) this.lightArea(id);
    const h = homeOf(id);
    this.focus = null;
    this.want = h;
    this.center = h.yaw;
    this.idle = 0;
    if (snap) this.view = { target: h.target.clone(), yaw: h.yaw, pitch: h.pitch, dist: h.dist };
    if (this.onArea) this.onArea(id);
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
    if (!entry) return;
    if (areaOf(entry.x) !== this.area) { this.travel(areaOf(entry.x), () => this.go(entry)); return; }
    if (!entry.look) { this.card(entry); return; }
    const l = entry.look, w = entry.group.position;
    this.focus = entry;
    this.want = { target: new THREE.Vector3(w.x, l.y, w.z), yaw: l.yaw, pitch: l.pitch, dist: l.dist };
    this.center = l.yaw;
    this.idle = -6;
    this.card(entry);
  }

  home() {
    this.focus = null;
    this.want = homeOf(this.area);
    this.center = this.want.yaw;
    this.card(null);
  }

  travel(id, then) {
    if (id === this.area) { if (then) then(); else this.home(); return; }
    clearTimeout(this.traveling);
    this.card(null);
    this.box.classList.add('swap');
    this.traveling = setTimeout(() => {
      this.enter(id, true);
      this.box.classList.remove('swap');
      if (then) setTimeout(then, 140);
    }, this.still ? 0 : 380);
  }

  card(entry) {
    for (const b of this.box.querySelectorAll('[data-go]')) b.classList.toggle('on', !!entry && +b.dataset.go === entry.x.id);
    const el = this.box.querySelector('.trcard');
    if (!entry) { el.classList.remove('show'); return; }
    const x = entry.x;
    el.innerHTML = `<img src="assets/icons/${x.icon}.png" alt=""><span><small>${x.rarity ? `${x.rarity} ${KIND[x.kind] || ''}` : KIND[x.kind] || 'Trophy'}</small><b class="${x.have ? '' : 'dim'}" ${x.rarity && x.have ? `style="color:${RARITY[x.rarity]}"` : ''}>${esc(x.have ? x.name : 'Not yet yours')}</b><em>${esc(x.line)}</em></span>`;
    el.classList.add('show');
  }

  resize() {
    const w = this.box.clientWidth || 1, h = this.box.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.baseFov = w < h ? 58 : 46;
    this.camera.fov = this.fovFor(this.area);
    this.reach = w < h ? Math.min(1.35, 1 + (h / w - 1) * .4) : 1;
    this.camera.updateProjectionMatrix();
  }

  frame() {
    const dt = Math.min(.05, this.clock.getDelta()), t = this.clock.elapsedTime;
    this.idle += dt;
    if (this.idle > 4 && !this.still) this.want.yaw = this.center + Math.sin((this.idle - 4) * .12) * this.swingOf() * .55;
    const v = this.view, w = this.want, k = 1 - Math.exp(-dt * 2.6);
    v.target.lerp(w.target, k);
    v.yaw += (w.yaw - v.yaw) * k;
    v.pitch += (w.pitch - v.pitch) * k;
    v.dist += (w.dist - v.dist) * k;
    const fov = this.fovFor(this.area);
    if (Math.abs(this.camera.fov - fov) > .05) { this.camera.fov += (fov - this.camera.fov) * k; this.camera.updateProjectionMatrix(); }
    const d = v.dist * (this.area === 'hall' || this.focus ? this.reach || 1 : 1);
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

  start() { this.built = true; this.lightArea(this.area); this.litAt = this.clock.elapsedTime + .35; this.renderer.setAnimationLoop(() => this.frame()); }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.ro.disconnect();
    this.renderer.dispose();
  }
}

let open = null;

function decorDrawer(box, hall, decor, locked) {
  const open = new Set(decor.open), btn = box.querySelector('.trdecobtn'), panel = document.createElement('div');
  panel.className = 'trdeco';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Decorate the Inn');
  box.append(panel);
  let look = { ...hall.look, banners: [...hall.look.banners] }, timer = 0;
  const tiers = decor.tiers || {};
  const tierList = (id) => {
    const steps = decor.progress ? decor.progress(id) : [], b = BANNERS.find((x) => x.id === id);
    return steps.length ? `<b>${esc(b.name)}${tiers[id] ? ` · Tier ${BANNER_TIERS[tiers[id] - 1]}` : ''}</b>${steps.map((t, i) => `<span class="${i < (tiers[id] || 0) ? 'ok' : ''}"><strong>${t.tier}</strong> ${t.parts.map((x) => `${esc(x.text)}${x.now && !x.done ? ` <em>${esc(x.now)}</em>` : ''}${x.done && i >= (tiers[id] || 0) ? ` <em class="held">done, counts once tier ${BANNER_TIERS[i - 1] || 'I'} is reached</em>` : ''}`).join(', ')}${i < (tiers[id] || 0) ? ' ✓' : ''}</span>`).join('')}` : '';
  };
  const has = (need) => !need || open.has(need);
  const needText = (need) => (REWARD[need] ? `Unlocks at ${rewardFor(REWARD[need])}.` : '');
  const draw = () => {
    panel.innerHTML = `<header><b>Decorate the Inn</b><small>Only you see your Inn this way. Changes save on their own.</small><button class="trdecox" aria-label="Close">✕</button></header>
      <div class="trdrow"><small>Hearthfire</small><div>${FIRES.map((f) => `<button class="trdc ${look.fire === f.id ? 'on' : ''} ${has(f.need) ? '' : 'locked'}" data-fire="${f.id}" ${has(f.need) ? '' : `data-need="${esc(f.need)}"`} aria-pressed="${look.fire === f.id}"><i class="trflame" style="--a:${f.flame[0]};--b:${f.flame[1]}"></i><span>${esc(f.name)}</span></button>`).join('')}</div></div>
      <div class="trdrow"><small>Banners <em>${look.banners.length} of ${BANNER_HOOKS} hooks on the fireplace pillars · ${BANNERS.filter((b) => has(b.need)).length} of ${BANNERS.length} earned</em></small>${[...new Set(BANNERS.map((b) => b.group))].map((grp) => `<div class="trdgroup"><i>${esc(grp)}</i><div class="trdbanners">${BANNERS.filter((b) => b.group === grp).map((b) => `<button class="trban t${tiers[b.id] || 0} ${look.banners.includes(b.id) ? 'on' : ''} ${has(b.need) ? '' : 'locked'}" data-banner="${b.id}" ${has(b.need) ? '' : `data-need="${esc(b.need)}"`} aria-pressed="${look.banners.includes(b.id)}" title="${esc(b.name)}"><img src="${bannerThumb(b.id, tiers[b.id] || 1)}" alt="">${tiers[b.id] ? `<i class="trtier">${BANNER_TIERS[tiers[b.id] - 1]}</i>` : ''}<span>${esc(b.name.replace(/^Banner of (the )?/, ''))}</span>${look.banners.includes(b.id) ? `<b>${look.banners.indexOf(b.id) + 1}</b>` : ''}</button>`).join('')}</div></div>`).join('')}</div>
      <div class="trdrow"><small>Cellar</small><div><button class="trdc ${look.brazier ? 'on' : ''} ${open.has('i_felbrazier') ? '' : 'locked'}" data-brazier ${open.has('i_felbrazier') ? '' : 'data-need="i_felbrazier"'} aria-pressed="${look.brazier}"><i class="trflame" style="--a:#3aff2a;--b:#d8ffb0"></i><span>Fel Brazier</span></button></div></div>
      ${decor.heads && decor.heads.length ? `<div class="trdrow"><small>Dreaming Loft <em>which head hangs on the wall</em></small><div>${HEAD_IDS.map(([id, name]) => `<button class="trdc trhead ${look.head === id || (!look.head && decor.heads[0] === id) ? 'on' : ''} ${decor.heads.includes(id) ? '' : 'locked'}" data-head="${id}" ${decor.heads.includes(id) ? '' : `data-headlock="${name}"`}><img src="assets/raid/dream/${id}.webp" alt=""><span>${name}</span></button>`).join('')}</div></div>` : ''}
      <p class="trdneed" aria-live="polite"></p>`;
    panel.querySelector('.trdecox').onclick = toggle;
    const say = panel.querySelector('.trdneed');
    for (const b of panel.querySelectorAll('.trdc, .trban')) b.onclick = () => {
      if (b.dataset.headlock) { say.textContent = `Slay ${b.dataset.headlock} to hang that head instead.`; return; }
      if (b.dataset.need) {
        const list = b.dataset.banner ? tierList(b.dataset.banner) : '';
        if (list) say.innerHTML = list;
        else say.textContent = needText(b.dataset.need);
        return;
      }
      if (b.dataset.fire) { look.fire = b.dataset.fire; if (hall.area !== 'hall') hall.travel('hall'); }
      else if (b.dataset.banner) {
        const id = b.dataset.banner, at = look.banners.indexOf(id);
        if (at >= 0) look.banners.splice(at, 1);
        else if (look.banners.length < BANNER_HOOKS) look.banners.push(id);
        else { say.innerHTML = `${tierList(id)}<span>All ${BANNER_HOOKS} hooks are taken. Take one down first.</span>`; return; }
        if (hall.area !== 'hall') hall.travel('hall');
      } else if (b.dataset.head) { look.head = b.dataset.head; if (hall.area !== 'loft' && !locked.loft) hall.travel('loft'); }
      else if ('brazier' in b.dataset) { look.brazier = !look.brazier; if (hall.area !== 'cellar' && !locked.cellar) hall.travel('cellar'); }
      hall.setDecor({ ...look, banners: [...look.banners] });
      clearTimeout(timer);
      timer = setTimeout(() => decor.save({ ...look }), 600);
      draw();
      if (b.dataset.banner) panel.querySelector('.trdneed').innerHTML = tierList(b.dataset.banner);
    };
  };
  const toggle = () => {
    panel.hidden = !panel.hidden;
    btn.setAttribute('aria-expanded', String(!panel.hidden));
    box.classList.toggle('decorating', !panel.hidden);
    if (!panel.hidden) loadEmblems().then(draw);
  };
  btn.onclick = toggle;
}

export async function openTrophyHall(items, extra = '', opts = {}) {
  if (open) return;
  const box = document.createElement('div');
  box.className = 'troph';
  const have = items.filter((x) => x.have).length, areas = AREAS.filter((a) => a.id === 'hall' || items.some((x) => areaOf(x) === a.id));
  const locked = opts.locked || {}, shut = (x) => !!locked[areaOf(x)];
  const tally = (id) => { const list = items.filter((x) => areaOf(x) === id); return `${list.filter((x) => x.have).length}/${list.length}`; };
  box.innerHTML = `<canvas></canvas><div class="trveil"><b>Lighting the hearth</b></div><div class="trswap"></div><header class="trtop"><span><small>Your Trophy Hall</small><b>The Lion's Pride Inn</b><em>${have} of ${items.length} trophies</em></span><span class="trbtns">${opts.decor ? '<button class="trdecobtn" aria-expanded="false"><img src="assets/icons/132483.png" alt=""><span>Decorate</span></button>' : ''}<button class="trsound" aria-label="Sound"></button><button class="trclose" aria-label="Close">✕</button></span></header>${areas.length > 1 ? `<nav class="trareas">${areas.map((a) => `${locked[a.id] ? `<button data-area="${a.id}" class="locked" aria-disabled="true" title="Locked"><b><svg class="trchain" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3M6 10h12v10H6Z"/></svg>${esc(a.name)}</b><small>Sealed</small></button>` : `<button data-area="${a.id}" class="${a.id === 'hall' ? 'on' : ''}" title="${esc(a.note)}"><b>${esc(a.name)}</b><small>${tally(a.id)}</small></button>`}`).join('')}</nav>` : ''}<div class="trcard"></div><nav class="trdots">${items.map((x) => `<button data-go="${x.id}" data-in="${areaOf(x)}" class="${x.have ? 'have' : ''} ${areaOf(x) === 'hall' ? '' : 'away'} ${shut(x) ? 'shut' : ''}" title="${esc(x.have ? x.name : 'Not yet yours')}"><img src="assets/icons/${x.icon}.png" alt=""></button>`).join('')}</nav>`;
  if (!document.querySelector('link[data-trophy]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset.trophy = '1';
    link.href = new URL('./trophy.css', import.meta.url).href;
    document.head.append(link);
  }
  if (extra) box.insertAdjacentHTML('beforeend', extra);
  document.body.append(box);
  document.body.classList.add('trophyopen');
  const hall = new Hall(box, items, opts), sound = new Sounds(), mute = box.querySelector('.trsound');
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
  if (opts.decor) decorDrawer(box, hall, opts.decor, locked);
  for (const b of box.querySelectorAll('[data-go]')) b.onclick = () => hall.go(hall.spots.find((s) => s.x.id === +b.dataset.go));
  hall.onArea = (id) => {
    for (const b of box.querySelectorAll('[data-area]')) b.classList.toggle('on', b.dataset.area === id);
    for (const b of box.querySelectorAll('[data-in]')) b.classList.toggle('away', b.dataset.in !== id);
  };
  const sealedNote = (id) => {
    box.querySelector('.trsealed')?.remove();
    const n = document.createElement('div');
    n.className = 'trsealed';
    n.innerHTML = `<b>The cellar door is chained shut</b><span>${esc(locked[id])}</span>`;
    box.append(n);
    setTimeout(() => n.classList.add('out'), 3800);
    setTimeout(() => n.remove(), 4400);
  };
  for (const b of box.querySelectorAll('[data-area]')) b.onclick = () => (locked[b.dataset.area] ? sealedNote(b.dataset.area) : hall.travel(b.dataset.area));
  window.trophyHall = hall;
  await hall.build();
  if (open !== hall) return;
  hall.start();
  sound.enter();
  box.querySelector('.trveil').classList.add('gone');
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch {}
  const fresh = (opts.focus && hall.spots.find((s) => s.x.id === opts.focus && !shut(s.x))) || hall.spots.find((s) => s.x.have && !shut(s.x) && !seen.includes(s.x.id));
  try { localStorage.setItem(SEEN, JSON.stringify(items.filter((x) => x.have).map((x) => x.id))); } catch {}
  if (fresh) setTimeout(() => { if (open === hall) { hall.go(fresh); box.querySelector('.trcard').classList.add('new'); } }, opts.focus ? 1400 : 2600);
}
