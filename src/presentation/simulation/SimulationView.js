import * as PIXI from 'pixi.js';
import SimulationDetailsView from './ui/SimulationDetailsView';
import { metersToPixels } from './unitConversion'; // @TODO avoid conversion in view class

class SimulationView extends PIXI.Container {
  constructor(allowSettings = true) {
    super();
    this.masterContainer = new PIXI.Container();
    this.addChild(this.masterContainer);

    this.simulationDetailsView = new SimulationDetailsView(allowSettings);
    this.simulationDetailsView.on('speedChanged', (speed) => this.emit('speedChanged', speed));
    this.simulationDetailsView.on('evolutionModeChanged', (autoMode) => this.emit('evolutionModeChanged', autoMode));
    this.addChild(this.simulationDetailsView);
    this.track = null;
    this.cars = [];
    this.viewWidth = 100;
    this.viewHeight = 100;
    this.targetCameraPosition = { x: 0, y: 0, scale: 1 };

    this.cameraOffset = {
      x: 0,
      y: -220/2,
    }

    this._graphicsQuality = "low";
  }

  set autoEvolve(autoMode) {
    this.simulationDetailsView.autoEvolve = autoMode;
  }
    
  get autoEvolve() {
    return this.simulationDetailsView.autoEvolve;
  }

  get simulationSpeed() {
    return this.simulationDetailsView.simulationSpeed;
  }

  set simulationSpeed(speed) {
    this.simulationDetailsView.simulationSpeed = speed;
  }

  set graphicsQuality(quality) {
    this.track.view.graphicsQuality = quality;
    this._graphicsQuality = quality;
  }

  get graphicsQuality() {
    return this._graphicsQuality;
  }

  setCameraPosition(x, y, snapFactor = 0.5) {
    x += this.cameraOffset.x;
    y += this.cameraOffset.y;
    x *= this.targetCameraPosition.scale;
    y *= this.targetCameraPosition.scale;
    this.targetCameraPosition.x += (x - this.targetCameraPosition.x) * snapFactor;
    this.targetCameraPosition.y += (y - this.targetCameraPosition.y) * snapFactor;
  }

  setTrack(track) {
    if (this.track) {
      throw new Error('Track already set');
    }
    this.track = track;
    this.masterContainer.addChild(track.view);
  }

  addCar(car) {
    this.cars.push(car);
    this.track.view.carsContainer.addChild(car.view);
  }

  updateStats(simulation, scoreWeights) {
    this.simulationDetailsView.update(simulation, simulation.leaderCar, scoreWeights);
  }

  setEvolutionHistory(evolutionHistory, trackName) {
    this.simulationDetailsView.setEvolutionHistory(evolutionHistory, trackName);
  }

  renderView() {
    this.masterContainer.x = this.targetCameraPosition.x;
    this.masterContainer.y = this.targetCameraPosition.y;
    if(this.track) {
      this.track.view.renderView(
        this.viewWidth, 
        this.viewHeight,
        this.masterContainer.x,
        this.masterContainer.y
      );
    }
    if(this.graphicsQuality === "high") {
      let leaderCar = null;
      for (const car of this.cars) {
        this.track.view.drawDriftMark(
          car.carId,
          metersToPixels(car.x),
          metersToPixels(car.y),
          car.direction,
          metersToPixels(car.length),
          metersToPixels(car.width),
          car.isCrashed ? 0 : (car.model.tiresTraction * (car.active ? 1 : 0.8)),
          (car.active && !car.isCrashed) ? car.model.tiresTraction : 0
        );
        if(car.active) {
          leaderCar = car;
        }
      }
      if(leaderCar) {
        for (const car of this.cars) {
          if(car.active) {
            car.view.alpha = 1;
            continue
          }
          const distanceFromLeader = Math.sqrt(Math.pow(car.x - leaderCar.x, 2) + Math.pow(car.y - leaderCar.y, 2));
          car.view.alpha = 0.05 + 0.95*Math.min(1, Math.max(0, (distanceFromLeader-5)/15));
        }
      }
    }
  }

  set epochDescription(description) {
    this.simulationDetailsView.epochDescription = description;
  }

  get epochDescription() {
    return this.simulationDetailsView.epochDescription;
  }

  scaleView(width, height) {
    this.viewWidth = width;
    this.viewHeight = height;

    this.simulationDetailsView.scaleView(width, height);
    this.simulationDetailsView.x = - width / 2;
    this.simulationDetailsView.y = - height / 2;
  }

  destroy() {
    this.simulationDetailsView.off('speedChanged');
    this.simulationDetailsView.off('evolutionModeChanged');
    // Pixi v8: ensure GraphicsContext is destroyed (prevents _gpuContextHash growth)
    this.simulationDetailsView.destroy({ children: true, texture: false, baseTexture: false, context: true });
    super.destroy();
  }
}

export default SimulationView;
