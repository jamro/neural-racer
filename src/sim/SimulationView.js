import * as PIXI from 'pixi.js';
import CarDetailsView from './CarDetailsView';
import GenerationDetailsView from './GenerationDetailsView';

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
        this.masterContainer.addChild(car.view);
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
    }

    scaleView(width, height) {
      this.viewWidth = width;
      this.viewHeight = height;
      this.carDetailsView.x = - width / 2;
      this.carDetailsView.y = - height / 2 + 220;
      this.generationDetailsView.x = - width / 2;
      this.generationDetailsView.y = -height / 2;
    }
}

export default SimulationView;