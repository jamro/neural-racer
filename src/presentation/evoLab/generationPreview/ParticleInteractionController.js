import * as PIXI from 'pixi.js';

/**
 * Handles pointer interactions for GenerationPreview particles.
 * Keeps hit-testing in a separate place so the preview can be moved/scaled externally.
 */
export class ParticleInteractionController {
  constructor({
    container,
    particles,
    unitRadius,
    trackLength,
    trackWidth,
    leftPadding,
    trackCenterYOffset,
  }) {
    this.container = container;
    this.particles = particles;
    this.unitRadius = unitRadius;
    this._hoveredParticle = null;

    this._setupInteraction({
      trackLength,
      trackWidth,
      leftPadding,
      trackCenterYOffset,
    });
  }

  destroy() {
    if (!this.container) return;
    this.container.off('pointermove', this._onPointerMove);
    this.container.off('pointerout', this._onPointerLeave);
    this.container.off('pointerleave', this._onPointerLeave);
    this.container.off('pointertap', this._onPointerTap);
    this.container.cursor = 'default';
    this._hoveredParticle = null;
  }

  _setupInteraction({ trackLength, trackWidth, leftPadding, trackCenterYOffset }) {
    this.container.eventMode = 'static';
    this.container.cursor = 'default';

    const halfWidth = trackLength / 2 + leftPadding;
    const halfHeight = trackWidth / 2 + trackCenterYOffset + this.unitRadius * 8;
    this.container.hitArea = new PIXI.Rectangle(
      -halfWidth,
      -halfHeight,
      halfWidth * 2,
      halfHeight * 2,
    );

    this.container.on('pointermove', this._onPointerMove);
    this.container.on('pointerout', this._onPointerLeave);
    this.container.on('pointerleave', this._onPointerLeave);
    this.container.on('pointertap', this._onPointerTap);
  }

  _onPointerMove = (event) => {
    const local = this._getLocalPoint(event);
    const particle = this._findParticleAtPoint(local.x, local.y);

    if (particle !== this._hoveredParticle) {
      this._hoveredParticle = particle;
      this.container.cursor = particle ? 'pointer' : 'default';
    }
  };

  _onPointerLeave = () => {
    this._hoveredParticle = null;
    this.container.cursor = 'default';
  };

  _onPointerTap = (event) => {
    const local = this._getLocalPoint(event);
    const particle = this._hoveredParticle ?? this._findParticleAtPoint(local.x, local.y);

    if (particle) {
      this.container.emit('particle-click', { particle });
    } else {
      this.container.emit('particle-empty-click', { position: local });
    }
  };

  _findParticleAtPoint(x, y) {
    let closest = null;
    let closestDistSq = Infinity;
    for (const particle of this.particles) {
      if (!particle || particle.destroyed) continue;
      const radius = this.unitRadius * (particle.scaleX ?? 1);
      const dx = x - particle.x;
      const dy = y - particle.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= radius * radius && distSq < closestDistSq) {
        closest = particle;
        closestDistSq = distSq;
      }
    }
    return closest;
  }

  _getLocalPoint(event) {
    const globalPoint = event?.global ?? new PIXI.Point(event.globalX, event.globalY);
    return this.container.toLocal(globalPoint);
  }
}
