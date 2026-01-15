import * as PIXI from 'pixi.js';

// Visual style shared with RadarBeamSlider
// Knob color depends on sign of current value (0 treated as positive)
const KNOB_COLOR_POSITIVE = 0xFF6600;
const KNOB_COLOR_NEGATIVE = 0x6666FF;
const KNOB_STROKE_COLOR = 0xffffff;
const KNOB_STROKE_WIDTH = 2;
// Sizing aligned with RadarBeamSlider
const KNOB_RADIUS_PX = 5;
const TRACK_HEIGHT_PX = 2;
const TRACK_PADDING_PX = 10;
const HIT_AREA_PADDING_PX = 10;
// Knob glow (halo) styling
const KNOB_GLOW_ALPHA = 0.18; // 0 disables glow
const KNOB_GLOW_RADIUS_MULT = 2.4; // outer glow radius multiplier (relative to knob radius)
const KNOB_GLOW_STEPS = 3; // number of layered circles to fake a soft glow
// Track styling (compatible with RadarBeamSlider beam colors)
const TRACK_BACKGROUND_COLOR = 0xffffff;
const TRACK_BACKGROUND_ALPHA = 0.2;
// Bar (filled) color depends on sign of current value
const TRACK_FILL_COLOR_POSITIVE = 0xFF6600;
const TRACK_FILL_COLOR_NEGATIVE = 0x6666FF;
// Scale label (small text under slider)
const SCALE_LABEL_COLOR = 0x888888;
const SCALE_LABEL_FONT_SIZE = 8;
const SCALE_LABEL_LINE_HEIGHT = 12;
const SCALE_LABEL_PADDING_TOP_PX = -8;

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
   * @param {string} [opts.leftScaleLabel=''] Optional small text rendered under the left side of the slider track.
   * @param {string} [opts.rightScaleLabel=''] Optional small text rendered under the right side of the slider track.
   * @param {number} [opts.width=200]
   * @param {number} [opts.height=20]
   * @param {number|null} [opts.step=null] If provided, value will snap to increments of step.
   * @param {(value:number)=>string} [opts.formatter] Format displayed value (defaults to `toFixed(2)`).
   * @param {(value:number)=>string} [opts.valueFormatter] Backward-compatible alias for `formatter`.
   * @param {object} [opts.textStyle] PIXI.Text style overrides.
   * @param {object} [opts.colors]
   * @param {number} [opts.colors.trackBg]
   * @param {number} [opts.colors.trackFill]
   * @param {number} [opts.colors.knob]
   * @param {number} [opts.colors.knobStroke]
   * @param {number} [opts.colors.knobStrokeWidth]
   * @param {number} [opts.colors.knobGlowAlpha]
   * @param {number} [opts.colors.knobGlowRadiusMult]
   * @param {number} [opts.colors.knobGlowSteps]
   */
  constructor(opts = {}) {
    super();

    const {
      min = 0,
      max = 1,
      value = min,
      label = '',
      leftScaleLabel = '',
      rightScaleLabel = '',
      width = 200,
      height = 20,
      step = null,
      formatter = null,
      valueFormatter = null,
      textStyle = {},
      colors = {},
    } = opts;

    this._min = min;
    this._max = max;
    this._value = value;
    this._label = label;
    this._leftScaleLabel = leftScaleLabel ?? '';
    this._rightScaleLabel = rightScaleLabel ?? '';
    this._width = width;
    this._height = height;
    this._step = step;
    const pickedFormatter =
      (typeof formatter === 'function' && formatter) ||
      (typeof valueFormatter === 'function' && valueFormatter) ||
      null;
    this._valueFormatter =
      pickedFormatter ||
      ((v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return '';
        return n.toFixed(2);
      });

    this._colors = {
      // Defaults match RadarBeamSlider style; can be overridden via opts.colors
      trackBg: TRACK_BACKGROUND_COLOR,
      trackBgAlpha: TRACK_BACKGROUND_ALPHA,
      // Sign-based colors (used for bar + knob + glow)
      positiveColor: TRACK_FILL_COLOR_POSITIVE,
      negativeColor: TRACK_FILL_COLOR_NEGATIVE,
      knobStroke: KNOB_STROKE_COLOR,
      knobStrokeWidth: KNOB_STROKE_WIDTH,
      knobGlowAlpha: KNOB_GLOW_ALPHA,
      knobGlowRadiusMult: KNOB_GLOW_RADIUS_MULT,
      knobGlowSteps: KNOB_GLOW_STEPS,
      ...colors,
    };

    this._dragging = false;
    this._pointerId = null;

    this._textLineHeight = 16;
    this._scaleTextLineHeight = SCALE_LABEL_LINE_HEIGHT;

    this.labelTextField = new PIXI.Text();
    this.labelTextField.style = {
      fontFamily: 'Exo2',
      fontSize: 12,
      lineHeight: this._textLineHeight,
      fill: 0xffffff,
      ...textStyle,
    };
    this.labelTextField.text = this._label || '';
    if (this.labelTextField.anchor?.set) this.labelTextField.anchor.set(0, 0);
    this.addChild(this.labelTextField);

    this.valueTextField = new PIXI.Text();
    this.valueTextField.style = {
      fontFamily: 'Exo2',
      fontSize: 12,
      lineHeight: this._textLineHeight,
      align: 'right',
      fill: 0xffffff,
      ...textStyle,
    };
    this.valueTextField.text = '';
    if (this.valueTextField.anchor?.set) this.valueTextField.anchor.set(1, 0);
    this.addChild(this.valueTextField);

    // Masks to ensure text never renders outside the track width.
    this._textMask = new PIXI.Graphics();
    this.addChild(this._textMask);
    this.labelTextField.mask = this._textMask;
    this.valueTextField.mask = this._textMask;

    this.leftScaleLabelTextField = new PIXI.Text();
    this.leftScaleLabelTextField.style = {
      fontFamily: 'Exo2',
      fontSize: SCALE_LABEL_FONT_SIZE,
      lineHeight: this._scaleTextLineHeight,
      fill: SCALE_LABEL_COLOR,
      ...textStyle,
    };
    this.leftScaleLabelTextField.text = this._leftScaleLabel || '';
    if (this.leftScaleLabelTextField.anchor?.set) this.leftScaleLabelTextField.anchor.set(0, 0);
    this.addChild(this.leftScaleLabelTextField);

    this.rightScaleLabelTextField = new PIXI.Text();
    this.rightScaleLabelTextField.style = {
      fontFamily: 'Exo2',
      fontSize: SCALE_LABEL_FONT_SIZE,
      lineHeight: this._scaleTextLineHeight,
      align: 'right',
      fill: SCALE_LABEL_COLOR,
      ...textStyle,
    };
    this.rightScaleLabelTextField.text = this._rightScaleLabel || '';
    if (this.rightScaleLabelTextField.anchor?.set) this.rightScaleLabelTextField.anchor.set(1, 0);
    this.addChild(this.rightScaleLabelTextField);

    this._scaleTextMask = new PIXI.Graphics();
    this.addChild(this._scaleTextMask);
    this.leftScaleLabelTextField.mask = this._scaleTextMask;
    this.rightScaleLabelTextField.mask = this._scaleTextMask;

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

  _isNegativeValue() {
    return this._value < 0;
  }

  _signedColor() {
    return this._isNegativeValue() ? this._colors.negativeColor : this._colors.positiveColor;
  }

  _zeroValue() {
    return Math.max(this._min, Math.min(this._max, 0));
  }

  _drawGlowAndKnob({ x, y, r, color }) {
    // Glow (soft halo behind knob)
    const glowSteps = Math.max(0, Math.floor(this._colors.knobGlowSteps ?? 0));
    const glowAlpha = Number(this._colors.knobGlowAlpha ?? 0);
    const glowRadiusMult = Number(this._colors.knobGlowRadiusMult ?? 1);
    if (glowAlpha > 0 && glowSteps > 0 && glowRadiusMult > 1) {
      for (let s = glowSteps; s >= 1; s--) {
        const t = s / glowSteps;
        const rr = r * (1 + (glowRadiusMult - 1) * t);
        const a = glowAlpha * t * t;
        this.knob.circle(x, y, rr);
        this.knob.fill({ color, alpha: a });
      }
    }

    // Main knob + stroke
    this.knob.circle(x, y, r);
    this.knob.fill({ color, alpha: 1 });
    const strokeWidth = Number(this._colors.knobStrokeWidth ?? KNOB_STROKE_WIDTH);
    this.knob.stroke({ color: this._colors.knobStroke ?? KNOB_STROKE_COLOR, width: strokeWidth });
  }

  get label() {
    return this._label;
  }

  set label(v) {
    this._label = v ?? '';
    this.labelTextField.text = this._label;
    this.redraw();
  }

  get leftScaleLabel() {
    return this._leftScaleLabel;
  }

  set leftScaleLabel(v) {
    this._leftScaleLabel = v ?? '';
    this.leftScaleLabelTextField.text = this._leftScaleLabel;
    this.redraw();
  }

  get rightScaleLabel() {
    return this._rightScaleLabel;
  }

  set rightScaleLabel(v) {
    this._rightScaleLabel = v ?? '';
    this.rightScaleLabelTextField.text = this._rightScaleLabel;
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

    const hasTopText = Boolean(this.labelTextField.text) || Boolean(this.valueTextField.text);
    const topTextOffsetY = hasTopText ? this._textLineHeight : 0;

    const hasScaleText =
      Boolean(this.leftScaleLabelTextField.text) || Boolean(this.rightScaleLabelTextField.text);
    const scaleTextOffsetY = hasScaleText ? this._scaleTextLineHeight + SCALE_LABEL_PADDING_TOP_PX : 0;

    const padding = TRACK_PADDING_PX;
    const trackH = TRACK_HEIGHT_PX;
    const knobR = KNOB_RADIUS_PX;

    const trackX = padding;
    const trackW = Math.max(1, w - padding * 2);
    const trackY = topTextOffsetY + Math.round(h / 2 - trackH / 2);

    // Use a hitArea so the whole control is easily clickable (aligned with RadarBeamSlider padding feel).
    this.hitArea = new PIXI.Rectangle(
      -HIT_AREA_PADDING_PX,
      -HIT_AREA_PADDING_PX,
      w + HIT_AREA_PADDING_PX * 2,
      topTextOffsetY + h + scaleTextOffsetY + HIT_AREA_PADDING_PX * 2
    );

    const t = this._valueToT(this._value);
    const t0 = this._valueToT(this._zeroValue());
    const knobX = trackX + trackW * t;
    const knobY = topTextOffsetY + Math.round(h / 2);

    // Layout text row
    if (hasTopText) {
      this.labelTextField.x = trackX;
      this.labelTextField.y = 0;
      this.valueTextField.y = 0;
      this.valueTextField.x = trackX + trackW;

      // Clip both texts to the track width so they don't render outside.
      this._textMask.clear();
      this._textMask.rect(trackX, 0, trackW, this._textLineHeight);
      this._textMask.fill({ color: 0xffffff, alpha: 1 });
    } else {
      // No text → clear mask to avoid stale geometry.
      this._textMask.clear();
    }

    // Layout scale labels under the slider
    if (hasScaleText) {
      const scaleY = topTextOffsetY + h + SCALE_LABEL_PADDING_TOP_PX;
      this.leftScaleLabelTextField.x = trackX;
      this.leftScaleLabelTextField.y = scaleY;
      this.rightScaleLabelTextField.x = trackX + trackW;
      this.rightScaleLabelTextField.y = scaleY;

      this._scaleTextMask.clear();
      this._scaleTextMask.rect(trackX, scaleY, trackW, this._scaleTextLineHeight);
      this._scaleTextMask.fill({ color: 0xffffff, alpha: 1 });
    } else {
      this._scaleTextMask.clear();
    }

    this.trackBg.clear();
    this.trackBg.rect(trackX, trackY, trackW, trackH);
    this.trackBg.fill({ color: this._colors.trackBg, alpha: Number(this._colors.trackBgAlpha ?? TRACK_BACKGROUND_ALPHA) });

    this.trackFill.clear();
    // Filled portion is always drawn from the 0-position to current value.
    const fillT0 = Math.min(t0, t);
    const fillT1 = Math.max(t0, t);
    const fillX = trackX + trackW * fillT0;
    const fillW = Math.max(0, trackW * (fillT1 - fillT0));
    if (fillW > 0) {
      const fillColor = this._signedColor();
      this.trackFill.rect(fillX, trackY, fillW, trackH);
      this.trackFill.fill({ color: fillColor, alpha: 1 });
    }

    this.knob.clear();
    this._drawGlowAndKnob({ x: knobX, y: knobY, r: knobR, color: this._signedColor() });
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
    const padding = TRACK_PADDING_PX;
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
