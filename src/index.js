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
const tracksData = [
    {url: 'assets/tracks/lesson_001.svg'},
    {url:'assets/tracks/lesson_002.svg'},
    {url:'assets/tracks/lesson_003a.svg'},
    {url:'assets/tracks/lesson_003b.svg'},
    {url:'assets/tracks/lesson_003.svg'},
    {url:'assets/tracks/lesson_004.svg'},
    {url:'assets/tracks/lesson_005.svg'},
    {url:'assets/tracks/lesson_006.svg'},
];
const tracks = await Promise.all(tracksData.map(t => SvgTrackLoader.load(t.url)));


const evolution = new Evolution(app, tracks);

const config = new Config();
PIXI.Ticker.shared.maxFPS = config.frameRate || 30;
config.setStandardMode();

await evolution.initialize(config);

console.log('PixiJS application initialized!');

evolution.startSimulation();

window.addEventListener('resize', () => {
  if(app.resize) {
    app.resize(window.innerWidth, window.innerHeight);
    evolution.scaleView(window.innerWidth, window.innerHeight);
  }
}); 

// Hot Module Replacement
if (module.hot) {
    module.hot.accept();
    
    module.hot.dispose(() => {
        evolution.stopSimulation();
        app.destroy(true, {
            children: true,
            texture: true,
            baseTexture: true,
        });
    });
}

