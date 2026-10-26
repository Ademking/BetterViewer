import { deriveAnimation } from "@/lib/animation";
import type { ImageInfo } from "@/state/document";
import { saveFile } from "@/lib/desktop";
import { currentLanguage, t } from "@/lib/i18n";
import { isDesktop } from "@/lib/platform";

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
        reject(new Error(t("The file could not be decoded as an image.")));
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
  "image/jxl",
];

/** MIME type by file extension, for files and servers that don't say. */
export const TYPE_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  bmp: "image/bmp",
  ico: "image/x-icon",
  jxl: "image/jxl",
};

/** File-picker filter: the formats above (SVG is not supported). */
export const ACCEPT_ATTRIBUTE = [...ACCEPTED_TYPES, ".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".bmp", ".ico", ".jxl"].join(",");

/** "PNG, JPEG, … or ICO" in the interface language. */
export const supportedFormatsText = () =>
  new Intl.ListFormat(currentLanguage(), { type: "disjunction" }).format(["PNG", "JPEG", "WebP", "GIF", "AVIF", "BMP", "ICO", "JPEG XL"]);

/** Raster images only: SVG is not supported. */
export const isSupportedImageType = (type: string) => type.startsWith("image/") && !type.includes("svg");

export const isImageFile = (f: File) =>
  !/\.svgz?$/i.test(f.name) &&
  (isSupportedImageType(f.type) || (!f.type && /\.(png|jpe?g|webp|gif|avif|bmp|ico|jxl)$/i.test(f.name)));

/** JPEG XL signature: a bare codestream, or the ISO box container. */
async function isJxl(blob: Blob) {
  const b = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  return (b[0] === 0xff && b[1] === 0x0a) || [0, 0, 0, 0x0c, 0x4a, 0x58, 0x4c, 0x20].every((v, i) => b[i] === v);
}

/**
 * Most browsers can't show JPEG XL, so it is decoded here (WebAssembly,
 * loaded on first use) into a PNG the rest of the app works with.
 */
async function jxlToPng(blob: Blob): Promise<Blob> {
  const { default: decode } = await import("@jsquash/jxl/decode");
  const data = await decode(await blob.arrayBuffer());
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  canvas.getContext("2d")!.putImageData(data, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(t("The file could not be decoded as an image.")))), "image/png")
  );
}

/** The blob, or a PNG of it when it's JPEG XL (see jxlToPng). */
export const displayableBlob = async (blob: Blob) => ((await isJxl(blob)) ? jxlToPng(blob) : blob);

export async function imageInfoFromBlob(
  blob: Blob,
  name: string
): Promise<ImageInfo> {
  const shown = await displayableBlob(blob);
  const src = URL.createObjectURL(shown);
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
      (b) => (b ? resolve(b) : reject(new Error(t("Crop failed")))),
      type,
      0.95
    )
  );
  const src = URL.createObjectURL(blob);
  await loadHtmlImage(src);
  // Animations: crop every frame the same way (straight from bitmap to bitmap).
  await deriveAnimation(info.src, src, (frame) => createImageBitmap(frame, x, y, w, h));
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

/**
 * Save a file: a download in the browser, the Save dialog in the desktop app.
 * Resolves to false when the user cancelled.
 */
export const downloadBlob = async (blob: Blob, filename: string): Promise<boolean> => {
  if (isDesktop) return saveFile(blob, filename);
  if (inPageOverlay()) {
    window.parent.postMessage({ type: "betterviewer:download", blob, name: filename }, "*");
    return true;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
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
  if (!res.ok) throw new Error(t("Couldn't load the sample image ({status})", { status: res.status }));
  return imageInfoFromBlob(await res.blob(), "cat.jpg");
}
