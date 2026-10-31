// Design rules for content/, on top of engine.js's validateLevel (which only checks that a level is playable).
// The rules themselves are explained in content/AUTHORING.md; this file enforces them so every chapter,
// whoever writes it, follows the same curve, structure and voice.
//   node lint.js            report errors and warnings, with each level's difficulty score
// build.js runs lintContent() and refuses to build on any error. Warnings never block.
const { simulate, checkGoals, key } = require('./engine.js');

// Chapters before this index were written before the rules and are only checked for puzzle logic
const LEGACY = 3;
const LEVELS_PER_CHAPTER = 5;
const BOOK_SIZE = 5;              // c4-c8 is book 2, c9-c13 book 3, ...
const MAX_SIDE = 8;               // bigger boards are too small to tap on a phone
const MAX_NIGHTS = 8;
const MAX_EXTRA_SEEDS = [1, 1, 1, 2, 2];   // seeds in the pouch beyond the solution, per slot
// Difficulty band per slot (teach, practice, combine, twist, finale). Each book after book 2 raises the top by RAISE.
const BANDS = [[1, 6], [3, 9], [5, 12], [6, 14], [8, 17]];
const RAISE = 1.5, CEILING = 26;
// Longest text allowed, by field. Hinglish may run 40% longer.
const MAX_LEN = {
  name: 28, intro: 170, hint: 120, success: 120, goal: 60, reward: 100, storyIntro: 220, next: 180, pageTitle: 30, pageText: 240,
  chName: 28, open: 170, story: 220, recap: 220, chGoal: 120, end: 180, revealTitle: 40, revealLede: 280,
};
const HI_STRETCH = 1.4;
const SPACE_BUDGET = 2000000;     // plantings tried when checking every answer and every visitor
// Number words that may come before a seed name in level text, and the seed each name means
const NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  ek: 1, do: 2, teen: 3, chaar: 4, paanch: 5, chhe: 6, saat: 7, aath: 8, nau: 9, das: 10,
};
const SEED_WORDS = [
  [/^(sunbells?|surajmukhi)\b/i, 'sun'], [/^(reeds?|narkat)\b/i, 'reed'], [/^(twinlil(y|ies)|judwa kamal)\b/i, 'lily'],
  [/^(shadeferns?|raat rani)\b/i, 'fern'], [/^(glowmoss|jaadui kaai|patch(es)?)\b/i, 'moss'],
];

// ---------- Difficulty ----------
// One number per level, from what it asks of the player. See "Difficulty score" in content/AUTHORING.md.
function difficulty(lv) {
  const seeds = Object.values(lv.pouch || {}).reduce((a, b) => a + b, 0);
  const sol = (lv.solution || []).length;
  const off = lv.goals.filter(g => g[2] === 'off').length;
  const types = Object.keys(lv.pouch || {}).length;
  const d = sol + lv.goals.length + off + 2 * (types - 1) + (seeds - sol) + 0.5 * (lv.fixed || []).length +
    0.25 * (lv.rocks || []).length + (lv.rows * lv.cols - 25) / 9 + (lv.kind === 'life' ? 0.5 * lv.nights : 0);
  return Math.round(d * 10) / 10;
}
function band(chapterIdx, slot) {
  const book = 2 + Math.floor((chapterIdx - LEGACY) / BOOK_SIZE);
  const [lo, hi] = BANDS[slot];
  return [lo, Math.min(CEILING, hi + RAISE * (book - 2))];
}

// ---------- Every answer ----------
// Tries every planting with up to as many seeds as the solution, smallest first (within the budget), and reports:
//   shorter  a planting with fewer seeds than the solution that also solves the level
//   idle     visitors that rule nothing out: no planting fails because of that visitor alone
//   odd      (life levels) plantings that solve it but leave a different board at dawn than the solution
function solutionSpace(lv) {
  const blocked = new Set([...(lv.rocks || []), ...(lv.fixed || [])].map(([r, c]) => key(r, c)));
  const free = [];
  for (let r = 0; r < lv.rows; r++) for (let c = 0; c < lv.cols; c++) if (!blocked.has(key(r, c))) free.push(key(r, c));
  const kinds = Object.keys(lv.pouch), full = lv.solution.length;
  const dawn = res => { let s = ''; for (let r = 0; r < lv.rows; r++) for (let c = 0; c < lv.cols; c++) s += res.on(r, c) ? 1 : 0; return s; };
  const intended = {};
  lv.solution.forEach(([r, c, p]) => (intended[key(r, c)] = p));
  const want = dawn(simulate(lv, intended));
  const matters = lv.goals.map(() => false), odd = [];
  let tried = 0, unknown = matters.length, size = 0, shorter = null;
  // Once every smaller planting is tried, stop as soon as every visitor has mattered (and, for life, an odd answer is found)
  const done = () => tried > SPACE_BUDGET || (size === full && !unknown && (lv.kind !== 'life' || odd.length));
  const placed = {};
  function test() {
    tried++;
    const res = simulate(lv, placed), ok = checkGoals(lv, res), fails = ok.filter(v => !v).length;
    if (!fails) {
      if (size < full && !shorter) shorter = Object.entries(placed).map(([k, p]) => k + ' ' + p);
      if (lv.kind === 'life' && dawn(res) !== want) odd.push(Object.keys(placed).join(' '));
    } else if (fails === 1 && !matters[ok.indexOf(false)]) { matters[ok.indexOf(false)] = true; unknown--; }
  }
  test();   // planting nothing
  if (lv.kind === 'light' && kinds.length === 1 && kinds[0] === 'reed') {
    // A Reed that does not glow acts like bare soil, so only Reeds joined to the Sunbells or other fixed plants
    // need trying: every other planting behaves like a smaller one that is tried.
    const start = lv.fixed.map(([r, c]) => key(r, c)), seen = new Set();
    const near = k => { const [r, c] = k.split(',').map(Number); return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < lv.rows && b < lv.cols).map(([a, b]) => key(a, b)); };
    let layer = [[]];
    for (size = 1; size <= Math.min(full, lv.pouch.reed) && !done(); size++) {
      const next = [];
      for (const set of layer) {
        const has = new Set(set), grow = new Set();
        for (const k of [...start, ...set]) for (const n of near(k)) if (!blocked.has(n) && !has.has(n)) grow.add(n);
        for (const n of grow) {
          const ns = [...set, n].sort(), id = ns.join(' ');
          if (seen.has(id)) continue;
          seen.add(id); next.push(ns);
          ns.forEach(k => (placed[k] = 'reed')); test(); ns.forEach(k => delete placed[k]);
          if (done()) break;
        }
        if (done()) break;
      }
      layer = next;
    }
  } else {
    const left = Object.assign({}, lv.pouch);
    const go = (from, n) => {
      if (n === 0) return test();
      for (let i = from; i < free.length; i++) for (const p of kinds) {
        if (!left[p]) continue;
        left[p]--; placed[free[i]] = p;
        go(i + 1, n - 1);
        left[p]++; delete placed[free[i]];
        if (done()) return;
      }
    };
    for (size = 1; size <= full && !done(); size++) go(0, size);
  }
  const idle = lv.goals.filter((g, i) => !matters[i]);
  return { complete: tried <= SPACE_BUDGET, shorter, idle, odd };
}

// ---------- Rules ----------
function lintContent(content) {
  const errors = [], warnings = [], scores = [];
  const chapters = (content['chapters.json'] || {}).chapters || [];
  const unlocked = new Set(['sun', 'reed']);
  const layouts = {}, puzzles = {}, names = {};

  chapters.forEach((m, ci) => {
    const ch = content[m.file];
    if (!ch) return;
    const legacy = ci < LEGACY, num = ci + 1, where = `content/${m.file}`;
    const err = msg => errors.push(`${where}: ${msg}`), warn = msg => warnings.push(`${where}: ${msg}`);
    (ch.plants || []).forEach(p => unlocked.add(p));

    if (!legacy) {
      if (m.id !== 'c' + num || m.file !== `c${num}.json`) err(`chapter ${num} must have id "c${num}" and file "c${num}.json"`);
      if (ch.levels.length !== LEVELS_PER_CHAPTER) err(`has ${ch.levels.length} levels; every chapter from c${LEGACY + 1} on has exactly ${LEVELS_PER_CHAPTER}`);
      if (!m.hi || !m.hi.name) err('its chapters.json entry needs hi.name');
      lintChapterText(ch, err);
    }

    const peak = { d: -1, slot: -1 }, sizes = [];
    ch.levels.forEach((def, li) => {
      const lv = Object.assign({ kind: 'light', rocks: [], fixed: [] }, def);
      if (lv.kind === 'life' && lv.nights == null) lv.nights = 1;
      const at = `level "${lv.id}"`, e = msg => err(`${at}: ${msg}`), w = msg => warn(`${at}: ${msg}`);
      if (!lv.goals || !lv.solution || !lv.pouch) return;   // validateLevel reports these

      // Puzzle logic: applies to every chapter
      const res0 = simulate(lv, {});
      if (checkGoals(lv, res0).every(Boolean)) e('is already solved before the player plants anything');
      const full = {};
      lv.solution.forEach(([r, c, p]) => (full[key(r, c)] = p));
      lv.solution.forEach(([r, c, p]) => {
        const less = Object.assign({}, full); delete less[key(r, c)];
        if (checkGoals(lv, simulate(lv, less)).every(Boolean)) (legacy ? w : e)(`solution plant [${r}, ${c}, "${p}"] is not needed; remove it from the solution`);
      });
      const fernAt = new Set([...lv.fixed, ...lv.solution].filter(x => x[2] === 'fern').map(([r, c]) => key(r, c)));
      lv.goals.forEach(([r, c, want, who]) => {
        const g = `goal [${r}, ${c}, "${want}", "${who}"]`;
        if (who === 'moth' && (want !== 'on' || lv.kind !== 'light')) e(`${g}: a moth always wants "on" in a light level`);
        if (who === 'toad' && want !== 'off') e(`${g}: a toad always wants "off"`);
        if (who === 'snail' && (want !== 'on' || lv.kind !== 'light' || !fernAt.has(key(r, c)))) e(`${g}: a snail always wants "on" and sits on a fern`);
        if (who === 'beetle' && (want !== 'on' || lv.kind !== 'life')) e(`${g}: a beetle always wants "on" in a life level`);
      });

      const d = difficulty(lv);
      scores.push(`${lv.id.padEnd(6)} ${String(d).padStart(5)}  ${lv.kind.padEnd(5)} ${lv.name}`);
      const nameKey = String(lv.name || '').toLowerCase(), sameName = names[nameKey];
      names[nameKey] = names[nameKey] || lv.id;
      if (legacy) return;
      if (sameName) e(`name "${lv.name}" is already used by level "${sameName}"`);

      // Structure
      if (lv.id !== `${num}-${li + 1}`) e(`id must be "${num}-${li + 1}" (chapter-slot)`);
      if (lv.rows < 4 || lv.cols < 4 || lv.rows > MAX_SIDE || lv.cols > MAX_SIDE) e(`board must be 4 to ${MAX_SIDE} on each side`);
      if (lv.kind === 'life' && lv.nights > MAX_NIGHTS) e(`no more than ${MAX_NIGHTS} nights`);
      const plantsUsed = [...Object.keys(lv.pouch), ...lv.fixed.map(f => f[2])];
      plantsUsed.forEach(p => { if (!unlocked.has(p)) e(`uses "${p}", which no chapter up to this one introduces`); });
      if (lv.kind === 'life' && plantsUsed.some(p => p !== 'moss')) e('a life level uses only moss');
      if (lv.kind === 'light' && plantsUsed.includes('moss')) e('a light level never uses moss');
      const seeds = Object.values(lv.pouch).reduce((a, b) => a + b, 0);
      if (seeds - lv.solution.length > MAX_EXTRA_SEEDS[li]) e(`pouch has ${seeds - lv.solution.length} spare seeds; slot ${li + 1} allows ${MAX_EXTRA_SEEDS[li]}`);
      if (lv.goals.length > 6) e('no more than 6 visitors');

      // Difficulty curve: each slot has a band, and the last level is the hardest of its chapter
      const [lo, hi] = band(ci, li);
      if (d < lo || d > hi) e(`difficulty ${d} is outside slot ${li + 1}'s band ${lo} to ${hi}`);
      if (d >= peak.d) Object.assign(peak, { d, slot: li });

      // No copies: same board and visitors as another level, even mirrored or turned
      const sig = layoutKeys(lv);
      const dup = sig.map(s => layouts[s]).find(Boolean);
      if (dup) e(`has the same board as level "${dup}"`);
      layouts[sig[0]] = lv.id;

      // No reused puzzle: same board and same solution as another level, with only the visitors changed
      const psig = puzzleKeys(lv);
      const pdup = psig.map(s => puzzles[s]).find(Boolean);
      if (pdup) e(`has the same board and solution as level "${pdup}"; only the visitors changed. Make a new puzzle.`);
      puzzles[psig[0]] = lv.id;
      sizes.push({ area: lv.rows * lv.cols, visitors: lv.goals.length });

      lintLevelText(lv, e);

      // Tight, every visitor matters, and (life) every answer ends in the same shape
      const sp = solutionSpace(lv);
      if (sp.shorter && li > 0) e(`can be solved with fewer seeds than the solution: ${sp.shorter.join(', ')}. Make the puzzle tighter or the solution shorter.`);
      if (!sp.complete) e(`has too many plantings to check every answer; use a smaller board or fewer seeds`);
      else {
        sp.idle.forEach(([r, c, want, who]) => e(`visitor [${r}, ${c}, "${want}", "${who}"] rules nothing out: no wrong planting fails because of it alone. Move it to where a wrong idea would go, or remove it.`));
        if (sp.odd.length) e(`can be solved by a planting that ends in a different shape at dawn than the solution (moss at ${sp.odd[0]}). Add visitors on the shape's cells and where wrong shapes grow, or change nights, until every answer ends the same.`);
      }
    });
    if (!legacy && peak.slot !== LEVELS_PER_CHAPTER - 1) err(`the last level must be the hardest in the chapter (level ${peak.slot + 1} scores higher)`);
    if (!legacy && sizes.length === LEVELS_PER_CHAPTER) {
      const fin = sizes[LEVELS_PER_CHAPTER - 1];
      if (sizes.some(s => s.area > fin.area)) err('the last level must have the biggest board in the chapter');
      if (sizes.some(s => s.visitors > fin.visitors)) err('the last level must have the most visitors in the chapter');
    }
  });
  return { errors, warnings, scores };
}

// Every rotation and mirror of the board, so a copied level can't hide by being flipped
function layoutKeys(lv) {
  const R = lv.rows, C = lv.cols, maps = [
    (r, c) => [r, c], (r, c) => [r, C - 1 - c], (r, c) => [R - 1 - r, c], (r, c) => [R - 1 - r, C - 1 - c],
    (r, c) => [c, r], (r, c) => [c, R - 1 - r], (r, c) => [C - 1 - c, r], (r, c) => [C - 1 - c, R - 1 - r],
  ];
  return maps.map(f => {
    const cells = [...lv.rocks.map(([r, c]) => [...f(r, c), 'rock']), ...lv.fixed.map(([r, c, p]) => [...f(r, c), p]),
      ...lv.goals.map(([r, c, w, v]) => [...f(r, c), w + v])].map(x => x.join(',')).sort();
    return lv.kind + '|' + cells.join(';');
  });
}

// Same, for the board and the solution (visitors left out)
function puzzleKeys(lv) {
  const R = lv.rows, C = lv.cols, maps = [
    (r, c) => [r, c], (r, c) => [r, C - 1 - c], (r, c) => [R - 1 - r, c], (r, c) => [R - 1 - r, C - 1 - c],
    (r, c) => [c, r], (r, c) => [c, R - 1 - r], (r, c) => [C - 1 - c, r], (r, c) => [C - 1 - c, R - 1 - r],
  ];
  return maps.map((f, i) => {
    const cells = [...lv.rocks.map(([r, c]) => [...f(r, c), 'rock']), ...lv.fixed.map(([r, c, p]) => [...f(r, c), p]),
      ...lv.solution.map(([r, c, p]) => [...f(r, c), 'plant ' + p])].map(x => x.join(',')).sort();
    return lv.kind + '|' + (i < 4 ? R + 'x' + C : C + 'x' + R) + '|' + cells.join(';');
  });
}

// "You have three Reeds" / "Aapke paas teen Narkat" must match the pouch
function seedCounts(lv, text, e, field) {
  const re = /\b(?:you have|aapke paas)\s+(?:only\s+|sirf\s+)?(\w+)\s+/gi;
  let m;
  while ((m = re.exec(String(text || '')))) {
    const n = NUMBERS[m[1].toLowerCase()];
    const seed = SEED_WORDS.find(([w]) => w.test(text.slice(re.lastIndex)));
    if (n == null || !seed) continue;
    const has = lv.pouch[seed[1]] || 0;
    if (n !== has) e(`"${field}" says "${m[0].trim()} ${text.slice(re.lastIndex).split(/[\s.,]/)[0]}" but the pouch has ${has}`);
  }
}

function need(obj, path, max, e, hiMax) {
  const v = path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  if (typeof v !== 'string' || !v.trim()) return e(`needs text in "${path}"`);
  const limit = hiMax ? Math.round(max * HI_STRETCH) : max;
  if (v.length > limit) e(`"${path}" is ${v.length} characters; keep it under ${limit}`);
  if (/[—–]/.test(v)) e(`"${path}" uses a long dash; use a comma, a colon or a full stop`);
}
function lintLevelText(lv, e) {
  for (const [lang, o] of [['', lv], ['hi.', lv.hi || {}]]) {
    const isHi = !!lang, n = (p, max) => need(o, p, max, msg => e(msg.replace(`"${p}"`, `"${lang}${p}"`)), isHi);
    n('name', MAX_LEN.name); n('intro', MAX_LEN.intro); n('success', MAX_LEN.success);
    n('story.goal', MAX_LEN.goal); n('story.reward', MAX_LEN.reward); n('story.intro', MAX_LEN.storyIntro); n('story.next', MAX_LEN.next);
    if (!Array.isArray(o.hints) || o.hints.length !== 2) e(`"${lang}hints" needs exactly 2 hints`);
    else o.hints.forEach((h, i) => n('hints.' + i, MAX_LEN.hint));
    if (!Array.isArray(o.page) || o.page.length !== 2) e(`"${lang}page" needs [title, text]`);
    else { n('page.0', MAX_LEN.pageTitle); n('page.1', MAX_LEN.pageText); }
    seedCounts(lv, o.intro, e, lang + 'intro');
  }
}
function lintChapterText(ch, e) {
  if (!Array.isArray(ch.plants)) e('needs "plants" (an empty list when the chapter brings no new plant)');
  for (const [lang, o] of [['', ch], ['hi.', ch.hi || {}]]) {
    const isHi = !!lang, n = (p, max) => need(o, p, max, msg => e(msg.replace(`"${p}"`, `"${lang}${p}"`)), isHi);
    n('name', MAX_LEN.chName); n('open', MAX_LEN.open); n('story', MAX_LEN.story); n('recap', MAX_LEN.recap);
    n('goal', MAX_LEN.chGoal); n('end', MAX_LEN.end);
    n(isHi ? 'title' : 'reveal.title', MAX_LEN.revealTitle); n(isHi ? 'lede' : 'reveal.lede', MAX_LEN.revealLede);
  }
}

module.exports = { lintContent, difficulty, band, solutionSpace };

if (require.main === module) {
  const fs = require('fs'), path = require('path');
  const dir = path.join(__dirname, 'content'), content = {};
  content['chapters.json'] = JSON.parse(fs.readFileSync(path.join(dir, 'chapters.json'), 'utf8'));
  content['chapters.json'].chapters.forEach(m => (content[m.file] = JSON.parse(fs.readFileSync(path.join(dir, m.file), 'utf8'))));
  const { errors, warnings, scores } = lintContent(content);
  console.log('Difficulty\n  ' + scores.join('\n  '));
  if (warnings.length) console.log('\nWarnings\n - ' + warnings.join('\n - '));
  if (errors.length) { console.error('\nErrors\n - ' + errors.join('\n - ')); process.exit(1); }
  console.log('\nNo errors.');
}
