(() => {
  const COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'];
  const RANGES = [['6H', 6 * 3600], ['1D', 86400], ['1W', 7 * 86400], ['1M', 30 * 86400], ['ALL', 0]];
  const CLASS = { 0: 'Consumable', 1: 'Bag', 2: 'Weapon', 3: 'Gem', 4: 'Armour', 5: 'Reagent', 6: 'Ammo', 7: 'Trade good', 9: 'Recipe', 11: 'Quiver', 12: 'Quest item', 13: 'Key', 15: 'Miscellaneous' };
  const QC = ['#9d9d9d', '#ffffff', '#1eff00', '#3a95f5', '#b94cf7', '#ff8000'];
  const st = { region: 'eu', series: [{ kind: 'idx', key: 'F100' }], range: 'ALL', q: '', open: null };
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
  function load() {
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
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const icon = (id) => { const c = MKT.cat[id]; const tp = window.ECON && ECON.tips && ECON.tips[id]; const ic = (c && c[2]) || (tp && tp[10]); return ic ? `assets/icons/${ic}.png` : H.UI('inv_misc_questionmark'); };
  const pctTxt = (v) => v == null ? '–' : (v > 0 ? '+' : '') + v.toFixed(Math.abs(v) < 10 ? 1 : 0) + '%';
  const cls = (v) => v == null ? '' : v > 0 ? 'up' : v < 0 ? 'dn' : '';
  const R = () => MKT.regions[st.region] || { t: [], idx: {}, latest: {}, counts: {} };
  const defOf = (k) => MKT.defs.find((d) => d.k === k);

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
  function spark(v, w = 64, h = 20) {
    const pts = v.map((x, i) => [i, x]).filter((p) => p[1] != null);
    if (pts.length < 2) return `<svg class="mk-spark" width="${w}" height="${h}"></svg>`;
    const lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1])), n = v.length - 1 || 1;
    const d = pts.map(([i, x], k) => `${k ? 'L' : 'M'}${(i / n * (w - 2) + 1).toFixed(1)},${(h - 2 - (hi > lo ? (x - lo) / (hi - lo) : 0.5) * (h - 4)).toFixed(1)}`).join('');
    const up = pts[pts.length - 1][1] >= pts[0][1];
    return `<svg class="mk-spark" width="${w}" height="${h}"><path d="${d}" class="${up ? 'up' : 'dn'}"/></svg>`;
  }
  function fmtTime(t, span) {
    const d = new Date(t * 1000);
    return span > 3 * 86400 ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  async function seriesData(s) {
    if (s.kind === 'idx') { const x = idxSeries(s.key); return { name: defOf(s.key).n, t: x.t, v: x.v, unit: 'idx' }; }
    const sh = await shard(st.region, s.id);
    const row = sh.i[s.id];
    return { name: MKT.cat[s.id] ? MKT.cat[s.id][0] : 'Item ' + s.id, t: sh.t, v: row ? row[0].map((x) => x || null) : [], unit: 'coin' };
  }

  function drawChart(el, list, opts = {}) {
    const W = Math.max(280, el.clientWidth || 600), Hh = opts.h || Math.max(280, el.clientHeight || 300), P = { l: 8, r: 64, t: 12, b: 26 };
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
    const lab = (v) => rel ? (v > 0 ? '+' : '') + v.toFixed(1) + '%' : list[0].unit === 'coin' ? H.coinT(v) : v.toFixed(1);
    let svg = `<svg class="mk-chart" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}">`;
    svg += ticks.map((v) => `<line class="mk-gl" x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="mk-yl" x="${W - P.r + 6}" y="${Y(v) + 4}">${esc(lab(v))}</text>`).join('');
    if (rel && lo < 0 && hi > 0) svg += `<line class="mk-zero" x1="${P.l}" x2="${W - P.r}" y1="${Y(0)}" y2="${Y(0)}"/>`;
    const xt = [xa, (xa + xb) / 2, xb];
    svg += xt.map((t, i) => `<text class="mk-xl" x="${X(t)}" y="${Hh - 6}" text-anchor="${i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}">${fmtTime(t, xb - xa)}</text>`).join('');
    S.forEach((s) => {
      if (!s.pts.length) return;
      const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
      if (S.length === 1) svg += `<path class="mk-area" d="${d}L${X(s.pts[s.pts.length - 1][0]).toFixed(1)},${Hh - P.b}L${X(s.pts[0][0]).toFixed(1)},${Hh - P.b}Z" fill="${s.color}"/>`;
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
    return Object.entries(groups).map(([g, ds]) => `<div class="mk-grp"><h5>${esc(g)}</h5>${ds.map((d) => {
      const v = r.idx[d.k], [, lv] = lastVal(v), ch = change(r.t, v, 86400), on = st.series.findIndex((s) => s.kind === 'idx' && s.key === d.k);
      return `<button class="mk-ix${on >= 0 ? ' on' : ''}" data-ix="${d.k}" style="--sc:${on >= 0 ? COLORS[on] : 'transparent'}" title="${esc(d.d)} ${r.counts[d.k] || 0} items."><span class="mk-sw"></span><img src="${H.UI(d.ic)}" alt=""><span class="mk-nm">${esc(d.n)}</span>${spark(v)}<span class="mk-vl">${lv != null ? lv.toFixed(1) : '–'}</span><span class="mk-ch ${cls(ch)}">${pctTxt(ch)}</span></button>`;
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
    const r = R(), words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    let hits = Object.entries(MKT.cat).filter(([, c]) => words.every((w) => c[0].toLowerCase().includes(w)))
      .map(([id, c]) => [+id, c, r.latest[id]]);
    const ql = q.trim().toLowerCase();
    const rank = (n) => { n = n.toLowerCase(); return n === ql ? 0 : n.startsWith(ql) ? 1 : n.split(/\s+/).some((w) => w.startsWith(words[0])) ? 2 : 3; };
    hits.sort((a, b) => rank(a[1][0]) - rank(b[1][0]) || ((b[2] ? b[2][3] : 0) - (a[2] ? a[2][3] : 0)));
    hits.splice(8);
    if (!hits.length) return '<div class="mk-none">No item by that name on the auction house.</div>';
    return hits.map(([id, c, l]) => `<button class="mk-hit" data-open="${id}" style="--qc:${QC[c[1]] || '#fff'}"><img src="${icon(id)}" alt=""><span class="mk-nm">${esc(c[0])}</span><span class="mk-pr">${l ? H.coin(l[0]) : '<small>not listed now</small>'}</span><span class="mk-ch ${cls(l && l[4])}">${l ? pctTxt(l[4]) : ''}</span></button>`).join('');
  }

  async function openItem(id) {
    st.open = id;
    st.q = '';
    if (root) { const res = root.querySelector('.mk-res'), inp = root.querySelector('.mk-search input'); if (res) res.innerHTML = ''; if (inp) { inp.value = ''; inp.blur(); } }
    const c = MKT.cat[id];
    if (!c) return;
    const r = R(), l = r.latest[id];
    const sh = await shard(st.region, id);
    const row = sh.i[id];
    const recipes = window.LI_MULTI ? Object.values(LI_MULTI.tips) : [];
    const byName = {};
    Object.entries(MKT.cat).forEach(([i, x]) => { byName[x[0]] = +i; });
    const made = recipes.find((t) => t.id === id);
    const usedIn = recipes.filter((t) => (t.reagents || []).some((g) => g.name === c[0]));
    let madeHtml = '';
    if (made) {
      let cost = 0, known = true;
      const rg = made.reagents.map((g) => { const gi = byName[g.name], gl = gi && r.latest[gi]; if (gl) cost += gl[0] * g.count; else known = false; return `<div class="mk-rg"><img src="assets/icons/${g.icon}.png" alt=""><span>${g.count}× ${esc(g.name)}</span><span>${gl ? H.coin(gl[0] * g.count) : '<small>no price</small>'}</span></div>`; }).join('');
      const margin = l && known ? l[0] - cost : null;
      madeHtml = `<div class="mk-box"><h4>Made by ${esc(made.prof)} <small>skill ${made.skill || '?'}</small></h4>${rg}<div class="mk-tot"><span>Materials</span><span>${known ? H.coin(cost) : 'some unpriced'}</span></div>${margin != null ? `<div class="mk-tot ${margin >= 0 ? 'up' : 'dn'}"><span>${margin >= 0 ? 'Profit crafting it' : 'Loss crafting it'}</span><span>${H.coin(Math.abs(margin))}</span></div>` : ''}</div>`;
    }
    const profs = {};
    usedIn.forEach((t) => { profs[t.prof] = (profs[t.prof] || 0) + 1; });
    const usedHtml = usedIn.length ? `<div class="mk-box"><h4>Used in ${usedIn.length} ${usedIn.length === 1 ? 'recipe' : 'recipes'}</h4><div class="mk-profs">${Object.entries(profs).sort((a, b) => b[1] - a[1]).map(([p, n]) => `<span>${esc(p)} <b>${n}</b></span>`).join('')}</div><div class="mk-icons">${usedIn.sort((a, b) => (a.skill || 0) - (b.skill || 0)).map((t, k) => `<span class="mk-ui${k >= 11 && usedIn.length > 12 ? ' mk-more-h' : ''}" style="--qc:${QC[t.q] || '#fff'}" data-tip="${esc(t.name)}|${esc(t.prof)}, skill ${t.skill || '?'}"><img src="assets/icons/${t.icon}.png" alt="${esc(t.name)}"></span>`).join('')}${usedIn.length > 12 ? `<button class="mk-more" data-more>+${usedIn.length - 11}</button>` : ''}</div></div>` : '';
    const regs = ['us', 'eu', 'kr', 'tw'].filter((rg) => MKT.regions[rg]).map((rg) => { const x = MKT.regions[rg].latest[id]; return `<div class="mk-reg${rg === st.region ? ' on' : ''}"><span>${rg.toUpperCase()}</span>${x ? H.coin(x[0]) : '<small>–</small>'}</div>`; }).join('');
    const ch24 = l ? l[4] : null;
    const tiles = [['Typical price', l ? H.coin(l[0]) : '–'], ['Cheapest now', l ? H.coin(l[1]) : '–'], ['24 hours', `<span class="${cls(ch24)}">${pctTxt(ch24)}</span>`], ['Auctions', l ? H.fmt(l[3]) : '0'], ['For sale', l ? H.fmt(l[2]) : '0'], ['Vendor pays', c[6] ? H.coin(c[6]) : '–']];
    const tip = H.tipHtml(id);
    const m = document.createElement('div');
    m.className = 'mk-modal';
    m.innerHTML = `<div class="mk-card" role="dialog" aria-label="${esc(c[0])}"><button class="mk-x" aria-label="Close">×</button>
      <div class="mk-head" style="--qc:${QC[c[1]] || '#fff'}"><img src="${icon(id)}" alt=""><div><div class="mk-ttl"><h3>${esc(c[0])}</h3><button class="mk-add" data-cmp="${id}"><img src="${H.UI('inv_misc_note_01')}" alt="">Add to chart</button></div><div class="mk-sub">${esc(CLASS[c[3]] || 'Item')}${c[5] ? ` · needs level ${c[5]}` : ''}${c[7] ? ` · item level ${c[7]}` : ''}</div></div></div>
      <div class="mk-body"><div class="mk-left"><div class="mk-tiles">${tiles.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
        <div class="mk-ranges">${RANGES.map(([k]) => `<button class="${k === st.range ? 'on' : ''}" data-mr="${k}">${k}</button>`).join('')}</div>
        <div class="mk-iplot"></div><div class="mk-vol"></div></div>
        <div class="mk-right">${tip ? `<div class="mk-tip">${tip}</div>` : ''}<div class="mk-box mk-regs"><h4>Price in each region</h4><div>${regs}</div></div>${madeHtml}${usedHtml}</div></div></div>`;
    document.body.appendChild(m);
    const close = () => { m.remove(); st.open = null; document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    m.addEventListener('click', (e) => {
      if (e.target === m || e.target.closest('.mk-x')) close();
      const mo = e.target.closest('[data-more]');
      if (mo) { mo.parentElement.classList.add('open'); mo.remove(); return; }
      const b = e.target.closest('[data-mr]');
      if (b) { st.range = b.dataset.mr; m.querySelectorAll('[data-mr]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }
      const cmp = e.target.closest('[data-cmp]');
      if (cmp) { if (!st.series.some((s) => s.kind === 'item' && s.id === id) && st.series.length < 5) st.series.push({ kind: 'item', id }); close(); paint(); root.querySelector('.mk-term').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
    const draw = () => {
      const t = sh.t, med = row ? row[0].map((x) => x || null) : [], mn = row ? row[1].map((x) => x || null) : [];
      drawChart(m.querySelector('.mk-iplot'), [{ name: 'Typical price', t, v: med, unit: 'coin', color: QC[c[1]] && c[1] >= 2 ? QC[c[1]] : '#f8d36b' }, { name: 'Cheapest', t, v: mn, unit: 'coin', color: '#9aa3ad' }].filter((s) => s.v.filter((x) => x != null).length >= 2), { h: 240, abs: true });
      const left = m.querySelector('.mk-left'), right = m.querySelector('.mk-right');

      const q = row ? row[2] : [];
      const mx = Math.max(1, ...q);
      m.querySelector('.mk-vol').innerHTML = q.length ? `<small>Items for sale</small><div class="mk-bars">${q.map((x, i) => `<i style="height:${Math.max(2, 100 * x / mx)}%" title="${H.fmt(x)} for sale · ${new Date(t[i] * 1000).toLocaleString()}"></i>`).join('')}</div>` : '';
    };
    draw();
  }

  function paint() {
    root.innerHTML = `<div class="mk-term">
      <div class="mk-top"><div class="mk-search"><input type="search" placeholder="Search any item: Copper Ore, Linen Bag, Thunderfury…" value="${esc(st.q)}" aria-label="Search items"><div class="mk-res"></div></div>
        <div class="mk-reg-note">${esc((H.regionName || {})[st.region] || st.region.toUpperCase())} · ${R().t.length} hourly snapshots</div></div>
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
    root.onclick = (e) => {
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
      st.region = MKT.regions[region] ? region : (MKT.regions.eu ? 'eu' : Object.keys(MKT.regions)[0]);
      st.series = st.series.filter((s) => s.kind === 'idx' ? MKT.regions[st.region].idx[s.key] : true);
      if (!st.series.length) st.series = [{ kind: 'idx', key: Object.keys(MKT.regions[st.region].idx)[0] }];
      paint();
    },
    open: (id) => openItem(id),
  };
})();
