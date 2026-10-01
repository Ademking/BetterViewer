import type Konva from "konva";
import { stageRegistry } from "@/lib/stageRegistry";
import { tk } from "@/lib/i18n";

export type FontCategory = "Sans" | "Serif" | "Display" | "Mono" | "Handwriting";

export interface FontOption {
  id: string;
  label: string;
  /** Primary family name, used to trigger loading. */
  family: string;
  /** CSS font-family stack. */
  stack: string;
  category: FontCategory;
  /** Google Fonts `family=` spec; absent for local/system fonts. */
  google?: string;
}

// Axis specs: regular + bold (+ italics where the family has them).
const FULL = ":ital,wght@0,400;0,700;1,400;1,700";
const BOLD = ":wght@400;700";
const ONE = "";

const g = (
  id: string,
  family: string,
  category: FontCategory,
  axes: string,
  fallback: string
): FontOption => ({
  id,
  label: family,
  family,
  stack: `'${family}', ${fallback}`,
  category,
  google: `${family.replace(/ /g, "+")}${axes}`,
});

const SANS = "ui-sans-serif, system-ui, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, 'Courier New', monospace";

/** Web fonts load on demand (see ensureStylesheet); nothing downloads until used or previewed. */
export const FONTS: FontOption[] = [
  // Sans
  { id: "inter", label: "Inter", family: "Inter", stack: `Inter, ${SANS}`, category: "Sans" },
  g("roboto", "Roboto", "Sans", FULL, SANS),
  g("open-sans", "Open Sans", "Sans", FULL, SANS),
  g("poppins", "Poppins", "Sans", FULL, SANS),
  g("montserrat", "Montserrat", "Sans", FULL, SANS),
  g("nunito", "Nunito", "Sans", FULL, SANS),
  g("dm-sans", "DM Sans", "Sans", FULL, SANS),
  g("work-sans", "Work Sans", "Sans", FULL, SANS),
  g("raleway", "Raleway", "Sans", FULL, SANS),
  g("rubik", "Rubik", "Sans", FULL, SANS),
  g("space-grotesk", "Space Grotesk", "Sans", BOLD, SANS),
  { id: "system", label: "System UI", family: "system-ui", stack: "system-ui, -apple-system, 'Segoe UI', sans-serif", category: "Sans" },
  { id: "arial", label: "Arial", family: "Arial", stack: "Arial, Helvetica, sans-serif", category: "Sans" },
  // Serif
  g("playfair", "Playfair Display", "Serif", FULL, SERIF),
  g("lora", "Lora", "Serif", FULL, SERIF),
  g("merriweather", "Merriweather", "Serif", FULL, SERIF),
  g("libre-baskerville", "Libre Baskerville", "Serif", ":ital,wght@0,400;0,700;1,400", SERIF),
  g("eb-garamond", "EB Garamond", "Serif", FULL, SERIF),
  g("crimson", "Crimson Pro", "Serif", FULL, SERIF),
  g("dm-serif", "DM Serif Display", "Serif", ":ital@0;1", SERIF),
  { id: "georgia", label: "Georgia", family: "Georgia", stack: "Georgia, 'Times New Roman', serif", category: "Serif" },
  { id: "times", label: "Times New Roman", family: "Times New Roman", stack: "'Times New Roman', Times, serif", category: "Serif" },
  // Display
  g("bebas", "Bebas Neue", "Display", ONE, "Impact, sans-serif"),
  g("anton", "Anton", "Display", ONE, "Impact, sans-serif"),
  g("oswald", "Oswald", "Display", BOLD, "Impact, sans-serif"),
  g("archivo-black", "Archivo Black", "Display", ONE, "Impact, sans-serif"),
  g("abril", "Abril Fatface", "Display", ONE, SERIF),
  g("righteous", "Righteous", "Display", ONE, SANS),
  g("bungee", "Bungee", "Display", ONE, SANS),
  g("lobster", "Lobster", "Display", ONE, "cursive"),
  { id: "impact", label: "Impact", family: "Impact", stack: "Impact, 'Arial Black', sans-serif", category: "Display" },
  // Mono
  g("mono", "JetBrains Mono", "Mono", FULL, MONO),
  g("fira-code", "Fira Code", "Mono", BOLD, MONO),
  g("space-mono", "Space Mono", "Mono", FULL, MONO),
  g("ibm-plex-mono", "IBM Plex Mono", "Mono", FULL, MONO),
  { id: "courier", label: "Courier New", family: "Courier New", stack: "'Courier New', Courier, monospace", category: "Mono" },
  // Handwriting
  g("caveat", "Caveat", "Handwriting", BOLD, "cursive"),
  g("marker", "Permanent Marker", "Handwriting", ONE, "cursive"),
  g("pacifico", "Pacifico", "Handwriting", ONE, "cursive"),
  g("dancing", "Dancing Script", "Handwriting", BOLD, "cursive"),
  g("shadows", "Shadows Into Light", "Handwriting", ONE, "cursive"),
  g("indie", "Indie Flower", "Handwriting", ONE, "cursive"),
  g("kalam", "Kalam", "Handwriting", BOLD, "cursive"),
  g("satisfy", "Satisfy", "Handwriting", ONE, "cursive"),
];

export const DEFAULT_FONT = "inter";

export const FONT_CATEGORIES: FontCategory[] = [tk("Sans"), tk("Serif"), tk("Display"), tk("Mono"), tk("Handwriting")];

export const getFont = (id: string | undefined) =>
  FONTS.find((f) => f.id === id) ?? FONTS[0];

export const fontStack = (id: string | undefined) => getFont(id).stack;

/* ------------------------------------------------------------------ loading */

const stylesheets = new Map<string, Promise<void>>();

/** Inject a font's Google Fonts stylesheet once; resolves when it has loaded. */
export function ensureStylesheet(font: FontOption) {
  if (!font.google || typeof document === "undefined") return Promise.resolve();
  let p = stylesheets.get(font.id);
  if (!p) {
    p = new Promise<void>((resolve) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
      link.onload = () => resolve();
      link.onerror = () => resolve(); // fall back to the stack
      document.head.appendChild(link);
    });
    stylesheets.set(font.id, p);
  }
  return p;
}

/**
 * Konva measures text when attributes change; if the web font wasn't loaded
 * yet it measured a fallback. Re-trigger layout on every text node.
 */
export function refreshTextNodes() {
  const layer = stageRegistry.annotationLayer;
  if (!layer) return;
  layer.find("Text").forEach((t) => (t as Konva.Text).fire("fontFamilyChange"));
  layer.batchDraw();
}

/** Load a font's stylesheet and faces, then re-layout text. */
export async function ensureFont(id: string | undefined) {
  const font = getFont(id);
  if (typeof document === "undefined" || !document.fonts) return;
  await ensureStylesheet(font);
  try {
    await Promise.all([
      document.fonts.load(`400 32px "${font.family}"`),
      document.fonts.load(`700 32px "${font.family}"`),
      document.fonts.load(`italic 400 32px "${font.family}"`),
    ]);
  } catch {
    // Fallback fonts are fine; nothing to do.
  }
  refreshTextNodes();
}

if (typeof document !== "undefined" && document.fonts) {
  document.fonts.addEventListener("loadingdone", refreshTextNodes);
}
