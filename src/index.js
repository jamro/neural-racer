import './index.css';
import * as PIXI from 'pixi.js';
import Evolution from './neural/Evolution';
import loadTrackFromSvg from './sim/loadTrackFromSvg';

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
const track = await loadTrackFromSvg('assets/track.svg');
const evolution = new Evolution(app, track);
evolution.initialize({
  populationSize: 100,
  evolve: {
    eliteRatio: 0.02, 
    eliminationEpochs: 5, 
    eliminationRate: 0.10,
    crossover: {
      blendRatio: 0.7
    },
    mutation: {
      rate: 0.03,
      sigma: 0.12
    }
  }
});

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

