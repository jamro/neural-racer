# Development Guide

This is a quick reference for working on Neural Racer locally.

## Prerequisites
- Node.js 18+ and npm.
- A WebGL-capable browser (Chrome, Edge, or Firefox).

## Setup
1) Install dependencies:
```bash
npm install
```
2) Start the dev server with hot reload:
```bash
npm run dev
```
Then open `http://localhost:3000`.

## Useful npm scripts
- `npm run dev` – webpack dev server with HMR.
- `npm run build` – production bundle to `dist/`.
- `npm run lint` / `npm run lint:fix` – ESLint (2-space indent, no tabs).
- `npm test` – Jest unit tests (JS DOM environment).

## Project map (dev-focused)
- `src/app/Application.js` – boot sequence: preload, renderer, track load, evolution loop.
- `src/engine/simulation` – car physics, sensors, collision and track interaction.
- `src/engine/evolution` – genomes, generations, hall-of-fame/all-track runners.
- `src/presentation` – UI overlays (evo lab, previews, controls).
- `src/loaders` – asset loading, SVG track parsing, texture helpers.
- `public/tracks/*.svg` – sample tracks; use `template.svg` as a base for new ones.

## Testing and quality checks
Run linting and tests before pushing:
```bash
npm run lint
npm test
```
Use `npm run lint:fix` for quick formatting fixes.

## Asset pipeline
- Textures/fonts load via `src/loaders/Assets.js`; prefer PNG for textures.
- Add new images/fonts under `public/` and reference through loader helpers.
- Clear browser cache/disable cache in devtools when swapping assets.

## Adding or modifying tracks
- Tracks live in `public/tracks/*.svg`; copy `template.svg` as a starting point.
- Keep paths continuous; avoid self-intersections; ensure consistent units.
- Validate parsing with `npm test tests/loaders/SvgTrackLoader.test.js`.
- Update any examples/docs if adding new named tracks.

## Testing guidelines
- Use Jest; place tests in `tests/**` mirroring source folder structure.
- Prefer small unit tests for loaders, math helpers, and epoch runners.
- Add fixtures for SVG parsing where needed; avoid large assets in tests.
- Run `npm test -- --watch` during development for rapid feedback.

## Performance guidelines
- Simulation/rendering: limit expensive per-frame allocations; reuse vectors/arrays.
- Reduce Pixi display object churn; batch draw calls where practical.
- Profile with browser devtools Performance tab when tweaking physics or rendering.

## Modifying Config
- Main config lives in `src/Config.js`; defaults suit typical dev runs.
- Adjust values like `populationSize`, `simulationSpeed`, and mutation rates when experimenting.
- When changing defaults, note impact on tests and saved data formats.
- For temporary debugging toggles, guard them and revert before merging.

## Troubleshooting
- Blank screen: check devtools console and ensure the dev server is running.
- Stale local data: clear site storage (IndexedDB) in the browser to reset saved evolution runs.
- Slow rebuilds: close unused dev server tabs; webpack dev server recompiles on changes.
