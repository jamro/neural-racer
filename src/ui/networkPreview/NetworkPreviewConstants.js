// Configuration constants for NetworkPreview
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 170;
export const NODE_RADIUS = 3;
export const MIN_NODE_OUTLINE_WIDTH = 0;
export const MAX_NODE_OUTLINE_WIDTH = 1;
export const MIN_CONNECTION_ALPHA = 0;
export const MIN_NODE_ALPHA = 0;
export const INPUT_STROKE_ALPHA = 0.5;
export const OUTPUT_T_HORIZONTAL_SCALE = 5;
export const OUTPUT_T_VERTICAL_SCALE = 50;
export const OUTPUT_T_SCALE_ALPHA = 0.2;
export const COLOR_POSITIVE = 0xFF6600; // Red for positive values
export const COLOR_NEGATIVE = 0x6666FF; // Light blue for negative values

// Connection visibility tuning (hidden layers readability)
// - We normalize per-layer using a robust percentile so one outlier edge doesn't hide everything else.
// - Then we boost visibility for smaller values via a nonlinear alpha curve, but keep the graph readable
//   by drawing only top-K incoming edges per neuron plus edges above a threshold.
export const CONNECTION_LAYER_NORM_PERCENTILE = 0.95;
export const CONNECTION_KEEP_TOP_K = 1;
export const CONNECTION_KEEP_THRESHOLD_RATIO = 0.33; // normalized cutoff relative to layer norm value
export const CONNECTION_ALPHA_MIN = 0.02;
export const CONNECTION_ALPHA_MAX = 0.8;
export const CONNECTION_WIDTH_MIN = 0.22;
export const CONNECTION_WIDTH_MAX = 2.5;
// Exponents: <1 boosts small values; >1 emphasizes big values
export const CONNECTION_ALPHA_EXPONENT = 0.35;
export const CONNECTION_WIDTH_EXPONENT = 1.6;

// Additional decluttering: also keep only top-K outgoing edges per input neuron (per layer)
export const CONNECTION_KEEP_TOP_K_OUT = 2;

// Node normalization tuning (per-layer robust scaling)
export const NODE_LAYER_NORM_PERCENTILE = 0.95;
export const NODE_FILL_ALPHA_MIN = 0.06;
export const NODE_FILL_ALPHA_MAX = 0.92;
export const NODE_FILL_ALPHA_EXPONENT = 0.6; // <1 boosts small values a bit
export const NODE_OUTLINE_ALPHA_MIN = 0.08;
export const NODE_OUTLINE_ALPHA_MAX = 0.9;
export const NODE_OUTLINE_ALPHA_EXPONENT = 0.8;

// Output-focused bundling: bend curves toward their dominant output (e.g. Turn vs Throttle)
export const CONNECTION_BUNDLING_ENABLED = true;
export const CONNECTION_BUNDLE_STRENGTH = 15; // px offset applied to bezier control points
export const CONNECTION_BUNDLE_DOMINANCE_EXPONENT = 1.4; // higher => only very output-specific edges get strong bundling

