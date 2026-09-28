/**
 * Straighten & perspective as one projective transform (homography): every
 * output pixel samples the source inside a quad. Pure functions (no DOM),
 * shared by the live preview and the warp worker.
 */

export interface StraightenParams {
  /** Rotation of the content, clockwise, −45..45°. */
  angle: number;
  /** −100..100: widen the top (+) or the bottom (−), for converging verticals. */
  vertical: number;
  /** −100..100: widen the right (+) or the left (−). */
  horizontal: number;
}

export type Pt = { x: number; y: number };
/** Corners in order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Pt, Pt, Pt, Pt];

export const DEFAULT_STRAIGHTEN: StraightenParams = { angle: 0, vertical: 0, horizontal: 0 };

export const isIdentityStraighten = (p: StraightenParams | null | undefined) =>
  !p || (Math.abs(p.angle) < 0.005 && !p.vertical && !p.horizontal);

/** Max fraction of a side a perspective slider pulls in. */
const KEYSTONE = 0.35;

/**
 * The area of the W × H source that becomes the whole output: the frame
 * pinched by the perspective sliders, rotated by −angle about the centre and
 * scaled down just enough to stay inside the image (no empty corners).
 */
export function sourceQuad(W: number, H: number, p: StraightenParams): Quad {
  const v = (p.vertical / 100) * KEYSTONE;
  const h = (p.horizontal / 100) * KEYSTONE;
  const k: Quad = [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: W, y: H },
    { x: 0, y: H },
  ];
  if (v > 0) {
    k[0].x += (v * W) / 2;
    k[1].x -= (v * W) / 2;
  } else if (v < 0) {
    k[3].x -= (v * W) / 2;
    k[2].x += (v * W) / 2;
  }
  if (h > 0) {
    k[1].y += (h * H) / 2;
    k[2].y -= (h * H) / 2;
  } else if (h < 0) {
    k[0].y -= (h * H) / 2;
    k[3].y += (h * H) / 2;
  }
  const c = { x: W / 2, y: H / 2 };
  const t = (-p.angle * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const at = (s: number) =>
    k.map((q) => {
      const dx = (q.x - c.x) * s;
      const dy = (q.y - c.y) * s;
      return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
    }) as Quad;
  const inside = (q: Quad) => q.every((pt) => pt.x >= -1e-6 && pt.y >= -1e-6 && pt.x <= W + 1e-6 && pt.y <= H + 1e-6);
  if (inside(at(1))) return at(1);
  let lo = 0.05;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (inside(at(mid))) lo = mid;
    else hi = mid;
  }
  return at(lo);
}

/** Unit square (0..1)² → quad (Heckbert's closed form). */
export interface Homography {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  g: number;
  h: number;
}

export function squareToQuad(q: Quad): Homography {
  const [p0, p1, p2, p3] = q;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    return { a: p1.x - p0.x, b: p3.x - p0.x, c: p0.x, d: p1.y - p0.y, e: p3.y - p0.y, f: p0.y, g: 0, h: 0 };
  }
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  return {
    a: p1.x - p0.x + g * p1.x,
    b: p3.x - p0.x + h * p3.x,
    c: p0.x,
    d: p1.y - p0.y + g * p1.y,
    e: p3.y - p0.y + h * p3.y,
    f: p0.y,
    g,
    h,
  };
}

/** Source point → output point (W × H), for moving annotations along. */
export function sourceToOutput(q: Quad, W: number, H: number) {
  const { a, b, c, d, e, f, g, h } = squareToQuad(q);
  // Inverse of [[a b c] [d e f] [g h 1]].
  const A = e - f * h;
  const B = c * h - b;
  const C = b * f - c * e;
  const D = f * g - d;
  const E = a - c * g;
  const F = c * d - a * f;
  const G = d * h - e * g;
  const Hh = b * g - a * h;
  const I = a * e - b * d;
  return (p: Pt): Pt => {
    const w = G * p.x + Hh * p.y + I;
    return { x: ((A * p.x + B * p.y + C) / w) * W, y: ((D * p.x + E * p.y + F) / w) * H };
  };
}

export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Render the output (dw × dh) by sampling `src` bilinearly inside `quad`
 * (given in src pixels).
 */
export function warp(src: PixelBuffer, quad: Quad, dw: number, dh: number): Uint8ClampedArray<ArrayBuffer> {
  const { a, b, c, d, e, f, g, h } = squareToQuad(quad);
  const out = new Uint8ClampedArray(new ArrayBuffer(dw * dh * 4));
  const sd = src.data;
  const sw = src.width;
  const sh = src.height;
  const maxX = sw - 1;
  const maxY = sh - 1;
  let o = 0;
  for (let py = 0; py < dh; py++) {
    const v = (py + 0.5) / dh;
    for (let px = 0; px < dw; px++, o += 4) {
      const u = (px + 0.5) / dw;
      const w = g * u + h * v + 1;
      let x = (a * u + b * v + c) / w - 0.5;
      let y = (d * u + e * v + f) / w - 0.5;
      if (x < 0) x = 0;
      else if (x > maxX) x = maxX;
      if (y < 0) y = 0;
      else if (y > maxY) y = maxY;
      const x0 = x | 0;
      const y0 = y | 0;
      const x1 = x0 < maxX ? x0 + 1 : x0;
      const y1 = y0 < maxY ? y0 + 1 : y0;
      const fx = x - x0;
      const fy = y - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = (y0 * sw + x1) * 4;
      const i01 = (y1 * sw + x0) * 4;
      const i11 = (y1 * sw + x1) * 4;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      out[o] = sd[i00] * w00 + sd[i10] * w10 + sd[i01] * w01 + sd[i11] * w11;
      out[o + 1] = sd[i00 + 1] * w00 + sd[i10 + 1] * w10 + sd[i01 + 1] * w01 + sd[i11 + 1] * w11;
      out[o + 2] = sd[i00 + 2] * w00 + sd[i10 + 2] * w10 + sd[i01 + 2] * w01 + sd[i11 + 2] * w11;
      out[o + 3] = sd[i00 + 3] * w00 + sd[i10 + 3] * w10 + sd[i01 + 3] * w01 + sd[i11 + 3] * w11;
    }
  }
  return out;
}
