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

function hasAnyOverlap(particles, minCenterDistance) {
  const minD2 = minCenterDistance * minCenterDistance;
  return visitNeighborPairs(
    particles,
    minCenterDistance,
    (a, b) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      return dx * dx + dy * dy < minD2;
    },
    true
  );
}

function clampToBounds(particles, bounds, { zeroVelocityOnHit } = {}) {
  const { halfW, halfL } = bounds;
  for (const p of particles) {
    let hit = false;

    if (p.y < -halfW) {
      p.y = -halfW;
      hit = true;
    } else if (p.y > halfW) {
      p.y = halfW;
      hit = true;
    }

    if (p.x < -halfL) {
      p.x = -halfL;
      hit = true;
    } else if (p.x > halfL) {
      p.x = halfL;
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
 * One positional overlap resolution pass.
 * Returns true if any particle moved.
 */
function solveOverlapsOnce(particles, minCenterDistance) {
  const minD2 = minCenterDistance * minCenterDistance;
  let movedAny = false;

  visitNeighborPairs(particles, minCenterDistance, (a, b) => {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let d2 = dx * dx + dy * dy;

    if (d2 < MIN_DIST_EPS2) {
      dx = (Math.random() * 2 - 1) * 0.001;
      dy = (Math.random() * 2 - 1) * 0.001;
      d2 = dx * dx + dy * dy;
    }

    if (d2 >= minD2) return false;

    const d = Math.sqrt(d2);
    const nx = dx / d;
    const ny = dy / d;
    const corr = (minCenterDistance - d) / 2;

    a.x -= nx * corr;
    a.y -= ny * corr;
    b.x += nx * corr;
    b.y += ny * corr;

    // Dampen relative velocity along separation axis (prevents re-collisions).
    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const relAlongN = rvx * nx + rvy * ny;
    if (relAlongN < 0) {
      const impulse = relAlongN * 0.5;
      a.vx += nx * impulse;
      a.vy += ny * impulse;
      b.vx -= nx * impulse;
      b.vy -= ny * impulse;
    }

    movedAny = true;
    return false;
  });

  return movedAny;
}

/**
 * Keeps particles near their original positions (spring) while enforcing
 * a minimum distance via an iterative positional overlap solver.
 *
 * - Call `invalidate()` whenever you move particles externally.
 * - The controller also auto-detects external movement.
 */
export class ParticleLayoutController {
  constructor({
    particles,
    minCenterDistance,
    bounds, // { halfW, halfL }
    settleFramesOnDisturb = 180,
    moveEpsilon = 0.05,
    springStrength = 6,
    damping = 0.85,
    maxSpeed = 600,
    positionSolveIterations = 6,
  }) {
    this.particles = particles;
    this.minCenterDistance = minCenterDistance;
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
    this._settleFramesRemaining = Math.max(this._settleFramesRemaining, frames);
  }

  _onTick = (ticker) => {
    const dt = getDeltaSeconds(ticker);

    // Trigger settling when needed.
    if (didParticlesMoveExternally(this.particles, this.moveEpsilon)) this.invalidate();
    if (this._settleFramesRemaining === 0 && hasAnyOverlap(this.particles, this.minCenterDistance)) {
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

    // 1) spring towards origin
    applySpringToOrigin(particles, this.springStrength, dt);

    // 2) integrate velocities -> positions
    integrate(
      particles,
      { damping: this.damping, maxSpeed: this.maxSpeed },
      dt
    );

    // 3) solve overlaps (dense-group safe) + clamp
    for (let i = 0; i < this.positionSolveIterations; i++) {
      const moved = solveOverlapsOnce(particles, this.minCenterDistance);
      clampToBounds(particles, this.bounds);
      if (!moved) break;
    }
    clampToBounds(particles, this.bounds, { zeroVelocityOnHit: true });

    this._settleFramesRemaining--;
  }
}

