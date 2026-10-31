// Plays a level in the terminal, for whoever is designing one (see content/AUTHORING.md):
//   node sim.js 4-3                  a level already in content/, by id
//   node sim.js draft.json           a level in its own file (one level object, as it would go in a chapter's "levels")
//   node sim.js draft.json 4,1,reed 4,2,reed   try your own planting instead of the level's "solution"
// It prints the board before and after dusk, which visitors are happy, the difficulty score and its band,
// any way to solve the level with fewer seeds than the solution, visitors that rule nothing out, and (life)
// answers that end in a different shape than the solution.
const fs = require('fs'), path = require('path');
const { simulate, checkGoals, key } = require('./engine.js');
const { difficulty, band, solutionSpace } = require('./lint.js');

const [arg, ...tries] = process.argv.slice(2);
if (!arg) { console.log('usage: node sim.js <level id | level.json> [row,col,plant ...]'); process.exit(1); }
let def, chapterIdx = -1, slot = -1;
if (fs.existsSync(arg)) def = JSON.parse(fs.readFileSync(arg, 'utf8'));
else {
  const dir = path.join(__dirname, 'content');
  JSON.parse(fs.readFileSync(path.join(dir, 'chapters.json'), 'utf8')).chapters.forEach((m, i) => {
    const ch = JSON.parse(fs.readFileSync(path.join(dir, m.file), 'utf8'));
    ch.levels.forEach((l, j) => { if (l.id === arg) { def = l; chapterIdx = i; slot = j; } });
  });
  if (!def) { console.log(`no level "${arg}" in content/`); process.exit(1); }
}
const lv = Object.assign({ kind: 'light', rocks: [], fixed: [] }, def);
if (lv.kind === 'life' && lv.nights == null) lv.nights = 1;
if (chapterIdx < 0) {
  const m = /^(\d+)-(\d+)$/.exec(lv.id || '');
  if (m) { chapterIdx = +m[1] - 1; slot = +m[2] - 1; }
}

const planting = tries.length ? tries.map(s => { const [r, c, p] = s.split(','); return [+r, +c, p]; }) : (lv.solution || []);
const placed = {};
planting.forEach(([r, c, p]) => (placed[key(r, c)] = p));
const res = simulate(lv, placed);

const LETTER = { sun: 'S', reed: 'R', lily: 'L', fern: 'F', moss: 'M', rock: '#' };
function draw(title, cell) {
  console.log(title);
  console.log('     ' + [...Array(lv.cols).keys()].map(c => String(c).padEnd(3)).join(''));
  for (let r = 0; r < lv.rows; r++) console.log(String(r).padStart(3) + '  ' + [...Array(lv.cols).keys()].map(c => cell(r, c).padEnd(3)).join(''));
  console.log('');
}
const goalAt = (r, c) => lv.goals.find(g => g[0] === r && g[1] === c);
const VIS = { moth: 'm', toad: 't', snail: 'n', beetle: 'b' };
draw('Planted (S sun, R reed, L lily, F fern, M moss, # rock; lowercase = visitor: m moth, t toad, n snail, b beetle)', (r, c) => {
  const p = res.t[r][c], g = goalAt(r, c);
  return (p ? LETTER[p] : '.') + (g ? VIS[g[3]] : '');
});
if (lv.kind === 'light') draw('After dusk (* lit or glowing or blooming, . dark)', (r, c) => (res.on(r, c) ? '*' : '.') + (res.t[r][c] ? LETTER[res.t[r][c]].toLowerCase() : ''));
else res.frames.forEach((f, i) => draw(i ? `Dawn after night ${i}` : 'Night 0', (r, c) => (res.t[r][c] === 'rock' ? '#' : f[r][c] ? 'M' : '.')));

const ok = checkGoals(lv, res);
lv.goals.forEach((g, i) => console.log(`${ok[i] ? 'happy  ' : 'UNHAPPY'} ${g[3]} at [${g[0]}, ${g[1]}] wants "${g[2]}"`));
console.log(ok.every(Boolean) ? '\nSolved.' : '\nNot solved.');
if (checkGoals(lv, simulate(lv, {})).every(Boolean)) console.log('Problem: the level is solved before anything is planted.');

if (lv.goals && lv.pouch && lv.solution) {
  const d = difficulty(lv);
  console.log(`\nDifficulty ${d}` + (chapterIdx >= 3 && slot >= 0 && slot < 5 ? `; slot ${slot + 1} of chapter ${chapterIdx + 1} allows ${band(chapterIdx, slot).join(' to ')}` : ''));
  const s = solutionSpace(lv);
  if (!s.complete) console.log('Too many plantings to check every answer: use a smaller board or fewer seeds.');
  if (s.shorter) console.log(`Shorter solution exists: ${s.shorter.join(', ')}`);
  s.idle.forEach(g => console.log(`Visitor rules nothing out: ${g[3]} at [${g[0]}, ${g[1]}]. Move it to where a wrong idea would go, or remove it.`));
  if (s.odd.length) console.log(`Answer with a different dawn shape: moss at ${s.odd[0]}. Every answer must end in the same shape.`);
  if (s.complete && !s.shorter && !s.idle.length && !s.odd.length) console.log('Every visitor matters and no shorter solution exists.');
}
