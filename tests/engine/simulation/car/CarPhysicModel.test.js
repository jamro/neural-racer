import CarPhysicModel from '../../../../src/engine/simulation/car/CarPhysicModel';

describe('CarPhysicModel', () => {
  it('limits steering rate per step', () => {
    const car = new CarPhysicModel();
    car.turn(1); // full right
    car.updateStep(0.1); // delta limited by steerRate * delta
    expect(car.delta).toBeCloseTo(0.3, 3); // steerRate 3 rad/s * 0.1s
  });

  it('applies friction circle clamping', () => {
    const car = new CarPhysicModel();
    const { Fx, Fy } = car._applyFrictionCircle(10, 0, 5);
    expect(Math.hypot(Fx, Fy)).toBeCloseTo(5);
  });
});
