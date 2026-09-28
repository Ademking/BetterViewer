import { readdirSync, readFileSync } from "fs"
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

export default defineConfig(({ mode }) => {
  const extension = mode === "extension"
  return {
    plugins: [react(), tailwindcss(), ...(extension ? [vendorAssets()] : [])],
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
