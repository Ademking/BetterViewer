import { tk } from "@/lib/i18n";
export interface Filters {
  brightness: number; // -100..100
  contrast: number; // -100..100
  saturation: number; // -100..100
  hue: number; // -180..180 (deg)
  blur: number; // 0..40 (image px)
  grayscale: number; // 0..100
  sepia: number; // 0..100
  invert: number; // 0..100
  // Developed per pixel (see develop-core.ts), not CSS filters:
  temperature: number; // -100..100
  tint: number; // -100..100
  vibrance: number; // -100..100
  sharpen: number; // 0..100
  noise: number; // 0..100 (noise reduction)
  vignette: number; // -100..100
}

export type FilterKey = keyof Filters;

export const DEFAULT_FILTERS: Filters = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  sharpen: 0,
  noise: 0,
  vignette: 0,
};

export type FilterGroup = "Light" | "Color" | "Detail" | "Effects";

export interface FilterSpec {
  key: FilterKey;
  group: FilterGroup;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

export const FILTER_GROUPS: FilterGroup[] = ["Light", "Color", "Detail", "Effects"];

export const FILTER_SPECS: FilterSpec[] = [
  { key: "brightness", group: tk("Light"), label: tk("Brightness"), min: -100, max: 100, step: 1, unit: "" },
  { key: "contrast", group: tk("Light"), label: tk("Contrast"), min: -100, max: 100, step: 1, unit: "" },
  { key: "temperature", group: tk("Color"), label: tk("Temperature"), min: -100, max: 100, step: 1, unit: "" },
  { key: "tint", group: tk("Color"), label: tk("Tint"), min: -100, max: 100, step: 1, unit: "" },
  { key: "vibrance", group: tk("Color"), label: tk("Vibrance"), min: -100, max: 100, step: 1, unit: "" },
  { key: "saturation", group: tk("Color"), label: tk("Saturation"), min: -100, max: 100, step: 1, unit: "" },
  { key: "hue", group: tk("Color"), label: tk("Hue"), min: -180, max: 180, step: 1, unit: "°" },
  { key: "sharpen", group: tk("Detail"), label: tk("Sharpen"), min: 0, max: 100, step: 1, unit: "" },
  { key: "noise", group: tk("Detail"), label: tk("Noise reduction"), min: 0, max: 100, step: 1, unit: "" },
  { key: "blur", group: tk("Detail"), label: tk("Blur"), min: 0, max: 40, step: 0.5, unit: "px" },
  { key: "vignette", group: tk("Effects"), label: tk("Vignette"), min: -100, max: 100, step: 1, unit: "" },
  { key: "grayscale", group: tk("Effects"), label: tk("Grayscale"), min: 0, max: 100, step: 1, unit: "%" },
  { key: "sepia", group: tk("Effects"), label: tk("Sepia"), min: 0, max: 100, step: 1, unit: "%" },
  { key: "invert", group: tk("Effects"), label: tk("Invert"), min: 0, max: 100, step: 1, unit: "%" },
];

export const FILTER_PRESETS: { name: string; filters: Partial<Filters> }[] = [
  { name: tk("Original"), filters: {} },
  { name: tk("Vivid"), filters: { saturation: 45, contrast: 12, brightness: 4 } },
  { name: tk("Warm"), filters: { sepia: 22, saturation: 18, hue: -8, brightness: 4 } },
  { name: tk("Cool"), filters: { hue: 14, saturation: -8, contrast: 6, brightness: 2 } },
  { name: tk("Fade"), filters: { contrast: -24, brightness: 10, saturation: -20 } },
  { name: tk("Mono"), filters: { grayscale: 100, contrast: 8 } },
  { name: tk("Noir"), filters: { grayscale: 100, contrast: 45, brightness: -10 } },
  { name: tk("Vintage"), filters: { sepia: 55, contrast: -8, saturation: -10, brightness: 6 } },
];

export const isDefaultFilters = (f: Filters) =>
  (Object.keys(DEFAULT_FILTERS) as FilterKey[]).every(
    (k) => (f[k] ?? DEFAULT_FILTERS[k]) === DEFAULT_FILTERS[k]
  );

/**
 * CSS / Canvas2D filter string. `blurScale` converts image-px blur into the
 * device pixels of the target surface.
 */
export const toCssFilter = (f: Filters, blurScale = 1) => {
  const parts: string[] = [];
  if (f.brightness) parts.push(`brightness(${1 + f.brightness / 100})`);
  if (f.contrast) parts.push(`contrast(${1 + f.contrast / 100})`);
  if (f.saturation) parts.push(`saturate(${1 + f.saturation / 100})`);
  if (f.hue) parts.push(`hue-rotate(${f.hue}deg)`);
  if (f.grayscale) parts.push(`grayscale(${f.grayscale}%)`);
  if (f.sepia) parts.push(`sepia(${f.sepia}%)`);
  if (f.invert) parts.push(`invert(${f.invert}%)`);
  if (f.blur) parts.push(`blur(${(f.blur * blurScale).toFixed(2)}px)`);
  return parts.length ? parts.join(" ") : "none";
};

/** Join CSS filter parts, dropping empties / "none". */
export const combineFilters = (...parts: string[]) => {
  const out = parts.filter((p) => p && p !== "none").join(" ");
  return out || "none";
};

export const canvasFilterSupported = (() => {
  if (typeof document === "undefined") return false;
  const ctx = document.createElement("canvas").getContext("2d");
  return !!ctx && "filter" in ctx;
})();
