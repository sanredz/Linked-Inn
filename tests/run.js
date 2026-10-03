const fs = require('fs'), path = require('path');
const { lua, lauxlib, lualib, to_luastring } = require('fengari');

const L = lauxlib.luaL_newstate();
lualib.luaL_openlibs(L);
const addonDir = path.resolve(process.argv[2] || path.join(__dirname, '..')).replace(/\\/g, '/');
lua.lua_pushstring(L, to_luastring(addonDir));
lua.lua_setglobal(L, to_luastring('ADDON_DIR'));
lua.lua_pushstring(L, to_luastring(fs.readFileSync(path.join(addonDir, 'LinkedInn.toc'), 'utf8')));
lua.lua_setglobal(L, to_luastring('TOC_SOURCE'));
const status = lauxlib.luaL_dofile(L, to_luastring(path.join(__dirname, 'harness.lua')));
if (status !== lua.LUA_OK) {
  console.log('HARNESS ERROR: ' + lua.lua_tojsstring(L, -1));
  process.exit(1);
}
lua.lua_getglobal(L, to_luastring('FAILURES'));
process.exit(lua.lua_tointeger(L, -1) > 0 ? 1 : 0);
