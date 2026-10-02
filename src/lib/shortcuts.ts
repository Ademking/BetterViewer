import { tk } from "@/lib/i18n";
import { ALT, MOD } from "@/lib/platform";
import { getSettings, useSettings } from "@/state/settings";

/**
 * Keyboard shortcuts people can change (Settings → Keyboard shortcuts).
 *
 * A shortcut is a string like "Mod+Shift+Z": modifiers in the order Mod, Alt,
 * Shift, then the key. Mod is Ctrl, or ⌘ on Apple keyboards. Letters are upper
 * case; other keys use their KeyboardEvent.key name ("Tab", "F2", "+", "?"),
 * and the space bar is "Space".
 *
 * What each command does lives in useKeyboardShortcuts, so this file stays
 * free of UI imports. Only the shortcuts that differ from the defaults are
 * saved (settings.shortcuts).
 */

export type ShortcutId =
  // Tools
  | "select"
  | "pan"
  | "pen"
  | "highlighter"
  | "eraser"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "counter"
  | "redact"
  | "spotlight"
  | "measure"
  | "rulers"
  | "text"
  | "colorPicker"
  | "crop"
  | "adjust"
  | "curves"
  | "layers"
  | "scanQr"
  // View
  | "zoomIn"
  | "zoomOut"
  | "zoomFit"
  | "zoomActual"
  | "zoomSelection"
  | "rotateRight"
  | "rotateLeft"
  | "flipHorizontal"
  | "flipVertical"
  | "resize"
  | "navigator"
  | "toggleInterface"
  // Edit
  | "undo"
  | "redo"
  | "duplicate"
  | "selectAll"
  | "bringToFront"
  | "sendToBack"
  | "bringForward"
  | "sendBackward"
  // File
  | "commandPalette"
  | "openImage"
  | "save"
  | "copyImage"
  | "settings"
  | "shortcuts";

export type ShortcutGroup = "Tools" | "View" | "Edit" | "File";

/** Saved changes: the keys of each changed command ([] = no shortcut). */
export type ShortcutOverrides = Partial<Record<ShortcutId, string[]>>;

export interface ShortcutDef {
  id: ShortcutId;
  /** English, marked with tk; translated where shown. */
  label: string;
  group: ShortcutGroup;
  keys: string[];
  /**
   * "always": also without an image and while a dialog is open.
   * "noOverlay": also without an image, but not while a dialog is open.
   * Otherwise the command needs an open image and no dialog.
   */
  when?: "always" | "noOverlay";
}

export const SHORTCUTS: ShortcutDef[] = [
  { id: "select", label: tk("Select"), group: "Tools", keys: ["V"] },
  { id: "pan", label: tk("Pan"), group: "Tools", keys: ["H"] },
  { id: "pen", label: tk("Draw with pen"), group: "Tools", keys: ["P", "B"] },
  { id: "highlighter", label: tk("Highlighter"), group: "Tools", keys: ["Shift+P"] },
  { id: "eraser", label: tk("Eraser"), group: "Tools", keys: ["E"] },
  { id: "rectangle", label: tk("Rectangle"), group: "Tools", keys: ["S"] },
  { id: "ellipse", label: tk("Ellipse"), group: "Tools", keys: ["O"] },
  { id: "line", label: tk("Line"), group: "Tools", keys: ["L"] },
  { id: "arrow", label: tk("Arrow"), group: "Tools", keys: ["A"] },
  { id: "counter", label: tk("Numbered counter"), group: "Tools", keys: ["N"] },
  { id: "redact", label: tk("Blur / pixelate zone"), group: "Tools", keys: ["M"] },
  { id: "spotlight", label: tk("Spotlight"), group: "Tools", keys: ["G"] },
  { id: "measure", label: tk("Measure"), group: "Tools", keys: ["U"] },
  { id: "rulers", label: tk("Rulers & guides"), group: "Tools", keys: ["Shift+U"] },
  { id: "text", label: tk("Text"), group: "Tools", keys: ["T"] },
  { id: "colorPicker", label: tk("Color picker"), group: "Tools", keys: ["I"] },
  { id: "crop", label: tk("Crop"), group: "Tools", keys: ["C"] },
  { id: "adjust", label: tk("Adjustments"), group: "Tools", keys: ["F"] },
  { id: "curves", label: tk("Histogram"), group: "Tools", keys: ["Shift+C"] },
  { id: "layers", label: tk("Layers"), group: "Tools", keys: ["Shift+L"] },
  { id: "scanQr", label: tk("Scan QR codes"), group: "Tools", keys: ["Q"] },

  { id: "zoomIn", label: tk("Zoom in"), group: "View", keys: ["Mod++", "Mod+=", "+", "="] },
  { id: "zoomOut", label: tk("Zoom out"), group: "View", keys: ["Mod+-", "-"] },
  { id: "zoomFit", label: tk("Fit to screen"), group: "View", keys: ["0", "Mod+0"] },
  { id: "zoomActual", label: tk("Actual size"), group: "View", keys: ["1", "Mod+1"] },
  { id: "zoomSelection", label: tk("Zoom to selection"), group: "View", keys: ["2"] },
  { id: "rotateRight", label: tk("Rotate right"), group: "View", keys: ["R"] },
  { id: "rotateLeft", label: tk("Rotate left"), group: "View", keys: ["Shift+R"] },
  { id: "flipHorizontal", label: tk("Flip horizontal"), group: "View", keys: ["Shift+H"] },
  { id: "flipVertical", label: tk("Flip vertical"), group: "View", keys: ["Shift+V"] },
  { id: "resize", label: tk("Resize image"), group: "View", keys: ["Mod+Alt+I"] },
  { id: "navigator", label: tk("Navigator"), group: "View", keys: ["Shift+N"] },
  { id: "toggleInterface", label: tk("Toggle interface"), group: "View", keys: ["Tab"] },

  { id: "undo", label: tk("Undo"), group: "Edit", keys: ["Mod+Z"] },
  { id: "redo", label: tk("Redo"), group: "Edit", keys: ["Mod+Shift+Z", "Mod+Y"] },
  { id: "duplicate", label: tk("Duplicate"), group: "Edit", keys: ["Mod+D"] },
  { id: "selectAll", label: tk("Select all"), group: "Edit", keys: ["Mod+A"] },
  { id: "bringToFront", label: tk("Bring to front"), group: "Edit", keys: ["]"] },
  { id: "sendToBack", label: tk("Send to back"), group: "Edit", keys: ["["] },
  { id: "bringForward", label: tk("Bring forward"), group: "Edit", keys: ["}"] },
  { id: "sendBackward", label: tk("Send backward"), group: "Edit", keys: ["{"] },

  { id: "commandPalette", label: tk("Quick launch"), group: "File", keys: ["Mod+K"], when: "always" },
  { id: "openImage", label: tk("Open image"), group: "File", keys: ["Mod+O"], when: "always" },
  { id: "save", label: tk("Save (format set in Settings)"), group: "File", keys: ["Mod+S"] },
  { id: "copyImage", label: tk("Copy image"), group: "File", keys: ["Mod+Shift+C"] },
  { id: "settings", label: tk("Settings"), group: "File", keys: ["Mod+,"], when: "always" },
  { id: "shortcuts", label: tk("This list"), group: "File", keys: ["?"], when: "noOverlay" },
];

export const SHORTCUT_BY_ID = Object.fromEntries(SHORTCUTS.map((s) => [s.id, s])) as Record<
  ShortcutId,
  ShortcutDef
>;

/** The keys of a command, with the saved changes applied. */
export const shortcutKeys = (id: ShortcutId, overrides: ShortcutOverrides = getSettings().shortcuts) =>
  overrides[id] ?? SHORTCUT_BY_ID[id].keys;

export const isCustomized = (id: ShortcutId, overrides: ShortcutOverrides) => id in overrides;

/* ------------------------------------------------------------------ reading key presses */

const MODIFIER_KEYS = new Set(["Control", "Meta", "Alt", "AltGraph", "Shift", "CapsLock", "Fn", "OS", "Hyper", "Super"]);

/**
 * The key part of a shortcut. Letters come from the layout, so AZERTY's A and
 * QWERTZ's Z are still A and Z; a layout that types other letters (Cyrillic,
 * Greek, Arabic…) uses the key's US-layout letter instead, and so does Option
 * on a Mac, which turns letters into symbols (Option I types ˆ).
 */
function keyName(e: KeyboardEvent): string | null {
  if (e.code === "Space" || e.key === " ") return "Space";
  const key = e.key;
  if (!key || key === "Dead" || key === "Unidentified" || MODIFIER_KEYS.has(key)) return null;
  if (key.length === 1) {
    const lower = key.toLowerCase();
    const otherLetter = /\p{L}/u.test(lower) && !/[a-z]/.test(lower);
    if (e.code.startsWith("Key") && (otherLetter || (e.altKey && !/[a-z]/.test(lower))))
      return e.code.slice(3).toUpperCase();
    return /[a-z]/.test(lower) ? lower.toUpperCase() : key;
  }
  return key;
}

const isLetter = (key: string) => /^[A-Z]$/.test(key);

/** The shortcut a key press makes ("Mod+Shift+Z"), or null for a lone modifier. */
export function comboFromEvent(e: KeyboardEvent): string | null {
  const key = keyName(e);
  if (!key) return null;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("Mod");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  parts.push(key);
  return parts.join("+");
}

/** Split "Mod+Shift++" into ["Mod", "Shift"] and "+". */
export function parseCombo(combo: string): { mods: string[]; key: string } {
  const mods: string[] = [];
  let rest = combo;
  for (let m = /^(Mod|Alt|Shift)\+(?=.)/.exec(rest); m; m = /^(Mod|Alt|Shift)\+(?=.)/.exec(rest)) {
    mods.push(m[1]);
    rest = rest.slice(m[0].length);
  }
  return { mods, key: rest };
}

/**
 * Shift is part of typing most symbols ("?", "+", "}", or the digits on
 * AZERTY), so for those keys a shortcut also matches with Shift held.
 */
const withoutShift = (combo: string) => {
  const { mods, key } = parseCombo(combo);
  if (!mods.includes("Shift") || key.length !== 1 || isLetter(key)) return null;
  return [...mods.filter((m) => m !== "Shift"), key].join("+");
};

/** The shortcut to save for a key press while recording (Shift dropped for symbols). */
export function comboForBinding(e: KeyboardEvent): string | null {
  const combo = comboFromEvent(e);
  return combo && (withoutShift(combo) ?? combo);
}

/** Keys that keep their fixed job (and Esc / Backspace drive the recorder). */
const RESERVED_KEYS = new Set([
  "Escape",
  "Enter",
  "Space",
  "Backspace",
  "Delete",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
]);

export const isReservedCombo = (combo: string) =>
  RESERVED_KEYS.has(parseCombo(combo).key) || combo === "Mod+V";

let cacheFor: ShortcutOverrides | null = null;
let cache = new Map<string, ShortcutId>();

/** Which command a key press runs, if any. */
export function findShortcut(combo: string, overrides: ShortcutOverrides = getSettings().shortcuts) {
  if (overrides !== cacheFor) {
    cache = new Map();
    for (const s of SHORTCUTS) for (const k of shortcutKeys(s.id, overrides)) if (!cache.has(k)) cache.set(k, s.id);
    cacheFor = overrides;
  }
  const loose = withoutShift(combo);
  return cache.get(combo) ?? (loose ? cache.get(loose) : undefined);
}

/* ------------------------------------------------------------------ changing shortcuts */

const sameKeys = (a: string[], b: string[]) => a.length === b.length && a.every((k, i) => k === b[i]);

/** Save new keys for a command, dropping the change when it matches the default. */
function withKeys(overrides: ShortcutOverrides, id: ShortcutId, keys: string[]): ShortcutOverrides {
  const next = { ...overrides };
  if (sameKeys(keys, SHORTCUT_BY_ID[id].keys)) delete next[id];
  else next[id] = keys;
  return next;
}

/**
 * Give `combo` to a command (replacing its keys). Other commands using the
 * same keys lose them; their ids are returned so the caller can say so.
 */
export function assignShortcut(id: ShortcutId, combo: string): ShortcutId[] {
  const settings = getSettings();
  let next = withKeys(settings.shortcuts, id, [combo]);
  const taken: ShortcutId[] = [];
  for (const s of SHORTCUTS) {
    if (s.id === id) continue;
    const keys = shortcutKeys(s.id, next);
    if (!keys.includes(combo)) continue;
    next = withKeys(next, s.id, keys.filter((k) => k !== combo));
    taken.push(s.id);
  }
  settings.set("shortcuts", next);
  return taken;
}

export function clearShortcut(id: ShortcutId) {
  const settings = getSettings();
  settings.set("shortcuts", withKeys(settings.shortcuts, id, []));
}

export function resetShortcut(id: ShortcutId) {
  const settings = getSettings();
  const next = { ...settings.shortcuts };
  delete next[id];
  settings.set("shortcuts", next);
}

export const resetAllShortcuts = () => getSettings().set("shortcuts", {});

/* ------------------------------------------------------------------ showing shortcuts */

const KEY_LABELS: Record<string, string> = {
  "-": "−",
  Delete: "Del",
  Escape: "Esc",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
};

/** The keys of one shortcut as shown on screen: ["Ctrl", "Shift", "Z"]. */
export function comboParts(combo: string): string[] {
  const { mods, key } = parseCombo(combo);
  return [...mods.map((m) => (m === "Mod" ? MOD : m === "Alt" ? ALT : m)), KEY_LABELS[key] ?? key];
}

/** A command's first shortcut as text ("Ctrl Shift Z"), or undefined when it has none. */
export function shortcutText(id: ShortcutId, overrides?: ShortcutOverrides): string | undefined {
  const first = shortcutKeys(id, overrides)[0];
  return first ? comboParts(first).join(" ") : undefined;
}

/** `shortcutText` for components: re-renders them when shortcuts change. */
export function useShortcutText() {
  const overrides = useSettings((s) => s.shortcuts);
  return (id: ShortcutId) => shortcutText(id, overrides);
}
