import { toast } from "@/components/ui/toast";
import { openBlob } from "@/lib/actions";
import { loadHtmlImage } from "@/lib/image";
import { isOverlay } from "@/lib/overlay";
import { extensionApi, isExtension, originalUrl } from "@/lib/platform";
import { getUi } from "@/state/ui";
import { t } from "@/lib/i18n";

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/bmp": ".bmp",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
};

const TYPE_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  bmp: "image/bmp",
  ico: "image/x-icon",
};

/** A readable file name for an image URL. */
export function nameFromUrl(src: string, type: string) {
  const ext = EXT_BY_TYPE[type] ?? "";
  try {
    const u = new URL(src, location.href);
    if (u.protocol !== "data:" && u.protocol !== "blob:") {
      const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? "");
      if (last) return /\.[a-z0-9]{2,5}$/i.test(last) ? last : last + ext;
    }
  } catch {
    // not a URL
  }
  return `image${ext}`;
}

/** Servers sometimes send images as octet-stream; fall back to the file extension. */
function withImageType(blob: Blob, src: string): Blob {
  if (blob.type.startsWith("image/")) return blob;
  const ext = /\.([a-z0-9]{2,5})(?:$|[?#])/i.exec(src)?.[1]?.toLowerCase();
  const type = (ext && TYPE_BY_EXT[ext]) || "image/png";
  return new Blob([blob], { type });
}

/**
 * The image's bytes. `fetch` first: in the extension it may read any site
 * (host permissions) and sends the site's cookies, so signed-in images work.
 * Otherwise decode it with <img> and copy the pixels (only possible when the
 * browser lets this page read them).
 */
export async function fetchImage(src: string): Promise<Blob> {
  try {
    const res = await fetch(src, { credentials: "include" });
    if (!res.ok) throw new Error(t("The server answered {status}.", { status: res.status }));
    return withImageType(await res.blob(), src);
  } catch (fetchErr) {
    try {
      const img = await loadHtmlImage(src);
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      return await new Promise<Blob>((resolve, reject) =>
        c.toBlob((b) => (b ? resolve(b) : reject(fetchErr)), "image/png")
      );
    } catch {
      throw fetchErr;
    }
  }
}

let started = false;

/** Open `?src=<image url>` (how the extension hands images over). */
export async function openFromLocation() {
  const src = new URLSearchParams(location.search).get("src");
  if (!src || started) return;
  started = true;
  const ui = getUi();
  ui.set({ loading: true });
  try {
    const blob = await fetchImage(src);
    await openBlob(blob, nameFromUrl(src, blob.type), { sourceUrl: src });
  } catch (err) {
    toast.error({
      title: t("Couldn't open this image"),
      description: (err as Error).message || t("The image couldn't be downloaded."),
      action: isExtension
        ? { label: t("Open original"), onClick: () => (isOverlay ? viewOriginal(src) : location.replace(originalUrl(src))) }
        : undefined,
      duration: Number.POSITIVE_INFINITY,
    });
  } finally {
    ui.set({ loading: false });
  }
}

/**
 * `?screenshot=1`: a screenshot taken on a page that couldn't show the
 * overlay; the extension's background script hands it over.
 */
export async function openPendingScreenshot() {
  if (!extensionApi || !new URLSearchParams(location.search).has("screenshot")) return;
  const shot = (await extensionApi.runtime.sendMessage({ type: "betterviewer:get-screenshot" }).catch(() => null)) as
    | { dataUrl: string; name: string }
    | null;
  if (!shot?.dataUrl) return;
  const blob = await (await fetch(shot.dataUrl)).blob();
  await openBlob(blob, shot.name);
}

/** Leave BetterViewer and show the image the way the browser would. */
export function viewOriginal(src: string) {
  // The overlay sits on someone else's page: show the original in a new tab.
  if (isOverlay) window.open(originalUrl(src), "_blank", "noopener");
  else if (isExtension) location.assign(originalUrl(src));
  else window.open(src, "_blank", "noopener");
}
