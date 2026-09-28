// BetterViewer background script (Chromium service worker / Firefox event page).
// Toolbar button: open an empty BetterViewer tab. (Images opened in a tab are
// handed over by content.js.)
const api = globalThis.browser ?? globalThis.chrome;

api.action.onClicked.addListener(() => {
  api.tabs.create({ url: api.runtime.getURL("index.html") });
});
