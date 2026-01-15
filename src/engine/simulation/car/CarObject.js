import CarView from '../../../presentation/simulation/car/CarView';
import CarPhysicModel from './CarPhysicModel';
import { v4 as uuidv4 } from 'uuid';
import { metersToPixels } from '../../../presentation/simulation/unitConversion';

const NO_PROGRESS_MAX_FRAMES = 300;

class CarObject {
    constructor() {
        this.carId = uuidv4();
        this.model = new CarPhysicModel();

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
        this.topSpeed = 0
        this.debug = ""
        this.safeDirection = 0;
        this.noProgressCounter = 0;

        // create view
        this.view = new CarView(
          metersToPixels(this.model.length),
          metersToPixels(this.model.width),
          this.radarBeamAngles
        );

        this.checkpointsProgress = 0;
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

    update(track, delta) { // delta is in seconds
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
      if(!this._isFinished) {
        for (let index = 0; index < this.radarBeams.length; index++) {
          const angle = this.radarBeamAngles[index] + this.model.direction
          this.radarBeams[index] = track.rayIntersectionsMinLength(this.model.x, this.model.y, angle);
        }
      } else {
        this.radarBeams = new Array(this.radarBeamCount).fill(null);
      }

      
      // check for checkpoints
      if(!this._isFinished) {
        const oldCheckpointIndex = this.checkpointsPassed;
        const checkpointIndex = track.isBoxCollidingWithCheckpoint(this.model.x, this.model.y, this.model.length, this.model.width, this.model.direction);
        if (checkpointIndex !== false) {

          this.checkpointsPassed = Math.max(this.checkpointsPassed, checkpointIndex+1);

          if(checkpointIndex + 1  < this.checkpointsPassed && !this._isFinished) {
            this._isCrashed = true;
          }
        }
        if(oldCheckpointIndex === this.checkpointsPassed) {
          this.noProgressCounter++;
        } else {
          this.noProgressCounter = 0;
        }
        if(this.noProgressCounter > NO_PROGRESS_MAX_FRAMES) {
          this._isCrashed = true;
        }
      }
      
      // check for finish line
      if (this.checkpointsPassed >= track.checkpoints.checkpointCount) {
        this._isFinished = true;
      }

      // check for collisions
      if (!this._isFinished && track.isBoxCollidingWithWall(this.model.x, this.model.y, this.model.length, this.model.width, this.model.direction) !== false) {
        if (this.model.speed > 0) {
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
        this.speedSum += this.model.speed;
        this.topSpeed = Math.max(this.topSpeed, this.model.speed)
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

      this.checkpointsProgress = (this.checkpointsPassed + track.checkpoints.projectionBetweenGates(this.checkpointsPassed-1, this.model.x, this.model.y)-1) / (track.checkpoints.checkpointCount-1)
    }

    calculateAverageSpeed() {
      return this.speedSum / this.liftimeFrames;
    }

  renderView() { // delta is in seconds
      this.view.x = metersToPixels(this.model.x);
      this.view.y = metersToPixels(this.model.y);
      this.view.rotation = this.model.direction;
      this.view.crashed = this._isCrashed;

      // Only call renderRadar if DEBUG_RADAR_BEAMS is enabled to avoid unnecessary method calls
      // (renderRadar has its own early return, but avoiding the call entirely is more efficient)
      if (!this._isCrashed && !this._isFinished && this.view.radar.visible) {
        const beamMaxLength = 100 // for rendering only
        this.view.renderRadar(
          this.radarBeams.map(beam => metersToPixels(beam !== null ? beam : beamMaxLength)),
          this.safeDirection
        );
      }
    }
}

export default CarObject;