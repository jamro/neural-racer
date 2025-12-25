import CarView from './CarView';
import SimulationObject from '../sim/SimulationObject';

const SPPEDING_LIMIT = 60/3.6; // meters


class CarObject extends SimulationObject {
    constructor(track, scoreWeights) {
        super();
        if (!track) {
          throw new Error('Track is required');
        }
        if (!scoreWeights) {
          throw new Error('Score weights are required');
        }
        this.scoreWeights = scoreWeights;
        this.track = track;
        this.width = 4; // meters
        this.height = 2; // meters
        this.x = 0; // meters
        this.y = 0; // meters
        this.speed = 0; // meters/second
        this.acceleration = 0; // meters/second^2
        this.turnRate = 0; // radians/second 
        this.direction = 0 // radians
        this.radarBeamCount = 9;
        this.radarBeams = new Array(this.radarBeamCount).fill(null);
        this.radarAngularRange = Math.PI;
        this.isCrashed = false;
        this.checkpointsPassed = 0;
        this.throttleValue = 0;
        this.brakeValue = 0;
        this.turnValue = 0;
        this.staleCounter = 50
        this.maxSpeed = 40; // meters/second, 140 km/h
        this.liftimeFrames = 0;
        this.lifetimeSeconds = 0;
        this.speedSum = 0;
        this.debug = ""
        this.speedingCounter = 0;

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

    update(delta) { // delta is in seconds
      if (this.isCrashed) return;

      this.liftimeFrames++;
      this.lifetimeSeconds += delta;

      const dragCoefficient = Math.min(1, this.speed / 8); // avoid drag at low speed to not block the car
      const dragDeceleration = 1 * dragCoefficient; // meters/second^2

      this.speed += (this.acceleration - dragDeceleration) * delta;
      this.speed = Math.max(Math.min(this.speed, this.maxSpeed), 0);

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
      if (this.track.isBoxCollidingWithWall(this.x, this.y, this.width, this.height, this.direction) !== false) {
        if (this.speed > 0) {
          console.log('Collision detected, stopping car');
          this.isCrashed = true;
        }
        this.speed = 0;
        this.turnRate = 0;
      }

      // check for checkpoints
      const checkpointIndex = this.track.isBoxCollidingWithCheckpoint(this.x, this.y, this.width, this.height, this.direction);
      if (checkpointIndex !== false) {
        this.checkpointsPassed = Math.max(this.checkpointsPassed, checkpointIndex+1);
      }

      // check for staleness
      const staleThreshold = 1; //  meters/second
      if (this.speed < staleThreshold) {
        this.staleCounter--;
      }
      if (this.staleCounter < 0) {
        this.isCrashed = true;
      }

      // track average speed
      this.speedSum += this.speed;
      if (this.speed > SPPEDING_LIMIT) {
        this.speedingCounter++;
      }
    }

    calculateCheckpointProgress() {
      return (this.checkpointsPassed + this.track.checkpoints.projectionBetweenGates(this.checkpointsPassed-1, this.x, this.y)-1) / (this.track.checkpoints.checkpointCount-1)
    }

    calculateAverageSpeed() {
      return this.speedSum / this.liftimeFrames;
    }

    calculateScoreComponents() {
      // calculate distance progress score
      const distanceProgressScore = this.calculateCheckpointProgress();

      // speed score
      let speedScore = (this.calculateAverageSpeed() / this.maxSpeed);
      speedScore = Math.max(0, Math.min(1, speedScore));
      const speedScoreAtFinishLine = (distanceProgressScore >= 1) ? speedScore : 0;

      // speeding penalty
      const speedingPenalty = (this.speedingCounter / this.liftimeFrames)

      // calculate total score
      return {
        trackDistance: (this.scoreWeights.trackDistance || 0) * distanceProgressScore,
        avgSpeedAtFinishLine: (this.scoreWeights.avgSpeedAtFinishLine || 0) * speedScoreAtFinishLine,
        speedingPenalty: -(this.scoreWeights.speedingPenalty || 0) * speedingPenalty,
        avgSpeed: (this.scoreWeights.avgSpeed || 0) * speedScore,
      }
    }

    calculateScore() {
      const components = this.calculateScoreComponents();
      const values = Object.values(components);
      const total = values.reduce((a, b) => a + b, 0);
      return total;
    }

    render(delta) { // delta is in seconds
      this.view.x = this.metersToPixels(this.x);
      this.view.y = this.metersToPixels(this.y);
      this.view.rotation = this.direction;
      this.view.setCrashed(this.isCrashed);

      if (!this.isCrashed) {  // only render radar if the car is not crashed
        const beamMaxLength = 40
        this.view.renderRadar(
          this.radarBeams.map(beam => this.metersToPixels(beam !== null ? beam : beamMaxLength))
        );
      }
    }
}

export default CarObject;