/**
 * Desktop app (Tauri, see src-tauri/): opens files by path ("Open with",
 * file associations, the Open dialog, drag and drop), browses the other
 * images of their folder with the gallery rail, saves with the Save dialog,
 * and sends web links to the default browser.
 *
 * Commands (src-tauri/src/lib.rs):
 * - `launch_paths`      files the app was started with
 * - `list_folder`       { dir, files } images next to a file, in Explorer's order
 * - `read_image`        a file's bytes
 * - `pick_image`        the Open dialog
 * - `choose_save_path`  the Save dialog, then `write_saved_file` with the bytes
 * Event: `open-paths` files opened while the app is already running.
 */
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { toast } from "@/components/ui/toast";
import { toggleFullscreen } from "@/components/viewer/TitleBar";
import { openBlob, receiveImage } from "@/lib/actions";
import { useGallery } from "@/lib/gallery";
import { supportedFormatsText, TYPE_BY_EXT } from "@/lib/image";
import { isDesktop } from "@/lib/platform";
import { useDoc } from "@/state/document";
import { t } from "@/lib/i18n";

/* ------------------------------------------------------------------ paths */

/** "C:\photos\cat.jpg" → "cat.jpg" (either slash). */
export const fileName = (path: string) => path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);

/** "C:\photos\cat.jpg" → "C:\photos". */
const dirName = (path: string) => path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")));

const extension = (path: string) => /\.([^.\\/]+)$/.exec(path)?.[1].toLowerCase() ?? "";

const isImagePath = (path: string) => extension(path) in TYPE_BY_EXT;

/** Folder of the image on screen, where Open and Save dialogs start. */
const currentDir = () => {
  const path = useDoc.getState().original?.filePath;
  return path ? dirName(path) : null;
};

/* ------------------------------------------------------------------ files */

/** An image file's contents, typed by its extension. */
export async function readImageFile(path: string): Promise<Blob> {
  const bytes = await invoke<ArrayBuffer>("read_image", { path });
  return new Blob([bytes], { type: TYPE_BY_EXT[extension(path)] ?? "" });
}

/** Save dialog, then write the file. False when the user cancelled. */
export async function saveFile(blob: Blob, name: string): Promise<boolean> {
  const path = await invoke<string | null>("choose_save_path", { name, dir: currentDir() });
  if (!path) return false;
  await invoke("write_saved_file", new Uint8Array(await blob.arrayBuffer()));
  return true;
}

/**
 * Open an image file; it comes with its folder for previous / next.
 * `replace`: open it even over an image, without asking whether to add it on
 * top (files opened from Explorer).
 */
export async function openPath(path: string, replace = false) {
  try {
    const blob = await readImageFile(path);
    await (replace ? openBlob : receiveImage)(blob, fileName(path), { filePath: path });
  } catch (err) {
    toast.error({ title: t("Couldn't open image"), description: String((err as Error)?.message ?? err) });
  }
}

/** The first image among dropped or launched files. */
function openPaths(paths: string[], replace = false) {
  const path = paths.find(isImagePath);
  if (path) void openPath(path, replace);
  else if (paths.length) {
    toast.error({
      title: t("Unsupported file"),
      description: t("Use a {formats} image.", { formats: supportedFormatsText() }),
    });
  }
}

/** "Open image…": the system's Open dialog. */
export async function pickAndOpenImage() {
  const path = await invoke<string | null>("pick_image", { dir: currentDir() });
  if (path) await openPath(path);
}

/* ------------------------------------------------------------------ folder gallery */

/** Folder shown in the gallery rail. */
let galleryDir: string | null = null;

/**
 * Keep the gallery rail on the folder of the image on screen: list it when
 * an image from another folder (or a new file) opens, empty it for images
 * that aren't files (pasted, sample).
 */
async function syncFolder(path: string | undefined) {
  if (!path) {
    galleryDir = null;
    useGallery.setState({ items: [], index: -1, thumbs: {} });
    return;
  }
  const dir = dirName(path);
  const known = dir === galleryDir && useGallery.getState().items.some((it) => it.path === path);
  if (!known) {
    let files = [path];
    try {
      files = (await invoke<{ dir: string; files: string[] }>("list_folder", { path })).files;
    } catch {
      // unreadable folder: just this image
    }
    // The user may have moved on meanwhile.
    if (useDoc.getState().original?.filePath !== path) return;
    galleryDir = dir;
    useGallery.setState({
      items: files.map((f) => ({ src: convertFileSrc(f), alt: fileName(f), path: f })),
      thumbs: {},
    });
  }
  useGallery.setState({ index: useGallery.getState().items.findIndex((it) => it.path === path) });
}

/* ------------------------------------------------------------------ drag and drop */

/**
 * Files dragged onto the window. The app handles them (instead of the page)
 * to get their paths, so the rest of their folder can be browsed.
 */
export function onFileDrop(setDragging: (on: boolean) => void) {
  const unlisten = getCurrentWebview().onDragDropEvent(({ payload }) => {
    if (payload.type === "enter") setDragging(payload.paths.length > 0);
    else if (payload.type === "leave") setDragging(false);
    else if (payload.type === "drop") {
      setDragging(false);
      openPaths(payload.paths);
    }
  });
  return () => void unlisten.then((stop) => stop());
}

/* ------------------------------------------------------------------ links */

const isWebLink = (url: URL) => /^(https?|mailto):$/.test(url.protocol) && url.origin !== location.origin;

/** Web links open in the default browser, not in the app's window. */
function sendLinksToBrowser() {
  const open = window.open.bind(window);
  window.open = (url?: string | URL, target?: string, features?: string) => {
    if (url) {
      const href = new URL(url, location.href);
      if (isWebLink(href)) {
        void openUrl(href.href);
        return null;
      }
    }
    return open(url, target, features);
  };
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!a || a.hasAttribute("download")) return;
      const href = new URL(a.href);
      if (!isWebLink(href)) return;
      e.preventDefault();
      void openUrl(href.href);
    },
    true
  );
}

/* ------------------------------------------------------------------ start */

/** The window's title bar (the page title isn't shown anywhere else). */
export function setWindowTitle(title: string) {
  if (isDesktop) void getCurrentWindow().setTitle(title);
}

let started = false;

export function startDesktop() {
  if (!isDesktop || started) return;
  started = true;
  sendLinksToBrowser();
  window.addEventListener("keydown", (e) => {
    if (e.key !== "F11") return;
    e.preventDefault();
    toggleFullscreen();
  });
  useDoc.subscribe((s, prev) => {
    if (s.original !== prev.original) void syncFolder(s.original?.filePath);
  });
  // Sent to one window (the last used), so only this window's own events.
  void getCurrentWebviewWindow().listen<string[]>("open-paths", (e) => openPaths(e.payload, true));
  void invoke<string[]>("launch_paths").then((paths) => openPaths(paths, true));
}
