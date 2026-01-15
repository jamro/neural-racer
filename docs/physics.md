# Physics Model — Overview & Design Rationale

This document explains **how the car physics are modeled** and **what forces and states are simulated**.

The goal of the physics model is **not perfect realism**, but **controlled realism**:
- rich enough to expose meaningful driving skills (braking, cornering, drift),
- stable under noisy neural control,
- predictable enough for [evolution](evolution.md) to make progress.

The physics model provides inputs to the [neural network controller](neural_net.md), including yaw rate, slip ratio, and speed.

---

## What This Physics Model Is

The system uses a **2D dynamic bicycle model** with longitudinal and lateral dynamics, slip, and traction limits.

Key properties:
- Continuous-time dynamics integrated per simulation step.
- Explicit modeling of yaw rate, slip angles, and traction.
- No reverse gear, simplified drivetrain.
- Tuned to be **learnable**, not just physically plausible.

This balance is critical: overly simple physics leads to trivial solutions; overly complex physics makes the evolution process long and tedious.

---

## Coordinate Frames

### World Frame
- Position: `x, y` (meters)
- Orientation: `direction` (yaw, radians)

Used for:
- rendering,
- collision checks,
- radar ray-casting.

---

### Body Frame
- `vx`: forward velocity
- `vy`: lateral velocity
- `r`: yaw rate

**Why body frame**
- Forces and slip are naturally defined in vehicle coordinates.
- Makes tire models and yaw dynamics straightforward.
- Decouples motion dynamics from world orientation.

World motion is obtained by rotating body velocities by `direction`.

---

## Vehicle Model (`CarPhysicModel`)

### Why a Bicycle Model
- Captures essential vehicle dynamics with minimal state:
  - yaw inertia,
  - understeer / oversteer,
  - load transfer effects (implicitly).
- Much cheaper than a full 4-wheel model.
- Well-understood and stable under numerical integration.

Critically, the bicycle model introduces **failure modes** (plowing, spinning) that the NN must learn to avoid or exploit.

---

### Geometry & Mass Properties
- Length: `4.0 m`, Width: `2.0 m`
- Axle distances: `lf = 1.2 m`, `lr = 1.4 m`
- Mass: `1200 kg`
- Yaw inertia: `Iz = 1500 kg·m²`

**Why these matter**
- Yaw inertia controls how quickly the car can rotate.
- Axle split biases natural understeer/oversteer behavior.
- These parameters directly shape what "good driving" means.

---

### Speed & Limits
- Max speed: `66 m/s` (~240 km/h)
- Yaw rate clamp: `±4 rad/s`

**Why clamp**
- Prevents numerical explosions after extreme mutations.
- Keeps control space bounded and evolvable.
- Avoids unrealistic spin-in-place behaviors.

---

## Control Inputs

### Throttle & Brake
- `throttleValue ∈ [0,1]`
- `brakeValue ∈ [0,1]`

Separated inputs instead of a single signed value:
- simplifies physical reasoning,
- allows asymmetric behavior (strong braking vs gentle throttle),
- aligns with NN output semantics.

---

### Steering
- `turnValue ∈ [-1,1]`
- Converted to steering angle `delta`
- Rate-limited (`steerRate = 3 rad/s`)
- Max angle `±25°`

**Why rate limiting**
- Prevents oscillatory "twitch steering".
- Forces anticipation instead of reactive zig-zagging.
- Makes previous-control inputs meaningful.

---

## Longitudinal Forces

### Engine Model
- Power-limited at high speed: `F = P / v`
- Force-limited at low speed: `driveForceMax`

**Why power-limited**
- Prevents unrealistic acceleration at high speed.
- Encourages early braking before corners.
- Makes speed planning non-trivial.

---

### Braking
- Max force: `20000 N`
- Front-biased (60/40)

**Why front bias**
- More stable braking behavior.
- Reduces spin under hard braking.
- Easier for evolution to exploit safely.

---

### Resistances
- Rolling resistance (`c_rr`)
- Aerodynamic drag (`~v²`)

**Why include them**
- Prevents infinite coasting.
- Makes speed costly.
- Encourages throttle discipline.

---

## Lateral Forces & Grip

### Slip Angles
- Front: `alphaF`
- Rear: `alphaR`
- Derived from bicycle kinematics.

Slip angles are **central to learning cornering**:
- small angles → grip,
- large angles → saturation / drift.

---

### Tire Model
- Smooth saturation: `Fy = FyMax * tanh(C * alpha / FyMax)`
- Cornering stiffness:
- `Cf = 90,000`
- `Cr = 100,000`
- Friction coefficient: `mu = 1.05`

**Why smooth saturation**
- No discontinuities → stable evolution.
- Allows controlled drift.
- Avoids binary grip/no-grip regimes.

---

### Friction Circle
- Couples longitudinal (`Fx`) and lateral (`Fy`) forces per axle.

**Why**
- Prevents impossible behaviors (full brake + full corner).
- Forces trade-offs between braking and turning.
- Encourages anticipatory braking before sharp corners.

This is one of the **most important learning signals** in the system.

---

## Dynamics Integration (Per Step)

Each simulation step follows a fixed pipeline:

1. **Steering update**
 - Rate-limited toward target.
2. **Force computation**
 - Engine, brakes, resistance, lateral forces.
3. **Friction circle**
 - Clamp combined forces.
4. **State integration**
 - Update `vx`, `vy`, `yawRate`.
5. **Slip diagnostics**
 - Compute slip ratio and traction indicators.
6. **Low-speed steering fade**
 - Smoothly disable turning near standstill.
7. **Stability clamps**
 - No reverse, yaw-rate limit, extra damping.
8. **World integration**
 - Update position and orientation.

**Why this order**
- Mirrors physical causality.
- Keeps numerical errors bounded.
- Makes each effect interpretable in isolation.

---

## Slip & Traction Diagnostics

### Slip Ratio
- Exposed to the [neural network](neural_net.md) as input (Input 16).

**Why**
- Allows the NN to distinguish:
- controlled drift,
- incipient spin,
- full loss of control.
- Enables learning of drift-capable policies.

This is a *diagnostic signal*, not a control hack.

---

## Stability Aids (Intentional Simplifications)

These are **not realism cheats**, but **learning stabilizers**:

Steering fade at low speed:
- prevents pivoting in place,
- avoids degenerate solutions.

Extra damping near standstill:
- kills numerical jitter.

No reverse gear:
- simplifies policy space,
- avoids oscillation exploits.

Without these, evolution frequently converged to pathological behaviors.

---

## Car Wrapper (`CarObject`)

The wrapper connects physics to the environment and evolution:

- Owns the physics model.
- Handles radar sensing.
- Manages collisions, checkpoints, finish logic.
- Computes progress metrics for fitness.
- Tracks average/top speed for scoring.

**Why separate wrapper**
- Physics stays pure and reusable.
- Evolution logic stays decoupled.
- Easier debugging and visualization.

---

## Track Interaction

### Sensing
- `rayIntersectionsMinLength` provides radar distances.

### Collisions
- Oriented bounding box vs walls.
- Checkpoint gate crossing.

**Why geometry-based**
- Track shapes are arbitrary.
- No grid or spline assumptions.
- Works uniformly across all tracks.

---

## Key Tunables (Why They Matter)

- `deltaMax`, `steerRate` → steering smoothness & anticipation.
- `enginePower`, `driveForceMax` → speed vs control trade-off.
- `mu`, `Cf`, `Cr` → grip envelope and drift difficulty.
- `yawRateMax` → prevents catastrophic spins.

These parameters define **what kind of driver evolution will favor**.

---

## Summary

This physics model is designed to:
- expose meaningful driving challenges,
- reward anticipation over reaction,
- allow drift but punish recklessness,
- remain stable under noisy neural control.

It is **intentionally imperfect**—because evolution learns best when the environment is challenging but predictable.

The result is a system where:
- good driving *emerges*,
- bad mutations are survivable,
- and generalization is possible across tracks.

For practical insights on physics tuning and what worked during development, see [learnings.md](learnings.md).