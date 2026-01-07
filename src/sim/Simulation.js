import SimulationView from './SimulationView';
import { metersToPixels } from './unitConversion';

const COMPLETE_DELAY = 20;
const LEADER_RELOAD_DELAY = 20;
const SLOW_CAMERA_SNAP_FACTOR = 0.01;
const FAST_CAMERA_SNAP_FACTOR = 0.5;

class Simulation {
    constructor(app = null) {

        this.simulationStep = 0.05;
        this.simulationSpeed = 1;
        
        this.running = false;
        this.renderRunning = false;
        this.app = app;
        this.view = new SimulationView();
        this.leaderCar = null;
        this.cars = [];
        this.track = null;
        this.onComplete = () => {}
        this.completeDelay = COMPLETE_DELAY;
        this.leaderReloadDelay = LEADER_RELOAD_DELAY;
        this.cameraSnapFactor = FAST_CAMERA_SNAP_FACTOR;
        this.frameCount = 0;
        this.graphicsQuality = "low";

        this.carPhysicsProccessingTime = 0;
        this.carControlProccessingTime = 0;
        this.activeCars = 0
        this.epoch = null;
    }

    setTrack(track) {
        if(!track) {
            throw new Error('Track not provided');
        }
        if (this.track) {
            throw new Error('Track already set');
        }
        this.track = track;
        this.track.view.pixiApp = this.app;
        this.view.setTrack(track);
    }

    addCar(car) {
        if(!this.track) {
            throw new Error('Track not set');
        }
        const startSegment = this.track.getStartPosition();
        const angleJitter = Math.random() * (Math.PI / 180) * 2 - (Math.PI / 180);
        car.setPosition(
          startSegment.x + Math.random() * 0.1 - 0.05,
          startSegment.y + Math.random() * 0.1 - 0.05,
          startSegment.angle + Math.PI / 2 + angleJitter
        );
        this.cars.push(car);
        this.view.addCar(car);
        this.activeCars++;
    }

    addGeneration(generation) {
        for (const car of generation.cars) {
            this.addCar(car);
        }
    }

    updateCamera() {
      if (this.leaderCar) {
        this.view.setCameraPosition(
          metersToPixels(-this.leaderCar.x),
          metersToPixels(-this.leaderCar.y),
          this.cameraSnapFactor
        );
      }
    }

    start(epoch, simulationStep = 0.05, simulationSpeed = 1, graphicsQuality = "low", scoreWeights = { trackDistance: 1 }) {
        if (this.running) return;
        this.epoch = epoch;
        this.scoreWeights = scoreWeights;
        this.simulationStep = simulationStep;
        this.simulationSpeed = simulationSpeed;
        this.graphicsQuality = graphicsQuality;
        this.running = true;
        this.completeCounter = 100;
        this.view.graphicsQuality = graphicsQuality;
        requestAnimationFrame(this.simulationLoop);
    }

    stop() {
        this.running = false;
    }

    startRender() {
        if (!this.app) {
            console.warn('Cannot start render loop: PixiJS app not provided');
            return;
        }
        if (this.renderRunning) return;
        this.renderRunning = true;
        this.app.ticker.add(this.renderLoop);
    }

    stopRender() {
        if (!this.app) return;
        this.renderRunning = false;
        this.app.ticker.remove(this.renderLoop);
    }

    renderLoop = (ticker) => {
        if (!this.renderRunning) return;
        
        const deltaSeconds = ticker && typeof ticker.deltaTime === 'number' 
            ? ticker.deltaTime 
            : (typeof ticker === 'number' ? ticker / 60 : 0.016); // Fallback to ~60fps if unknown format
        
        for (const car of this.cars) {
            car.renderView(deltaSeconds);
        }
        this.view.renderView(deltaSeconds);

        this.view.updateStats(this, this.scoreWeights);

        // follow leader
        if(this.leaderCar && this.leaderCar.isCrashed && this.activeCars > 0) {
          this.leaderReloadDelay--;
        }
        if(this.leaderReloadDelay <= 0) {
          this.leaderCar.active = false;
          this.leaderCar = null;
          this.leaderReloadDelay = LEADER_RELOAD_DELAY;
          this.cameraSnapFactor = SLOW_CAMERA_SNAP_FACTOR;
        }
        if(!this.leaderCar && this.activeCars > 0) {
          let leader = null;
          for (const car of this.cars) {
            if (car.isCrashed) continue;
            leader = car;
            break;
          }
          if (leader) {
            this.leaderCar = leader;
            this.leaderCar.active = true;
          }
        }
        if(this.leaderCar) {
          this.cameraSnapFactor += (FAST_CAMERA_SNAP_FACTOR - this.cameraSnapFactor)*0.01
        }
    }

    simulationLoop = (currentTime) => {
        this.frameCount++;
        if (!this.running) return;

        if(this.simulationSpeed > 1) {
          const stepGroup = Math.round(this.simulationSpeed);
          for(let i = 0; i < stepGroup; i++) {
            if(!this.singleSimulationStep()) {
              return
            }
          }
          this.updateCamera();
        } else {
          const skipFrames = Math.round(1 / this.simulationSpeed);
          if(this.frameCount % skipFrames === 0) {
            if(!this.singleSimulationStep()) {
              return
            }
            this.updateCamera();
          }
        }

        // Continue simulation loop
        requestAnimationFrame(this.simulationLoop);
    }

    singleSimulationStep() {
        this.activeCars = this.cars.filter(car => !car.isCrashed && !car.isFinished).length;
        let startTime = 0;
        startTime = performance.now();
        for (const car of this.cars) {
          car.control(this.simulationStep);
        }
        if(this.activeCars > 0) {
          this.carControlProccessingTime = (performance.now() - startTime) / this.activeCars;
        }

        startTime = performance.now();
        for (const car of this.cars) {
          car.update(this.track, this.simulationStep);
        }
        if(this.activeCars > 0) {
          this.carPhysicsProccessingTime = (performance.now() - startTime) / this.activeCars;
        }

        // end condition
        if (this.activeCars === 0) {
          this.completeCounter--;
        }
        if(this.completeCounter <= 0) {
          console.log('Generation completed');
          this.onComplete();
          return false
        }
        return true
    }

    scaleView(width, height) {
      if(!this.view) return;
      this.view.x = width / 2;
      this.view.y = height / 2;
      this.view.scaleView(width, height);
    }

    removeAndDispose() {
        this.stop();
        this.stopRender();
        if (this.view && this.view.parent) {
            this.view.parent.removeChild(this.view);
        }
        this.cars = [];
        if(this.track) {
          this.track.view.reset();
        }
        if(this.track && this.track.view && this.track.view.parent) {
            this.track.view.parent.removeChild(this.track.view);
        }
        this.track = null;
        this.frameCount = 0;
        this.activeCars = 0;
        if(this.view) {
          this.view.destroy({children: true, texture: false, baseTexture: false});
        }
        this.view = null;
    }
}

export default Simulation;

