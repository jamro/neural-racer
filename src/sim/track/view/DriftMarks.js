import * as PIXI from 'pixi.js';
import { getTireMarkTexture } from '../../../loaders/AssetLoader';

class DriftMarks extends PIXI.Container {
    constructor(pixiApp) {
        super();

        this.pixiApp = pixiApp;


        this.sprite = new PIXI.Sprite();
        this.addChild(this.sprite);

        this.clear();

        const brushTexture = getTireMarkTexture() || PIXI.Texture.EMPTY;

        this.brushLength = brushTexture.width * 0.75; // allow overlap of the brush

        this.brush = new PIXI.Sprite(brushTexture);
        this.brush.anchor.set(0.5);
        this.brushAlphaMin = 0.01;
        this.brushAlphaMax = 0.5;
        this.brushWidthScale = 1
        this.lastCarState = {}
    }

    drawDriftMark(carId, x, y, direction, carLength, carWidth, alpha) {
      if (!this.pixiApp) throw new Error('pixiApp not set');
      if (!this.brush) throw new Error('brush not set');
      if (!this.renderTexture) throw new Error('renderTexture not set');

      if(!this.lastCarState[carId]) {
        this.lastCarState[carId] = {
          x: x,
          y: y,
          direction: direction,
          carLength: carLength,
          carWidth: carWidth,
        };
        return;
      }
      const lastState = this.lastCarState[carId];
      const distance = Math.sqrt((x - lastState.x)**2 + (y - lastState.y)**2);

      if (distance < this.brushLength) {
        console.log('distance too short', distance);
        return;
      }

      x = (x + lastState.x) / 2;
      y = (y + lastState.y) / 2;
      direction = (direction + lastState.direction) / 2;
    
      const cos = Math.cos(direction);
      const sin = Math.sin(direction);
    
      // Define axle offsets (tune to your car model)
      const frontAxle = carLength * 0.30;
      const rearAxle  = -carLength * 0.35;
    
      // Track half-width (distance from centerline to wheel)
      const halfTrack = carWidth * 0.35;
    
      // Pre-set brush params once
      const b = this.brush;
      b.rotation = direction;
      b.alpha = this.brushAlphaMin + (this.brushAlphaMax - this.brushAlphaMin) * alpha;
      b.scale.set(
        distance / this.brushLength, 
        this.brushWidthScale
      )
    
      // Helper inline: transform (longitudinal, lateral) -> world
      // worldX = x + long*cos - lat*sin
      // worldY = y + long*sin + lat*cos
      const stamp = (long, lat) => {
        b.position.set(
          x + long * cos - lat * sin,
          y + long * sin + lat * cos
        );
    
        this.pixiApp.renderer.render({
          container: b,
          target: this.renderTexture,
          clear: false,
        });
      };
    
      stamp(rearAxle, -halfTrack);
      stamp(rearAxle, +halfTrack);
      stamp(frontAxle, -halfTrack);
      stamp(frontAxle, +halfTrack);
      this.lastCarState[carId] = {
        x: x,
        y: y,
        direction: direction,
        carLength: carLength,
        carWidth: carWidth,
      };
    }

    clear() {
      if(this.renderTexture) {
        this.renderTexture.destroy();
      }
      this.renderTexture = PIXI.RenderTexture.create({
        width: 4000,
        height: 4000,
        resolution: 1,
      });
      this.sprite.texture = this.renderTexture;
      this.lastCarState = {};
    }
    

}

export default DriftMarks;