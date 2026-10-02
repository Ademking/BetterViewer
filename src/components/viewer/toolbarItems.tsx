import {
  CropIcon,
  HandIcon,
  LayersIcon,
  MousePointer2Icon,
  PencilIcon,
  PipetteIcon,
  RotateCwSquareIcon,
  RulerDimensionLineIcon,
  ShapesIcon,
  SlidersHorizontalIcon,
  SmileIcon,
  SpotlightIcon,
  TypeIcon,
  Undo2Icon,
  ZoomInIcon,
} from "lucide-react";
import type React from "react";
import { PixelateIcon } from "@/components/tools/RedactTool";
import { tk } from "@/lib/i18n";
import { getSettings } from "@/state/settings";

/**
 * Toolbar buttons people can hide (Settings → Appearance → Toolbar buttons,
 * or right-click the toolbar). The More button always stays, so Settings is
 * always reachable.
 */
export type ToolbarItemId =
  | "select"
  | "pan"
  | "draw"
  | "shapes"
  | "text"
  | "emoji"
  | "redact"
  | "spotlight"
  | "crop"
  | "adjust"
  | "colorPicker"
  | "measure"
  | "layers"
  | "transform"
  | "zoom"
  | "history";

/** Labels are English (marked with tk); translated where shown. */
export const TOOLBAR_ITEMS: { id: ToolbarItemId; label: string; icon: React.ReactNode }[] = [
  { id: "select", label: tk("Select"), icon: <MousePointer2Icon /> },
  { id: "pan", label: tk("Pan"), icon: <HandIcon /> },
  { id: "draw", label: tk("Draw"), icon: <PencilIcon /> },
  { id: "shapes", label: tk("Shapes"), icon: <ShapesIcon /> },
  { id: "text", label: tk("Text"), icon: <TypeIcon /> },
  { id: "emoji", label: tk("Emoji"), icon: <SmileIcon /> },
  { id: "redact", label: tk("Blur / pixelate"), icon: <PixelateIcon /> },
  { id: "spotlight", label: tk("Spotlight"), icon: <SpotlightIcon /> },
  { id: "crop", label: tk("Crop"), icon: <CropIcon /> },
  { id: "adjust", label: tk("Adjustments"), icon: <SlidersHorizontalIcon /> },
  { id: "colorPicker", label: tk("Color picker"), icon: <PipetteIcon /> },
  { id: "measure", label: tk("Measure"), icon: <RulerDimensionLineIcon /> },
  { id: "layers", label: tk("Layers"), icon: <LayersIcon /> },
  { id: "transform", label: tk("Rotate, flip & resize"), icon: <RotateCwSquareIcon /> },
  { id: "zoom", label: tk("Zoom"), icon: <ZoomInIcon /> },
  { id: "history", label: tk("Undo / redo"), icon: <Undo2Icon /> },
];

/**
 * Buttons between dividers. `className` hides a whole group (and the divider
 * before it) on small screens.
 */
export const TOOLBAR_GROUPS: { items: ToolbarItemId[]; className?: string }[] = [
  { items: ["select", "pan"] },
  { items: ["draw", "shapes", "text", "emoji", "redact", "spotlight"] },
  { items: ["crop", "adjust", "colorPicker", "measure", "layers"] },
  { items: ["transform"], className: "max-md:hidden" },
  { items: ["zoom"] },
  { items: ["history"], className: "max-md:hidden" },
];

/** Show or hide one toolbar button. */
export function setToolbarItemShown(id: ToolbarItemId, shown: boolean) {
  const settings = getSettings();
  const hidden = settings.hiddenToolbarItems.filter((h) => h !== id);
  settings.set("hiddenToolbarItems", shown ? hidden : [...hidden, id]);
}

export const showAllToolbarItems = () => getSettings().set("hiddenToolbarItems", []);
