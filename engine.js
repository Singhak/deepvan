// ENGINE START
// Rules (never shown to the player; they discover them):
//  sun  : always glows.
//  reed : glows if at least 1 neighbour (up/down/left/right) glows.      -> a wire / conductor
//  lily : glows only if at least 2 neighbours glow.                       -> an AND gate
//  fern : blooms only if NO neighbour glows. It makes shade, never light. -> a NOT gate
//  moss : Conway's Game of Life (8 neighbours, born on 3, survives on 2-3) -> a cellular automaton
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const key = (r, c) => r + ',' + c;
const unkey = k => k.split(',').map(Number);

function baseTypes(lv) {
  const t = [];
  for (let r = 0; r < lv.rows; r++) t.push(new Array(lv.cols).fill(null));
  (lv.rocks || []).forEach(([r, c]) => (t[r][c] = 'rock'));
  (lv.fixed || []).forEach(([r, c, p]) => (t[r][c] = p));
  return t;
}
function typesWith(lv, placed) {
  const t = baseTypes(lv);
  for (const k in placed) { const [r, c] = unkey(k); t[r][c] = placed[k]; }
  return t;
}
function glowNeighbours(g, r, c) {
  let n = 0;
  for (const [dr, dc] of DIRS) {
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < g.length && cc >= 0 && cc < g[0].length && g[rr][cc]) n++;
  }
  return n;
}
function simLight(lv, placed) {
  const t = typesWith(lv, placed);
  let g = t.map(row => row.map(p => p === 'sun'));
  const frames = [g];
  for (let i = 0; i < lv.rows * lv.cols + 1; i++) {
    let changed = false;
    const nx = t.map((row, r) => row.map((p, c) => {
      if (p === 'sun') return true;
      const n = glowNeighbours(g, r, c);
      const v = (p === 'reed' && n >= 1) || (p === 'lily' && n >= 2);
      if (v !== g[r][c]) changed = true;
      return v;
    }));
    if (!changed) break;
    g = nx;
    frames.push(g);
  }
  const n = t.map((row, r) => row.map((p, c) => glowNeighbours(g, r, c)));
  const on = (r, c) => {
    const p = t[r][c];
    if (p === 'rock') return false;
    if (p === 'fern') return n[r][c] === 0;
    if (p) return g[r][c];
    return n[r][c] > 0;
  };
  return { kind: 'light', t, frames, glow: g, n, on };
}
function lifeStep(a, t) {
  const R = a.length, C = a[0].length;
  return a.map((row, r) => row.map((alive, c) => {
    if (t[r][c] === 'rock') return false;
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < R && cc >= 0 && cc < C && a[rr][cc]) n++;
    }
    return alive ? n === 2 || n === 3 : n === 3;
  }));
}
function simLife(lv, placed) {
  const t = typesWith(lv, placed);
  let a = t.map(row => row.map(p => p === 'moss'));
  const frames = [a];
  for (let i = 0; i < lv.nights; i++) { a = lifeStep(a, t); frames.push(a); }
  return { kind: 'life', t, frames, alive: a, on: (r, c) => a[r][c] };
}
function simulate(lv, placed) { return lv.kind === 'life' ? simLife(lv, placed) : simLight(lv, placed); }
function checkGoals(lv, res) { return lv.goals.map(([r, c, want]) => res.on(r, c) === (want === 'on')); }

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Builds a puzzle backwards: plant a random solution, see what it lights, turn that into wishes.
function generateLevel(d, seed) {
  const rnd = mulberry32(seed);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  for (let tries = 0; tries < 500; tries++) {
    const size = Math.min(6, 4 + Math.floor((d + 1) / 3));
    const lv = { kind: 'light', rows: size, cols: size, rocks: [], fixed: [], goals: [], pouch: {}, generated: true };
    const free = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) free.push([r, c]);
    shuffle(free);
    const nRocks = Math.floor(rnd() * (1 + Math.floor(size * size / 9)));
    for (let i = 0; i < nRocks; i++) lv.rocks.push(free.pop());
    const nSun = 1 + (d >= 4 && rnd() < 0.5 ? 1 : 0);
    for (let i = 0; i < nSun; i++) lv.fixed.push([...free.pop(), 'sun']);
    let fern = null;
    if (d >= 2 && rnd() < 0.5) { fern = free.pop(); lv.fixed.push([...fern, 'fern']); }

    const pool = ['reed', 'reed', 'reed'];
    if (d >= 2) pool.push('lily', 'lily');
    if (d >= 3 && rnd() < 0.3) pool.push('sun');
    const nPlants = Math.min(6, 1 + Math.ceil(d / 2));
    const sol = {};
    for (let i = 0; i < nPlants; i++) { const [r, c] = free.pop(); sol[key(r, c)] = pool[Math.floor(rnd() * pool.length)]; }

    const s = simLight(lv, sol), e = simLight(lv, {});
    if (fern && !s.on(fern[0], fern[1])) continue;
    const diff = shuffle(free.filter(([r, c]) => s.on(r, c) && !e.on(r, c)));
    if (!diff.length) continue;
    const nOn = Math.min(diff.length, 1 + Math.floor(d / 2), 4);
    diff.slice(0, nOn).forEach(([r, c]) => lv.goals.push([r, c, 'on', 'moth']));
    const offs = shuffle(free.filter(([r, c]) => !s.on(r, c) && !lv.goals.some(g => g[0] === r && g[1] === c)));
    const nOff = d >= 2 ? Math.min(offs.length, 1 + (d >= 5 ? 1 : 0)) : 0;
    offs.slice(0, nOff).forEach(([r, c]) => lv.goals.push([r, c, 'off', 'toad']));
    if (fern) lv.goals.push([fern[0], fern[1], 'on', 'snail']);

    // Drop plants the wishes don't need; at higher difficulty keep one as a decoy.
    let decoyKept = d < 5;
    for (const k of Object.keys(sol)) {
      const trial = { ...sol }; delete trial[k];
      if (checkGoals(lv, simLight(lv, trial)).every(Boolean)) {
        if (!decoyKept) { decoyKept = true; continue; }
        delete sol[k];
      }
    }
    if (checkGoals(lv, simLight(lv, {})).every(Boolean)) continue;
    for (const k in sol) lv.pouch[sol[k]] = (lv.pouch[sol[k]] || 0) + 1;
    lv.solution = Object.entries(sol).map(([k, p]) => [...unkey(k), p]);
    return lv;
  }
  return null;
}

// Checks a hand-made (plug-in) level. Returns a list of problems; an empty list means it is playable.
const PLANT_TYPES = ['sun', 'reed', 'lily', 'fern', 'moss'];
const VISITORS = ['moth', 'toad', 'snail', 'beetle'];
function validateLevel(lv) {
  const errs = [], cell = (r, c) => Number.isInteger(r) && Number.isInteger(c) && r >= 0 && r < lv.rows && c >= 0 && c < lv.cols;
  if (!lv.id || typeof lv.id !== 'string') errs.push('needs an "id" string, e.g. "4-1"');
  if (lv.kind !== 'light' && lv.kind !== 'life') errs.push('"kind" must be "light" or "life"');
  if (!(lv.rows >= 2 && lv.rows <= 10 && lv.cols >= 2 && lv.cols <= 10)) errs.push('"rows" and "cols" must be 2 to 10');
  if (lv.kind === 'life' && !(lv.nights >= 1)) errs.push('a "life" level needs "nights" (1 or more)');
  if (errs.length) return errs;
  const used = {};
  const take = (r, c, what) => {
    if (!cell(r, c)) return errs.push(`${what} at [${r}, ${c}] is off the board`);
    if (used[key(r, c)]) errs.push(`${what} at [${r}, ${c}] overlaps ${used[key(r, c)]}`);
    used[key(r, c)] = what;
  };
  (lv.rocks || []).forEach(([r, c]) => take(r, c, 'rock'));
  (lv.fixed || []).forEach(([r, c, p]) => { if (!PLANT_TYPES.includes(p)) errs.push(`fixed plant "${p}" is unknown`); take(r, c, 'fixed ' + p); });
  const pouch = lv.pouch || {};
  if (!Object.keys(pouch).length) errs.push('"pouch" needs at least one seed, e.g. { reed: 2 }');
  for (const p in pouch) if (!PLANT_TYPES.includes(p) || !(pouch[p] >= 1)) errs.push(`pouch entry ${p}: ${pouch[p]} is not valid`);
  if (!(lv.goals || []).length) errs.push('needs at least one goal: [row, col, "on" | "off", visitor]');
  (lv.goals || []).forEach(([r, c, want, who]) => {
    if (!cell(r, c)) errs.push(`goal at [${r}, ${c}] is off the board`);
    if (want !== 'on' && want !== 'off') errs.push(`goal at [${r}, ${c}] must want "on" or "off"`);
    if (!VISITORS.includes(who)) errs.push(`goal at [${r}, ${c}]: visitor "${who}" is unknown (use ${VISITORS.join(', ')})`);
  });
  if (errs.length || !lv.solution) return errs;
  // The solution must fit the pouch and the free soil, and must actually make every visitor happy
  const placed = {}, count = {};
  lv.solution.forEach(([r, c, p]) => {
    if (!cell(r, c) || used[key(r, c)]) return errs.push(`solution plant at [${r}, ${c}] is not on free soil`);
    placed[key(r, c)] = p; count[p] = (count[p] || 0) + 1;
  });
  for (const p in count) if (count[p] > (pouch[p] || 0)) errs.push(`solution uses ${count[p]} ${p} but the pouch has ${pouch[p] || 0}`);
  if (!errs.length && !checkGoals(lv, simulate(lv, placed)).every(Boolean)) errs.push('the solution does not make every visitor happy');
  return errs;
}
// ENGINE END
if (typeof module !== 'undefined') module.exports = { simulate, simLight, simLife, checkGoals, generateLevel, validateLevel, key, unkey, baseTypes };
