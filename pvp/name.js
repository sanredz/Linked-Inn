const KEY = 'heroName', RULE = /^[\p{L}\p{N}][\p{L}\p{N} '_-]{1,19}$/u;

const stored = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
let typed = stored();

const tidy = (t) => t.trim().replace(/\s+/g, ' ');
export const nameOk = () => RULE.test(tidy(typed));
export const heroName = () => (nameOk() ? tidy(typed) : 'Champion');

export function nameField() {
  const value = typed.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<label class="gname"><span>Your name</span><input maxlength="20" placeholder="Enter a name to begin" autocomplete="nickname" spellcheck="false" value="${value}"></label>`;
}

export function bindName(root) {
  const input = root.querySelector('.gname input'), go = root.querySelector('[data-named]');
  if (!input || !go) return;
  const sync = () => {
    typed = input.value;
    go.disabled = !nameOk();
    if (nameOk()) { try { localStorage.setItem(KEY, tidy(typed)); } catch {} }
  };
  input.oninput = sync;
  input.onkeydown = (e) => { if (e.key === 'Enter' && !go.disabled) go.click(); };
  sync();
  if (!nameOk() && matchMedia('(hover: hover)').matches) input.focus({ preventScroll: true });
}
