import * as PIXI from 'pixi.js';
import TiledBackground from './view/TiledBackground';
import { getTexture } from '../../loaders/AssetLoader';
import CullingContainer from '../CullingContainer';
import DriftMarks from './view/DriftMarks';
import DustContainer from './view/DustContainer';

const SHOW_TRACK_GEOMETRY = false;

class TrackView extends PIXI.Container {
    constructor(wallWidth) {
        super();
        this._pixiApp = null;
        // Helper function to convert filename to registry key
        // track_bg_001 -> trackBg001, tires001 -> tires001, etc.
        const filenameToKey = (filename) => {
            if (filename.startsWith('track_bg_')) {
                const num = filename.replace('track_bg_', '');
                return `trackBg${num}`;
            }
            // For other textures, filename matches the registry key
            return filename;
        };
        
        // List of all texture filenames used by tracks
        const textureFilenames = [
            'track_bg_001', 'track_bg_002', 'track_bg_003', 'track_bg_004', 'track_bg_005',
            'tires001', 'tires002', 'tires003', 'tires004', 'tires005', 'tires006',
            'tires007', 'tires008', 'tires009', 'tires010', 'tires011', 'tires012',
            'tires013', 'tires014', 'tires015', 'tires016',
            'bush001', 'bush002', 'bush003', 'bush004', 'bush005', 'bush006',
            'bush007', 'bush008', 'bush009',
            'edge001', 'edge002', 'edge003', 'edge004', 'edge005', 'edge006',
            'edge007', 'edge008', 'edge009', 'edge010', 'edge011', 'edge012',
            'edge013', 'edge014', 'edge015', 'edge016', 'edge017', 'edge018', 
            'edge019', 'edge020', 'edge021', 'edge022',
            'ruin001', 'ruin002', 'ruin003', 'ruin004', 'ruin005',
            'crates_001', 'crates_002', 'crates_003', 'crates_004',
            'crates_005', 'crates_006', 'crates_007', 'crates_008',
            'finishline001'
        ];
        
        // Build texture map using generic getTexture function
        this.trackTextures = {};
        for (const filename of textureFilenames) {
            const key = filenameToKey(filename);
            this.trackTextures[filename] = getTexture(key);
        }
        
        this.wallWidth = wallWidth;
        this.background = new TiledBackground();

        this.graphicsContainer = new CullingContainer();
        
        this.canvas = new PIXI.Graphics();
        this.driftMarks = new DriftMarks(this.pixiApp);
        this.dustContainer = new DustContainer();

        this.carsContainer = new PIXI.Container();
        this.addChild(this.carsContainer);
        
        this._graphicsQuality = "low";
    }

    set graphicsQuality(quality) {
      this._graphicsQuality = quality;
      
      const includeInLowQuality = (obj) => {
        if(quality === "low" && !obj.parent) {
          this.addChild(obj);
        } else if(quality === "high" && obj.parent) {
          this.removeChild(obj);
        }
      }

      const includeInHighQuality = (obj) => {
        if(quality === "low" && obj.parent) {
          this.removeChild(obj);
        } else if(quality === "high" && !obj.parent) {
          this.addChild(obj);
        }
      }

      includeInLowQuality(this.canvas);
      includeInHighQuality(this.background);
      includeInHighQuality(this.graphicsContainer);
      includeInHighQuality(this.driftMarks);
      this.carsContainer.parent.setChildIndex(this.carsContainer, this.carsContainer.parent.children.length - 1);
      includeInHighQuality(this.dustContainer);
      if(this.dustContainer.parent) {
        this.dustContainer.parent.setChildIndex(this.dustContainer, this.dustContainer.parent.children.length - 1);
      }
    }

    get graphicsQuality() {
      return this._graphicsQuality;
    }

    set pixiApp(app) {
      this._pixiApp = app;
      this.driftMarks.pixiApp = app;
    }

    get pixiApp() {
      return this._pixiApp;
    }

    addTrackShape(shape, color = 0xc39d75) {
      const graphics = new PIXI.Graphics();
      graphics.moveTo(shape[0].ax, shape[0].ay);
      for (const segment of shape) {
        graphics.lineTo(segment.bx, segment.by);
      }
      graphics.fill({ color });
      this.graphicsContainer.addChild(graphics);
    }

    addTrackGraphic(filename, x, y, width, height, rotation = 0, scaleX = 1, scaleY = 1) {
      const trackBgTexture = this.trackTextures[filename];
      if (!trackBgTexture) {
        throw new Error(`Track texture "${filename}" not found`);
      }
      const sprite = new PIXI.Sprite(trackBgTexture);
      
      sprite.x = x;
      sprite.y = y;
      sprite.width = width * scaleX;
      sprite.height = height * scaleY;
      sprite.rotation = rotation
      if (/^tires[0-9]+$/.test(filename)) {
        sprite.alpha = 0.3 + Math.random() * 0.5;
      }
      this.graphicsContainer.addChild(sprite);
      return sprite;
    }

    renderView(width, height, xOffset = 0, yOffset = 0) {
      const renderRectX = -xOffset - width/2;
      const renderRectY = -yOffset - height/2;
      const renderRectWidth = width;
      const renderRectHeight = height;
      
      if(this.background.parent) {
        this.background.renderSync(width, height, 1, xOffset, yOffset);
        this.background.x = -xOffset - width/2;
        this.background.y = -yOffset - height/2;
      }

      if(this.graphicsContainer.parent) {
        this.graphicsContainer.renderArea(
          renderRectX, 
          renderRectY, 
          renderRectWidth, 
          renderRectHeight
        );
      }
      if(this.dustContainer.parent) {
        this.dustContainer.update();
      }
    }

    addSegment(ax, ay, bx, by) {
      this.canvas.moveTo(ax, ay);
      this.canvas.lineTo(bx, by);
      this.canvas.stroke({ color: 0x000000, width: this.wallWidth });
    }

    addCheckpoint(ax, ay, bx, by) {
      this.canvas.moveTo(ax, ay);
      this.canvas.lineTo(bx, by);
      this.canvas.stroke({ color: 0xffffff, alpha: 0.5, width: 1 });
    }

    drawDriftMark(carId, x, y, direction, carLength, carWidth, alpha, dustAmount) {
      if(this.graphicsQuality === "high") {
        this.driftMarks.drawDriftMark(carId, x, y, direction, carLength, carWidth, alpha);
        if(dustAmount > 0) {
          this.dustContainer.addDust(
            x, 
            y, 
            direction,
            carLength,
            carWidth,
            dustAmount
          );
        }
      }
    }

    reset() {
      this.carsContainer.removeChildren();
      this.driftMarks.clear();
      this.dustContainer.removeAllParticles();
    }
}

export default TrackView;