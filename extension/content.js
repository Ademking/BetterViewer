// BetterViewer content script. Runs at document_start in top-level frames.
// 1. When a tab shows an image by itself (the browser's built-in image
//    viewer), open it in BetterViewer instead.
// 2. "Open this image in BetterViewer" (right-click menu, see background.js):
//    show BetterViewer in an overlay on top of the page, without leaving it.
// 3. "Browse all page images as a gallery": the same overlay as a gallery of every
//    picture on the page.
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

  /**
   * Open the overlay with one image (`{ src }`) or a gallery (`{ gallery }`).
   * blob: and data: images can only be read here (they belong to the page),
   * so they're sent to the viewer once it asks for them.
   */
  const openOverlay = ({ src = "", gallery = null }) => {
    closeOverlay();
    const fromPage = !gallery && /^(blob|data):/i.test(src);
    const url = new URL(viewerUrl);
    url.searchParams.set("overlay", "1");
    if (gallery) url.searchParams.set("gallery", "1");
    else if (!fromPage) url.searchParams.set("src", src);

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
    overlay = { frame, fromPage, src, gallery, unlockScroll: lockScroll(), onKey };
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
    const { frame, src, gallery, fromPage } = overlay;
    const post = (message) => frame.contentWindow?.postMessage(message, viewerOrigin);
    const type = e.data?.type;
    if (type === "betterviewer:close") closeOverlay();
    else if (type === "betterviewer:ready" && gallery) post({ type: "betterviewer:gallery", ...gallery });
    else if (type === "betterviewer:ready" && fromPage) {
      fetch(src)
        .then((r) => r.blob())
        .then((blob) => post({ type: "betterviewer:image", blob, src }))
        .catch(() => closeOverlay());
    } else if (type === "betterviewer:clipboard") {
      // Sites like Facebook forbid the clipboard to frames inside them (the
      // overlay) but not to the page itself, which this script is part of.
      const { id, text, blob } = e.data;
      const done = (error) => post({ type: "betterviewer:clipboard-done", id, error });
      let write;
      if (typeof text === "string") write = navigator.clipboard.writeText(text);
      else if (blob && typeof blob.size === "number") {
        write = navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
      } else write = Promise.reject(new Error("Nothing to copy."));
      write.then(
        () => done(),
        (err) => done(String(err?.message || err))
      );
    } else if (type === "betterviewer:fetch" && gallery && typeof e.data.src === "string") {
      // A blob: picture of the gallery (only this page can read it).
      const { id, src: wanted } = e.data;
      if (!gallery.items.some((it) => it.src === wanted)) return;
      fetch(wanted)
        .then((r) => r.blob())
        .then((blob) => post({ type: "betterviewer:blob", id, blob }))
        .catch((err) => post({ type: "betterviewer:blob", id, error: String(err?.message || err) }));
    }
  });

  /* ---------------------------------------------------------------- page gallery */

  const MAX_IMAGES = 500;
  // Lazy-loading scripts keep the real address here until the image scrolls in.
  const LAZY_ATTRS = ["data-src", "data-lazy-src", "data-original", "data-lazy", "data-url", "data-hi-res-src"];

  const absolute = (u) => {
    try {
      return new URL(u, document.baseURI).href;
    } catch {
      return null;
    }
  };
  const isSvg = (u) => /^data:image\/svg/i.test(u) || /\.svg(?:$|[?#])/i.test(u);

  /** The biggest candidate of a srcset ("a.jpg 480w, b.jpg 1200w" → b.jpg). */
  const largestInSrcset = (srcset) => {
    let best = null;
    let bestSize = 0;
    for (const part of srcset.split(/,\s+/)) {
      const [url, descriptor = "1x"] = part.trim().split(/\s+/);
      const size = parseFloat(descriptor) || 1;
      if (url && size > bestSize) {
        best = url;
        bestSize = size;
      }
    }
    return best;
  };

  /** Every picture worth viewing on the page, in page order; starts at the first one in view. */
  const collectImages = () => {
    const items = [];
    const seen = new Set();
    let start = -1;
    const add = (raw, el, width, height, alt) => {
      const src = raw && absolute(raw);
      if (!src || seen.has(src) || isSvg(src) || !/^(https?|data|blob|file):/i.test(src)) return;
      seen.add(src);
      if (start < 0 && el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.bottom > 0 && r.top < innerHeight) start = items.length;
      }
      items.push({ src, alt: alt || undefined, width: width || undefined, height: height || undefined });
    };
    // Icons, spacers and tracking pixels aren't worth a gallery slot.
    const tooSmall = (w, h) => w < 32 || h < 32 || w * h < 64 * 64;

    for (const img of document.images) {
      if (items.length >= MAX_IMAGES) break;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const lazy = LAZY_ATTRS.map((a) => img.getAttribute(a)).find(Boolean);
      if (w > 2 && tooSmall(w, h)) continue;
      if (!w && img.complete && !lazy) continue; // broken
      let src = img.currentSrc || img.src;
      if (w <= 2 && lazy) src = lazy; // still a placeholder
      else if (img.srcset) src = largestInSrcset(img.srcset) ?? src;
      add(src, img, w > 2 ? w : 0, w > 2 ? h : 0, img.alt || img.title);
    }
    // Pictures set as inline backgrounds (common in galleries and cards).
    for (const el of document.querySelectorAll('[style*="background"]')) {
      if (items.length >= MAX_IMAGES) break;
      const m = /url\(\s*(['"]?)(.*?)\1\s*\)/i.exec(el.style.backgroundImage);
      if (!m) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height && tooSmall(r.width, r.height)) continue;
      add(m[2], el, 0, 0, el.getAttribute("aria-label") || el.title);
    }
    return { items, index: Math.max(0, start) };
  };

  api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "betterviewer:overlay" && typeof message.src === "string") openOverlay({ src: message.src });
    else if (message?.type === "betterviewer:gallery") openOverlay({ gallery: collectImages() });
    else return;
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
