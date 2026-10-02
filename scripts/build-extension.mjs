// Packages the extension build (vite build --mode extension → build/app) for
// Chromium and Firefox: build/chrome, build/firefox and a .zip of each.
// Run: npm run build:ext
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const app = join(root, "build", "app");
if (!existsSync(join(app, "index.html"))) {
  console.error("Missing build/app. Run `vite build --mode extension` first (npm run build:ext).");
  process.exit(1);
}

/** Shared by both browsers. */
const base = {
  manifest_version: 3,
  name: "BetterViewer",
  short_name: "BetterViewer",
  version: pkg.version,
  // Translated in extension/_locales (English matches package.json).
  description: "__MSG_extDescription__",
  default_locale: "en",
  homepage_url: "https://github.com/Ademking/BetterViewer",
  icons: { 16: "icons/icon-16.png", 32: "icons/icon-32.png", 48: "icons/icon-48.png", 128: "icons/icon-128.png" },
  action: {
    default_title: "BetterViewer",
    default_icon: { 16: "icons/icon-16.png", 32: "icons/icon-32.png" },
    // Open an empty viewer or screenshot the page (extension/popup.html).
    default_popup: "popup.html",
  },
  // contextMenus: the right-click items ("Open this image in BetterViewer",
  // "Browse all page images as a gallery", "Screenshot this page").
  // activeTab: screenshots of the current tab (captureVisibleTab).
  permissions: ["storage", "contextMenus", "activeTab"],
  commands: {
    "open-gallery": {
      suggested_key: { default: "Alt+Shift+G" },
      description: "__MSG_menuGallery__",
    },
    "take-screenshot": {
      suggested_key: { default: "Alt+Shift+S" },
      description: "__MSG_menuScreenshot__",
    },
  },
  // Needed to detect images opened in tabs, and to download them (with the
  // site's cookies) for editing without cross-origin restrictions.
  host_permissions: ["<all_urls>"],
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["content.js"],
      run_at: "document_start",
      all_frames: false,
    },
  ],
  // Lets the content script send the tab to the viewer.
  web_accessible_resources: [{ resources: ["index.html"], matches: ["<all_urls>"] }],
  content_security_policy: {
    // OCR and background removal run WebAssembly.
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
  },
};

const targets = {
  chrome: {
    ...base,
    background: { service_worker: "background.js" },
    minimum_chrome_version: "116",
    // Chrome won't load extension pages in incognito tabs in the default
    // "spanning" mode (ERR_BLOCKED_BY_CLIENT), so images opened there could
    // never reach the viewer. "split" runs a separate copy for incognito.
    // Firefox has no split mode and shows extension pages in private windows.
    incognito: "split",
  },
  firefox: {
    ...base,
    background: { scripts: ["background.js"] },
    author: "Adem Kouki",
    browser_specific_settings: {
      gecko: {
        // package.json → manifest.browser_specific_settings (the published add-on id).
        id: pkg.manifest?.browser_specific_settings?.gecko?.id ?? "ademking@betterviewer",
        // 140 (current ESR) is the first with data_collection_permissions.
        strict_min_version: "140.0",
        data_collection_permissions: { required: ["none"] },
      },
      gecko_android: { strict_min_version: "142.0" },
    },
  },
};

/* ------------------------------------------------------------------ zip (stored + deflate, no dependencies) */

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...listFiles(p));
    else out.push(p);
  }
  return out;
}

function zipDir(dir, zipPath) {
  const files = listFiles(dir);
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(relative(dir, file).split(sep).join("/"));
    const data = readFileSync(file);
    const packed = deflateRawSync(data, { level: 9 });
    const useDeflate = packed.length < data.length;
    const body = useDeflate ? packed : data;
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(useDeflate ? 8 : 0, 8);
    local.writeUInt32LE(0, 10); // time / date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, name, body);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(useDeflate ? 8 : 0, 10);
    entry.writeUInt32LE(0, 12);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(body.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += local.length + name.length + body.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  writeFileSync(zipPath, Buffer.concat([...chunks, centralBuf, end]));
}

/* ------------------------------------------------------------------ assemble */

for (const [target, manifest] of Object.entries(targets)) {
  const out = join(root, "build", target);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(app, out, { recursive: true });
  cpSync(join(root, "extension", "icons"), join(out, "icons"), { recursive: true });
  cpSync(join(root, "extension", "_locales"), join(out, "_locales"), { recursive: true });
  cpSync(join(root, "extension", "content.js"), join(out, "content.js"));
  for (const file of ["background.js", "popup.html", "popup.js"]) {
    cpSync(join(root, "extension", file), join(out, file));
  }
  writeFileSync(join(out, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  const zip = join(root, "build", `betterviewer-${target}-${pkg.version}.zip`);
  zipDir(out, zip);
  const mb = (statSync(zip).size / 1024 / 1024).toFixed(1);
  console.log(`${target}: build/${target}/  →  build/${relative(join(root, "build"), zip)} (${mb} MB)`);
}
