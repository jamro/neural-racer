import * as PIXI from 'pixi.js';
import { createCircleParticleTexture } from './generationPreview/createCircleParticleTexture';
import { ParticleLayoutController } from './generationPreview/ParticleLayoutController';
import TrackView from './generationPreview/TrackView';
import NewGenArea from './generationPreview/NewGenArea';
import WinnerZone from './generationPreview/WinnerZone';
import ParticleNetwork from './generationPreview/ParticleNetwork';

const MAX_SCORE = 1.35;
const TRACK_WIDTH = 400;
const TRACK_LENGTH = 750;
const TRACK_CENTER_Y_OFFSET = 70
const UNIT_RADIUS = 4;
const BLINK_GLOW_TINT = 0xffff66;
const COMPLETE_COLOR = 0x8888FF;
const INCOMPLETE_COLOR = 0xee0000;
const PARTICLE_SCALE_UP_DURATION_MS = 300;
const LEFT_PADDING = 50;
// Minimum empty space between particle edges.
// Increase this to make particles keep a bigger distance.
const MIN_EDGE_GAP = UNIT_RADIUS;

// Random helpers
// - randSigned(): [-1, 1)
// - randPow3(): "clustered near 0" distribution by cubing
const randSigned = () => Math.random() * 2 - 1;
const randPow3 = () => {
  const r = randSigned();
  return r * r * r;
};

class GenerationPreview extends PIXI.Container {
  constructor() {
    super();

    this.generation = null;
    this.particles = [];
    this._particleByGenomeId = new Map();
    this._blinksByGenomeId = new Map(); // genomeId -> { particle, baseTint, mix, phase, fadeInSec, fadeOutSec }
    this._blinkTickerAdded = false;
    this._scaleAnimationsByGenomeId = new Map(); // genomeId -> { particle, elapsed, duration }
    this._scaleTickerAdded = false;
    
    // Create track view and new gen area
    this.trackView = new TrackView(
      MAX_SCORE, 
      TRACK_LENGTH, 
      TRACK_WIDTH/2 + TRACK_CENTER_Y_OFFSET,
      UNIT_RADIUS
    );
    this.trackView.x = LEFT_PADDING / 2;
    this.trackView.y = TRACK_CENTER_Y_OFFSET;
    this.addChild(this.trackView);

    this.winnerZone = new WinnerZone(
      TRACK_LENGTH * ((MAX_SCORE-1)/MAX_SCORE) - 24, 
      TRACK_WIDTH/2 + TRACK_CENTER_Y_OFFSET
    );
    this.winnerZone.x = TRACK_LENGTH/2*(1/MAX_SCORE)+LEFT_PADDING/2 + 12
    this.winnerZone.y = TRACK_CENTER_Y_OFFSET;
    this.addChild(this.winnerZone);

    this.newGenArea = new NewGenArea(
      TRACK_LENGTH, 
      TRACK_CENTER_Y_OFFSET*2
    );
    this.newGenArea.x = -TRACK_LENGTH/2 + LEFT_PADDING/2;
    this.newGenArea.y = -TRACK_WIDTH/2 + TRACK_CENTER_Y_OFFSET*0.75;
    this.newGenArea.visible = false;
    this.addChild(this.newGenArea);

    // Create particle network
    this.particleNetwork = new ParticleNetwork();
    this.addChild(this.particleNetwork);

    // Create particle container
    this.particleContainer = new PIXI.ParticleContainer({
      dynamicProperties: {
        position: true,
        color: true,
        vertex: true, // Required for dynamic scale animations
      },
    });
    this.addChild(this.particleContainer);

    // Create texture for particles (static, shared across all particles)
    this.particleTexture = createCircleParticleTexture({ radius: UNIT_RADIUS });

    // Physics/layout controller (spring to origin + keep min distance)
    this.layout = new ParticleLayoutController({
      particles: this.particles,
      baseRadius: UNIT_RADIUS,
      minEdgeGap: MIN_EDGE_GAP,
      bounds: { 
        halfW: TRACK_WIDTH / 2, 
        halfL: TRACK_LENGTH / 2,
        leftBound: -TRACK_LENGTH / 2 - LEFT_PADDING + LEFT_PADDING / 2,
        rightBound: TRACK_LENGTH / 2 + LEFT_PADDING / 2,
      },
    });
  }

  async initialize(generation) {
    this.generation = generation;

    // Initial settle so particles never overlap.
    this.layout.invalidate();
    this.layout.start();

    // Create particles for each generation unit
    for(let i = 0; i < this.generation.cars.length; i++) {
      const score = this.generation.scores[i];
      const car = this.generation.cars[i];
      const scaledScore = score < 1.0 ? score : (1 + (MAX_SCORE-1)/2) + randPow3() * ((MAX_SCORE-1)/8);
      const x = scaledScore/MAX_SCORE * TRACK_LENGTH - TRACK_LENGTH/2 + LEFT_PADDING / 2 + Math.random() * UNIT_RADIUS;
      const y = randPow3() * TRACK_WIDTH * 0.25 + TRACK_CENTER_Y_OFFSET
      const color = score > 1.0 ? COMPLETE_COLOR : INCOMPLETE_COLOR;

      const particle = this._createParticle(x, y, color, car.genome.genomeId);
      
      this.particleContainer.addParticle(particle);
      this.particles.push(particle);
      this._particleByGenomeId.set(particle.genomeId, particle);
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  }

  addChildParticle(parentIds, childId) {
    this.newGenArea.visible = true;
    const parents = parentIds.map(id => this._particleByGenomeId.get(id)).filter(p => p !== undefined);
    const parentAvgX = parents.length > 0 ? parents.reduce((acc, p) => acc + p.x, 0) / parents.length : -TRACK_LENGTH/2 + LEFT_PADDING / 2 + Math.random() * TRACK_LENGTH

    const baselineX = -TRACK_LENGTH/2 + LEFT_PADDING / 2 + Math.random() * TRACK_LENGTH * (1/MAX_SCORE)
    const particle = this._createParticle(
      0.4*parentAvgX + 0.6*baselineX,
      -TRACK_WIDTH/2 - Math.random() * UNIT_RADIUS + TRACK_CENTER_Y_OFFSET*0.75,
      BLINK_GLOW_TINT, childId
    );
    this.particleContainer.addParticle(particle);
    this.particles.push(particle);
    this._particleByGenomeId.set(particle.genomeId, particle);
    for(const parentId of parentIds) {
      this.blinkParticle(parentId);
      const connection = this.connectParticles(parentId, childId);
      if (connection) {
        connection.fadeOut();
      }
    }
  }

  connectParticles(sourceId, targetId) {
    const source = this._particleByGenomeId.get(sourceId);
    const target = this._particleByGenomeId.get(targetId);
    if (!source || !target) return;
    return this.particleNetwork.addConnection(source, target);
  }

  _createParticle(x, y, tint, genomeId) {
    const particle = new PIXI.Particle({
      texture: this.particleTexture,
      x,
      y,
      anchorX: 0.5,
      anchorY: 0.5,
      alpha: 1,
      scaleX: 0,
      scaleY: 0,
      tint,
    });
    particle.genomeId = genomeId;
    particle.baseTint = tint;

    // Physics state (kept on the particle for simplicity)
    particle.ox = x;
    particle.oy = y;
    particle.vx = 0;
    particle.vy = 0;
    particle._lx = x;
    particle._ly = y;

    // Register scale-up animation
    this._startScaleAnimation(genomeId, particle);

    return particle;
  }

  /**
   * Blink particle with given genomeId.
   * Glow tint: 0xffff66. Fades in then fades out.
   *
   * If called while a blink is already in progress for that particle, the old
   * blink is replaced and the new one starts from the current fade level.
   */
  blinkParticle(genomeId, fadeInSec = 0.25, keepSec = 0.5, fadeOutSec = 1.5) {
    const particle = this._particleByGenomeId.get(genomeId);
    if (!particle) return;

    const prev = this._blinksByGenomeId.get(genomeId);
    const mix = prev?.mix ?? 0;
    const baseTint = prev?.baseTint ?? particle.baseTint ?? particle.tint;

    const keep = Math.max(0, keepSec);
    const phase =
      mix >= 1 ? (keep > 0 ? 'hold' : 'out') : 'in';

    this._blinksByGenomeId.set(genomeId, {
      particle,
      baseTint,
      mix,
      phase,
      holdRemaining: phase === 'hold' ? keep : 0,
      fadeInSec: Math.max(0, fadeInSec),
      keepSec: keep,
      fadeOutSec: Math.max(0, fadeOutSec),
    });

    if (!this._blinkTickerAdded) {
      this._blinkTickerAdded = true;
      PIXI.Ticker.shared.add(this._onBlinkTick);
    }
  }

  _onBlinkTick = (ticker) => {
    const dt = ticker && typeof ticker.deltaTime === 'number' ? ticker.deltaTime / 60 : 1 / 60;

    for (const [genomeId, b] of this._blinksByGenomeId) {
      const { particle, baseTint } = b;
      if (!particle || particle.destroyed) {
        this._blinksByGenomeId.delete(genomeId);
        continue;
      }

      if (b.phase === 'in') {
        if (b.fadeInSec <= 0) {
          b.mix = 1;
          if (b.keepSec > 0) {
            b.phase = 'hold';
            b.holdRemaining = b.keepSec;
          } else {
            b.phase = 'out';
          }
        } else {
          b.mix = Math.min(1, b.mix + dt / b.fadeInSec);
          if (b.mix >= 1) {
            if (b.keepSec > 0) {
              b.phase = 'hold';
              b.holdRemaining = b.keepSec;
            } else {
              b.phase = 'out';
            }
          }
        }
      }

      if (b.phase === 'hold') {
        b.mix = 1;
        b.holdRemaining = Math.max(0, (b.holdRemaining ?? 0) - dt);
        if (b.holdRemaining <= 0) b.phase = 'out';
      }

      if (b.phase === 'out') {
        if (b.fadeOutSec <= 0) {
          b.mix = 0;
        } else {
          b.mix = Math.max(0, b.mix - dt / b.fadeOutSec);
        }
      }

      particle.tint = this._lerpTint(baseTint, BLINK_GLOW_TINT, b.mix);

      if (b.phase === 'out' && b.mix <= 0) {
        particle.tint = baseTint;
        this._blinksByGenomeId.delete(genomeId);
      }
    }

    if (this._blinksByGenomeId.size === 0 && this._blinkTickerAdded) {
      this._blinkTickerAdded = false;
      PIXI.Ticker.shared.remove(this._onBlinkTick);
    }
  };

  _lerpTint(a, b, t) {
    const tt = Math.max(0, Math.min(1, t));
    const ar = (a >> 16) & 0xff;
    const ag = (a >> 8) & 0xff;
    const ab = a & 0xff;
    const br = (b >> 16) & 0xff;
    const bg = (b >> 8) & 0xff;
    const bb = b & 0xff;
    const rr = Math.round(ar + (br - ar) * tt);
    const rg = Math.round(ag + (bg - ag) * tt);
    const rb = Math.round(ab + (bb - ab) * tt);
    return (rr << 16) | (rg << 8) | rb;
  }

  /**
   * Start scale-up animation for a newly created particle.
   * Particle starts at scale 0 and animates to scale 1 over PARTICLE_SCALE_UP_DURATION_MS.
   */
  _startScaleAnimation(genomeId, particle) {
    this._scaleAnimationsByGenomeId.set(genomeId, {
      particle,
      elapsed: 0,
      duration: PARTICLE_SCALE_UP_DURATION_MS / 1000, // Convert ms to seconds
    });

    if (!this._scaleTickerAdded) {
      this._scaleTickerAdded = true;
      PIXI.Ticker.shared.add(this._onScaleTick);
    }
  }

  _onScaleTick = (ticker) => {
    const dt = ticker && typeof ticker.deltaTime === 'number' ? ticker.deltaTime / 60 : 1 / 60;

    for (const [genomeId, anim] of this._scaleAnimationsByGenomeId) {
      const { particle } = anim;
      if (!particle || particle.destroyed) {
        this._scaleAnimationsByGenomeId.delete(genomeId);
        continue;
      }

      anim.elapsed += dt;

      if (anim.elapsed >= anim.duration) {
        // Animation complete - set to final scale
        particle.scaleX = 1;
        particle.scaleY = 1;
        this._scaleAnimationsByGenomeId.delete(genomeId);
      } else {
        // Interpolate from 0 to 1
        const progress = Math.min(1, anim.elapsed / anim.duration);
        particle.scaleX = progress;
        particle.scaleY = progress;
      }
    }

    if (this._scaleAnimationsByGenomeId.size === 0 && this._scaleTickerAdded) {
      this._scaleTickerAdded = false;
      PIXI.Ticker.shared.remove(this._onScaleTick);
    }
  };

  destroy(options) {
    this.layout?.destroy();
    if (this._blinkTickerAdded) {
      this._blinkTickerAdded = false;
      PIXI.Ticker.shared.remove(this._onBlinkTick);
    }
    if (this._scaleTickerAdded) {
      this._scaleTickerAdded = false;
      PIXI.Ticker.shared.remove(this._onScaleTick);
    }
    this._blinksByGenomeId.clear();
    this._scaleAnimationsByGenomeId.clear();
    super.destroy(options);
  }
}


export default GenerationPreview;