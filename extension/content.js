// BetterViewer content script: when a tab shows an image by itself (the
// browser's built-in image viewer), open it in BetterViewer instead.
// Runs at document_start in top-level frames only.
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const type = (document.contentType || "").toLowerCase();

  // Only standalone raster images (SVG isn't supported by BetterViewer).
  if (!type.startsWith("image/") || type.includes("svg")) return;
  // "View original" from BetterViewer adds #bv-original: show the browser's viewer.
  if (location.hash === "#bv-original") return;

  const open = () => {
    const viewer = api.runtime.getURL("index.html");
    // replace(): the Back button skips the raw image page (no redirect loop).
    location.replace(`${viewer}?src=${encodeURIComponent(location.href)}`);
  };

  // On by default; can be switched off in BetterViewer → Settings → Viewer.
  Promise.resolve(api.storage.local.get("autoOpen"))
    .then((items) => {
      if (items?.autoOpen !== false) open();
    })
    .catch(open);
})();
