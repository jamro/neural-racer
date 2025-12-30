import * as PIXI from 'pixi.js';
import CarDetailsView from './CarDetailsView';
import GenerationDetailsView from './GenerationDetailsView';
import FpsCounter from '../ui/FpsCounter';

class SimulationView extends PIXI.Container {
    constructor() {
        super();
        this.masterContainer = new PIXI.Container();
        this.addChild(this.masterContainer);

        this.carDetailsView = new CarDetailsView();
        this.generationDetailsView = new GenerationDetailsView();
        this.addChild(this.carDetailsView);
        this.addChild(this.generationDetailsView);
        this.track = null;
        this.cars = [];
        this.generation = null;
        this.viewWidth = 100;
        this.viewHeight = 100;
        this.targetCameraPosition = { x: 0, y: 0, scale: 1 };

        this.fpsCounter = new FpsCounter();
        this.addChild(this.fpsCounter);
        this._graphicsQuality = "low";
    }

    set graphicsQuality(quality) {
        this.track.view.graphicsQuality = quality;
        this._graphicsQuality = quality;
    }

    get graphicsQuality() {
        return this._graphicsQuality;
    }

    setGeneration(generation) {
        this.generation = generation;
        this.generationDetailsView.generation = generation;
    }

    setCameraPosition(x, y, snapFactor = 0.5) {
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

    renderView(delta) {
        this.carDetailsView.renderView(delta);
        this.generationDetailsView.renderView(delta);
        this.masterContainer.x = this.targetCameraPosition.x;
        this.masterContainer.y = this.targetCameraPosition.y;
        if(this.track) {
          this.track.renderView(
            delta, 
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
              car.metersToPixels(car.x),
              car.metersToPixels(car.y),
              car.direction,
              car.metersToPixels(car.length),
              car.metersToPixels(car.width),
              car.isCrashed ? 0 : (car.model.tiresTraction * (car.active ? 1 : 0.8)),
              (car.active && !car.isCrashed) ? car.model.tiresTraction : 0
            );
            if(car.active) {
              leaderCar = car;
            }
          }
          if(leaderCar) {
            for (const car of this.cars) {
              if(car.active) continue;
              const distanceFromLeader = Math.sqrt(Math.pow(car.x - leaderCar.x, 2) + Math.pow(car.y - leaderCar.y, 2));
              car.view.alpha = 0.15 + 0.85*Math.min(1, Math.max(0, (distanceFromLeader-5)/15));
            }
          }
        }
    }

    scaleView(width, height) {
      this.viewWidth = width;
      this.viewHeight = height;
      this.carDetailsView.x = - width / 2;
      this.carDetailsView.y = - height / 2 + 220;
      this.generationDetailsView.x = - width / 2;
      this.generationDetailsView.y = -height / 2;
      this.fpsCounter.x = width / 2 - this.fpsCounter.width / 2;
      this.fpsCounter.y = -height / 2;
    }
}

export default SimulationView;