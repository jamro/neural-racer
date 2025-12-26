import './index.css';
import * as PIXI from 'pixi.js';
import Evolution from './neuralEvolution/Evolution';
import SvgTrackLoader from './loaders/SvgTrackLoader';
import Config from './Config';
import { loadCarTexture, loadGhostTexture, loadShadowTexture } from './loaders/loadCarTexture';

// Create and initialize the application
const app = new PIXI.Application();

await app.init({
    resizeTo: window,
    backgroundColor: 0x1099bb,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
});

// Add the canvas to the DOM
document.getElementById('app').appendChild(app.canvas);

// Load assets
const track = await SvgTrackLoader.load('assets/tracks/lesson_001.svg');
const carTexture = await loadCarTexture();
const ghostTexture = await loadGhostTexture();
const shadowTexture = await loadShadowTexture();

const evolution = new Evolution(app, track);

const config = new Config();
config.setStandardMode();

evolution.initialize(config);

// Initialize keyboard controller
//const keyboardController = new KeyboardController(car);

console.log('PixiJS application initialized!');

evolution.start();

// Hot Module Replacement
if (module.hot) {
    module.hot.accept();
    
    module.hot.dispose(() => {
        evolution.stop();
        app.destroy(true, {
            children: true,
            texture: true,
            baseTexture: true,
        });
    });
}

