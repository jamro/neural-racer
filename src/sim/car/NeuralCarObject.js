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
      const k = 0.2; // empirical value, recommended value between 0.2 and 0.4
      for (let i = 0; i < this.radarBeamCount; i++) {
        const d = this.radarBeams[i] // meters
        inputs[i] = d === null ? 0 : Math.exp(-k * d) // 0 means no obstacle, 1 means close to obstacle
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