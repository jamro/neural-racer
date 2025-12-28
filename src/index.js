import './index.css';
import * as PIXI from 'pixi.js';
import Evolution from './neuralEvolution/Evolution';
import SvgTrackLoader from './loaders/SvgTrackLoader';
import Config from './Config';
import { loadTextures, getTextureKeys } from './loaders/AssetLoader';

// Create and initialize the application
const app = new PIXI.Application();

await app.init({
    resizeTo: window,
    backgroundColor: 0xa19a41,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
});

// Add the canvas to the DOM
document.getElementById('app').appendChild(app.canvas);

// Load all textures in bulk
await loadTextures(getTextureKeys());

// Load assets
const tracksUrls = [
    'assets/tracks/lesson_000.svg',
    'assets/tracks/lesson_000.svg',
    'assets/tracks/lesson_000.svg',
    'assets/tracks/lesson_000.svg',
    'assets/tracks/lesson_000.svg',
    'assets/tracks/lesson_000.svg',
    'assets/tracks/lesson_000.svg',
];
const tracks = await Promise.all(tracksUrls.map(url => SvgTrackLoader.load(url)));


const evolution = new Evolution(app, tracks);

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

