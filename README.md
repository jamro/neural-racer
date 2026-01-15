# Neural Racer

Neural Racer is a PixiJS-powered 2D racing sandbox where neural network
populations learn to drive through neuroevolution. It loads SVG tracks,
spawns simulated cars, and iteratively improves their controllers via
evolutionary strategies (elite carryover, crossover, mutation, hall of fame).

## What it does
- Renders a track and cars with PixiJS.
- Simulates driving physics and sensors for many cars in parallel.
- Evolves neural controllers over generations (standard, hall-of-fame, all-track modes).
- Persists evolution progress locally so runs can resume.

## Screenshots
1) Race simulation  
![Race simulation](docs/screenshot001.png)

2) Evolution screen  
![Evolution screen](docs/screenshot002.png)

3) Neural network preview & test  
![Neural network preview](docs/screenshot003.png)

## Prerequisites
- Node.js 18+ (recommended) and npm.
- A browser with WebGL enabled.

## Install
From the repository root:
```bash
npm install
```

## Run (development)
Start the dev server with hot reload:
```bash
npm run dev
```
Then open `http://localhost:3000`.

## Build (production)
```bash
npm run build
```
Outputs go to `dist/` (served by your host of choice).

## Project layout (quick map)
- `src/index.js` – entrypoint wiring the app and HMR.
- `src/app/Application.js` – boot sequence: preload, renderer init, track load, evolution loop.
- `src/engine/simulation` – car physics, sensors, track interaction, view scaling.
- `src/engine/evolution` – generations, epoch runners, hall of fame, persistence.
- `src/presentation` – UI overlays (evo lab, previews, controls).
- `public/tracks/*.svg` – sample tracks loaded at startup.

## Tech stack
- PixiJS 8 for rendering
- Webpack 5 + Webpack Dev Server for bundling and HMR
