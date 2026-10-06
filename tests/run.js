const fs = require('fs'), path = require('path');
const { lua, lauxlib, lualib, to_luastring } = require('fengari');

const slash = (p) => p.split(path.sep).join('/');
const addonDir = slash(path.resolve(process.argv[2] || path.join(__dirname, '..')));
const world = fs.readFileSync(path.join(__dirname, 'world.lua'), 'utf8');
const toc = fs.readFileSync(path.join(addonDir, 'LinkedInn.toc'), 'utf8');
const only = process.argv[3];
let failed = 0;

for (const suite of ['forever', 'retail']) {
  if (only && only !== suite) continue;
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  lua.lua_pushstring(L, to_luastring(addonDir));
  lua.lua_setglobal(L, to_luastring('ADDON_DIR'));
  lua.lua_pushstring(L, to_luastring(toc));
  lua.lua_setglobal(L, to_luastring('TOC_SOURCE'));
  lua.lua_pushstring(L, to_luastring(suite));
  lua.lua_setglobal(L, to_luastring('SUITE'));
  const source = world + '\n' + fs.readFileSync(path.join(__dirname, suite + '.lua'), 'utf8');
  console.log('== ' + suite);
  let status = lauxlib.luaL_loadbuffer(L, to_luastring(source), null, to_luastring('@' + suite + '.lua'));
  if (status === lua.LUA_OK) status = lua.lua_pcall(L, 0, 0, 0);
  if (status !== lua.LUA_OK) {
    console.log('HARNESS ERROR (' + suite + '): ' + lua.lua_tojsstring(L, -1));
    failed++;
    continue;
  }
  lua.lua_getglobal(L, to_luastring('FAILURES'));
  if (lua.lua_tointeger(L, -1) > 0) failed++;
}
process.exit(failed ? 1 : 0);
