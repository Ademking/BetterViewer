// BetterViewer background script (Chromium service worker / Firefox event page).
// - Toolbar button: open an empty BetterViewer tab.
// - Right-click an image → "Open this image in BetterViewer": content.js shows it in
//   an overlay on the same page.
// - Right-click the page → "Browse all page images as a gallery": the same overlay as
//   a gallery of the page's pictures.
// (Images opened in a tab are handed over by content.js on its own.)
const api = globalThis.browser ?? globalThis.chrome;
const MENU_ID = "betterviewer-view-image";
const GALLERY_ID = "betterviewer-view-all";
// Web pages and local files only, not BetterViewer's own pages.
const PAGES = ["http://*/*", "https://*/*", "file:///*"];

api.action.onClicked.addListener(() => {
  api.tabs.create({ url: api.runtime.getURL("index.html") });
});

// Menus survive restarts in Chromium; Firefox event pages may need them again.
const createMenu = () =>
  Promise.resolve(api.contextMenus.removeAll()).then(() => {
    api.contextMenus.create({
      id: MENU_ID,
      title: "Open this image in BetterViewer",
      contexts: ["image"],
      documentUrlPatterns: PAGES,
    });
    api.contextMenus.create({
      id: GALLERY_ID,
      title: "Browse all page images as a gallery",
      contexts: ["page", "frame", "selection", "link"],
      documentUrlPatterns: PAGES,
    });
  });
api.runtime.onInstalled.addListener(createMenu);
api.runtime.onStartup.addListener(createMenu);

api.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  if (info.menuItemId === GALLERY_ID) {
    // Pages opened before BetterViewer was installed have no content script;
    // reloading them makes the item work.
    Promise.resolve(api.tabs.sendMessage(tab.id, { type: "betterviewer:gallery" }, { frameId: 0 })).catch(() => {});
    return;
  }
  if (info.menuItemId !== MENU_ID || !info.srcUrl) return;
  const viewer = `${api.runtime.getURL("index.html")}?src=${encodeURIComponent(info.srcUrl)}`;
  // The overlay lives in the top frame (the image may be inside an iframe).
  Promise.resolve(api.tabs.sendMessage(tab.id, { type: "betterviewer:overlay", src: info.srcUrl }, { frameId: 0 }))
    .catch(() => {
      // No content script (page opened before BetterViewer was installed, or a
      // page extensions can't touch): open the image in a new tab instead.
      if (!/^(blob|data):/i.test(info.srcUrl)) api.tabs.create({ url: viewer, index: tab.index + 1, openerTabId: tab.id });
    });
});
