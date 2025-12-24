import * as PIXI from 'pixi.js';
import CarDetailsView from './CarDetailsView';

class SimulationView extends PIXI.Container {
    constructor() {
        super();
        this.masterContainer = new PIXI.Container();
        this.addChild(this.masterContainer);

        this.carDetailsView = new CarDetailsView();
        this.addChild(this.carDetailsView);
        this.track = null;
        this.cars = [];
    }

    setCameraPosition(x, y) {
        this.masterContainer.x = x;
        this.masterContainer.y = y;
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
}

export default SimulationView;