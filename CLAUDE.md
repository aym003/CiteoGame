# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Regenerate the SVG asset manifest (run after adding/removing SVG files in img/)
npm run scan
```

There is no build step, no bundler, and no dev server configured. Open `index.html` directly in a browser or serve it with any static server (e.g. `npx serve .`) — the game loads Phaser 3 from a CDN and SVGs from the local `img/` tree.

## Local setup

Firebase is required for the leaderboard. Copy the example config and fill in your values:

```bash
cp firebase-config.example.js firebase-config.js
# edit firebase-config.js with your project credentials
```

`firebase-config.js` is gitignored. In production it is injected by CI (see `.github/workflows/deploy.yml`).

## Architecture

`game.js` contains three Phaser scenes and `index.html` contains the Firebase/leaderboard logic.

### Scenes

| Scene | Purpose |
|---|---|
| `LandingScene` | First scene. Preloads all assets, shows global leaderboard + "▶ JOUER" button. |
| `GameScene` | Main gameplay loop. Started by LandingScene; returns to LandingScene after game over. |
| `HelpScene` | Sorting guide grid. Launched via `scene.switch` from GameScene, returns to GameScene. |

### Game loop

- `TRASH_CATALOGUE` (top of `game.js`) defines every trash item: its key, which bin it belongs to (`jaune`/`noir`/`vert`), and its render dimensions.
- Items fall from the top; the player moves the bin left/right with the mouse. Catch detection is a simple AABB in `update()`.
- `BIN_CYCLE` controls the rotation order; `rotateBin()` fires on a timer every `BIN_ROTATE_EVERY` seconds and advances `this.binIndex`.
- Spawn probability: 60 % correct-bin items, 40 % wrong-bin items (`spawnItem()`).
- `fallSpeed` and `spawnTimer.delay` both tighten dynamically in `update()` based on `timeElapsed` and `this.combo`.

### Pause

`togglePause()` pauses/resumes the game. It freezes `roundTimer`, `binRotateTimer`, and `spawnTimer`, and returns early from `update()` so items and the bin stop moving. A dark overlay with "⏸ PAUSE" text is shown while paused.

- **PC**: Space bar (checked via `Phaser.Input.Keyboard.JustDown` at the top of `update()`).
- **Mobile**: ⏸ button in the top-right header (depth 62, always above the overlay). Tapping the overlay itself also resumes.

### Scoring & combo

`getMultiplier(combo)` maps combo count → multiplier (×1–×6). Correct catch increments combo; wrong catch or missing a correct item resets it to 0.

### Firebase & leaderboard

Firebase is initialised in `index.html`. The `firebaseReady` flag and `db` handle are scoped to that script block.

Two entry points are exposed on `window` for `game.js` to call:
- `window.showLeaderboard(score, onReplay)` — end-of-game HTML overlay (score submit + top-10 table). Called by `GameScene.endGame()`.
- `window.getLeaderboard()` — returns `Promise<rows[]|null>`. Returns `null` if Firebase is not configured. Called by `LandingScene._loadAndRender()`.

**Config loading order** (both local and production):
1. Inline placeholder `/* FIREBASE_CONFIG_PLACEHOLDER */` — CI replaces this with the real config via `deploy.yml`; locally it sets `window.FIREBASE_CONFIG = {}`.
2. `<script src="firebase-config.js" onerror="this.remove()">` — local dev loads the real config and overrides the empty object; 404s silently in production.

### Asset manifest (`img/bins.js`)

`scripts/scan-bins.js` walks `img/<color>/` and `img/<color>/bin/` for SVGs, reads their `viewBox` dimensions, and writes `img/bins.js` which exposes `window.BIN_MANIFEST`. **Run `npm run scan` after any asset change.** The dimensions in `TRASH_CATALOGUE` in `game.js` are currently hardcoded separately — if you add new items via the manifest you must also add them to `TRASH_CATALOGUE`.

### Asset layout

```
img/
  <color>/          ← trash item SVGs (e.g. img/jaune/carton.svg)
  <color>/bin/      ← bin sprite SVG (e.g. img/jaune/bin/jaune.svg)
  bins.json         ← generated snapshot (informational)
  bins.js           ← generated JS manifest (window.BIN_MANIFEST)
```

Colors: `jaune` (yellow recycling bin), `noir` (black general waste), `vert` (green glass bin).

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) deploys to GitHub Pages on every push to `main`. It injects Firebase credentials from repository secrets into `index.html` at build time. Required secrets: `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`.

Live URL: `https://aym003.github.io/CiteoGame/`
