/** Tone curves: control points per channel, turned into 256-entry lookup tables. */

export type CurveChannel = "rgb" | "r" | "g" | "b";
/** [input, output], both 0..255. */
export type CurvePoint = [number, number];
export type Curves = Record<CurveChannel, CurvePoint[]>;

export const CHANNELS: { id: CurveChannel; label: string; color: string }[] = [
  { id: "rgb", label: "RGB", color: "#e5e5e5" },
  { id: "r", label: "Red", color: "#ff5a52" },
  { id: "g", label: "Green", color: "#3ddc6f" },
  { id: "b", label: "Blue", color: "#4f9dff" },
];

const LINEAR: CurvePoint[] = [
  [0, 0],
  [255, 255],
];

export const IDENTITY_CURVES: Curves = { rgb: LINEAR, r: LINEAR, g: LINEAR, b: LINEAR };

export const isLinear = (pts: CurvePoint[]) => pts.every(([x, y]) => x === y);

export const isIdentityCurves = (c: Curves | null | undefined) =>
  !c || (isLinear(c.rgb) && isLinear(c.r) && isLinear(c.g) && isLinear(c.b));

/**
 * Monotone cubic (Fritsch–Carlson) interpolation through the points → LUT.
 * Unlike a natural spline it never overshoots, so a curve can't "ring".
 */
export function buildLut(points: CurvePoint[]): Uint8ClampedArray {
  const pts = [...points].sort((a, b) => a[0] - b[0]);
  const lut = new Uint8ClampedArray(256);
  const n = pts.length;
  if (n === 0) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }
  if (n === 1) {
    lut.fill(pts[0][1]);
    return lut;
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const d: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, xs[i + 1] - xs[i]));
  m.push(d[0]);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  let seg = 0;
  for (let x = 0; x < 256; x++) {
    if (x <= xs[0]) {
      lut[x] = ys[0];
      continue;
    }
    if (x >= xs[n - 1]) {
      lut[x] = ys[n - 1];
      continue;
    }
    while (seg < n - 2 && x > xs[seg + 1]) seg++;
    const h = xs[seg + 1] - xs[seg];
    const t = (x - xs[seg]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    const y =
      (2 * t3 - 3 * t2 + 1) * ys[seg] +
      (t3 - 2 * t2 + t) * h * m[seg] +
      (-2 * t3 + 3 * t2) * ys[seg + 1] +
      (t3 - t2) * h * m[seg + 1];
    lut[x] = Math.round(y);
  }
  return lut;
}

/** Final per-channel LUTs: the channel curve, then the RGB (master) curve. */
export function channelLuts(c: Curves) {
  const master = buildLut(c.rgb);
  const compose = (ch: Uint8ClampedArray) => ch.map((v) => master[v]) as Uint8ClampedArray;
  return { r: compose(buildLut(c.r)), g: compose(buildLut(c.g)), b: compose(buildLut(c.b)) };
}

/** Stable signature, for caches keyed on the look of the image. */
export const curvesKey = (c: Curves | null | undefined) =>
  isIdentityCurves(c) ? "" : JSON.stringify(c);

export const CURVE_PRESETS: { name: string; rgb: CurvePoint[] }[] = [
  { name: "Linear", rgb: LINEAR },
  { name: "More contrast", rgb: [[0, 0], [64, 48], [192, 208], [255, 255]] },
  { name: "Strong contrast", rgb: [[0, 0], [64, 36], [192, 220], [255, 255]] },
  { name: "Less contrast", rgb: [[0, 16], [64, 72], [192, 184], [255, 240]] },
  { name: "Lighter", rgb: [[0, 0], [128, 160], [255, 255]] },
  { name: "Darker", rgb: [[0, 0], [128, 96], [255, 255]] },
  { name: "Matte", rgb: [[0, 36], [80, 84], [200, 208], [255, 245]] },
  { name: "Negative", rgb: [[0, 255], [255, 0]] },
];
