// Checks the interface translations (src/locales/*.json) against the text the
// code asks for: t("…") / tr("…") calls and tk("…") markers in src/.
// Run: npm run i18n            → missing / unused keys per language
//      npm run i18n -- --keys  → every key, one JSON array (for translators)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const localesDir = join(src, "locales");

function sourceFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/** Keys used in the code, in first-seen order. */
const keys = new Set();
const call = /(?<![\w.])(?:t|tr|tk)\(\s*"((?:[^"\\]|\\.)*)"/g;
for (const file of sourceFiles(src)) {
  for (const m of readFileSync(file, "utf8").matchAll(call)) keys.add(JSON.parse(`"${m[1]}"`));
}

if (process.argv.includes("--keys")) {
  console.log(JSON.stringify([...keys], null, 2));
  process.exit(0);
}

const english = JSON.parse(readFileSync(join(localesDir, "en.json"), "utf8"));
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
let problems = 0;

for (const name of readdirSync(localesDir).filter((f) => f.endsWith(".json") && f !== "en.json").sort()) {
  const messages = JSON.parse(readFileSync(join(localesDir, name), "utf8"));
  const missing = [...keys].filter((k) => !(k in messages));
  const unused = Object.keys(messages).filter((k) => !keys.has(k));
  const broken = Object.entries(messages).filter(([k, v]) => {
    const forms = typeof v === "string" ? [v] : Object.values(v);
    // Plural forms may leave out {count} ("one" in some languages), nothing else.
    const want = placeholders(k).split(",").filter((p) => p && !(typeof v === "object" && p === "count"));
    return forms.some((f) => want.some((p) => !placeholders(f).split(",").includes(p))) ||
      (typeof english[k] === "object" && typeof v !== "object");
  });
  const status = missing.length || unused.length || broken.length ? "✗" : "✓";
  console.log(`${status} ${name}: ${Object.keys(messages).length - unused.length}/${keys.size}`);
  for (const k of missing) console.log(`    missing: ${k}`);
  for (const k of unused) console.log(`    unused:  ${k}`);
  for (const [k] of broken) console.log(`    placeholders / plural forms differ: ${k}`);
  problems += missing.length + unused.length + broken.length;
}
process.exit(problems ? 1 : 0);
