(() => {
  const COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'];
  const RANGES = [['6H', 6 * 3600], ['1D', 86400], ['1W', 7 * 86400], ['1M', 30 * 86400], ['ALL', 0]];
  const CLASS = { 0: 'Consumable', 1: 'Bag', 2: 'Weapon', 3: 'Gem', 4: 'Armour', 5: 'Reagent', 6: 'Ammo', 7: 'Trade good', 9: 'Recipe', 11: 'Quiver', 12: 'Quest item', 13: 'Key', 15: 'Miscellaneous' };
  const QC = ['#9d9d9d', '#ffffff', '#1eff00', '#3a95f5', '#b94cf7', '#ff8000'];
  const st = { region: 'eu', series: [{ kind: 'idx', key: 'F100' }], range: 'ALL', q: '', open: null, fac: 'all' };
  const shardCache = {};
  let H = null, root = null;
  let loading = null;

  const LIVE = 'https://forever-live.sanredz.workers.dev/v1';
  async function loadLive() {
    const get = (p) => fetch(LIVE + p).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
    const [cat, ...regs] = await Promise.all([get('/catalog'), ...['us', 'eu', 'kr', 'tw'].map((r) => get('/market/' + r).catch(() => null))]);
    const M = { built: Math.floor(Date.now() / 1000), cat, defs: null, regions: {}, live: true };
    ['us', 'eu', 'kr', 'tw'].forEach((r, i) => {
      const x = regs[i];
      if (!x || !x.state) return;
      M.defs = M.defs || x.defs;
      M.regions[r] = { t: x.state.t, idx: x.state.idx, counts: x.state.counts || {}, latest: x.latest || {} };
    });
    if (!M.defs || !Object.keys(M.regions).length) throw new Error('empty');
    window.MKT = M;
  }
  let tipsP = null;
  function loadTips() {
    if (window.LI_TIPS) return Promise.resolve();
    tipsP = tipsP || new Promise((ok) => {
      const s = document.createElement('script');
      s.id = 'mkTips';
      s.src = 'data-tips.js?v=' + (window.LI_V || Date.now());
      s.onload = ok;
      s.onerror = ok;
      document.head.appendChild(s);
    });
    return tipsP;
  }
  function load() {
    loadTips();
    if (window.MKT) return Promise.resolve();
    loading = loading || loadLive().catch(() => new Promise((ok) => {
      const s = document.createElement('script');
      s.src = 'data-market.js?v=' + (window.LI_V || Date.now());
      s.onload = ok;
      s.onerror = ok;
      document.head.appendChild(s);
    }));
    return loading;
  }
  function shard(region, id) {
    const k = region + '/' + (id % 64);
    if (window.MKT && MKT.live) {
      const ik = region + ':' + id;
      if (!shardCache[ik]) shardCache[ik] = fetch(LIVE + '/item/' + region + '/' + id).then((r) => r.json()).catch(() => ({ t: [], i: {} }));
      return shardCache[ik];
    }
    if (!shardCache[k]) shardCache[k] = fetch('m/' + k + '.json?v=' + (window.MKT ? MKT.built : '')).then((r) => r.json()).catch(() => ({ t: [], i: {} }));
    return shardCache[k];
  }
  const RSN = () => (H && H.rs && H.rs()) || null;
  const RSI = { PvP: '0', Normal: '1', Roleplay: '2', 'Roleplay PvP': '3' };
  const lat = (r, id) => {
    const l = r && r.latest && r.latest[id], rs = RSN();
    if (!l || !rs || r.rsv) return l;
    const k = RSI[rs], v = l[5] && (l[5][rs] || l[5][k]);
    const ch = l[6] && l[6][k] != null ? l[6][k] : null;
    return v ? [v[0], v[1], v[2], v[3], ch, l[5]] : null;
  };
  const REG = ['us', 'eu', 'kr', 'tw'];
  const REGC = { us: '#3987e5', eu: '#f8d36b', kr: '#d95926', tw: '#199e70' };
  const latAll = (id) => {
    let n = 0, q = 0, s = 0, w = 0, mn = 0, cs = 0, cw = 0;
    REG.forEach((x) => {
      const v = MKT.regions[x] && lat(MKT.regions[x], id);
      if (!v || !v[0]) return;
      const k = v[3] || 1;
      n += v[3] || 0; q += v[2] || 0; s += v[0] * k; w += k;
      if (v[1] && (!mn || v[1] < mn)) mn = v[1];
      if (v[4] != null) { cs += v[4] * k; cw += k; }
    });
    return w ? [Math.round(s / w), mn, q, n, cw ? Math.round(10 * cs / cw) / 10 : null] : null;
  };
  const FACN = () => (H && H.fac && H.fac()) || null;
  const SETK = { PvP: 0, Normal: 1, Roleplay: 2, 'Roleplay PvP': 3 };
  const houseKey = () => { const rs = RSN(), f = FACN(); return rs && f && SETK[rs] != null ? SETK[rs] + f[0] : null; };
  const HD = {}, houseView = {};
  function loadHouse(rg, k) {
    const key = rg + ':' + k;
    HD[key] = HD[key] || fetch(LIVE + '/market/' + rg + '/house/' + k).then((r) => r.json()).then((d) => ({ rsv: true, hv: true, t: (d.state || {}).t || [], idx: (d.state || {}).idx || {}, counts: (d.state || {}).counts || {}, latest: d.latest || {} })).catch(() => null);
    return HD[key];
  }
  const houseOn = () => { const k = houseKey(), v = k && houseView[st.region + ':' + k]; return v && Object.keys(v.latest).length ? v : null; };
  const rowOf = (sh, id) => {
    const hk = houseKey();
    if (hk) return (sh.hs && sh.hs[hk]) || null;
    const rs = RSN();
    return rs ? (sh.rs && (sh.rs[rs] || sh.rs[String(SETK[rs])])) || null : sh.i[id];
  };
  const SELL = {};
  const loadSell = (rg, id) => {
    const k = rg + ':' + id;
    SELL[k] = SELL[k] || fetch(LIVE + '/sell/' + rg + '/' + id).then((r) => r.json()).then((d) => d[id] || {}).catch(() => ({}));
    return SELL[k];
  };
  const sellKeys = (hk) => {
    if (hk) return (k) => k === hk;
    const rs = RSN(), f = FACN();
    const s = rs && SETK[rs] != null ? String(SETK[rs]) : null;
    return (k) => (!s || k[0] === s) && (!f || k[1] === f[0]);
  };
  const STEPN = ['under 70%', '70–90%', '90–100%', '100–110%', '110–125%', '125–150%', 'over 150%'];
  function balance(m) {
    const L = m.querySelector('.mk-left'), R = m.querySelector('.mk-right'), kin = m.querySelector('.mk-kin > div');
    if (!L || !R || !kin || !kin.isConnected) return;
    const items = [...kin.children];
    items.forEach((x) => { x.style.display = ''; });
    kin.parentElement.style.display = '';
    if (R.getBoundingClientRect().top > L.getBoundingClientRect().top + 4) return;
    const cols = Math.max(1, Math.round(kin.getBoundingClientRect().width / Math.max(1, (items[0] || kin).getBoundingClientRect().width)));
    let shown = items.length;
    while (shown > cols && L.offsetHeight - R.offsetHeight > 30) {
      const keep = Math.ceil(shown / cols) * cols - cols;
      items.forEach((x, i) => { x.style.display = i >= keep ? 'none' : ''; });
      shown = keep;
    }
  }
  async function fillSell(box, rgs, id, local) {
    const per = await Promise.all(rgs.map((x) => loadSell(x, id)));
    const ok = sellKeys(local ? houseKey() : null), L = 4 + 2 * STEPN.length, c = new Array(L).fill(0);
    per.forEach((m) => Object.entries(m).forEach(([k, v]) => { if (ok(k)) for (let j = 0; j < L; j++) c[j] += v[j] || 0; }));
    if (!box.isConnected) return;
    const S = STEPN.length, sold = c.slice(4, 4 + S), exp = c.slice(4 + S, 4 + 2 * S);
    const n = c[0] + c[1] + c[2] + c[3], s0 = c[0] + c[1], p0 = n ? Math.round(100 * s0 / n) : null;
    const rows = STEPN.map((lab, k) => {
      const m = sold[k] + exp[k], p = m ? Math.round(100 * sold[k] / m) : null;
      return `<div class="mk-lr${m ? '' : ' mk-l0'}"><span>${lab}</span><i class="mk-sb"><i style="width:${p || 0}%"></i></i><b>${p == null ? '–' : p + '%'}</b><small>${m ? H.fmt(sold[k]) + '/' + H.fmt(m) : ''}</small></div>`;
    });
    const ts = sold.reduce((a, x) => a + x, 0);
    const nA = c[0] + c[2], nB = c[1] + c[3];
    let mid = '';
    if (nA && nB) {
      const pa = Math.round(100 * c[0] / nA), pb = Math.round(100 * c[1] / nB), d = pa - pb;
      mid = `<p class="mk-lm">${d > 0 ? `Priced above typical, it sells <b>${d} points less often</b> (${pb}% vs ${pa}%).` : `Priced above typical, it sells <b>just as often</b> (${pb}% vs ${pa}%).`}</p>`;
    }
    const head = n ? `<div class="mk-sl"><span>Overall</span><b>${p0}%</b><i class="mk-sb"><i style="width:${p0}%"></i></i><small>${H.fmt(s0)} of ${H.fmt(n)} sold</small></div>` : '';
    const band = (lab, sd, e) => { const m = sd + e, p = m ? Math.round(100 * sd / m) : null; return `<div class="mk-sl"><span>${lab}</span><b>${p == null ? '–' : p + '%'}</b><i class="mk-sb"><i style="width:${p || 0}%"></i></i><small>${m ? `${H.fmt(sd)} of ${H.fmt(m)} sold` : 'none ended yet'}</small></div>`; };
    const ladder = ts + exp.reduce((a, x) => a + x, 0) ? `<div class="mk-lh"><span>Listed at</span><span>sold</span></div>${rows.join('')}${mid}` : band('At or below typical price', c[0], c[2]) + band('Above typical price', c[1], c[3]);
    box.innerHTML = `<h4>Does it sell? <small>last 7 days</small><i class="mk-qh" tabindex="0" role="note" aria-label="Share of finished auctions that sold instead of running out, by how their price compared with the typical price on the same auction house in the last hour they were listed. A cancelled auction counts as sold." data-hint="Share of finished auctions that sold instead of running out, by how their price compared with the typical price on the same auction house in the last hour they were listed. A cancelled auction counts as sold.">?</i></h4>${n ? head + ladder : '<p class="mk-sn">No auctions of this have ended in the last 7 days.</p>'}`;
    box.hidden = false;
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const icon = (id) => { const c = MKT.cat[id]; const tp = window.ECON && ECON.tips && ECON.tips[id]; const ic = (c && c[2]) || (tp && tp[10]); return ic ? `assets/icons/${ic}.png` : H.UI('inv_misc_questionmark'); };
  const pctTxt = (v) => v == null ? '–' : (v > 0 ? '+' : '') + v.toFixed(Math.abs(v) < 10 ? 1 : 0) + '%';
  const cls = (v) => v == null ? '' : v > 0 ? 'up' : v < 0 ? 'dn' : '';
  const FAC_UI = false;
  const FD = {};
  const FACS = [['all', 'Every house', 'inv_misc_coin_02'], ['Alliance', 'Alliance', null], ['Horde', 'Horde', null], ['Blackwater', 'Blackwater', 'inv_misc_coin_17']];
  const facIcon = (f, ic) => f === 'Alliance' ? 'assets/game/alliance-crest.png' : f === 'Horde' ? 'assets/game/horde-crest.png' : H.UI(ic);
  function loadFac(rg, f) {
    const k = rg + ':' + f;
    FD[k] = FD[k] || fetch(LIVE + '/market/' + rg + '/' + f.toLowerCase()).then((r) => r.json()).then((d) => ({ t: (d.state || {}).t || [], idx: (d.state || {}).idx || {}, counts: (d.state || {}).counts || {}, latest: d.latest || {} })).catch(() => null);
    return FD[k];
  }
  const facView = {};
  const facOn = () => { const v = st.fac !== 'all' && facView[st.region + ':' + st.fac]; return v && v.t.length && Object.keys(v.latest).length ? v : null; };
  const SD = {}, setView = {};
  const setSlug = (n) => n.toLowerCase().replace(/\s+/g, '-');
  function loadSet(rg, n) {
    const k = rg + ':' + n;
    SD[k] = SD[k] || fetch(LIVE + '/market/' + rg + '/rs/' + setSlug(n)).then((r) => r.json()).then((d) => ({ rsv: true, t: (d.state || {}).t || [], idx: (d.state || {}).idx || {}, counts: (d.state || {}).counts || {}, latest: d.latest || {} })).catch(() => null);
    return SD[k];
  }
  const setOn = () => { const n = RSN(); const v = n && setView[st.region + ':' + n]; return v && v.t.length >= 2 && Object.keys(v.idx).length ? v : null; };
  const R = () => houseOn() || setOn() || facOn() || MKT.regions[st.region] || { t: [], idx: {}, latest: {}, counts: {} };
  const defOf = (k) => MKT.defs.find((d) => d.k === k);
  const shortName = (n) => n.replace(/^Green gear (\d+)–(\d+)$/, 'Green, lvl $1–$2').replace(/ patterns$/, '').replace(/^Blue gear$/, 'Blue and up').replace(/ and /, ' & ');

  function idxSeries(key) {
    const r = R();
    return { t: r.t, v: r.idx[key] || [] };
  }
  function lastVal(v) { for (let i = v.length - 1; i >= 0; i--) if (v[i] != null) return [i, v[i]]; return [-1, null]; }
  function change(t, v, span) {
    const [li, lv] = lastVal(v);
    if (li < 0) return null;
    let bi = -1;
    for (let i = 0; i < v.length; i++) if (v[i] != null && (!span || t[i] >= t[li] - span)) { bi = i; break; }
    if (bi < 0 || bi === li || !v[bi]) return null;
    return 100 * (lv / v[bi] - 1);
  }
  function spark(v, w = 48, h = 20) {
    const pts = v.map((x, i) => [i, x]).filter((p) => p[1] != null);
    if (pts.length < 2) return `<svg class="mk-spark" width="${w}" height="${h}"></svg>`;
    const lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1])), n = v.length - 1 || 1;
    const d = pts.map(([i, x], k) => `${k ? 'L' : 'M'}${(i / n * (w - 2) + 1).toFixed(1)},${(h - 2 - (hi > lo ? (x - lo) / (hi - lo) : 0.5) * (h - 4)).toFixed(1)}`).join('');
    const up = pts[pts.length - 1][1] >= pts[0][1];
    return `<svg class="mk-spark" width="${w}" height="${h}"><path d="${d}" class="${up ? 'up' : 'dn'}"/></svg>`;
  }
  function fmtTime(t, span) {
    const d = new Date(t * 1000);
    return span > 3 * 86400 ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : span > 18 * 3600 ? d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  async function seriesData(s) {
    if (s.kind === 'idx') { const x = idxSeries(s.key); return { name: defOf(s.key).n, t: x.t, v: x.v, unit: 'idx' }; }
    const sh = await shard(st.region, s.id);
    const row = rowOf(sh, s.id);
    return { name: MKT.cat[s.id] ? MKT.cat[s.id][0] : 'Item ' + s.id, t: sh.t, v: row ? row[0].map((x) => x || null) : [], unit: 'coin' };
  }

  function drawChart(el, list, opts = {}) {
    const W = Math.max(280, el.clientWidth || 600), Hh = opts.h || Math.max(280, el.clientHeight || 300), P = { l: W < 520 ? 4 : 8, r: W < 520 ? 48 : 64, t: 12, b: 26 };
    const span = (RANGES.find((r) => r[0] === st.range) || [])[1];
    const tmax = Math.max(...list.map((s) => Math.max(...s.t, 0)));
    const t0 = span ? tmax - span : Math.min(...list.map((s) => s.t.find((x, i) => s.v[i] != null) ?? tmax));
    const rel = list.length > 1 && !opts.abs;
    const S = list.map((s, k) => {
      const pts = s.t.map((t, i) => [t, s.v[i]]).filter((p) => p[1] != null && p[0] >= t0);
      const base = pts.length ? pts[0][1] : 1;
      return { ...s, color: s.color || COLORS[k], pts: pts.map(([t, v]) => [t, rel ? 100 * (v / base - 1) : v, v]) };
    });
    const all = S.flatMap((s) => s.pts);
    if (all.length < 2) { el.innerHTML = `<div class="mk-empty"><img src="${H.UI('inv_misc_pocketwatch_01')}" alt="">Not enough history in this range yet. Prices are saved every hour, so this fills in quickly.</div>`; return; }
    let lo = Math.min(...all.map((p) => p[1])), hi = Math.max(...all.map((p) => p[1]));
    if (hi === lo) { hi += Math.abs(hi) * 0.05 || 1; lo -= Math.abs(lo) * 0.05 || 1; }
    const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    const xa = Math.min(...all.map((p) => p[0])), xb = Math.max(...all.map((p) => p[0]));
    const X = (t) => P.l + (xb > xa ? (t - xa) / (xb - xa) : 0.5) * (W - P.l - P.r);
    const Y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (Hh - P.t - P.b);
    const ticks = [0, 1, 2, 3, 4].map((i) => lo + (hi - lo) * i / 4);
    const lab = (v) => rel ? (v > 0 ? '+' : '') + v.toFixed(1) + '%' : list[0].unit === 'coin' ? H.coinT(Math.max(0, v)) : v.toFixed(1);
    let svg = `<svg class="mk-chart" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}">`;
    svg += ticks.map((v) => `<line class="mk-gl" x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="mk-yl" x="${W - P.r + 6}" y="${Y(v) + 4}">${esc(lab(v))}</text>`).join('');
    if (rel && lo < 0 && hi > 0) svg += `<line class="mk-zero" x1="${P.l}" x2="${W - P.r}" y1="${Y(0)}" y2="${Y(0)}"/>`;
    const xt = [xa, (xa + xb) / 2, xb];
    svg += xt.map((t, i) => `<text class="mk-xl" x="${X(t)}" y="${Hh - 6}" text-anchor="${i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}">${fmtTime(t, xb - xa)}</text>`).join('');
    S.forEach((s, k) => {
      if (!s.pts.length) return;
      const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
      if (S.length === 1 || (opts.fill && k === 0)) {
        const gid = 'mkg' + Math.random().toString(36).slice(2, 8);
        svg += `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity="0.32"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient></defs><path class="mk-area" d="${d}L${X(s.pts[s.pts.length - 1][0]).toFixed(1)},${Hh - P.b}L${X(s.pts[0][0]).toFixed(1)},${Hh - P.b}Z" fill="url(#${gid})"/>`;
      }
      svg += `<path class="mk-ln" d="${d}" stroke="${s.color}"/>`;
      const lp = s.pts[s.pts.length - 1];
      svg += `<circle class="mk-dot" cx="${X(lp[0])}" cy="${Y(lp[1])}" r="4" fill="${s.color}"/>`;
    });
    svg += `<line class="mk-xh" x1="0" x2="0" y1="${P.t}" y2="${Hh - P.b}" style="display:none"/><rect class="mk-hitbox" x="${P.l}" y="0" width="${W - P.l - P.r}" height="${Hh}"/></svg><div class="mk-tt" style="display:none"></div>`;
    el.innerHTML = svg;
    const hit = el.querySelector('.mk-hitbox'), xh = el.querySelector('.mk-xh'), tt = el.querySelector('.mk-tt');
    hit.addEventListener('mousemove', (e) => {
      const r = hit.getBoundingClientRect(), tx = xa + (e.clientX - r.left) / r.width * (xb - xa);
      let best = null;
      S.forEach((s) => s.pts.forEach((p) => { if (!best || Math.abs(p[0] - tx) < Math.abs(best - tx)) best = p[0]; }));
      xh.setAttribute('x1', X(best)); xh.setAttribute('x2', X(best)); xh.style.display = '';
      tt.innerHTML = `<b>${new Date(best * 1000).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</b>` + S.map((s) => {
        const p = s.pts.reduce((a, q) => Math.abs(q[0] - best) < Math.abs(a[0] - best) ? q : a, s.pts[0]);
        return p ? `<div><i style="background:${s.color}"></i>${esc(s.name)}<span>${s.unit === 'coin' ? H.coin(p[2]) : p[2].toFixed(1)}${rel ? ` <em class="${cls(p[1])}">${pctTxt(p[1])}</em>` : ''}</span></div>` : '';
      }).join('');
      tt.style.display = 'block';
      const x = X(best);
      tt.style.left = Math.min(x + 12, W - tt.offsetWidth - 4) + 'px';
      tt.style.top = '8px';
    });
    hit.addEventListener('mouseleave', () => { xh.style.display = 'none'; tt.style.display = 'none'; });
  }

  function indexList() {
    const r = R(), groups = {};
    MKT.defs.forEach((d) => { if (r.idx[d.k]) (groups[d.g] = groups[d.g] || []).push(d); });
    const wait = st.fac !== 'all' && !facOn() ? `<div class="mk-facwait"><img src="${H.UI('inv_misc_pocketwatch_01')}" alt=""><span>${esc(st.fac)} prices start with the next hourly update. Showing every house until then.</span></div>` : '';
    const hWait = houseKey() && houseOn() && Object.values(R().idx).every((v) => !v.some((x) => x != null)) ? `<div class="mk-facwait"><img src="${H.UI('inv_misc_pocketwatch_01')}" alt=""><span>Prices for the ${esc(RSN())} ${esc(FACN())} auction house are tracked from Nov 8, so its indexes and history fill in hour by hour. Item prices are already live.</span></div>` : '';
    const rsWait = !houseKey() && RSN() && !setOn() ? `<div class="mk-facwait"><img src="${H.UI('inv_misc_pocketwatch_01')}" alt=""><span>${esc(RSN())} prices per item have only been recorded since Nov 7, so its indexes need a couple more hourly snapshots. Showing every auction house until then.</span></div>` : '';
    if (!Object.keys(groups).length && st.fac !== 'all' && facOn()) return `<div class="mk-empty mk-facwait"><img src="${H.UI('inv_misc_pocketwatch_01')}" alt=""><span>${esc(st.fac)} indexes need two hourly updates to start. Items already show ${esc(st.fac)} prices.</span></div>`;
    const per = { '6H': 'last 6 hours', '1D': 'last 24 hours', '1W': 'last 7 days', '1M': 'last 30 days', ALL: 'since tracking began' }[st.range];
    const short = { '6H': '6h', '1D': '24h', '1W': '7d', '1M': '30d', ALL: 'all time' }[st.range];
    return hWait + rsWait + wait + `<div class="mk-per"><span>Change over the <b>${per}</b></span><small>Follows the chart's time range</small></div><div class="mk-ix mk-ixh" aria-hidden="true"><span></span><span></span><span class="mk-nm">Index</span><span class="mk-spark">Trend</span><span class="mk-vl">Value</span><span class="mk-ch">${short}</span></div>` + Object.entries(groups).map(([g, ds]) => `<div class="mk-grp"><h5>${esc(g)}</h5>${ds.map((d) => {
      const v = r.idx[d.k], [, lv] = lastVal(v), ch = change(r.t, v, (RANGES.find((x) => x[0] === st.range) || [])[1]), on = st.series.findIndex((s) => s.kind === 'idx' && s.key === d.k);
      return `<button class="mk-ix${on >= 0 ? ' on' : ''}" data-ix="${d.k}" style="--sc:${on >= 0 ? COLORS[on] : 'transparent'}" title="${esc(d.d)} ${r.counts[d.k] || 0} items."><span class="mk-sw"></span><img src="${H.UI(d.ic)}" alt=""><span class="mk-nm">${esc(shortName(d.n))}</span>${spark(v)}<span class="mk-vl">${lv != null ? lv.toFixed(1) : '–'}</span><span class="mk-ch ${cls(ch)}">${pctTxt(ch)}</span></button>`;
    }).join('')}</div>`).join('');
  }

  async function renderChart() {
    const box = root.querySelector('.mk-plot');
    if (!box) return;
    const list = await Promise.all(st.series.map(seriesData));
    list.forEach((s, k) => { s.color = COLORS[k]; });
    root.querySelector('.mk-legend').innerHTML = st.series.map((s, k) => {
      const d = list[k], ch = change(d.t, d.v, (RANGES.find((r) => r[0] === st.range) || [])[1]);
      const ic = s.kind === 'idx' ? H.UI(defOf(s.key).ic) : icon(s.id);
      return `<span class="mk-lg" style="--sc:${COLORS[k]}"><i></i><img src="${ic}" alt="">${esc(d.name)}<em class="${cls(ch)}">${pctTxt(ch)}</em>${st.series.length > 1 ? `<button data-rm="${k}" aria-label="Remove">×</button>` : ''}</span>`;
    }).join('') + (st.series.length < 5 ? '<span class="mk-hint">Click indexes on the left, or search an item, to compare up to 5.</span>' : '');
    drawChart(box, list);
  }

  function searchResults(q) {
    const r = R(), words = q.toLowerCase().split(/\s+/).filter(Boolean), L = st.all ? latAll : (i) => lat(r, i);
    if (!words.length) return '';
    let hits = Object.entries(MKT.cat).filter(([, c]) => words.every((w) => c[0].toLowerCase().includes(w)))
      .map(([id, c]) => [+id, c, L(id)]).filter((x) => !RSN() || x[2]);
    const ql = q.trim().toLowerCase();
    const rank = (n) => { n = n.toLowerCase(); return n === ql ? 0 : n.startsWith(ql) ? 1 : n.split(/\s+/).some((w) => w.startsWith(words[0])) ? 2 : 3; };
    hits.sort((a, b) => rank(a[1][0]) - rank(b[1][0]) || ((b[2] ? b[2][3] : 0) - (a[2] ? a[2][3] : 0)));
    hits.splice(8);
    if (!hits.length) return '<div class="mk-none">No item by that name on the auction house.</div>';
    return hits.map(([id, c, l]) => `<button class="mk-hit" data-open="${id}" style="--qc:${QC[c[1]] || '#fff'}"><img src="${icon(id)}" alt=""><span class="mk-nm">${esc(c[0])}</span><span class="mk-pr">${l ? H.coin(l[0]) : '<small>not listed now</small>'}</span><span class="mk-ch ${cls(l && l[4])}">${l ? pctTxt(l[4]) : ''}</span></button>`).join('');
  }

  async function openItem(id, rg) {
    const hideTip = () => { const tp = document.getElementById('tip'); if (tp) tp.style.display = 'none'; };
    hideTip();
    rg = rg || (st.all ? 'all' : st.region);
    const ALL = rg === 'all';
    st.open = id;
    st.q = '';
    if (root) { const res = root.querySelector('.mk-res'), inp = root.querySelector('.mk-search input'); if (res) res.innerHTML = ''; if (inp) { inp.value = ''; inp.blur(); } }
    const c = MKT.cat[id];
    if (!c) return;
    document.querySelectorAll('.mk-modal').forEach((x) => x.remove());
    const r = ALL ? null : rg === st.region ? R() : MKT.regions[rg] || R(), L = ALL ? latAll : (i) => lat(r, i), l = L(id);
    const regs0 = REG.filter((x) => MKT.regions[x]);
    const [shs] = await Promise.all([Promise.all((ALL ? regs0 : [rg]).map((x) => shard(x, id))), loadTips()]);
    const sh = shs[0];
    const row = rowOf(sh, id);
    const qc = QC[c[1]] || '#fff';
    const recipes = window.LI_MULTI ? Object.values(LI_MULTI.tips) : [];
    const byName = {};
    Object.entries(MKT.cat).forEach(([i, x]) => { byName[x[0]] = +i; });
    const made = recipes.find((t) => t.name === c[0] && (t.reagents || []).length);
    const usedIn = recipes.filter((t) => (t.reagents || []).some((g) => g.name === c[0]));
    let madeHtml = '';
    if (made) {
      let cost = 0, known = true;
      const rgs = made.reagents.map((g) => {
        const gi = byName[g.name], gl = gi && L(gi);
        if (gl) cost += gl[0] * g.count; else known = false;
        return `<${gi ? `button class="mk-rg mk-go" data-open="${gi}"` : 'div class="mk-rg"'}><img src="assets/icons/${g.icon}.png" alt=""><span>${g.count}× ${esc(g.name)}</span><span>${gl ? H.coin(gl[0] * g.count) : '<small>no price</small>'}</span></${gi ? 'button' : 'div'}>`;
      }).join('');
      const margin = l && known ? l[0] - cost : null;
      madeHtml = `<div class="mk-box"><h4>Made by ${esc(made.prof)} <small>skill ${made.skill || '?'}</small></h4>${rgs}<div class="mk-tot"><span>Materials</span><span>${known ? H.coin(cost) : 'some unpriced'}</span></div>${margin != null ? `<div class="mk-tot ${margin >= 0 ? 'up' : 'dn'}"><span>${margin >= 0 ? 'Profit crafting it' : 'Loss crafting it'}</span><span>${H.coin(Math.abs(margin))}</span></div>` : ''}</div>`;
    }
    const profs = {};
    usedIn.forEach((t) => { profs[t.prof] = (profs[t.prof] || 0) + 1; });
    const usedHtml = usedIn.length ? `<div class="mk-box"><h4>Used in ${usedIn.length} ${usedIn.length === 1 ? 'recipe' : 'recipes'}</h4><div class="mk-profs">${Object.entries(profs).sort((a, b) => b[1] - a[1]).map(([p, n]) => `<span>${esc(p)} <b>${n}</b></span>`).join('')}</div><div class="mk-icons">${usedIn.sort((a, b) => (a.skill || 0) - (b.skill || 0)).map((t, k) => {
      const oi = byName[t.name];
      return `<${oi ? `button data-open="${oi}"` : 'span'} class="mk-ui${oi ? ' mk-go' : ''}${k >= 11 && usedIn.length > 12 ? ' mk-more-h' : ''}" style="--qc:${QC[t.q] || '#fff'}" data-tip="${esc(t.name)}|${esc(t.prof)}, skill ${t.skill || '?'}"><img src="assets/icons/${t.icon}.png" alt="${esc(t.name)}"></${oi ? 'button' : 'span'}>`;
    }).join('')}${usedIn.length > 12 ? `<button class="mk-more" data-more>+${usedIn.length - 11}</button>` : ''}</div></div>` : '';
    const rp = ['us', 'eu', 'kr', 'tw'].filter((x) => MKT.regions[x]).map((x) => [x, lat(MKT.regions[x], id)]);
    const priced = rp.filter(([, x]) => x && x[0]);
    const minP = Math.min(...priced.map(([, x]) => x[0])), low = priced.length > 1 && priced.filter(([, x]) => x[0] === minP).length === 1 ? priced.find(([, x]) => x[0] === minP)[0] : null;
    const regs = rp.map(([x, v]) => {
      const d = v && l && l[0] && x !== rg ? 100 * (v[0] / l[0] - 1) : null;
      return `<button class="mk-reg${x === rg ? ' on' : ''}" data-rg="${x}"${x === rg ? ' aria-current="true"' : ''}><span class="mk-rn">${ALL ? `<i class="mk-rdot" style="background:${REGC[x]}"></i>` : ''}${x.toUpperCase()}${x === low ? '<em>cheapest</em>' : ''}</span><span class="mk-rp">${v ? H.coin(v[0]) : '<small>not listed</small>'}</span>${d != null ? `<small class="${cls(-d)}">${pctTxt(d)} vs ${ALL ? 'average' : rg.toUpperCase()}</small>` : x === rg ? '<small>viewing</small>' : ''}</button>`;
    }).join('');
    const kin = Object.entries(MKT.cat).filter(([i, x]) => +i !== id && x[3] === c[3] && x[4] === c[4] && L(i))
      .map(([i, x]) => [+i, x, Math.abs((x[7] || 0) - (c[7] || 0)) * 1000 - (L(i)[3] || 0)]).sort((a, b) => a[2] - b[2]).slice(0, 8);
    const kinHtml = kin.length ? `<div class="mk-kin"><h4>Similar on the auction house</h4><div>${kin.map(([i, x]) => `<button class="mk-go" data-open="${i}" style="--qc:${QC[x[1]] || '#fff'}"><img src="${icon(i)}" alt=""><span class="mk-nm">${esc(x[0])}</span><span class="mk-pr">${H.coin(L(i)[0])}</span></button>`).join('')}</div></div>` : '';
    const ch24 = l ? l[4] : null;
    const stats = [['inv_misc_coin_02', 'Cheapest now', l ? H.coin(Math.min(l[1] || l[0], l[0])) : '–'], ['inv_misc_ticket_tarot_stack_01', 'Auctions', l ? H.fmt(l[3]) : '0'], ['inv_misc_bag_10', 'Items for sale', l ? H.fmt(l[2]) : '0'], ['inv_misc_coin_17', 'Vendor pays', c[6] ? H.coin(c[6]) : '–']];
    const chips = [CLASS[c[3]] || 'Item', c[7] ? `Item level ${c[7]}` : '', c[5] ? `Requires level ${c[5]}` : ''].filter(Boolean);
    const tip = H.tipHtml(id);
    const m = document.createElement('div');
    m.className = 'mk-modal';
    m.innerHTML = `<div class="mk-card" role="dialog" aria-label="${esc(c[0])}" style="--qc:${qc}"><button class="mk-x" aria-label="Close">×</button>
      <div class="mk-hero"><div class="mk-hero-ic"><img src="${icon(id)}" alt=""></div>
        <div class="mk-hero-tx"><h3>${esc(c[0])}</h3><div class="mk-chips">${chips.map((x) => `<span>${esc(x)}</span>`).join('')}</div></div>
        <div class="mk-hero-px"><small>${ALL ? 'Average typical price · All regions' : 'Typical price · ' + esc((H.regionName || {})[rg] || rg.toUpperCase())}${RSN() ? ' · ' + esc(RSN()) : ''}${!ALL && rg === st.region && FACN() ? ' · ' + esc(FACN()) : ''}<i class="mk-qh" tabindex="0" role="note" aria-label="The middle price per item of everything listed right now: half the listings are cheaper, half are dearer. A few silly prices barely move it." data-hint="The middle price per item of everything listed right now: half the listings are cheaper, half are dearer. A few silly prices barely move it.">?</i></small><b>${l ? H.coin(l[0]) : '<span class="mk-nl">Not listed right now</span>'}</b>${l ? `<span class="mk-pill ${cls(ch24)}">${pctTxt(ch24)} <i>24h</i></span>` : ''}
          ${ALL ? '' : `<button class="mk-add" data-cmp="${id}"><img src="${H.UI('inv_misc_note_01')}" alt="">Add to chart</button>`}</div></div>
      <div class="mk-stats">${stats.map(([ic, k, v]) => `<div><img src="${H.UI(ic)}" alt=""><span><small>${k}</small><b class="mk-sv">${v}</b></span></div>`).join('')}</div>
      <div class="mk-body"><div class="mk-left"><div class="mk-chead"><h4>Price history</h4><div class="mk-ranges">${RANGES.map(([k]) => `<button class="${k === st.range ? 'on' : ''}" data-mr="${k}">${k}</button>`).join('')}</div></div>
        <div class="mk-key">${ALL ? regs0.map((x) => `<span><i style="background:${REGC[x]}"></i>${x.toUpperCase()}</span>`).join('') + '<span class="mk-keyn">Typical price in each region</span>' : `<span><i style="background:${c[1] >= 2 ? qc : '#f8d36b'}"></i>Typical price</span><span><i style="background:#9aa3ad"></i>Cheapest listing</span>`}</div>
        <div class="mk-iplot"></div><div class="mk-vol"></div>${kinHtml}</div>
        <div class="mk-right">${tip ? `<div class="mk-tip">${tip}</div>` : ''}<div class="mk-box mk-sell" hidden></div>${madeHtml}${usedHtml}</div></div></div>`;
    document.body.appendChild(m);
    balance(m);
    fillSell(m.querySelector('.mk-sell'), ALL ? regs0 : [rg], id, !ALL && rg === st.region).then(() => balance(m));
    hideTip();
    const close = () => { m.remove(); st.open = null; document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    m.addEventListener('click', (e) => {
      if (e.target === m || e.target.closest('.mk-x')) { close(); return; }
      const mo = e.target.closest('[data-more]');
      if (mo) { mo.parentElement.classList.add('open'); mo.remove(); return; }
      const go = e.target.closest('[data-open]');
      if (go) { close(); openItem(+go.dataset.open, rg); return; }
      const rb = e.target.closest('[data-rg]');
      if (rb && rb.dataset.rg !== rg) { close(); openItem(id, rb.dataset.rg); return; }
      const b = e.target.closest('[data-mr]');
      if (b) { st.range = b.dataset.mr; m.querySelectorAll('[data-mr]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }
      const cmp = e.target.closest('[data-cmp]');
      if (cmp) { if (!st.series.some((s) => s.kind === 'item' && s.id === id) && st.series.length < 5) st.series.push({ kind: 'item', id }); close(); paint(); root.querySelector('.mk-term').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
    const draw = () => {
      if (ALL) {
        const list = regs0.map((x, k) => { const rw = rowOf(shs[k], id); return { name: x.toUpperCase(), t: shs[k].t, v: rw ? rw[0].map((y) => y || null) : [], unit: 'coin', color: REGC[x] }; }).filter((s) => s.v.filter((y) => y != null).length >= 2);
        drawChart(m.querySelector('.mk-iplot'), list, { h: 240, abs: true });
        m.querySelector('.mk-vol').innerHTML = '';
        return;
      }
      const t = sh.t, med = row ? row[0].map((x) => x || null) : [], mn = row ? row[1].map((x, k) => (x ? Math.min(x, row[0][k] || x) : null)) : [];
      drawChart(m.querySelector('.mk-iplot'), [{ name: 'Typical price', t, v: med, unit: 'coin', color: c[1] >= 2 ? qc : '#f8d36b' }, { name: 'Cheapest', t, v: mn, unit: 'coin', color: '#9aa3ad' }].filter((s) => s.v.filter((x) => x != null).length >= 2), { h: 240, abs: true, fill: true });
      const q = row ? row[2] : [];
      const mx = Math.max(1, ...q);
      const kf = (x) => x >= 1e4 ? Math.round(x / 1e3) + 'k' : x >= 1e3 ? (x / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(x);
      const pk = q.indexOf(mx), vw = (m.querySelector('.mk-vol') || {}).clientWidth || 600, step = Math.max(1, Math.ceil(q.length / Math.max(4, Math.floor(vw / 32))));
      m.querySelector('.mk-vol').innerHTML = q.length ? `<small>Items for sale each hour</small><div class="mk-bars">${q.map((x, i) => `<i${i === pk ? ' class="pk"' : ''} style="height:${Math.max(2, 100 * x / mx)}%" title="${H.fmt(x)} for sale · ${new Date(t[i] * 1000).toLocaleString()}">${(q.length - 1 - i) % step === 0 || (i === pk && (q.length - 1 - i) % step > 1) ? `<em>${kf(x)}</em>` : ''}</i>`).join('')}</div>` : '';
    };
    draw();
  }

  function paint() {
    root.innerHTML = `<div class="mk-term">
      <div class="mk-top"><div class="mk-search"><input type="search" placeholder="Search any item: Copper Ore, Linen Bag, Thunderfury…" value="${esc(st.q)}" aria-label="Search items"><div class="mk-res"></div></div>
        ${MKT.live && FAC_UI ? `<div class="mk-fac" role="group" aria-label="Auction house">${FACS.map(([f, n, ic]) => `<button class="${f === st.fac ? 'on' : ''}" data-fac="${f}"><img src="${facIcon(f, ic)}" alt="">${n}</button>`).join('')}</div>` : ''}
        <div class="mk-reg-note">${st.all ? 'Indexes for ' : ''}${esc((H.regionName || {})[st.region] || st.region.toUpperCase())}${RSN() ? ' · ' + esc(RSN()) : ''}${FACN() ? ' · ' + esc(FACN()) : ''} · ${R().t.length} hourly snapshot${R().t.length === 1 ? "" : "s"}</div></div>
      <div class="mk-grid"><div class="mk-side">${indexList()}</div>
        <div class="mk-main"><div class="mk-bar"><div class="mk-legend"></div><div class="mk-ranges">${RANGES.map(([k]) => `<button class="${k === st.range ? 'on' : ''}" data-r="${k}">${k}</button>`).join('')}</div></div><div class="mk-plot"></div>
        <div class="mk-foot">${st.series.length > 1 ? 'Compared as % change from the start of the range.' : 'Index value; every index starts at 100 when its history begins.'}</div></div></div></div>`;
    renderChart();
    const inp = root.querySelector('.mk-search input'), res = root.querySelector('.mk-res');
    inp.addEventListener('input', () => { st.q = inp.value; res.innerHTML = searchResults(st.q); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const f = res.querySelector('[data-open]'); if (f) openItem(+f.dataset.open); } if (e.key === 'Escape') { res.innerHTML = ''; inp.blur(); } });
    inp.addEventListener('focus', () => { if (inp.value.trim()) res.innerHTML = searchResults(inp.value); });
    if (!window.__mkOutside) {
      window.__mkOutside = true;
      document.addEventListener('mousedown', (e) => { if (!e.target.closest('.mk-search')) document.querySelectorAll('.mk-res').forEach((r) => { r.innerHTML = ''; }); });
      document.addEventListener('touchstart', (e) => { if (!e.target.closest('.mk-search')) document.querySelectorAll('.mk-res').forEach((r) => { r.innerHTML = ''; }); }, { passive: true });
    }
    res.innerHTML = st.q ? searchResults(st.q) : '';
    root.onclick = async (e) => {
      const fb = e.target.closest('[data-fac]');
      if (fb) {
        st.fac = fb.dataset.fac;
        if (st.fac !== 'all') { fb.classList.add('busy'); facView[st.region + ':' + st.fac] = await loadFac(st.region, st.fac); }
        paint();
        return;
      }
      const o = e.target.closest('[data-open]');
      if (o) { openItem(+o.dataset.open); return; }
      const ix = e.target.closest('[data-ix]');
      if (ix) {
        const k = ix.dataset.ix, at = st.series.findIndex((s) => s.kind === 'idx' && s.key === k);
        if (at >= 0) { if (st.series.length > 1) st.series.splice(at, 1); } else if (st.series.length < 5) st.series.push({ kind: 'idx', key: k }); else st.series[4] = { kind: 'idx', key: k };
        paint();
        return;
      }
      const rm = e.target.closest('[data-rm]');
      if (rm) { st.series.splice(+rm.dataset.rm, 1); paint(); return; }
      const rg = e.target.closest('[data-r]');
      if (rg) { st.range = rg.dataset.r; paint(); }
    };
  }

  window.LI_MARKET = {
    async mount(el, helpers, region) {
      H = helpers;
      root = el;
      el.innerHTML = '<div class="mk-empty">Loading the market…</div>';
      await load();
      if (!window.MKT) { el.innerHTML = '<div class="mk-empty">Market history is not available right now.</div>'; return; }
      st.all = region === 'all';
      st.region = MKT.regions[region] ? region : (MKT.regions.eu ? 'eu' : Object.keys(MKT.regions)[0]);
      st.fac = !RSN() && FACN() ? FACN() : 'all';
      if (st.fac !== 'all' && MKT.live) facView[st.region + ':' + st.fac] = await loadFac(st.region, st.fac);
      if (RSN() && MKT.live) setView[st.region + ':' + RSN()] = await loadSet(st.region, RSN());
      if (houseKey() && MKT.live) houseView[st.region + ':' + houseKey()] = await loadHouse(st.region, houseKey());
      st.series = st.series.filter((s) => s.kind === 'idx' ? MKT.regions[st.region].idx[s.key] : true);
      if (!st.series.length) st.series = [{ kind: 'idx', key: Object.keys(MKT.regions[st.region].idx)[0] }];
      paint();
    },
    open: (id) => load().then(() => { if (window.MKT && H) openItem(id); }),
  };
})();
