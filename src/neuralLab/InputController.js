import * as PIXI from 'pixi.js';
import Slider from '../ui/Slider';
import RadarBeamSlider from './RadarBeamSlider';
import { getUiTurnIconTexture, getUiThrottleIconTexture, getUiSlipIconTexture } from '../loaders/AssetLoader';

export default class InputController extends PIXI.Container {
  constructor(radarBeamAngles) {
    super();

    // Y-position constants for each slider group (adjust these to move groups)
    const Y_POS_SPEED_THROTTLE_GROUP = 260;
    const Y_POS_SLIP_GROUP = 175;
    const Y_POS_YAW_TURN_GROUP = 40;

    // Offsets within each group
    const SLIDER_SPACING = 50; // spacing between sliders in a group
    const SLIP_ICON_OFFSET = 25; // offset for slip icon relative to slider

    this.background = new PIXI.Graphics();
    this.addChild(this.background);

    this.radarBeamSlider = new RadarBeamSlider(radarBeamAngles);
    this.addChild(this.radarBeamSlider);
    this.radarBeamSlider.x = 400;
    this.radarBeamSlider.y = 200;
    this.radarBeamSlider.on('change', () => {
      this.emit('change');
    });

    this.speedSlider = new Slider({
      min: 0,
      max: 200,
      value: 60,
      label: 'Speed',
      width: 200,
      height: 20,
      rightScaleLabel: 'MAX',
      leftScaleLabel: 'STOP',
      formatter: (value) => Math.round(value) + ' km/h',
    });
    this.addChild(this.speedSlider);
    this.speedSlider.on('change', () => {
      this.emit('change');
    });
    this.speedSlider.x = 100;
    this.speedSlider.y = Y_POS_SPEED_THROTTLE_GROUP;

    this.throttleSlider = new Slider({
      min: -1,
      max: 1,
      value: 0.5,
      label: 'Throttle',
      width: 200,
      height: 20,
      rightScaleLabel: 'Gas',
      leftScaleLabel: 'Break',
      formatter: (value) => Math.round(value * 100) + '%',
    });
    this.addChild(this.throttleSlider);
    this.throttleSlider.on('change', () => {
      this.emit('change');
    });
    this.throttleSlider.x = 100;
    this.throttleSlider.y = Y_POS_SPEED_THROTTLE_GROUP + SLIDER_SPACING;

    this.slipRatioSlider = new Slider({
      min: -0.5,
      max: 0.5,
      value: 0,
      label: 'Slip Ratio',
      width: 200,
      height: 20,
      rightScaleLabel: 'Left',
      leftScaleLabel: 'Right',
      formatter: (value) => Math.round(value * 200) + '%',
    });
    this.addChild(this.slipRatioSlider);
    this.slipRatioSlider.on('change', () => {
      this.emit('change');
    });
    this.slipRatioSlider.x = 100;
    this.slipRatioSlider.y = Y_POS_SLIP_GROUP;

    this.yawRateSlider = new Slider({
      min: -2,
      max: 2,
      value: 0,
      label: 'Yaw Rate',
      width: 200,
      height: 20,
      rightScaleLabel: 'CCW',
      leftScaleLabel: 'CW',
      formatter: (value) => Math.round(value * 180 / Math.PI) + '°/s',
    });
    this.addChild(this.yawRateSlider);
    this.yawRateSlider.on('change', () => {
      this.emit('change');
    });
    this.yawRateSlider.x = 100;
    this.yawRateSlider.y = Y_POS_YAW_TURN_GROUP;
    
    this.turnSlider = new Slider({
      min: -1,
      max: 1,
      value: 0,
      label: 'Steering Wheel',
      width: 200,
      height: 20,
      rightScaleLabel: 'Right',
      leftScaleLabel: 'Left',
    });
    this.addChild(this.turnSlider);
    this.turnSlider.on('change', () => {
      this.emit('change');
    });
    this.turnSlider.x = 100;
    this.turnSlider.y = Y_POS_YAW_TURN_GROUP + SLIDER_SPACING;


    this.throttleIcon = new PIXI.Sprite(
      getUiThrottleIconTexture()
    );
    this.addChild(this.throttleIcon);
    this.throttleIcon.scale.set(0.5);
    this.throttleIcon.anchor.set(0.5);
    this.throttleIcon.x = 50;
    this.throttleIcon.y = Y_POS_SPEED_THROTTLE_GROUP + SLIDER_SPACING;

    this.turnIcon = new PIXI.Sprite(
      getUiTurnIconTexture()
    );
    this.addChild(this.turnIcon);
    this.turnIcon.scale.set(0.5);
    this.turnIcon.anchor.set(0.5);
    this.turnIcon.x = 50;
    this.turnIcon.y = Y_POS_YAW_TURN_GROUP + SLIDER_SPACING;

    this.slipIcon = new PIXI.Sprite(
      getUiSlipIconTexture()
    );
    this.addChild(this.slipIcon);
    this.slipIcon.scale.set(0.5);
    this.slipIcon.anchor.set(0.5);
    this.slipIcon.x = 50;
    this.slipIcon.y = Y_POS_SLIP_GROUP + SLIP_ICON_OFFSET;

    this.drawIconClamp(this.slipIcon, 80);
    this.drawIconClamp(this.turnIcon, 120);
    this.drawIconClamp(this.throttleIcon, 120);

  }

  get canvasWidth() {
    return 700;
  }
  get canvasHeight() {
    return 400;
  }

  drawIconClamp(icon, height) {
    const iconMargin = 5;
    const clapLength = 250
    this.background.moveTo(icon.x, icon.y + icon.height/2 + iconMargin);
    this.background.lineTo(icon.x, icon.y + height/2);
    this.background.lineTo(icon.x + clapLength, icon.y + height/2);
    this.background.moveTo(icon.x, icon.y - icon.height/2 - iconMargin);
    this.background.lineTo(icon.x, icon.y - height/2);
    this.background.lineTo(icon.x + clapLength, icon.y - height/2);

    this.background.stroke({ color: 0xffffff, alpha: 0.2 });
  }

  /**
   * Get all input values needed for network processing
   * @returns {Object} Object containing radarBeamValues, speed, turn, throttle, yawRate, slipRatio
   */
  getInputValues() {
    return {
      radarBeamValues: this.radarBeamSlider.getValues(),
      speed: this.speedSlider.value / 3.6,
      turn: this.turnSlider.value,
      throttle: this.throttleSlider.value,
      yawRate: this.yawRateSlider.value,
      slipRatio: this.slipRatioSlider.value,
    };
  }
}
