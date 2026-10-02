/**
 * Running as a browser extension (Chromium or Firefox) vs. as a website.
 * Extension pages can't load code from the network, so heavy libraries use
 * copies bundled under /vendor (see vite.config.ts); they're also where the
 * extension APIs (storage, "open original") are available.
 */

export const isExtension =
  typeof location !== "undefined" && /^(chrome|moz|safari-web)-extension:$/.test(location.protocol);

/** Minimal slice of the WebExtension API the app uses (`browser` in Firefox, `chrome` in Chromium). */
interface ExtensionApi {
  storage: {
    local: {
      get(keys: string | string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
  runtime: {
    sendMessage(message: unknown): Promise<unknown>;
  };
}

export const extensionApi: ExtensionApi | null = isExtension
  ? ((globalThis as unknown as { browser?: ExtensionApi; chrome?: ExtensionApi }).browser ??
    (globalThis as unknown as { chrome?: ExtensionApi }).chrome ??
    null)
  : null;

const platform =
  typeof navigator === "undefined"
    ? ""
    : ((navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
      navigator.platform ??
      "");

/** Apple platforms (macOS, iPadOS, iOS) label keys differently. */
export const isMac = /mac|iphone|ipad|ipod/i.test(platform);
/** The command key: ⌘ on Apple platforms, Ctrl elsewhere. */
export const MOD = isMac ? "⌘" : "Ctrl";
/** Alt is called Option on Apple keyboards. */
export const ALT = isMac ? "Option" : "Alt";

/** Absolute URL of a file bundled under /vendor in the extension build. */
export const vendorUrl = (path: string) => new URL(`/vendor/${path}`, location.origin).href;

/* ------------------------------------------------------------------ settings shared with the content script */

/** Open images viewed in a tab with BetterViewer automatically (default on). */
export async function getAutoOpen(): Promise<boolean> {
  if (!extensionApi) return false;
  const { autoOpen } = await extensionApi.storage.local.get("autoOpen");
  return autoOpen !== false;
}

export async function setAutoOpen(value: boolean) {
  await extensionApi?.storage.local.set({ autoOpen: value });
}

/** URL that shows the original image without being redirected back here. */
export const originalUrl = (src: string) => {
  const u = new URL(src, location.href);
  u.hash = "bv-original";
  return u.href;
};
