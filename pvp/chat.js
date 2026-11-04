import { CLASS_COLOR } from '../draft/core.js';
import { askName, nameOk } from './name.js';

const AWAY = 180e3, ROOMS = 20, NO = { name: 'Pick a name to chat.', fast: 'Easy there, one message every few seconds.', burst: 'That is a lot of messages. Take a short breather.', repeat: 'You just said that.', empty: 'Links are not allowed in chat.', rest: 'The tavern is closed for the night. Back tomorrow.', muted: 'You are muted in chat for now.' };
const ACTIONS = [['del', 0, 'Delete'], ['mute', 60, 'Mute 1 hour'], ['mute', 1440, 'Mute 1 day'], ['mute', 0, 'Ban and remove messages']];
const BUBBLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C4 4.1 5.1 3 6.5 3h11C18.9 3 20 4.1 20 5.5v8c0 1.4-1.1 2.5-2.5 2.5H11l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16H6.5C5.1 16 4 14.9 4 13.5z"/></svg>';
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const read = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const face = (m) => (/^hero:\w+$/.test(m.icon || '') ? `assets/draft/arena/boons/${m.icon.slice(5)}.jpg` : /^class:[A-Z]+$/.test(m.icon || '') ? `assets/classes/${m.icon.slice(6)}.png` : m.cls ? `assets/classes/${esc(m.cls)}.png` : '');
const clock = (at) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

let fab, box, list, input, note, here, room = 1, ws = null, open = false, retry = 0, retryTimer = 0, unread = 0, named = false, mod = false, seen = new Set(), me = '';

function style() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./chat.css', import.meta.url).href;
  document.head.append(link);
}

function url() {
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname), host = /lifeonazeroth\.com$/.test(location.hostname) ? 'wss://azeroth-draft.sanredz.workers.dev' : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  return local ? '' : `${host}/chat?room=${room}&key=${encodeURIComponent(read('draftKey'))}`;
}

function say(text, kind = '') {
  note.textContent = text;
  note.className = `chatnote ${kind}`;
  clearTimeout(say.t);
  if (text && kind !== 'stay') say.t = setTimeout(() => { note.textContent = ''; }, 3500);
}

function row(m) {
  if (seen.has(m.id)) return '';
  seen.add(m.id);
  const color = CLASS_COLOR[m.cls] || '#e8d5a8', self = m.name === me;
  return `<li class="${self ? 'me' : ''}" data-id="${m.id}">${face(m) ? `<img src="${face(m)}" alt="">` : '<i class="noicon"></i>'}<div><b style="color:${color}">${esc(m.name)}</b><time>${clock(m.at)}</time><p>${esc(m.text)}</p></div>${mod && !self ? '<button class="chatmod" aria-label="Moderate">&#8943;</button>' : ''}</li>`;
}

function add(msgs, fresh) {
  const near = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
  list.insertAdjacentHTML('beforeend', msgs.map(row).join(''));
  while (list.children.length > 120) list.firstElementChild.remove();
  list.querySelector('.chatempty')?.remove();
  if (!list.children.length) list.innerHTML = '<p class="chatempty">No one has said anything yet. Be the first!</p>';
  if (near || !fresh) list.scrollTop = list.scrollHeight;
  if (fresh && !open) { unread += msgs.length; badge(); }
}

function badge() {
  fab.setAttribute('aria-label', unread ? `Open tavern chat, ${unread} new` : 'Open tavern chat');
  fab.classList.toggle('new', unread > 0);
}

function channels(online) {
  const shown = Math.min(ROOMS, Math.max(2, room + 1 + (online >= 250 ? 1 : 0))), pick = box.querySelector('.chatroom');
  if (pick.options.length === shown) return;
  pick.innerHTML = Array.from({ length: shown }, (_, i) => `<option value="${i + 1}">Channel ${i + 1}</option>`).join('');
  pick.value = String(room);
}

function menu(li) {
  box.querySelector('.chatmenu')?.remove();
  const m = document.createElement('div');
  m.className = 'chatmenu';
  m.innerHTML = ACTIONS.map(([t, mins, label], i) => `<button data-i="${i}" class="${i === 3 ? 'ban' : ''}">${label}</button>`).join('');
  m.onclick = (e) => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    const [t, mins] = ACTIONS[+b.dataset.i];
    if (t === 'mute' && !mins && !confirm(`Ban ${li.querySelector('b').textContent} from chat and remove their messages?`)) return;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t, id: +li.dataset.id, mins }));
    m.remove();
  };
  li.append(m);
}

function footer() {
  box.querySelector('.chatform').hidden = !named;
  box.querySelector('.chatjoin').hidden = named;
}

function connect() {
  if (ws || document.hidden) return;
  const target = url();
  if (!target) { say('Chat only works on the live site.', 'stay'); return; }
  box.querySelector('.chatroom').value = String(room);
  me = nameOk() ? (read('heroName') || '').trim() : '';
  say('Joining the tavern...', 'stay');
  ws = new WebSocket(target);
  ws.onmessage = (e) => {
    let d;
    try { d = JSON.parse(e.data); } catch { return; }
    if (d.t === 'hello') { retry = 0; named = d.named; mod = !!d.mod; channels(d.online); footer(); say(''); list.innerHTML = ''; seen = new Set(); add(d.list, false); }
    if (d.t === 'msg') add([d.m], true);
    if (d.t === 'online') { here.textContent = `${d.online} here`; channels(d.online); }
    if (d.t === 'del') for (const id of d.ids) list.querySelector(`[data-id="${id}"]`)?.remove();
    if (d.t === 'done') say(d.text);
    if (d.t === 'hello') here.textContent = `${d.online} here`;
    if (d.t === 'no') say(NO[d.why] || 'That message could not be sent.', 'bad');
    if (d.t === 'full') { if (room < ROOMS) { room++; leave(); connect(); } else say('Every channel is full right now. Try again soon.', 'stay'); }
  };
  ws.onclose = () => {
    ws = null;
    if (document.hidden) return;
    if (retry >= 5) { say('Lost connection. Close and reopen the chat to try again.', 'stay'); return; }
    say('Reconnecting...', 'stay');
    retryTimer = setTimeout(connect, Math.min(60e3, 2000 * 2 ** retry++));
  };
}

function leave() {
  clearTimeout(retryTimer);
  if (ws) { const w = ws; ws = null; w.onclose = null; w.close(); }
}

function toggle(on) {
  open = on;
  box.hidden = !on;
  fab.classList.toggle('on', on);
  if (on) {
    unread = 0;
    badge();
    retry = 0;
    connect();
    list.scrollTop = list.scrollHeight;
    if (named && matchMedia('(pointer: fine)').matches) input.focus();
  }
}

export function mountChat() {
  if (fab) return;
  style();
  fab = document.createElement('button');
  fab.className = 'chatfab';
  fab.setAttribute('aria-label', 'Open tavern chat');
  fab.innerHTML = `${BUBBLE}<span>Tavern</span><em></em>`;
  box = document.createElement('section');
  box.className = 'chatbox';
  box.hidden = true;
  box.setAttribute('aria-label', 'Tavern chat');
  box.innerHTML = `<header><div><h3>The Tavern</h3><small><select class="chatroom" aria-label="Channel"><option value="1">Channel 1</option><option value="2">Channel 2</option></select><i></i><span class="chathere">Joining</span></small></div><button class="chatx" aria-label="Close chat">&times;</button></header><ul class="chatlist" aria-live="polite"></ul><div class="chatnote"></div><form class="chatform" hidden><input maxlength="180" placeholder="Say something to everyone..." aria-label="Message" autocomplete="off" enterkeyhint="send"><button aria-label="Send"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.6 21 12 3.4 3.4 3.4 10l12.6 2-12.6 2z"/></svg></button></form><button class="chatjoin" hidden>Pick a name to chat</button><p class="chatrules">Be kind. No links. Messages fade after two days.</p>`;
  document.body.append(box, fab);
  list = box.querySelector('.chatlist');
  input = box.querySelector('input');
  note = box.querySelector('.chatnote');
  here = box.querySelector('.chathere');
  fab.onclick = () => toggle(!open);
  list.addEventListener('click', (e) => { const b = e.target.closest('.chatmod'); if (b) menu(b.closest('li')); else if (!e.target.closest('.chatmenu')) box.querySelector('.chatmenu')?.remove(); });
  box.querySelector('.chatroom').onchange = (e) => {
    const n = Math.floor(+e.target.value);
    if (!n || n === room) return;
    room = n;
    leave();
    connect();
  };
  box.querySelector('.chatx').onclick = () => toggle(false);
  box.querySelector('.chatjoin').onclick = async () => { if (await askName()) { leave(); connect(); } };
  box.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ t: 'say', text }));
    input.value = '';
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) toggle(false); });
  document.addEventListener('visibilitychange', () => {
    clearTimeout(leave.t);
    if (document.hidden) leave.t = setTimeout(leave, AWAY);
    else connect();
  });
  setTimeout(connect, 1500);
}
