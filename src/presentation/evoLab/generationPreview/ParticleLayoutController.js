import * as PIXI from 'pixi.js';

const MIN_DIST_EPS2 = 1e-6; // avoid division by zero

function getDeltaSeconds(ticker) {
  return ticker && typeof ticker.deltaTime === 'number' ? ticker.deltaTime / 60 : 1 / 60;
}

function rememberPositions(particles) {
  for (const p of particles) {
    p._lx = p.x;
    p._ly = p.y;
  }
}

function didParticlesMoveExternally(particles, moveEpsilon) {
  for (const p of particles) {
    const dx = p.x - (p._lx ?? p.x);
    const dy = p.y - (p._ly ?? p.y);
    if (Math.abs(dx) + Math.abs(dy) > moveEpsilon) return true;
  }
  return false;
}

/**
 * Visits nearby particle pairs using a uniform grid so work stays ~linear.
 * Calls `fn(a, b)` once for each nearby pair (a before b).
 * Note: cellSize should be >= maximum expected interaction distance for correctness.
 */
function visitNeighborPairs(particles, cellSize, fn, stopOnTrue = false) {
  if (particles.length <= 1) return false;

  const grid = new Map();
  const cellKey = (cx, cy) => `${cx},${cy}`;

  for (let i = 0; i < particles.length; i++) {
    const a = particles[i];
    const cx = Math.floor(a.x / cellSize);
    const cy = Math.floor(a.y / cellSize);

    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const bucket = grid.get(cellKey(cx + ox, cy + oy));
        if (!bucket) continue;
        for (const j of bucket) {
          const b = particles[j];
          if (fn(a, b) && stopOnTrue) return true;
        }
      }
    }

    const selfKey = cellKey(cx, cy);
    const selfBucket = grid.get(selfKey);
    if (selfBucket) selfBucket.push(i);
    else grid.set(selfKey, [i]);
  }

  return false;
}

function getEffectiveRadius(particle, baseRadius) {
  const scale = particle.scaleX ?? 1;
  return baseRadius * scale;
}

function getMinCenterDistance(particleA, particleB, baseRadius, minEdgeGap) {
  const radiusA = getEffectiveRadius(particleA, baseRadius);
  const radiusB = getEffectiveRadius(particleB, baseRadius);
  return radiusA + radiusB + minEdgeGap;
}

function hasAnyOverlap(particles, baseRadius, minEdgeGap) {
  // Use a conservative cell size based on maximum possible distance
  const maxCellSize = baseRadius * 2 + minEdgeGap;
  return visitNeighborPairs(
    particles,
    maxCellSize,
    (a, b) => {
      const minDist = getMinCenterDistance(a, b, baseRadius, minEdgeGap);
      const minD2 = minDist * minDist;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      return dx * dx + dy * dy < minD2;
    },
    true
  );
}

function clampToBounds(particles, bounds, { zeroVelocityOnHit } = {}) {
  const { halfW, halfL, leftBound, rightBound } = bounds;
  const minX = leftBound !== undefined ? leftBound : -halfL;
  const maxX = rightBound !== undefined ? rightBound : halfL;
  for (const p of particles) {
    let hit = false;

    if (p.y < -halfW) {
      p.y = -halfW;
      hit = true;
    } else if (p.y > halfW) {
      p.y = halfW;
      hit = true;
    }

    if (p.x < minX) {
      p.x = minX;
      hit = true;
    } else if (p.x > maxX) {
      p.x = maxX;
      hit = true;
    }

    if (zeroVelocityOnHit && hit) {
      p.vx = 0;
      p.vy = 0;
    }
  }
}

function applySpringToOrigin(particles, springStrength, dt) {
  for (const p of particles) {
    p.vx += (p.ox - p.x) * springStrength * dt;
    p.vy += (p.oy - p.y) * springStrength * dt;
  }
}

function integrate(particles, { damping, maxSpeed }, dt) {
  for (const p of particles) {
    p.vx *= damping;
    p.vy *= damping;

    const speed = Math.hypot(p.vx, p.vy);
    if (speed > maxSpeed) {
      const s = maxSpeed / speed;
      p.vx *= s;
      p.vy *= s;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

/**
 * One positional overlap resolution pass using a more stable method.
 * Returns true if any particle moved.
 * Uses mass-based separation for better convergence in dense scenarios.
 */
function solveOverlapsOnce(particles, baseRadius, minEdgeGap) {
  // Use a conservative cell size based on maximum possible distance
  const maxCellSize = baseRadius * 2 + minEdgeGap;
  let movedAny = false;
  
  // Store accumulated displacement per particle for better stability
  const displacements = new Map();
  for (let i = 0; i < particles.length; i++) {
    displacements.set(particles[i], { x: 0, y: 0, count: 0 });
  }

  visitNeighborPairs(particles, maxCellSize, (a, b) => {
    const minCenterDistance = getMinCenterDistance(a, b, baseRadius, minEdgeGap);
    const minD2 = minCenterDistance * minCenterDistance;
    
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let d2 = dx * dx + dy * dy;

    if (d2 < MIN_DIST_EPS2) {
      // For overlapping particles at same position, use a more significant separation
      const angle = Math.random() * Math.PI * 2;
      dx = Math.cos(angle) * 0.1;
      dy = Math.sin(angle) * 0.1;
      d2 = dx * dx + dy * dy;
    }

    if (d2 >= minD2) return false;

    const d = Math.sqrt(d2);
    const nx = dx / d;
    const ny = dy / d;
    const overlap = minCenterDistance - d;
    
    // Use mass-based separation (both particles move proportionally)
    // For dense clusters, use a slightly more aggressive correction factor
    const correctionFactor = overlap > minCenterDistance * 0.5 ? 0.6 : 0.5;
    const corr = overlap * correctionFactor;
    
    // Accumulate displacements instead of applying immediately
    const dispA = displacements.get(a);
    const dispB = displacements.get(b);
    dispA.x -= nx * corr;
    dispA.y -= ny * corr;
    dispA.count++;
    dispB.x += nx * corr;
    dispB.y += ny * corr;
    dispB.count++;

    // Dampen relative velocity along separation axis more aggressively to prevent oscillation
    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const relAlongN = rvx * nx + rvy * ny;
    if (relAlongN < 0) {
      // More aggressive damping to prevent oscillation
      const impulse = relAlongN * 0.7;
      a.vx += nx * impulse;
      a.vy += ny * impulse;
      b.vx -= nx * impulse;
      b.vy -= ny * impulse;
    }

    movedAny = true;
    return false;
  });

  // Apply accumulated displacements
  // For particles with multiple overlaps, use a weighted average to prevent overcorrection
  for (const [particle, disp] of displacements) {
    if (disp.count > 0) {
      // Use inverse square root weighting: reduces correction when many overlaps, but not as aggressively as simple average
      // This helps convergence in dense clusters while preventing oscillation
      const weight = disp.count > 1 ? 1 / Math.sqrt(disp.count) : 1;
      particle.x += disp.x * weight;
      particle.y += disp.y * weight;
    }
  }

  return movedAny;
}

/**
 * Keeps particles near their original positions (spring) while enforcing
 * a minimum distance via an iterative positional overlap solver.
 *
 * - Call `invalidate()` whenever you move particles externally.
 * - The controller also auto-detects external movement.
 * - Uses per-particle scale to calculate effective sizes for physics.
 */
export class ParticleLayoutController {
  constructor({
    particles,
    baseRadius,
    minEdgeGap,
    bounds, // { halfW, halfL }
    settleFramesOnDisturb = 180,
    moveEpsilon = 0.05,
    springStrength = 6,
    damping = 0.85,
    maxSpeed = 600,
    positionSolveIterations = 10, // Increased from 6 for better convergence in dense states
  }) {
    this.particles = particles;
    this.baseRadius = baseRadius;
    this.minEdgeGap = minEdgeGap;
    this.bounds = bounds;

    this.settleFramesOnDisturb = settleFramesOnDisturb;
    this.moveEpsilon = moveEpsilon;

    this.springStrength = springStrength;
    this.damping = damping;
    this.maxSpeed = maxSpeed;
    this.positionSolveIterations = positionSolveIterations;

    this._tickerAdded = false;
    this._settleFramesRemaining = 0;
  }

  start() {
    if (this._tickerAdded) return;
    this._tickerAdded = true;
    PIXI.Ticker.shared.add(this._onTick);
  }

  stop() {
    if (!this._tickerAdded) return;
    this._tickerAdded = false;
    PIXI.Ticker.shared.remove(this._onTick);
  }

  destroy() {
    this.stop();
  }

  invalidate(frames = this.settleFramesOnDisturb) {
    const wasSettling = this._settleFramesRemaining > 0;
    const hadOverlaps = hasAnyOverlap(this.particles, this.baseRadius, this.minEdgeGap);
    const previousFrames = this._settleFramesRemaining;
    this._settleFramesRemaining = Math.max(this._settleFramesRemaining, frames);
    
    // Clear velocities when starting a new settle period with overlaps to prevent oscillation
    if (hadOverlaps && !wasSettling && previousFrames === 0) {
      for (const p of this.particles) {
        p.vx *= 0.2;
        p.vy *= 0.2;
      }
    }
  }

  _onTick = (ticker) => {
    const dt = getDeltaSeconds(ticker);

    // Trigger settling when needed.
    if (didParticlesMoveExternally(this.particles, this.moveEpsilon)) {
      this.invalidate();
    }
    
    // Check for overlaps and trigger settling if needed
    if (this._settleFramesRemaining === 0 && hasAnyOverlap(this.particles, this.baseRadius, this.minEdgeGap)) {
      // Clear velocities more aggressively when overlaps are detected during idle state
      for (const p of this.particles) {
        p.vx *= 0.1;
        p.vy *= 0.1;
      }
      this.invalidate();
    }

    // Run a few frames of settling (spring + solve overlaps).
    if (this._settleFramesRemaining > 0) this._settle(dt);

    rememberPositions(this.particles);
  };

  _settle(dt) {
    const particles = this.particles;
    if (particles.length <= 1) {
      this._settleFramesRemaining = 0;
      return;
    }

    // Check if we have overlaps before settling
    const hadOverlaps = hasAnyOverlap(particles, this.baseRadius, this.minEdgeGap);
    
    // 1) spring towards origin (but reduce spring strength when resolving overlaps to prevent oscillation)
    const effectiveSpringStrength = hadOverlaps ? this.springStrength * 0.5 : this.springStrength;
    applySpringToOrigin(particles, effectiveSpringStrength, dt);

    // 2) integrate velocities -> positions
    const effectiveDamping = hadOverlaps ? this.damping * 0.95 : this.damping; // More damping when resolving overlaps
    integrate(
      particles,
      { damping: effectiveDamping, maxSpeed: this.maxSpeed },
      dt
    );

    // 3) solve overlaps (dense-group safe) + clamp
    // Uses per-particle scale to calculate effective collision sizes
    // Use more iterations for dense initial states
    const iterations = hadOverlaps ? this.positionSolveIterations * 2 : this.positionSolveIterations;
    let overlapResolved = false;
    
    for (let i = 0; i < iterations; i++) {
      const moved = solveOverlapsOnce(particles, this.baseRadius, this.minEdgeGap);
      clampToBounds(particles, this.bounds);
      
      // Check if overlaps are resolved
      if (!moved && !hasAnyOverlap(particles, this.baseRadius, this.minEdgeGap)) {
        overlapResolved = true;
        break;
      }
    }
    clampToBounds(particles, this.bounds, { zeroVelocityOnHit: true });

    // If overlaps are resolved and particles are stable, reduce remaining frames
    // Otherwise, keep settling to ensure stability
    if (overlapResolved) {
      // Check if particles are stable (low velocity)
      let maxSpeed = 0;
      for (const p of particles) {
        const speed = Math.hypot(p.vx, p.vy);
        if (speed > maxSpeed) maxSpeed = speed;
      }
      
      // If velocities are low and no overlaps, settle faster
      if (maxSpeed < 1.0 && !hasAnyOverlap(particles, this.baseRadius, this.minEdgeGap)) {
        this._settleFramesRemaining = Math.max(0, this._settleFramesRemaining - 2);
      } else {
        this._settleFramesRemaining--;
      }
    } else {
      // Still have overlaps, continue settling
      this._settleFramesRemaining--;
    }
  }
}

