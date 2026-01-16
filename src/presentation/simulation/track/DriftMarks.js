import { Container, Sprite, Texture, RenderTexture } from 'pixi.js';
import { getTireMarkTexture } from '../../../loaders/Assets';

const TEXTURE_MARGIN = 32;
const TEXTURE_SIZE = 2048
const CELL_SIZE = TEXTURE_SIZE - TEXTURE_MARGIN * 2;

class DriftMarks extends Container {
  constructor(pixiApp) {
    super();

    this.pixiApp = pixiApp;
    const brushTexture = getTireMarkTexture() || Texture.EMPTY;

    this.brushLength = brushTexture.width * 0.75; // allow overlap of the brush

    this.renderCanvas = []
    this.brush = new Sprite(brushTexture);
    this.brush.anchor.set(0.5);
    this.brushAlphaMin = 0.05;
    this.brushAlphaMax = 0.5;
    this.brushWidthScale = 0.8
    this.lastCarState = {}
    this.clear();
  }

  getTexture(x, y) {
    const indexX = Math.floor(x / CELL_SIZE);
    const indexY = Math.floor(y / CELL_SIZE);
    if(!this.renderCanvas[indexX]) {
      this.renderCanvas[indexX] = [];
    }
    if(!this.renderCanvas[indexX][indexY]) {
      const texture = RenderTexture.create({
        width: TEXTURE_SIZE,
        height: TEXTURE_SIZE,
        resolution: 1,
      });
      const sprite = new Sprite(texture);
      this.addChild(sprite);
      sprite.position.set(
        indexX * CELL_SIZE - TEXTURE_MARGIN, 
        indexY * CELL_SIZE - TEXTURE_MARGIN
      );
        
      this.renderCanvas[indexX][indexY] = {
        texture: texture,
        sprite: sprite,
        x: indexX * CELL_SIZE,
        y: indexY * CELL_SIZE,
        indexX: indexX,
        indexY: indexY,
      }
    }
    return this.renderCanvas[indexX][indexY];
  }

  getRenderTextures(x, y) {
    const result = [this.getTexture(x, y)];
    const margin = TEXTURE_MARGIN;
      
    for(let i = -1; i <= 1; i++) {
      for(let j = -1; j <= 1; j++) {
        const texture = this.getTexture(x + i * margin, y + j * margin);
        //if(result.indexOf(texture) === -1) {
        result.push(texture);
        //}
      }
    }

    return result;
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
    const canvas = this.getRenderTextures(x, y);
    for (const c of canvas) {
      this.drawDriftMarkOnTexture(
        c.texture, 
        -c.x + TEXTURE_MARGIN, 
        -c.y + TEXTURE_MARGIN, 
        carId, 
        x, 
        y, 
        direction, 
        carLength, 
        carWidth, 
        alpha
      );
    }

  }

  drawDriftMarkOnTexture(renderTexture, xOffset, yOffset, carId, x, y, direction, carLength, carWidth, alpha) {
    if (!this.pixiApp) throw new Error('pixiApp not set!!');
    if (!this.brush) throw new Error('brush not set!!');
    if (!renderTexture) throw new Error('renderTexture not set!!');

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
      b.position.set(x + xOffset, y + yOffset);
      this.pixiApp.renderer.render({
        container: b,
        target: renderTexture,
        clear: false
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
    this.lastCarState = {};
  }
    

}

export default DriftMarks;
