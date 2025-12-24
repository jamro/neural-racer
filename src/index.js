import './index.css';
import * as PIXI from 'pixi.js';
import TrackObject from './sim/TrackObject';
import Simulation from './sim/Simulation';
import Generation from './neural/Generation';
import Evolution from './neural/Evolution';

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

// Create a simple test graphic to verify everything works
const evolution = new Evolution(app);
evolution.initialize(150);

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

