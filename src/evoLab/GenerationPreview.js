import * as PIXI from 'pixi.js';
import { createCircleParticleTexture } from './generationPreview/createCircleParticleTexture';
import { ParticleLayoutController } from './generationPreview/ParticleLayoutController';


const MAX_SCORE = 1.6;
const TRACK_WIDTH = 300;
const TRACK_LENGTH = 800;
const UNIT_RADIUS = 5;
// Minimum empty space between particle edges.
// Increase this to make particles keep a bigger distance.
const MIN_EDGE_GAP = UNIT_RADIUS;
const MIN_CENTER_DISTANCE = UNIT_RADIUS * 2 + MIN_EDGE_GAP;

// Random helpers
// - randSigned(): [-1, 1)
// - randPow3(): "clustered near 0" distribution by cubing
const randSigned = () => Math.random() * 2 - 1;
const randPow3 = () => {
  const r = randSigned();
  return r * r * r;
};

class GenerationPreview extends PIXI.Container {
  constructor(generation) {
    super();

    this.generation = generation;
    this.particles = [];
    
    // Create static lines container
    this.linesContainer = new PIXI.Container();
    this.addChild(this.linesContainer);

    const linesGraphics = new PIXI.Graphics();
    linesGraphics.moveTo(1/MAX_SCORE * TRACK_LENGTH - TRACK_LENGTH/2, -TRACK_WIDTH/2);
    linesGraphics.lineTo(1/MAX_SCORE * TRACK_LENGTH - TRACK_LENGTH/2, TRACK_WIDTH/2);
    linesGraphics.moveTo(- TRACK_LENGTH/2 - UNIT_RADIUS*1.5, -TRACK_WIDTH/2);
    linesGraphics.lineTo(- TRACK_LENGTH/2 - UNIT_RADIUS*1.5, TRACK_WIDTH/2);
    linesGraphics.stroke({ 
      color: 0x888888,
      width: 1,
    });
    this.linesContainer.addChild(linesGraphics);

    // Create particle container
    this.particleContainer = new PIXI.ParticleContainer({
      dynamicProperties: {
        position: true,
        color: true,
      },
    });
    this.addChild(this.particleContainer);

    // Create texture for particles (static, shared across all particles)
    this.particleTexture = createCircleParticleTexture({ radius: UNIT_RADIUS });

    // Physics/layout controller (spring to origin + keep min distance)
    this.layout = new ParticleLayoutController({
      particles: this.particles,
      minCenterDistance: MIN_CENTER_DISTANCE,
      bounds: { halfW: TRACK_WIDTH / 2, halfL: TRACK_LENGTH / 2 },
    });

    // Create particles for each generation unit
    for(let i = 0; i < this.generation.cars.length; i++) {
      const score = this.generation.scores[i];
      const x = score/MAX_SCORE * TRACK_LENGTH - TRACK_LENGTH/2 + randPow3() * UNIT_RADIUS;
      const y = randPow3() * TRACK_WIDTH * 0.25;
      const color = score > 1.0 ? 0x8888FF : 0xff6600;

      const particle = this._createParticle(x, y, color);
      
      this.particleContainer.addParticle(particle);
      this.particles.push(particle);
    }

    // Initial settle so particles never overlap.
    this.layout.invalidate();
    this.layout.start();
  }

  _createParticle(x, y, tint) {
    const particle = new PIXI.Particle({
      texture: this.particleTexture,
      x,
      y,
      anchorX: 0.5,
      anchorY: 0.5,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      tint,
    });

    // Physics state (kept on the particle for simplicity)
    particle.ox = x;
    particle.oy = y;
    particle.vx = 0;
    particle.vy = 0;
    particle._lx = x;
    particle._ly = y;

    return particle;
  }

  destroy(options) {
    this.layout?.destroy();
    super.destroy(options);
  }
}


export default GenerationPreview;