import CarView from './CarView';
import SimulationObject from '../sim/SimulationObject';

class CarObject extends SimulationObject {
    constructor(track) {
        super();
        this.track = track;
        this.width = 4; // meters
        this.height = 2; // meters
        this.x = 0; // meters
        this.y = 0; // meters
        this.speed = 14; // meters/second
        this.turnRate = -1.5; // radians/second 
        this.direction = 0 // radians
        this.radarBeamCount = 5;
        this.radarBeams = new Array(this.radarBeamCount).fill(null);
        this.radarAngularRange = Math.PI*0.8;

        // create view
        this.view = new CarView(
          this.metersToPixels(this.width),
          this.metersToPixels(this.height),
          this.radarAngularRange
        );
    }

    update(delta) { // delta is in seconds
      this.direction += this.turnRate * delta;
      this.x += this.speed * Math.cos(this.direction) * delta;
      this.y += this.speed * Math.sin(this.direction) * delta;

      // update radar beams
      const angleStep = this.radarAngularRange / (this.radarBeams.length - 1);
      for (let index = 0; index < this.radarBeams.length; index++) {
        const angle = this.radarAngularRange / 2 - angleStep * index + this.direction
        this.radarBeams[index] = this.track.rayIntersectionsMinLength(this.x, this.y, angle);
      }
    }

    render(delta) { // delta is in seconds
      this.view.x = this.metersToPixels(this.x);
      this.view.y = this.metersToPixels(this.y);
      this.view.rotation = this.direction;

      const beamMaxLength = 40
      this.view.renderRadar(
        this.radarBeams.map(beam => this.metersToPixels(beam !== null ? beam : beamMaxLength))
      );
    }
}

export default CarObject;