import { readdirSync, readFileSync, rmSync } from "fs"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import pkg from "./package.json"

/**
 * Extension build only: extension pages may not load code from a CDN, so
 * the OCR engine (Tesseract) and ONNX Runtime (background removal) are
 * shipped under /vendor. See src/lib/platform.ts.
 */
function vendorAssets(): Plugin {
  const nm = (...p: string[]) => path.resolve(__dirname, "node_modules", ...p)
  const files: [string, string][] = [
    ["vendor/tesseract/worker.min.js", nm("tesseract.js/dist/worker.min.js")],
    // SIMD and relaxed-SIMD engines only: every browser the extension
    // supports has SIMD, so the plain fallback would never load.
    ...readdirSync(nm("tesseract.js-core"))
      .filter((f) => f.endsWith("simd-lstm.wasm.js"))
      .map((f): [string, string] => [`vendor/tesseract-core/${f}`, nm("tesseract.js-core", f)]),
    // CPU-only runtime (14 MB instead of 27 MB for the WebGPU one), so
    // background removal in the extension always runs on the CPU.
    ["vendor/ort/ort-wasm-simd-threaded.mjs", nm("onnxruntime-web/dist/ort-wasm-simd-threaded.mjs")],
    ["vendor/ort/ort-wasm-simd-threaded.wasm", nm("onnxruntime-web/dist/ort-wasm-simd-threaded.wasm")],
  ]
  return {
    name: "betterviewer-vendor-assets",
    apply: "build",
    generateBundle() {
      for (const [fileName, from] of files) this.emitFile({ type: "asset", fileName, source: readFileSync(from) })
    },
  }
}

const SITE_URL = "https://betterviewer.web.app/"
const SITE_TITLE = "BetterViewer: Fast, Simple, Easy image viewer"
const SITE_DESCRIPTION =
  "View, zoom, annotate and edit images right in your browser. Adjustments, crop, background removal and text extraction, all private and on your device."

/**
 * Web build: adds the search and social sharing tags (Open Graph, Twitter).
 * Extension build: leaves them out and drops the share image, which the
 * extension never needs.
 */
function socialMeta(extension: boolean): Plugin {
  let outDir = ""
  return {
    name: "betterviewer-social-meta",
    configResolved(config) {
      outDir = config.build.outDir
    },
    transformIndexHtml() {
      if (extension) return []
      const image = `${SITE_URL}og.png`
      const meta = (attr: "name" | "property", key: string, content: string) => ({
        tag: "meta",
        attrs: { [attr]: key, content },
        injectTo: "head" as const,
      })
      return [
        { tag: "link", attrs: { rel: "canonical", href: SITE_URL }, injectTo: "head" },
        meta("property", "og:type", "website"),
        meta("property", "og:site_name", "BetterViewer"),
        meta("property", "og:url", SITE_URL),
        meta("property", "og:title", SITE_TITLE),
        meta("property", "og:description", SITE_DESCRIPTION),
        meta("property", "og:image", image),
        meta("property", "og:image:type", "image/png"),
        meta("property", "og:image:width", "1200"),
        meta("property", "og:image:height", "630"),
        meta("property", "og:image:alt", "BetterViewer, a fast, simple, easy image viewer"),
        meta("name", "twitter:card", "summary_large_image"),
        meta("name", "twitter:title", SITE_TITLE),
        meta("name", "twitter:description", SITE_DESCRIPTION),
        meta("name", "twitter:image", image),
      ]
    },
    closeBundle() {
      if (extension) rmSync(path.resolve(outDir, "og.png"), { force: true })
    },
  }
}

/**
 * ONNX Runtime's code references its .wasm, so Vite copies it (about 27 MB)
 * into assets/. Nothing loads that copy: the web version fetches the runtime
 * from jsDelivr the first time background removal runs, and the extension
 * uses its own copy under /vendor. Drop it so it isn't shipped for nothing.
 */
function dropUnusedWasm(): Plugin {
  let outDir = ""
  return {
    name: "betterviewer-drop-unused-wasm",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const assets = path.resolve(outDir, "assets")
      for (const f of readdirSync(assets)) {
        if (/^ort-wasm.*\.wasm$/.test(f)) rmSync(path.join(assets, f))
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const extension = mode === "extension"
  return {
    plugins: [
      react(),
      tailwindcss(),
      socialMeta(extension),
      dropUnusedWasm(),
      ...(extension ? [vendorAssets()] : []),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: extension ? { outDir: "build/app", emptyOutDir: true } : undefined,
  }
})
