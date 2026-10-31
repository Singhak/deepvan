# Lantern Grove content

Every chapter and level in the game lives in this folder. The game code holds none of it.

- `chapters.json` lists the chapters in play order.
- Each chapter has its own file (`c1.json`, `c2.json`, ...) holding its story and its levels.

The game fetches `chapters.json` at start, then only the chapters the player has reached. It always loads chapter 1. A later chapter is fetched the moment the chapter before it is finished, and until then it shows as a locked **Up next** label. Chapters after that stay hidden.

## Adding content

- **A level:** add it to the `levels` array of its chapter file, then bump that chapter's `levels` count in `chapters.json`.
- **A chapter:** create `c4.json`, then add an entry to the end of `chapters.json`.
- **Check and publish:** run `node build.js`. It checks every level, including that each `solution` really solves it, and refuses to build if something is wrong. Then upload this folder with `index.html` to your server. `play-offline.html` gets everything baked in.

Don't rename a level `id` or reorder chapters once players have them: saved progress is keyed by level id and chapter position.

## chapters.json

```json
{
  "chapters": [
    { "id": "c1", "name": "First light", "hi": { "name": "Pehli roshni" }, "levels": 4, "file": "c1.json" }
  ]
}
```

`name` and `hi.name` are shown on the **Up next** label before the chapter file is fetched. `levels` is the chapter's level count, which the game uses to show the total number of sparks from the start.

## A chapter file

```jsonc
{
  "id": "c4",                       // same as in chapters.json
  "name": "The far meadow",
  "plants": [],                     // plants this chapter introduces: their science unlocks when it is finished
  "reveal": { "title": "Celebration title", "lede": "What the player has learned." },
  "open": "Said as the chapter's first level starts.",
  "story": "Chapter card text.", "recap": "The story so far.", "goal": "The chapter mission.",
  "end": "Said when the chapter is complete.",
  "hi": { "name": "...", "title": "...", "lede": "...", "open": "...", "story": "...", "recap": "...", "goal": "...", "end": "..." },
  "levels": [ /* levels, in play order */ ]
}
```

## A level

```jsonc
{
  "id": "4-1",                      // unique across all chapters
  "name": "The long way round",
  "kind": "light",                  // "light" (sun, reed, lily, fern) or "life" (moss)
  "rows": 5, "cols": 5,             // 2 to 10
  "nights": 2,                      // "life" levels only
  "fixed": [[4, 0, "sun"]],         // [row, col, plant] already planted: sun | reed | lily | fern | moss
  "rocks": [[3, 1]],                // [row, col] where nothing grows
  "pouch": { "reed": 3 },           // seeds the player gets
  "goals": [[4, 3, "on", "moth"], [2, 0, "off", "toad"]],   // [row, col, "on" | "off", moth | toad | snail | beetle]
  "solution": [[4, 1, "reed"], [4, 2, "reed"]],             // checked by the build and by the game

  // Optional text. Defaults are used when it is missing, and Hinglish falls back to English.
  "intro": "What the owl says as the level starts.",
  "hints": ["First hint", "Second hint"],
  "success": "Said when it is solved.",
  "who": "moth",                    // visitor on the level's story card (default: the first goal's visitor)
  "story": { "goal": "...", "reward": "...", "intro": "...", "next": "Teaser for the next level." },
  "page": ["Story-book page title", "Page text."],
  "hi": { "name": "...", "intro": "...", "hints": ["..."], "success": "...", "story": { "goal": "..." }, "page": ["...", "..."] }
}
```

If a level is broken anyway, the game skips it and the browser console says why.

## Serving from another server

By default the game reads `content/` next to `index.html`. To load from somewhere else, set this before the game script runs:

```html
<script>window.LANTERN_CONTENT_URL = 'https://cdn.example.com/lantern/content/';</script>
```

That server must allow cross-origin requests (CORS) from the game's site.
