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
        this.masterContainer.scale.set(0.5, 0.5);
    }

    setGeneration(generation) {
        this.generation = generation;
        this.generationDetailsView.generation = generation;
    }

    setCameraPosition(x, y, immidiate = false) {
        x *= this.masterContainer.scale.x;
        y *= this.masterContainer.scale.y;
        if (immidiate) {
            this.masterContainer.x = x;
            this.masterContainer.y = y;
        } else {
            this.masterContainer.x += (x - this.masterContainer.x) * 0.1;
            this.masterContainer.y += (y - this.masterContainer.y) * 0.1;
        }
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

    render() {
        this.carDetailsView.render();
        this.generationDetailsView.render();
    }

    scaleView(width, height) {
      this.carDetailsView.x = - width / 2;
      this.carDetailsView.y = - height / 2 + 200;
      this.generationDetailsView.x = - width / 2;
      this.generationDetailsView.y = -height / 2;
    }
}

export default SimulationView;