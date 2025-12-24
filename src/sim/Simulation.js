import SimulationObject from './SimulationObject';
import SimulationView from './SimulationView';

class Simulation extends SimulationObject {
    constructor(app = null, deltaSeconds = 0.05) {
        super();

        this.deltaSeconds = deltaSeconds
        
        this.running = false;
        this.renderRunning = false;
        this.objects = [];
        this.app = app;
        this.view = new SimulationView();
        this.leaderCar = null;
        this.cars = [];
        this.track = null;
        this.generation = null;
    }

    setTrack(track) {
        if (this.track) {
            throw new Error('Track already set');
        }
        this.track = track;
        this.addObject(track);
        this.view.setTrack(track);
    }

    addCar(car) {
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
     * Validates that an object implements the SimulationObject interface
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
        if (typeof object.render !== 'function') {
            throw new Error('Simulation object must implement render(delta) method');
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

    start() {
        if (this.running) return;
        this.running = true;
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
            object.render(deltaSeconds);
        }


        // find leader and set it as focused car
        if (Math.random() < 0.3) { // 30% chance to find a new leader
            const leader = this.generation.findLeader();
            if (leader) {
              if (this.leaderCar) {
                this.leaderCar.view.active = false;
              }
              this.leaderCar = leader;
              this.view.carDetailsView.car = leader;
              this.leaderCar.view.active = true;
            }
          }

        this.updateCamera();
        this.view.carDetailsView.render();
        
    }

    simulationLoop = (currentTime) => {
        if (!this.running) return;
        
        // Run simulation at fixed timestep
        // Update all objects (all objects are validated to have update method)
        for (const object of this.objects) {
            object.update(this.deltaSeconds);
        }
        
        // Continue simulation loop
        requestAnimationFrame(this.simulationLoop);
    }

    scaleView(width, height) {
        this.view.x = width / 2;
        this.view.y = height / 2;
        this.view.carDetailsView.x = - width / 2;
        this.view.carDetailsView.y = - height / 2;
    }
}

export default Simulation;

