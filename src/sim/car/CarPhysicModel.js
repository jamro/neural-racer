class CarPhysicModel {
  constructor() {
    this.length = 4;
    this.width = 2;
    this.x = 0;
    this.y = 0;
    this.direction = 0; // yaw (psi)

    this.maxSpeed = 55; // m/s, 200 km/h

    // Public speed (compatibility) = forward speed in body frame
    this.speed = 0;

    // inputs
    this.throttleValue = 0;
    this.brakeValue = 0;
    this.turnValue = 0;

    // --- parameters
    this.mass = 1200;
    this.g = 9.81;

    // bicycle geometry
    this.lf = 1.2;
    this.lr = 1.4;
    this.Iz = 1500;

    // engine / braking
    this.enginePower = 147000;  // W
    this.driveForceMax = 6000;  // N
    this.brakeForceMax = 20000; // N

    // resistances (applied to body, not tires)
    this.c_rr = 0.015;
    this.rhoCdA = 0.75;

    // steering (wheel angle)
    this.delta = 0;
    this.deltaMax = 25 * Math.PI / 180;
    this.steerRate = 3.0; // rad/s
    this.turn_v0 = 0.5;  // m/s – below practically no steering
    this.turn_v1 = 4.0;  // m/s – from this speed full steering

    // tires / grip
    this.mu = 1.05;
    this.Cf = 90000;
    this.Cr = 100000;

    // AWD split (front ratio)
    this.awdFrontRatio = 0.5;

    // internal dynamic state (body frame)
    this.vx = 0;       // forward velocity
    this.vy = 0;       // lateral velocity
    this.yawRate = 0;  // r

    // stability helpers
    this.yawRateMax = 4.0; // rad/s clamp

    // --- slip diagnostics (raw, before normalization)
    this.slipRatio = 0;       // vy / (|vx| + eps)   (dimensionless)
    this.slipAngleFront = 0;  // alpha_f in radians
    this.slipAngleRear = 0;   // alpha_r in radians
  }

  setPosition(x, y, direction) {
    this.x = x;
    this.y = y;
    this.direction = direction;
  }

  throttle(v) {
    v = Math.max(Math.min(v, 1), 0);
    this.throttleValue = v;
    this.brakeValue = 0;
  }

  breakCar(v) {
    v = Math.max(Math.min(v, 1), 0);
    this.brakeValue = v;
    this.throttleValue = 0;
  }

  turn(v) {
    v = Math.max(Math.min(v, 1), -1);
    this.turnValue = v;
  }

  updateStep(delta) {
    // --- 1) Steering (wheel angle) with rate limit
    const targetDelta = this.turnValue * this.deltaMax;
    const maxDeltaStep = this.steerRate * delta;
    this.delta += Math.max(Math.min(targetDelta - this.delta, maxDeltaStep), -maxDeltaStep);

    // --- 2) Local velocities (body frame)
    // Avoid division/atan instabilities at ultra-low speeds
    const vx = Math.max(this.vx, 0.5);
    const vy = this.vy;
    const r  = this.yawRate;

    // --- 3) Normal loads (static split)
    const wheelbase = this.lf + this.lr;
    const FzF = this.mass * this.g * (this.lr / wheelbase);
    const FzR = this.mass * this.g * (this.lf / wheelbase);

    // --- 4) Longitudinal "wanted" forces (drive + brake)
    // Drive: power limited at high speed, traction/gear limited at low speed
    const vForPower = Math.max(vx, 1.0);
    const FxDrivePower = (this.enginePower * this.throttleValue) / vForPower;
    const FxDriveWanted = Math.min(FxDrivePower, this.driveForceMax * this.throttleValue);

    // Brake: requested braking force
    const FxBrakeWanted = this.brakeForceMax * this.brakeValue;

    // Resistances (body-level)
    const FxRolling = this.c_rr * this.mass * this.g; // ~const
    const FxAero    = this.rhoCdA * vx * vx;          // ~v^2
    const FxResist  = FxRolling + FxAero;

    // Split drive across axles (AWD)
    let FxF = FxDriveWanted * this.awdFrontRatio;
    let FxR = FxDriveWanted * (1 - this.awdFrontRatio);

    // Split braking across axles (front biased)
    FxF -= FxBrakeWanted * 0.6;
    FxR -= FxBrakeWanted * 0.4;

    // --- 5) Slip angles
    const alphaF = this.delta - Math.atan2(vy + this.lf * r, vx);
    const alphaR = -Math.atan2(vy - this.lr * r, vx);
    this.slipAngleFront = alphaF;
    this.slipAngleRear = alphaR;

    // --- 6) Lateral forces (smooth saturation)
    // Fy = FyMax * tanh((C*alpha)/FyMax) -> avoids hard clamp discontinuity
    const FyFmax = this.mu * FzF;
    const FyRmax = this.mu * FzR;

    let FyF = FyFmax * Math.tanh((this.Cf * alphaF) / (FyFmax + 1e-9));
    let FyR = FyRmax * Math.tanh((this.Cr * alphaR) / (FyRmax + 1e-9));

    // --- 7) Combined slip limit per axle (friction circle)
    ({ Fx: FxF, Fy: FyF } = this._applyFrictionCircle(FxF, FyF, FyFmax));
    ({ Fx: FxR, Fy: FyR } = this._applyFrictionCircle(FxR, FyR, FyRmax));

    // --- 8) Dynamics (body frame)
    // m*(dvx/dt - r*vy) = FxF + FxR - FxResist
    // m*(dvy/dt + r*vx) = FyF + FyR
    // Iz*(dr/dt) = lf*FyF - lr*FyR
    const ax = ((FxF + FxR) - FxResist) / this.mass + r * vy;
    const ay = (FyF + FyR) / this.mass - r * vx;
    const rr = (this.lf * FyF - this.lr * FyR) / this.Iz;

    // integrate
    this.vx += ax * delta;
    this.vy += ay * delta;
    this.yawRate += rr * delta;

    // calculate slip ratio
    const eps = 1e-6;
    this.slipRatio = this.vy / (Math.abs(this.vx) + eps);
    if (this.vx < 0.3) this.slipRatio = 0;

    // prevent turning in place at low/zero speed
    let t = (this.vx - this.turn_v0) / (this.turn_v1 - this.turn_v0);
    t = Math.max(0, Math.min(t, 1));
    // smoothstep: 3t^2 - 2t^3
    const eff = t * t * (3 - 2 * t);

    // scale yawRate down when speed is low
    this.yawRate *= eff;

    // no reverse (keep your old behavior) but avoid hard energy spikes
    if (this.vx < 0) {
      this.vx = 0;
      // when stopped, rapidly damp lateral motion
      this.vy *= 0.5;
      this.yawRate *= 0.5;
    }

    // clamp forward speed
    this.vx = Math.min(this.vx, this.maxSpeed);

    // clamp yawRate (stability)
    this.yawRate = Math.max(Math.min(this.yawRate, this.yawRateMax), -this.yawRateMax);

    // integrate yaw
    this.direction += this.yawRate * delta;

    // integrate world position from body velocities
    const c = Math.cos(this.direction);
    const s = Math.sin(this.direction);
    this.x += (this.vx * c - this.vy * s) * delta;
    this.y += (this.vx * s + this.vy * c) * delta;

    // expose compatibility speed
    this.speed = this.vx;

    // --- 9) Extra damping near standstill to avoid endless micro-sliding
    if (this.vx < 1.0) {
      const k = this.vx / 1.0; // 0..1
      // more damping when slower
      const dampVy = 0.6 + 0.4 * k;      // 0.6..1.0 multiplier
      const dampR  = 0.6 + 0.4 * k;
      this.vy *= dampVy;
      this.yawRate *= dampR;
    }
  }

  _applyFrictionCircle(Fx, Fy, Fmax) {
    // Ensure sqrt(Fx^2 + Fy^2) <= Fmax
    const mag = Math.hypot(Fx, Fy);
    if (mag > Fmax) {
      const s = Fmax / (mag + 1e-9);
      Fx *= s;
      Fy *= s;
    }
    return { Fx, Fy };
  }
}

export default CarPhysicModel;