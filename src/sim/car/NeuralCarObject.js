import CarObject from './CarObject';
import NeuralNet from '../../neuralEvolution/NeuralNet';

/**
 * Neural Network Architecture:
 * 
 * Inputs:
 * --- RADAR GROUP ----
 *  0. Radar Beam #1
 *  1. Radar Beam #2
 *  2. Radar Beam #3
 *  3. Radar Beam #4
 *  4. Radar Beam #5
 *  5. Radar Beam #6
 *  6. Radar Beam #7
 *  7. Radar Beam #8
 *  8. Radar Beam #9
 *  9. Long Range Time To Collision (derived from Radar #4-#6 + Speed)
 * 10. Short Range Time To Collision (derived from Radar #4-#6 + Speed)
 * 11. Left Right Balance (derived from Radar, #1-#3 and #7-#9)
 * 12. Safe Direction (derived from Radar)
 * --- STEERING GROUP ----
 * 13. Previous Turn Control
 * 14. Previous Throttle Control
 * 15. Yaw Rate
 * 16. Slip Ratio
 * --- SPEED GROUP ----
 * 17. Speed
 * 
 * Outputs:
 *  0. Turn
 *  1. Throttle
 */

class NeuralCarObject extends CarObject {
    constructor(genome=null) {
        super();

        this.neuralNet = new NeuralNet(
          [18, 32, 24, 2],
          ["leaky_relu", "leaky_relu", "tanh"],
          genome
        );
        this.genome = this.neuralNet.genome;

        this.prevTurnControl = 0
        this.prevThrottleControl = 0
    }

    calculateLeftRightBalance() {
      const n = this.radarBeamCount-1;
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
      minFront = Math.max(0, minFront - this.length/2)
      
      const timeToCollision = Math.abs(this.speed) > 0.1 ? minFront / this.speed : 1000;
      return timeToCollision
    }


    control(delta) {
      if (this.isCrashed || this.isFinished) {
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

      // use short range time to collision as input (index 9)
      const timeToCollision = this.calculateTimeToCollision();
      inputs.push(Math.exp(-Math.min(timeToCollision, 10.0)/1.5));

      // use long range TTC as input (index 10)
      const ttcMax = 8.0;
      const ttcLinear = 1 - Math.min(timeToCollision, ttcMax) / ttcMax;
      inputs.push(Math.max(0, ttcLinear));

      // use left right balance as input (index 11)
      inputs.push(this.calculateLeftRightBalance());

      // use safe direction as input (index 12)
      const radarAngleMin = this.radarBeamAngles[0]
      const radarAngleMax = this.radarBeamAngles[this.radarBeamCount - 1]
      const normalizedSafeDirection = 2*(this.safeDirection - radarAngleMin) / (radarAngleMax - radarAngleMin) - 1
      inputs.push(normalizedSafeDirection);

      // use previous turn control as input (index 13) 
      inputs.push(this.prevTurnControl);
      
      // use previous turn control as input (index 14) 
      inputs.push(this.prevThrottleControl);

      // use yaw rate as input (index 15)
      const yawIn = Math.tanh(2 * this.model.yawRate / this.model.yawRateMax);
      inputs.push(yawIn);

      // use slip ratio as input (index 16)
      const slipScale = 0.5
      inputs.push(Math.max(-1, Math.min(1, this.model.slipRatio / slipScale)));

      // use speed as input (index 17)
      const v01 = Math.min(Math.abs(this.speed) / this.maxSpeed, 1)
      inputs.push(Math.sqrt(v01)) // sqrt to make small values more visible and give better control


      const outputs = this.neuralNet.forward(inputs);

      this.debug = inputs[15].toFixed(2)
      
      const turnOutput = outputs[0];
      const throttleOutput = outputs[1];

      if (throttleOutput > 0) {
        this.throttle(throttleOutput);
      } else {
        this.breakCar(-throttleOutput);
      }
      this.turn(turnOutput);
      this.prevTurnControl = turnOutput;
      this.prevThrottleControl = throttleOutput;
    }
}

export default NeuralCarObject;