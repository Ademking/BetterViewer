import { create } from "zustand";
import type { DrawMode, ShapeKind } from "@/lib/annotations";
import { TRANSPARENT } from "@/lib/annotations";
import { getSettings } from "@/state/settings";
import type { StraightenParams } from "@/lib/warp-core";

export type Tool =
  | "select"
  | "pan"
  | "draw"
  | "shape"
  | "text"
  | "eyedropper"
  | "crop"
  | "redact"
  | "spotlight"
  | "measure"
  | "straighten";

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropState {
  rect: CropRect;
  /** width / height in *displayed* orientation; null = free. */
  aspect: number | null;
  aspectId: string;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  align: "left" | "center" | "right";
  fill: string;
  background: string;
  /** Outline colour (undefined = none); width as a fraction of fontSize. */
  outline?: string;
  outlineWidth?: number;
  /** Drop-shadow colour with alpha (undefined = none); blur / offset as fractions of fontSize. */
  shadow?: string;
  shadowBlur?: number;
  shadowOffset?: number;
}

export interface ShapeStyle {
  stroke: string;
  strokeWidth: number;
  fill: string;
  opacity: number;
  polygonSides: number;
  /** Counter circle radius (image px). */
  counterRadius: number;
  /** Blur tool: mode and strength (image px) for new zones. */
  redactMode: "pixelate" | "blur";
  redactStrength: number;
  /** Spotlight tool: shape, dimming (0..1) and soft edge for new spotlights. */
  spotlightShape: "rect" | "ellipse";
  spotlightDim: number;
  spotlightFeather: number;
}

export type PanelId = "adjust" | "settings" | "shortcuts" | "info" | "color" | "command" | "qr" | "upload" | "compress" | "ocr" | "resize" | "layers" | "curves" | "about" | "history";

interface UiStore {
  tool: Tool;
  shapeKind: ShapeKind;
  drawMode: DrawMode;
  style: ShapeStyle;
  textStyle: TextStyle;
  selectedIds: string[];
  editingTextId: string | null;
  spaceHeld: boolean;
  isPanning: boolean;
  compareOriginal: boolean;
  crop: CropState | null;
  /** Straighten / perspective mode settings (null when not straightening). */
  straighten: StraightenParams | null;
  /** Level line being drawn while straightening (board / screen coordinates). */
  levelLine: { x1: number; y1: number; x2: number; y2: number } | null;
  panels: Record<PanelId, boolean>;
  recentColors: string[];
  pickedColor: string | null;
  chromeVisible: boolean;
  /** Image px per "comfortable" screen px at fit zoom; scales default sizes. */
  docUnit: number;
  /** Explicit next counter number (after a reset / manual start); null = continue from the highest. */
  counterNext: number | null;
  loading: boolean;
  /** Emoji picker (toolbar popover), also opened from the command palette. */
  emojiPickerOpen: boolean;

  setTool: (tool: Tool) => void;
  setShapeKind: (kind: ShapeKind) => void;
  setDrawMode: (mode: DrawMode) => void;
  setStyle: (patch: Partial<ShapeStyle>) => void;
  setTextStyle: (patch: Partial<TextStyle>) => void;
  select: (ids: string[]) => void;
  setEditingText: (id: string | null) => void;
  setCrop: (crop: CropState | null) => void;
  togglePanel: (id: PanelId, open?: boolean) => void;
  pushRecentColor: (color: string) => void;
  set: (patch: Partial<UiStore>) => void;
}

const settings = getSettings();

export const useUi = create<UiStore>()((set, get) => ({
  tool: "select",
  shapeKind: "rect",
  drawMode: "pen",
  style: {
    stroke: settings.defaultColor,
    strokeWidth: settings.defaultStrokeWidth,
    fill: TRANSPARENT,
    opacity: 1,
    polygonSides: 6,
    counterRadius: 16,
    redactMode: "pixelate",
    redactStrength: 20,
    spotlightShape: "ellipse",
    spotlightDim: 0.6,
    spotlightFeather: 0.1,
  },
  textStyle: {
    fontFamily: "inter",
    fontSize: 32,
    fontWeight: "bold",
    fontStyle: "normal",
    align: "left",
    fill: "#ffffff",
    background: TRANSPARENT,
  },
  selectedIds: [],
  editingTextId: null,
  spaceHeld: false,
  isPanning: false,
  compareOriginal: false,
  crop: null,
  straighten: null,
  levelLine: null,
  panels: { adjust: false, settings: false, shortcuts: false, info: false, color: false, command: false, qr: false, upload: false, compress: false, ocr: false, resize: false, layers: false, curves: false, about: false, history: false },
  recentColors: [],
  pickedColor: null,
  chromeVisible: true,
  docUnit: 1,
  emojiPickerOpen: false,
  counterNext: null,
  loading: false,

  setTool: (tool) => {
    const { tool: current } = get();
    if (tool === current) return;
    set({
      tool,
      editingTextId: null,
      // Leaving crop discards an un-applied crop rectangle.
      crop: tool === "crop" ? get().crop : null,
      selectedIds: tool === "select" ? get().selectedIds : [],
    });
  },
  setShapeKind: (shapeKind) => set({ shapeKind, tool: "shape", selectedIds: [] }),
  setDrawMode: (drawMode) => set({ drawMode, tool: "draw", selectedIds: [] }),
  setStyle: (patch) => set((s) => ({ style: { ...s.style, ...patch } })),
  setTextStyle: (patch) =>
    set((s) => ({ textStyle: { ...s.textStyle, ...patch } })),
  select: (selectedIds) => set({ selectedIds }),
  setEditingText: (editingTextId) => set({ editingTextId }),
  setCrop: (crop) => set({ crop }),
  togglePanel: (id, open) =>
    set((s) => ({
      panels: { ...s.panels, [id]: open ?? !s.panels[id] },
    })),
  pushRecentColor: (color) =>
    set((s) => ({
      recentColors: [
        color,
        ...s.recentColors.filter((c) => c.toLowerCase() !== color.toLowerCase()),
      ].slice(0, 8),
    })),
  set: (patch) => set(patch),
}));

export const getUi = () => useUi.getState();
