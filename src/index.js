import './index.css';
import * as PIXI from 'pixi.js';
import NeuralCarObject from './car/NeuralCarObject';
import TrackObject from './sim/TrackObject';
import Simulation from './sim/Simulation';
import KeyboardController from './controller/KeyboardController';

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
const simulation = new Simulation(120, app);
simulation.scaleView(app.screen.width, app.screen.height);
app.stage.addChild(simulation.view);
const track = new TrackObject();
const car = new NeuralCarObject(track);
track.buildTestTrack();
simulation.setTrack(track);
simulation.addCar(car);
simulation.followCar(car);

// Initialize keyboard controller
//const keyboardController = new KeyboardController(car);

console.log('PixiJS application initialized!');

// Create simulation instance (runs at 120 FPS, 2x faster than typical 60 FPS render)

simulation.addObject(car);
simulation.addObject(track);
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

