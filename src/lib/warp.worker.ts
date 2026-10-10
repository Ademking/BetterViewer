/// <reference lib="webworker" />
import { type Quad, warp } from "@/lib/warp-core";

interface Job {
  id: number;
  bitmap: ImageBitmap;
  quad: Quad;
  /** Image type to encode to, or "bitmap" for the pixels themselves (animation frames). */
  type: string;
}

/** Full-resolution straighten / perspective off the main thread: bitmap in, encoded blob (or bitmap) out. */
self.onmessage = async (e: MessageEvent<Job>) => {
  const { id, bitmap, quad, type } = e.data;
  try {
    const { width, height } = bitmap;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const src = ctx.getImageData(0, 0, width, height);
    const out = new ImageData(warp(src, quad, width, height), width, height);
    ctx.putImageData(out, 0, 0);
    if (type === "bitmap") {
      const result = canvas.transferToImageBitmap();
      (self as unknown as Worker).postMessage({ id, bitmap: result }, [result]);
      return;
    }
    const blob = await canvas.convertToBlob({ type, quality: 0.95 });
    (self as unknown as Worker).postMessage({ id, blob });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String((err as Error).message ?? err) });
  }
};
