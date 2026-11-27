import { audio, bell, boom } from './wloot.js?v=20261127170000';
import { DRAGONS, DRAGON_IDS, TREES, VISIONS, AWAKE } from './dream.js?v=20261127170000';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const SEEN = 'dreamSeen';

export function dreamCss() {
  if (!document.querySelector('link[href*="raid/dream.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="raid/dream.css?v=20261127170000">');
  if (!document.querySelector('link[href*="raid/trials.css"]')) document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="raid/trials.css?v=20261127170000">');
}

const clips = {};
async function clip(name) {
  const ctx = audio();
  if (!ctx) return null;
  clips[name] ||= fetch(`assets/raid/dream/${name}.ogg`).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).catch(() => null);
  return clips[name];
}
async function play(name, vol = 1, rate = 1, delay = 0) {
  const ctx = audio(), buf = await clip(name);
  if (!ctx || !buf) return;
  const src = ctx.createBufferSource(), g = ctx.createGain(), lp = ctx.createBiquadFilter(), dl = ctx.createDelay(1), wet = ctx.createGain();
  src.buffer = buf; src.playbackRate.value = rate; g.gain.value = vol; lp.type = 'lowpass'; lp.frequency.value = 1800; dl.delayTime.value = .19; wet.gain.value = .25 * vol;
  src.connect(g).connect(ctx.destination);
  src.connect(lp).connect(dl).connect(wet).connect(ctx.destination);
  src.start(ctx.currentTime + .02 + delay);
}

function mist(ctx, t, dur, vol = .12, f = 520) {
  const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.min(1, i / (ctx.sampleRate * .8)) * Math.min(1, (len - i) / (ctx.sampleRate * 1.2));
  const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = .7; g.gain.value = vol;
  s.connect(bp).connect(g).connect(ctx.destination); s.start(t);
}

function pad(ctx, t, dur, notes, vol = .05) {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(vol, t + 1.6);
  out.gain.linearRampToValueAtTime(.0001, t + dur);
  out.connect(ctx.destination);
  for (const f of notes) for (const det of [-6, 6]) {
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f; o.detune.value = det; lp.type = 'lowpass'; lp.frequency.value = 1400;
    o.connect(lp).connect(out); o.start(t); o.stop(t + dur + .1);
  }
}

function sfx(kind, i = 0) {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime + .02;
  if (kind === 'tick') { const f = [587.3, 659.3, 784, 880][i % 4]; bell(ctx, t, f, .7, .035); bell(ctx, t, f * 2, .4, .012); return; }
  if (kind === 'land') { boom(ctx, t, .5, 60); [392, 523.3, 659.3, 784, 1046.5].forEach((f, k) => bell(ctx, t + .06 + k * .07, f, 2.4, .07)); mist(ctx, t, 1.6, .1, 900); return; }
  if (kind === 'vision') { bell(ctx, t, 659.3, 2.6, .05); bell(ctx, t + .18, 987.8, 2.4, .035); mist(ctx, t, 1.8, .06, 1400); return; }
  if (kind === 'open') { pad(ctx, t, 16, [110, 164.8, 220, 329.6]); mist(ctx, t, 4, .1, 700); return; }
  if (kind === 'tree') { bell(ctx, t, [523.3, 587.3, 659.3, 784][i % 4], 2.8, .08); bell(ctx, t + .03, [1046.5, 1174.7, 1318.5, 1568][i % 4], 2, .035); return; }
  if (kind === 'portal') { boom(ctx, t, .35, 90); mist(ctx, t, 3, .14, 420); return; }
  if (kind === 'sick') { boom(ctx, t, .5, 48); bell(ctx, t, 146.8, 3, .06); bell(ctx, t, 155.6, 3, .05); mist(ctx, t, 2.4, .18, 260); return; }
  if (kind === 'title') { boom(ctx, t, .55, 50); bell(ctx, t, 110, 4, .08); bell(ctx, t, 164.8, 4, .06); bell(ctx, t + .3, 329.6, 3, .04); }
}

export function visionSeen() {
  let n = 0;
  try { n = +(localStorage.getItem(SEEN) || 0); } catch {}
  return n;
}
export function markVision(n) {
  try { localStorage.setItem(SEEN, String(n)); } catch {}
}

export function vision(steps, a) {
  if (!steps) return;
  dreamCss();
  markVision(steps);
  const woke = a ? TREES.filter((x) => a.trees[x.id]) : TREES.slice(0, steps), tree = woke[woke.length - 1] || TREES[0];
  const line = steps >= TREES.length ? AWAKE : VISIONS[Math.min(VISIONS.length, steps) - 1];
  document.querySelector('.dvision')?.remove();
  const el = document.createElement('div');
  el.className = 'dvision';
  el.setAttribute('role', 'status');
  el.innerHTML = `<i class="dvmist"></i><span class="dvtree"><img src="assets/icons/${tree.icon}.png" alt=""></span><span class="dvtext"><small>A vision · ${steps} of ${TREES.length} Great Trees awake</small><b>${esc(tree.name)} stirs</b><em>${esc(line)}</em></span>`;
  document.body.append(el);
  sfx('vision');
  requestAnimationFrame(() => el.classList.add('on'));
  const gone = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 900); };
  el.onclick = gone;
  setTimeout(gone, 7500);
}

export function summonDragon(id, opts = {}) {
  dreamCss();
  const pick = DRAGONS[id] || DRAGONS[DRAGON_IDS[0]], at = DRAGON_IDS.indexOf(pick.id);
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'dwheel';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'A dragon answers');
    el.style.setProperty('--dc', pick.color);
    el.style.setProperty('--dg', pick.glow);
    const spots = DRAGON_IDS.map((k, i) => { const d = DRAGONS[k], a = -Math.PI / 2 + i * Math.PI / 2; return `<span class="dwdrag" data-d="${k}" style="--x:${(50 + Math.cos(a) * 39).toFixed(2)}%;--y:${(50 + Math.sin(a) * 39).toFixed(2)}%;--c:${d.color};--g:${d.glow}"><span class="dwimg"><img src="${d.portrait}" alt=""></span><b>${esc(d.name)}</b></span>`; }).join('');
    el.innerHTML = `<i class="dwmist"></i><i class="dwmist two"></i><div class="dwmotes">${'<i></i>'.repeat(22)}</div>
      <header class="dwhead"><small>${esc(opts.kicker || 'The Emerald Dream')}</small><b>Who answers your call?</b></header>
      <div class="dwring"><svg class="dwrune" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="39"/><circle class="in" cx="50" cy="50" r="31"/></svg><i class="dwcore"><i></i><i></i></i><i class="dwarm"><i></i></i>${spots}</div>
      <div class="dwout"><small>${esc(pick.trait)}</small><h2 data-text="${esc(pick.name)} answers">${esc(pick.name)} answers</h2><p>${esc(pick.blurb)}</p><div class="dwfav"><span>Draft for</span><b>${esc(pick.favour)}</b></div><button class="dwgo" type="button">${esc(opts.go || `Gear up against ${pick.name}`)}</button></div>
      <button class="dwskip" type="button">Skip</button>`;
    document.body.append(el);
    const arm = el.querySelector('.dwarm'), drags = [...el.querySelectorAll('.dwdrag')];
    let done = false, skipped = false, rot = 0, landed = false;
    const finish = () => { if (done) return; done = true; removeEventListener('keydown', onKey); el.classList.add('out'); setTimeout(() => { el.remove(); resolve(); }, 520); };
    const land = () => {
      if (landed) return;
      landed = true;
      drags.forEach((d, i) => { d.classList.toggle('hot', i === at); d.classList.toggle('won', i === at); d.classList.toggle('lost', i !== at); });
      arm.style.transitionDuration = '0s';
      arm.style.setProperty('--r', `${at * 90}deg`);
      el.classList.add('land');
      sfx('land');
      play('dragonaggro', .9, .92, .12);
      setTimeout(() => el.classList.add('rise'), calm() ? 0 : 700);
      setTimeout(() => { el.classList.add('told'); el.querySelector('.dwgo').focus({ preventScroll: true }); }, calm() ? 50 : 1500);
    };
    el.querySelector('.dwgo').onclick = finish;
    el.querySelector('.dwskip').onclick = () => { if (landed) finish(); else { skipped = true; land(); } };
    const onKey = (e) => { if (e.key === 'Escape') { if (landed) finish(); else { skipped = true; land(); } } };
    addEventListener('keydown', onKey);
    requestAnimationFrame(() => el.classList.add('on'));
    clip('dragonaggro');
    (async () => {
      if (calm()) { await wait(300); land(); return; }
      await wait(900);
      el.classList.add('spin');
      const start = Math.floor(Math.random() * 4), n = 22 + ((at - start - 22) % 4 + 8) % 4;
      rot = start * 90;
      arm.style.setProperty('--r', `${rot}deg`);
      for (let k = 1; k <= n; k++) {
        if (skipped || done) return;
        const p = k / n, ms = 62 + 560 * p * p * p, i = (start + k) % 4;
        rot += 90;
        arm.style.transitionDuration = `${Math.round(ms * .9)}ms`;
        arm.style.setProperty('--r', `${rot}deg`);
        await wait(ms * .55);
        drags.forEach((d, j) => d.classList.toggle('hot', j === i));
        sfx('tick', i);
        await wait(ms * .45);
      }
      if (!skipped && !done) { await wait(220); land(); }
    })();
  });
}

async function dragonStage(cv, id) {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(2, devicePixelRatio));
  r.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, .1, 200);
  scene.add(new THREE.HemisphereLight(0xbfffd8, 0x12061e, 1.25));
  const key = new THREE.DirectionalLight(0x8dffb5, 2.6); key.position.set(-3, 2, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb06aff, 3); rim.position.set(4, 3, -5); scene.add(rim);
  const under = new THREE.PointLight(0x7dffb0, 40, 20); under.position.set(0, -1, 3); scene.add(under);
  let mixer = null, root = null, run = true, come = 0, coming = false;
  try {
    const g = await new GLTFLoader().loadAsync(`assets/raid/gear/${id}.glb`);
    root = g.scene;
    root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    const box = new THREE.Box3().setFromObject(root), hgt = box.max.y - box.min.y;
    root.scale.setScalar(4.4 / hgt);
    root.userData.base = -box.min.y * (4.4 / hgt) - 1.2;
    root.visible = false;
    scene.add(root);
    mixer = new THREE.AnimationMixer(root);
    const c = g.animations.find((x) => x.name === 'mountrun') || g.animations.find((x) => x.name === 'run') || g.animations[0];
    if (c) mixer.clipAction(c).play();
  } catch {}
  cam.position.set(0, .6, 9);
  cam.lookAt(0, .2, 0);
  const fit = () => { const w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 50 : 32; cam.updateProjectionMatrix(); };
  fit(); addEventListener('resize', fit);
  let last = performance.now(), t = 0;
  const loop = (now) => {
    if (!run) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
    if (mixer) mixer.update(dt);
    if (root && coming) {
      come = Math.min(1, come + dt * .42);
      const e = 1 - Math.pow(1 - come, 3);
      root.visible = true;
      root.position.set(0, root.userData.base + (1 - e) * .8, -26 + e * 25.4);
      root.rotation.y = Math.sin(t * .6) * .12;
      root.scale.setScalar(root.scale.x);
      under.intensity = 30 + Math.sin(t * 5) * 8;
    }
    r.render(scene, cam);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return { come: () => { coming = true; }, stop: () => { run = false; removeEventListener('resize', fit); r.dispose(); } };
}

const CORNER = [[14, 16], [86, 16], [14, 84], [86, 84]];

export function enterDream() {
  dreamCss();
  return new Promise((resolve) => {
    const hero = DRAGON_IDS[Math.floor(Math.random() * DRAGON_IDS.length)];
    const el = document.createElement('div');
    el.className = 'dcine';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Enter the Dream');
    el.innerHTML = `<i class="dcvoid"></i><i class="dwmist"></i><i class="dwmist two"></i><div class="dwmotes">${'<i></i>'.repeat(26)}</div>
      <svg class="dcroots" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${CORNER.map(([x, y], i) => `<path d="M${x} ${y} Q ${(x + 50) / 2 + (i % 2 ? -8 : 8)} ${(y + 50) / 2 + (i < 2 ? 8 : -8)} 50 50" pathLength="100" style="--i:${i}"/>`).join('')}</svg>
      ${TREES.map((tr, i) => `<span class="dctree" style="--x:${CORNER[i][0]}%;--y:${CORNER[i][1]}%;--i:${i}"><img src="assets/icons/${tr.icon}.png" alt=""><b>${esc(tr.name)}</b><small>${esc(tr.zone)}</small></span>`).join('')}
      <div class="dcportal"><i></i><i></i><i></i>${DRAGON_IDS.map((k, i) => `<img class="dcface" src="${DRAGONS[k].portrait}" alt="" style="--i:${i}">`).join('')}</div>
      <canvas class="dcdragon"></canvas><div class="dcflash"></div>
      <p class="sline dcline"></p>
      <div class="dctitle"><small>The Dream has turned to Nightmare</small><b>The Dragons of Nightmare have woken</b><span>Ysondre, Lethon, Emeriss and Taerar. One of them answers each time you call, once a day.</span><button class="sgo dcgo" type="button">Face the Nightmare</button></div>
      <button class="sskip" type="button">Skip</button>`;
    document.body.append(el);
    let done = false, skipped = false, stage = null;
    const line = el.querySelector('.dcline');
    const say = (t) => { line.classList.remove('on'); void line.offsetWidth; line.textContent = t; line.classList.add('on'); };
    const finish = () => { if (done) return; done = true; removeEventListener('keydown', onKey); el.classList.add('out'); setTimeout(() => { if (stage) stage.stop(); el.remove(); resolve(); }, 700); };
    const toEnd = () => { el.classList.add('t0', 't1', 't2', 't3', 'p1', 'p2', 'p3', 'faces', 'come', 'end'); say(''); if (stage) stage.come(); };
    el.querySelector('.dcgo').onclick = finish;
    el.querySelector('.sskip').onclick = () => { if (el.classList.contains('end')) finish(); else { skipped = true; toEnd(); } };
    const onKey = (e) => { if (e.key === 'Escape') finish(); };
    addEventListener('keydown', onKey);
    clip('dragonaggro');
    dragonStage(el.querySelector('.dcdragon'), hero).then((s) => { stage = s; if (done) s.stop(); else if (el.classList.contains('come')) s.come(); }).catch(() => {});
    const step = async (ms, fn) => { if (skipped || done) return; await wait(calm() ? Math.min(ms, 250) : ms); if (!skipped && !done) fn(); };
    (async () => {
      requestAnimationFrame(() => el.classList.add('on'));
      sfx('open');
      say('You close your eyes, and the green mist is waiting.');
      for (let i = 0; i < 4; i++) await step(i ? 620 : 2000, () => { el.classList.add(`t${i}`); sfx('tree', i); });
      await step(700, () => { say('Four Great Trees. Four doors into the Dream.'); });
      await step(1500, () => { el.classList.add('p1'); sfx('portal'); });
      await step(1400, () => { el.classList.add('p2'); say('Something is already coming through.'); sfx('sick'); });
      await step(1500, () => { el.classList.add('p3', 'faces'); say(''); });
      await step(1700, () => { el.classList.add('come'); if (stage) stage.come(); play('dragonaggro', 1, .85, .4); });
      await step(2600, () => { el.classList.add('end'); sfx('title'); });
    })();
  });
}
