// BetterViewer content script. Runs at document_start in top-level frames.
// 1. When a tab shows an image by itself (the browser's built-in image
//    viewer), open it in BetterViewer instead.
// 2. "View image in BetterViewer" (right-click menu, see background.js):
//    show BetterViewer in an overlay on top of the page, without leaving it.
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const viewerUrl = api.runtime.getURL("index.html");
  const viewerOrigin = new URL(viewerUrl).origin;

  /* ---------------------------------------------------------------- overlay */

  let overlay = null;

  // Hide the page's scrollbars while the overlay is open. Inline !important
  // styles win over the page's own CSS (even its !important rules) and aren't
  // blocked by its Content Security Policy. The previous inline values are
  // kept so closing puts everything back exactly as it was.
  // Longhands only: saving a shorthand like `overflow` misses a page's own
  // `overflow-x`, which would then be lost when restoring.
  const SCROLL_LOCK = {
    "overflow-x": "hidden",
    "overflow-y": "hidden",
    "scrollbar-width": "none",
    "scrollbar-gutter": "auto",
  };

  const lockScroll = () => {
    const { scrollX, scrollY } = window;
    const saved = [];
    for (const el of [document.documentElement, document.body]) {
      if (!el) continue;
      const hadStyle = el.hasAttribute("style");
      const props = Object.entries(SCROLL_LOCK).map(([prop, value]) => {
        const before = [prop, el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)];
        el.style.setProperty(prop, value, "important");
        return before;
      });
      saved.push({ el, hadStyle, props });
    }
    return () => {
      for (const { el, hadStyle, props } of saved) {
        for (const [prop, value, priority] of props) {
          if (value) el.style.setProperty(prop, value, priority);
          else el.style.removeProperty(prop);
        }
        if (!hadStyle && !el.getAttribute("style")) el.removeAttribute("style");
      }
      // Hiding the scrollbar widens the page, which can reflow it; go back to
      // exactly where the reader was.
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
    };
  };

  const closeOverlay = () => {
    if (!overlay) return;
    const { frame, unlockScroll, onKey } = overlay;
    overlay = null;
    window.removeEventListener("keydown", onKey, true);
    unlockScroll();
    frame.style.opacity = "0";
    setTimeout(() => frame.remove(), 150);
  };

  const openOverlay = (src) => {
    closeOverlay();
    // blob: and data: images can only be read here (they belong to the page),
    // so they're sent to the viewer once it asks for them.
    const fromPage = /^(blob|data):/i.test(src);
    const url = new URL(viewerUrl);
    url.searchParams.set("overlay", "1");
    if (!fromPage) url.searchParams.set("src", src);

    const frame = document.createElement("iframe");
    frame.src = url.href;
    frame.title = "BetterViewer";
    frame.allow = "clipboard-read; clipboard-write";
    frame.style.cssText = [
      "position:fixed",
      "inset:0",
      "width:100vw",
      "height:100vh",
      "max-width:none",
      "max-height:none",
      "margin:0",
      "padding:0",
      "border:0",
      "display:block",
      "z-index:2147483647",
      "background:transparent",
      "color-scheme:normal",
      "opacity:0",
      "transition:opacity .15s ease",
    ].map((d) => `${d} !important`).join(";");

    // Esc while the page still has focus (before the frame takes it).
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeOverlay();
      }
    };
    overlay = { frame, fromPage, src, unlockScroll: lockScroll(), onKey };
    window.addEventListener("keydown", onKey, true);
    frame.addEventListener(
      "load",
      () => {
        frame.style.setProperty("opacity", "1", "important");
        frame.focus();
      },
      { once: true }
    );
    // documentElement, not body: some pages have no <body> (framesets, images).
    document.documentElement.appendChild(frame);
  };

  window.addEventListener("message", (e) => {
    if (!overlay || e.origin !== viewerOrigin || e.source !== overlay.frame.contentWindow) return;
    const type = e.data?.type;
    if (type === "betterviewer:close") closeOverlay();
    else if (type === "betterviewer:ready" && overlay.fromPage) {
      const { frame, src } = overlay;
      fetch(src)
        .then((r) => r.blob())
        .then((blob) => frame.contentWindow?.postMessage({ type: "betterviewer:image", blob, src }, viewerOrigin))
        .catch(() => closeOverlay());
    }
  });

  api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "betterviewer:overlay" || typeof message.src !== "string") return;
    openOverlay(message.src);
    // Answering tells background.js the overlay is shown (no new-tab fallback).
    sendResponse(true);
  });

  /* ---------------------------------------------------------------- image tabs */

  const type = (document.contentType || "").toLowerCase();

  // Only standalone raster images (SVG isn't supported by BetterViewer).
  if (!type.startsWith("image/") || type.includes("svg")) return;
  // "View original" from BetterViewer adds #bv-original: show the browser's viewer.
  if (location.hash === "#bv-original") return;

  const open = () => {
    // replace(): the Back button skips the raw image page (no redirect loop).
    location.replace(`${viewerUrl}?src=${encodeURIComponent(location.href)}`);
  };

  // On by default; can be switched off in BetterViewer → Settings → Viewer.
  Promise.resolve(api.storage.local.get("autoOpen"))
    .then((items) => {
      if (items?.autoOpen !== false) open();
    })
    .catch(open);
})();
