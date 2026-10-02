// BetterViewer background script (Chromium service worker / Firefox event page).
// - Toolbar button: a popup (popup.html) to open an empty BetterViewer, take a
//   screenshot, browse the page's images, or open Settings / Shortcuts / About.
//   Its right-click menu also has "Screenshot this page" and "Browse all page
//   images as a gallery".
// - Right-click an image → "Open this image in BetterViewer": content.js shows it in
//   an overlay on the same page.
// - Right-click the page → "Browse all page images as a gallery": the same overlay as
//   a gallery of the page's pictures.
// - Keyboard: Alt+Shift+G opens the gallery, Alt+Shift+S takes a screenshot.
// (Images opened in a tab are handed over by content.js on its own.)
const api = globalThis.browser ?? globalThis.chrome;
const MENU_ID = "betterviewer-view-image";
const GALLERY_ID = "betterviewer-view-all";
const ACTION_GALLERY_ID = "betterviewer-action-gallery";
const ACTION_SCREENSHOT_ID = "betterviewer-action-screenshot";
// Web pages and local files only, not BetterViewer's own pages.
const PAGES = ["http://*/*", "https://*/*", "file:///*"];

/** Text in the browser's language (extension/_locales), English as a fallback. */
const msg = (key, fallback) => api.i18n?.getMessage(key) || fallback;

const viewerUrl = (query = "") => `${api.runtime.getURL("index.html")}${query}`;

const menuItems = () => [
  {
    id: MENU_ID,
    title: msg("menuOpenImage", "Open this image in BetterViewer"),
    contexts: ["image"],
    documentUrlPatterns: PAGES,
  },
  {
    id: GALLERY_ID,
    title: msg("menuGallery", "Browse all page images as a gallery"),
    contexts: ["page", "frame", "selection", "link"],
    documentUrlPatterns: PAGES,
  },
  // Right-click on the toolbar button.
  { id: ACTION_SCREENSHOT_ID, title: msg("menuScreenshot", "Screenshot this page"), contexts: ["action"] },
  { id: ACTION_GALLERY_ID, title: msg("menuGallery", "Browse all page images as a gallery"), contexts: ["action"] },
];

// Firefox reports menu errors through promises, Chrome through callbacks.
const isFirefox = typeof api.runtime.getBrowserInfo === "function";
const removeMenu = (id) =>
  isFirefox
    ? api.contextMenus.remove(id).catch(() => {})
    : new Promise((resolve) => api.contextMenus.remove(id, () => resolve(void api.runtime.lastError)));
const addMenu = (item) =>
  isFirefox ? api.contextMenus.create(item) : api.contextMenus.create(item, () => void api.runtime.lastError);

// Menus survive restarts in Chromium; Firefox event pages may need them again.
// Each item is replaced on its own: in Chrome, contextMenus.removeAll() would
// also remove the incognito copy's menus (and the other way round). Calls are
// queued so two of them never interleave.
let menus = Promise.resolve();
const createMenu = () =>
  (menus = menus
    .then(async () => {
      for (const item of menuItems()) {
        await removeMenu(item.id);
        addMenu(item);
      }
    })
    .catch(() => {}));
api.runtime.onInstalled.addListener(createMenu);
api.runtime.onStartup.addListener(createMenu);
// Chrome runs a separate copy for incognito windows (manifest "incognito":
// "split") that gets neither event, so it makes its own menus when it starts.
if (api.extension?.inIncognitoContext) createMenu();

/* ------------------------------------------------------------------ gallery */

// Pages opened before BetterViewer was installed have no content script;
// reloading them makes the gallery work.
const openGallery = (tab) =>
  Promise.resolve(api.tabs.sendMessage(tab.id, { type: "betterviewer:gallery" }, { frameId: 0 })).catch(() => {});

/* ------------------------------------------------------------------ screenshot */

// A screenshot waiting for the BetterViewer tab that will show it (used when
// the page can't host the overlay).
let pendingScreenshot = null;

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
};

/** Capture the visible part of the tab and open it in BetterViewer to annotate. */
async function screenshot(tab) {
  const send = (message) => Promise.resolve(api.tabs.sendMessage(tab.id, message, { frameId: 0 }));
  // Take BetterViewer's own overlay off the page first.
  const hasContentScript = await send({ type: "betterviewer:hide-ui" }).then(
    () => true,
    () => false
  );
  let dataUrl;
  try {
    dataUrl = await api.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  } catch {
    return; // pages the browser protects (settings, the web store, ...)
  }
  const name = `Screenshot ${stamp()}.png`;
  if (hasContentScript) {
    const shown = await send({ type: "betterviewer:overlay", src: dataUrl, name }).then(
      () => true,
      () => false
    );
    if (shown) return;
  }
  pendingScreenshot = { dataUrl, name };
  api.tabs.create({ url: viewerUrl("?screenshot=1"), index: tab.index + 1, openerTabId: tab.id });
}

api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "betterviewer:get-screenshot") {
    sendResponse(pendingScreenshot);
    pendingScreenshot = null;
  } else if (message?.type === "betterviewer:screenshot" && typeof message.tabId === "number") {
    // From the toolbar popup, which closes right after asking.
    Promise.resolve(api.tabs.get(message.tabId)).then((tab) => screenshot(tab), () => {});
    sendResponse(true);
  } else if (message?.type === "betterviewer:gallery" && typeof message.tabId === "number") {
    Promise.resolve(api.tabs.get(message.tabId)).then((tab) => openGallery(tab), () => {});
    sendResponse(true);
  }
});

/* ------------------------------------------------------------------ triggers */

api.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  if (info.menuItemId === GALLERY_ID || info.menuItemId === ACTION_GALLERY_ID) {
    openGallery(tab);
    return;
  }
  if (info.menuItemId === ACTION_SCREENSHOT_ID) {
    void screenshot(tab);
    return;
  }
  if (info.menuItemId !== MENU_ID || !info.srcUrl) return;
  const viewer = viewerUrl(`?src=${encodeURIComponent(info.srcUrl)}`);
  // The overlay lives in the top frame (the image may be inside an iframe).
  Promise.resolve(api.tabs.sendMessage(tab.id, { type: "betterviewer:overlay", src: info.srcUrl }, { frameId: 0 }))
    .catch(() => {
      // No content script (page opened before BetterViewer was installed, or a
      // page extensions can't touch): open the image in a new tab instead.
      if (!/^(blob|data):/i.test(info.srcUrl)) api.tabs.create({ url: viewer, index: tab.index + 1, openerTabId: tab.id });
    });
});

api.commands.onCommand.addListener(async (command, commandTab) => {
  const tab = commandTab?.id ? commandTab : (await api.tabs.query({ active: true, currentWindow: true }))[0];
  if (!tab?.id) return;
  if (command === "open-gallery") openGallery(tab);
  else if (command === "take-screenshot") void screenshot(tab);
});
