


class CarPhysicModel {
  constructor() {
    this.length = 4; // meters
    this.width = 2; // meters
    this.x = 0; // meters
    this.y = 0; // meters
    this.direction = 0; // radians

    this.maxSpeed = 40; // meters/second, 140 km/h
    this.speed = 0; // meters/second
    this.acceleration = 0; // meters/second^2
    this.turnRate = 0; // radians/second 

    this.throttleValue = 0;
    this.brakeValue = 0;
    this.turnValue = 0;
  }

  setPosition(x, y, direction) {
    this.x = x;
    this.y = y;
    this.direction = direction;
  }

  throttle(v) {
    const maxAcceleration = 4.5; // meters/second^2 6sec 0-100km/h
    v = Math.max(Math.min(v, 1), 0);
    this.throttleValue = v;
    this.brakeValue = 0;
    this.acceleration = v * maxAcceleration
  }

  breakCar(v) {
    const maxDeceleration = 8; // meters/second^2 6sec 0-100km/h
    v = Math.max(Math.min(v, 1), 0);
    this.brakeValue = v;
    this.throttleValue = 0;
    this.acceleration = -v * maxDeceleration
  }

  turn(v) {
    const maxTurnRate = Math.PI*0.5; // radians/second
    v = Math.max(Math.min(v, 1), -1);
    this.turnValue = v;
    this.turnRate = v * maxTurnRate;
  }

  updateStep(delta) {

    const dragCoefficient = Math.min(1, this.speed / 8); // avoid drag at low speed to not block the car
    const dragDeceleration = 1 * dragCoefficient; // meters/second^2

    this.speed += (this.acceleration - dragDeceleration) * delta;
    this.speed = Math.max(Math.min(this.speed, this.maxSpeed), 0);

    const turnCoefficient = Math.min(1, this.speed / 8); // avoid turning in place at low speed
    this.direction += this.turnRate * delta * turnCoefficient;

    this.x += this.speed * Math.cos(this.direction) * delta;
    this.y += this.speed * Math.sin(this.direction) * delta;

  }

}

export default CarPhysicModel;