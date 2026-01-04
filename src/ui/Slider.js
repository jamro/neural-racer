import * as PIXI from 'pixi.js';

/**
 * Simple PixiJS slider (Pixi v8 friendly).
 *
 * Events:
 * - 'change' (value: number): fired whenever the value changes (dragging or click).
 */
class Slider extends PIXI.Container {
  /**
   * @param {object} opts
   * @param {number} [opts.min=0]
   * @param {number} [opts.max=1]
   * @param {number} [opts.value=opts.min]
   * @param {string} [opts.label='']
   * @param {number} [opts.width=200]
   * @param {number} [opts.height=20]
   * @param {number|null} [opts.step=null] If provided, value will snap to increments of step.
   * @param {(value:number)=>string} [opts.valueFormatter] Format displayed value (defaults to a compact rounding).
   * @param {object} [opts.textStyle] PIXI.Text style overrides.
   * @param {object} [opts.colors]
   * @param {number} [opts.colors.trackBg=0x333333]
   * @param {number} [opts.colors.trackFill=0xffffff]
   * @param {number} [opts.colors.knob=0xffffff]
   */
  constructor(opts = {}) {
    super();

    const {
      min = 0,
      max = 1,
      value = min,
      label = '',
      width = 200,
      height = 20,
      step = null,
      valueFormatter = null,
      textStyle = {},
      colors = {},
    } = opts;

    this._min = min;
    this._max = max;
    this._value = value;
    this._label = label;
    this._width = width;
    this._height = height;
    this._step = step;
    this._valueFormatter =
      typeof valueFormatter === 'function'
        ? valueFormatter
        : (v) => {
            // Compact display that avoids float noise (esp. when snapping).
            const rounded = Math.round(v * 1000) / 1000;
            return String(rounded);
          };

    this._colors = {
      trackBg: 0x333333,
      trackFill: 0xffffff,
      knob: 0xffffff,
      ...colors,
    };

    this._dragging = false;
    this._pointerId = null;

    this._textLineHeight = 16;

    this.labelTextField = new PIXI.Text();
    this.labelTextField.style = {
      fontFamily: 'Courier New',
      fontSize: 12,
      lineHeight: this._textLineHeight,
      fill: 0xffffff,
      ...textStyle,
    };
    this.labelTextField.text = this._label || '';
    this.addChild(this.labelTextField);

    this.valueTextField = new PIXI.Text();
    this.valueTextField.style = {
      fontFamily: 'Courier New',
      fontSize: 12,
      lineHeight: this._textLineHeight,
      align: 'right',
      fill: 0xffffff,
      ...textStyle,
    };
    this.valueTextField.text = '';
    this.addChild(this.valueTextField);

    this.trackBg = new PIXI.Graphics();
    this.trackFill = new PIXI.Graphics();
    this.knob = new PIXI.Graphics();

    this.addChild(this.trackBg);
    this.addChild(this.trackFill);
    this.addChild(this.knob);

    // Enable pointer events (Pixi v8).
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerdown', this._onPointerDown, this);
    this.on('pointermove', this._onPointerMove, this);
    this.on('pointerup', this._onPointerUp, this);
    this.on('pointerupoutside', this._onPointerUp, this);

    this._applyRangeAndClamp({ emitIfClamped: false });
    this.redraw();
  }

  get label() {
    return this._label;
  }

  set label(v) {
    this._label = v ?? '';
    this.labelTextField.text = this._label;
    this.redraw();
  }

  get min() {
    return this._min;
  }

  set min(v) {
    this.setRange(v, this._max);
  }

  get max() {
    return this._max;
  }

  set max(v) {
    this.setRange(this._min, v);
  }

  get value() {
    return this._value;
  }

  set value(v) {
    this.setValue(v, { emit: true });
  }

  get step() {
    return this._step;
  }

  set step(v) {
    this._step = v ?? null;
    // re-snap current value
    this.setValue(this._value, { emit: true });
  }

  get controlWidth() {
    return this._width;
  }

  set controlWidth(w) {
    this._width = w;
    this.redraw();
  }

  get controlHeight() {
    return this._height;
  }

  set controlHeight(h) {
    this._height = h;
    this.redraw();
  }

  /**
   * @param {number} min
   * @param {number} max
   */
  setRange(min, max) {
    this._min = min;
    this._max = max;
    this._applyRangeAndClamp({ emitIfClamped: true });
    this.redraw();
  }

  /**
   * @param {number} v
   * @param {object} [opts]
   * @param {boolean} [opts.emit=true]
   */
  setValue(v, opts = {}) {
    const { emit = true } = opts;

    const next = this._clampAndSnap(v);
    if (next === this._value) return;

    this._value = next;
    this.redraw();
    if (emit) this.emit('change', this._value);
  }

  redraw() {
    const w = Math.max(1, this._width);
    const h = Math.max(1, this._height);

    // Update value display early (affects layout width)
    this.valueTextField.text = this._valueFormatter(this._value);

    const hasText = Boolean(this.labelTextField.text) || Boolean(this.valueTextField.text);
    const textOffsetY = hasText ? this._textLineHeight : 0;

    const padding = Math.max(8, Math.floor(h * 0.4));
    const trackH = Math.max(2, Math.floor(h * 0.2));
    const knobR = Math.max(6, Math.floor(h * 0.35));

    const trackX = padding;
    const trackW = Math.max(1, w - padding * 2);
    const trackY = textOffsetY + Math.round(h / 2 - trackH / 2);

    // Use a hitArea so the whole control is clickable.
    this.hitArea = new PIXI.Rectangle(0, 0, w, textOffsetY + h);

    const t = this._valueToT(this._value);
    const knobX = trackX + trackW * t;
    const knobY = textOffsetY + Math.round(h / 2);

    // Layout text row
    if (hasText) {
      this.labelTextField.x = 0;
      this.labelTextField.y = 0;
      this.valueTextField.y = 0;
      this.valueTextField.x = w - this.valueTextField.width;
    }

    this.trackBg.clear();
    this.trackBg.rect(trackX, trackY, trackW, trackH);
    this.trackBg.fill(this._colors.trackBg);

    this.trackFill.clear();
    this.trackFill.rect(trackX, trackY, trackW * t, trackH);
    this.trackFill.fill(this._colors.trackFill);

    this.knob.clear();
    this.knob.circle(knobX, knobY, knobR);
    this.knob.fill(this._colors.knob);
  }

  _applyRangeAndClamp({ emitIfClamped }) {
    // Normalize invalid ranges.
    if (!Number.isFinite(this._min)) this._min = 0;
    if (!Number.isFinite(this._max)) this._max = this._min + 1;
    if (this._max === this._min) this._max = this._min + 1;
    if (this._max < this._min) {
      const tmp = this._min;
      this._min = this._max;
      this._max = tmp;
    }

    const clamped = this._clampAndSnap(this._value);
    if (clamped !== this._value) {
      this._value = clamped;
      if (emitIfClamped) this.emit('change', this._value);
    }
  }

  _clampAndSnap(v) {
    let next = Number.isFinite(v) ? v : this._min;
    next = Math.max(this._min, Math.min(this._max, next));

    if (this._step != null && Number.isFinite(this._step) && this._step > 0) {
      const steps = Math.round((next - this._min) / this._step);
      next = this._min + steps * this._step;
      next = Math.max(this._min, Math.min(this._max, next));
    }

    // Avoid tiny float noise when snapping.
    const eps = 1e-10;
    if (Math.abs(next) < eps) next = 0;
    return next;
  }

  _valueToT(v) {
    const range = this._max - this._min;
    if (range <= 0) return 0;
    return (v - this._min) / range;
  }

  _tToValue(t) {
    const tt = Math.max(0, Math.min(1, t));
    return this._min + tt * (this._max - this._min);
  }

  _pointerToLocalX(e) {
    const p = e.getLocalPosition(this);
    return p.x;
  }

  _trackGeometry() {
    const w = Math.max(1, this._width);
    const h = Math.max(1, this._height);
    const padding = Math.max(8, Math.floor(h * 0.4));
    const trackX = padding;
    const trackW = Math.max(1, w - padding * 2);
    return { trackX, trackW };
  }

  _setValueFromLocalX(localX, { emit }) {
    const { trackX, trackW } = this._trackGeometry();
    const t = (localX - trackX) / trackW;
    this.setValue(this._tToValue(t), { emit });
  }

  _onPointerDown(e) {
    this._dragging = true;
    this._pointerId = e.pointerId ?? null;
    this._setValueFromLocalX(this._pointerToLocalX(e), { emit: true });
  }

  _onPointerMove(e) {
    if (!this._dragging) return;
    if (this._pointerId != null && e.pointerId != null && e.pointerId !== this._pointerId) return;
    this._setValueFromLocalX(this._pointerToLocalX(e), { emit: true });
  }

  _onPointerUp(e) {
    if (!this._dragging) return;
    if (this._pointerId != null && e.pointerId != null && e.pointerId !== this._pointerId) return;
    this._dragging = false;
    this._pointerId = null;
  }
}

export default Slider;


