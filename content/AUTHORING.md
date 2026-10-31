# Writing chapters and levels

This is the rulebook for adding content to Deepvan (Lantern Grove), whether a person or an AI agent is writing it. Follow it exactly. You should not need to invent any rule, structure or style; if something is not covered here, stop and ask the owner instead of guessing.

Read these first, in order:

1. This file.
2. [STORY_BIBLE.md](STORY_BIBLE.md): the world, the cast, the tone and the story so far.
3. Your chapter's row in [ROADMAP.md](ROADMAP.md): its book, place, idea and story beat are already decided.
4. The previous chapter's file (`content/c<N-1>.json`): its `end` text and its last level's `story.next` are where your chapter picks up.
5. [README.md](README.md): the JSON format of chapters and levels.

`node lint.js` and `node build.js` enforce most of the rules below. The build refuses to run on any error.

## What you may and may not change

| You may | You must not |
|---|---|
| Create `content/c<N>.json` for the chapter you were given | Edit `engine.js`, `game.src.html`, `lint.js`, `sim.js` or `build.js` |
| Add its entry at the end of `content/chapters.json` | Invent a plant, visitor, level field or mechanic that the engine does not have |
| Fill in the chapter's "Story so far" line in STORY_BIBLE.md | Change or reorder a chapter or level that is already released (see ROADMAP.md status) |
| Mark the chapter `drafted` in ROADMAP.md | Change an `id` anywhere |
| Run `node sim.js`, `node lint.js`, `node build.js` | Disable, loosen or work around a lint rule |

If a chapter in ROADMAP.md needs something the engine can't do, report it to the owner and stop.

## The pieces you build with

The rules below are what the engine does. Players are never told them; they discover them by playing. Your levels are how they discover them.

### Light levels (`"kind": "light"`)

| Plant | Seed name (EN / Hinglish) | Glows when | Real idea |
|---|---|---|---|
| `sun` | Sunbell / Surajmukhi | always | a source (battery) |
| `reed` | Reed / Narkat | at least 1 neighbour glows | a wire |
| `lily` | Twinlily / Judwa Kamal | at least 2 neighbours glow | an AND gate |
| `fern` | Shadefern / Raat Rani | never glows. It **blooms** when no neighbour glows | a NOT gate |

- Neighbours are up, down, left and right only.
- Light spreads from the Sunbells through reeds and lilies until nothing changes.
- **Empty soil is lit when any neighbour glows.** A wire lights up the soil beside it. This is how a moth on bare soil gets warm, and why a toad next to a wire wakes up.
- A rock (`rocks`) is never lit and never passes light on.
- A fern gives off no light, so it can only be an end point: it can't power anything.

### Life levels (`"kind": "life"`)

- Only `moss` (Glowmoss / Jaadui Kaai). Each night, every cell looks at its 8 neighbours (diagonals too).
- Live moss with 2 or 3 live neighbours stays alive. Otherwise it fades.
- An empty cell with exactly 3 live neighbours grows new moss.
- Beyond the board edge is empty. A rock is always empty and never grows moss.
- Visitors are checked at dawn after the last of the level's `nights`.

### Visitors (goals)

| Visitor | Goal | Means | Where |
|---|---|---|---|
| `moth` | `"on"` | its tile is lit (or the plant on it glows) | light levels |
| `toad` | `"off"` | its tile is dark (light) or empty at dawn (life) | both |
| `snail` | `"on"` | the fern on its tile blooms | light levels, on a `fern` tile only |
| `beetle` | `"on"` | moss is alive on its tile at dawn | life levels |

These pairings are fixed. Lint rejects any other combination.

## The shape of every chapter

From chapter 4 on, every chapter has **exactly 5 levels**, and each slot has a job:

| Slot | Job | What it looks like | Difficulty band (book 2) | Spare seeds |
|---|---|---|---|---|
| 1 Teach | Show the chapter's new idea on its own | Small board (4x4 or 5x5), 1 seed type, 1 or 2 visitors, nothing to distract | 1 to 6 | 0 or 1 |
| 2 Practice | Same idea, one change | The idea used a second way, or once more with one obstacle | 3 to 9 | 0 or 1 |
| 3 Combine | The new idea plus one older idea | Mix in exactly one idea from an earlier chapter | 5 to 12 | 0 or 1 |
| 4 Twist | Make the player rethink | The obvious move fails: a toad beside the obvious path, a tempting spare seed, the source in the wrong place | 6 to 14 | up to 2 |
| 5 Finale | Everything from the chapter at once | Biggest board of the chapter, most visitors (lint checks both, ties allowed). Always the hardest level in the chapter. A new puzzle, never an earlier level with visitors added | 8 to 17 | up to 2 |

- Each book after book 2 raises the top of every band by 1.5 (book 3: slot 5 goes to 18.5). Bands never go above 26.
- Slot 1 always starts low again, even in a late book. A new chapter should feel like a breath, then a climb. This is what keeps a 20+ chapter game from becoming a wall.
- A chapter teaches **one** new idea (its ROADMAP row says which). Not two.
- A **mixed** chapter (each book's last, marked in ROADMAP.md) has slots 1, 2 and 5 in its idea's kind, and slots 3 and 4 in the other kind, reviewing the older ideas the row names. The row lists the order.

### Difficulty score

`node sim.js` and `node lint.js` print a score for each level:

```
solution seeds + visitors + toads + 2 × (seed types - 1) + spare seeds
  + 0.5 × fixed plants + 0.25 × rocks + (rows × cols - 25) / 9 + (life: 0.5 × nights)
```

Toads count twice because keeping something dark is harder than lighting it. If your level is outside its band, change the puzzle, not the score: add or remove a visitor, a seed type, a toad or some board size.

### Board rules

- 4 to 8 rows and columns. Bigger is too small to tap on a phone. Prefer 5x5 or 6x6. Use 7x7 or 8x8 only in slot 5, or when the idea needs room (long paths, gliders).
- At most 6 visitors in a level.
- Light levels never contain moss. Life levels contain only moss.
- `nights` in a life level: 1 to 8.
- Use only plants introduced by this or an earlier chapter (`plants` in each chapter file; sun and reed are there from the start).
- Lint must be able to try every planting (up to 2 million). Light levels whose pouch is only Reeds can be any size. Life levels, and light levels with Twinlily or Shadefern seeds, should plant at most about 5 seeds on a 6x6 board; give the rest of the shape as `fixed` plants. If lint says "too many plantings to check", use fewer seeds or a smaller board.

### What makes a good level

Lint checks the first seven: they are errors and the build stops. The rest are on you.

1. **Not solved already.** The level must not be solved before the player plants anything.
2. **No wasted seeds in the solution.** Removing any one plant from `solution` must break it. The in-game hint shows solution tiles one at a time, so a wasted plant misleads the player.
3. **Not a copy.** No level may have the same board and visitors as another, even mirrored or rotated. Nor the same board and the same solution with only the visitors changed: adding toads to an earlier level does not make a new puzzle.
4. **Tight.** No planting with fewer seeds than your solution may solve the level (slot 1 is exempt). The player will find it too. Tighten the board (rock, toad) until the intended solution is the short one, or accept the shorter one as your solution.
5. **Every visitor matters.** For each visitor, some wrong planting must fail because of that visitor alone. A visitor that no wrong planting would disturb is decoration. Typical cause: a toad beside a route that is longer than the solution anyway, so nobody would plant it, or two beetles where one already forces the same shape. Move it to where a wrong idea goes, or remove it.
6. **Life: every answer ends in the same shape.** Every planting that solves a life level must leave the same moss at dawn as your solution. Otherwise players win by planting a mess that happens to land right, and never learn the idea. See "Life levels" below.
7. **The intro's seed count matches the pouch.** "You have six Reeds" / "Aapke paas chhe Narkat" must say what `pouch` holds.
8. **One idea per level.** The player should be able to say what the level was about in one sentence. If you can't, cut something.
9. **The aha is placement, not counting.** A level is good when the player thinks "oh, it goes *there*", not when they try 30 positions.
10. **Fair start.** Nothing hidden: the level is solvable from the board, the pouch and the intro alone.

More than one answer is fine when they all show the same idea (two equally short routes around a toad, any three corners of a square). What lint forbids is an answer that skips the idea.

### Designing a level, step by step

1. Write the slot's one-sentence idea: "the light has to go around the toad, not past it."
2. Draw the solution first: the plants that show the idea.
3. Add visitors that only that solution satisfies: moths where the light must reach, toads where the obvious wrong path would go, snails on ferns that must stay dark.
4. Put the level in a file and run `node sim.js draft.json`. Check the score and the band, and that the last line says "Every visitor matters and no shorter solution exists". If it names a shorter solution, an idle visitor or an answer with a different dawn shape, fix the board now: text written for a broken board has to be rewritten.
5. Try the wrong ideas a player will have: `node sim.js draft.json 2,1,reed 2,2,reed`. They must fail. If one works, add a visitor or rock that stops it.
6. Check that the level is not the same as an earlier one with visitors added (especially slot 5: build a new, bigger board).
7. Only then write the text.

### Light levels

- Put each toad **next to the route a player would try first**, so that route lights it. A toad two steps from every short route rules nothing out. The same goes for a snail's Shadefern: the tempting route must pass beside it.
- Draw the solution, then list the other routes with the same or fewer Reeds (`sim.js` with your guesses). Each visitor should kill at least one of them.

### Life levels

A moss level is only checked at dawn after the last night, so a random mess of moss can land on the visitors by luck. Build so it can't:

- **Give most of the shape as `fixed` moss** and let the player plant the last 1 to 4 patches. Planting a whole shape from nothing leaves too many lucky answers.
- **Beetles want moss that is already there to stay** (or a patch that must appear). Toads sit where the *wrong* shapes would grow: the tip of a loaf when you want a beehive, a corner a block would fill. A toad in a hollow that no wrong shape fills rules nothing out.
- **Use few nights** (1 to 3) for still shapes. Long runs give messy plantings more chances to land right by accident.
- Don't put a beetle on every cell of a symmetric shape: if any three corners of a square work, four beetles on the square all rule nothing out. One or two beetles on opposite corners say the same thing.
- Run `node sim.js` after each change. Fix "Answer with a different dawn shape" by adding a toad where that answer's moss differs, or a beetle on a cell it misses.

## Writing the text

All text is in **simple English** and **Hinglish** (`hi`). Both are required for every field; lint checks they exist and are not too long.

### Voice

- A calm, warm bedtime-story voice. Nothing is ever lost or dead, nobody is a villain, nobody is in danger. Creatures are tired, cold, lonely, waiting or curious.
- Short sentences. Words a 10-year-old knows. Name the plant by its seed name (Sunbell, Reed, Twinlily, Shadefern, Glowmoss), never by its code name.
- Never explain the rules. Never write "AND gate", "conductor" or "Game of Life" in level text: the player finds out in the chapter's `reveal`. Describe what the creature wants, not how to get it. The intro never tells the move ("Leave one corner open and watch what happens" gives the answer away; "Can the whole square still be there at dawn?" does not).
- Describe the board as it is: if a toad is diagonal to a moth, it is "near", not "right beside". Count visitors and nights the way the level has them, in both languages.
- No long dashes (— or –). Use a comma, a colon or a full stop. Lint rejects them.
- No emoji in content.
- **Hinglish** is everyday Roman-script Hindi as people text it, mixed with English words where those are more natural ("level", "seed" is fine; Hindi words for plants come from STORY_BIBLE.md). It is a retelling, not a word-for-word translation. Never use Devanagari.

### Every level's fields

| Field | Job | Length (EN) |
|---|---|---|
| `name` | 2 to 5 words, the scene, not the solution ("Around the stones", not "Use four reeds") | 28 |
| `intro` | What the owl says as the level starts: who is waiting, what seeds you have | 170 |
| `hints` | Exactly 2. Hint 1 is a question that points the eye. Hint 2 is a stronger question that names the area. Never give the answer. | 120 each |
| `success` | One line once solved: what happened, as a small discovery | 120 |
| `story.goal` | The mission in under 10 words | 60 |
| `story.reward` | What the player gets: a clue, a page, a way forward | 100 |
| `story.intro` | The scene: a named creature, what it wants, why | 220 |
| `story.next` | The cliffhanger into the next level. In slot 5 it leads into the next chapter | 180 |
| `page` | `[title, text]`: one page of the journal the player collects, one per spark | 30 / 240 |
| `who` | The visitor on the story card, if not the first goal's | |

Hinglish (`hi`) has the same fields and may be up to 40% longer.

### Every chapter's fields

| Field | Job | Length (EN) |
|---|---|---|
| `name` | Same as in chapters.json and ROADMAP.md | 28 |
| `plants` | New plants this chapter introduces. Usually `[]` | |
| `reveal.title`, `reveal.lede` | The science reveal shown when the chapter is done: name the real idea the player just learned (from the ROADMAP row) and where it is used in the real world | 40 / 280 |
| `open` | The owl's line as the first level starts | 170 |
| `story` | The chapter card: the new place, and why we are here | 220 |
| `recap` | The story so far, in one or two sentences | 220 |
| `goal` | The chapter mission, ending "Help 5 creatures and light 5 sparks." (Hinglish: "5 jaanwaron ki madad karo aur 5 chingaariyan jalao.") | 120 |
| `end` | Said when the chapter is done: what changed, and the one new question that leads on | 180 |

In `hi`, the chapter's `reveal.title` and `reveal.lede` go in `hi.title` and `hi.lede`.

### Story rules that keep it endless

- Each chapter **closes its own small question** (the creature is helped, the waystone is lit) and **opens exactly one new question** in `end`. Never two, never none.
- A chapter never ends the whole story. No "the end", "finally", "forever", "the last", "at last the grove is safe". The road always goes on.
- Use only the cast in STORY_BIBLE.md. A chapter may add **one** new named creature, and must add them to the cast table.
- Story facts in STORY_BIBLE.md are fixed. Don't contradict them, and don't add a fact that the ROADMAP row doesn't call for.

## Ids, files and order

- Chapter N: id `c<N>`, file `c<N>.json`, appended to the end of `chapters.json` with `levels: 5` and `hi.name`.
- Levels: `<N>-1` to `<N>-5`, in slot order.
- Level names are unique across the whole game.
- Released chapters are frozen: saved progress is keyed by level id and chapter position. Typo fixes in text are the only allowed change.

## Before you finish

Run, in order, and fix everything until all pass:

```
node sim.js <each level id>      every level: Solved, score inside its band, "Every visitor matters and no shorter solution exists"
node lint.js                     no errors
node build.js                    builds
```

Then:

- [ ] `content/c<N>.json` has 5 levels and every text field in English and Hinglish.
- [ ] `content/chapters.json` has the new entry at the end, nothing else changed.
- [ ] STORY_BIBLE.md has the chapter's one-line "Story so far" entry, and any new creature in the cast table.
- [ ] ROADMAP.md marks the chapter `drafted`.
- [ ] You changed no other file. `git status` shows only these.
- [ ] Your reply lists: each level's id, name, score and the one-sentence idea; and any lint warning you left, with why.

## The prompt to give an agent

Paste this, with the chapter number filled in:

> Create chapter c<N> of Lantern Grove. Before writing anything, read AGENTS.md and follow content/AUTHORING.md exactly; its ROADMAP.md row for c<N> is the brief. Don't change any file outside the ones AUTHORING.md allows. Finish only when `node lint.js` and `node build.js` pass with no errors, then report each level's id, name, difficulty and one-sentence idea.

The owner then plays the chapter in `play-offline.html`, and only then marks it `released` in ROADMAP.md.
