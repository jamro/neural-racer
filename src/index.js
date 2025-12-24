import './index.css';
import * as PIXI from 'pixi.js';
import TrackObject from './sim/TrackObject';
import Simulation from './sim/Simulation';
import Generation from './neural/Generation';

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
const simulation = new Simulation(app);
simulation.scaleView(app.screen.width, app.screen.height);
app.stage.addChild(simulation.view);
const track = new TrackObject();
const generation = new Generation(track);
generation.initialize(100);
track.buildTestTrack();
simulation.setTrack(track);
simulation.setGeneration(generation);

// Initialize keyboard controller
//const keyboardController = new KeyboardController(car);

console.log('PixiJS application initialized!');

simulation.start(); // Start simulation loop
simulation.startRender(); // Start render loop

// Hot Module Replacement
if (module.hot) {
    module.hot.accept();
    
    module.hot.dispose(() => {
        simulation.stop();
        simulation.stopRender();
        app.destroy(true, {
            children: true,
            texture: true,
            baseTexture: true,
        });
    });
}

