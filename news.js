(() => {
  const API = 'https://azeroth-news.sanredz.workers.dev';
  const UI = (n) => `assets/game/ui/${n}.png`;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KIND = {
    article: { label: 'Blizzard', color: '#5fb8ff', icon: UI('inv_misc_note_01') },
    patch: { label: 'Patch notes', color: '#f8d36b', icon: UI('inv_misc_gear_01') },
    announce: { label: 'Blizzard', color: '#5fb8ff', icon: UI('inv_misc_book_11') },
    blue: { label: 'Blue post', color: '#5fb8ff', icon: UI('ability_warrior_battleshout') },
    status: { label: 'Realm status', color: '#ff9f7a', icon: UI('inv_misc_pocketwatch_01') },
    issues: { label: 'Known issues', color: '#ff9f7a', icon: UI('inv_misc_questionmark') },
    media: { label: 'Blizzard', color: '#5fb8ff', icon: UI('inv_misc_ticket_tarot_stack_01') },
  };
  const SRC = {
    'Wowhead': '#ff6a3d', 'Blizzard Watch': '#3fb0f0', 'Warcraft Tavern': '#e3a94a', 'Massively OP': '#b48cff', 'Mein-MMO': '#ff5a5a', Blizzard: '#5fb8ff',
  };
  const TABS = [
    ['all', 'Everything'], ['blizzard', 'Blizzard'], ['video', 'Videos'], ['reddit', 'Reddit'], ['press', 'Around the web'], ['event', 'Events'],
  ];
  const CLASSES = ['WARRIOR', 'PALADIN', 'HUNTER', 'ROGUE', 'PRIEST', 'SHAMAN', 'MAGE', 'WARLOCK', 'DRUID'];
  const CNAME = { WARRIOR: 'Warrior', PALADIN: 'Paladin', HUNTER: 'Hunter', ROGUE: 'Rogue', PRIEST: 'Priest', SHAMAN: 'Shaman', MAGE: 'Mage', WARLOCK: 'Warlock', DRUID: 'Druid' };
  const CCOL = { WARRIOR: '#C69B6D', PALADIN: '#F48CBA', HUNTER: '#AAD372', ROGUE: '#FFF468', PRIEST: '#FFFFFF', SHAMAN: '#2f8cff', MAGE: '#3FC7EB', WARLOCK: '#8788EE', DRUID: '#FF7C0A' };
  const PROFS = ['alchemy', 'blacksmithing', 'enchanting', 'engineering', 'leatherworking', 'tailoring', 'mining', 'skinning', 'herbalism', 'cooking', 'fishing', 'first aid'];
  const CATS = [
    { k: 'classes', label: 'Classes', icon: UI('inv_sword_27'), re: /^class|talent|spec/i },
    { k: 'profs', label: 'Professions', icon: UI('inv_misc_bag_10'), re: /profession|crafting|gathering|recipe/i },
    { k: 'pvp', label: 'PvP', icon: UI('inv_bannerpvp_01'), re: /pvp|player versus player|battleground|honor|darkspear|arena/i },
    { k: 'races', label: 'Races', icon: UI('achievement_zone_elwynnforest'), re: /^race|racial|skyborne/i },
    { k: 'pve', label: 'Dungeons & raids', icon: UI('achievement_dungeon_classicdungeonmaster'), re: /dungeon|raid|creature|encounter|boss|instance|npc/i },
    { k: 'items', label: 'Items', icon: UI('inv_helmet_25'), re: /item|loot|gear|weapon|armor|reward/i },
    { k: 'quests', label: 'Quests & world', icon: UI('inv_misc_book_09'), re: /quest|world|zone|campfire|event|flight|travel/i },
    { k: 'fixes', label: 'Bug fixes', icon: UI('trade_engineering'), re: /bug|fix|issue/i },
  ];
  const CAT_OTHER = { k: 'other', label: 'General', icon: UI('inv_misc_rune_01') };
  const TYPE = {
    buff: { label: 'Buff', glyph: '▲' },
    nerf: { label: 'Nerf', glyph: '▼' },
    new: { label: 'New', glyph: '✦' },
    fix: { label: 'Fix', glyph: '✓' },
    rem: { label: 'Removed', glyph: '✕' },
    move: { label: 'Moved', glyph: '⇅' },
    tune: { label: 'Tuning', glyph: '≈' },
    change: { label: 'Change', glyph: '•' },
  };
  const TYPE_ORDER = ['buff', 'nerf', 'new', 'fix', 'rem', 'change'];
  const PLURAL = { buff: 'buffs', nerf: 'nerfs', new: 'new', fix: 'fixes', rem: 'removed', change: 'other' };

  const store = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const load = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const memo = {};
  const get = (path) => (memo[path] = memo[path] || fetch(API + path).then((r) => r.json()).catch(() => ({ items: [] })));
  const spells = () => (memo.spells = memo.spells || (window.LI_SPELLS ? Promise.resolve() : new Promise((ok) => {
    const s = document.createElement('script');
    s.src = 'spellicons.js';
    s.onload = s.onerror = () => ok();
    document.head.appendChild(s);
  })));

  const ts = (s) => new Date(s).getTime();
  function ago(s) {
    const d = (Date.now() - ts(s)) / 1000;
    if (d < 3600) return `${Math.max(1, Math.round(d / 60))}m ago`;
    if (d < 86400) return `${Math.round(d / 3600)}h ago`;
    if (d < 7 * 86400) return `${Math.floor(d / 86400)}d ago`;
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  const pt = (s, o) => new Date(s).toLocaleDateString('en-US', Object.assign({ timeZone: 'America/Los_Angeles' }, o));
  function shortTitle(it) {
    let t = it.title.replace(/\s*[–-]\s*Updated [A-Z][a-z]+ \d+$/, '');
    if (/^(wow )?(forever )?(beta )?development notes$/i.test(t.replace(/^wow forever /i, ''))) t = `${/beta/i.test(t) ? 'Beta notes' : 'Patch notes'} · ${pt(it.created, { month: 'short', day: 'numeric' })}`;
    return t;
  }

  function blizz(it) {
    const out = it.kind === 'article' && it.link;
    return {
      id: `b${it.id}`, raw: it, group: it.kind === 'patch' ? 'patch' : 'blizzard', source: 'Blizzard', kind: it.kind,
      title: shortTitle(it), url: it.kind === 'patch' ? `#patches/${it.id}` : out ? it.link : `#news/${it.id}`, ext: !!out,
      image: it.image, created: it.created, author: it.author, excerpt: (it.excerpt || '').replace(/View Full Article/gi, '').replace(it.title, '').trim(),
    };
  }
  function comm(it) {
    const group = it.kind === 'short' ? 'video' : it.kind;
    return { id: `c${it.url}`, raw: it, group, short: it.kind === 'short', source: it.source, kind: it.kind, title: it.title, url: it.url, ext: true, image: it.image, created: it.created, author: it.author, excerpt: it.excerpt || '', hot: it.hot || 0, event: !!it.event };
  }
  async function everything() {
    const [b, c] = await Promise.all([get('/api/news?limit=200'), get('/api/feed?limit=300')]);
    const items = (b.items || []).filter((i) => KIND[i.kind]).map(blizz).concat((c.items || []).map(comm));
    items.sort((x, y) => ts(y.created) - ts(x.created));
    return items;
  }

  const link = (i, cls, inner) => i.group === 'blizzard' && !i.ext
    ? `<a class="${cls}" href="${esc(i.url)}" data-read="${i.raw.id}">${inner}</a>`
    : `<a class="${cls}" href="${esc(i.url)}"${i.ext ? ' target="_blank" rel="noopener"' : ''}>${inner}</a>`;
  const pic = (src, cls = '') => src ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
  function badge(i) {
    if (i.group === 'video') return `<span class="az-src az-yt"><i></i>${esc(i.source)}</span>`;
    if (i.group === 'reddit') return `<span class="az-src az-rd"><i></i>${esc(i.source)}</span>`;
    const k = KIND[i.kind];
    const color = i.source === 'Blizzard' ? (k ? k.color : SRC.Blizzard) : (SRC[i.source] || '#c9b99a');
    const label = i.source === 'Blizzard' ? (k ? k.label : 'Blizzard') : i.source;
    return `<span class="az-src" style="--sc:${color}"><i></i>${esc(label)}</span>`;
  }
  const meta = (i) => `<span class="az-meta">${badge(i)}<span>${ago(i.created)}</span></span>`;
  function fallbackArt(i) {
    const k = KIND[i.kind];
    return `<div class="az-noimg"><img src="${k ? k.icon : i.group === 'reddit' ? UI('inv_misc_note_01') : UI('inv_misc_book_09')}" alt=""></div>`;
  }

  function videoCard(i) {
    return link(i, `az-vid${i.short ? ' az-short' : ''}`, `<div class="az-vt">${pic(i.image)}<span class="az-play"></span>${i.short ? '<span class="az-sh">Short</span>' : ''}</div>
      <b>${esc(i.title)}</b><span class="az-meta"><span class="az-src az-yt"><i></i>${esc(i.source)}</span><span>${ago(i.created)}</span></span>`);
  }
  function storyCard(i, cls = '') {
    return link(i, `az-card ${cls}`, `<div class="az-ci">${i.image ? pic(i.image) : fallbackArt(i)}</div><div class="az-ct">${meta(i)}<b>${esc(i.title)}</b></div>`);
  }
  function listRow(i, n) {
    return link(i, 'az-row', `${n != null ? `<span class="az-n">${n}</span>` : ''}<span class="az-rt"><b>${esc(i.title)}</b>${meta(i)}</span>`);
  }

  function bindReader(el) {
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-read]');
      if (!a) return;
      e.preventDefault();
      reader(a.dataset.read);
    });
  }

  async function home(el) {
    el.innerHTML = `<div class="in slab az-today"><div class="az-mast"><div><span class="az-kick">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span><h2>Azeroth Today</h2></div><div class="az-pills" id="azPills"></div></div><p class="az-wait">Gathering the latest from around Azeroth…</p></div>`;
    const all = await everything();
    const box = el.querySelector('.az-today');
    box.querySelector('.az-wait').remove();
    if (!all.length) { box.insertAdjacentHTML('beforeend', '<p class="az-empty">News is taking a break. Try again in a minute.</p>'); return; }
    const recent = (h) => (i) => Date.now() - ts(i.created) < h * 3600000;
    const used = new Set();
    const take = (list, n) => { const out = []; for (const i of list) { if (out.length >= n) break; if (used.has(i.id)) continue; used.add(i.id); out.push(i); } return out; };
    const weight = (i) => ts(i.created) + (i.source === 'Blizzard' ? 14 : i.source === 'Wowhead' || i.source === 'Massively OP' ? 4 : 0) * 3600000;
    const stories = all.filter((i) => (i.group === 'blizzard' || i.group === 'press') && i.image && i.kind !== 'status').sort((a, b) => weight(b) - weight(a));
    const lead = take(stories, 1)[0];
    const seenSrc = new Set([lead && lead.source]);
    const tops = take(stories.filter((i) => { if (seenSrc.has(i.source)) return false; seenSrc.add(i.source); return true; }), 3);
    if (tops.length < 3) tops.push(...take(stories, 3 - tops.length));
    const vids = take(all.filter((i) => i.group === 'video').sort((a, b) => (a.short - b.short) || ts(b.created) - ts(a.created)), 8);
    const heat = (i) => i.hot - (Date.now() - ts(i.created)) / 86400000 * 6;
    const hot = take(all.filter((i) => i.group === 'reddit' && i.hot > 0 && i.raw.hot_at && Date.now() - ts(i.raw.hot_at) < 30 * 3600000).sort((a, b) => heat(b) - heat(a)), 6);
    const blue = take(all.filter((i) => i.group === 'blizzard' && ['blue', 'announce', 'status', 'issues', 'media', 'article'].includes(i.kind)), 5);
    const events = take(all.filter((i) => i.event && recent(14 * 24)(i)), 4);
    const press = take(all.filter((i) => i.group === 'press'), 5);
    const patch = all.find((i) => i.group === 'patch');
    const status = all.find((i) => i.kind === 'status' && recent(24)(i));

    const pills = [];
    if (status) pills.push(link(status, 'az-pill az-warn', `<i></i>${esc(status.title)}`));
    if (patch) pills.push(`<a class="az-pill" href="#patches"><i></i>Patch notes · ${pt(patch.created, { month: 'short', day: 'numeric' })}</a>`);
    box.querySelector('#azPills').innerHTML = pills.join('');

    const head = (dot, label, href) => `<div class="az-h"><span class="az-dot ${dot}"></span><span>${label}</span>${href ? `<a href="${href}">More</a>` : ''}</div>`;
    let h = `<div class="az-top">${lead ? link(lead, 'az-lead', `${pic(lead.image)}<div class="az-shade"></div><div class="az-lt">${meta(lead)}<h3>${esc(lead.title)}</h3>${lead.excerpt ? `<p>${esc(lead.excerpt.slice(0, 160))}${lead.excerpt.length > 160 ? '…' : ''}</p>` : ''}</div>`) : ''}
      <div class="az-stack">${tops.map((i) => storyCard(i, 'az-mini')).join('')}</div></div>`;
    h += `<div class="az-grid">`;
    if (patch) h += `<div class="az-col az-patch">${head('az-pn', 'Latest patch notes', `#patches/${patch.raw.id}`)}<div class="az-pd"><p class="az-wait">Reading the notes…</p></div></div>`;
    h += `<div class="az-col">${head('az-rd', 'Trending on Reddit', '#news/reddit')}${hot.length ? hot.map((i, n) => listRow(i, n + 1)).join('') : '<p class="az-empty">Quiet on Reddit right now.</p>'}</div>`;
    h += `</div>`;
    h += `<div class="az-sect" id="azLive" hidden></div>`;
    if (vids.length) h += `<div class="az-sect">${head('az-yt', 'Watch', '#news/video')}<div class="az-vids">${vids.map(videoCard).join('')}</div></div>`;
    h += `<div class="az-grid az-g3"><div class="az-col">${head('az-bz', 'From Blizzard', '#news/blizzard')}${blue.map((i) => listRow(i)).join('')}</div>
      <div class="az-col">${head('az-pr', 'Around the web', '#news/press')}${press.map((i) => listRow(i)).join('')}</div>
      ${events.length ? `<div class="az-col">${head('az-ev', 'Events & community', '#news/event')}${events.map((i) => listRow(i)).join('')}</div>` : ''}</div>`;
    h += `<div class="az-foot"><span>Pulled automatically from Blizzard, Wowhead, Blizzard Watch, Warcraft Tavern, Massively OP, Mein-MMO, Reddit and YouTube.</span><a href="#news">All news →</a></div>`;
    box.insertAdjacentHTML('beforeend', h);
    bindReader(box);
    if (patch) patchCard(box.querySelector('.az-pd'), patch.raw.id);
    liveStrip(box.querySelector('#azLive'));
  }

  async function liveStrip(el) {
    const d = await fetch(`${API}/api/live`).then((r) => r.json()).catch(() => null);
    const live = (d && d.live) || [];
    if (!live.length) return;
    const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
    const total = live.reduce((a, s) => a + s.viewers, 0);
    el.innerHTML = `<div class="az-h"><span class="az-dot az-tw"></span><span>Live now</span><small class="az-tws">${live.length} streams · ${fmt(total)} watching</small><a href="https://www.twitch.tv/search?term=wow%20forever" target="_blank" rel="noopener">Twitch</a></div>
      <div class="az-vids">${live.slice(0, 12).map((s) => `<a class="az-vid" href="${esc(s.url)}" target="_blank" rel="noopener"><div class="az-vt">${pic(`${s.thumb}?t=${Math.floor(Date.now() / 600000)}`)}<span class="az-live">Live</span><span class="az-view">${fmt(s.viewers)}</span></div>
        <b>${esc(s.title)}</b><span class="az-meta"><span class="az-src az-twn"><i></i>${esc(s.name)}</span><span>${s.lang && s.lang !== 'en' ? esc(s.lang.toUpperCase()) : ''}</span></span></a>`).join('')}</div>`;
    el.hidden = false;
  }

  async function patchCard(el, id) {
    const [d] = await Promise.all([get('/api/patches'), spells()]);
    const it = (d.items || []).find((i) => i.id === id && (i.cooked || '').length > 200) || (d.items || []).find((i) => i.kind === 'patch' && (i.cooked || '').length > 200);
    if (!it) { el.textContent = ''; return; }
    const P = digestPost(it);
    const tot = {};
    P.sections.forEach((s) => Object.entries(s.counts).forEach(([k, v]) => { tot[k] = (tot[k] || 0) + v; }));
    const cls = P.sections.filter((s) => s.cls);
    el.innerHTML = `<a class="az-pt" href="#patches/${it.id}"><b>${esc(shortTitle(it))}</b><small>${P.total} changes</small></a>
      <div class="pd-sum pd-small">${TYPE_ORDER.filter((k) => tot[k]).map((k) => `<span class="pd-k pd-${k}"><i>${TYPE[k].glyph}</i><b>${tot[k]}</b>${PLURAL[k]}</span>`).join('')}</div>
      ${cls.length ? `<div class="az-cls">${cls.map((s) => `<a href="#patches/${it.id}" data-cls="${s.cls}" title="${CNAME[s.cls]}" style="--cc:${CCOL[s.cls]}"><img src="assets/classes/${s.cls}.png" alt="${CNAME[s.cls]}"><span>${s.counts.buff ? `<em class="pd-buff">▲${s.counts.buff}</em>` : ''}${s.counts.nerf ? `<em class="pd-nerf">▼${s.counts.nerf}</em>` : ''}${!s.counts.buff && !s.counts.nerf ? `<em>${s.total}</em>` : ''}</span></a>`).join('')}</div>` : ''}
      <div class="az-hl">${P.highlights.slice(0, 4).map((r) => `<div class="pd-mini pd-${r.type}"><span class="pd-ic">${r.icon ? `<img src="${r.icon}" alt="">` : `<i>${TYPE[r.type].glyph}</i>`}<em>${TYPE[r.type].glyph}</em></span><span>${r.subj ? `<b>${esc(r.subj)}</b> ` : ''}${esc(clip(r.short, 80))}${r.chip ? ` <span class="pd-chip">${esc(r.chip)}</span>` : ''}</span></div>`).join('')}</div>`;
    el.querySelectorAll('[data-cls]').forEach((a) => a.addEventListener('click', () => store('pn-cls', a.dataset.cls)));
  }
  const clip = (s, n) => s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s;

  function dayLabel(s) {
    const d = new Date(s), now = new Date();
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return 'Today';
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function sanitize(html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstChild;
    root.querySelectorAll('script, style, iframe, object, embed, form, .meta, .lightbox-wrapper .meta').forEach((n) => n.remove());
    root.querySelectorAll('*').forEach((n) => {
      [...n.attributes].forEach((a) => { if (/^on/i.test(a.name) || (a.name === 'style')) n.removeAttribute(a.name); });
      if (n.tagName === 'A') { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener'); if (n.classList.contains('anchor')) n.remove(); }
      if (n.tagName === 'IMG') { n.setAttribute('loading', 'lazy'); n.removeAttribute('width'); n.removeAttribute('height'); if (n.classList.contains('emoji')) n.classList.add('az-emoji'); }
    });
    return root;
  }

  async function reader(id) {
    let dlg = document.getElementById('azReader');
    if (!dlg) {
      document.body.insertAdjacentHTML('beforeend', '<dialog id="azReader" class="az-reader"><button class="az-x" aria-label="Close">✕</button><div class="az-rbody"></div></dialog>');
      dlg = document.getElementById('azReader');
      dlg.querySelector('.az-x').addEventListener('click', () => dlg.close());
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    }
    const body = dlg.querySelector('.az-rbody');
    body.innerHTML = '<p class="az-wait">Loading…</p>';
    if (!dlg.open) dlg.showModal();
    const it = await fetch(`${API}/api/item/${id}`).then((r) => r.json()).catch(() => null);
    if (!it || !it.cooked) { body.innerHTML = '<p class="az-empty">Could not load this post.</p>'; return; }
    const b = blizz(it);
    body.innerHTML = `<div class="az-rh">${meta(b)}<h3>${esc(b.title)}</h3><span class="az-by">${esc(it.author)}${it.author_title ? ` · ${esc(it.author_title)}` : ''} · ${pt(it.created, { month: 'long', day: 'numeric' })} · <a href="${esc(it.url)}" target="_blank" rel="noopener">Forums ↗</a></span></div><div class="az-rtext"></div>`;
    body.querySelector('.az-rtext').appendChild(sanitize(it.cooked));
  }

  async function page(el, want) {
    const valid = (k) => TABS.some(([t]) => t === k);
    const st = { tab: valid(want) ? want : valid(load('nw-tab')) ? load('nw-tab') : 'all', q: '' };
    el.innerHTML = `<section class="frame panel s12 az-page"><div class="in slab"><div class="head"><h2>News</h2><a class="chip plain" href="#patches"><img src="${KIND.patch.icon}" alt="">Patch notes</a></div><div class="body"><div class="az-bar"><div class="az-tabs" id="azTabs"></div><input class="search" id="azQ" placeholder="Search" autocomplete="off"></div><div id="azList"><p class="az-wait">Gathering the latest from around Azeroth…</p></div></div></div></section>`;
    const all = (await everything()).filter((i) => i.group !== 'patch');
    const inTab = (i, t) => t === 'all' || (t === 'event' ? i.event : i.group === t);
    const tabs = el.querySelector('#azTabs');
    const draw = () => {
      tabs.innerHTML = TABS.map(([k, n]) => { const c = all.filter((i) => inTab(i, k)).length; return c || k === 'all' ? `<button class="az-tab ${st.tab === k ? 'on' : ''}" data-k="${k}">${n}<small>${c}</small></button>` : ''; }).join('');
      const q = st.q.trim().toLowerCase();
      const list = all.filter((i) => inTab(i, st.tab) && (!q || `${i.title} ${i.excerpt} ${i.source}`.toLowerCase().includes(q))).slice(0, 240);
      const days = [];
      list.forEach((i) => { const d = dayLabel(i.created); if (!days.length || days[days.length - 1].d !== d) days.push({ d, items: [] }); days[days.length - 1].items.push(i); });
      el.querySelector('#azList').innerHTML = days.length ? days.map((g) => `<h4 class="az-day">${g.d}<small>${g.items.length}</small></h4><div class="az-feed">${g.items.map((i) => i.group === 'video' ? videoCard(i)
        : link(i, 'az-card az-fc', `<div class="az-ci">${i.image ? pic(i.image) : fallbackArt(i)}</div><div class="az-ct">${meta(i)}<b>${esc(i.title)}</b>${i.excerpt && i.group !== 'reddit' ? `<p>${esc(clip(i.excerpt, 130))}</p>` : ''}</div>`)).join('')}</div>`).join('') : '<p class="az-empty">Nothing matches that.</p>';
    };
    draw();
    tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; st.tab = b.dataset.k; store('nw-tab', st.tab); draw(); });
    el.querySelector('#azQ').addEventListener('input', (e) => { st.q = e.target.value; draw(); });
    bindReader(el);
    if (/^\d+$/.test(want || '')) reader(want);
  }

  const classOf = (t) => { const s = t.toLowerCase().replace(/s$/, ''); return CLASSES.find((c) => s === c.toLowerCase()) || null; };
  const profOf = (t) => { const s = t.toLowerCase(); return PROFS.find((p) => s === p) || null; };
  const catOf = (t) => (CATS.find((c) => c.re.test(t)) || CAT_OTHER);

  function parseList(ul) {
    const out = [];
    [...ul.children].forEach((li) => {
      if (li.tagName !== 'LI') return;
      const sub = [...li.children].find((c) => c.tagName === 'UL' || c.tagName === 'OL');
      const own = sub ? li.textContent.replace(sub.textContent, '').trim() : '';
      if (sub && own && own.length <= 48 && !/[.:!?]$/.test(own) && !/\.\s/.test(own)) {
        out.push({ section: own, children: parseList(sub) });
      } else {
        const clone = li.cloneNode(true);
        clone.querySelectorAll(':scope > ul, :scope > ol').forEach((n) => n.remove());
        out.push({ html: clone.innerHTML.trim(), text: clone.textContent.trim(), sub: sub ? parseList(sub) : [] });
      }
    });
    return out;
  }
  function parsePost(cooked) {
    const root = sanitize(cooked);
    const groups = [];
    let cur = { title: null, paras: [], nodes: [] };
    const push = () => { if (cur.paras.length || cur.nodes.length) groups.push(cur); };
    [...root.children].forEach((n) => {
      const strongOnly = n.tagName === 'P' && n.children.length === 1 && n.firstElementChild.tagName === 'STRONG' && n.textContent.trim() === n.firstElementChild.textContent.trim() && n.textContent.trim().length <= 60;
      if (/^H[1-4]$/.test(n.tagName) || strongOnly) { push(); const t = n.textContent.trim(); cur = { title: t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t, paras: [], nodes: [] }; }
      else if (n.tagName === 'UL' || n.tagName === 'OL') cur.nodes.push(...parseList(n));
      else if (n.textContent.trim() || n.querySelector('img')) cur.paras.push(n.outerHTML);
    });
    push();
    return groups;
  }

  let spellRe = null;
  const norm = (s) => s.replace(/[’‘]/g, "'");
  function spellAt(text) {
    if (!window.LI_SPELLS) return null;
    if (!spellRe) {
      const names = Object.keys(LI_SPELLS).sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      spellRe = new RegExp(`(^|[^A-Za-z'])(${names.join('|')})(?![A-Za-z])`, 'gi');
    }
    const t = norm(text);
    spellRe.lastIndex = 0;
    let m;
    while ((m = spellRe.exec(t))) {
      const name = m[2];
      if (name.split(' ').every((w) => /^([A-Z]|of$|the$|and$|to$|in$|on$|a$)/.test(w))) return { name, index: m.index + m[1].length, icon: `assets/icons/${LI_SPELLS[name.toLowerCase()]}.png` };
    }
    return null;
  }

  const VAL = String.raw`[+-]?\d[\d.,/]*\s*(?:%|s\b|sec\b|seconds?|yards?|yd|min\b|minutes?|hours?|points?|ranks?|rage|energy|mana|health|stacks?|targets?|attacks?|silver|gold|copper|[sgc]\b)?`;
  const RE_WAS = new RegExp(String.raw`(${VAL}|Row \d+|row \d+|column \d+|\d+(?:st|nd|rd|th) row|[\w-]+-point talent)\s*\(\s*(?:was|previously)\s+([^)]+)\)`, 'i');
  const RE_UP = new RegExp(String.raw`(${VAL})[^.()]{0,40}?,?\s+(up|down) from\s+(${VAL})`, 'i');
  const RE_TOFROM = new RegExp(String.raw`\bto\s+(${VAL})\s+from\s+(${VAL})`, 'i');
  const PLACE = String.raw`\d+(?:st|nd|rd|th) row|row \d+|column \d+`;
  const RE_FROM = new RegExp(String.raw`from\s+(?:the\s+)?(${PLACE}|${VAL})\s+to\s+(?:the\s+)?(${PLACE}|${VAL})`, 'i');
  const RE_PLACE = new RegExp(String.raw`to\s+(?:the\s+)?(${PLACE})\s+from\s+(?:the\s+)?(${PLACE})`, 'i');
  const RE_BY = new RegExp(String.raw`\b(increased|raised|reduced|decreased|lowered)\s+by\s+(${VAL})`, 'i');
  const LOWER_BETTER = /cooldown|cost|cast(?:ing)? time|penalty|delay|recharge|threshold|damage taken|pushback|stand still|requires?|requirement|downtime|respawn time|price|debuff|quitter|deserter|at level|train/i;
  const REDUCTION = /(cooldown|cost|cast(?:ing)? time|damage taken|threat)\s+reduction/i;
  const WORLD = /\b(creatures?|mobs?|enemies|enemy|npcs?|boss(es)?|monsters?|spiders|eggs|elites?|guards?|vendors?|sells for|respawn)\b/i;
  const num = (s) => { const m = String(s).match(/\d+(?:\.\d+)?/g); return m ? parseFloat(m[m.length - 1]) * (/hour/i.test(s) ? 3600 : /min/i.test(s) ? 60 : 1) : NaN; };
  const tidyVal = (s) => s.trim().replace(/\s*seconds?\b/i, 's').replace(/\s*minutes?\b/i, ' min').replace(/\s*yards?\b/i, ' yd').replace(/\s*sec\b/i, 's').replace(/^(?:a |an )/i, '').replace(/^row /, 'Row ').replace(/-point talent$/i, ' pts').replace(/[.,;]$/, '');

  function shorten(s) {
    return s
      .replace(/^(?:fixed|resolved|corrected|addressed)\s+(?:an?\s+|the\s+)?(?:issue|bug|problem)s?\s+(?:where|that caused|that|causing|in which|with|preventing|allowing|so that|so)\s+/i, '')
      .replace(/^(?:fixed|resolved|corrected)\s+/i, '')
      .replace(/\bwill now correctly\b/gi, 'now')
      .replace(/\bnow correctly\b/gi, 'now')
      .replace(/\bhas been (increased|raised)\b/gi, 'raised')
      .replace(/\bhas been (reduced|decreased|lowered)\b/gi, 'lowered')
      .replace(/\bhas been changed to\b/gi, 'now')
      .replace(/\bhave been\b/gi, 'are')
      .replace(/\bhas been\b/gi, 'is')
      .replace(/\bin order to\b/gi, 'to')
      .replace(/\bapproximately\b/gi, '~')
      .replace(/\bpercent\b/gi, '%')
      .replace(/(\d)\s*seconds?\b/gi, '$1s')
      .replace(/(\d)\s*minutes?\b/gi, '$1 min')
      .replace(/(\d)\s*yards?\b/gi, '$1 yd')
      .replace(/\s*\(\s*(?:was|previously)\s+[^)]+\)/gi, '')
      .replace(/\s+from\s+\d[\d,/.]*%?\s*(?:seconds?|s|yards?|min|minutes?)?\s+to\s+(\d)/gi, ' to $1')
      .replace(/,?\s+(?:up|down) from\s+\d[\d,/]*(?:\.\d+)?%?(?:\s*(?:seconds?|s|yards?|min|minutes?|points?|rage|energy|mana)\b)?/gi, '')
      .replace(/\s+from\s+\d[\d,/]*(?:\.\d+)?%?(?:\s*(?:seconds?|s|yards?|min|minutes?)\b)?(?=[.,;]|$)/gi, '')
      .replace(/\s+([.,;])/g, '$1')
      .replace(/\s+/g, ' ')
      .replace(/^[^\w"“'(]+/, '')
      .replace(/\.$/, '')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }

  function digestLine(text) {
    const t = text.replace(/\s+/g, ' ').trim();
    if (/^developers?['’`]?s?['’`]? notes?:?/i.test(t)) return { type: 'note', short: t.replace(/^developers?['’`]?s?['’`]? notes?:?\s*/i, ''), text: t, kids: [] };
    let subj = null, rest = t, forcedNew = false;
    let m = /^new (?:talent|ability|spell|rune|baseline ability)s?:?\s+([A-Z][\w'’ -]{2,40}?)(?=[.,:(]|\s+in\s|\s+on\s|\s+-|\s+–|$)/i.exec(t);
    if (m) { subj = m[1].trim(); rest = t.slice(m[0].length).replace(/^[\s.,:–-]+/, ''); forcedNew = true; }
    if (!subj) {
      m = /^([^:.]{2,42}):\s+(.+)$/.exec(t);
      if (m && !/\b(is|are|was|were|now|has|have|will|can|no longer)\b/i.test(m[1])) { subj = m[1].trim(); rest = m[2]; }
    }
    const sp = spellAt(subj || t);
    if (!subj && sp && sp.index === 0) {
      const after = norm(t).slice(sp.name.length).replace(/^'s\b/, '').trim();
      if (!/^(and|or|,|&)/i.test(after)) { subj = t.slice(0, sp.name.length); rest = after; }
    }
    let type = 'change', chip = '', from = null, to = null;
    if (/^(fixed|resolved|corrected|addressed)\b/i.test(t) || /\b(now correctly|will now correctly|no longer incorrectly|should no longer|should now)\b/i.test(t)) type = 'fix';
    else if (forcedNew || /^(new|added|introduced|this is a new)\b/i.test(rest) || /^(new|added)\b/i.test(t) || /\b(has|have) (a|an) new\b/i.test(t)) type = 'new';
    else if (/^(removed|this (talent|spell|ability) (is|has been) removed)\b/i.test(rest) || (/^no longer\b/i.test(rest) && !/\binstead\b/i.test(t)) || (t.length < 90 && /\bremoved\.?$/i.test(t))) type = 'rem';
    if ((m = RE_WAS.exec(t))) { to = m[1]; from = m[2]; }
    else if ((m = RE_UP.exec(t))) { to = m[1]; from = m[3]; }
    else if ((m = RE_PLACE.exec(t))) { to = m[1]; from = m[2]; }
    else if ((m = RE_TOFROM.exec(t))) { to = m[1]; from = m[2]; }
    else if ((m = RE_FROM.exec(t))) { from = m[1]; to = m[2]; }
    if (to != null && from != null) chip = `${tidyVal(from)} → ${tidyVal(to)}`;
    else if ((m = RE_BY.exec(t))) chip = `${/increased|raised/i.test(m[1]) ? '+' : '−'}${tidyVal(m[2])}`;
    if (type === 'change' && /\bmoved\b/i.test(t) && /\b(row|column|tier|tree)\b/i.test(t)) type = 'move';
    if (type === 'change' && !/point talent/i.test(t)) {
      let dir = 0;
      if (to != null && from != null && !isNaN(num(to)) && !isNaN(num(from)) && num(to) !== num(from)) dir = num(to) > num(from) ? 1 : -1;
      else if (to == null) {
        const w = t.replace(/\b(?:in order )?to (?:improve|increase|reduce|lower|raise)\b[^.]*/gi, '');
        const up = /\b(increased|increases?|raised|raises|improved|improves?|boosts?|enhances?|higher|additional|doubled|tripled)\b/i.test(w), down = /\b(reduced|reduces?|decreased|decreases?|lowered|lowers?|fewer)\b/i.test(w);
        if (up !== down) dir = (up ? 1 : -1) * (/\bno longer (increase|reduce|decrease|lower|raise|improve|boost|grant)s?\b/i.test(w) ? -1 : 1);
      }
      if (dir) {
        const cut = t.search(/\d|\b(increased|increases?|reduced|reduces?|decreased|decreases?|lowered|lowers?|raised|raises|improved|improves?|boosts?|enhances?|higher|additional|fewer)\b/i);
        const head = t.slice(Math.max(0, cut - 60), cut + 30);
        if (WORLD.test(t) && !/\byour?\b/i.test(t)) type = 'tune';
        else type = (dir > 0) !== (LOWER_BETTER.test(head) && !REDUCTION.test(head)) ? 'buff' : 'nerf';
      }
    }
    let short = shorten(rest || t);
    if (subj && short.toLowerCase().startsWith(subj.toLowerCase())) short = shorten(short.slice(subj.length));
    if (subj && /^(Is|Are|Has|Have|Now|Can|Will|No|This|The|Moved|Replaces|Also)\b/.test(short)) short = short.charAt(0).toLowerCase() + short.slice(1);
    return { type, subj, short, chip, icon: sp ? sp.icon : null };
  }

  function digestNodes(nodes) {
    return nodes.map((n) => {
      if (n.section) return { head: n.section, cls: classOf(n.section), prof: profOf(n.section), rows: digestNodes(n.children) };
      const d = digestLine(n.text);
      d.html = n.html;
      d.text = n.text;
      d.kids = n.sub && n.sub.length ? digestNodes(n.sub) : [];
      return d;
    });
  }
  function flat(rows, out = []) { rows.forEach((r) => { if (r.head) flat(r.rows, out); else { if (r.type !== 'note') out.push(r); flat(r.kids || [], out); } }); return out; }

  function digestPost(it) {
    const groups = parsePost(it.cooked || '');
    const sections = [];
    let intro = '';
    groups.forEach((g) => {
      const isCls = (n) => n.section && classOf(n.section);
      const lift = g.nodes.filter(isCls), rest = g.nodes.filter((n) => !isCls(n));
      if (!g.title && !g.nodes.length) { intro += g.paras.join(''); return; }
      if (g.paras.length || rest.length) sections.push({ title: g.title || 'Overview', paras: g.paras.join(''), rows: digestNodes(rest), cat: g.title ? (lift.length ? CATS[0] : catOf(g.title)) : CAT_OTHER, cls: g.title ? classOf(g.title) : null });
      lift.forEach((s) => sections.push({ title: s.section, paras: '', rows: digestNodes(s.children), cat: CATS[0], cls: classOf(s.section) }));
    });
    const classRe = new RegExp(`\\b(${CLASSES.map((c) => CNAME[c]).join('|')})(s|'s|’s)?\\b`, 'g');
    sections.filter((s) => s.cat === CATS[0] && !s.cls).forEach((g) => {
      g.rows = g.rows.filter((r) => {
        if (r.head || r.type === 'note') return true;
        const named = [...new Set([...(r.text || '').matchAll(classRe)].map((m) => m[1].toUpperCase()))];
        if (named.length !== 1) return true;
        let home = sections.find((s) => s.cls === named[0]);
        if (!home) { home = { title: CNAME[named[0]], paras: '', rows: [], cat: CATS[0], cls: named[0] }; sections.push(home); }
        home.rows.unshift(r);
        return false;
      });
      if (/^class(es)?$/i.test(g.title)) g.title = 'All classes';
    });
    sections.forEach((s, i) => {
      s.key = `s${i}`;
      const f = flat(s.rows);
      s.total = f.length;
      s.counts = {};
      f.forEach((r) => { const k = r.type === 'move' || r.type === 'tune' ? 'change' : r.type; s.counts[k] = (s.counts[k] || 0) + 1; });
    });
    const all = sections.flatMap((s) => flat(s.rows));
    const score = (r) => (r.type === 'new' || r.type === 'buff' || r.type === 'nerf' ? 2 : 0) + (r.chip && r.chip.length < 18 ? 2 : 0) + (r.icon ? 1 : 0) - (r.short.length > 70 ? 1 : 0);
    const highlights = all.filter((r) => r.type !== 'fix' && r.subj && r.short.length < 120).sort((a, b) => score(b) - score(a));
    return { sections: sections.filter((s) => s.total || s.paras), intro, total: all.length, highlights };
  }

  function rowHtml(r) {
    if (r.head) {
      const icon = r.cls ? `assets/classes/${r.cls}.png` : r.prof ? `assets/profs/${r.prof.replace(' ', '')}.png` : null;
      return `<div class="pd-sub${r.cls ? ' pd-subcls' : ''}"${r.cls ? ` data-cls="${r.cls}" style="--cc:${CCOL[r.cls]}"` : ''}><div class="pd-sh">${icon ? `<img src="${icon}" alt="">` : ''}${esc(r.head)}</div>${r.rows.map(rowHtml).join('')}</div>`;
    }
    if (r.type === 'note') {
      const first = (r.short.match(/^.{20,}?[.!?](?=\s|$)/) || [r.short])[0];
      return first.length < r.short.length - 10
        ? `<details class="pd-note"><summary><span>Developer note</span>${esc(first)} <u>Read more</u></summary>${esc(r.short.slice(first.length))}</details>`
        : `<div class="pd-note"><span>Developer note</span>${esc(r.short)}</div>`;
    }
    const T = TYPE[r.type];
    return `<div class="pd-r pd-${r.type}" data-type="${r.type === 'move' || r.type === 'tune' ? 'change' : r.type}" data-t="${esc(r.text.toLowerCase())}">
      <span class="pd-ic">${r.icon ? `<img src="${r.icon}" alt="">` : `<i>${T.glyph}</i>`}${r.icon ? `<em>${T.glyph}</em>` : ''}</span>
      <div class="pd-tx"><span class="pd-short">${r.subj ? `<b>${esc(r.subj)}</b> ` : ''}${esc(r.short)}${r.chip ? ` <span class="pd-chip">${esc(r.chip)}</span>` : ''}</span><span class="pd-orig">${r.html}</span></div>
      <span class="pd-lbl">${T.label}</span>
    </div>${r.kids.length ? `<div class="pd-kids">${r.kids.map(rowHtml).join('')}</div>` : ''}`;
  }

  async function patchPage(el, wantId) {
    const st = { sec: '', cls: load('pn-cls') || '', type: 'all', q: '', orig: load('pn-orig') === '1' };
    el.innerHTML = `<section class="frame panel s12 pn-page"><div class="in slab"><div class="head"><h2>Patch notes</h2><a class="chip plain" href="#news"><img src="${KIND.article.icon}" alt="">All news</a></div><div class="body pn-wrap"><aside class="pn-list" id="pnList"><p class="az-wait">Loading…</p></aside><div class="pn-main" id="pnMain"></div></div></div></section>`;
    const [d] = await Promise.all([get('/api/patches'), spells()]);
    const list = (d.items || []).filter((i) => i.kind === 'patch' && (i.cooked || '').length > 200);
    if (!list.length) { el.querySelector('#pnList').innerHTML = '<p class="az-empty">No patch notes yet.</p>'; return; }
    const sel = list.find((i) => String(i.id) === String(wantId)) || list[0];
    const P = digestPost(sel);
    const totals = {};
    P.sections.forEach((s) => Object.entries(s.counts).forEach(([k, v]) => { totals[k] = (totals[k] || 0) + v; }));
    if (st.cls && !P.sections.some((s) => s.cls === st.cls)) st.cls = '';
    el.querySelector('#pnList').innerHTML = `<div class="pn-lh">Every update</div>` + list.map((it) => `<a class="pn-li ${it.id === sel.id ? 'on' : ''}" href="#patches/${it.id}"><span class="pn-d">${pt(it.created, { month: 'short', day: 'numeric' })}</span><b>${esc(shortTitle(it).replace(/ · .*$/, ''))}</b></a>`).join('');
    const main = el.querySelector('#pnMain');
    const tile = (s) => {
      const icon = s.cls ? `assets/classes/${s.cls}.png` : (s.cat || CAT_OTHER).icon;
      const c = s.counts;
      return `<button class="pd-tile${s.cls ? ' pd-tcls' : ''}" data-sec="${s.key}"${s.cls ? ` data-cls="${s.cls}" style="--cc:${CCOL[s.cls]}"` : ''}><img src="${icon}" alt=""><span class="pd-tn">${esc(s.title)}</span><span class="pd-tc">${['buff', 'nerf', 'new', 'fix'].filter((k) => c[k]).map((k) => `<em class="pd-${k}">${TYPE[k].glyph}${c[k]}</em>`).join('') || `<em>${s.total}</em>`}</span></button>`;
    };
    main.innerHTML = `<div class="pn-hd"><span class="az-meta"><span class="az-src" style="--sc:${KIND.patch.color}"><i></i>Patch notes</span><span>${pt(sel.created, { weekday: 'short', month: 'long', day: 'numeric' })} · ${P.total} changes</span></span><h3>${esc(shortTitle(sel))}</h3>
        <div class="pd-sum">${TYPE_ORDER.filter((k) => totals[k]).map((k) => `<button class="pd-k pd-${k}" data-type="${k}"><i>${TYPE[k].glyph}</i><b>${totals[k]}</b>${PLURAL[k]}</button>`).join('')}</div></div>
      ${P.intro ? `<details class="pd-intro"><summary>About this update</summary><div>${P.intro}</div></details>` : ''}
      <div class="pd-tiles" id="pdTiles">${P.sections.map(tile).join('')}</div>
      <div class="pd-tools"><input class="search" id="pnQ" placeholder="Search these notes" autocomplete="off"><span class="pd-state" id="pdState"></span><label class="pd-sw"><input type="checkbox" id="pdOrig"${st.orig ? ' checked' : ''}><span>Original wording</span></label></div>
      <div class="pd-body${st.orig ? ' pd-showorig' : ''}" id="pdBody">${P.sections.map((s) => `<section class="pd-sec" data-sec="${s.key}"${s.cls ? ` data-cls="${s.cls}" style="--cc:${CCOL[s.cls]}"` : ''}>
          <h4><img src="${s.cls ? `assets/classes/${s.cls}.png` : (s.cat || CAT_OTHER).icon}" alt="">${esc(s.title)}<small>${s.total}</small></h4>
          ${s.paras ? `<div class="pd-para">${s.paras}</div>` : ''}${s.rows.map(rowHtml).join('')}</section>`).join('')}</div>
      <p class="az-empty" id="pnNone" hidden>Nothing matches that.</p>
      <p class="pd-disc">Labels and arrows are read from Blizzard's wording, so treat them as a quick guide. Switch on "Original wording" for the exact text, or open the <a href="${esc(sel.url)}" target="_blank" rel="noopener">original post ↗</a>.</p>`;
    const body = main.querySelector('#pdBody');
    const apply = () => {
      main.querySelectorAll('.pd-tile').forEach((b) => b.classList.toggle('on', b.dataset.sec === st.sec || (!!st.cls && b.dataset.cls === st.cls)));
      main.querySelectorAll('.pd-sum [data-type]').forEach((b) => b.classList.toggle('on', b.dataset.type === st.type));
      const q = st.q.trim().toLowerCase();
      body.querySelectorAll('.pd-r').forEach((r) => {
        const ok = (st.type === 'all' || r.dataset.type === st.type) && (!q || r.dataset.t.includes(q));
        r.hidden = !ok;
        r.classList.toggle('pd-hit', !!q && ok);
      });
      body.querySelectorAll('.pd-kids').forEach((k) => { const prev = k.previousElementSibling; k.hidden = !!prev && prev.hidden && ![...k.querySelectorAll('.pd-r')].some((r) => !r.hidden); });
      body.querySelectorAll('.pd-sub').forEach((s) => { s.hidden = (!!st.cls && !!s.dataset.cls && s.dataset.cls !== st.cls) || ![...s.querySelectorAll('.pd-r')].some((r) => !r.hidden); });
      body.querySelectorAll('.pd-sec').forEach((s) => {
        s.hidden = false;
        const off = (st.sec && s.dataset.sec !== st.sec) || (st.cls && !st.sec && s.dataset.cls !== st.cls && !s.querySelector(`.pd-sub[data-cls="${st.cls}"]`));
        s.hidden = !!off || ![...s.querySelectorAll('.pd-r')].some((r) => !r.hidden && !r.closest('[hidden]'));
      });
      const secName = st.sec && (P.sections.find((s) => s.key === st.sec) || {}).title;
      const filters = [secName, st.cls && !st.sec && CNAME[st.cls], st.type !== 'all' && PLURAL[st.type]].filter(Boolean);
      main.querySelector('#pdState').innerHTML = filters.length ? `Showing <b>${esc(filters.join(' · '))}</b><button id="pdClear">Show everything</button>` : '';
      main.querySelector('#pdClear')?.addEventListener('click', () => { st.sec = ''; st.cls = ''; st.type = 'all'; store('pn-cls', ''); apply(); });
      main.querySelector('#pnNone').hidden = [...body.querySelectorAll('.pd-sec')].some((s) => !s.hidden);
    };
    main.querySelector('#pdTiles').addEventListener('click', (e) => {
      const b = e.target.closest('.pd-tile');
      if (!b) return;
      if (b.dataset.cls) { st.cls = st.cls === b.dataset.cls ? '' : b.dataset.cls; st.sec = ''; store('pn-cls', st.cls); }
      else { st.sec = st.sec === b.dataset.sec ? '' : b.dataset.sec; st.cls = ''; store('pn-cls', ''); }
      apply();
    });
    main.querySelector('.pd-sum').addEventListener('click', (e) => { const b = e.target.closest('[data-type]'); if (b) { st.type = st.type === b.dataset.type ? 'all' : b.dataset.type; apply(); } });
    main.querySelector('#pnQ').addEventListener('input', (e) => { st.q = e.target.value; apply(); });
    main.querySelector('#pdOrig').addEventListener('change', (e) => { st.orig = e.target.checked; store('pn-orig', st.orig ? '1' : ''); body.classList.toggle('pd-showorig', st.orig); });
    apply();
  }

  window.LI_NEWS = { home, page, patchPage, digestLine };
})();
