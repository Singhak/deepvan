# Lantern Grove (Deepvan)

A calm puzzle game about plants that behave like circuits and cellular automata. Plain HTML and JavaScript, no dependencies; Node is only used to check content and build.

## Files

- `engine.js`: the puzzle rules (simulation, level validation, the endless-level generator). Shared by the game and the build.
- `game.src.html`: the game UI. `build.js` inlines the engine into it.
- `content/`: every chapter and level, as JSON. See [content/README.md](content/README.md) for the format.
- `lint.js`: the design rules for content (difficulty curve, structure, text). `build.js` runs it.
- `sim.js`: plays one level in the terminal, for designing levels.
- `index.html`, `play-offline.html`: build output. Never edit them by hand.

## Commands

```
node sim.js <level id | level.json> [row,col,plant ...]   try a level
node lint.js                                              check content against the rules
node build.js                                             check everything and build index.html and play-offline.html
```

## If you are asked to create or change chapters or levels

Read [content/AUTHORING.md](content/AUTHORING.md) and follow it exactly. It tells you what to read next, what you may change, and how to finish. Your chapter's brief is its row in [content/ROADMAP.md](content/ROADMAP.md); the world and story are fixed in [content/STORY_BIBLE.md](content/STORY_BIBLE.md). Do not edit the engine, the game, the build or the lint rules as part of content work.
