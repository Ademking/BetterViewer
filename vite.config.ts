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
    ...readdirSync(nm("tesseract.js-core"))
      .filter((f) => f.endsWith("-lstm.wasm.js"))
      .map((f): [string, string] => [`vendor/tesseract-core/${f}`, nm("tesseract.js-core", f)]),
    ["vendor/ort/ort-wasm-simd-threaded.asyncify.mjs", nm("onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs")],
    ["vendor/ort/ort-wasm-simd-threaded.asyncify.wasm", nm("onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm")],
  ]
  return {
    name: "betterviewer-vendor-assets",
    apply: "build",
    generateBundle() {
      for (const [fileName, from] of files) this.emitFile({ type: "asset", fileName, source: readFileSync(from) })
    },
  }
}

const SITE_URL = "https://betterviewer.surge.sh/"
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

export default defineConfig(({ mode }) => {
  const extension = mode === "extension"
  return {
    plugins: [react(), tailwindcss(), socialMeta(extension), ...(extension ? [vendorAssets()] : [])],
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
