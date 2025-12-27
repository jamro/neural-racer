import CarObject from './CarObject';
import NeuralNet from '../../neuralEvolution/NeuralNet';

class NeuralCarObject extends CarObject {
    constructor(track, scoreWeights, genome=null) {
        super(track, scoreWeights);

        this.neuralNet = new NeuralNet(
          [14, 32, 24, 2],
          ["leaky_relu", "leaky_relu", "tanh"],
          genome
        );
        this.genome = this.neuralNet.genome;

        this.prevTurnControl = 0
    }

    calculateLeftRightBalance() {
      const n = this.radarBeamCount;
      if (n < 7) throw new Error("radarBeams length must be at least 7");
    
      const Rmax = 100; // maximum radar range in meters
      const eps = 1e-6;
    
      // 3 extreme left and 3 extreme right beams
      const leftIdx  = [0, 1, 2];
      const rightIdx = [n - 1, n - 2, n - 3];
    
      let L = 0, R = 0;
    
      for (const i of leftIdx)  {
        L += this.radarBeams[i] === null ? Rmax : this.radarBeams[i];
      }
      for (const i of rightIdx) {
        R += this.radarBeams[i] === null ? Rmax : this.radarBeams[i];
      }
    
      L /= leftIdx.length;
      R /= rightIdx.length;
    
      // stable normalization to [-1, 1]
      const balanceRaw = (L - R) / (L + R + eps);
      
      // smoothing the balance value to reduce noise
      const alpha = 0.2;
      this.balanceEMA = this.balanceEMA ?? balanceRaw;
      this.balanceEMA = this.balanceEMA + alpha * (balanceRaw - this.balanceEMA);

      return this.balanceEMA;
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
      
      const timeToCollision = Math.abs(this.speed) > 0.1 ? minFront / this.speed : 1000;
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
      inputs.push(Math.exp(-this.calculateTimeToCollision()/0.5));

      // use safe direction as input (index 13)
      const radarAngleMin = this.radarBeamAngles[0]
      const radarAngleMax = this.radarBeamAngles[this.radarBeamCount - 1]
      const normalizedSafeDirection = 2*(this.safeDirection - radarAngleMin) / (radarAngleMax - radarAngleMin) - 1
      inputs.push(normalizedSafeDirection);

      const outputs = this.neuralNet.forward(inputs);

      this.debug = inputs[13].toFixed(3)
      
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