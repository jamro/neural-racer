import * as PIXI from 'pixi.js';
import { getGrassTexture } from '../../../loaders/loadTrackTexture';

class TiledBackground extends PIXI.Container {
    constructor(texture) {
        super();
        this.tilingSprite = null;
        this.texture = texture;
        this._cachedTexture = null;
        this._lastWidth = null;
        this._lastHeight = null;
        this._lastScale = null;
        this._lastXOffset = null;
        this._lastYOffset = null;
    }

    async renderView(width, height, scale = 0, xOffset = 0, yOffset = 0) {
        // Cache texture after first load to avoid async operations every frame
        if (!this._cachedTexture) {
            if (this.texture) {
                this._cachedTexture = this.texture;
            } else {
                // Get texture from module (should be preloaded)
                this._cachedTexture = getGrassTexture() || PIXI.Texture.EMPTY;
            }
        }

        // Create tiling sprite if it doesn't exist
        if (!this.tilingSprite) {
            this.tilingSprite = new PIXI.TilingSprite({
                texture: this._cachedTexture,
                width: width,
                height: height,
            });
            this.addChild(this.tilingSprite);
            this._lastWidth = width;
            this._lastHeight = height;
            this._lastScale = scale;
            this._lastXOffset = xOffset;
            this._lastYOffset = yOffset;
        }

        // Only update properties if they've changed (performance optimization)
        if (this._lastWidth !== width) {
            this.tilingSprite.width = width;
            this._lastWidth = width;
        }
        if (this._lastHeight !== height) {
            this.tilingSprite.height = height;
            this._lastHeight = height;
        }
        if (this._lastScale !== scale) {
            this.tilingSprite.tileScale.set(scale, scale);
            this._lastScale = scale;
        }
        if (this._lastXOffset !== xOffset) {
            this.tilingSprite.tilePosition.x = xOffset;
            this._lastXOffset = xOffset;
        }
        if (this._lastYOffset !== yOffset) {
            this.tilingSprite.tilePosition.y = yOffset;
            this._lastYOffset = yOffset;
        }
    }

    // Synchronous render method for use after initialization (better performance for per-frame calls)
    renderSync(width, height, scale = 0, xOffset = 0, yOffset = 0) {
        // Ensure texture is loaded (should be after async render or if texture was provided)
        if (!this._cachedTexture) {
            if (this.texture) {
                this._cachedTexture = this.texture;
            } else {
                // Get texture from module (should be preloaded)
                this._cachedTexture = getGrassTexture() || PIXI.Texture.EMPTY;
                if (!this._cachedTexture || this._cachedTexture === PIXI.Texture.EMPTY) {
                    // Texture not loaded yet, can't render synchronously
                    return;
                }
            }
        }

        // Create tiling sprite if it doesn't exist
        if (!this.tilingSprite) {
            this.tilingSprite = new PIXI.TilingSprite({
                texture: this._cachedTexture,
                width: width,
                height: height,
            });
            this.addChild(this.tilingSprite);
            this._lastWidth = width;
            this._lastHeight = height;
            this._lastScale = scale;
            this._lastXOffset = xOffset;
            this._lastYOffset = yOffset;
            return;
        }

        // Only update properties if they've changed (performance optimization)
        if (this._lastWidth !== width) {
            this.tilingSprite.width = width;
            this._lastWidth = width;
        }
        if (this._lastHeight !== height) {
            this.tilingSprite.height = height;
            this._lastHeight = height;
        }
        if (this._lastScale !== scale) {
            this.tilingSprite.tileScale.set(scale, scale);
            this._lastScale = scale;
        }
        if (this._lastXOffset !== xOffset) {
            this.tilingSprite.tilePosition.x = xOffset;
            this._lastXOffset = xOffset;
        }
        if (this._lastYOffset !== yOffset) {
            this.tilingSprite.tilePosition.y = yOffset;
            this._lastYOffset = yOffset;
        }
    }
}

export default TiledBackground;
