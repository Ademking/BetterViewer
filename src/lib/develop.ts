import { useEffect, useMemo, useState } from "react";
import {
  type DevelopParams,
  developKey,
  developPixels,
  DEFAULT_LEVELS,
  type Levels,
} from "@/lib/develop-core";
import type { Filters } from "@/lib/filters";
import type { Curves } from "@/lib/curves";
import { useDoc } from "@/state/document";
import { useUi } from "@/state/ui";

/**
 * The image as developed (curves, levels, white balance, vibrance, noise,
 * sharpening, vignette), then drawn with the CSS adjustment filters on top.
 *
 * While settings change, a ≤ PREVIEW_SIDE copy is developed right away on the
 * main thread; the full-resolution result follows from a worker once they
 * settle. Exports develop the full image synchronously.
 */

export const PREVIEW_SIDE = 2048;
/** Smaller live preview when the costly spatial effects are on. */
const SPATIAL_PREVIEW_SIDE = 1280;

const previewSide = (p: DevelopParams | null) =>
  p && (p.sharpen > 0 || p.noise > 0 || p.vignette !== 0) ? SPATIAL_PREVIEW_SIDE : PREVIEW_SIDE;

export type { DevelopParams, Levels };
export { DEFAULT_LEVELS };

/** Develop settings of a document (null when comparing with the original). */
export const developParamsOf = (d: { filters: Filters; curves: Curves | null; levels?: Levels | null }): DevelopParams => ({
  curves: d.curves,
  levels: d.levels ?? null,
  temperature: d.filters.temperature ?? 0,
  tint: d.filters.tint ?? 0,
  vibrance: d.filters.vibrance ?? 0,
  sharpen: d.filters.sharpen ?? 0,
  noise: d.filters.noise ?? 0,
  vignette: d.filters.vignette ?? 0,
});

/** The document's develop settings; null while holding Compare. */
export function useDevelopParams(): DevelopParams | null {
  const filters = useDoc((s) => s.doc?.filters);
  const curves = useDoc((s) => s.doc?.curves ?? null);
  const levels = useDoc((s) => s.doc?.levels ?? null);
  const compare = useUi((s) => s.compareOriginal);
  return useMemo(
    () => (!filters || compare ? null : developParamsOf({ filters, curves, levels })),
    [filters, curves, levels, compare]
  );
}

/* ------------------------------------------------------------------ sync */

interface Slot {
  key: string;
  source: CanvasImageSource;
}

/** Last result per image: the preview and the full-resolution one. */
const previews = new WeakMap<HTMLImageElement, Slot & { canvas: HTMLCanvasElement }>();
const fulls = new WeakMap<HTMLImageElement, Slot>();
/** Source pixels at preview sizes (the full size isn't kept: too big). */
const previewPixels = new WeakMap<HTMLImageElement, Map<number, ImageData>>();

function readPixels(image: HTMLImageElement, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const w = Math.max(1, Math.round(image.naturalWidth * scale));
  const h = Math.max(1, Math.round(image.naturalHeight * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

const copyImageData = (src: ImageData) => new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);

const needsFull = (image: HTMLImageElement, p: DevelopParams | null) =>
  Math.max(image.naturalWidth, image.naturalHeight) > previewSide(p);

/** Developed live preview (downscaled); the image itself when there's nothing to do. */
export function developedPreview(image: HTMLImageElement, p: DevelopParams | null): CanvasImageSource {
  const key = developKey(p);
  if (!key) return image;
  const slot = previews.get(image);
  if (slot?.key === key) return slot.source;
  const side = previewSide(p);
  let sizes = previewPixels.get(image);
  if (!sizes) previewPixels.set(image, (sizes = new Map()));
  let src = sizes.get(side);
  if (!src) {
    src = readPixels(image, side);
    sizes.set(side, src);
  }
  const out = copyImageData(src);
  developPixels(out, p!, out.width / image.naturalWidth);
  // Reuse the canvas; its version tells caches keyed on it that it changed.
  const canvas = slot?.canvas ?? document.createElement("canvas");
  canvas.width = out.width;
  canvas.height = out.height;
  canvas.getContext("2d")!.putImageData(out, 0, 0);
  canvas.dataset.version = key;
  previews.set(image, { key, source: canvas, canvas });
  return canvas;
}

/** Full-resolution result, computed here and now (exports). */
export function developedFullSync(image: HTMLImageElement, p: DevelopParams | null): CanvasImageSource {
  const key = developKey(p);
  if (!key) return image;
  if (!needsFull(image, p)) return developedPreview(image, p);
  const slot = fulls.get(image);
  if (slot?.key === key) return slot.source;
  const img = readPixels(image, Number.POSITIVE_INFINITY);
  developPixels(img, p!, 1);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext("2d")!.putImageData(img, 0, 0);
  fulls.set(image, { key, source: canvas });
  return canvas;
}

/* ------------------------------------------------------------------ worker */

let worker: Worker | null = null;
let nextJob = 1;
const pending = new Map<number, { resolve: (b: ImageBitmap) => void; reject: (e: Error) => void }>();

const workerSupported = typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap === "function";

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./develop.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; bitmap?: ImageBitmap; error?: string }>) => {
      const job = pending.get(e.data.id);
      pending.delete(e.data.id);
      if (!job) return;
      if (e.data.bitmap) job.resolve(e.data.bitmap);
      else job.reject(new Error(e.data.error ?? "Develop failed"));
    };
  }
  return worker;
}

/** Full-resolution result from the worker (falls back to the main thread). */
async function developedFullAsync(image: HTMLImageElement, p: DevelopParams): Promise<CanvasImageSource> {
  const key = developKey(p);
  const slot = fulls.get(image);
  if (slot?.key === key) return slot.source;
  let source: CanvasImageSource;
  if (workerSupported) {
    const bitmap = await createImageBitmap(image);
    const id = nextJob++;
    source = await new Promise<ImageBitmap>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      getWorker().postMessage({ id, bitmap, params: p }, [bitmap]);
    });
  } else {
    source = developedFullSync(image, p);
  }
  fulls.set(image, { key, source });
  return source;
}

/* ------------------------------------------------------------------ hook */

/**
 * What to draw for the main image: the preview right away while settings
 * change, the full-resolution result once they settle.
 */
export function useDevelopedSource(image: HTMLImageElement | null, p: DevelopParams | null) {
  const key = developKey(p);
  const big = !!image && needsFull(image, p);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for `p`
  const preview = useMemo(() => (image ? developedPreview(image, p) : null), [image, key]);
  const [full, setFull] = useState<{ image: HTMLImageElement; key: string; source: CanvasImageSource } | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for `p`
  useEffect(() => {
    if (!image || !key || !big) return;
    let cancelled = false;
    const t = setTimeout(() => {
      developedFullAsync(image, p!).then(
        (source) => !cancelled && setFull({ image, key, source }),
        (err) => console.warn("Full-resolution develop failed:", err)
      );
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [image, key, big]);

  if (!image || !key || !big) return preview;
  return full && full.image === image && full.key === key ? full.source : preview;
}

/** Scale from natural image pixels to a (possibly downscaled) source. */
export const sourceScale = (source: CanvasImageSource, image: HTMLImageElement) =>
  (source as { width: number }).width / image.naturalWidth;
