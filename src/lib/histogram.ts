import { type DevelopParams, developKey, developPixels } from "@/lib/develop-core";
import { type Filters, toCssFilter } from "@/lib/filters";
import { loadHtmlImage } from "@/lib/image";

export interface Histogram {
  r: Uint32Array;
  g: Uint32Array;
  b: Uint32Array;
  /** Luminance (Rec. 709). */
  l: Uint32Array;
  /** Pixels counted (fully transparent ones are skipped). */
  total: number;
}

const SAMPLE_SIDE = 480;

/** A small copy of the original image, for histograms. */
export interface Sample {
  data: ImageData;
  /** Sample px per image px (for blur radii). */
  scale: number;
}

export async function loadSample(src: string): Promise<Sample> {
  const img = await loadHtmlImage(src);
  const scale = Math.min(1, SAMPLE_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h), scale };
}

/** The sample as it looks on screen: developed first, then the CSS adjustments. */
export function renderSample(sample: Sample, filters: Filters | null, develop: DevelopParams | null): Uint8ClampedArray {
  let toned = sample.data;
  if (developKey(develop)) {
    toned = new ImageData(new Uint8ClampedArray(sample.data.data), sample.data.width, sample.data.height);
    developPixels(toned, develop!, sample.scale);
  }
  const css = filters ? toCssFilter(filters, sample.scale) : "none";
  if (css === "none") return toned.data;
  const { width: w, height: h } = toned;
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  src.getContext("2d")!.putImageData(toned, 0, 0);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.filter = css;
  ctx.drawImage(src, 0, 0);
  return ctx.getImageData(0, 0, w, h).data;
}

/** Bin pixel data per channel and luminance. */
export function histogramOf(data: Uint8ClampedArray): Histogram {
  const r = new Uint32Array(256);
  const g = new Uint32Array(256);
  const b = new Uint32Array(256);
  const l = new Uint32Array(256);
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const rv = data[i];
    const gv = data[i + 1];
    const bv = data[i + 2];
    r[rv]++;
    g[gv]++;
    b[bv]++;
    l[Math.round(0.2126 * rv + 0.7152 * gv + 0.0722 * bv)]++;
    total++;
  }
  return { r, g, b, l, total };
}

export interface HistogramStats {
  mean: number;
  /** Share of pixels at pure black / pure white (0..1). */
  shadowsClipped: number;
  highlightsClipped: number;
}

export function histogramStats(h: Histogram): HistogramStats {
  if (!h.total) return { mean: 0, shadowsClipped: 0, highlightsClipped: 0 };
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * h.l[i];
  // Clipped when any channel is at the extreme.
  const low = Math.max(h.r[0], h.g[0], h.b[0]);
  const high = Math.max(h.r[255], h.g[255], h.b[255]);
  return { mean: sum / h.total, shadowsClipped: low / h.total, highlightsClipped: high / h.total };
}

/**
 * SVG area path for a histogram channel in a 256 × `height` box. Scaled to
 * the 99.5th percentile bin so a single spike doesn't flatten the rest.
 */
export function histogramPath(bins: Uint32Array, height: number, peak?: number) {
  const top = peak ?? histogramPeak([bins]);
  let d = `M0 ${height}`;
  for (let i = 0; i < 256; i++) {
    const v = Math.min(1, bins[i] / top);
    d += ` L${i} ${(height - v * height).toFixed(1)} L${i + 1} ${(height - v * height).toFixed(1)}`;
  }
  return `${d} L256 ${height} Z`;
}

/** Shared vertical scale for several channels. */
export function histogramPeak(channels: Uint32Array[]) {
  const all = channels.flatMap((c) => Array.from(c.slice(1, 255))).sort((a, b) => a - b);
  return Math.max(1, all[Math.floor(all.length * 0.995)] ?? 1);
}
