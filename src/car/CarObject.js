import CarView from './CarView';
import SimulationObject from '../sim/SimulationObject';

class CarObject extends SimulationObject {
    constructor() {
        super();
        this.width = 4; // meters
        this.height = 2; // meters
        this.x = 0; // meters
        this.y = 0; // meters
        this.speed = 14; // meters/second
        this.turnRate = -1.5; // radians/second 
        this.direction = 0 // radians

        // create view
        this.view = new CarView(
          this.metersToPixels(this.width),
          this.metersToPixels(this.height)
        );
    }

    update(delta) { // delta is in seconds
      this.direction += this.turnRate * delta;
      this.x += this.speed * Math.cos(this.direction) * delta;
      this.y += this.speed * Math.sin(this.direction) * delta;
    }

    render(delta) { // delta is in seconds
      this.view.x = this.metersToPixels(this.x);
      this.view.y = this.metersToPixels(this.y);
      this.view.rotation = this.direction;
    }
}

export default CarObject;