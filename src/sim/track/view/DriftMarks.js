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
        this.brushAlphaMin = 0.05;
        this.brushAlphaMax = 0.5;
        this.brushWidthScale = 0.8
        this.lastCarState = {}
    }

    getTiresPosition(x, y, carLength, carWidth, direction) {
      const cos = Math.cos(direction);
      const sin = Math.sin(direction);
    
      // Define axle offsets (tune to your car model)
      const frontAxle = carLength * 0.30;
      const rearAxle  = -carLength * 0.35;
    
      // Track half-width (distance from centerline to wheel)
      const halfTrack = carWidth * 0.35;

      const translateToWorld = (long, lat) => ({x: x + long * cos - lat * sin, y: y + long * sin + lat * cos});

      return [
        translateToWorld(frontAxle, -halfTrack),
        translateToWorld(frontAxle, +halfTrack),
        translateToWorld(rearAxle, -halfTrack),
        translateToWorld(rearAxle, +halfTrack),
      ];
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
          wheels: this.getTiresPosition(x, y, carLength, carWidth, direction),
        };
        return;
      }
      const lastState = this.lastCarState[carId];
      const currentWheels = this.getTiresPosition(x, y, carLength, carWidth, direction);

      const distance = Math.sqrt((x - lastState.x)**2 + (y - lastState.y)**2);

      if (distance < this.brushLength) {
        return;
      }
    
      // Pre-set brush params once
      const b = this.brush;
      b.rotation = direction;
      b.alpha = this.brushAlphaMin + (this.brushAlphaMax - this.brushAlphaMin) * alpha * alpha * (0.5 + Math.random() * 0.5);
      b.scale.set(
        distance / this.brushLength, 
        this.brushWidthScale
      )
    
      const stamp = (x, y) => {
        b.position.set(x, y);
        this.pixiApp.renderer.render({
          container: b,
          target: this.renderTexture,
          clear: false,
        });
      };
    
      for (let i = 0; i < currentWheels.length; i++) {
        const xMid = (currentWheels[i].x + lastState.wheels[i].x) / 2;
        const yMid = (currentWheels[i].y + lastState.wheels[i].y) / 2;
        const wheelDirection = Math.atan2(currentWheels[i].y - lastState.wheels[i].y, currentWheels[i].x - lastState.wheels[i].x);
        b.rotation = wheelDirection;
        stamp(xMid, yMid);
      }
      this.lastCarState[carId] = {
        x: x,
        y: y,
        direction: direction,
        carLength: carLength,
        carWidth: carWidth,
        wheels: currentWheels,
      };
    }

    clear() {
      if(this.renderTexture) {
        return
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