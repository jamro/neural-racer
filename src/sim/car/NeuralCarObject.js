import CarObject from './CarObject';
import NeuralNet from '../../neuralEvolution/NeuralNet';

class NeuralCarObject extends CarObject {
    constructor(track, scoreWeights, genome=null) {
        super(track, scoreWeights);

        this.neuralNet = new NeuralNet(
          [13, 32, 24, 2],
          ["leaky_relu", "leaky_relu", "tanh"],
          genome
        );
        this.genome = this.neuralNet.genome;

        this.prevTurnControl = 0
    }

    calculateLeftRightBalance() {
      if (this.radarBeams.length < 7) {
        throw new Error('radarBeams length must be at least 7. Otherside you must adjust indexes in calculateLeftRightBalance()');
      }
      const leftBeamsIndexes = [0, 1, 2]
      const rightBeamsIndexes = [this.radarBeamCount - 1, this.radarBeamCount - 2, this.radarBeamCount - 3]
      
      let leftBeamsDistance = 0
      let rightBeamsDistance = 0
      for (let i = 0; i < this.radarBeamCount; i++) {
        if (leftBeamsIndexes.includes(i)) {
          leftBeamsDistance += this.radarBeams[i] !== null ? this.radarBeams[i] : 100
        }
        if (rightBeamsIndexes.includes(i)) {
          rightBeamsDistance += this.radarBeams[i] !== null ? this.radarBeams[i] : 100
        }
      }
      leftBeamsDistance /= leftBeamsIndexes.length
      rightBeamsDistance /= rightBeamsIndexes.length
      let diff = leftBeamsDistance - rightBeamsDistance

      const scaleMeters = 10;
      return Math.tanh(diff / scaleMeters);
    }

    calculateTimeToCollision() {
      const centerBeamIndex = Math.floor(this.radarBeamCount / 2)
      let minFront = this.radarBeams[centerBeamIndex] !== null ? this.radarBeams[centerBeamIndex] : Infinity
      minFront = Math.min(
        minFront, 
        this.radarBeams[centerBeamIndex - 1] !== null ? this.radarBeams[centerBeamIndex - 1] : Infinity
      )
      minFront = Math.min(
        minFront, 
        this.radarBeams[centerBeamIndex + 1] !== null ? this.radarBeams[centerBeamIndex + 1] : Infinity
      )
      minFront = Math.max(0, minFront - this.width/2)
      
      const timeToCollision = minFront / this.speed
      return timeToCollision
    }


    update(delta) {
      if (this.isCrashed || this.isFinished) {
        super.update(delta);
        return;
      }

      const inputs = []
      const kArray = [ // adjust the decay rate of the radar beams. central beams are longer
        0.1198, // range: 25m
        0.0999, // range: 30m
        0.0749, // range: 40m
        0.0599, // range: 50m
        0.0428, // range: 70m
        0.0599, // range: 50m
        0.0749, // range: 40m
        0.0999, // range: 30m
        0.1198, // range: 25m
      ];
      if (kArray.length !== this.radarBeamCount) {
        throw new Error('kArray length must match radarBeamCount');
      }
      for (let i = 0; i < this.radarBeamCount; i++) {
        const d = this.radarBeams[i] // meters
        inputs[i] = d === null ? 0 : Math.exp(-kArray[i] * d) // 0 means no obstacle, 1 means close to obstacle
      }

      // use speed as input (index 9)
      inputs.push(Math.min(this.speed / this.maxSpeed, 1))

      // use previous turn control as input (index 10) 
      inputs.push(this.prevTurnControl);

      // use left right balance as input (index 11)
      inputs.push(this.calculateLeftRightBalance());

      // use time to collision as input (index 12)
      inputs.push(Math.exp(-this.calculateTimeToCollision()/0.8));

      const outputs = this.neuralNet.forward(inputs);

      this.debug = inputs[12].toFixed(3)
      
      const throttleOutput = outputs[0];
      const turnOutput = outputs[1];

      if (throttleOutput > 0) {
        this.throttle(throttleOutput);
      } else {
        this.breakCar(-throttleOutput);
      }
      this.turn(turnOutput);
      this.prevTurnControl = turnOutput;
      super.update(delta);
    }
}

export default NeuralCarObject;