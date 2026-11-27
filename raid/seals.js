import { audio, bell, boom } from './wloot.js?v=20261127173000';
import { PIECES, LIGHT, KEYSTONE, WHISPERS } from './attune.js?v=20261127173000';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const SEEN = 'attuneSeen';
const VOICES = ['aggro01', 'aggro02', 'supreme01', 'supreme02', 'slay01', 'slay02', 'slay03', 'death01', 'intro01'];
const PREVIEW = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || /^(life-preview|azeroth-preview)\./.test(location.hostname);
const voiceName = () => { const v = PREVIEW && new URLSearchParams(location.search).get('kvoice'); return VOICES.includes(v) ? v : 'aggro01'; };

async function loadVoice() {
  const ctx = audio();
  if (!ctx) return null;
  try { return await ctx.decodeAudioData(await (await fetch(`assets/raid/voice/kazzak_${voiceName()}.ogg`)).arrayBuffer()); } catch { return null; }
}

function speak(buf) {
  const ctx = audio();
  if (!ctx || !buf) return;
  const src = ctx.createBufferSource(), g = ctx.createGain(), lp = ctx.createBiquadFilter(), wet = ctx.createGain(), dl = ctx.createDelay(1);
  src.buffer = buf; g.gain.value = 1.1; lp.type = 'lowpass'; lp.frequency.value = 2600; dl.delayTime.value = .16; wet.gain.value = .22;
  src.connect(g).connect(ctx.destination);
  src.connect(lp).connect(dl).connect(wet).connect(ctx.destination);
  src.start(ctx.currentTime + .05);
}

function css() {
  if (!document.querySelector('link[href*="raid/seals.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="raid/seals.css?v=20261127173000">');
}

function hiss(ctx, t, dur, vol = .2) {
  const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = last * .97 + (Math.random() * 2 - 1) * .03; d[i] = last * 6 * Math.min(1, i / (ctx.sampleRate * .4)) * Math.min(1, (len - i) / (ctx.sampleRate * .6)); }
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = 140; g.gain.value = vol;
  s.connect(f).connect(g).connect(ctx.destination); s.start(t);
}

function drone(ctx, t, dur) {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(.07, t + 2);
  out.gain.linearRampToValueAtTime(.0001, t + dur);
  out.connect(ctx.destination);
  for (const f of [55, 58.3, 82.4, 110]) {
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 420;
    o.connect(lp).connect(out); o.start(t); o.stop(t + dur + .1);
  }
}

function sfx(kind, i = 0) {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime + .02;
  if (kind === 'whisper') { bell(ctx, t, 146.8, 2.4, .05); bell(ctx, t + .05, 155.6, 2.4, .04); hiss(ctx, t, 1.6, .12); return; }
  if (kind === 'open') { drone(ctx, t, 13); hiss(ctx, t, 3, .18); return; }
  if (kind === 'light') { bell(ctx, t, [523.3, 659.3, 784][i % 3], 2.4, .1); bell(ctx, t + .04, [1046.5, 1318.5, 1568][i % 3], 1.8, .05); boom(ctx, t, .18, 200); return; }
  if (kind === 'crack') { boom(ctx, t, .45, 55); hiss(ctx, t, 2.4, .5); return; }
  if (kind === 'burst') { boom(ctx, t, .8, 45); boom(ctx, t + .2, .55, 70); bell(ctx, t + .1, 98, 3, .08); bell(ctx, t + .1, 92.5, 3, .07); return; }
  if (kind === 'title') { boom(ctx, t, .5, 50); bell(ctx, t, 73.4, 4, .09); bell(ctx, t, 110, 4, .06); }
}

export function whisperSeen() {
  let seen = 0;
  try { seen = +(localStorage.getItem(SEEN) || 0); } catch {}
  return seen;
}

export function markWhisper(steps) {
  try { localStorage.setItem(SEEN, String(steps)); } catch {}
}

export function whisper(steps) {
  if (!steps) return;
  css();
  const line = WHISPERS[Math.min(WHISPERS.length, steps) - 1];
  markWhisper(steps);
  document.querySelector('.swhisper')?.remove();
  const el = document.createElement('div');
  el.className = 'swhisper';
  el.setAttribute('role', 'status');
  el.innerHTML = `<i class="swsmoke"></i><small>A whisper · ${steps} of 6 seals</small><b>${esc(line)}</b>`;
  document.body.append(el);
  sfx('whisper');
  requestAnimationFrame(() => el.classList.add('on'));
  const gone = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 900); };
  el.onclick = gone;
  setTimeout(gone, 6500);
}

async function demonStage(cv) {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(2, devicePixelRatio));
  r.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 100);
  scene.add(new THREE.HemisphereLight(0x9cff7a, 0x180404, 1.1));
  const key = new THREE.DirectionalLight(0x6bff3c, 3); key.position.set(-3, 1, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff3a1c, 2.4); rim.position.set(3, 3, -4); scene.add(rim);
  const under = new THREE.PointLight(0x7dff4a, 30, 12); under.position.set(0, -1.6, 2); scene.add(under);
  let mixer = null, root = null, run = true;
  try {
    const g = await new GLTFLoader().loadAsync('assets/raid/gear/kazzak.glb');
    root = g.scene;
    root.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace; } });
    const box = new THREE.Box3().setFromObject(root), hgt = box.max.y - box.min.y;
    root.scale.setScalar(3.4 / hgt);
    root.userData.base = -box.min.y * (3.4 / hgt) - 1.1;
    root.position.y = root.userData.base - 3.6;
    scene.add(root);
    mixer = new THREE.AnimationMixer(root);
    const clip = g.animations.find((c) => /roar|battleroar/i.test(c.name)) || g.animations.find((c) => /stand|idle/i.test(c.name)) || g.animations[0];
    if (clip) mixer.clipAction(clip).play();
  } catch {}
  cam.position.set(0, .1, 8.6);
  cam.lookAt(0, .4, 0);
  const fit = () => { const w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 44 : 30; cam.updateProjectionMatrix(); };
  fit(); addEventListener('resize', fit);
  let last = performance.now(), rise = 0, t = 0, rising = false;
  const loop = (now) => {
    if (!run) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    if (mixer) mixer.update(dt);
    if (root) {
      if (rising) rise = Math.min(1, rise + dt * .32);
      root.position.y = root.userData.base - 3.6 * (1 - (1 - Math.pow(1 - rise, 3)));
      root.rotation.y = Math.sin(t * .3) * .25;
      under.intensity = 24 + Math.sin(t * 6) * 6;
    }
    r.render(scene, cam);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return { rise: () => { rising = true; }, stop: () => { run = false; removeEventListener('resize', fit); r.dispose(); } };
}

const CRACKS = ['M50 50 L44 38 L47 27 L39 14 L41 0', 'M50 50 L61 41 L70 43 L82 30 L100 26', 'M50 50 L58 61 L55 73 L66 86 L63 100', 'M50 50 L38 57 L27 54 L15 66 L0 70', 'M50 50 L43 64 L33 72 L30 88 L22 100', 'M50 50 L57 36 L69 25 L72 11 L84 0', 'M50 50 L64 53 L77 63 L90 62 L100 74', 'M50 50 L36 45 L24 34 L10 36 L0 28'];

export function breakSeals() {
  css();
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'seals';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Break the seals');
    el.innerHTML = `<i class="svoid"></i><canvas class="sdemon"></canvas>
      <svg class="scracks" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${CRACKS.map((d, i) => `<path d="${d}" pathLength="100" style="--i:${i}"/>`).join('')}</svg>
      <div class="sorbit">${PIECES.map((p, i) => `<span class="spiece" style="--i:${i}"><img src="assets/icons/${p.icon}.png" alt=""></span>`).join('')}</div>
      <div class="skey"><img src="assets/icons/${KEYSTONE.icon}.png" alt=""></div>
      ${LIGHT.map((l, i) => `<span class="slight" style="--i:${i}"><img src="assets/icons/${l.icon}.png" alt=""><i class="sbeam"></i></span>`).join('')}
      <div class="sflash"></div><div class="sring"></div><div class="sembers">${'<i></i>'.repeat(34)}</div>
      <p class="sline"></p>
      <div class="stitle"><small>Doom walks the earth...</small><b>Lord Kazzak has been released</b><span>He waits in the Blasted Lands. One attempt a day.</span><button class="sgo" type="button">Face him</button></div>
      <button class="sskip" type="button">Skip</button>`;
    document.body.append(el);
    let done = false, stage = null, skipped = false;
    const line = el.querySelector('.sline');
    const say = (t) => { line.classList.remove('on'); void line.offsetWidth; line.textContent = t; line.classList.add('on'); };
    const finish = () => {
      if (done) return;
      done = true;
      removeEventListener('keydown', onKey);
      el.classList.add('out');
      setTimeout(() => { if (stage) stage.stop(); el.remove(); resolve(); }, 700);
    };
    const toEnd = () => { el.classList.add('s1', 's2', 's3', 's4', 's5', 's6', 'end'); if (stage) stage.rise(); };
    el.querySelector('.sgo').onclick = finish;
    el.querySelector('.sskip').onclick = () => { if (el.classList.contains('end')) finish(); else { skipped = true; toEnd(); } };
    const onKey = (e) => { if (e.key === 'Escape') { removeEventListener('keydown', onKey); finish(); } };
    addEventListener('keydown', onKey);
    const voice = loadVoice();
    demonStage(el.querySelector('.sdemon')).then((s) => { stage = s; if (done) s.stop(); else if (el.classList.contains('s5')) s.rise(); }).catch(() => {});
    const step = async (ms, fn) => { if (skipped || done) return; await wait(calm() ? Math.min(ms, 300) : ms); if (!skipped && !done) fn(); };
    (async () => {
      requestAnimationFrame(() => el.classList.add('on'));
      sfx('open');
      say('Three dark pieces of one thing.');
      await step(1600, () => { el.classList.add('s1'); say('The Light was carried into every dark place.'); });
      for (let i = 0; i < 3; i++) await step(i ? 650 : 900, () => { el.classList.add(`l${i}`); sfx('light', i); });
      await step(900, () => { el.classList.add('s2'); say('And the seals give way.'); sfx('crack'); });
      await step(1400, () => { el.classList.add('s3'); sfx('crack'); });
      await step(1100, () => { el.classList.add('s4'); say(''); sfx('burst'); });
      await step(600, () => { el.classList.add('s5'); if (stage) stage.rise(); });
      await step(900, () => { voice.then(speak); });
      await step(2300, () => { el.classList.add('s6'); sfx('title'); });
      await step(2200, () => { el.classList.add('end'); });
    })();
  });
}
