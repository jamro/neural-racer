import * as PIXI from 'pixi.js';
import { getCarTexture, getGhostTexture, getShadowTexture } from '../../loaders/loadCarTexture';

const DEBUG_RADAR_BEAMS = false;

class CarView extends PIXI.Container {
    constructor(w, h, radarBeamAngles) {
        super();
        
        this.radarBeamAngles = radarBeamAngles;

        // Get textures from module (should be preloaded)
        const texture = getCarTexture() || PIXI.Texture.EMPTY;
        const ghostTexture = getGhostTexture() || PIXI.Texture.EMPTY;
        const shadowTexture = getShadowTexture() || PIXI.Texture.EMPTY;

        // shadow - placed under the body, scaled proportionally to body
        this.shadow = new PIXI.Sprite(shadowTexture);
        this.shadow.anchor.set(0.5, 0.5);
        if (shadowTexture && shadowTexture !== PIXI.Texture.EMPTY && texture && texture !== PIXI.Texture.EMPTY) {
            // Scale shadow proportionally to body dimensions
            this.shadow.scale.set(w / shadowTexture.width, h / shadowTexture.height);
        }
        this.addChild(this.shadow);

        // body
        this.body = new PIXI.Sprite(texture);
        this.body.anchor.set(0.5, 0.5);
        if (texture && texture !== PIXI.Texture.EMPTY) {
            this.body.scale.set(w / texture.width, h / texture.height);
        }
        this.addChild(this.body);

        // ghost - get texture from module (should be preloaded)
        this.ghost = new PIXI.Sprite(ghostTexture);
        this.ghost.alpha = 0.9;
        this.ghost.anchor.set(0.5, 0.5);
        if (ghostTexture && ghostTexture !== PIXI.Texture.EMPTY) {
            this.ghost.scale.set(w / ghostTexture.width, h / ghostTexture.height);
        }
        this.addChild(this.ghost);

        this.radar = new PIXI.Graphics();
        this.radar.scale.set(w / 50, h / 25);
        this.radar.moveTo(0, 0);
        this.addChild(this.radar);

        this._isActive = false;
        this.active = false;

        this._isCrashed = false;
        this.crashed = false;
    }

    set crashed(isCrashed) {
        this._isCrashed = isCrashed;
        this.redrawBody();
    }

    get crashed() {
        return this._isCrashed;
    }

    set active(isActive) {
        this._isActive = isActive;
        this.redrawBody();
        if (this.parent) {
            this.parent.setChildIndex(this, this.parent.children.length - 1);
        }
    }

    get active() {
      return this._isActive;
    }

    redrawBody() {
      if(this.active) {
        this.radar.visible = true;
        this.body.visible = true;
        this.ghost.visible = false;
        this.shadow.visible = true;
      } else {
        this.radar.visible = false;
        this.body.visible = false;
        this.ghost.visible = true;
        this.shadow.visible = false;
      }
    }

    renderRadar(beamsLengths, safeDirection) {
        if (!this.radar.visible || !DEBUG_RADAR_BEAMS) return;
        this.radar.clear();

        for (let i = 0; i < this.radarBeamAngles.length; i++) {
          const angle = this.radarBeamAngles[i];
          const length = beamsLengths[i];
          this.radar.moveTo(0, 0);
          this.radar.lineTo(
            length * Math.cos(angle),
            length * Math.sin(angle)
          );
          this.radar.stroke({ color: 0xffffff, width: 3, alpha: 0.3 });
        }

        this.radar.moveTo(0, 0);
        this.radar.lineTo(
          100 * Math.cos(safeDirection),
          100 * Math.sin(safeDirection)
        );
        this.radar.moveTo(
          90 * Math.cos(safeDirection-0.1),
          90 * Math.sin(safeDirection-0.1)
        );
        this.radar.lineTo(
          100 * Math.cos(safeDirection),
          100 * Math.sin(safeDirection)
        );
        this.radar.lineTo(
          90 * Math.cos(safeDirection+0.1),
          90 * Math.sin(safeDirection+0.1)
        );
        this.radar.stroke({ color: 0xffffff, width: 5, alpha: 0.7 });
    }
}

export default CarView;