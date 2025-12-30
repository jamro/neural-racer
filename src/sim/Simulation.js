import AbstractSimulationObject from './AbstractSimulationObject';
import SimulationView from './SimulationView';


const COMPLETE_DELAY = 20;

class Simulation extends AbstractSimulationObject {
    constructor(app = null) {
        super();

        this.simulationStep = 0.05;
        this.simulationSpeed = 1;
        
        this.running = false;
        this.renderRunning = false;
        this.objects = [];
        this.app = app;
        this.view = new SimulationView();
        this.leaderCar = null;
        this.cars = [];
        this.track = null;
        this.generation = null;
        this.activeLeaderFollowing = false;
        this.onComplete = () => {}
        this.completeDelay = COMPLETE_DELAY;
        this.frameCount = 0;
    }

    setTrack(track) {
        if (this.track) {
            throw new Error('Track already set');
        }
        this.track = track;
        this.track.view.pixiApp = this.app;
        this.addObject(track);
        this.view.setTrack(track);
    }

    renderView(delta) {
      this.view.renderView(delta);
      if(this.track && this.leaderCar) {
        this.track.view.drawDriftMark(
          this.leaderCar.carId,
          this.metersToPixels(this.leaderCar.x),
          this.metersToPixels(this.leaderCar.y),
          this.leaderCar.direction,
          this.metersToPixels(this.leaderCar.length),
          this.metersToPixels(this.leaderCar.width),
          this.leaderCar.model.tiresTraction
        );
      }
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
        this.addObject(car);
        this.view.addCar(car);
    }

    setGeneration(generation) {
        if (this.generation) {
            throw new Error('Generation already set');
        }
        this.generation = generation;

        for (const car of generation.cars) {
            this.addCar(car);
        }
        this.view.setGeneration(generation);
    }

    updateCamera() {
      if (this.leaderCar) {
          this.view.setCameraPosition(
          this.metersToPixels(-this.leaderCar.x),
          this.metersToPixels(-this.leaderCar.y)
        );
      }
    }

    /**
     * Validates that an object implements the AbstractSimulationObject interface
     * @param {Object} object - Object to validate
     * @throws {Error} If object doesn't implement required methods
     */
    validateSimulationObject(object) {
        if (!object) {
            throw new Error('Object cannot be null or undefined');
        }
        if (typeof object.update !== 'function') {
            throw new Error('Simulation object must implement update(delta) method');
        }
        if (typeof object.renderView !== 'function') {
            throw new Error('Simulation object must implement renderView(delta) method');
        }
    }

    addObject(object) {
        this.validateSimulationObject(object);
        this.objects.push(object);
    }

    removeObject(object) {
        const index = this.objects.indexOf(object);
        if (index > -1) {
            this.objects.splice(index, 1);
        }
    }

    start(simulationStep = 0.05, simulationSpeed = 1) {
        if (this.running) return;
        this.simulationStep = simulationStep;
        this.simulationSpeed = simulationSpeed;
        this.running = true;
        this.completeCounter = 100;
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
        
        // Call render on all game objects
        // PixiJS ticker callback receives a ticker object with deltaTime in seconds
        // Handle both ticker object and direct delta value for compatibility
        const deltaSeconds = ticker && typeof ticker.deltaTime === 'number' 
            ? ticker.deltaTime 
            : (typeof ticker === 'number' ? ticker / 60 : 0.016); // Fallback to ~60fps if unknown format
        
        for (const object of this.objects) {
            // All objects are validated to have render method
            object.renderView(deltaSeconds);
        }
        this.renderView(deltaSeconds);

        // find leader and set it as focused car
        if (Math.random() < 0.3) { // 30% chance to find a new leader
            const leader = this.activeLeaderFollowing ? this.generation.findLeader() : this.generation.cars[0];
            if (leader) {
              if (this.leaderCar) {
                this.leaderCar.active = false
              }
              this.leaderCar = leader;
              this.view.carDetailsView.car = leader;
              this.leaderCar.active = true;
            }
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
        // Run simulation at fixed timestep
        // Update all objects (all objects are validated to have update method)
        for (const object of this.objects) {
          object.update(this.simulationStep);
        }

        // end condition
        if (this.generation.activeCount === 0) {
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
        this.view.x = width / 2;
        this.view.y = height / 2;
        this.view.scaleView(width, height);
    }

    removeAndDispose() {
        this.stop();
        this.stopRender();
        if (this.view.parent) {
            this.view.parent.removeChild(this.view);
        }
        this.view.destroy();
        this.objects.forEach(object => object.destroy());
        this.objects = [];
        this.cars = [];
        this.track.reset();
        this.track = null;
        this.generation = null;
        this.frameCount = 0;
    }
}

export default Simulation;

