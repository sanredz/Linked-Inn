import * as THREE from 'three';

const ROOT = 'assets/draft/world/', FLAT = 12.5, SIZE = 150, CLEAR = 20.5;
const ZONES = {
  elwynn: { floor: 'terrain_grass', alt: 'terrain_dirt', sky: [0x5d8fc9, 0xbcd6e8], fog: 0xa9c4d6, hills: 7, worn: .75, mote: 0xfff4c0,
    kinds: { tree: [22, 22, 60, 11, 17], pine: [14, 20, 60, 8, 13], bush: [46, 11, 50, 1.2, 2.4], grass: [900, 1, 42, .5, .95], prop: [9, 21, 27, 0, 0] } },
  barrens: { floor: 'terrain_dirt', alt: 'terrain_sand', sky: [0x6f9ccc, 0xf0d7a8], fog: 0xd9c49c, hills: 5, worn: .55, mote: 0xffe2a0,
    kinds: { tree: [16, 20, 62, 7, 11], bush: [40, 11, 50, 1.2, 2.2], grass: [700, 1, 42, .5, .9], rock: [26, 13, 55, 1.2, 3.6], prop: [8, 21, 27, 0, 0] } },
  jungle: { floor: 'terrain_grass2', alt: 'terrain_dirt', sky: [0x3f6f8c, 0x9fc0a8], fog: 0x6f9a86, hills: 9, worn: .7, mote: 0xc8ff8a,
    kinds: { tree: [30, 20, 60, 12, 19], bush: [70, 11, 50, 1.1, 2.6], grass: [500, 1, 40, .5, .9], rock: [8, 22, 60, 6, 11], prop: [9, 21, 27, 0, 0] } },
  arathi: { floor: 'terrain_grass', alt: 'terrain_rock', sky: [0x6c8fb8, 0xd7dfe0], fog: 0xb5bfc2, hills: 8, worn: .6, mote: 0xffffff,
    kinds: { tree: [20, 20, 60, 9, 15], bush: [60, 11, 50, .6, 1.1], grass: [900, 1, 42, .5, .95], rock: [24, 13, 58, 1.5, 4.5], prop: [7, 21, 27, 0, 0] } },
  molten: { floor: 'terrain_rock', alt: 'terrain_dirt', sky: [0x1a0603, 0x6a1c08], fog: 0x3a1206, hills: 12, worn: .5, mote: 0xffa040, lava: 1,
    kinds: { rock: [26, 20, 60, 7, 16], bush: [14, 16, 50, 1.5, 4], grass: [120, 6, 40, .3, .6], prop: [2, 21, 27, 0, 0] } },
};
const PROP_H = { 189810: 1.9, 189795: 1.4, 189705: .9, 189915: 1.1, 190535: 1.05, 190543: .85, 201593: 1.5, 201594: 1.4, 189200: 4.2, 190599: 2.6, 190271: 6, 190274: 5, 190277: 3.4, 190280: 5.5, 190313: 3, 190333: 1.6, 197835: 1.6, 197109: 4, 189178: 8 };
const SWAY = { tree: .0035, pine: .004, bush: .02, grass: .09, rock: 0, prop: 0 };

const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const tiles = new Map();
function tile(name) {
  if (tiles.has(name)) return tiles.get(name);
  const t = new THREE.TextureLoader().load(`assets/draft/arena/${name}.png`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  tiles.set(name, t);
  return t;
}

export class Scenery {
  constructor(stage) {
    this.stage = stage;
    this.group = new THREE.Group();
    stage.scene.add(this.group);
    this.time = { value: 0 };
    this.backColor = new THREE.Color(0x0b0806);
    this.fog = new THREE.Fog(0x0b0806, 30, 95);
    this.models = new Map();
    this.zones = {};
    this.zone = '';
    this.set = '';
    this.ready = Promise.resolve();
    this.manifest = fetch(`${ROOT}world.json`).then((r) => r.json()).catch(() => ({}));
    this.sky();
    this.motes();
  }

  height(x, z, hills = this.hills || 6) {
    const r = Math.hypot(x, z), n = Math.sin(x * .11 + 1.3) * Math.cos(z * .09 - .7) + Math.sin(x * .043 - z * .051) * 1.4 + Math.sin(z * .21 + x * .07) * .35;
    return smooth(FLAT, FLAT + 26, r) * hills * (.32 + n * .16) + smooth(FLAT + 24, 80, r) * hills * (1.5 + n * .4) + (r > FLAT ? 0 : Math.sin(x * 1.3) * Math.sin(z * 1.1) * .03);
  }

  ground(def) {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, 120, 120);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, color = [], blend = [], r = rnd(17);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = this.height(x, z, def.hills), d = Math.hypot(x, z);
      pos.setY(i, y);
      const slope = Math.abs(this.height(x + .8, z, def.hills) - y) + Math.abs(this.height(x, z + .8, def.hills) - y), patch = Math.sin(x * .19 + 2) * Math.sin(z * .23 - 1) * .5 + .5;
      const worn = (1 - smooth(FLAT * .45, FLAT * .95, d)) * def.worn;
      blend.push(Math.min(1, Math.max(worn * (.75 + patch * .25), smooth(.5, 1.2, slope), patch > .86 ? (patch - .86) * 4 : 0)));
      const s = .82 + patch * .22 + (r() - .5) * .06 - smooth(.6, 1.6, slope) * .15;
      color.push(s, s, s);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
    geo.setAttribute('blend', new THREE.Float32BufferAttribute(blend, 1));
    geo.computeVertexNormals();
    const map = tile(def.floor).clone(), alt = tile(def.alt);
    map.needsUpdate = true;
    map.repeat.set(SIZE / 4.5, SIZE / 4.5);
    const mat = new THREE.MeshLambertMaterial({ map, vertexColors: true });
    mat.onBeforeCompile = (s) => {
      s.uniforms.alt = { value: alt };
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float blend; varying float vBlend;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBlend = blend;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D alt; varying float vBlend;').replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, texture2D(alt, vMapUv * .8).rgb, vBlend);');
    };
    const mesh = new THREE.Mesh(geo, mat);
    if (def.lava) {
      const lava = new THREE.Mesh(new THREE.CircleGeometry(FLAT * 1.6, 64), new THREE.MeshBasicMaterial({ map: this.cracks(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 }));
      lava.rotation.x = -Math.PI / 2;
      lava.position.y = .03;
      mesh.add(lava);
      mesh.userData.lava = lava;
    }
    return mesh;
  }

  cracks() {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const g = c.getContext('2d'), m = 512, q = rnd(11);
    g.lineCap = 'round';
    for (let i = 0; i < 30; i++) {
      let a = q() * Math.PI * 2, d = m * (.25 + q() * .6), x = m + Math.cos(a) * d, y = m + Math.sin(a) * d;
      const pts = [[x, y]];
      for (let k = 0; k < 9; k++) { a += (q() - .5) * 1.4; x += Math.cos(a) * 26; y += Math.sin(a) * 26; pts.push([x, y]); }
      for (const [w, style] of [[14, 'rgba(255,80,10,.22)'], [6, 'rgba(255,140,40,.6)'], [2, 'rgba(255,230,160,.95)']]) {
        g.beginPath();
        g.moveTo(...pts[0]);
        for (const p of pts) g.lineTo(...p);
        g.lineWidth = w;
        g.strokeStyle = style;
        g.stroke();
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  async model(file, kind) {
    const key = `${file}|${kind}`;
    if (!this.models.has(key)) {
      this.models.set(key, this.stage.loader.loadAsync(ROOT + file).then((g) => {
        const parts = [];
        g.scene.updateMatrixWorld(true);
        g.scene.traverse((o) => {
          if (!o.isMesh) return;
          const src = o.material, blend = src.userData.blend || 0;
          if (blend >= 5) return;
          const m = new THREE.MeshLambertMaterial({ map: src.map, side: src.side, alphaTest: blend === 1 || blend === 2 ? .45 : 0 });
          if (blend === 3 || blend === 4) { m.transparent = true; m.blending = THREE.AdditiveBlending; m.depthWrite = false; }
          if (SWAY[kind]) this.sway(m, SWAY[kind]);
          parts.push({ geometry: o.geometry, material: m, matrix: o.matrixWorld.clone() });
        });
        const box = new THREE.Box3().setFromObject(g.scene);
        return { parts, h: Math.max(.01, box.max.y - box.min.y), w: Math.max(box.max.x - box.min.x, box.max.z - box.min.z), base: box.min.y };
      }).catch(() => null));
    }
    return this.models.get(key);
  }

  sway(m, k) {
    m.onBeforeCompile = (s) => {
      s.uniforms.uTime = this.time;
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>\nvec2 at = vec2(instanceMatrix[3][0], instanceMatrix[3][2]); float w = sin(uTime * 1.4 + at.x * .31 + at.y * .23) + sin(uTime * 2.3 + at.x * .7) * .35; transformed.x += w * max(position.y, 0.) * ${k}; transformed.z += cos(uTime * 1.1 + at.y * .27) * max(position.y, 0.) * ${k * .6};`);
    };
  }

  async build(name) {
    const def = ZONES[name], man = (await this.manifest)[name] || {}, group = new THREE.Group(), r = rnd(name.length * 7919 + 13);
    group.add(this.ground(def));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
    for (const [kind, [count, inner, outer, low, high]] of Object.entries(def.kinds)) {
      const list = man[kind] || [];
      if (!list.length) continue;
      const models = (await Promise.all(list.map((x) => this.model(x.file, kind)))).filter(Boolean);
      if (!models.length) continue;
      const spots = models.map(() => []), tall = kind !== 'grass';
      for (let i = 0, tries = 0; i < count && tries < count * 8; tries++) {
        const a = r() * Math.PI * 2, d = inner + Math.sqrt(r()) * (outer - inner), x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (kind === 'grass' && d < FLAT && r() < .55) continue;
        if (tall && d < CLEAR) continue;
        const k = Math.floor(r() * models.length), mdl = models[k], want = kind === 'prop' ? (PROP_H[list[k].file.split('.')[0]] || mdl.h) : low + r() * (high - low), sc = want / (kind === 'grass' || kind === 'prop' ? mdl.h : Math.max(mdl.h, mdl.w * .45));
        q.setFromAxisAngle(up, kind === 'prop' ? Math.atan2(-x, -z) + (r() - .5) * .6 : r() * Math.PI * 2);
        s3.setScalar(sc * (kind === 'grass' ? 1 : .9 + r() * .2));
        p3.set(x, this.height(x, z, def.hills) - mdl.base * sc - (tall ? .15 : .02), z);
        spots[k].push(m4.compose(p3, q, s3).clone());
        i++;
      }
      models.forEach((mdl, k) => {
        if (!spots[k].length) return;
        for (const part of mdl.parts) {
          const inst = new THREE.InstancedMesh(part.geometry, part.material, spots[k].length);
          spots[k].forEach((m, j) => inst.setMatrixAt(j, m4.multiplyMatrices(m, part.matrix)));
          inst.frustumCulled = false;
          group.add(inst);
        }
      });
    }
    return group;
  }

  sky() {
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 4;
    this.skyCanvas.height = 256;
    const map = new THREE.CanvasTexture(this.skyCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(110, 32, 16), new THREE.MeshBasicMaterial({ map, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.dome.renderOrder = -1;
    this.group.add(this.dome);
  }

  drawSky([top, low], fog) {
    const c = this.skyCanvas.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 256), hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
    g.addColorStop(0, hex(top));
    g.addColorStop(.38, hex(low));
    g.addColorStop(.5, hex(fog));
    g.addColorStop(1, hex(fog));
    c.fillStyle = g;
    c.fillRect(0, 0, 4, 256);
    this.dome.material.map.needsUpdate = true;
  }

  motes() {
    const n = 120, geo = new THREE.BufferGeometry();
    this.mote = { n, pos: new Float32Array(n * 3), vel: new Float32Array(n * 3), life: new Float32Array(n), age: new Float32Array(n) };
    geo.setAttribute('position', new THREE.BufferAttribute(this.mote.pos, 3));
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d'), rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 32, 32);
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(c), size: .12, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.points.frustumCulled = false;
    this.group.add(this.points);
    for (let i = 0; i < n; i++) this.respawn(i, Math.random());
  }

  respawn(i, head = 0) {
    const s = this.mote, j = i * 3, a = Math.random() * Math.PI * 2, d = 2 + Math.random() * 20, hot = this.set === 'molten';
    s.pos.set([Math.cos(a) * d, hot ? .1 : .3 + Math.random() * 3, Math.sin(a) * d], j);
    s.vel.set([(Math.random() - .5) * .4, hot ? .6 + Math.random() : (Math.random() - .3) * .2, (Math.random() - .5) * .4], j);
    s.life[i] = 3 + Math.random() * 4;
    s.age[i] = s.life[i] * head;
  }

  zoneOf(t) {
    return t.zone || (t.set === 'molten' ? 'molten' : t.set === 'jungle' ? 'jungle' : 'elwynn');
  }

  theme(t) {
    const name = this.zoneOf(t), def = ZONES[name];
    this.zone = name;
    this.set = name;
    this.hills = def.hills;
    this.backColor.setHex(def.fog);
    this.fog.color.setHex(def.fog);
    this.drawSky(def.sky, def.fog);
    this.points.material.color.setHex(def.mote);
    this.points.material.size = name === 'molten' ? .16 : .1;
    for (let i = 0; i < this.mote.n; i++) this.respawn(i, Math.random());
    this.zones[name] ||= this.build(name);
    this.ready = this.zones[name].then((g) => {
      if (this.zone !== name) return;
      for (const other of Object.values(this.zones)) other.then((o) => { if (o !== g) o.removeFromParent(); });
      this.group.add(g);
      this.active = g;
    });
    return this.ready;
  }

  update(dt, now) {
    this.time.value = now / 1000;
    const lava = this.active && this.active.children[0] && this.active.children[0].userData.lava;
    if (lava) lava.material.opacity = .7 + Math.sin(now / 900) * .2 + Math.sin(now / 350) * .1;
    const s = this.mote, hot = this.set === 'molten';
    for (let i = 0; i < s.n; i++) {
      s.age[i] += dt;
      if (s.age[i] >= s.life[i]) { this.respawn(i); continue; }
      const j = i * 3;
      if (!hot) { s.vel[j] += (Math.random() - .5) * dt; s.vel[j + 2] += (Math.random() - .5) * dt; }
      s.pos[j] += s.vel[j] * dt;
      s.pos[j + 1] += s.vel[j + 1] * dt;
      s.pos[j + 2] += s.vel[j + 2] * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.material.opacity = hot ? .9 : .35 + Math.sin(now / 500) * .25;
  }
}
