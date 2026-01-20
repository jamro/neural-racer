import { Container, Sprite, Graphics, Texture } from 'pixi.js';
import { getCarTexture, getGhostTexture, getShadowTexture } from '../../../resources/Assets';

const DEBUG_RADAR_BEAMS = false;

class CarView extends Container {
  constructor(w, h, radarBeamAngles) {
    super();
        
    this.radarBeamAngles = radarBeamAngles;

    // Get textures from module (should be preloaded)
    const texture = getCarTexture() || Texture.EMPTY;
    const ghostTexture = getGhostTexture() || Texture.EMPTY;
    const shadowTexture = getShadowTexture() || Texture.EMPTY;

    // shadow - placed under the body, scaled proportionally to body
    this.shadow = new Sprite(shadowTexture);
    this.shadow.anchor.set(0.5, 0.5);
    if (shadowTexture && shadowTexture !== Texture.EMPTY && texture && texture !== Texture.EMPTY) {
      // Scale shadow proportionally to body dimensions
      this.shadow.scale.set(w / shadowTexture.width, h / shadowTexture.height);
    }
    this.addChild(this.shadow);

    // body
    this.body = new Sprite(texture);
    this.body.anchor.set(0.5, 0.5);
    if (texture && texture !== Texture.EMPTY) {
      this.body.scale.set(w / texture.width, h / texture.height);
    }
    this.addChild(this.body);

    // simple body as rect
    this.simpleBody = new Graphics();
    this.simpleBody.rect(-w/2, -h/2, w, h);
    this.simpleBody.fill({ color: 0xffffff, alpha: 0.5 });
    this.simpleBody.stroke({ color: 0xff0000, width: 1 });
    this.simpleBody.visible = false
    this.addChild(this.simpleBody);

    // ghost - get texture from module (should be preloaded)
    this.ghost = new Sprite(ghostTexture);
    this.ghost.alpha = 0.9;
    this.ghost.anchor.set(0.5, 0.5);
    if (ghostTexture && ghostTexture !== Texture.EMPTY) {
      this.ghost.scale.set(w / ghostTexture.width, h / ghostTexture.height);
    }
    this.addChild(this.ghost);

    this.radar = new Graphics();
    this.radar.scale.set(w / 50, h / 25);
    this.radar.moveTo(0, 0);
    this.addChild(this.radar);

    this._isActive = false;
    this.active = false;

    this._isCrashed = false;
    this.crashed = false;
    this._highQuality = true;
  }

  set highQuality(highQuality) {
    this._highQuality = highQuality;
    this.redrawBody();
  }

  get highQuality() {
    return this._highQuality;
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
    this.simpleBody.visible = !this.highQuality;
    if(this.active) {
      this.radar.visible = true;
      this.body.visible = this.highQuality;
      this.ghost.visible = false;
      this.shadow.visible = this.highQuality;
      this.simpleBody.tint = 0xff0000;
    } else {
      this.radar.visible = false;
      this.body.visible = false;
      this.ghost.visible = this.highQuality;
      this.shadow.visible = false;
      this.simpleBody.tint = 0xffffff;
    }
  }

  renderRadar(beamsLengths, safeDirection) {
    if (!this.radar.visible || !DEBUG_RADAR_BEAMS) return;
        
    // Clear before drawing to prevent geometry accumulation
    this.radar.clear();

    // Build all paths first, then stroke once to minimize GraphicsPath creation
    for (let i = 0; i < this.radarBeamAngles.length; i++) {
      const angle = this.radarBeamAngles[i];
      const length = beamsLengths[i];
      this.radar.moveTo(0, 0);
      this.radar.lineTo(
        length * Math.cos(angle),
        length * Math.sin(angle)
      );
    }
    // Single stroke call for all beams (same style)
    if (this.radarBeamAngles.length > 0) {
      this.radar.stroke({ color: 0xffffff, width: 3, alpha: 0.3 });
    }

    // Safe direction arrow (separate path with different style)
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
