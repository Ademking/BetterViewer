import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ShortcutOverrides } from "@/lib/shortcuts";

export type BoardBackground = "blur" | "black" | "white" | "grid";
export type ThemeMode = "dark" | "light" | "system";
export type DefaultZoom = "fit" | "shrink" | "actual";
export type WheelBehavior = "zoom" | "scroll";
export type UploadProviderId = "imgbb" | "kappa";
/** Dropping / pasting a picture while one is open: ask, add as a layer, or open it. */
export type IncomingImageAction = "ask" | "layer" | "open";
/** File type written by Save ({MOD} S). */
export type SaveFormat = "png" | "jpeg" | "webp";

export interface Settings {
  // Appearance
  /** Interface language: a code from LANGUAGES (src/lib/i18n.ts), or "auto" for the browser's. */
  language: string;
  boardBackground: BoardBackground;
  theme: ThemeMode;
  showToolbar: boolean;
  /** Rulers along the board edges (and the guides dragged from them). */
  showRulers: boolean;
  showHints: boolean;
  autoHideUi: boolean;
  showScrollbars: boolean;
  /** Overview of the whole image while it doesn't fit in the window. */
  showNavigator: boolean;
  // Viewer
  defaultZoom: DefaultZoom;
  wheelBehavior: WheelBehavior;
  panOnEmptyDrag: boolean;
  smoothAnimations: boolean;
  pixelatedZoom: boolean;
  autoDetectQr: boolean;
  // Editing
  defaultColor: string;
  defaultStrokeWidth: number;
  snapToGrid: boolean;
  gridSize: number;
  showSelectionHandles: boolean;
  returnToSelect: boolean;
  incomingImage: IncomingImageAction;
  saveFormat: SaveFormat;
  /** Keyboard shortcuts changed from the defaults (src/lib/shortcuts.ts). */
  shortcuts: ShortcutOverrides;
  /** Emoji picker: last used (newest first) and skin tone (0 = default). */
  recentEmojis: string[];
  emojiSkinTone: number;
  // Sharing
  uploadProvider: UploadProviderId;
  ocrLang: string;
  imgbbApiKey: string;
}

export const DEFAULT_SETTINGS: Settings = {
  language: "auto",
  boardBackground: "blur",
  theme: "dark",
  showToolbar: true,
  showRulers: false,
  showHints: true,
  autoHideUi: false,
  showScrollbars: true,
  showNavigator: true,
  defaultZoom: "shrink",
  wheelBehavior: "zoom",
  panOnEmptyDrag: true,
  smoothAnimations: true,
  pixelatedZoom: true,
  autoDetectQr: true,
  defaultColor: "#ff453a",
  defaultStrokeWidth: 4,
  snapToGrid: false,
  gridSize: 10,
  showSelectionHandles: true,
  returnToSelect: true,
  incomingImage: "ask",
  saveFormat: "png",
  shortcuts: {},
  recentEmojis: [],
  emojiSkinTone: 0,
  uploadProvider: "kappa",
  ocrLang: "eng",
  imgbbApiKey: "",
};

interface SettingsStore extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (key, value) => set({ [key]: value } as Partial<Settings>),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "betterviewer:settings",
      version: 3,
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Partial<Settings>;
        // v2: kappa.lol became the default uploader (v1 saved "imgbb" for
        // everyone, whether or not they picked it).
        if (version < 2) s.uploadProvider = "kappa";
        // v3: dark is the default theme; start everyone on it once.
        if (version < 3) s.theme = "dark";
        return s as SettingsStore;
      },
    }
  )
);

export const getSettings = () => useSettings.getState();
