import { binarize, Decoder, Detector, grayscale } from "@nuintun/qrcode";

export interface QrWorkerRequest {
  id: number;
  bitmap: ImageBitmap;
  /** Factor from scanned-bitmap pixels back to source-image pixels. */
  scale: number;
}

export interface QrWorkerCode {
  content: string;
  corners: { x: number; y: number }[];
}

export interface QrWorkerResponse {
  id: number;
  codes?: QrWorkerCode[];
  error?: string;
}

/** Find and decode every QR code in a bitmap. */
function scan(bitmap: ImageBitmap, scale: number): QrWorkerCode[] {
  const { width, height } = bitmap;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const luminances = grayscale(ctx.getImageData(0, 0, width, height));
  const binarized = binarize(luminances, width, height);
  const detected = new Detector().detect(binarized);
  const decoder = new Decoder();
  const codes: QrWorkerCode[] = [];
  const seen = new Set<string>();

  let current = detected.next();
  while (!current.done) {
    let succeed = false;
    const candidate = current.value;
    try {
      const decoded = decoder.decode(candidate.matrix);
      succeed = true;
      if (!seen.has(decoded.content)) {
        seen.add(decoded.content);
        const n = candidate.size;
        const corners = [
          candidate.mapping(0, 0),
          candidate.mapping(n, 0),
          candidate.mapping(n, n),
          candidate.mapping(0, n),
        ].map((p) => ({ x: p.x * scale, y: p.y * scale }));
        codes.push({ content: decoded.content, corners });
      }
    } catch {
      // Not decodable: let the detector try the next candidate.
    }
    // Telling the detector about a success lets it skip overlapping patterns
    // while still continuing on to find further codes.
    current = detected.next(succeed);
  }
  return codes;
}

// Typed as a Worker so postMessage has the worker (not window) signature.
const scope = self as unknown as Worker;

scope.onmessage = (e: MessageEvent<QrWorkerRequest>) => {
  const { id, bitmap, scale } = e.data;
  try {
    const codes = scan(bitmap, scale);
    scope.postMessage({ id, codes } satisfies QrWorkerResponse);
  } catch (err) {
    scope.postMessage({ id, error: String((err as Error)?.message ?? err) } satisfies QrWorkerResponse);
  }
};
