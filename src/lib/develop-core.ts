/**
 * Pixel "develop" pipeline: the adjustments CSS filters can't do. Pure
 * functions (no DOM), shared by the main thread and the develop worker.
 *
 * Order: white balance → levels → curves (one lookup table per channel),
 * then vibrance, noise reduction, sharpening and vignette.
 */
import { buildLut, type Curves, isIdentityCurves } from "@/lib/curves";

export interface Levels {
  /** Input black / white points (0..255) and midtone gamma (0.1..9.99). */
  inBlack: number;
  inWhite: number;
  gamma: number;
  /** Output black / white (0..255). */
  outBlack: number;
  outWhite: number;
}

export const DEFAULT_LEVELS: Levels = { inBlack: 0, inWhite: 255, gamma: 1, outBlack: 0, outWhite: 255 };

export const isIdentityLevels = (l: Levels | null | undefined) =>
  !l ||
  (l.inBlack === 0 && l.inWhite === 255 && Math.abs(l.gamma - 1) < 0.005 && l.outBlack === 0 && l.outWhite === 255);

export interface DevelopParams {
  curves: Curves | null;
  levels: Levels | null;
  /** −100..100: cool ↔ warm. */
  temperature: number;
  /** −100..100: green ↔ magenta. */
  tint: number;
  /** −100..100: saturation that spares already-saturated colours. */
  vibrance: number;
  /** 0..100. */
  sharpen: number;
  /** 0..100. */
  noise: number;
  /** −100..100: darker ↔ lighter corners. */
  vignette: number;
}

export const isIdentityDevelop = (p: DevelopParams | null | undefined) =>
  !p ||
  (isIdentityCurves(p.curves) &&
    isIdentityLevels(p.levels) &&
    !p.temperature &&
    !p.tint &&
    !p.vibrance &&
    !p.sharpen &&
    !p.noise &&
    !p.vignette);

/** Stable signature ("" = nothing to do), for caches. */
export const developKey = (p: DevelopParams | null | undefined) =>
  isIdentityDevelop(p)
    ? ""
    : JSON.stringify([
        isIdentityCurves(p!.curves) ? 0 : p!.curves,
        isIdentityLevels(p!.levels) ? 0 : p!.levels,
        p!.temperature,
        p!.tint,
        p!.vibrance,
        p!.sharpen,
        p!.noise,
        p!.vignette,
      ]);

/* ------------------------------------------------------------------ tone */

/** Per-channel lookup tables: white balance, then levels, then curves. */
export function toneLuts(p: DevelopParams) {
  const t = p.temperature / 100;
  const m = p.tint / 100;
  const gains = [1 + 0.2 * t + 0.05 * m, 1 - 0.15 * m, 1 - 0.2 * t + 0.05 * m];
  const lv = isIdentityLevels(p.levels) ? null : p.levels!;
  const curves = isIdentityCurves(p.curves) ? null : p.curves!;
  const master = curves ? buildLut(curves.rgb) : null;
  const channel = curves ? [buildLut(curves.r), buildLut(curves.g), buildLut(curves.b)] : null;

  return [0, 1, 2].map((c) => {
    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      let x = v * gains[c];
      if (lv) {
        const span = Math.max(1, lv.inWhite - lv.inBlack);
        let n = Math.min(1, Math.max(0, (x - lv.inBlack) / span));
        n = n ** (1 / lv.gamma);
        x = lv.outBlack + n * (lv.outWhite - lv.outBlack);
      }
      let y = Math.round(Math.min(255, Math.max(0, x)));
      if (channel && master) y = master[channel[c][y]];
      lut[v] = y;
    }
    return lut;
  }) as [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray];
}

/* ------------------------------------------------------------------ spatial */

/**
 * Separable box blur of the RGB channels → Float32 RGB (3 values per pixel),
 * edges clamped. Both passes walk memory in order (the vertical one keeps
 * running column sums), which matters a lot on large images.
 */
function boxBlur(src: ArrayLike<number>, stride: number, w: number, h: number, r: number): Float32Array {
  const inv = 1 / (r * 2 + 1);
  const tmp = new Float32Array(w * h * 3);
  // Horizontal
  for (let y = 0; y < h; y++) {
    const base = y * w;
    let s0 = 0;
    let s1 = 0;
    let s2 = 0;
    for (let k = -r; k <= r; k++) {
      const i = (base + (k < 0 ? 0 : k >= w ? w - 1 : k)) * stride;
      s0 += src[i];
      s1 += src[i + 1];
      s2 += src[i + 2];
    }
    for (let x = 0; x < w; x++) {
      const o = (base + x) * 3;
      tmp[o] = s0 * inv;
      tmp[o + 1] = s1 * inv;
      tmp[o + 2] = s2 * inv;
      const add = (base + (x + r + 1 < w ? x + r + 1 : w - 1)) * stride;
      const sub = (base + (x - r > 0 ? x - r : 0)) * stride;
      s0 += src[add] - src[sub];
      s1 += src[add + 1] - src[sub + 1];
      s2 += src[add + 2] - src[sub + 2];
    }
  }
  // Vertical, row by row with running column sums.
  const rowLen = w * 3;
  const col = new Float32Array(rowLen);
  for (let k = -r; k <= r; k++) {
    const row = (k < 0 ? 0 : k >= h ? h - 1 : k) * rowLen;
    for (let i = 0; i < rowLen; i++) col[i] += tmp[row + i];
  }
  const out = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    const o = y * rowLen;
    for (let i = 0; i < rowLen; i++) out[o + i] = col[i] * inv;
    const add = (y + r + 1 < h ? y + r + 1 : h - 1) * rowLen;
    const sub = (y - r > 0 ? y - r : 0) * rowLen;
    for (let i = 0; i < rowLen; i++) col[i] += tmp[add + i] - tmp[sub + i];
  }
  return out;
}

/**
 * Edge-preserving noise reduction: small differences from the local average
 * (noise) are smoothed away, large ones (edges, detail) are kept.
 */
function denoise(d: Uint8ClampedArray, w: number, h: number, amount: number, scale: number) {
  const r = Math.max(1, Math.round((1 + amount / 50) * scale));
  // Two box passes ≈ gaussian.
  const blur = boxBlur(boxBlur(d, 4, w, h, r), 3, w, h, r);
  const t = 4 + amount * 0.3;
  const t2 = t * t;
  for (let i = 0, j = 0; i < d.length; i += 4, j += 3) {
    for (let c = 0; c < 3; c++) {
      const b = blur[j + c];
      const diff = d[i + c] - b;
      const d2 = diff * diff;
      d[i + c] = b + (diff * d2) / (d2 + t2);
    }
  }
}

/** Unsharp mask with a small threshold so flat areas don't get grainy. */
function sharpen(d: Uint8ClampedArray, w: number, h: number, amount: number, scale: number) {
  const r = Math.max(1, Math.round(scale * 1.2));
  const blur = boxBlur(d, 4, w, h, r);
  const k = (amount / 100) * 1.6;
  for (let i = 0, j = 0; i < d.length; i += 4, j += 3) {
    for (let c = 0; c < 3; c++) {
      const diff = d[i + c] - blur[j + c];
      if (diff > 2 || diff < -2) d[i + c] = d[i + c] + diff * k;
    }
  }
}

/* ------------------------------------------------------------------ run */

export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Apply the pipeline in place. `scale` = buffer px per full-resolution image
 * px, so spatial effects look the same on previews and the final image.
 */
export function developPixels(buf: PixelBuffer, p: DevelopParams, scale = 1) {
  const { data: d, width: w, height: h } = buf;
  const identityTone =
    isIdentityCurves(p.curves) && isIdentityLevels(p.levels) && !p.temperature && !p.tint;

  if (!identityTone) {
    const [lr, lg, lb] = toneLuts(p);
    // Pixels are little-endian RGBA, i.e. 0xAABBGGRR as a Uint32.
    const px = new Uint32Array(d.buffer, d.byteOffset, d.length >> 2);
    for (let i = 0; i < px.length; i++) {
      const v = px[i];
      px[i] = (v & 0xff000000) | (lb[(v >>> 16) & 255] << 16) | (lg[(v >>> 8) & 255] << 8) | lr[v & 255];
    }
  }

  if (p.vibrance) {
    const amt = p.vibrance / 100;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const max = r > g ? (r > b ? r : b) : g > b ? g : b;
      const min = r < g ? (r < b ? r : b) : g < b ? g : b;
      const sat = (max - min) / 255;
      // Muted colours move most; strong ones barely.
      const k = 1 + amt * (amt > 0 ? (1 - sat) ** 2 * 1.5 : 1);
      const avg = (r + g + b) / 3;
      d[i] = avg + (r - avg) * k;
      d[i + 1] = avg + (g - avg) * k;
      d[i + 2] = avg + (b - avg) * k;
    }
  }

  if (p.noise > 0) denoise(d, w, h, p.noise, scale);
  if (p.sharpen > 0) sharpen(d, w, h, p.sharpen, scale);

  if (p.vignette) {
    const v = p.vignette / 100;
    // Falloff by squared distance (0 centre → 1 corners), via a lookup table.
    const STEPS = 1024;
    const falloff = new Float32Array(STEPS + 1);
    for (let i = 0; i <= STEPS; i++) {
      const t = Math.min(1, Math.max(0, (Math.sqrt(i / STEPS) - 0.3) / 0.7));
      falloff[i] = t * t * (3 - 2 * t) * 0.85 * v;
    }
    const nx2 = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      const nx = (x + 0.5 - w / 2) / (w / 2);
      nx2[x] = (nx * nx) / 2;
    }
    for (let y = 0; y < h; y++) {
      const ny = (y + 0.5 - h / 2) / (h / 2);
      const ny2 = (ny * ny) / 2;
      let i = y * w * 4;
      for (let x = 0; x < w; x++, i += 4) {
        const q = nx2[x] + ny2;
        const f = falloff[q >= 1 ? STEPS : (q * STEPS) | 0];
        if (f === 0) continue;
        if (v < 0) {
          const k = 1 + f;
          d[i] *= k;
          d[i + 1] *= k;
          d[i + 2] *= k;
        } else {
          d[i] += (255 - d[i]) * f;
          d[i + 1] += (255 - d[i + 1]) * f;
          d[i + 2] += (255 - d[i + 2]) * f;
        }
      }
    }
  }
  return buf;
}
