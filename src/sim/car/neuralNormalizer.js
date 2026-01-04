

export class NeuralNormalizer {
  constructor(radarBeamAngles, carLength=4, maxSpeed=55, yawRateMax=4.0, slipScale=0.5) {
    this.carLength = carLength;
    this.radarBeamAngles = radarBeamAngles;
    this.yawRateMax = yawRateMax;
    this.maxSpeed = maxSpeed;
    this.slipScale = slipScale
    this.safeDirection = 0;
    this.balance = 0;
  }

  normalize(radarBeams, speed, prevTurnControl, prevThrottleControl, yawRate, slipRatio, skipEMA=false) {
    const inputs = []

    const timeToCollision = calculateTimeToCollision(radarBeams, speed, this.carLength);
    this.safeDirection = calculateSafeDirection(radarBeams, this.radarBeamAngles, skipEMA ? null : this.safeDirection);
    this.balance = calculateLeftRightBalance(radarBeams, skipEMA ? null : this.balance);

    // inputs 0-8: radar beams
    inputs.push(...normalizeRadarBeams(radarBeams))
    // inputs 9: short range time to collision
    inputs.push(normalizeTimeToCollision(timeToCollision, false))
    // inputs 10: long range time to collision
    inputs.push(normalizeTimeToCollision(timeToCollision, true))
    // inputs 11: left right balance
    inputs.push(normalizeLeftRightBalance(this.balance))
    // inputs 12: safe direction
    inputs.push(normalizeSafeDirection(this.safeDirection, this.radarBeamAngles))
    // inputs 13: previous turn control
    inputs.push(normalizePreviousTurnControl(prevTurnControl))
    // inputs 14: previous throttle control
    inputs.push(normalizePreviousThrottleControl(prevThrottleControl))
    // inputs 15: yaw rate
    inputs.push(normalizeYawRate(yawRate, this.yawRateMax))
    // inputs 16: slip ratio
    inputs.push(normalizeSlipRatio(slipRatio, this.slipScale))
    // inputs 17: speed
    inputs.push(normalizeSpeed(speed, this.maxSpeed))

    return inputs
  }

}

export function normalizeRadarBeams(radarBeams) {
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
  if (kArray.length !== radarBeams.length) {
    throw new Error('kArray length must match radarBeamCount');
  }
  for (let i = 0; i < radarBeams.length; i++) {
    const d = radarBeams[i] // meters
    inputs[i] = d === null ? 0 : Math.exp(-kArray[i] * d) // 0 means no obstacle, 1 means close to obstacle
  }
  return inputs
}

export function normalizeTimeToCollision(timeToCollision, longRange=false) {
  if (longRange) {
    // long range time to collision is a linear function of the time to collision
    const ttcMax = 8.0;
    return 1 - Math.min(timeToCollision, ttcMax) / ttcMax;
  } else {
    // short range time to collision is an exponential function of the time to collision
    return Math.exp(-Math.min(timeToCollision, 10.0)/1.5)
  }
}

export function normalizeLeftRightBalance(balance) {
  return Math.max(-1, Math.min(1, balance))
}

export function normalizePreviousTurnControl(prevTurnControl) {
  return Math.max(-1, Math.min(1, prevTurnControl))
}
export function normalizePreviousThrottleControl(prevThrottleControl) {
  return Math.max(-1, Math.min(1, prevThrottleControl))
}

export function normalizeSafeDirection(safeDirection, radarBeamAngles) {
  const radarAngleMin = radarBeamAngles[0]
  const radarAngleMax = radarBeamAngles[radarBeamAngles.length - 1]
  const normalizedSafeDirection = 2*(safeDirection - radarAngleMin) / (radarAngleMax - radarAngleMin) - 1
  return normalizedSafeDirection;
}

export function normalizeYawRate(yawRate, yawRateMax) {
  return Math.tanh(2 * yawRate / (0.5 * yawRateMax)); // use half of the yaw rate max to saturate the output better
}

export function normalizeSlipRatio(slipRatio, slipScale) {
  return Math.max(-1, Math.min(1, slipRatio / slipScale))
}

export function normalizeSpeed(speed, maxSpeed) {
  const v01 = Math.min(Math.abs(speed) / maxSpeed, 1)
  return Math.sqrt(v01) // sqrt to make small values more visible and give better control
}

export function calculateTimeToCollision(radarBeams, speed, carLength) {
  const centerBeamIndex = Math.floor(radarBeams.length / 2)
  let minFront = radarBeams[centerBeamIndex] !== null ? radarBeams[centerBeamIndex] : Infinity
  minFront = Math.min(
    minFront, 
    radarBeams[centerBeamIndex - 1] !== null ? radarBeams[centerBeamIndex - 1] : Infinity
  )
  minFront = Math.min(
    minFront, 
    radarBeams[centerBeamIndex + 1] !== null ? radarBeams[centerBeamIndex + 1] : Infinity
  )
  minFront = Math.max(0, minFront - carLength/2)
  
  const timeToCollision = Math.abs(speed) > 0.1 ? minFront / speed : 1000;
  return timeToCollision
}

export function calculateSafeDirection(radarBeams, radarBeamAngles, prevSafeDirection=null) {
    // find safe direction
    let safeAngle = 0;
    let safeDistance = 0;
    for (let index = 0; index < radarBeams.length; index++) {
      const angle = radarBeamAngles[index]
      const distance = radarBeams[index]
      if (distance === null || distance > safeDistance) {
        safeAngle = angle;
        safeDistance = distance;
      }
    }
    const centralBeamIndex = Math.floor(radarBeams.length / 2);
    if(radarBeams[centralBeamIndex] === null) {
      safeAngle = 0;
    }
    if (prevSafeDirection === null) { // kip EMA
      return safeAngle;
    } else {
      return prevSafeDirection + (safeAngle - prevSafeDirection) * 0.15;
    }
}

export function calculateLeftRightBalance(radarBeams, balanceEMA=null) {
  const n = radarBeams.length-1;
  if (n < 7) throw new Error("radarBeams length must be at least 7");

  const Rmax = 100; // maximum radar range in meters
  const eps = 1e-6;

  // 3 extreme left and 3 extreme right beams
  const leftIdx  = [0, 1, 2];
  const rightIdx = [n - 1, n - 2, n - 3];

  let L = 0, R = 0;

  for (const i of leftIdx)  {
    L += radarBeams[i] === null ? Rmax : radarBeams[i];
  }
  for (const i of rightIdx) {
    R += radarBeams[i] === null ? Rmax : radarBeams[i];
  }

  L /= leftIdx.length;
  R /= rightIdx.length;

  // stable normalization to [-1, 1]
  const balanceRaw = (L - R) / (L + R + eps);
  
  // smoothing the balance value to reduce noise
  const alpha = 0.2;
  if (balanceEMA === null) { // skip EMA
    return balanceRaw;
  } else {
    balanceEMA = balanceEMA ?? balanceRaw;
    balanceEMA = balanceEMA + alpha * (balanceRaw - balanceEMA);
    return balanceEMA;
  }
}