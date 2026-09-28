import { stageRegistry } from "@/lib/stageRegistry";

export const SWATCHES = [
  "#ff453a",
  "#ff9f0a",
  "#ffd60a",
  "#30d158",
  "#64d2ff",
  "#0a84ff",
  "#5e5ce6",
  "#bf5af2",
  "#ff375f",
  "#ffffff",
  "#8e8e93",
  "#000000",
];

const hex2 = (n: number) => n.toString(16).padStart(2, "0");

export const rgbToHex = (r: number, g: number, b: number) =>
  `#${hex2(r)}${hex2(g)}${hex2(b)}`;

export const hexToRgb = (hex: string) => {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: Number.parseInt(m[1], 16),
    g: Number.parseInt(m[2], 16),
    b: Number.parseInt(m[3], 16),
  };
};

export const rgbToHsl = (r: number, g: number, b: number) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
};

/** Readable foreground for a background color. */
export const contrastText = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#000000" : "#ffffff";
};

/** Native canvases of the visible layers, bottom to top (image, then annotations). */
export const visibleLayerCanvases = () =>
  [stageRegistry.imageLayer, stageRegistry.annotationLayer]
    .filter((l): l is NonNullable<typeof l> => !!l)
    .map((l) => ({ canvas: l.getNativeCanvasElement(), ratio: l.getCanvas().getPixelRatio() }));

/**
 * Sample the color actually seen at a screen point: the image (filters
 * included) with everything on top of it (drawings, text, inserted
 * pictures, blur zones) composited in. Returns null over empty board.
 */
export const sampleImageColor = (p: { x: number; y: number }) => {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  for (const { canvas, ratio } of visibleLayerCanvases()) {
    const x = Math.floor(p.x * ratio);
    const y = Math.floor(p.y * ratio);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) continue;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) continue;
    const d = ctx.getImageData(x, y, 1, 1).data;
    const sa = d[3] / 255;
    if (sa === 0) continue;
    // Source-over: the upper layer (canvas data is un-premultiplied).
    const outA = sa + a * (1 - sa);
    r = (d[0] * sa + r * a * (1 - sa)) / outA;
    g = (d[1] * sa + g * a * (1 - sa)) / outA;
    b = (d[2] * sa + b * a * (1 - sa)) / outA;
    a = outA;
  }
  if (a === 0) return null;
  return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
};
