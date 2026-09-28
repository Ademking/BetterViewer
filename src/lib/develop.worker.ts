/// <reference lib="webworker" />
import { type DevelopParams, developPixels } from "@/lib/develop-core";

interface Job {
  id: number;
  bitmap: ImageBitmap;
  params: DevelopParams;
}

/** Full-resolution develop off the main thread: bitmap in, bitmap out. */
self.onmessage = (e: MessageEvent<Job>) => {
  const { id, bitmap, params } = e.data;
  try {
    const { width, height } = bitmap;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const img = ctx.getImageData(0, 0, width, height);
    developPixels(img, params, 1);
    ctx.putImageData(img, 0, 0);
    const out = canvas.transferToImageBitmap();
    (self as unknown as Worker).postMessage({ id, bitmap: out }, [out]);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: String((err as Error).message ?? err) });
  }
};
