import './index.css';
import * as PIXI from 'pixi.js';

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
const graphics = new PIXI.Graphics();
graphics.circle(0, 0, 50);
graphics.fill(0xffff00);
app.stage.addChild(graphics);

// Center the graphic
const centerGraphic = () => {
    graphics.x = app.screen.width / 2;
    graphics.y = app.screen.height / 2;
};

centerGraphic();

// Update position on resize
app.renderer.on('resize', centerGraphic);

console.log('PixiJS application initialized!');

// Hot Module Replacement
if (module.hot) {
    module.hot.accept();
    
    module.hot.dispose(() => {
        app.destroy(true, {
            children: true,
            texture: true,
            baseTexture: true,
        });
    });
}

