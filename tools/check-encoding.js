const fs = require('node:fs');
const path = require('node:path');
const decoder = new TextDecoder('utf-8', { fatal: true });
const windows = new TextDecoder('windows-1252');
const reverse = new Map();
for (let byte = 0; byte < 256; byte++) reverse.set(windows.decode(Uint8Array.of(byte)), byte);
function repair(text) {
  for (let pass = 0; pass < 4; pass++) {
    let result = '';
    let changed = false;
    for (let i = 0; i < text.length; i++) {
      const lead = reverse.get(text[i]);
      const size = lead >= 0xc2 && lead <= 0xdf ? 2 : lead >= 0xe0 && lead <= 0xef ? 3 : lead >= 0xf0 && lead <= 0xf4 ? 4 : 0;
      const chars = text.slice(i, i + size);
      const bytes = [...chars].map(char => reverse.get(char));
      if (size && bytes.length === size && bytes.slice(1).every(byte => byte >= 0x80 && byte <= 0xbf)) {
        try {
          const fixed = decoder.decode(Uint8Array.from(bytes));
          result += fixed;
          i += size - 1;
          changed = true;
          continue;
        } catch {}
      }
      result += text[i];
    }
    text = result;
    if (!changed) break;
  }
  return text;
}
const extensions = new Set(['.html', '.css', '.js', '.json', '.md', '.sql']);
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', '.git', 'tools'].includes(entry.name) || entry.name.startsWith('.env')) return [];
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? files(file) : extensions.has(path.extname(file)) ? [file] : [];
  });
}
let failures = 0;
for (const file of files(path.resolve(__dirname, '..'))) {
  let original;
  try { original = decoder.decode(fs.readFileSync(file)); }
  catch { console.error('Invalid UTF-8:', file); failures++; continue; }
  const fixed = repair(original);
  if (fixed !== original) {
    if (process.argv.includes('--fix')) { fs.writeFileSync(file, fixed, 'utf8'); console.log('Fixed:', path.relative(process.cwd(), file)); }
    else { console.error('Corrupted characters:', file); failures++; }
  }
  if (fixed.includes('\uFFFD')) { console.error('Replacement character:', file); failures++; }
}
if (failures) process.exitCode = 1;
else console.log('UTF-8 verification passed.');
