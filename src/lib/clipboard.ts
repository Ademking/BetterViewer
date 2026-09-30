/**
 * Writing to the clipboard, everywhere the app runs.
 *
 * Some sites (Facebook, Instagram, ...) send `Permissions-Policy:
 * clipboard-write=(self)`, which forbids the clipboard to every frame inside
 * them, including the right-click overlay. The page itself may still use it,
 * so the overlay then asks the extension's content script (which runs as part
 * of the page) to copy instead: `betterviewer:clipboard` → `betterviewer:clipboard-done`.
 */
import { isOverlay } from "@/lib/overlay";
import { t } from "@/lib/i18n";

/** Chromium reports the frame's permissions policy; other browsers don't gate the clipboard this way. */
const blockedHere = () =>
  isOverlay &&
  (document as Document & { featurePolicy?: { allowsFeature(f: string): boolean } }).featurePolicy?.allowsFeature(
    "clipboard-write"
  ) === false;

let nextId = 1;
const waiting = new Map<number, { resolve: () => void; reject: (e: Error) => void }>();
let listening = false;

function copyThroughPage(data: { text: string } | { blob: Blob }): Promise<void> {
  if (!listening) {
    listening = true;
    window.addEventListener("message", (e: MessageEvent<{ type?: string; id?: number; error?: string }>) => {
      if (e.source !== window.parent || e.data?.type !== "betterviewer:clipboard-done") return;
      const request = waiting.get(e.data.id ?? -1);
      if (!request) return;
      waiting.delete(e.data.id!);
      if (e.data.error) request.reject(new Error(e.data.error));
      else request.resolve();
    });
  }
  const id = nextId++;
  return new Promise<void>((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    window.parent.postMessage({ type: "betterviewer:clipboard", id, ...data }, "*");
    setTimeout(() => {
      if (waiting.delete(id)) reject(new Error(t("This page doesn't allow copying.")));
    }, 10000);
  });
}

/** The old copy command: not covered by permissions policies (text only). */
function execCopy(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.append(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

export async function writeClipboardText(text: string) {
  if (!blockedHere()) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      if (execCopy(text)) return;
      if (!isOverlay) throw err;
    }
  }
  if (execCopy(text)) return;
  await copyThroughPage({ text });
}

/** Copy a PNG (the only image type every browser's clipboard takes). */
export async function writeClipboardImage(png: Blob) {
  if (!blockedHere()) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      return;
    } catch (err) {
      if (!isOverlay) throw err;
    }
  }
  await copyThroughPage({ blob: png });
}
