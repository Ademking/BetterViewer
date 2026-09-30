import { toast } from "@/components/ui/toast";
import { type Levels, isIdentityLevels } from "@/lib/develop-core";
import { histogramOf, loadSample } from "@/lib/histogram";
import { getDoc, updateDoc, useDoc } from "@/state/document";
import { t } from "@/lib/i18n";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Value below which `share` of the pixels fall. */
function percentile(bins: Uint32Array, total: number, share: number) {
  const target = total * share;
  let acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += bins[i];
    if (acc >= target) return i;
  }
  return 255;
}

/**
 * Levels that stretch the tones to the full range (ignoring a sliver of
 * outliers) and pull the midtones towards a balanced brightness.
 */
export function autoLevels(data: Uint8ClampedArray): Levels {
  const h = histogramOf(data);
  if (!h.total) return { inBlack: 0, inWhite: 255, gamma: 1, outBlack: 0, outWhite: 255 };
  let inBlack = percentile(h.l, h.total, 0.003);
  let inWhite = percentile(h.l, h.total, 0.997);
  // Don't stretch a nearly flat image into noise.
  if (inWhite - inBlack < 40) {
    const mid = (inWhite + inBlack) / 2;
    inBlack = Math.max(0, Math.round(mid - 20));
    inWhite = Math.min(255, Math.round(mid + 20));
  }
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += h.l[i] * clamp((i - inBlack) / Math.max(1, inWhite - inBlack), 0.001, 0.999);
  const mean = sum / h.total;
  // Solve mean^(1/gamma) = 0.46, gently.
  const gamma = clamp(Math.log(mean) / Math.log(0.46), 0.8, 1.35);
  return { inBlack, inWhite, gamma: Math.round(gamma * 100) / 100, outBlack: 0, outWhite: 255 };
}

/**
 * Grey-world colour cast of the midtones → temperature / tint that reduce it
 * by a third. Kept mild: colourful scenes (sunsets, neon) aren't casts.
 */
function autoWhiteBalance(data: Uint8ClampedArray) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 16) {
    const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    if (l < 25 || l > 235 || data[i + 3] < 128) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  if (n < 50) return { temperature: 0, tint: 0 };
  r /= n;
  g /= n;
  b /= n;
  const temperature = clamp(Math.round((((b - r) / (0.2 * (r + b))) * 100) / 3), -20, 20);
  const tint = clamp(Math.round((((g - (r + b) / 2) / (0.15 * g)) * 100) / 3), -12, 12);
  return { temperature, tint };
}

async function sampleOfCurrent() {
  const doc = getDoc();
  if (!doc) return null;
  const sample = await loadSample(doc.image.src);
  return getDoc()?.image.src === doc.image.src ? sample : null;
}

/** Levels only (the "Auto" button in the Levels editor). */
export async function applyAutoLevels() {
  const sample = await sampleOfCurrent();
  if (!sample) return;
  const levels = autoLevels(sample.data.data);
  updateDoc((d) => ({ ...d, levels: isIdentityLevels(levels) ? null : levels }), { key: "auto-levels" });
}

/**
 * One-click enhance: auto levels, a partial white-balance correction, a bit
 * of vibrance and sharpening. One undo step.
 */
export async function autoEnhance() {
  const sample = await sampleOfCurrent();
  if (!sample) return;
  const data = sample.data.data;
  const levels = autoLevels(data);
  const { temperature, tint } = autoWhiteBalance(data);
  const past = useDoc.getState().past.length;
  updateDoc((d) => ({
    ...d,
    levels: isIdentityLevels(levels) ? null : levels,
    filters: { ...d.filters, temperature, tint, vibrance: 20, sharpen: 15 },
  }));
  if (useDoc.getState().past.length === past) return;
  toast.success({
    title: t("Auto-enhanced"),
    description: t("Levels, white balance, vibrance and sharpening were adjusted."),
    action: { label: t("Undo"), onClick: () => useDoc.getState().undo() },
  });
}
