# Architecture Overview

High-level map of the main runtime pieces and how data moves between them.

## Runtime flow
- `src/index.js` boots Pixi, loads config, and starts `Application`.
- `Application` orchestrates preload, track loading, and kicks off simulation + evolution loops.
- Pixi render loop draws scenes while simulation/evolution update state between frames.

## Core domains (three main areas)
- **Simulation (`src/engine/simulation`)**: physics step, sensors, collision with track; produces per-frame car state/telemetry.
- **EvoLab (`src/evoLab` + `src/presentation/evoLab`)**: evolution-focused UI (generation preview particles, parent/child panels, controls) fed by evolution/simulation state.
- **NeuralLab (`src/neuralLab`)**: interactive network probing UI to visualize activations and tweak inputs outside the main race loop.

## Shared runtime systems
- **Evolution (`src/engine/evolution`)**: genomes, fitness scoring, crossover/mutation, hall-of-fame/all-track runners; updates network weights.
- **Neural nets (`src/engine/neuralNetwork`)**: network execution backing each car’s controller.
- **Presentation (`src/presentation`)**: UI overlays and previews consuming simulation/evolution state (shared components outside EvoLab/NeuralLab too).
- **Resources & loaders (`src/resources`)**: assets (textures/fonts), preload UI, and loader modules. Track parsing lives under `src/resources/loaders/track` (e.g. `SvgTrackLoader`, `SvgPathParser`); used by runtime and tests.
- **Config (`src/Config.js`)**: runtime knobs for simulation speed, population size, mutation parameters, quality.

## Data flow (simplified)
1) Track + assets load via loaders (SVG -> checkpoints/segments, textures -> Pixi).
2) Cars run simulation steps using neural nets; sensors feed inputs, physics updates pose.
3) Evolution loop reads fitness from simulation history; produces next generation genomes.
4) Presentation layers subscribe to simulation/evolution state to render UI and previews.
5) Persistence (IndexedDB via `idb`) caches populations/hall-of-fame for resume; loaders read/write.

## Rendering
- PixiJS scene graph for track, cars, and overlays.
- Minimize display object churn; batch where possible (see network/particle previews).

## Extensibility hints
- New tracks: add SVG under `public/tracks/`, parsed through `SvgTrackLoader` (`src/resources/loaders/track/SvgTrackLoader.js`).
- New sensors/physics tweaks: adjust simulation modules; ensure fitness and config stay consistent.
- New UI panels: add under `src/presentation/**`, wiring into existing stores/controllers.
