import { useListCollection } from "@ark-ui/react";
import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  ClipboardPasteIcon,
  ChartSplineIcon,
  FileDownIcon,
  ImagePlusIcon,
  SquareArrowOutUpRightIcon,
  ScalingIcon,
  ImageUpscaleIcon,
  CloudUploadIcon,
  CopyIcon,
  CopyPlusIcon,
  CropIcon,
  DownloadIcon,
  EraserIcon,
  HandIcon,
  HighlighterIcon,
  ImageIcon,
  ImageUpIcon,
  InfoIcon,
  KeyboardIcon,
  LayersIcon,
  MaximizeIcon,
  MinusIcon,
  MirrorRectangularIcon,
  MonitorIcon,
  MoonIcon,
  MousePointer2Icon,
  PaletteIcon,
  PanelBottomIcon,
  PencilIcon,
  PipetteIcon,
  PlusIcon,
  ScanTextIcon,
  QrCodeIcon,
  Redo2Icon,
  RotateCcwIcon,
  RotateCwIcon,
  ScanIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  SparklesIcon,
  SquareDashedMousePointerIcon,
  SunIcon,
  TrashIcon,
  TypeIcon,
  Undo2Icon,
  WandSparklesIcon,
  XIcon,
  SmileIcon,
  Axis3dIcon,
  RulerDimensionLineIcon,
  RulerIcon,
  SpotlightIcon,
  BadgeInfoIcon,
} from "lucide-react";
import { autoEnhance } from "@/lib/autoEnhance";
import { startStraighten } from "@/lib/straighten";
import { toggleRulers } from "@/components/tools/MeasureTool";
import type React from "react";
import { useMemo } from "react";
import {
  Command,
  CommandContent,
  CommandDialog,
  CommandDialogContent,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { confirmAction } from "@/components/panels/ConfirmDialog";
import { openColorPicker } from "@/components/tools/ColorPicker";
import { startCrop } from "@/components/tools/CropTool";
import { PixelateIcon } from "@/components/tools/RedactTool";
import { SHAPE_ICONS } from "@/components/tools/ShapeTool";
import { ALT, MOD } from "@/components/tools/ToolButton";
import {
  closeImage,
  copyImageToClipboard,
  deleteSelected,
  duplicateSelected,
  exportImage,
  flipHorizontal,
  flipVertical,
  insertImagePicker,
  openFilePicker,
  openSample,
  pasteFromClipboard,
  redo,
  reorderSelected,
  rotate,
  selectAll,
  undo,
  zoomActual,
  zoomFit,
  zoomIn,
  zoomOut,
  zoomToSelection,
} from "@/lib/actions";
import { SHAPE_GROUPS, SHAPE_LABELS } from "@/lib/annotations";
import { DEFAULT_FILTERS, FILTER_PRESETS } from "@/lib/filters";
import { openInPhotopea, openInTinEye } from "@/lib/external";
import { removeBackground } from "@/lib/bgRemoval";
import { openOcr } from "@/components/tools/OcrPanel";
import { updateDoc, useDoc } from "@/state/document";
import { getSettings, type BoardBackground, type ThemeMode } from "@/state/settings";
import { scanCurrentImage } from "@/state/qr";
import { getUi, useUi } from "@/state/ui";

interface PaletteCommand {
  value: string;
  label: string;
  group: string;
  icon: React.ReactNode;
  shortcut?: string;
  keywords?: string;
  run: () => void;
}

const BOARD_LABELS: Record<BoardBackground, string> = {
  blur: "Blurred image",
  black: "Black",
  white: "White",
  grid: "Transparent grid",
};

/** Every command that makes sense right now (edit commands need an image). */
function buildCommands(): PaletteCommand[] {
  const hasDoc = !!useDoc.getState().doc;
  const { past, future } = useDoc.getState();
  const ui = getUi();
  const settings = getSettings();
  const hasSelection = ui.selectedIds.length > 0;
  const cmds: PaletteCommand[] = [];
  const add = (group: string, c: Omit<PaletteCommand, "group">, when = true) => {
    if (when) cmds.push({ ...c, group });
  };

  // File
  add("File", { value: "open", label: "Open image…", icon: <ImageUpIcon />, shortcut: `${MOD} O`, keywords: "file load browse", run: openFilePicker });
  add("File", { value: "insert-image", label: "Insert image on top…", icon: <ImagePlusIcon />, keywords: "add picture layer overlay logo watermark sticker", run: insertImagePicker }, !!useDoc.getState().doc);
  add("File", { value: "paste", label: "Paste image from clipboard", icon: <ClipboardPasteIcon />, shortcut: `${MOD} V`, run: () => void pasteFromClipboard() });
  add("File", { value: "sample", label: "Open sample image", icon: <SparklesIcon />, keywords: "demo example", run: () => void openSample() });
  // Save follows the Save format setting, like {MOD} S.
  const SAVE_LABEL = { png: "PNG", jpeg: "JPEG", webp: "WebP" } as const;
  add("File", { value: "save", label: `Save as ${SAVE_LABEL[settings.saveFormat]}`, icon: <DownloadIcon />, shortcut: `${MOD} S`, keywords: "export download", run: () => void exportImage() }, hasDoc);
  for (const f of ["png", "jpeg", "webp"] as const) {
    if (f === settings.saveFormat) continue;
    add("File", { value: `save-${f}`, label: `Save as ${SAVE_LABEL[f]}`, icon: <DownloadIcon />, keywords: `export download${f === "jpeg" ? " jpg" : ""}`, run: () => void exportImage(f) }, hasDoc);
  }
  add("File", { value: "upload-imgbb", label: "Upload & get link…", icon: <CloudUploadIcon />, keywords: "share link publish host imgbb kappa", run: () => ui.togglePanel("upload", true) }, hasDoc);
  add("File", { value: "photopea", label: "Open in Photopea", icon: <SquareArrowOutUpRightIcon />, keywords: "edit photoshop external editor", run: () => void openInPhotopea() }, hasDoc);
  add("File", { value: "tineye", label: "Search on TinEye", icon: <ImageUpscaleIcon />, keywords: "reverse image search source find similar", run: () => void openInTinEye() }, hasDoc);
  add("File", { value: "compress", label: "Compress & save…", icon: <FileDownIcon />, keywords: "reduce file size quality optimize jpeg webp smaller", run: () => ui.togglePanel("compress", true) }, hasDoc);
  add("File", { value: "copy-image", label: "Copy image to clipboard", icon: <CopyIcon />, shortcut: `${MOD} Shift C`, run: () => void copyImageToClipboard() }, hasDoc);
  add("File", {
    value: "close",
    label: "Close image",
    icon: <XIcon />,
    run: () =>
      past.length
        ? confirmAction({
            title: "Close this image?",
            description: "Your edits haven't been exported and will be lost.",
            confirmLabel: "Close image",
            destructive: true,
            onConfirm: closeImage,
          })
        : closeImage(),
  }, hasDoc);

  if (hasDoc) {
    // Tools
    // After the palette has closed, so its focus restore doesn't dismiss the popover.
    add("Tools", { value: "tool-emoji", label: "Insert emoji…", icon: <SmileIcon />, keywords: "emoji sticker smiley face icon reaction", run: () => setTimeout(() => ui.set({ emojiPickerOpen: true }), 150) });
    add("Tools", { value: "tool-select", label: "Select", icon: <MousePointer2Icon />, shortcut: "V", keywords: "move pointer", run: () => ui.setTool("select") });
    add("Tools", { value: "tool-pan", label: "Pan", icon: <HandIcon />, shortcut: "H", keywords: "hand move", run: () => ui.setTool("pan") });
    add("Tools", { value: "tool-pen", label: "Draw with pen", icon: <PencilIcon />, shortcut: "P", keywords: "freehand brush", run: () => ui.setDrawMode("pen") });
    add("Tools", { value: "tool-highlighter", label: "Highlighter", icon: <HighlighterIcon />, shortcut: "Shift P", keywords: "marker draw", run: () => ui.setDrawMode("highlighter") });
    add("Tools", { value: "tool-eraser", label: "Eraser", icon: <EraserIcon />, shortcut: "E", keywords: "erase remove strokes", run: () => ui.setDrawMode("eraser") });
    add("Tools", { value: "tool-text", label: "Add text", icon: <TypeIcon />, shortcut: "T", keywords: "type label caption", run: () => ui.setTool("text") });
    add("Tools", { value: "straighten", label: "Straighten…", icon: <Axis3dIcon />, keywords: "straighten level horizon tilt rotate angle perspective keystone skew fix", run: startStraighten });
    add("Tools", { value: "tool-measure", label: "Measure distance / angle", icon: <RulerDimensionLineIcon />, shortcut: "U", keywords: "measure ruler distance length angle protractor pixels", run: () => ui.setTool("measure") });
    add("Tools", { value: "rulers", label: "Show / hide rulers & guides", icon: <RulerIcon />, shortcut: "Shift U", keywords: "rulers guides grid align", run: toggleRulers });
    add("Tools", { value: "tool-spotlight", label: "Spotlight an area", icon: <SpotlightIcon />, shortcut: "G", keywords: "focus highlight dim darken emphasize attention", run: () => ui.setTool("spotlight") });
    add("Tools", { value: "tool-redact", label: "Blur / pixelate an area", icon: <PixelateIcon />, shortcut: "M", keywords: "blur pixelate hide censor redact mosaic privacy face plate", run: () => ui.setTool("redact") });
    add("Tools", { value: "tool-crop", label: "Crop", icon: <CropIcon />, shortcut: "C", keywords: "trim cut aspect", run: startCrop });
    add("Tools", { value: "tool-eyedropper", label: "Pick color from image", icon: <PipetteIcon />, shortcut: "I", keywords: "eyedropper sample", run: openColorPicker });

    // Shapes
    for (const group of SHAPE_GROUPS) {
      for (const kind of group.kinds) {
        add("Shapes", {
          value: `shape-${kind}`,
          label: SHAPE_LABELS[kind],
          icon: SHAPE_ICONS[kind],
          keywords: `shape draw ${group.label}`,
          run: () => ui.setShapeKind(kind),
        });
      }
    }

    // View
    add("View", { value: "zoom-in", label: "Zoom in", icon: <PlusIcon />, shortcut: `${MOD} +`, run: zoomIn });
    add("View", { value: "zoom-out", label: "Zoom out", icon: <MinusIcon />, shortcut: `${MOD} −`, run: zoomOut });
    add("View", { value: "zoom-fit", label: "Fit to screen", icon: <MaximizeIcon />, shortcut: "0", keywords: "zoom", run: zoomFit });
    add("View", { value: "zoom-actual", label: "Actual size (100%)", icon: <ScanIcon />, shortcut: "1", keywords: "zoom 1:1", run: zoomActual });
    add("View", { value: "zoom-selection", label: "Zoom to selection", icon: <SquareDashedMousePointerIcon />, shortcut: "2", run: zoomToSelection }, hasSelection);
    add("View", {
      value: "toggle-toolbar",
      label: settings.showToolbar ? "Hide toolbar" : "Show toolbar",
      icon: <PanelBottomIcon />,
      shortcut: "Tab",
      keywords: "interface chrome",
      run: () => settings.set("showToolbar", !getSettings().showToolbar),
    });

    // Transform
    add("Transform", { value: "resize", label: "Resize image…", icon: <ScalingIcon />, shortcut: `${MOD} ${ALT} I`, keywords: "scale dimensions width height smaller bigger pixels", run: () => ui.togglePanel("resize", true) });
    add("Transform", { value: "rotate-right", label: "Rotate right", icon: <RotateCwIcon />, shortcut: "R", keywords: "clockwise 90", run: () => rotate(1) });
    add("Transform", { value: "rotate-left", label: "Rotate left", icon: <RotateCcwIcon />, shortcut: "Shift R", keywords: "counterclockwise 90", run: () => rotate(-1) });
    add("Transform", { value: "flip-h", label: "Flip horizontal", icon: <MirrorRectangularIcon />, shortcut: "Shift H", keywords: "mirror", run: flipHorizontal });
    add("Transform", { value: "flip-v", label: "Flip vertical", icon: <MirrorRectangularIcon className="rotate-90" />, shortcut: "Shift V", keywords: "mirror", run: flipVertical });

    // Edit
    add("Edit", { value: "undo", label: "Undo", icon: <Undo2Icon />, shortcut: `${MOD} Z`, run: undo }, past.length > 0);
    add("Edit", { value: "redo", label: "Redo", icon: <Redo2Icon />, shortcut: `${MOD} Shift Z`, run: redo }, future.length > 0);
    add("Edit", { value: "select-all", label: "Select all annotations", icon: <SquareDashedMousePointerIcon />, shortcut: `${MOD} A`, run: selectAll });
    add("Edit", { value: "duplicate", label: "Duplicate selection", icon: <CopyPlusIcon />, shortcut: `${MOD} D`, run: duplicateSelected }, hasSelection);
    add("Edit", { value: "front", label: "Bring to front", icon: <ArrowUpToLineIcon />, shortcut: "]", keywords: "order arrange", run: () => reorderSelected("front") }, hasSelection);
    add("Edit", { value: "back", label: "Send to back", icon: <ArrowDownToLineIcon />, shortcut: "[", keywords: "order arrange", run: () => reorderSelected("back") }, hasSelection);
    add("Edit", { value: "delete", label: "Delete selection", icon: <TrashIcon />, shortcut: "Del", keywords: "remove", run: () => void deleteSelected() }, hasSelection);
    add("Edit", {
      value: "reset",
      label: "Reset all edits",
      icon: <ImageIcon />,
      keywords: "revert original",
      run: () =>
        confirmAction({
          title: "Reset all edits?",
          description: "Crops, rotation, filters and annotations will be removed. You can still undo this.",
          confirmLabel: "Reset",
          destructive: true,
          onConfirm: () => useDoc.getState().resetAll(),
        }),
    });

    // Filters
    for (const preset of FILTER_PRESETS) {
      add("Filters", {
        value: `filter-${preset.name}`,
        label: preset.name === "Original" ? "Remove all filters" : `Apply ${preset.name} filter`,
        icon: <WandSparklesIcon />,
        keywords: "preset adjust effect look",
        run: () => updateDoc((d) => ({ ...d, filters: { ...DEFAULT_FILTERS, ...preset.filters } })),
      });
    }

    // Panels
    add("Panels", { value: "panel-adjust", label: "Adjustments", icon: <SlidersHorizontalIcon />, shortcut: "F", keywords: "filters brightness contrast saturation", run: () => ui.togglePanel("adjust", true) });
    add("Panels", { value: "panel-color", label: "Color panel", icon: <PaletteIcon />, keywords: "color picker hex rgb", run: () => ui.togglePanel("color", true) });
    add("Panels", { value: "ocr", label: "Extract text (OCR)", icon: <ScanTextIcon />, keywords: "ocr read text copy recognize scan words", run: openOcr });
    add("Edit", { value: "remove-bg", label: "Remove background", icon: <EraserIcon />, keywords: "cutout transparent subject isolate erase background ai", run: () => void removeBackground() });
    add("Panels", { value: "panel-qr", label: "Scan for QR codes", icon: <QrCodeIcon />, shortcut: "Q", keywords: "qrcode barcode scan read decode link", run: () => void scanCurrentImage({ reveal: true }) });
    add("Panels", { value: "auto-enhance", label: "Auto enhance", icon: <WandSparklesIcon />, keywords: "auto fix improve levels white balance magic", run: () => void autoEnhance() });
    add("Panels", { value: "panel-curves", label: "Histogram", icon: <ChartSplineIcon />, shortcut: "Shift C", keywords: "curves tone levels contrast exposure histogram rgb channels", run: () => ui.togglePanel("curves", true) });
    add("Panels", { value: "panel-layers", label: "Layers", icon: <LayersIcon />, shortcut: "Shift L", keywords: "objects order arrange stack hide show delete", run: () => ui.togglePanel("layers", true) });
    add("Panels", { value: "panel-info", label: "Image info", icon: <InfoIcon />, keywords: "details size dimensions metadata", run: () => ui.togglePanel("info", true) });
  }

  add("Panels", { value: "panel-settings", label: "Settings", icon: <Settings2Icon />, shortcut: `${MOD} ,`, keywords: "preferences options", run: () => ui.togglePanel("settings", true) });
  add("Panels", { value: "panel-about", label: "About BetterViewer", icon: <BadgeInfoIcon />, keywords: "version github star credits author help", run: () => ui.togglePanel("about", true) });
  add("Panels", { value: "panel-shortcuts", label: "Keyboard shortcuts", icon: <KeyboardIcon />, shortcut: "?", keywords: "keys help", run: () => ui.togglePanel("shortcuts", true) });

  // Appearance
  for (const [mode, label] of Object.entries(BOARD_LABELS) as [BoardBackground, string][]) {
    add("Appearance", {
      value: `board-${mode}`,
      label: `Board background: ${label}`,
      icon: <LayersIcon />,
      keywords: "backdrop canvas",
      run: () => settings.set("boardBackground", mode),
    }, settings.boardBackground !== mode);
  }
  const themes: [ThemeMode, string, React.ReactNode][] = [
    ["dark", "Dark", <MoonIcon key="d" />],
    ["light", "Light", <SunIcon key="l" />],
    ["system", "System", <MonitorIcon key="s" />],
  ];
  for (const [mode, label, icon] of themes) {
    add("Appearance", {
      value: `theme-${mode}`,
      label: `Theme: ${label}`,
      icon,
      keywords: "mode color scheme",
      run: () => settings.set("theme", mode),
    }, settings.theme !== mode);
  }

  return cmds;
}

function ShortcutKeys({ shortcut }: { shortcut: string }) {
  return (
    <KbdGroup className="ms-auto">
      {shortcut.split(" ").map((k, i) => (
        <Kbd key={i}>{k}</Kbd>
      ))}
    </KbdGroup>
  );
}

const normalise = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Every typed word must appear somewhere in the label, group or keywords. */
const matchesAllWords = (itemText: string, query: string) => {
  const hay = normalise(itemText);
  return normalise(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
};

function PaletteBody({ onClose }: { onClose: () => void }) {
  // Built once per opening so availability reflects the current state.
  const commands = useMemo(buildCommands, []);
  const byValue = useMemo(() => new Map(commands.map((c) => [c.value, c])), [commands]);
  const { collection, filter } = useListCollection({
    initialItems: commands,
    itemToString: (c) => `${c.label} ${c.group} ${c.keywords ?? ""}`,
    itemToValue: (c) => c.value,
    filter: matchesAllWords,
    groupBy: (c) => c.group,
  });

  const run = (value: string | undefined) => {
    const cmd = value ? byValue.get(value) : undefined;
    if (!cmd) return;
    onClose();
    // Let the palette close (and release focus) before opening other layers.
    setTimeout(cmd.run, 0);
  };

  return (
    <Command
      collection={collection}
      onInputValueChange={({ inputValue }) => filter(inputValue)}
      onValueChange={(d) => run(d.value[0])}
    >
      <CommandInput placeholder="Type a command or search…" />
      <CommandContent>
        <CommandEmpty>No matching commands.</CommandEmpty>
        <CommandList className="max-h-[min(24rem,60svh)]">
          {collection.group().map(([group, items]) => (
            <CommandGroup heading={group} key={group}>
              {items.map((c) => (
                <CommandItem item={c} key={c.value}>
                  <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
                    {c.icon}
                  </span>
                  <span className="truncate">{c.label}</span>
                  {c.shortcut && <ShortcutKeys shortcut={c.shortcut} />}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandContent>
      <CommandFooter>
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> to navigate
          <Kbd className="ms-2">Enter</Kbd> to run
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Esc</Kbd> to close
        </span>
      </CommandFooter>
    </Command>
  );
}

/** Ctrl / ⌘ + K quick launcher for every app action. */
export function CommandPalette() {
  const open = useUi((s) => s.panels.command);
  const togglePanel = useUi((s) => s.togglePanel);
  const close = () => togglePanel("command", false);

  return (
    <CommandDialog onOpenChange={(d) => togglePanel("command", d.open)} open={open}>
      <CommandDialogContent className="glass" description="Search for an action to run" title="Quick launch">
        <PaletteBody onClose={close} />
      </CommandDialogContent>
    </CommandDialog>
  );
}
