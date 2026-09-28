import { useEffect, useState } from "react";

/**
 * Pre-shrunk copies (½, ¼, ⅛ …) of a large image. Drawing a 24 MP photo
 * scaled down to 20% on every zoom frame is costly (very much so in
 * browsers that resample on the CPU, like Firefox), so frames draw the copy
 * closest to (and not smaller than) the size on screen instead.
 */

/** Only images bigger than this get copies; smaller ones are cheap to draw. */
const MIN_SIDE = 2048;
/** Stop halving at about this size. */
const SMALLEST = 512;

type Sized = CanvasImageSource & { width: number; height: number };

const sizeOf = (s: CanvasImageSource) =>
  s instanceof HTMLImageElement ? { w: s.naturalWidth, h: s.naturalHeight } : { w: (s as Sized).width, h: (s as Sized).height };

const identity = (s: CanvasImageSource) =>
  s instanceof HTMLCanvasElement ? (s.dataset.version ?? "") : "";

const cache = new WeakMap<object, { version: string; levels: HTMLCanvasElement[] }>();

function build(source: CanvasImageSource): HTMLCanvasElement[] {
  const levels: HTMLCanvasElement[] = [];
  let { w, h } = sizeOf(source);
  let prev: CanvasImageSource = source;
  while (Math.max(w, h) / 2 >= SMALLEST) {
    w = Math.max(1, Math.round(w / 2));
    h = Math.max(1, Math.round(h / 2));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(prev, 0, 0, w, h);
    levels.push(c);
    prev = c;
  }
  return levels;
}

/** Smaller copies of `source`, built in the background (empty until ready / when not needed). */
export function useMipmaps(source: CanvasImageSource | null): HTMLCanvasElement[] {
  const [levels, setLevels] = useState<HTMLCanvasElement[]>([]);
  const version = source ? identity(source) : "";

  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` tracks canvases redrawn in place
  useEffect(() => {
    setLevels([]);
    if (!source) return;
    const { w, h } = sizeOf(source);
    if (Math.max(w, h) <= MIN_SIDE) return;
    const hit = cache.get(source);
    if (hit && hit.version === version) {
      setLevels(hit.levels);
      return;
    }
    // After the first paint, so opening a big image isn't delayed.
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      const built = build(source);
      cache.set(source, { version, levels: built });
      setLevels(built);
    }, 60);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [source, version]);

  return levels;
}

/**
 * The cheapest source that still has at least `targetWidth` pixels across
 * (falls back to the full source).
 */
export function pickLevel(source: CanvasImageSource, levels: HTMLCanvasElement[], targetWidth: number): CanvasImageSource {
  let best: CanvasImageSource = source;
  for (const level of levels) {
    if (level.width >= targetWidth) best = level;
    else break;
  }
  return best;
}
