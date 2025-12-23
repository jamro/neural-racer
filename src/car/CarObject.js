import CarView from './CarView';
import SimulationObject from '../sim/SimulationObject';

class CarObject extends SimulationObject {
    constructor(track) {
        super();
        this.track = track;
        this.width = 4; // meters
        this.height = 2; // meters
        this.x = 0; // meters
        this.y = 0; // meters
        this.speed = 0; // meters/second
        this.acceleration = 0; // meters/second^2
        this.turnRate = 0; // radians/second 
        this.direction = 0 // radians
        this.radarBeamCount = 5;
        this.radarBeams = new Array(this.radarBeamCount).fill(null);
        this.radarAngularRange = Math.PI*0.8;
        this.isCrashed = false;

        // create view
        this.view = new CarView(
          this.metersToPixels(this.width),
          this.metersToPixels(this.height),
          this.radarAngularRange
        );
    }

    throttle(v) {
      const maxAcceleration = 4.5; // meters/second^2 6sec 0-100km/h
      v = Math.max(Math.min(v, 1), 0);
      this.acceleration = v * maxAcceleration
    }

    breakCar(v) {
      const maxDeceleration = 8; // meters/second^2 6sec 0-100km/h
      v = Math.max(Math.min(v, 1), 0);
      this.acceleration = -v * maxDeceleration
    }

    turn(v) {
      const maxTurnRate = Math.PI*0.5; // radians/second
      v = Math.max(Math.min(v, 1), -1);
      this.turnRate = v * maxTurnRate;
    }

    update(delta) { // delta is in seconds
      if (this.isCrashed) return;

      const dragDeceleration = 1; // meters/second^2

      const maxSpeed = 40; // meters/second, 140 km/h
      this.speed += (this.acceleration - dragDeceleration) * delta;
      this.speed = Math.max(Math.min(this.speed, maxSpeed), 0);

      const turnCoefficient = Math.min(1, this.speed / 8); // avoid turning in place at low speed
      this.direction += this.turnRate * delta * turnCoefficient;

      this.x += this.speed * Math.cos(this.direction) * delta;
      this.y += this.speed * Math.sin(this.direction) * delta;

      // update radar beams
      const angleStep = this.radarAngularRange / (this.radarBeams.length - 1);
      for (let index = 0; index < this.radarBeams.length; index++) {
        const angle = this.radarAngularRange / 2 - angleStep * index + this.direction
        this.radarBeams[index] = this.track.rayIntersectionsMinLength(this.x, this.y, angle);
      }

      // check for collisions
      if (this.track.isBoxColliding(this.x, this.y, this.width, this.height, this.direction)) {
        if (this.speed > 0) {
          console.log('Collision detected, stopping car');
          this.isCrashed = true;
        }
        this.speed = 0;
        this.turnRate = 0;
      }
    }

    render(delta) { // delta is in seconds
      this.view.x = this.metersToPixels(this.x);
      this.view.y = this.metersToPixels(this.y);
      this.view.rotation = this.direction;
      this.view.alpha = this.isCrashed ? 0.2 : 1;

      const beamMaxLength = 40
      this.view.renderRadar(
        this.radarBeams.map(beam => this.metersToPixels(beam !== null ? beam : beamMaxLength))
      );
    }
}

export default CarObject;