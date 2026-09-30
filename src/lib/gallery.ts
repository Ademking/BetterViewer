/**
 * Page gallery (extension overlay only): right-click a web page → "View all
 * images on this page". The content script collects the page's pictures and
 * sends the list here; the viewer shows one at a time with a thumbnail rail
 * and previous / next.
 *
 * Messages with the page's content script (see extension/content.js):
 * - app → page  `betterviewer:ready`    asks for the list
 * - page → app  `betterviewer:gallery`  { items, index }
 * - app → page  `betterviewer:fetch`    { id, src } for blob: images, which
 *   only the page can read
 * - page → app  `betterviewer:blob`     { id, blob } (or { id, error })
 */
import { create } from "zustand";
import { toast } from "@/components/ui/toast";
import { confirmAction } from "@/components/panels/ConfirmDialog";
import { openBlob } from "@/lib/actions";
import { downloadBlob } from "@/lib/image";
import { fetchImage, nameFromUrl } from "@/lib/openUrl";
import { createZip } from "@/lib/zip";
import { isOverlay } from "@/lib/overlay";
import { useDoc } from "@/state/document";
import { t } from "@/lib/i18n";

export interface GalleryItem {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

interface GalleryStore {
  items: GalleryItem[];
  /** The image on screen (-1 before the first one opens). */
  index: number;
  /** Thumbnail rail shown (on by default; the top-right button toggles it). */
  railOpen: boolean;
  /** An image is being downloaded. */
  busy: boolean;
  /**
   * Object URLs for thumbnails that can't be shown by address: blob: images,
   * and sites that don't let other origins embed their pictures. "failed"
   * when even downloading them didn't work.
   */
  thumbs: Record<string, string>;
  /** Where the images come from (names the ZIP download). */
  page: { host: string; title: string } | null;
  /** "Download all as ZIP" is running. */
  zipping: boolean;
}

export const isGallery =
  isOverlay && typeof location !== "undefined" && new URLSearchParams(location.search).has("gallery");

export const useGallery = create<GalleryStore>()(() => ({
  items: [],
  index: -1,
  railOpen: true,
  busy: false,
  thumbs: {},
  page: null,
  zipping: false,
}));

export const toggleGalleryRail = () => useGallery.setState((s) => ({ railOpen: !s.railOpen }));

/* ------------------------------------------------------------------ page requests */

let nextRequest = 1;
const waiting = new Map<number, { resolve: (b: Blob) => void; reject: (e: Error) => void }>();

/** Bytes of a blob: image, read by the page (it owns the URL). */
function fetchFromPage(src: string): Promise<Blob> {
  const id = nextRequest++;
  return new Promise<Blob>((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    window.parent.postMessage({ type: "betterviewer:fetch", id, src }, "*");
    setTimeout(() => {
      if (waiting.delete(id)) reject(new Error(t("The page didn't send the image.")));
    }, 20000);
  });
}

/**
 * The image's bytes: blob: images come from the page; others are downloaded
 * with the extension's permissions, then by the page itself as a last resort
 * (some sites only answer requests made from their own pages).
 */
const loadBlob = (src: string) =>
  /^blob:/i.test(src) ? fetchFromPage(src) : fetchImage(src).catch(() => fetchFromPage(src));

const thumbRequests = new Set<string>();

/** A thumbnail the rail couldn't show by address: download it instead. */
export async function loadThumb(src: string) {
  if (thumbRequests.has(src)) return;
  thumbRequests.add(src);
  let url = "failed";
  try {
    url = URL.createObjectURL(await loadBlob(src));
  } catch {
    // keep the placeholder
  }
  useGallery.setState((s) => ({ thumbs: { ...s.thumbs, [src]: url } }));
}

/* ------------------------------------------------------------------ navigation */

let loadToken = 0;

async function load(i: number) {
  const item = useGallery.getState().items[i];
  if (!item) return;
  const token = ++loadToken;
  useGallery.setState({ index: i, busy: true });
  try {
    const blob = await loadBlob(item.src);
    if (token !== loadToken) return; // the reader already moved on
    const web = /^https?:/i.test(item.src);
    await openBlob(blob, nameFromUrl(item.src, blob.type), web ? { sourceUrl: item.src } : undefined);
  } catch (err) {
    if (token !== loadToken) return;
    toast.error({
      title: t("Couldn't open this image"),
      description: (err as Error).message || t("The image couldn't be downloaded."),
    });
  } finally {
    if (token === loadToken) useGallery.setState({ busy: false });
  }
}

/** Show image `i`; asks first when the current one has unsaved edits. */
export function showGalleryItem(i: number) {
  const { items, index } = useGallery.getState();
  if (i < 0 || i >= items.length || i === index) return;
  if (useDoc.getState().past.length > 0) {
    confirmAction({
      title: t("Discard your edits?"),
      description: t("Moving to another image drops the changes made to this one."),
      confirmLabel: t("Discard"),
      destructive: true,
      onConfirm: () => void load(i),
    });
    return;
  }
  void load(i);
}

/** Previous / next image, wrapping around. Returns false outside a gallery. */
export function stepGallery(delta: 1 | -1) {
  const { items, index } = useGallery.getState();
  if (!isGallery || items.length < 2) return false;
  showGalleryItem((index + delta + items.length) % items.length);
  return true;
}

/* ------------------------------------------------------------------ start */

let started = false;

export function startGallery() {
  if (!isGallery || started) return;
  started = true;
  window.addEventListener(
    "message",
    (e: MessageEvent<{ type?: string; id?: number; blob?: Blob; error?: string; items?: GalleryItem[]; index?: number; page?: GalleryStore["page"] }>) => {
      if (e.source !== window.parent) return;
      const data = e.data;
      if (data?.type === "betterviewer:blob" && typeof data.id === "number") {
        const request = waiting.get(data.id);
        if (!request) return;
        waiting.delete(data.id);
        if (data.blob instanceof Blob) request.resolve(data.blob);
        else request.reject(new Error(data.error || t("The page couldn't read the image.")));
      } else if (data?.type === "betterviewer:gallery" && Array.isArray(data.items)) {
        const items = data.items.filter((it) => typeof it?.src === "string");
        useGallery.setState({ items, index: -1, page: data.page ?? null });
        if (!items.length) {
          toast.info({ title: t("No images found"), description: t("This page has no pictures BetterViewer can open.") });
          return;
        }
        for (const { src } of items) if (/^blob:/i.test(src)) void loadThumb(src);
        showGalleryItem(Math.min(Math.max(0, data.index ?? 0), items.length - 1));
      }
    }
  );
  window.parent.postMessage({ type: "betterviewer:ready" }, "*");
}

/* ------------------------------------------------------------------ download all */

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/bmp": "bmp",
};

/** "photo.jpg" twice becomes "photo.jpg" and "photo (2).jpg". */
function uniqueName(name: string, taken: Set<string>) {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let candidate = name;
  for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${stem} (${n})${ext}`;
  taken.add(candidate.toLowerCase());
  return candidate;
}

/** Download every image of the gallery in one ZIP file. */
export async function downloadGalleryZip() {
  const { items, page, zipping } = useGallery.getState();
  if (!items.length || zipping) return;
  useGallery.setState({ zipping: true });
  const id = toast.create({
    type: "loading",
    title: t("Downloading {count} images…", { count: items.length }),
    description: t("{done} of {total}", { done: 0, total: items.length }),
    duration: Number.POSITIVE_INFINITY,
    closable: false,
  });

  const results: ({ name: string; blob: Blob } | null)[] = new Array(items.length).fill(null);
  let done = 0;
  let next = 0;
  // A few at a time: fast, without flooding the site.
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        const blob = await loadBlob(items[i].src);
        let name = nameFromUrl(items[i].src, blob.type).replace(/[\\/:*?"<>|]+/g, "_");
        const ext = EXT_BY_TYPE[blob.type];
        if (ext && !/\.[a-z0-9]{2,5}$/i.test(name)) name += `.${ext}`;
        results[i] = { name, blob };
      } catch {
        // counted as failed below
      }
      done++;
      toast.update(id, { description: t("{done} of {total}", { done, total: items.length }) });
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(4, items.length) }, worker));
    const taken = new Set<string>();
    const files = results
      .filter((r): r is { name: string; blob: Blob } => r !== null)
      .map((r, i) => ({ name: uniqueName(`${String(i + 1).padStart(3, "0")}-${r.name}`, taken), data: r.blob }));
    if (!files.length) throw new Error(t("None of the images could be downloaded."));
    const zip = await createZip(files);
    const site = (page?.host || "page").replace(/^www\./, "").replace(/[^a-z0-9.-]+/gi, "_");
    downloadBlob(zip, `${site}-images.zip`);
    const failed = items.length - files.length;
    toast.update(id, {
      type: "success",
      title: t("Saved {count} images", { count: files.length }),
      description: failed ? t("{count} couldn't be downloaded.", { count: failed }) : t("All images are in the ZIP file."),
      duration: 6000,
      closable: true,
    });
  } catch (err) {
    toast.update(id, {
      type: "error",
      title: t("Couldn't create the ZIP"),
      description: (err as Error).message,
      duration: 8000,
      closable: true,
    });
  } finally {
    useGallery.setState({ zipping: false });
  }
}
