import './index.css';
import * as PIXI from 'pixi.js';
import CarObject from './car/CarObject';
import TrackObject from './sim/TrackObject';
import Simulation from './sim/Simulation';

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
simulation.view.x = app.screen.width / 2;
simulation.view.y = app.screen.height / 2;
app.stage.addChild(simulation.view);
const track = new TrackObject();
const car = new CarObject(track);
track.buildTestTrack();
car.y = 10
car.x = -10
simulation.masterContainer.addChild(track.view);
simulation.masterContainer.addChild(car.view);
simulation.followCamera(car);

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

