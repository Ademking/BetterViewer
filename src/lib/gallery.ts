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
import { fetchImage, nameFromUrl } from "@/lib/openUrl";
import { isOverlay } from "@/lib/overlay";
import { useDoc } from "@/state/document";

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
  /** Thumbnail rail shown (hidden by default on narrow screens). */
  railOpen: boolean;
  /** An image is being downloaded. */
  busy: boolean;
  /**
   * Object URLs for thumbnails that can't be shown by address: blob: images,
   * and sites that don't let other origins embed their pictures. "failed"
   * when even downloading them didn't work.
   */
  thumbs: Record<string, string>;
}

export const isGallery =
  isOverlay && typeof location !== "undefined" && new URLSearchParams(location.search).has("gallery");

export const useGallery = create<GalleryStore>()(() => ({
  items: [],
  index: -1,
  railOpen: typeof window !== "undefined" && window.innerWidth >= 640,
  busy: false,
  thumbs: {},
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
      if (waiting.delete(id)) reject(new Error("The page didn't send the image."));
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
      title: "Couldn't open this image",
      description: (err as Error).message || "The image couldn't be downloaded.",
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
      title: "Discard your edits?",
      description: "Moving to another image drops the changes made to this one.",
      confirmLabel: "Discard",
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
    (e: MessageEvent<{ type?: string; id?: number; blob?: Blob; error?: string; items?: GalleryItem[]; index?: number }>) => {
      if (e.source !== window.parent) return;
      const data = e.data;
      if (data?.type === "betterviewer:blob" && typeof data.id === "number") {
        const request = waiting.get(data.id);
        if (!request) return;
        waiting.delete(data.id);
        if (data.blob instanceof Blob) request.resolve(data.blob);
        else request.reject(new Error(data.error || "The page couldn't read the image."));
      } else if (data?.type === "betterviewer:gallery" && Array.isArray(data.items)) {
        const items = data.items.filter((it) => typeof it?.src === "string");
        useGallery.setState({ items, index: -1 });
        if (!items.length) {
          toast.info({ title: "No images found", description: "This page has no pictures BetterViewer can open." });
          return;
        }
        for (const { src } of items) if (/^blob:/i.test(src)) void loadThumb(src);
        showGalleryItem(Math.min(Math.max(0, data.index ?? 0), items.length - 1));
      }
    }
  );
  window.parent.postMessage({ type: "betterviewer:ready" }, "*");
}
