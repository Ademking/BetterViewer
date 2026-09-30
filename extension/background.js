// BetterViewer background script (Chromium service worker / Firefox event page).
// - Toolbar button: open an empty BetterViewer tab.
// - Right-click an image → "View image in BetterViewer": content.js shows it in
//   an overlay on the same page. (Images opened in a tab are handed over by
//   content.js on its own.)
const api = globalThis.browser ?? globalThis.chrome;
const MENU_ID = "betterviewer-view-image";

api.action.onClicked.addListener(() => {
  api.tabs.create({ url: api.runtime.getURL("index.html") });
});

// Menus survive restarts in Chromium; Firefox event pages may need them again.
const createMenu = () =>
  Promise.resolve(api.contextMenus.removeAll()).then(() =>
    api.contextMenus.create({
      id: MENU_ID,
      title: "View image in BetterViewer",
      contexts: ["image"],
      // Web pages and local files only, not BetterViewer's own pages.
      documentUrlPatterns: ["http://*/*", "https://*/*", "file:///*"],
    })
  );
api.runtime.onInstalled.addListener(createMenu);
api.runtime.onStartup.addListener(createMenu);

api.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.srcUrl || !tab?.id) return;
  const viewer = `${api.runtime.getURL("index.html")}?src=${encodeURIComponent(info.srcUrl)}`;
  // The overlay lives in the top frame (the image may be inside an iframe).
  Promise.resolve(api.tabs.sendMessage(tab.id, { type: "betterviewer:overlay", src: info.srcUrl }, { frameId: 0 }))
    .catch(() => {
      // No content script (page opened before BetterViewer was installed, or a
      // page extensions can't touch): open the image in a new tab instead.
      if (!/^(blob|data):/i.test(info.srcUrl)) api.tabs.create({ url: viewer, index: tab.index + 1, openerTabId: tab.id });
    });
});
