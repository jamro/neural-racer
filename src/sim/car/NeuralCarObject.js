import CarObject from './CarObject';
import NeuralNet from '../../neuralEvolution/NeuralNet';
import { NeuralNormalizer } from './neuralNormalizer';
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
 *  9. Short Range Time To Collision (derived from Radar #4-#6 + Speed)
 * 10. Long Range Time To Collision (derived from Radar #4-#6 + Speed)
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

        this.inputsNormalizer = new NeuralNormalizer(
          this.radarBeamAngles, 
          this.length, 
          this.maxSpeed, 
          this.model.yawRateMax,
          0.5
        )
        this.prevTurnControl = 0
        this.prevThrottleControl = 0
    }

    control(delta) {
      if (this.isCrashed || this.isFinished) {
        return;
      }

      const inputs = this.inputsNormalizer.normalize(
        this.radarBeams, 
        this.speed, 
        this.prevTurnControl, 
        this.prevThrottleControl, 
        this.model.yawRate, 
        this.model.slipRatio
      )

      const outputs = this.neuralNet.forward(inputs);
      
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