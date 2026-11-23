import { BANNERS } from './paths.js';

const W = 128, H = 256, CX = 64, CY = 98;
const ROOT = new URL('../assets/draft/hall/emblems/', import.meta.url).href;
const imgs = {};
let loading = null;

export function loadEmblems() {
  loading ||= Promise.all(BANNERS.map((b) => new Promise((done) => {
    const i = new Image();
    i.onload = () => { imgs[b.emblem] = i; done(); };
    i.onerror = () => done();
    i.src = `${ROOT}${b.emblem}.png`;
  })));
  return loading;
}

const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * (1 + k)))); return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`; };
const GOLD = ['#7a5418', '#f8d36b', '#fff1b8', '#c99a3b', '#6a4410'];
const TRIM = [['#5a4a36', '#8a7458'], ['#8a8f9a', '#e6ebf2'], GOLD];

function tinted(img, color, size) {
  const c = document.createElement('canvas'), r = Math.min(size / img.width, size / img.height);
  c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-in';
  if (Array.isArray(color)) { const lg = g.createLinearGradient(0, 0, 0, c.height); color.forEach((x, i) => lg.addColorStop(i / (color.length - 1), x)); g.fillStyle = lg; } else g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

const shape = (g, inset = 0) => { g.beginPath(); g.moveTo(inset, 0); g.lineTo(W - inset, 0); g.lineTo(W - inset, 212 - inset * .4); g.lineTo(CX, H - inset * 1.3); g.lineTo(inset, 212 - inset * .4); g.closePath(); };
const metal = (g, stops, y0 = 0, y1 = H) => { const lg = g.createLinearGradient(0, y0, 0, y1); stops.forEach((x, i) => lg.addColorStop(i / (stops.length - 1), x)); return lg; };

export function paintBanner(c, b, tier = 1) {
  c.width = W; c.height = H;
  const g = c.getContext('2d'), t = Math.max(1, Math.min(3, tier)), trim = TRIM[t - 1];
  g.clearRect(0, 0, W, H);
  g.save();
  shape(g);
  g.clip();
  const cloth = g.createLinearGradient(0, 0, W, 0);
  cloth.addColorStop(0, shade(b.cloth, -.45)); cloth.addColorStop(.5, shade(b.cloth, t === 3 ? .2 : .08)); cloth.addColorStop(1, shade(b.cloth, -.45));
  g.fillStyle = cloth;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = .07;
  g.fillStyle = '#000';
  for (let x = 0; x < W; x += 3) g.fillRect(x, 0, 1, H);
  g.globalAlpha = 1;
  if (t === 3) {
    g.globalAlpha = .1;
    g.strokeStyle = '#fff1b8'; g.lineWidth = 1;
    for (let k = -H; k < W + H; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + H, H); g.stroke(); g.beginPath(); g.moveTo(k + H, 0); g.lineTo(k, H); g.stroke(); }
    g.globalAlpha = 1;
  }
  const fold = g.createLinearGradient(0, 0, 0, H);
  fold.addColorStop(0, 'rgba(0,0,0,.45)'); fold.addColorStop(.15, 'rgba(0,0,0,0)'); fold.addColorStop(.85, 'rgba(0,0,0,.05)'); fold.addColorStop(1, 'rgba(0,0,0,.35)');
  g.fillStyle = fold;
  g.fillRect(0, 0, W, H);
  if (t >= 2) {
    const glow = g.createRadialGradient(CX, CY, 4, CX, CY, 58);
    glow.addColorStop(0, t === 3 ? 'rgba(255,240,190,.32)' : 'rgba(255,255,255,.14)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, W, H);
  }
  g.restore();

  const bw = [5, 7, 11][t - 1];
  g.save();
  shape(g, bw / 2);
  g.lineWidth = bw; g.strokeStyle = metal(g, trim); g.lineJoin = 'miter';
  g.stroke();
  if (t >= 2) { shape(g, bw + 4); g.lineWidth = 1.5; g.strokeStyle = trim[trim.length > 2 ? 2 : 1]; g.globalAlpha = .8; g.stroke(); }
  g.restore();

  g.fillStyle = metal(g, trim, 0, 14);
  g.fillRect(0, 0, W, t === 3 ? 16 : 11);
  if (t >= 2) for (let x = 12; x < W; x += t === 3 ? 13 : 20) { g.beginPath(); g.arc(x, t === 3 ? 16 : 11, t === 3 ? 4 : 3, 0, Math.PI); g.fill(); }

  const img = imgs[b.emblem];
  if (img) {
    const size = [70, 78, 84][t - 1];
    if (t >= 2) {
      const rim = tinted(img, t === 3 ? GOLD : '#000', size + (t === 3 ? 8 : 6));
      g.globalAlpha = t === 3 ? 1 : .55;
      g.drawImage(rim, CX - rim.width / 2, CY - rim.height / 2 + (t === 3 ? 0 : 2));
      g.globalAlpha = 1;
    } else {
      const sh = tinted(img, '#000', size);
      g.globalAlpha = .45; g.drawImage(sh, CX - sh.width / 2 + 2, CY - sh.height / 2 + 3); g.globalAlpha = 1;
    }
    const ink = tinted(img, b.ink, size);
    g.drawImage(ink, CX - ink.width / 2, CY - ink.height / 2);
  }

  if (t >= 2) {
    g.fillStyle = metal(g, trim, 150, 175);
    for (let i = 0; i < t; i++) { const x = CX + (i - (t - 1) / 2) * 12; g.beginPath(); g.moveTo(x, 160); g.lineTo(x + 5, 167); g.lineTo(x, 174); g.lineTo(x - 5, 167); g.closePath(); g.fill(); }
  }
  if (t === 3) {
    const gem = g.createRadialGradient(CX - 2, 226, 1, CX, 228, 9);
    gem.addColorStop(0, '#ffffff'); gem.addColorStop(.35, b.ink); gem.addColorStop(1, shade(b.cloth, -.5));
    g.fillStyle = metal(g, GOLD, 215, 242);
    g.beginPath(); g.arc(CX, 228, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = gem;
    g.beginPath(); g.arc(CX, 228, 7.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = metal(g, GOLD, 0, 30);
    for (const x of [bw + 6, W - bw - 6]) { g.beginPath(); g.arc(x, 26, 4, 0, Math.PI * 2); g.fill(); }
  }
  return c;
}

const thumbs = {};
export function bannerThumb(id, tier = 1) {
  const key = `${id}:${tier}`;
  if (thumbs[key]) return thumbs[key];
  const b = BANNERS.find((x) => x.id === id);
  if (!b || typeof document === 'undefined' || !imgs[b.emblem]) return '';
  thumbs[key] = paintBanner(document.createElement('canvas'), b, tier).toDataURL('image/png');
  return thumbs[key];
}
