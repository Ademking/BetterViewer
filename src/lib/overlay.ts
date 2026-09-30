/**
 * Overlay mode (extension only): the right-click "View image in BetterViewer"
 * item opens this app in a full-page frame on top of the web page
 * (see extension/content.js). The page stays where it was; closing the
 * overlay just removes the frame.
 *
 * Messages with the page's content script:
 * - app → page  `betterviewer:ready`  asks for the image when it can't be
 *   downloaded by address (blob: / data: images, which only the page can read)
 * - page → app  `betterviewer:image`  { blob, src } the image itself
 * - app → page  `betterviewer:close`  remove the overlay
 */
import { openBlob } from "@/lib/actions";
import { nameFromUrl } from "@/lib/openUrl";
import { isExtension } from "@/lib/platform";

const params = typeof location !== "undefined" ? new URLSearchParams(location.search) : null;

export const isOverlay = isExtension && window.top !== window && !!params?.has("overlay");

/** Remove the overlay and return to the page. */
export function closeOverlay() {
  window.parent.postMessage({ type: "betterviewer:close" }, "*");
}

/** The same image in a full BetterViewer tab (only for images with a web address). */
export const overlaySourceUrl = isOverlay ? params?.get("src") ?? null : null;

export function openOverlayInTab() {
  if (!overlaySourceUrl) return;
  window.open(`${location.origin}/index.html?src=${encodeURIComponent(overlaySourceUrl)}`, "_blank");
  closeOverlay();
}

let started = false;

/** blob: / data: images are sent by the page itself; ask for them once. */
export function receiveOverlayImage() {
  if (!isOverlay || overlaySourceUrl || started) return;
  started = true;
  window.addEventListener("message", (e: MessageEvent<{ type?: string; blob?: Blob; src?: string }>) => {
    if (e.source !== window.parent || e.data?.type !== "betterviewer:image" || !(e.data.blob instanceof Blob)) return;
    const { blob, src = "" } = e.data;
    void openBlob(blob, nameFromUrl(src, blob.type));
  });
  window.parent.postMessage({ type: "betterviewer:ready" }, "*");
}
