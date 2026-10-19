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
- Power-ups exist as of now, but only one type (`'speed'`). Adding another means: a branch in `PowerUp.draw()`, a case in the pickup block (`p.type === ...`), and reset of `ship` state in `Ship.reset()` if it adds a field. Register the entity array in `initGame()`, `nextLevel()`, the per-frame update/draw loops, and the filters.
- Input uses edge-triggered `pressed(code)` (reads and clears `justPressed`). Use it for one-shot actions like shooting; use `keys[code]` only for held keys. `pressed` mutates state, so call it once per action per frame.
- Game state machine is `state = 'playing' | 'dead' | 'gameover'`. `update()` early-returns per state; new per-frame logic must be added to the right branch.
- World is toroidal: positions go through `wrap(v, max)` (bullets, asteroids, ship). Particles deliberately do not wrap.
- Space is inverted on screen: `angle = -Math.PI/2` points up. Sprites are drawn pointing +x and rotated by `angle`.
- Collisions are circle-based on `a.radius` (max radius), not the irregular vertex polygon.
- UI text is Spanish (e.g. `SCORE`, `NIVEL`, `GAME OVER`, restart prompt); keep new strings in Spanish.
