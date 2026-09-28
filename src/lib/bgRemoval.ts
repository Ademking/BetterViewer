import { toast } from "@/components/ui/toast";
import { MOD } from "@/components/tools/ToolButton";
import { baseName, imageInfoFromBlob } from "@/lib/image";
import { getDoc, updateDoc } from "@/state/document";
import { isExtension, vendorUrl } from "@/lib/platform";
import { getSettings } from "@/state/settings";

/**
 * Background removal with ormbg (Apache-2.0, ISNet-based) via Transformers.js.
 * Runs entirely in the browser; the model is downloaded once and cached.
 * (BiRefNet was tried first: its 1024² graph runs out of WASM memory and
 * exceeds common WebGPU limits.) The model runs in bgRemoval.worker.ts.
 */

/** Download size per variant, for the progress message. */
const MODEL_MB = { fp16: 88, q8: 44 } as const;

type Backend = { device: "webgpu" | "wasm"; dtype: "fp16" | "q8" };

/** Set once WebGPU fails on this device, so later runs go straight to WASM. */
let gpuBroken = false;
let busy = false;
/** Runs don't need to download the model again once a worker has loaded it. */
let modelLoaded = false;

interface ProgressEvent {
  status: string;
  loaded?: number;
  total?: number;
  progress?: number;
}

/**
 * Some segmentation shaders bind more than 16 storage buffers; GPUs capped at
 * 16 fail there (and poison later sessions in the page), so they use the CPU.
 */
const REQUIRED_STORAGE_BUFFERS = 17;

interface GpuAdapterLike {
  features: Set<string>;
  limits: { maxStorageBuffersPerShaderStage: number };
}

/** WebGPU when the adapter can run the model, otherwise WASM on the CPU. */
async function pickBackend(): Promise<Backend> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<GpuAdapterLike | null> } }).gpu;
  if (gpu && !gpuBroken) {
    try {
      const adapter = await gpu.requestAdapter();
      if (
        adapter &&
        adapter.features.has("shader-f16") &&
        adapter.limits.maxStorageBuffersPerShaderStage >= REQUIRED_STORAGE_BUFFERS
      ) {
        return { device: "webgpu", dtype: "fp16" };
      }
    } catch {
      // fall through to WASM
    }
  }
  // 8-bit quantised weights: 4× smaller download and lighter on memory.
  return { device: "wasm", dtype: "q8" };
}

/* ------------------------------------------------------------------ worker */

let worker: Worker | null = null;
let nextId = 1;

const getWorker = () =>
  (worker ??= new Worker(new URL("./bgRemoval.worker.ts", import.meta.url), { type: "module" }));

/** A worker whose GPU session failed can't recover; start a fresh one. */
const resetWorker = () => {
  worker?.terminate();
  worker = null;
};

function runInWorker(image: Blob, backend: Backend, onProgress: (e: ProgressEvent) => void): Promise<Blob> {
  const w = getWorker();
  const id = nextId++;
  const ortPaths = isExtension
    ? {
        mjs: vendorUrl("ort/ort-wasm-simd-threaded.asyncify.mjs"),
        wasm: vendorUrl("ort/ort-wasm-simd-threaded.asyncify.wasm"),
      }
    : null;
  return new Promise((resolve, reject) => {
    const onMessage = (e: MessageEvent<{ id: number; type: string; event?: ProgressEvent; blob?: Blob; message?: string }>) => {
      if (e.data.id !== id) return;
      if (e.data.type === "progress" && e.data.event) {
        onProgress(e.data.event);
        return;
      }
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      if (e.data.type === "done" && e.data.blob) resolve(e.data.blob);
      else reject(new Error(e.data.message || "The model failed to run in this browser."));
    };
    const onError = (e: ErrorEvent) => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      resetWorker();
      reject(new Error(e.message || "The background removal worker stopped."));
    };
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    w.postMessage({ id, image, backend, ortPaths });
  });
}

/**
 * Run the model; if the GPU can't run it (some adapters fail at runtime even
 * when they look capable), retry right away on the CPU in a fresh worker.
 * Files are cached, so the retry doesn't download the GPU model again.
 */
async function segment(image: Blob, backend: Backend, onProgress: (e: ProgressEvent) => void, onFallback: () => void) {
  try {
    return await runInWorker(image, backend, onProgress);
  } catch (err) {
    if (backend.device !== "webgpu") throw err;
    gpuBroken = true;
    resetWorker();
    onFallback();
    return runInWorker(image, { device: "wasm", dtype: "q8" }, onProgress);
  }
}

/** Remove the background of the current image (undoable). */
export async function removeBackground() {
  const doc = getDoc();
  if (!doc || busy) return;
  busy = true;
  const src = doc.image.src;
  const loaded = modelLoaded;
  const backend = await pickBackend();

  const id = toast.create({
    type: "loading",
    title: "Removing background…",
    description: loaded
      ? "Processing on your device…"
      : `Loading the model (≈${MODEL_MB[backend.dtype]} MB, downloaded once)…`,
    duration: Number.POSITIVE_INFINITY,
    closable: false,
  });

  let lastPct = -1;
  const onProgress = (e: ProgressEvent) => {
    if (e.status !== "progress_total" || !e.total) return;
    const pct = Math.floor(((e.loaded ?? 0) / e.total) * 100);
    if (pct === lastPct) return;
    lastPct = pct;
    toast.update(id, {
      description:
        pct >= 100
          ? "Processing on your device…"
          : `Downloading model… ${pct}% (${Math.round((e.total ?? 0) / 1e6)} MB, once)`,
    });
  };

  try {
    const image = await (await fetch(src)).blob();
    const blob = await segment(image, backend, onProgress, () =>
      toast.update(id, { description: "Your GPU couldn't run the model, so it's using the CPU instead…" })
    );
    modelLoaded = true;

    // The user may have moved on to another image meanwhile.
    const current = getDoc();
    if (!current || current.image.src !== src) {
      toast.dismiss(id);
      return;
    }
    const info = await imageInfoFromBlob(blob, `${baseName(current.image.name)}.png`);
    updateDoc((d) => ({ ...d, image: { ...info, backgroundRemoved: true } }));

    toast.update(id, {
      type: "success",
      title: "Background removed",
      description: `Undo with ${MOD} Z if you want it back.`,
      duration: 6000,
      closable: true,
      action:
        getSettings().boardBackground === "grid"
          ? undefined
          : { label: "Show transparency", onClick: () => getSettings().set("boardBackground", "grid") },
    });
  } catch (err) {
    toast.update(id, {
      type: "error",
      title: "Couldn't remove the background",
      description: (err as Error).message || "The model failed to run in this browser.",
      duration: 8000,
      closable: true,
    });
  } finally {
    busy = false;
  }
}
