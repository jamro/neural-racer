import { Container, Graphics, Sprite, Text } from 'pixi.js';
import NetworkPreview from './networkPreview/NetworkPreview';
import { getUiTurnIconTexture, getUiThrottleIconTexture } from '../../loaders/AssetLoader';
import { COLOR_POSITIVE, COLOR_NEGATIVE } from './networkPreview/NetworkPreviewConstants';
import CarSensorPreview from './CarSensorPreview';

// Layout constants
const LEFT_PADDING = 250;
const RIGHT_PADDING = 80;
const TOP_PADDING = 10;
const BOTTOM_PADDING = 10;

// Label positions as fractions of network diagram height
const LABEL_POSITIONS = {
  RADAR: 0.2,
  STEERING: 0.552,
  SPEED: 0.762,
};

// Icon configuration
const ICON_CONFIG = {
  SCALE: 0.45,
  ALPHA: 0.8,
  SPACING_FROM_DIAGRAM: 33,
  TURN_Y_POSITION: 0.25,
  THROTTLE_Y_POSITION: 0.75,
};

// Label configuration
const LABEL_CONFIG = {
  OFFSET_X: -55,
  OFFSET_Y: -7,
  CIRCLE_OFFSET: 23,
  CIRCLE_RADIUS: 5,
};

// Connection configuration
const CONNECTION_CONFIG = {
  BEND_X1_SCALE: 110,
  BEND_X2_SCALE: 10,
  RADAR_OFFSET_X: -24,
  STEERING_OFFSET_X: -10,
  STEERING_OFFSET_Y: -15,
  SPEED_OFFSET_X: 30,
  RADAR_FORK: 9,
  STEERING_FORK: 4,
  SPEED_FORK: 1,
};

// Network diagram configuration
const NETWORK_CONFIG = [
  { range: [0, 8], group: true },
  { index: 9, artificialSources: [3, 5] },
  { index: 10, artificialSources: [3, 5] },
  { index: 11, artificialSources: [0, 1, 2, 6, 7, 8] },
  { index: 12, artificialSources: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
  { range: [13, 16], group: true },
  { index: 17 },
];

class RichNetworkPreview extends Container {
  constructor() {
    super();
    this.masterContainer = new Container();
    this.canvas = new Graphics();

    this.setupNetworkDiagram();
    this.setupIcons();
    this.setupLabels();
    this.setupCarSensorPreview();
    this.setupConnections();
    
    // Add canvas first, then labels on top
    this.masterContainer.addChild(this.canvas);
    this.setupIconLabels();

    this.addChild(this.masterContainer);
  }

  setupNetworkDiagram() {
    this.netDiagram = new NetworkPreview(NETWORK_CONFIG);
    this.netDiagram.x = LEFT_PADDING;
    this.netDiagram.y = TOP_PADDING;
    this.masterContainer.addChild(this.netDiagram);
  }

  setupIcons() {
    this.turnIcon = this.createIcon(getUiTurnIconTexture());
    this.throttleIcon = this.createIcon(getUiThrottleIconTexture());

    const iconX = this.netDiagram.x + this.netDiagram.canvasWidth + ICON_CONFIG.SPACING_FROM_DIAGRAM;
    this.turnIcon.x = iconX;
    this.turnIcon.y = this.netDiagram.y + this.netDiagram.canvasHeight * ICON_CONFIG.TURN_Y_POSITION;
    this.turnIcon.anchor.set(0.5, 0.5);
    this.turnIcon.scale.set(ICON_CONFIG.SCALE);

    this.throttleIcon.x = iconX;
    this.throttleIcon.y = this.netDiagram.y + this.netDiagram.canvasHeight * ICON_CONFIG.THROTTLE_Y_POSITION;
    this.throttleIcon.anchor.set(0.5, 0.5);
    this.throttleIcon.scale.set(ICON_CONFIG.SCALE);

    this.masterContainer.addChild(this.turnIcon);
    this.masterContainer.addChild(this.throttleIcon);
  }

  createIcon(texture) {
    const icon = new Sprite(texture);
    icon.anchor.set(0, 0.5);
    icon.alpha = ICON_CONFIG.ALPHA;
    return icon;
  }

  setupLabels() {
    this.radarLabel = this.createPositionedLabel('Radar', LABEL_POSITIONS.RADAR);
    this.turnHistoryLabel = this.createPositionedLabel('Steering', LABEL_POSITIONS.STEERING);
    this.speedLabel = this.createPositionedLabel('Speed', LABEL_POSITIONS.SPEED);
  }

  createPositionedLabel(text, positionFraction) {
    const label = this.addLabel(text);
    label.anchor.set(0.5, 0.5);
    label.x = this.netDiagram.x + LABEL_CONFIG.OFFSET_X;
    label.y = this.netDiagram.y + this.netDiagram.canvasHeight * positionFraction + LABEL_CONFIG.OFFSET_Y;
    return label;
  }

  setupCarSensorPreview() {
    this.carSensorPreview = new CarSensorPreview();
    this.carSensorPreview.scale.set(0.7);
    this.carSensorPreview.x = this.netDiagram.x - 150;
    this.carSensorPreview.y = this.netDiagram.y + this.netDiagram.canvasHeight * 0.5;
    this.masterContainer.addChild(this.carSensorPreview);
  }

  setupConnections() {
    const bendX1 = this.carSensorPreview.x + CONNECTION_CONFIG.BEND_X1_SCALE * this.carSensorPreview.scale.x;
    const bendX2 = this.carSensorPreview.x + CONNECTION_CONFIG.BEND_X2_SCALE * this.carSensorPreview.scale.x;

    const connections = [
      {
        labelPos: LABEL_POSITIONS.RADAR,
        endX: this.carSensorPreview.x + CONNECTION_CONFIG.RADAR_OFFSET_X * this.carSensorPreview.scale.x,
        endY: this.netDiagram.y + this.netDiagram.canvasHeight * LABEL_POSITIONS.RADAR,
        fork: CONNECTION_CONFIG.RADAR_FORK,
      },
      {
        labelPos: LABEL_POSITIONS.STEERING,
        endX: this.carSensorPreview.x + CONNECTION_CONFIG.STEERING_OFFSET_X * this.carSensorPreview.scale.x,
        endY: this.carSensorPreview.y + CONNECTION_CONFIG.STEERING_OFFSET_Y * this.carSensorPreview.scale.y,
        fork: CONNECTION_CONFIG.STEERING_FORK,
      },
      {
        labelPos: LABEL_POSITIONS.SPEED,
        endX: this.carSensorPreview.x + CONNECTION_CONFIG.SPEED_OFFSET_X * this.carSensorPreview.scale.x,
        endY: this.netDiagram.y + this.netDiagram.canvasHeight * LABEL_POSITIONS.SPEED,
        fork: CONNECTION_CONFIG.SPEED_FORK,
      },
    ];

    connections.forEach(({ labelPos, endX, endY, fork }) => {
      this.drawConnection(
        this.netDiagram.x - 3,
        this.netDiagram.y + this.netDiagram.canvasHeight * labelPos,
        endX,
        endY,
        bendX1,
        bendX2,
        fork
      );
    });
  }

  setupIconLabels() {
    this.drawIconIndicatorCircles(this.turnIcon, [
      { label: 'R', color: COLOR_POSITIVE, offsetY: -LABEL_CONFIG.CIRCLE_OFFSET },
      { label: 'L', color: COLOR_NEGATIVE, offsetY: LABEL_CONFIG.CIRCLE_OFFSET },
    ]);

    this.drawIconIndicatorCircles(this.throttleIcon, [
      { label: '+', color: COLOR_POSITIVE, offsetY: -LABEL_CONFIG.CIRCLE_OFFSET, fontSize: 12 },
      { label: '-', color: COLOR_NEGATIVE, offsetY: LABEL_CONFIG.CIRCLE_OFFSET, fontSize: 12 },
    ]);
  }

  drawIconIndicatorCircles(icon, indicators) {
    indicators.forEach(({ label, color, offsetY, fontSize = 7 }) => {
      const x = icon.x + LABEL_CONFIG.CIRCLE_OFFSET;
      const y = icon.y + offsetY;

      this.canvas.circle(x, y, LABEL_CONFIG.CIRCLE_RADIUS);
      this.canvas.fill({ color });

      const textLabel = this.addLabel(label, { fill: 0x000000, fontSize });
      textLabel.anchor.set(0.5, 0.5);
      textLabel.x = x;
      textLabel.y = y;
    });
  }

  // Public API methods
  renderView(neuralNet, genome, activations) {
    this.netDiagram.renderView(neuralNet, genome, activations);
  }

  scaleView(width, height) {
    const scaleW = width / this.canvasWidth;
    const scaleH = height / this.canvasHeight;
    const scale = Math.min(scaleW, scaleH);

    this.masterContainer.scale.set(scale, scale);
    this.masterContainer.x = width / 2 - (this.canvasWidth * scale) / 2;
    this.masterContainer.y = height / 2 - (this.canvasHeight * scale) / 2;
  }

  // Getters
  get canvasWidth() {
    return this.netDiagram.canvasWidth + LEFT_PADDING + RIGHT_PADDING;
  }

  get canvasHeight() {
    return this.netDiagram.canvasHeight + TOP_PADDING + BOTTOM_PADDING;
  }

  // Helper methods
  addLabel(text, props = {}) {
    const label = new Text();
    this.masterContainer.addChild(label);
    label.style = {
      fontFamily: 'Exo2',
      fontSize: 10,
      fill: 0xdedede,
      fontStyle: 'normal',
      ...props,
    };
    label.x = 10;
    label.y = 10;
    label.text = text;
    return label;
  }

  // Drawing methods
  drawConnection(x1, y1, x2, y2, bendX1, bendX2, fork = 1) {
    const CONNECTION_COLOR = 0x888888;
    const FORK_DISTANCE = 25;
    const FORK_SEGMENT = 6;

    // Draw curved connection between bend points
    this.drawCurvedConnection(bendX1, y1, bendX2, y2, 1, CONNECTION_COLOR);

    // Draw fork if needed
    if (fork > 1) {
      const forkHeight = (fork - 1) * FORK_SEGMENT;
      x1 -= FORK_DISTANCE;
      for (let fy = y1 - forkHeight / 2; fy <= y1 + forkHeight / 2; fy += FORK_SEGMENT) {
        this.drawCurvedConnection(x1 + FORK_DISTANCE, fy, x1, y1, 1, CONNECTION_COLOR);
      }
    }

    // Draw straight segments
    this.canvas.moveTo(x1, y1);
    this.canvas.lineTo(bendX1, y1);
    this.canvas.moveTo(bendX2, y2);
    this.canvas.lineTo(x2, y2);
    this.canvas.stroke({
      color: CONNECTION_COLOR,
      width: 1,
      alpha: 1,
    });

    // Draw connection endpoint
    this.drawConnectionEndpoint(x2, y2);
  }

  drawConnectionEndpoint(x, y) {
    const OUTER_RADIUS = 7;
    const INNER_RADIUS = 1.5;

    this.canvas.circle(x, y, OUTER_RADIUS);
    this.canvas.fill({ color: 0x000000, alpha: 0.4 });
    this.canvas.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });

    this.canvas.circle(x, y, INNER_RADIUS);
    this.canvas.fill({ color: 0xffffff });
  }

  drawCurvedConnection(x1, y1, x2, y2, alpha = 0.5, color = 0xffffff) {
    // Smooth cubic Bezier where the tangent at both ends is horizontal:
    // - Start tangent horizontal => control point 1 has y == y1
    // - End tangent horizontal => control point 2 has y == y2
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dir = dx >= 0 ? 1 : -1;

    // Control point horizontal offset: big enough to show curvature, but bounded
    const absDx = Math.abs(dx);
    const controlDist = Math.max(20, Math.min(80, absDx * 0.5));

    const cx1 = x1 + dir * controlDist;
    const cy1 = y1; // keep start flat
    const cx2 = x2 - dir * controlDist;
    const cy2 = y2; // keep end flat

    // If points are extremely close, fall back to a straight line (avoids tiny loops)
    const isTiny = absDx < 2 && Math.abs(dy) < 2;

    this.canvas.moveTo(x1, y1);
    if (isTiny) {
      this.canvas.lineTo(x2, y2);
    } else {
      this.canvas.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
    }
    this.canvas.stroke({
      color,
      width: 1,
      alpha,
    });
  }

  destroy(options) {
    // Pixi v8 nuance: `Graphics.destroy({...})` will NOT destroy its GraphicsContext
    // unless you pass `{ context: true }` (or call destroy() with no options).
    // When we pass Container-style options from the parent (children/texture/baseTexture),
    // the internal GraphicsContext can stay alive and be retained by the renderer
    // (`GraphicsContextSystem._gpuContextHash`), which looks like a leak.
    const graphicsDestroyOptions =
      options && typeof options === 'object'
        ? { ...options, context: true }
        : { context: true };

    // Clear Graphics objects first to free drawing resources
    if (this.canvas) {
      this.canvas.destroy(graphicsDestroyOptions);
      this.canvas = null;
    }

    // Destroy complex children with their own destroy methods (they're in masterContainer)
    if (this.netDiagram) {
      this.netDiagram.destroy(options);
      this.netDiagram = null;
    }
    if (this.carSensorPreview) {
      this.carSensorPreview.destroy(options);
      this.carSensorPreview = null;
    }

    // Destroy Sprite icons (they're in masterContainer)
    if (this.turnIcon) {
      this.turnIcon.destroy(options);
      this.turnIcon = null;
    }
    if (this.throttleIcon) {
      this.throttleIcon.destroy(options);
      this.throttleIcon = null;
    }

    // Destroy masterContainer (will destroy canvas and remaining children like text labels)
    if (this.masterContainer) {
      this.masterContainer.destroy(options);
      this.masterContainer = null;
    }

    // Clear canvas reference (already destroyed by masterContainer)
    this.canvas = null;

    // Call parent destroy
    super.destroy(options);
  }
}

export default RichNetworkPreview;
