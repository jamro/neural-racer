import CarView from './CarView';
import AbstractSimulationObject from '../AbstractSimulationObject';
import CarPhysicModel from './CarPhysicModel';

class CarObject extends AbstractSimulationObject {
    constructor(track, scoreWeights) {
        super();
        this.carId = Math.random().toString(36).substring(2, 15);
        if (!track) {
          throw new Error('Track is required');
        }
        if (!scoreWeights) {
          throw new Error('Score weights are required');
        }
        this.model = new CarPhysicModel();
        this.scoreWeights = scoreWeights;
        this.track = track;

        this.radarBeamAngles = [
          -90 * Math.PI / 180,
          -45 * Math.PI / 180,
          -25 * Math.PI / 180,
          -10 * Math.PI / 180,
          0 * Math.PI / 180,
          +10 * Math.PI / 180,
          +25 * Math.PI / 180,
          +45 * Math.PI / 180,
          +90 * Math.PI / 180,
        ]
        this.radarBeams = new Array(this.radarBeamCount).fill(null);
        this._isCrashed = false;
        this._isFinished = false;
        this.checkpointsPassed = 0;
        this.staleCounter = 50
        this.liftimeFrames = 0;
        this.lifetimeSeconds = 0;
        this.speedSum = 0;
        this.debug = ""
        this.speedingCounter = 0;
        this.safeDirection = 0;

        // create view
        this.view = new CarView(
          this.metersToPixels(this.model.length),
          this.metersToPixels(this.model.width),
          this.radarBeamAngles
        );
    }

    get x() {
      return this.model.x;
    }
    get y() {
      return this.model.y;
    }
    get direction() {
      return this.model.direction;
    }

    setPosition(x, y, direction) {
      this.model.setPosition(x, y, direction);
    }

    get radarBeamCount() {
      return this.radarBeamAngles.length;
    }

    throttle(v) {
      this.model.throttle(v);
    }

    breakCar(v) {
      this.model.breakCar(v);
    }

    turn(v) {
      this.model.turn(v);
    }

    set active(isActive) {
      this.view.active = isActive;
    }

    get active() {
      return this.view.active
    }

    get isCrashed() {
      if (this._isFinished) return false;
      return this._isCrashed;
    }

    get isFinished() {
      return this._isFinished;
    }

    set isCrashed(isCrashed) {
      this._isCrashed = isCrashed;
    }

    set isFinished(isFinished) {
      this._isFinished = isFinished;
    }

    get maxSpeed() {
      return this.model.maxSpeed;
    }

    get speed() {
      return this.model.speed;
    }

    get length() {
      return this.model.length;
    }

    get width() {
      return this.model.width;
    }

    update(delta) { // delta is in seconds
      if (this._isCrashed) return;

      if(this._isFinished) {
        this.breakCar(1);
        this.turn(1);
      }

      if(!this._isFinished) {
        this.liftimeFrames++;
        this.lifetimeSeconds += delta;
      }

      this.model.updateStep(delta);

      // update radar beams
      for (let index = 0; index < this.radarBeams.length; index++) {
        const angle = this.radarBeamAngles[index] + this.model.direction
        this.radarBeams[index] = this.track.rayIntersectionsMinLength(this.model.x, this.model.y, angle);
      }

      // check for checkpoints
      const checkpointIndex = this.track.isBoxCollidingWithCheckpoint(this.model.x, this.model.y, this.model.length, this.model.width, this.model.direction);
      if (checkpointIndex !== false) {
        this.checkpointsPassed = Math.max(this.checkpointsPassed, checkpointIndex+1);
      }

      // check for finish line
      if (this.checkpointsPassed >= this.track.checkpoints.checkpointCount) {
        this._isFinished = true;
      }

      // check for collisions
      if (!this._isFinished && this.track.isBoxCollidingWithWall(this.model.x, this.model.y, this.model.length, this.model.width, this.model.direction) !== false) {
        if (this.model.speed > 0) {
          console.log('Collision detected, stopping car');
          this._isCrashed = true;
        }
        this.model.speed = 0;
        this.model.turnRate = 0;
      }

      // check for staleness
      const staleThreshold = 3; //  meters/second
      if (this.model.speed < staleThreshold) {
        this.staleCounter--;
      }
      if (this.staleCounter < 0 && !this._isFinished) {
        this._isCrashed = true;
      }

      // track average speed
      if(!this._isFinished) {
        const speedingLimitValue = this.scoreWeights.speedingLimitValue || 60/3.6; // meters/second, 60 km/h
        this.speedSum += this.model.speed;
        if (this.model.speed > speedingLimitValue) {
          this.speedingCounter++;
        }
      }

      // find safe direction
      let safeAngle = 0;
      let safeDistance = 0;
      for (let index = 0; index < this.radarBeams.length; index++) {
        const angle = this.radarBeamAngles[index]
        const distance = this.radarBeams[index]
        if (distance === null || distance > safeDistance) {
          safeAngle = angle;
          safeDistance = distance;
        }
      }
      const centralBeamIndex = Math.floor(this.radarBeamCount / 2);
      if(this.radarBeams[centralBeamIndex] === null) {
        safeAngle = 0;
      }
      this.safeDirection += (safeAngle - this.safeDirection) * 0.15;
    }

    calculateCheckpointProgress() {
      return (this.checkpointsPassed + this.track.checkpoints.projectionBetweenGates(this.checkpointsPassed-1, this.model.x, this.model.y)-1) / (this.track.checkpoints.checkpointCount-1)
    }

    calculateAverageSpeed() {
      return this.speedSum / this.liftimeFrames;
    }

    calculateScoreComponents() {
      // calculate distance progress score
      const distanceProgressScore = this.calculateCheckpointProgress();

      // speed score
      let speedScore = (this.calculateAverageSpeed() / this.model.maxSpeed);
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

    renderView(delta) { // delta is in seconds
      this.view.x = this.metersToPixels(this.model.x);
      this.view.y = this.metersToPixels(this.model.y);
      this.view.rotation = this.model.direction;
      this.view.crashed = this._isCrashed;

      if (!this._isCrashed && !this._isFinished) {  // only render radar if the car is not crashed or finished
        const beamMaxLength = 100 // for rendering only
        this.view.renderRadar(
          this.radarBeams.map(beam => this.metersToPixels(beam !== null ? beam : beamMaxLength)),
          this.safeDirection
        );
      }
    }
}

export default CarObject;