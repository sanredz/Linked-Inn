const KEY = 'heroName', WHO = 'gauntletWho', RULE = /^[\p{L}\p{N}][\p{L}\p{N} '_-]{1,19}$/u;
const API = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'http://localhost:8789' : 'https://azeroth-draft.sanredz.workers.dev';

const read = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
let typed = read(KEY), clash = '', asking = null, styled = null;
const listeners = new Set(), bound = new WeakSet();

const tidy = (t) => t.trim().replace(/\s+/g, ' ');
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const nameOk = () => RULE.test(tidy(typed));
export const heroName = () => (nameOk() ? tidy(typed) : 'Champion');
export const onName = (fn) => listeners.add(fn);

function remember(v) {
  typed = v;
  try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch {}
  for (const fn of listeners) fn();
}

const deviceWho = () => {
  try {
    let id = localStorage.getItem(WHO);
    if (!id) { id = Math.random().toString(36).slice(2, 14); localStorage.setItem(WHO, id); }
    return id;
  } catch { return 'anon'; }
};

export async function claimName(v) {
  const name = tidy(String(v || ''));
  if (!RULE.test(name)) return { error: 'Use 2 to 20 letters, numbers, spaces, or \' _ -' };
  try {
    const r = await fetch(`${API}/name/claim`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: read('draftKey'), who: deviceWho(), name }) });
    const out = await r.json().catch(() => ({}));
    if (r.ok && out.name) { clash = ''; remember(out.name); return { name: out.name }; }
    if (out.error === 'taken') return { error: `Someone already goes by ${name}. Try another.`, taken: true };
    return { error: out.error === 'name' ? 'That name is not allowed. Try another.' : 'Your name could not be saved. Try again.' };
  } catch {
    return { error: 'The server could not be reached. Try again.' };
  }
}

export async function syncName(server) {
  if (server) { if (server !== typed) remember(server); return; }
  if (!nameOk()) return;
  const out = await claimName(typed);
  if (out.taken) { clash = tidy(typed); remember(''); }
}

function style() {
  if (!styled) styled = new Promise((done) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./name.css', import.meta.url).href;
    link.onload = link.onerror = () => done();
    document.head.append(link);
  });
  return styled;
}

export function askName() {
  if (asking) return asking;
  asking = style().then(() => new Promise((done) => {
    const mask = document.createElement('div');
    mask.className = 'nmask';
    mask.innerHTML = `<form class="nask" role="dialog" aria-modal="true" aria-labelledby="naskT"><button type="button" class="naskx" aria-label="Close">&times;</button><h3 id="naskT">What should we call you?</h3><p>Your name goes on the boards in every mode.</p><input maxlength="20" autocomplete="nickname" spellcheck="false" placeholder="Your name" aria-label="Your name"><small class="naskerr" role="alert">${clash ? `Someone already goes by ${esc(clash)}. Pick another.` : ''}</small><button class="naskgo" type="submit">That's me</button><span class="nasklater">Don't worry, you can change it later in your Hearth.</span></form>`;
    document.body.append(mask);
    const form = mask.querySelector('form'), input = mask.querySelector('input'), err = mask.querySelector('.naskerr'), go = mask.querySelector('.naskgo');
    const close = (ok) => { mask.classList.add('out'); setTimeout(() => mask.remove(), 180); document.removeEventListener('keydown', key); asking = null; done(ok); };
    const key = (e) => { if (e.key === 'Escape') close(false); };
    document.addEventListener('keydown', key);
    mask.querySelector('.naskx').onclick = () => close(false);
    mask.onclick = (e) => { if (e.target === mask) close(false); };
    input.oninput = () => { err.textContent = ''; input.classList.remove('bad'); };
    form.onsubmit = async (e) => {
      e.preventDefault();
      go.disabled = true;
      const out = await claimName(input.value);
      go.disabled = false;
      if (out.name) return close(true);
      err.textContent = out.error;
      input.classList.add('bad');
      input.focus();
    };
    input.focus({ preventScroll: true });
  }));
  return asking;
}

export const ensureName = async () => nameOk() || askName();

export function nameField() {
  if (!nameOk()) return '<div class="gname set"><span>Your name</span><b class="none">Chosen when you begin</b></div>';
  return `<div class="gname set"><span>Playing as</span><b>${esc(heroName())}<i class="ninfo" tabindex="0" aria-label="You can change your name in your Hearth">i<em>You can change your name in your Hearth</em></i></b></div>`;
}

export function bindName(root) {
  style();
  for (const go of root.querySelectorAll('[data-named]')) go.disabled = false;
  if (bound.has(root)) return;
  bound.add(root);
  root.addEventListener('click', async (e) => {
    const go = e.target.closest('[data-named]');
    if (!go || nameOk()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!(await askName())) return;
    for (const field of root.querySelectorAll('.gname')) field.outerHTML = nameField();
    if (go.isConnected) go.click();
  }, true);
}
