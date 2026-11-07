import * as THREE from 'three';
import { buildCharacter } from './charbuilder.js';

const SCENE = { 1: 'scenes/easternkingdom', 2: 'art/land-orccamp', 3: 'scenes/oldironforge', 4: 'art/land-darnassus', 5: 'art/land-tirisfall', 6: 'art/land-thunderbluff', 7: 'scenes/gnomeregan', 8: 'scenes/darkspearislands' };
const ANIMS = [['idle', 'Idle'], ['ready1h', 'Ready'], ['attack1h', 'Attack'], ['cast', 'Cast'], ['roar', 'Roar'], ['run', 'Run']];

export async function mountViewer(el, look, P, opts = {}) {
  el.classList.add('cv-host');
  el.innerHTML = `<canvas class="cv-c"></canvas><div class="cv-load"><span></span>Building ${opts.name || 'character'}…</div><div class="cv-anims"></div>`;
  const canvas = el.querySelector('canvas');
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  R.setPixelRatio(Math.min(devicePixelRatio, 2));
  R.shadowMap.enabled = true;
  R.shadowMap.type = THREE.PCFSoftShadowMap;
  R.outputColorSpace = THREE.SRGBColorSpace;
  R.toneMapping = THREE.ACESFilmicToneMapping;
  R.toneMappingExposure = 1.05;
  const S = new THREE.Scene();
  const fog = new THREE.Color(0x1d1813);
  S.fog = new THREE.Fog(fog, 9, 26);
  S.background = fog;
  const C = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
  const loader = new THREE.TextureLoader();
  const art = await loader.loadAsync(`${opts.assets || ''}assets/game/${SCENE[look.race] || 'scenes/dalaran'}.jpg`).catch(() => null);
  if (art) {
    art.colorSpace = THREE.SRGBColorSpace;
    const back = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 12, 64, 1, true, Math.PI * 0.62, Math.PI * 0.76), new THREE.MeshBasicMaterial({ map: art, side: THREE.BackSide, fog: true, color: 0x8a8070 }));
    back.position.y = 4.2;
    S.add(back);
  }
  const groundTex = await loader.loadAsync(`${opts.assets || ''}assets/draft/arena/terrain_dirt.png`).catch(() => null);
  if (groundTex) { groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; groundTex.repeat.set(10, 10); groundTex.colorSpace = THREE.SRGBColorSpace; }
  const ground = new THREE.Mesh(new THREE.CircleGeometry(18, 64), new THREE.MeshStandardMaterial({ map: groundTex, color: groundTex ? 0xb8a890 : 0x3a3024, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  S.add(ground);
  S.add(new THREE.HemisphereLight(0xfff0dc, 0x2a2016, 1.1));
  const key = new THREE.DirectionalLight(0xffe2b8, 2.4);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -2.5;
  key.shadow.camera.right = key.shadow.camera.top = 2.5;
  key.shadow.radius = 4;
  S.add(key);
  const rim = new THREE.DirectionalLight(0x9fc4ff, 1.2);
  rim.position.set(-3, 3, -4);
  S.add(rim);
  let ch;
  try {
    ch = await buildCharacter(look, P);
  } catch (e) {
    el.querySelector('.cv-load').textContent = 'Could not build this character.';
    throw e;
  }
  el.querySelector('.cv-load').remove();
  const root = ch.root;
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  S.add(root);
  const box = new THREE.Box3().setFromObject(root), h = Math.max(1, box.max.y - box.min.y);
  let yaw = 0.35, dist = h * 2.25, tilt = 0.12;
  const target = new THREE.Vector3(0, h * 0.55, 0);
  const place = () => {
    C.position.set(Math.sin(yaw) * dist, target.y + Math.sin(tilt) * dist, Math.cos(yaw) * dist);
    C.lookAt(target);
  };
  const mix = new THREE.AnimationMixer(root);
  let act = null;
  const play = (name) => {
    const clip = ch.animations.find((a) => a.name === name) || ch.animations.find((a) => a.name === 'idle');
    if (!clip) return;
    const a = mix.clipAction(clip);
    a.reset().fadeIn(0.25).play();
    if (act && act !== a) act.fadeOut(0.25);
    act = a;
    el.querySelectorAll('.cv-anims button').forEach((b) => b.classList.toggle('on', b.dataset.a === name));
  };
  const have = ANIMS.filter(([n]) => ch.animations.some((a) => a.name === n));
  el.querySelector('.cv-anims').innerHTML = have.map(([n, l]) => `<button data-a="${n}">${l}</button>`).join('');
  el.querySelectorAll('.cv-anims button').forEach((b) => { b.onclick = () => play(b.dataset.a); });
  play('idle');
  let drag = null, pinch = null, idleSpin = true;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; idleSpin = false; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    yaw -= (e.clientX - drag.x) * 0.008;
    tilt = Math.max(-0.05, Math.min(0.6, tilt + (e.clientY - drag.y) * 0.004));
    drag = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); dist = Math.max(h * 0.9, Math.min(h * 4, dist * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2) return;
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (pinch) dist = Math.max(h * 0.9, Math.min(h * 4, dist * pinch / d));
    pinch = d;
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', () => { pinch = null; });
  const size = () => { const w = el.clientWidth, hh = el.clientHeight; R.setSize(w, hh, false); C.aspect = w / Math.max(1, hh); C.updateProjectionMatrix(); };
  const ro = new ResizeObserver(size);
  ro.observe(el);
  size();
  const clock = new THREE.Clock();
  let alive = true;
  R.setAnimationLoop(() => {
    if (!alive) return;
    const dt = clock.getDelta();
    if (idleSpin) yaw += dt * 0.12;
    place();
    mix.update(dt);
    R.render(S, C);
  });
  return { stop() { alive = false; R.setAnimationLoop(null); ro.disconnect(); R.dispose(); }, play };
}
