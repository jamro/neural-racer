import { Texture } from 'pixi.js';

/**
 * Creates a simple circle texture (fill + stroke) used by particles.
 * Tint is applied per-particle, so the texture itself is white.
 */
export function createCircleParticleTexture({
  radius,
  fillAlpha = 0.5,
  strokeAlpha = 1,
  strokeWidth = radius / 2,
} = {}) {
  const r = radius ?? 5;
  const size = r * 2 + r; // extra space for stroke

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  // fill
  ctx.fillStyle = `rgba(255, 255, 255, ${fillAlpha})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // stroke
  ctx.strokeStyle = `rgba(255, 255, 255, ${strokeAlpha})`;
  ctx.lineWidth = strokeWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  return Texture.from(canvas);
}

