import './index.css';
import * as PIXI from 'pixi.js';
import Evolution from './neuralEvolution/Evolution';
import SvgTrackLoader from './loaders/SvgTrackLoader';
import Config from './Config';
import { loadTextures, getTextureKeys } from './loaders/AssetLoader';
import waitForFonts from './loaders/waitForFonts';
import NeuralLab from './neuralLab/NeuralLab';

let app = null;
let evolution = null;
let neuralLab = null;
let resizeHandler = null;

const MODE = 'evolution'; // 'evolution' or 'neuralLab'

/**
 * Initialize the application
 * This function can be called multiple times for HMR
 */
async function initApp() {
    // Wait for fonts to be fully loaded
    await waitForFonts();

    // Create and initialize the application
    app = new PIXI.Application();

    await app.init({
        resizeTo: window,
        backgroundColor: 0xa19a41,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
    });

    // Add the canvas to the DOM
    const appContainer = document.getElementById('app');
    if (appContainer.firstChild) {
        appContainer.replaceChild(app.canvas, appContainer.firstChild);
    } else {
        appContainer.appendChild(app.canvas);
    }

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

    evolution = new Evolution(app, tracks);

    const config = new Config();
    PIXI.Ticker.shared.maxFPS = config.frameRate || 30;
    config.setStandardMode();

    await evolution.initialize(config);

    console.log('PixiJS application initialized with fonts loaded!');

    if(MODE === 'neuralLab') {
      // test Neural Lab
      neuralLab = new NeuralLab(evolution.generation.cars[0]);
      app.stage.addChild(neuralLab);
      neuralLab.scaleView(app.screen.width, app.screen.height);
      neuralLab.startRenderLoop();
    } else if(MODE === 'evolution') {
        evolution.startSimulation();
    }

    // Handle window resize
    resizeHandler = () => {
        if(app && app.resize) {
            app.resize(window.innerWidth, window.innerHeight);
            evolution.scaleView(window.innerWidth, window.innerHeight);
            if(neuralLab) {
                neuralLab.scaleView(window.innerWidth, window.innerHeight);
            }
        }
    };
    window.addEventListener('resize', resizeHandler);
}

/**
 * Cleanup function for HMR
 */
function cleanup() {
    if (evolution) {
        evolution.stopSimulation();
        evolution = null;
    }
    
    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
    }

    if (neuralLab) {
        neuralLab.stopRenderLoop();
        neuralLab = null;
    }
    
    if (app) {
        app.destroy(true, {
            children: true,
            texture: true,
            baseTexture: true,
        });
        app = null;
    }
}

// Initialize the application
await initApp();

// Hot Module Replacement
if (module.hot) {
    module.hot.accept();
    
    module.hot.dispose(() => {
        cleanup();
    });
}
