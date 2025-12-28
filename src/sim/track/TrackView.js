import * as PIXI from 'pixi.js';
import TiledBackground from './view/TiledBackground';
import { getTexture } from '../../loaders/AssetLoader';

const SHOW_TRACK_GEOMETRY = false;

class TrackView extends PIXI.Container {
    constructor(wallWidth) {
        super();
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
            'track_bg_001', 'track_bg_002', 'track_bg_003', 'track_bg_004',
            'tires001', 'tires002', 'tires003', 'tires004', 'tires005', 'tires006',
            'tires007', 'tires008', 'tires009', 'tires010', 'tires011', 'tires012',
            'tires013', 'tires014', 'tires015', 'tires016',
            'bush001', 'bush002', 'bush003', 'bush004', 'bush005', 'bush006',
            'bush007', 'bush008', 'bush009',
            'edge001', 'edge002', 'edge003', 'edge004', 'edge005', 'edge006',
            'edge007', 'edge008', 'edge009', 'edge010', 'edge011', 'edge012',
            'edge013', 'edge014', 'edge015', 'edge016', 'edge017', 'edge018', 
            'edge019', 'edge020', 'edge021', 'edge022',
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
        this.addChild(this.background);

        this.graphicsContainer = new PIXI.Container();
        this.addChild(this.graphicsContainer);
        
        this.canvas = new PIXI.Graphics();
        if(SHOW_TRACK_GEOMETRY) {
          this.addChild(this.canvas);
        }
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

    render(width, height, xOffset = 0, yOffset = 0) {
      this.background.renderSync(width, height, 1, xOffset, yOffset);
      this.background.x = -xOffset - width/2;
      this.background.y = -yOffset - height/2;
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
}

export default TrackView;