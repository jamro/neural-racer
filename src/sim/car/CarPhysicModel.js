class CarPhysicModel {
  constructor() {
    this.length = 4;
    this.width = 2;
    this.x = 0;
    this.y = 0;
    this.direction = 0;

    this.maxSpeed = 55; // m/s, 200 km/h
    this.speed = 0;

    // steering
    this.throttleValue = 0;
    this.brakeValue = 0;
    this.turnValue = 0;

    // physics parameters (tune)
    this.mass = 1200;      // kg
    this.g = 9.81;

    // engine / braking
    this.enginePower = 147000; // W (ok. 200hp)
    this.driveForceMax = 6000; // N limit traction / gear (launch)
    this.brakeForceMax = 20000; // N

    // resistances
    this.c_rr = 0.015;     // rolling resistance coefficient
    this.rhoCdA = 0.75;    // "0.5*rho*CdA" simplified to one parameter (tune)

    // steering
    this.maxTurnRate = Math.PI * 0.5;
    this.turnRate = 0;
    this.steerRate = 3.0; // rad/s - limit steering speed
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
    // --- steering with rate limit 
    const targetTurnRate = this.turnValue * this.maxTurnRate;
    const maxDelta = this.steerRate * delta;
    this.turnRate += Math.max(Math.min(targetTurnRate - this.turnRate, maxDelta), -maxDelta);

    // --- longitudinal forces
    const v = Math.max(this.speed, 0);

    // engine force: limited by power at higher speed and by traction at low speed
    // F = P / v, but avoid infinity at v~0 (F - Force, P - Power, v - velocity)
    const vForPower = Math.max(v, 1.0);
    const driveForcePowerLimited = (this.enginePower * this.throttleValue) / vForPower;
    const driveForce = Math.min(driveForcePowerLimited, this.driveForceMax * this.throttleValue);

    // braking force (simple)
    const brakeForce = this.brakeForceMax * this.brakeValue;

    // resistances
    const rolling = this.c_rr * this.mass * this.g;     // ~ constant
    const aero = this.rhoCdA * v * v;                   // ~ v^2

    // net force along forward direction
    let F = driveForce - brakeForce - rolling - aero;

    // don’t allow braking/drag to push car backwards
    if (v < 0.2 && F < 0) F = 0;

    const a = F / this.mass; // m/s^2

    // integrate speed
    this.speed += a * delta;
    this.speed = Math.max(Math.min(this.speed, this.maxSpeed), 0);

    // steering effectiveness vs speed
    const turn_v0 = 0.5;  // m/s – below practically no steering
    const turn_v1 = 4.0;  // m/s – from this speed full steering
    let t = (this.speed - turn_v0) / (turn_v1 - turn_v0);
    t = Math.max(0, Math.min(t, 1));
    // smoothstep: 3t² - 2t³
    const turnCoeff = t * t * (3 - 2 * t);
    this.direction += this.turnRate * delta * turnCoeff;

    // integrate position
    this.x += this.speed * Math.cos(this.direction) * delta;
    this.y += this.speed * Math.sin(this.direction) * delta;
  }
}

export default CarPhysicModel;