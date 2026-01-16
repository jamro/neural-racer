import { ParticleContainer, Particle } from 'pixi.js';
import { getDustTexture } from '../../../resources/Assets';


const DUST_COLORS = [
  0xa48955,
  0xf1b89a,
  0xf6d3c5,
  0xf6d3c5,
  0xf6d3c5
]

class DustContainer extends ParticleContainer {
  constructor() {
    super({
      dynamicProperties: {
        position: true,
        scale: true,
        color: true,
        rotation: true,
      },
    });
    this.dustTexture = getDustTexture();
    this.particleWidth = this.dustTexture.width;
    this.particleHeight = this.dustTexture.height;
    this.particles = [];
  }

  addDust(x, y, direction, carLength, carWidth, amount) {
    for(let i = 0; i < amount*amount*10; i++) {
      this.createDustParticleSet(x, y, direction, carLength, carWidth, amount*amount);
    }
  }

  createDustParticleSet(x, y, direction, carLength, carWidth, amount) {
    const halfLength = (0.8 + 0.5*Math.random())*carLength / 2;
    const halfWidth = 0.7*carWidth / 2;
      
    // forward direction
    const fx = Math.cos(direction);
    const fy = Math.sin(direction);
      
    // right perpendicular
    const rx = -fy;
    const ry = fx;
      
    // back center of the car
    const backCenterX = x - fx * halfLength;
    const backCenterY = y - fy * halfLength;
      
    // back left wheel
    const leftWheelX  = backCenterX - rx * halfWidth;
    const leftWheelY  = backCenterY - ry * halfWidth;
      
    // back right wheel
    const rightWheelX = backCenterX + rx * halfWidth;
    const rightWheelY = backCenterY + ry * halfWidth;

    const vx = -fx * Math.random() * 1 * amount;
    const vy = -fy * Math.random() * 1 * amount;

    this.createDustParticle(leftWheelX, leftWheelY, vx, vy, amount);
    this.createDustParticle(rightWheelX, rightWheelY, vx, vy, amount);
  }

  createDustParticle(x, y, vx, vy, amount) {
    let particle = new Particle({
      texture: this.dustTexture,
      x: x + Math.random() * 4 - 2,
      y: y + Math.random() * 4 - 2,
      anchorX: 0.5,
      anchorY: 0.5,
      alpha: 0.2 + Math.random() * 0.9,
      scaleX: 0.1 + Math.random() * (0.6 + 0.3*amount),
      scaleY: 0.1 + Math.random() * (0.6 + 0.3*amount),
      rotation: Math.random() * 2 * Math.PI,
      tint: DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)],
    });
    particle.growSpeed = 0.005 + Math.random() * (0.01 + 0.01*amount);
    particle.fadeSpeed = 0.003 + Math.random() * 0.003;
    particle.vx = vx;
    particle.vy = vy;
    this.addParticle(particle);
    this.particles.push(particle);
  }

  update() {
    for (const particle of this.particles) {
      particle.alpha -= particle.fadeSpeed;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.scaleX += particle.growSpeed;
      particle.scaleY += particle.growSpeed;
      if(particle.alpha <= 0) {
        this.removeParticle(particle);
        this.particles.splice(this.particles.indexOf(particle), 1);
      }
    }
  }

  removeAllParticles() {
    for (const particle of this.particles) {
      this.removeParticle(particle);
    }
    this.particles = [];
  }
} 


export default DustContainer;
