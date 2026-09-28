/// <reference lib="webworker" />
import { env, pipeline, RawImage } from "@huggingface/transformers";

/**
 * Background removal off the main thread: the model runs here, so the page
 * never freezes and ONNX Runtime doesn't need its own "proxy" worker (which
 * re-imports the app bundle and can't run in a worker).
 */

const MODEL = "onnx-community/ormbg-ONNX";

type Backend = { device: "webgpu" | "wasm"; dtype: "fp16" | "q8" };
type Segmenter = (image: RawImage) => Promise<unknown>;

interface RunMessage {
  id: number;
  image: Blob;
  backend: Backend;
  /** Bundled ONNX Runtime files (extension pages can't load them from a CDN). */
  ortPaths: { mjs: string; wasm: string } | null;
}

let segmenter: { device: Backend["device"]; promise: Promise<Segmenter> } | null = null;

function configure(ortPaths: RunMessage["ortPaths"]) {
  const wasm = env.backends.onnx?.wasm as { proxy?: boolean; wasmPaths?: unknown } | undefined;
  if (!wasm) return;
  wasm.proxy = false; // already off the main thread
  if (ortPaths) {
    env.useWasmCache = false; // it would import the runtime from a blob: URL
    wasm.wasmPaths = ortPaths;
  }
}

function getSegmenter(backend: Backend, id: number) {
  if (segmenter?.device === backend.device) return segmenter.promise;
  const promise = pipeline("background-removal", MODEL, {
    ...backend,
    progress_callback: (e: unknown) => self.postMessage({ id, type: "progress", event: e }),
  }) as unknown as Promise<Segmenter>;
  segmenter = { device: backend.device, promise };
  // Allow a retry after a failed download.
  promise.catch(() => {
    if (segmenter?.promise === promise) segmenter = null;
  });
  return promise;
}

self.onmessage = async (e: MessageEvent<RunMessage>) => {
  const { id, image, backend, ortPaths } = e.data;
  try {
    configure(ortPaths);
    const segment = await getSegmenter(backend, id);
    const out = await segment(await RawImage.fromBlob(image));
    const result = (Array.isArray(out) ? out[0] : out) as RawImage;
    const blob = await result.toBlob("image/png");
    self.postMessage({ id, type: "done", blob });
  } catch (err) {
    self.postMessage({ id, type: "error", message: (err as Error)?.message ?? String(err) });
  }
};
