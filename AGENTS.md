# AGENTS.md

## What this is
A classic Asteroids clone: one HTML file + one JS file, HTML5 Canvas, ES6 classes. No build step, no bundler, no dependencies, no tests, no lint. Do not introduce `package.json`/npm tooling unless asked.

## Run / verify
- Open `index.html` directly, or `npx serve .` (README suggests port 3000).
- There is no test or lint command. Verify changes by loading the page and playing; browser console is the only error surface.

## Files
- `index.html` — canvas mount (`<canvas id="canvas">`) + inline page CSS. Nothing else.
- `game.js` — the entire game. Loaded as a plain `<script>` (not a module); all state is module-global.
- `favicon.svg` — referenced as `type="image/svg+xml"`; keep that MIME type.

## Gotchas that are easy to get wrong
- Viewport size is duplicated: `W`/`H` in `game.js` must stay in sync with the `width`/`height` attributes on the canvas in `index.html`.
- Power-ups have three types: `'speed'` (lime diamond, `ship.speedBoost`), `'shield'` (blue hexagon, `ship.shield`) and `'triple'` (cyan triangle, `ship.tripleShot`). The type is picked 1/3 each at spawn time in the bullet-vs-asteroid block. Adding another means: a branch in `PowerUp.draw()`, a case in the pickup block (`p.type === ...`), reset of the `ship` field in `Ship.reset()`, a countdown in `Ship.update()`, a line in the stacked HUD effects block, and inclusion in the spawn type roll. Register the entity array in `initGame()`, `nextLevel()`, the per-frame update/draw loops, and the filters.
- Shield: `ship.shield` is a countdown in seconds (`SHIELD_DURATION`); while `> 0` the ship-vs-asteroid loop destroys the asteroid (no split, no points) instead of calling `killShip()`, and `Ship.drawShield()` renders the bubble. It is not consumed by a hit; it just expires. `explode(x, y, count, rgb)` takes the particle color.
- Triple: `ship.tripleShot` is a countdown; while `> 0`, `Ship.tryShoot()` returns three parallel bullets offset perpendicular to the heading by `TRIPLE_SPREAD`.
- Skins are data, not classes: `SKINS` in `game.js` holds `hull` (points in local space, nose toward +x), `color`, `flame`, `nose` (bullet spawn distance), `tail` (flame origin), `glow`, plus optional `scale` (default 1) and `scoreMult` (default 1). `drawHull()` is the single renderer, also used by `drawLifeIcon()`. Adding an ordinary skin = one entry in `SKINS`; no other code changes. A skin with `scale`/`scoreMult` (like `morada`) is already wired: `skinScale()`/`skinPoints()` feed the hull, nose, flame, hitbox, shield bubble and scoring. `skinIndex` persists in `localStorage` under `asteroids.skin` by `id` (not index).
- Scale skins: `Ship.radius` is `SHIP_RADIUS * skinScale(skin)` and is refreshed in `Ship.update()` so switching skins live resizes the hitbox. `Ship.drawShield()` scales `SHIELD_RADIUS` too. Scoring is `a.points * skinPoints(currentSkin())`, so it applies to shooting stars as well.
- Render priority when effects stack: `speedBoost > tripleShot > skin`. The hull color uses that order; the flame color uses the same. The shield bubble is drawn on top and does not recolor the hull.
- Input for skins uses `pressed('KeyS')` (the value of `e.code`), not `'S'`.
- `ShootingStar extends Asteroid` and lives inside the `asteroids` array (flagged `isShootingStar = true`), so it reuses the bullet/ship collision loops. Scoring uses the per-instance `a.points` (set in `Asteroid` and overridden by `ShootingStar`), not `POINTS[a.size]`. Level completion is `!asteroids.some(a => !a.isShootingStar)`, not `asteroids.length === 0`.
- Input uses edge-triggered `pressed(code)` (reads and clears `justPressed`). Use it for one-shot actions like shooting; use `keys[code]` only for held keys. `pressed` mutates state, so call it once per action per frame.
- Game state machine is `state = 'playing' | 'dead' | 'gameover'`. `update()` early-returns per state; new per-frame logic must be added to the right branch, unless it applies to every state (like `handleSkinInput()`, called before the branches).
- World is toroidal: positions go through `wrap(v, max)` (bullets, asteroids, ship). Particles deliberately do not wrap.
- Space is inverted on screen: `angle = -Math.PI/2` points up. Sprites are drawn pointing +x and rotated by `angle`.
- Collisions are circle-based on `a.radius` (max radius), not the irregular vertex polygon.
- UI text is Spanish (e.g. `SCORE`, `NIVEL`, `GAME OVER`, restart prompt); keep new strings in Spanish.
