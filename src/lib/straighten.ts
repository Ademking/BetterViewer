import { useMemo } from "react";
import { toast } from "@/components/ui/toast";
import { deriveAnimation, pause, play, usePlayer } from "@/lib/animation";
import type { Annotation } from "@/lib/annotations";
import { loadHtmlImage } from "@/lib/image";
import { scaleAnnotation } from "@/lib/resize";
import { viewport } from "@/lib/viewport";
import {
  DEFAULT_STRAIGHTEN,
  isIdentityStraighten,
  type Quad,
  type StraightenParams,
  sourceQuad,
  sourceToOutput,
  warp,
} from "@/lib/warp-core";
import { getDoc, type ImageInfo, updateDoc } from "@/state/document";
import { getUi, useUi } from "@/state/ui";
import { t } from "@/lib/i18n";

export type { StraightenParams };

/* ------------------------------------------------------------------ mode */

/** An animation was playing when straightening started: it plays again afterwards. */
let resumePlaying = false;

export const startStraighten = () => {
  if (!getDoc()) return;
  // Animations: the preview shows the frame on screen.
  resumePlaying = usePlayer.getState().playing;
  pause();
  getUi().set({ tool: "straighten", selectedIds: [], editingTextId: null, straighten: { ...DEFAULT_STRAIGHTEN } });
};

export const cancelStraighten = () => getUi().set({ tool: "select", straighten: null, levelLine: null });

// Done straightening (applied or not): play again.
useUi.subscribe((s, prev) => {
  if (!prev.straighten || s.straighten) return;
  if (resumePlaying) play();
  resumePlaying = false;
});

export const setStraighten = (patch: Partial<StraightenParams>) => {
  const s = getUi().straighten;
  if (!s) return;
  getUi().set({ straighten: { ...s, ...patch } });
};

const clampAngle = (a: number) => Math.round(Math.min(45, Math.max(-45, a)) * 10) / 10;

/**
 * Level line drawn on screen (display space): rotate so it becomes exactly
 * horizontal or vertical, whichever it's closer to.
 */
export function levelTo(screenA: { x: number; y: number }, screenB: { x: number; y: number }) {
  const s = getUi().straighten;
  const doc = getDoc();
  if (!s || !doc) return;
  const theta = (Math.atan2(screenB.y - screenA.y, screenB.x - screenA.x) * 180) / Math.PI;
  const target = Math.round(theta / 90) * 90;
  const deltaDisplay = target - theta;
  // An odd number of flips mirrors the rotation direction.
  const deltaImage = doc.flipX !== doc.flipY ? -deltaDisplay : deltaDisplay;
  setStraighten({ angle: clampAngle(s.angle + deltaImage) });
}

/* ------------------------------------------------------------------ preview */

const PREVIEW_SIDE = 1024;
const previewPixels = new WeakMap<object, ImageData>();

function smallCopy(source: CanvasImageSource & { width: number; height: number }) {
  const cached = previewPixels.get(source);
  if (cached) return cached;
  const w0 = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const h0 = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const k = Math.min(1, PREVIEW_SIDE / Math.max(w0, h0));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w0 * k));
  c.height = Math.max(1, Math.round(h0 * k));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  previewPixels.set(source, data);
  return data;
}

/**
 * Live preview: a ≤1024 px copy of what's shown, warped. Drawn stretched to
 * the image size in place of the image while straightening.
 */
export function useStraightenPreview(
  source: CanvasImageSource | null,
  params: StraightenParams | null,
  W: number,
  H: number
): HTMLCanvasElement | null {
  const key = params ? `${params.angle}|${params.vertical}|${params.horizontal}` : "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for `params`
  return useMemo(() => {
    if (!source || !params || !W || !H) return null;
    const src = smallCopy(source as CanvasImageSource & { width: number; height: number });
    const k = src.width / W;
    const quad = sourceQuad(W, H, params).map((p) => ({ x: p.x * k, y: p.y * k })) as Quad;
    const out = warp(src, quad, src.width, src.height);
    const c = document.createElement("canvas");
    c.width = src.width;
    c.height = src.height;
    c.getContext("2d")!.putImageData(new ImageData(out, src.width, src.height), 0, 0);
    return c;
  }, [source, key, W, H]);
}

/* ------------------------------------------------------------------ apply */

let worker: Worker | null = null;
let nextJob = 1;

const workerSupported = () => typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap === "function";

/** Warp in the worker: an encoded file of `type`, or the pixels for "bitmap". */
async function warpInWorker<T extends Blob | ImageBitmap>(img: HTMLImageElement | ImageBitmap, quad: Quad, type: string): Promise<T> {
  worker ??= new Worker(new URL("./warp.worker.ts", import.meta.url), { type: "module" });
  const bitmap = await createImageBitmap(img);
  const id = nextJob++;
  const w = worker;
  return new Promise((resolve, reject) => {
    const onMessage = (e: MessageEvent<{ id: number; blob?: Blob; bitmap?: ImageBitmap; error?: string }>) => {
      if (e.data.id !== id) return;
      w.removeEventListener("message", onMessage);
      const result = e.data.blob ?? e.data.bitmap;
      if (result) resolve(result as T);
      else reject(new Error(e.data.error ?? t("Straighten failed")));
    };
    w.addEventListener("message", onMessage);
    w.postMessage({ id, bitmap, quad, type }, [bitmap]);
  });
}

/** Warp on this thread (no worker canvas): the result on a canvas. */
function warpHere(img: HTMLImageElement | ImageBitmap, quad: Quad) {
  const c = document.createElement("canvas");
  c.width = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  c.height = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const src = ctx.getImageData(0, 0, c.width, c.height);
  ctx.putImageData(new ImageData(warp(src, quad, c.width, c.height), c.width, c.height), 0, 0);
  return c;
}

/**
 * Frames up to this many pixels are warped on this thread: a trip to the
 * worker costs ≈16 ms, far more than warping a small frame (≈1 ms for 200 × 160).
 */
const SMALL_FRAME = 500_000;

/** One animation frame, warped. */
const warpFrame = (frame: ImageBitmap, quad: Quad): Promise<CanvasImageSource> | CanvasImageSource =>
  workerSupported() && frame.width * frame.height > SMALL_FRAME
    ? warpInWorker<ImageBitmap>(frame, quad, "bitmap")
    : warpHere(frame, quad);

async function warpFull(img: HTMLImageElement | ImageBitmap, quad: Quad, type: string): Promise<Blob> {
  if (workerSupported()) return warpInWorker<Blob>(img, quad, type);
  // Main-thread fallback.
  const c = warpHere(img, quad);
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error(t("Straighten failed")))), type, 0.95)
  );
}

/** Keep annotations on the same content: new position, turned and scaled with it. */
function moveAnnotation(a: Annotation, map: (p: { x: number; y: number }) => { x: number; y: number }, scale: number, angle: number): Annotation {
  const p = map({ x: a.x, y: a.y });
  const scaled = scaleAnnotation(a, scale, scale);
  return { ...scaled, x: p.x, y: p.y, rotation: a.type === "redact" ? 0 : a.rotation + angle } as Annotation;
}

export async function applyStraighten() {
  const doc = getDoc();
  const params = getUi().straighten;
  if (!doc || !params) return;
  if (isIdentityStraighten(params)) {
    cancelStraighten();
    return;
  }
  const { width: W, height: H } = doc.image;
  const quad = sourceQuad(W, H, params);
  try {
    const type = doc.image.type === "image/jpeg" ? "image/jpeg" : "image/png";
    const blob = await warpFull(await loadHtmlImage(doc.image.src), quad, type);
    const src = URL.createObjectURL(blob);
    await loadHtmlImage(src);
    // Animations: straighten every frame the same way.
    await deriveAnimation(doc.image.src, src, (frame) => warpFrame(frame, quad));
    const image: ImageInfo = { ...doc.image, src, size: blob.size, type };
    // How much the content was magnified (to fill the frame).
    const zoom = W / Math.hypot(quad[1].x - quad[0].x, quad[1].y - quad[0].y);
    const map = sourceToOutput(quad, W, H);
    updateDoc((d) => ({
      ...d,
      image,
      annotations: d.annotations.map((a) => moveAnnotation(a, map, zoom, params.angle)),
    }));
    getUi().set({ tool: "select", straighten: null, levelLine: null });
    viewport.fit();
    const done = [
      Math.abs(params.angle) >= 0.05 && t("Rotated {angle}°", { angle: params.angle.toFixed(1) }),
      (params.vertical || params.horizontal) && t("perspective corrected"),
    ].filter(Boolean);
    toast.success({ title: t("Image straightened"), description: done.join(" · ") });
  } catch (err) {
    toast.error({ title: t("Straighten failed"), description: String((err as Error).message) });
  }
}
