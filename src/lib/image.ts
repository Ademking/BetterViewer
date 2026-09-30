import type { ImageInfo } from "@/state/document";

const cache = new Map<string, Promise<HTMLImageElement>>();

export const loadHtmlImage = (src: string) => {
  let p = cache.get(src);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => {
        cache.delete(src);
        reject(new Error("The file could not be decoded as an image."));
      };
      img.src = src;
    });
    cache.set(src, p);
  }
  return p;
};

export const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

/** File-picker filter: the formats above (SVG is not supported). */
export const ACCEPT_ATTRIBUTE = [...ACCEPTED_TYPES, ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".bmp", ".ico"].join(",");

export const SUPPORTED_FORMATS_TEXT = "PNG, JPEG, WebP, GIF, AVIF, BMP or ICO";

/** Raster images only: SVG is not supported. */
export const isSupportedImageType = (type: string) => type.startsWith("image/") && !type.includes("svg");

export const isImageFile = (f: File) =>
  !/\.svgz?$/i.test(f.name) &&
  (isSupportedImageType(f.type) || (!f.type && /\.(png|jpe?g|webp|gif|avif|bmp|ico)$/i.test(f.name)));

export async function imageInfoFromBlob(
  blob: Blob,
  name: string
): Promise<ImageInfo> {
  const src = URL.createObjectURL(blob);
  try {
    const img = await loadHtmlImage(src);
    await img.decode().catch(() => undefined);
    const width = img.naturalWidth || 1024;
    const height = img.naturalHeight || 1024;
    return {
      src,
      name,
      width,
      height,
      type: blob.type || "image/*",
      size: blob.size,
    };
  } catch (err) {
    URL.revokeObjectURL(src);
    throw err;
  }
}

/** Crop the source bitmap to an image-local rectangle. */
export async function cropImage(
  info: ImageInfo,
  rect: { x: number; y: number; width: number; height: number }
): Promise<ImageInfo> {
  const img = await loadHtmlImage(info.src);
  const x = Math.round(rect.x);
  const y = Math.round(rect.y);
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
  const type = info.type === "image/jpeg" ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Crop failed"))),
      type,
      0.95
    )
  );
  const src = URL.createObjectURL(blob);
  await loadHtmlImage(src);
  return { ...info, src, width: w, height: h, size: blob.size, type };
}

export const dataUrlToBlob = async (url: string) => (await fetch(url)).blob();

/**
 * In the extension's right-click overlay (a frame on someone else's page),
 * Chrome cancels downloads started by the frame, so the page's content script
 * saves the file instead (see extension/content.js).
 */
const inPageOverlay = () =>
  typeof window !== "undefined" &&
  window.top !== window &&
  /^(chrome|moz|safari-web)-extension:$/.test(location.protocol) &&
  new URLSearchParams(location.search).has("overlay");

export const downloadBlob = (blob: Blob, filename: string) => {
  if (inPageOverlay()) {
    window.parent.postMessage({ type: "betterviewer:download", blob, name: filename }, "*");
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const baseName = (name: string) => name.replace(/\.[^.]+$/, "");

export const formatBytes = (n: number) => {
  if (!n) return "-";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
};

/** The demo photo ("Try a sample"), shipped in public/. */
export async function createSampleImage(): Promise<ImageInfo> {
  const res = await fetch(`${import.meta.env.BASE_URL}cat.jpg`);
  if (!res.ok) throw new Error(`Couldn't load the sample image (${res.status})`);
  return imageInfoFromBlob(await res.blob(), "cat.jpg");
}
