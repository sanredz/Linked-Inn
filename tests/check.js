const fs = require('fs'), path = require('path'), lp = require('luaparse');
const dir = process.argv[2] || path.join(__dirname, '..');
const OWN = /^(LinkedInn|SLASH_LINKEDINN)/;
let bad = 0;

function globalWrites(node, found) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => globalWrites(n, found)); return; }
  if (node.type === 'AssignmentStatement') {
    for (const v of node.variables) {
      if (v.type === 'Identifier' && !v.isLocal) found.push(v.name);
    }
  }
  if (node.type === 'FunctionDeclaration' && node.identifier && node.identifier.type === 'Identifier' && !node.identifier.isLocal) {
    found.push(node.identifier.name);
  }
  for (const key of Object.keys(node)) {
    if (key !== 'type') globalWrites(node[key], found);
  }
}

const SKIP = new Set(['tests', 'node_modules', 'docs', 'scripts', 'media', 'art']);
function luaFiles(base, rel = '') {
  const out = [];
  for (const entry of fs.readdirSync(path.join(base, rel), { withFileTypes: true })) {
    const p = rel ? rel + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name) && !entry.name.startsWith('.')) out.push(...luaFiles(base, p));
    } else if (entry.name.endsWith('.lua')) {
      out.push(p);
    }
  }
  return out;
}
const files = luaFiles(dir);
if (files.length === 0) {
  console.log('FAIL no addon files found');
  process.exit(1);
}
for (const f of files) {
  try {
    const ast = lp.parse(fs.readFileSync(path.join(dir, f), 'utf8'), { luaVersion: '5.1', scope: true });
    const found = [];
    globalWrites(ast.body, found);
    const foreign = found.filter(n => !OWN.test(n));
    if (foreign.length) {
      bad++;
      console.log('FAIL', f, 'writes non-addon globals (taint):', [...new Set(foreign)].join(', '));
    } else {
      console.log('OK  ', f);
    }
  } catch (e) {
    bad++;
    console.log('FAIL', f, e.message);
  }
}
process.exit(bad);
