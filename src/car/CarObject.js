import CarView from './CarView';
import SimulationObject from '../sim/SimulationObject';

class CarObject extends SimulationObject {
    constructor() {
        super();
        this.view = new CarView();
        this.x = 0;
        this.y = 0;
        this.speed = 1;
        this.turnRate = -0.01;
        this.direction = 0
    }

    update(delta) { // delta is in seconds
      this.direction += this.turnRate;
      this.x += this.speed * Math.cos(this.direction);
      this.y += this.speed * Math.sin(this.direction);
    }

    render(delta) { // delta is in seconds
      this.view.x = this.x;
      this.view.y = this.y;
      this.view.rotation = this.direction;
    }
}

export default CarObject;