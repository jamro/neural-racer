import CarObject from './CarObject';
import NeuralNet from '../../neuralEvolution/NeuralNet';

class NeuralCarObject extends CarObject {
    constructor(track, scoreWeights, genome=null) {
        super(track, scoreWeights);

        this.neuralNet = new NeuralNet(
          [10, 32, 32, 2],
          ["leaky_relu", "leaky_relu", "tanh"],
          genome
        );
        this.genome = this.neuralNet.genome;
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
      // use speed as input
      inputs[this.radarBeamCount] = Math.min(this.speed / this.maxSpeed, 1);

      const outputs = this.neuralNet.forward(inputs);

      this.debug = inputs[9].toFixed(3)
      
      const throttleOutput = outputs[0];
      const turnOutput = outputs[1];

      if (throttleOutput > 0) {
        this.throttle(throttleOutput);
      } else {
        this.breakCar(-throttleOutput);
      }
      this.turn(turnOutput);



      super.update(delta);

    }
}

export default NeuralCarObject;