import './index.css';
import * as PIXI from 'pixi.js';
import Evolution from './neuralEvolution/Evolution';
import SvgTrackLoader from './loaders/SvgTrackLoader';
import Config from './Config';
import Preloader from './loaders/Preloader';

let app = null;
let evolution = null;
let resizeHandler = null;
const preloader = new Preloader(document);

/**
 * Initialize the application
 * This function can be called multiple times for HMR
 */
async function initApp() {
    try {
        // Show DOM loading overlay immediately
        preloader.show();
        preloader.setProgress(0, 'Starting');

        // Load core assets (fonts + textures)
        await preloader.load();

        // Create and initialize the application
        preloader.setProgress(86, 'Initializing renderer');
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

        // Load tracks (with progress)
        const tracksData = [
            { url: 'assets/tracks/lesson_001.svg' },
            { url: 'assets/tracks/lesson_002.svg' },
            { url: 'assets/tracks/lesson_003.svg' },
            { url: 'assets/tracks/lesson_004.svg' },
            { url: 'assets/tracks/lesson_005.svg' },
            { url: 'assets/tracks/lesson_006.svg' },
        ];

        preloader.setProgress(90, `Loading tracks (0/${tracksData.length})`);
        let tracksLoaded = 0;
        const tracks = await Promise.all(
            tracksData.map(({ url }) =>
                SvgTrackLoader.load(url).then(track => {
                    tracksLoaded += 1;
                    const pct = 90 + (tracksLoaded / tracksData.length) * 6; // 90..96
                    preloader.setProgress(pct, `Loaded track (${tracksLoaded}/${tracksData.length})`);
                    return track;
                })
            )
        );

        // Initialize evolution
        preloader.setProgress(96, 'Initializing evolution');
        evolution = new Evolution(app, tracks);

        const config = new Config();
        PIXI.Ticker.shared.maxFPS = config.frameRate || 30;
        config.setStandardMode();

        await evolution.initialize(config);
        preloader.setProgress(100, 'Ready');

        // Hide loader before entering the long-running loop.
        preloader.hide();

        // Handle window resize
        resizeHandler = () => {
            if (app && app.resize) {
                app.resize(window.innerWidth, window.innerHeight);
                evolution.scaleView(window.innerWidth, window.innerHeight);
            }
        };
        window.addEventListener('resize', resizeHandler);

        await evolution.runInLoop();
    } catch (err) {
        console.error('Failed to initialize app:', err);
        preloader.show();
        preloader.setProgress(100, 'Load failed — check console for details');
        throw err;
    }
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
    
    if (app) {
        app.destroy(true, {
            children: true,
            texture: true,
            baseTexture: true,
            // Pixi v8: ensure GraphicsContext is destroyed for any Graphics on stage
            context: true,
        });
        app = null;
    }

    // Ensure loading overlay doesn't linger across hot reloads
    preloader.hide({ remove: true });
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
