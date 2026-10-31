// Builds the playable files from game.src.html, engine.js and content/:  node build.js
//  index.html        engine inlined; fetches content/ from the server, one chapter at a time as each one opens
//  play-offline.html one self-contained file (engine and every content file inlined) to share or open anywhere
// Every chapter and level is checked first; the build stops if anything is broken.
const fs = require('fs');
const path = require('path');
const here = f => path.join(__dirname, f);
const read = f => fs.readFileSync(here(f), 'utf8');
const { validateLevel } = require('./engine.js');

const engineSrc = read('engine.js');
const engine = engineSrc.slice(engineSrc.indexOf('// ENGINE START'), engineSrc.indexOf('// ENGINE END') + '// ENGINE END'.length);

// ---------- Check content/ ----------
const errors = [], content = {};
const readJson = file => {
  try { return (content[file] = JSON.parse(read('content/' + file))); }
  catch (e) { errors.push(`content/${file}: ${e.message}`); return null; }
};
const manifest = readJson('chapters.json');
const chapters = (manifest && manifest.chapters) || [];
if (manifest && !chapters.length) errors.push('content/chapters.json: "chapters" needs at least one chapter');
const chapterIds = new Set(), levelIds = new Set();
let levels = 0;
chapters.forEach((m, i) => {
  const where = `chapters.json, chapter ${i + 1}`;
  if (!m.id || !m.name || !m.file) return errors.push(`${where}: needs "id", "name" and "file"`);
  if (chapterIds.has(m.id)) errors.push(`${where}: id "${m.id}" is already used`);
  chapterIds.add(m.id);
  const ch = readJson(m.file);
  if (!ch) return;
  if (ch.id && ch.id !== m.id) errors.push(`content/${m.file}: id "${ch.id}" does not match "${m.id}" in chapters.json`);
  const list = ch.levels || [];
  if (!list.length) errors.push(`content/${m.file}: needs at least one level`);
  if (m.levels != null && m.levels !== list.length) errors.push(`chapters.json says "${m.id}" has ${m.levels} levels, but content/${m.file} has ${list.length}`);
  list.forEach(def => {
    const lv = Object.assign({ kind: 'light', rocks: [], fixed: [] }, def);
    if (lv.kind === 'life' && lv.nights == null) lv.nights = 1;
    const errs = validateLevel(lv);
    if (levelIds.has(lv.id)) errs.push(`id "${lv.id}" is already used`);
    levelIds.add(lv.id);
    errs.forEach(e => errors.push(`content/${m.file}, level "${def.id}": ${e}`));
    levels++;
  });
});
if (errors.length) {
  console.error('content/ has problems, nothing was built:\n - ' + errors.join('\n - '));
  process.exit(1);
}

// ---------- Write the two files ----------
const src = read('game.src.html');
const index = src.replace('/*ENGINE*/', () => engine);
const inline = 'window.LANTERN_CONTENT = ' + JSON.stringify(content).replace(/</g, '\\u003c') + ';';
const offline = index.replace('/*CONTENT*/', () => inline);
fs.writeFileSync(here('index.html'), index);
fs.writeFileSync(here('play-offline.html'), '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body style="margin:0">\n' + offline + '\n</body></html>\n');
console.log(`Built index.html and play-offline.html: ${chapters.length} chapters, ${levels} levels.`);
