import './index.css';
import * as PIXI from 'pixi.js';
import CarObject from './car/CarObject';
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
const masterContainer = new PIXI.Container();
masterContainer.x = app.screen.width / 2;
masterContainer.y = app.screen.height / 2;
app.stage.addChild(masterContainer);
const car = new CarObject();
masterContainer.addChild(car.view);

console.log('PixiJS application initialized!');

// Create simulation instance (runs at 120 FPS, 2x faster than typical 60 FPS render)
const simulation = new Simulation(120, app);
simulation.addObject(car);
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

