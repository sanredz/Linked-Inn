import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const KEY = 'aqOpenEvent';
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : String(Math.round(n)));
const BOSSES = ['Kurinnaxx', 'General Rajaxx', 'Moam', 'Buru the Gorger', 'Ayamiss the Hunter', 'Ossirian the Unscarred'];

export function shouldShow(war) {
  if (new URLSearchParams(location.search).has('aqopen')) return true;
  if (!war || !war.open || war.raid !== 'aq20') return false;
  try { return !localStorage.getItem(KEY); } catch { return false; }
}

function gong(ctx, t0, strong = 1) {
  const out = ctx.createGain();
  out.gain.value = 0.9 * strong;
  out.connect(ctx.destination);
  const parts = [[62, 1, 7], [93, 0.55, 6], [131, 0.42, 5], [176, 0.3, 4.2], [233, 0.22, 3.4], [311, 0.14, 2.6], [417, 0.08, 1.8]];
  for (const [f, a, d] of parts) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.012, t0);
    o.frequency.exponentialRampToValueAtTime(f, t0 + 0.6);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(a, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + d);
    o.connect(g); g.connect(out);
    o.start(t0); o.stop(t0 + d + 0.1);
  }
  const len = ctx.sampleRate * 0.25, buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const n = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), ng = ctx.createGain();
  n.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = 900; ng.gain.value = 0.5;
  n.connect(lp); lp.connect(ng); ng.connect(out); n.start(t0);
}
function rumble(ctx, t0, dur) {
  const len = ctx.sampleRate * dur, buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = last * 0.985 + (Math.random() * 2 - 1) * 0.015; data[i] = last * 9 * Math.min(1, i / (ctx.sampleRate * 0.6)) * Math.min(1, (len - i) / (ctx.sampleRate * 0.8)); }
  const s = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf; lp.type = 'lowpass'; lp.frequency.value = 160; g.gain.value = 0.9;
  s.connect(lp); lp.connect(g); g.connect(ctx.destination); s.start(t0);
}
function choir(ctx, t0) {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, t0);
  out.gain.linearRampToValueAtTime(0.11, t0 + 2.5);
  out.gain.linearRampToValueAtTime(0.0001, t0 + 9);
  out.connect(ctx.destination);
  for (const f of [110, 164.8, 220, 277.2, 329.6]) for (const det of [-4, 4]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    o.connect(lp); lp.connect(out); o.start(t0); o.stop(t0 + 9.2);
  }
}

function sandCanvas(cv) {
  const c = cv.getContext('2d');
  let w, h, run = true;
  const fit = () => { w = cv.width = innerWidth * devicePixelRatio; h = cv.height = innerHeight * devicePixelRatio; };
  fit(); addEventListener('resize', fit);
  const P = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.8 + 0.4, v: Math.random() * 0.0012 + 0.0004, a: Math.random() * 0.5 + 0.15 }));
  let gust = 0;
  const tick = () => {
    if (!run) return;
    c.clearRect(0, 0, w, h);
    for (const p of P) {
      p.x += p.v * (1 + gust * 6); p.y += Math.sin(p.x * 30 + p.s) * 0.0004 - gust * 0.0006;
      if (p.x > 1.02) { p.x = -0.02; p.y = Math.random(); }
      c.fillStyle = `rgba(240, 200, 130, ${p.a})`;
      c.beginPath(); c.arc(p.x * w, p.y * h, p.s * devicePixelRatio, 0, 7); c.fill();
    }
    gust *= 0.97;
    requestAnimationFrame(tick);
  };
  tick();
  return { gust: (n) => { gust = n; }, stop: () => { run = false; removeEventListener('resize', fit); } };
}

async function bossStage(cv) {
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(2, devicePixelRatio));
  r.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffe2a8, 0x2a1606, 1.2));
  const key = new THREE.DirectionalLight(0xffc870, 2.6); key.position.set(-2, 4, -3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9a3c, 2.2); rim.position.set(3, 2, -4); scene.add(rim);
  const front = new THREE.DirectionalLight(0xfff0d0, 0.9); front.position.set(0, 2, 5); scene.add(front);
  let mixer = null, root = null, run = true;
  try {
    const g = await new GLTFLoader().loadAsync('assets/raid/gear/ossirian.glb');
    root = g.scene;
    root.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace; } });
    const box = new THREE.Box3().setFromObject(root), hgt = box.max.y - box.min.y;
    root.scale.setScalar(3 / hgt);
    root.position.y = -box.min.y * (3 / hgt) - 1.5;
    root.position.y -= 1.2;
    scene.add(root);
    mixer = new THREE.AnimationMixer(root);
    const clip = g.animations.find((c) => /stand|idle/i.test(c.name)) || g.animations[0];
    if (clip) mixer.clipAction(clip).play();
  } catch (e) {}
  cam.position.set(0, 0.4, 7.4);
  cam.lookAt(0, 0, 0);
  const fit = () => { const w = cv.clientWidth, h = cv.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  fit(); addEventListener('resize', fit);
  let last = performance.now(), rise = 0, t = 0;
  const loop = (now) => {
    if (!run) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (mixer) mixer.update(dt);
    if (root) { rise = Math.min(1, rise + dt * 0.35); root.position.y = -2.7 + 1.2 * (1 - Math.pow(1 - rise, 3)); root.rotation.y = Math.sin(t * 0.25) * 0.35; }
    r.render(scene, cam);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return { stop: () => { run = false; removeEventListener('resize', fit); r.dispose(); } };
}

export async function playOpening(war, opts = {}) {
  try { localStorage.setItem(KEY, String(Date.now())); localStorage.setItem('aqGateSeen', JSON.stringify({ open: true, at: Date.now() })); } catch {}
  const goals = (war && war.goals) || [];
  const el = document.createElement('div');
  el.className = 'aqo';
  el.innerHTML = `<canvas class="aqo-sand"></canvas>
    <div class="aqo-rays"></div>
    <canvas class="aqo-boss"></canvas>
    <div class="aqo-gate l"><i class="aqo-carve"></i><span class="aqo-seal"><img src="assets/icons/133062.png" alt=""></span></div>
    <div class="aqo-gate r"><i class="aqo-carve"></i><span class="aqo-seal"><img src="assets/icons/133062.png" alt=""></span></div>
    <div class="aqo-flash"></div>
    <button class="aqo-skip" type="button">Skip</button>
    <div class="aqo-intro">
      <small>The war effort is won</small>
      <p>Azeroth answered the call. The Scarab Gong waits before the Ruins.</p>
      <button class="aqo-gong" type="button" aria-label="Strike the gong"><span class="aqo-disc"><i></i></span><b>Strike the gong</b></button>
    </div>
    <div class="aqo-title">
      <small>The gates have opened</small>
      <h1><span>The Ruins of</span>Ahn'Qiraj</h1>
      <div class="aqo-tally">${goals.map((g) => `<div><img src="assets/icons/${g.icon}.png" alt=""><b data-n="${g.have}">0</b><em>${g.name}</em></div>`).join('')}</div>
    </div>
    <div class="aqo-end">
      <ol class="aqo-bosses">${BOSSES.map((n, i) => `<li style="--d:${i * 0.12}s"><i>${['I', 'II', 'III', 'IV', 'V', 'VI'][i]}</i>${n}</li>`).join('')}</ol>
      <div class="aqo-prize"><img src="assets/icons/133062.png" alt=""><div><b>The Scepter of the Shifting Sands</b><span>Gather three shards from Rajaxx, Moam and Ayamiss, then deal 125,000 damage to Ossirian.</span></div></div>
      <div class="aqo-cta"><button class="aqo-go" type="button">Enter the Ruins</button><button class="aqo-later" type="button">Later</button></div>
    </div>`;
  document.body.append(el);
  document.documentElement.classList.add('aqo-lock');
  const sand = sandCanvas(el.querySelector('.aqo-sand'));
  let stage = null, ctx = null, done = false;
  requestAnimationFrame(() => el.classList.add('s0'));
  const finish = (go) => {
    if (done) return; done = true;
    el.classList.add('out');
    setTimeout(() => { sand.stop(); if (stage) stage.stop(); el.remove(); document.documentElement.classList.remove('aqo-lock'); if (ctx) ctx.close(); if (go && opts.onEnter) opts.onEnter(); }, 900);
  };
  el.querySelector('.aqo-skip').onclick = () => finish(false);
  el.querySelector('.aqo-later').onclick = () => finish(false);
  el.querySelector('.aqo-go').onclick = () => finish(true);
  const strike = async () => {
    if (el.classList.contains('s1')) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    const now = ctx ? ctx.currentTime : 0;
    if (ctx) { gong(ctx, now); gong(ctx, now + 1.9, 0.75); gong(ctx, now + 3.6, 1.1); rumble(ctx, now + 4.2, 5); choir(ctx, now + 6.2); }
    el.classList.add('s1');
    sand.gust(1);
    await wait(1900); if (done) return; el.classList.add('hit2'); sand.gust(0.8);
    await wait(1700); if (done) return; el.classList.add('hit3'); sand.gust(1.2);
    await wait(600); if (done) return; el.classList.add('s2');
    bossStage(el.querySelector('.aqo-boss')).then((s) => { if (done) s.stop(); else stage = s; });
    await wait(3600); if (done) return; el.classList.add('s3');
    count(el);
    await wait(3400); if (done) return; el.classList.add('s4');
  };
  el.querySelector('.aqo-gong').onclick = strike;
  addEventListener('keydown', function k(e) { if (done) return removeEventListener('keydown', k); if (e.key === 'Escape') finish(false); });
}

function count(el) {
  const list = [...el.querySelectorAll('.aqo-tally b')];
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / 1800), e = 1 - Math.pow(1 - p, 3);
    for (const b of list) b.textContent = short(+b.dataset.n * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
