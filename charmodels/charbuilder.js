import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BODY = { 1: 'human', 2: 'orc', 3: 'dwarf', 4: 'nightelf', 5: 'scourge', 6: 'tauren', 7: 'gnome', 8: 'troll' };
const ORDER = ['SHIRT', 'LEGS', 'FEET', 'CHEST', 'WRIST', 'HANDS', 'WAIST', 'TABARD', 'BACK'];
const ATT = { MAIN_HAND: ['att1'], OFF_HAND: ['att0', 'att2'] };
const cache = new Map();
const json = (u) => { if (!cache.has(u)) cache.set(u, fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null)); return cache.get(u); };
const image = (u) => new Promise((ok) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = u; });

export function bodyOf(race, sex) {
  if (race === 95 || race === 96) return { model: 218 + sex, body: `skyborne${sex ? 'female' : 'male'}_hd` };
  const r = BODY[race];
  return r ? { model: (race - 1) * 2 + 1 + sex, body: `${r}${sex ? 'female' : 'male'}_hd` } : null;
}

function canvasTex(c) {
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function buildCharacter(a, P) {
  const who = bodyOf(a.race, a.sex);
  if (!who) throw new Error('no body for race ' + a.race);
  const tex = (f) => `${P.lib}tex/${f}.webp`;
  const [lay, secs, items, disp, texr, modr, tinfo, pieces] = await Promise.all([
    json(`${P.lib}layers/${who.model}.json`), json(`${P.lib}layers/sections.json`), json(`${P.items}items.json`), json(`${P.items}displays.json`),
    json(`${P.items}textures.json`), json(`${P.items}models.json`), json(`${P.split}${who.body}/textures.json`), json(`${P.split}${who.body}/pieces.json`),
  ]);
  const chosen = new Set(a.choices);
  const ok = (cond) => !cond || chosen.has(cond);
  const groups = {}, picks = [];
  for (const id of a.choices) {
    const c = lay.choices[id];
    if (!c) continue;
    for (const [cond, t, g] of c.geo) if (ok(cond)) groups[t] = g;
    for (const [cond, target, fid] of c.tex) if (ok(cond)) picks.push([target, fid]);
  }
  const canv = {}, layout = {};
  for (const [type, m] of Object.entries(lay.materials)) {
    const c = document.createElement('canvas');
    c.width = m[1]; c.height = m[2];
    canv[type] = c; layout[type] = m[0];
  }
  const steps = [];
  for (const [target, fid] of picks) for (const L of lay.layers) if (L[4].includes(target)) steps.push({ type: L[0], layer: L[1], blend: L[2], mask: L[3] >>> 0, fid, target });
  steps.sort((x, y) => x.layer - y.layer);
  const imgs = await Promise.all(steps.map((s) => image(tex(s.fid))));
  steps.forEach((s, i) => { s.img = imgs[i]; });
  for (const s of steps) {
    if (s.layer === 0 && s.mask === 0xffffffff && s.img && canv[s.type] && (s.img.width !== canv[s.type].width || s.img.height !== canv[s.type].height)) {
      canv[s.type].width = s.img.width; canv[s.type].height = s.img.height;
    }
  }
  const rectsOf = (type, mask) => {
    const C = canv[type];
    if (mask === 0xffffffff) return [[0, 0, C.width, C.height]];
    const own = secs[layout[type]] || [];
    const k = C.width / Math.max(...own.map((r) => r[1] + r[3]));
    return own.filter((r) => mask & (1 << r[0])).map((r) => [r[1] * k, r[2] * k, r[3] * k, r[4] * k]);
  };
  for (const s of steps) {
    const C = canv[s.type];
    if (!C || !s.img) continue;
    const g = C.getContext('2d');
    for (const [x, y, w, h] of rectsOf(s.type, s.mask)) {
      if (s.blend === 0 || s.blend === 1) g.clearRect(x, y, w, h);
      g.drawImage(s.img, x, y, w, h);
    }
  }
  const geo = {};
  let capeImg = null;
  const gear = (a.items || []).slice().sort((x, y) => (ORDER.indexOf(x[0]) + 99) % 99 - (ORDER.indexOf(y[0]) + 99) % 99);
  const pickTex = (mr, prefer0) => (texr[mr] || []).slice().sort((p, q) => (p[4] !== 0) - (q[4] !== 0) || (!([a.sex, 2].includes(p[2]))) - (!([a.sex, 2].includes(q[2]))) || (!([a.race, 0].includes(p[1]))) - (!([a.race, 0].includes(q[1]))))[0];
  const skin = canv[1];
  const own = secs[layout[1]] || [];
  const k = skin ? skin.width / Math.max(...own.map((r) => r[1] + r[3])) : 1;
  const rect = Object.fromEntries(own.map((r) => [r[0], [r[1] * k, r[2] * k, r[3] * k, r[4] * k]]));
  for (const [slot, item] of gear) {
    const d = items[item], e = d && disp[d];
    if (!e) continue;
    if (skin) {
      const jobs = Object.entries(e.s).map(async ([sec, mr]) => { const p = pickTex(mr); return p && rect[sec] ? [rect[sec], await image(tex(p[0]))] : null; });
      for (const j of await Promise.all(jobs)) if (j && j[1]) skin.getContext('2d').drawImage(j[1], ...j[0]);
    }
    const g = e.g;
    if (slot === 'HANDS' && g[0]) geo[4] = 1 + g[0];
    if (slot === 'FEET' && g[0]) geo[5] = 1 + g[0];
    if (slot === 'LEGS') { if (g[0]) geo[9] = 1 + g[0]; if (g[2]) geo[13] = 1 + g[2]; }
    if (slot === 'CHEST' || slot === 'SHIRT') { if (g[0]) geo[8] = 1 + g[0]; if (g[1]) geo[10] = 1 + g[1]; if (slot === 'CHEST' && g[2]) geo[13] = 1 + g[2]; }
    if (slot === 'WAIST' && g[0]) geo[18] = 1 + g[0];
    if (slot === 'BACK') {
      geo[15] = 1 + (g[0] || 1);
      const mm = e.mm.find(Boolean), p = mm && pickTex(mm);
      if (p) capeImg = await image(tex(p[0]));
    }
  }
  const avail = Object.keys(pieces).filter((x) => x[0] === 'g').map((x) => +x.slice(1));
  const on = new Set([0]);
  for (const t of new Set(avail.map((x) => Math.floor(x / 100)))) {
    if (t === 17 && groups[t] === undefined) continue;
    const want = geo[t] !== undefined ? t * 100 + geo[t] : t * 100 + (groups[t] ?? (t === 32 ? 2 : 1));
    if (avail.includes(want)) on.add(want);
  }
  if (groups[0] !== undefined && avail.includes(groups[0])) on.add(groups[0]);
  const T = {};
  for (const [type, c] of Object.entries(canv)) T[type] = canvasTex(c);
  if (capeImg) { const c = document.createElement('canvas'); c.width = capeImg.width; c.height = capeImg.height; c.getContext('2d').drawImage(capeImg, 0, 0); T.cape = canvasTex(c); }
  const eye = picks.find((p) => p[0] === 25);
  const fixed = {};
  for (const [name, v] of Object.entries(tinfo || {})) {
    if (v.type === 19 && T[19]) { fixed[name] = T[19]; continue; }
    if (v.type === 20 && T[20]) { fixed[name] = T[20]; continue; }
    if (v.type === 7 && T[7]) { fixed[name] = T[7]; continue; }
    const url = v.png ? `${P.split}${who.body}/${v.png}` : v.type === 19 && eye ? tex(eye[1]) : null;
    if (!url) continue;
    const t = await new THREE.TextureLoader().loadAsync(url).catch(() => null);
    if (t) { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; fixed[name] = t; }
  }
  const byName = { skin: T[1], hair: T[6], fur: T[8], cape: T.cape, ...fixed };
  const L = new GLTFLoader();
  const base = await L.loadAsync(`${P.split}${who.body}/base.glb`);
  const root = base.scene;
  const bones = {};
  root.traverse((o) => { if (/^b\d+$/.test(o.name)) bones[o.name] = o; });
  const look = (o) => {
    if (!o.isMesh) return;
    const blend = (o.material.userData || {}).blend || 0, t = byName[o.material.name];
    const m = new THREE.MeshStandardMaterial({ map: t || null, color: t ? 0xffffff : 0x777777, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
    if (blend === 1) m.alphaTest = 0.5;
    else if (blend === 2) { m.transparent = true; m.depthWrite = false; }
    else if (blend === 3 || blend === 4) { m.transparent = true; m.depthWrite = false; m.blending = THREE.AdditiveBlending; }
    else if (blend > 4) { m.transparent = true; m.depthWrite = false; m.opacity = 0.35; }
    o.material = m;
    o.frustumCulled = false;
    o.castShadow = true;
  };
  root.traverse(look);
  await Promise.all([...on].filter((x) => x).map(async (id) => {
    const g = await L.loadAsync(`${P.split}${who.body}/g${id}.glb`).catch(() => null);
    if (!g) return;
    const meshes = [];
    g.scene.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
    meshes.forEach((o) => {
      o.bind(new THREE.Skeleton(o.skeleton.bones.map((b) => bones[b.name] || b), o.skeleton.boneInverses), o.bindMatrix);
      look(o);
      root.add(o);
    });
  }));
  const node = (n) => { let x = null; root.traverse((o) => { if (o.name === n) x = o; }); return x; };
  for (const [slot, item] of a.items || []) {
    if (!ATT[slot]) continue;
    const d = items[item], e = d && disp[d];
    const mr = e && e.m.find(Boolean);
    if (!mr) continue;
    const opt = (modr[mr] || []).slice().sort((p, q) => (!([a.sex, 2].includes(p[2]))) - (!([a.sex, 2].includes(q[2]))))[0];
    if (!opt) continue;
    const g = await L.loadAsync(`${P.itemglb}${opt[0]}_${d}.glb`).catch(() => null);
    const at = ATT[slot].map(node).find(Boolean);
    if (!g || !at) continue;
    g.scene.traverse((o) => { if (!o.isMesh) return; o.frustumCulled = false; const b = (o.material.userData || {}).blend || 0; if (b === 1) o.material.alphaTest = 0.5; if (b > 1) { o.material.transparent = true; o.material.depthWrite = false; } });
    at.add(g.scene);
  }
  const fit = (list) => list.slice().sort((p, q) => (!(p[1] === a.race)) - (!(q[1] === a.race)) || (!([a.sex, 2].includes(p[2]))) - (!([a.sex, 2].includes(q[2]))));
  const hang = async (d, fid, attName) => {
    const at = node(attName);
    const g = at && await L.loadAsync(`${P.itemglb}${fid}_${d}.glb`).catch(() => null);
    if (!g) return false;
    g.scene.traverse((o) => { if (!o.isMesh) return; o.frustumCulled = false; o.castShadow = true; const b = (o.material.userData || {}).blend || 0; if (b === 1) o.material.alphaTest = 0.5; if (b > 1) { o.material.transparent = true; o.material.depthWrite = false; } });
    at.add(g.scene);
    return true;
  };
  for (const [slot, item] of a.items || []) {
    const d = items[item], e = d && disp[d];
    if (!e) continue;
    if (slot === 'HEAD' && !a.hideHelm) {
      const mr = e.m.find(Boolean), opt = mr && fit((modr[mr] || []).filter((o) => o[1] === a.race || o[1] === 0))[0];
      if (opt && await hang(d, opt[0], 'att11')) root.traverse((o) => { if (o.isMesh && /^g(\d{1,2})$/.test(o.name) && +o.name.slice(1) > 1) o.visible = false; });
    }
    if (slot === 'SHOULDER') {
      const all = e.m.filter(Boolean).flatMap((mr, k) => (modr[mr] || []).map((o) => [...o, k]));
      const left = fit(all.filter((o) => o[4] === 0 || (o[4] < 0 && o[5] === 0)))[0], right = fit(all.filter((o) => o[4] === 1 || (o[4] < 0 && o[5] === 1)))[0];
      if (left) await hang(d, left[0], 'att6');
      if (right) await hang(d, right[0], 'att5');
    }
  }
  return { root, animations: base.animations, pieces: [...on], canvases: canv, layout };
}
