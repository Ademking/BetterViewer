import { useListCollection } from "@ark-ui/react";
import {
  HistoryIcon,
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
  MapIcon,
  SpotlightIcon,
  BadgeInfoIcon,
} from "lucide-react";
import { autoEnhance } from "@/lib/autoEnhance";
import { startStraighten } from "@/lib/straighten";
import { toggleRulers } from "@/components/tools/MeasureTool";
import { toggleNavigator } from "@/components/viewer/Navigator";
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
import { MOD } from "@/components/tools/ToolButton";
import {
  closeImage,
  copyImageToClipboard,
  deleteSelected,
  duplicateSelected,
  copyOriginalImage,
  exportImage,
  saveOriginalImage,
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
import { openInPhotopea, SEARCH_ENGINES, searchImage } from "@/lib/external";
import { removeBackground } from "@/lib/bgRemoval";
import { openOcr } from "@/components/tools/OcrPanel";
import { updateDoc, useDoc } from "@/state/document";
import { getSettings, type BoardBackground, type ThemeMode } from "@/state/settings";
import { scanCurrentImage } from "@/state/qr";
import { getUi, useUi } from "@/state/ui";
import { type ShortcutId, shortcutText } from "@/lib/shortcuts";
import { t, tk, useT } from "@/lib/i18n";

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
  blur: tk("Blurred image"),
  black: tk("Black"),
  white: tk("White"),
  grid: tk("Transparent grid"),
};

/** Every command that makes sense right now (edit commands need an image). */
function buildCommands(): PaletteCommand[] {
  const hasDoc = !!useDoc.getState().doc;
  const { past, future } = useDoc.getState();
  const ui = getUi();
  const settings = getSettings();
  const hasSelection = ui.selectedIds.length > 0;
  const keys = (id: ShortcutId) => shortcutText(id, settings.shortcuts);
  const cmds: PaletteCommand[] = [];
  const add = (group: string, c: Omit<PaletteCommand, "group">, when = true) => {
    if (when) cmds.push({ ...c, group: t(group) });
  };

  // File
  add(tk("File"), { value: "open", label: t("Open image…"), icon: <ImageUpIcon />, shortcut: keys("openImage"), keywords: "file load browse", run: openFilePicker });
  add(tk("File"), { value: "insert-image", label: t("Insert image on top…"), icon: <ImagePlusIcon />, keywords: "add picture layer overlay logo watermark sticker", run: insertImagePicker }, !!useDoc.getState().doc);
  add(tk("File"), { value: "paste", label: t("Paste image from clipboard"), icon: <ClipboardPasteIcon />, shortcut: `${MOD} V`, run: () => void pasteFromClipboard() });
  add(tk("File"), { value: "sample", label: t("Open sample image"), icon: <SparklesIcon />, keywords: "demo example", run: () => void openSample() });
  // Save follows the Save format setting, like {MOD} S.
  const SAVE_LABEL = { png: "PNG", jpeg: "JPEG", webp: "WebP" } as const;
  add(tk("File"), { value: "save", label: t("Save as {format}", { format: SAVE_LABEL[settings.saveFormat] }), icon: <DownloadIcon />, shortcut: keys("save"), keywords: "export download", run: () => void exportImage() }, hasDoc);
  for (const f of ["png", "jpeg", "webp"] as const) {
    if (f === settings.saveFormat) continue;
    add(tk("File"), { value: `save-${f}`, label: t("Save as {format}", { format: SAVE_LABEL[f] }), icon: <DownloadIcon />, keywords: `export download${f === "jpeg" ? " jpg" : ""}`, run: () => void exportImage(f) }, hasDoc);
  }
  add(tk("File"), { value: "save-original", label: t("Save original image"), icon: <DownloadIcon />, keywords: "download unedited source file export", run: () => void saveOriginalImage() }, hasDoc);
  add(tk("File"), { value: "upload-imgbb", label: t("Upload & get link…"), icon: <CloudUploadIcon />, keywords: "share link publish host imgbb kappa", run: () => ui.togglePanel("upload", true) }, hasDoc);
  add(tk("File"), { value: "photopea", label: t("Open in Photopea"), icon: <SquareArrowOutUpRightIcon />, keywords: "edit photoshop external editor", run: () => void openInPhotopea() }, hasDoc);
  for (const e of SEARCH_ENGINES) {
    add(tk("File"), { value: `search-${e.id}`, label: t("Search on {engine}", { engine: e.name }), icon: <ImageUpscaleIcon />, keywords: "reverse image search source find similar", run: () => void searchImage(e.id) }, hasDoc);
  }
  add(tk("File"), { value: "compress", label: t("Compress & save…"), icon: <FileDownIcon />, keywords: "reduce file size quality optimize jpeg webp smaller", run: () => ui.togglePanel("compress", true) }, hasDoc);
  add(tk("File"), { value: "copy-image", label: t("Copy image to clipboard"), icon: <CopyIcon />, shortcut: keys("copyImage"), keywords: "modified edited", run: () => void copyImageToClipboard() }, hasDoc);
  add(tk("File"), { value: "copy-original", label: t("Copy original image"), icon: <CopyIcon />, keywords: "clipboard unedited source", run: () => void copyOriginalImage() }, hasDoc);
  add(tk("File"), {
    value: "close",
    label: t("Close image"),
    icon: <XIcon />,
    run: () =>
      past.length
        ? confirmAction({
            title: t("Close this image?"),
            description: t("Your edits haven't been exported and will be lost."),
            confirmLabel: t("Close image"),
            destructive: true,
            onConfirm: closeImage,
          })
        : closeImage(),
  }, hasDoc);

  if (hasDoc) {
    // Tools
    // After the palette has closed, so its focus restore doesn't dismiss the popover.
    add(tk("Tools"), { value: "tool-emoji", label: t("Insert emoji…"), icon: <SmileIcon />, keywords: "emoji sticker smiley face icon reaction", run: () => setTimeout(() => ui.set({ emojiPickerOpen: true }), 150) });
    add(tk("Tools"), { value: "tool-select", label: t("Select"), icon: <MousePointer2Icon />, shortcut: keys("select"), keywords: "move pointer", run: () => ui.setTool("select") });
    add(tk("Tools"), { value: "tool-pan", label: t("Pan"), icon: <HandIcon />, shortcut: keys("pan"), keywords: "hand move", run: () => ui.setTool("pan") });
    add(tk("Tools"), { value: "tool-pen", label: t("Draw with pen"), icon: <PencilIcon />, shortcut: keys("pen"), keywords: "freehand brush", run: () => ui.setDrawMode("pen") });
    add(tk("Tools"), { value: "tool-highlighter", label: t("Highlighter"), icon: <HighlighterIcon />, shortcut: keys("highlighter"), keywords: "marker draw", run: () => ui.setDrawMode("highlighter") });
    add(tk("Tools"), { value: "tool-eraser", label: t("Eraser"), icon: <EraserIcon />, shortcut: keys("eraser"), keywords: "erase remove strokes", run: () => ui.setDrawMode("eraser") });
    add(tk("Tools"), { value: "tool-text", label: t("Add text"), icon: <TypeIcon />, shortcut: keys("text"), keywords: "type label caption", run: () => ui.setTool("text") });
    add(tk("Tools"), { value: "straighten", label: t("Straighten…"), icon: <Axis3dIcon />, keywords: "straighten level horizon tilt rotate angle perspective keystone skew fix", run: startStraighten });
    add(tk("Tools"), { value: "tool-measure", label: t("Measure distance / angle"), icon: <RulerDimensionLineIcon />, shortcut: keys("measure"), keywords: "measure ruler distance length angle protractor pixels", run: () => ui.setTool("measure") });
    add(tk("Tools"), { value: "rulers", label: t("Show / hide rulers & guides"), icon: <RulerIcon />, shortcut: keys("rulers"), keywords: "rulers guides grid align", run: toggleRulers });
    add(tk("Tools"), { value: "tool-spotlight", label: t("Spotlight an area"), icon: <SpotlightIcon />, shortcut: keys("spotlight"), keywords: "focus highlight dim darken emphasize attention", run: () => ui.setTool("spotlight") });
    add(tk("Tools"), { value: "tool-redact", label: t("Blur / pixelate an area"), icon: <PixelateIcon />, shortcut: keys("redact"), keywords: "blur pixelate hide censor redact mosaic privacy face plate", run: () => ui.setTool("redact") });
    add(tk("Tools"), { value: "tool-crop", label: t("Crop"), icon: <CropIcon />, shortcut: keys("crop"), keywords: "trim cut aspect", run: startCrop });
    add(tk("Tools"), { value: "tool-eyedropper", label: t("Pick color from image"), icon: <PipetteIcon />, shortcut: keys("colorPicker"), keywords: "eyedropper sample", run: openColorPicker });

    // Shapes
    for (const group of SHAPE_GROUPS) {
      for (const kind of group.kinds) {
        add(tk("Shapes"), {
          value: `shape-${kind}`,
          label: t(SHAPE_LABELS[kind]),
          icon: SHAPE_ICONS[kind],
          keywords: `shape draw ${group.label}`,
          run: () => ui.setShapeKind(kind),
        });
      }
    }

    // View
    add(tk("View"), { value: "zoom-in", label: t("Zoom in"), icon: <PlusIcon />, shortcut: keys("zoomIn"), run: zoomIn });
    add(tk("View"), { value: "zoom-out", label: t("Zoom out"), icon: <MinusIcon />, shortcut: keys("zoomOut"), run: zoomOut });
    add(tk("View"), { value: "zoom-fit", label: t("Fit to screen"), icon: <MaximizeIcon />, shortcut: keys("zoomFit"), keywords: "zoom", run: zoomFit });
    add(tk("View"), { value: "zoom-actual", label: t("Actual size (100%)"), icon: <ScanIcon />, shortcut: keys("zoomActual"), keywords: "zoom 1:1", run: zoomActual });
    add(tk("View"), { value: "zoom-selection", label: t("Zoom to selection"), icon: <SquareDashedMousePointerIcon />, shortcut: keys("zoomSelection"), run: zoomToSelection }, hasSelection);
    add(tk("View"), {
      value: "toggle-toolbar",
      label: settings.showToolbar ? t("Hide toolbar") : t("Show toolbar"),
      icon: <PanelBottomIcon />,
      shortcut: keys("toggleInterface"),
      keywords: "interface chrome",
      run: () => settings.set("showToolbar", !getSettings().showToolbar),
    });
    add(tk("View"), {
      value: "toggle-navigator",
      label: settings.showNavigator ? t("Hide navigator") : t("Show navigator"),
      icon: <MapIcon />,
      shortcut: keys("navigator"),
      keywords: "minimap overview thumbnail map pan position",
      run: toggleNavigator,
    });

    // Transform
    add(tk("Transform"), { value: "resize", label: t("Resize image…"), icon: <ScalingIcon />, shortcut: keys("resize"), keywords: "scale dimensions width height smaller bigger pixels", run: () => ui.togglePanel("resize", true) });
    add(tk("Transform"), { value: "rotate-right", label: t("Rotate right"), icon: <RotateCwIcon />, shortcut: keys("rotateRight"), keywords: "clockwise 90", run: () => rotate(1) });
    add(tk("Transform"), { value: "rotate-left", label: t("Rotate left"), icon: <RotateCcwIcon />, shortcut: keys("rotateLeft"), keywords: "counterclockwise 90", run: () => rotate(-1) });
    add(tk("Transform"), { value: "flip-h", label: t("Flip horizontal"), icon: <MirrorRectangularIcon />, shortcut: keys("flipHorizontal"), keywords: "mirror", run: flipHorizontal });
    add(tk("Transform"), { value: "flip-v", label: t("Flip vertical"), icon: <MirrorRectangularIcon className="rotate-90" />, shortcut: keys("flipVertical"), keywords: "mirror", run: flipVertical });

    // Edit
    add(tk("Edit"), { value: "undo", label: t("Undo"), icon: <Undo2Icon />, shortcut: keys("undo"), run: undo }, past.length > 0);
    add(tk("Edit"), { value: "redo", label: t("Redo"), icon: <Redo2Icon />, shortcut: keys("redo"), run: redo }, future.length > 0);
    add(tk("Edit"), { value: "select-all", label: t("Select all annotations"), icon: <SquareDashedMousePointerIcon />, shortcut: keys("selectAll"), run: selectAll });
    add(tk("Edit"), { value: "duplicate", label: t("Duplicate selection"), icon: <CopyPlusIcon />, shortcut: keys("duplicate"), run: duplicateSelected }, hasSelection);
    add(tk("Edit"), { value: "front", label: t("Bring to front"), icon: <ArrowUpToLineIcon />, shortcut: keys("bringToFront"), keywords: "order arrange", run: () => reorderSelected("front") }, hasSelection);
    add(tk("Edit"), { value: "back", label: t("Send to back"), icon: <ArrowDownToLineIcon />, shortcut: keys("sendToBack"), keywords: "order arrange", run: () => reorderSelected("back") }, hasSelection);
    add(tk("Edit"), { value: "delete", label: t("Delete selection"), icon: <TrashIcon />, shortcut: "Del", keywords: "remove", run: () => void deleteSelected() }, hasSelection);
    add(tk("Edit"), {
      value: "reset",
      label: t("Reset all edits"),
      icon: <ImageIcon />,
      keywords: "revert original",
      run: () =>
        confirmAction({
          title: t("Reset all edits?"),
          description: t("Crops, rotation, filters and annotations will be removed. You can still undo this."),
          confirmLabel: t("Reset"),
          destructive: true,
          onConfirm: () => useDoc.getState().resetAll(),
        }),
    });

    // Filters
    for (const preset of FILTER_PRESETS) {
      add(tk("Filters"), {
        value: `filter-${preset.name}`,
        label: preset.name === "Original" ? t("Remove all filters") : t("Apply {filter} filter", { filter: t(preset.name) }),
        icon: <WandSparklesIcon />,
        keywords: "preset adjust effect look",
        run: () => updateDoc((d) => ({ ...d, filters: { ...DEFAULT_FILTERS, ...preset.filters } })),
      });
    }

    // Panels
    add(tk("Panels"), { value: "panel-adjust", label: t("Adjustments"), icon: <SlidersHorizontalIcon />, shortcut: keys("adjust"), keywords: "filters brightness contrast saturation", run: () => ui.togglePanel("adjust", true) });
    add(tk("Panels"), { value: "panel-color", label: t("Color panel"), icon: <PaletteIcon />, keywords: "color picker hex rgb", run: () => ui.togglePanel("color", true) });
    add(tk("Panels"), { value: "ocr", label: t("Extract text (OCR)"), icon: <ScanTextIcon />, keywords: "ocr read text copy recognize scan words", run: openOcr });
    add(tk("Edit"), { value: "remove-bg", label: t("Remove background"), icon: <EraserIcon />, keywords: "cutout transparent subject isolate erase background ai", run: () => void removeBackground() });
    add(tk("Panels"), { value: "panel-qr", label: t("Scan for QR codes"), icon: <QrCodeIcon />, shortcut: keys("scanQr"), keywords: "qrcode barcode scan read decode link", run: () => void scanCurrentImage({ reveal: true }) });
    add(tk("Panels"), { value: "auto-enhance", label: t("Auto enhance"), icon: <WandSparklesIcon />, keywords: "auto fix improve levels white balance magic", run: () => void autoEnhance() });
    add(tk("Panels"), { value: "panel-curves", label: t("Histogram"), icon: <ChartSplineIcon />, shortcut: keys("curves"), keywords: "curves tone levels contrast exposure histogram rgb channels", run: () => ui.togglePanel("curves", true) });
    add(tk("Panels"), { value: "panel-history", label: t("History"), icon: <HistoryIcon />, keywords: "undo redo steps changes edits back", run: () => ui.togglePanel("history", true) });
    add(tk("Panels"), { value: "panel-layers", label: t("Layers"), icon: <LayersIcon />, shortcut: keys("layers"), keywords: "objects order arrange stack hide show delete", run: () => ui.togglePanel("layers", true) });
    add(tk("Panels"), { value: "panel-info", label: t("Image info"), icon: <InfoIcon />, keywords: "details size dimensions metadata", run: () => ui.togglePanel("info", true) });
  }

  add(tk("Panels"), { value: "panel-settings", label: t("Settings"), icon: <Settings2Icon />, shortcut: keys("settings"), keywords: "preferences options", run: () => ui.togglePanel("settings", true) });
  add(tk("Panels"), { value: "panel-about", label: t("About BetterViewer"), icon: <BadgeInfoIcon />, keywords: "version github star credits author help", run: () => ui.togglePanel("about", true) });
  add(tk("Panels"), { value: "panel-shortcuts", label: t("Keyboard shortcuts"), icon: <KeyboardIcon />, shortcut: keys("shortcuts"), keywords: "keys help", run: () => ui.togglePanel("shortcuts", true) });

  // Appearance
  for (const [mode, label] of Object.entries(BOARD_LABELS) as [BoardBackground, string][]) {
    add(tk("Appearance"), {
      value: `board-${mode}`,
      label: `${t("Board background")}: ${t(label)}`,
      icon: <LayersIcon />,
      keywords: "backdrop canvas",
      run: () => settings.set("boardBackground", mode),
    }, settings.boardBackground !== mode);
  }
  const themes: [ThemeMode, string, React.ReactNode][] = [
    ["dark", t("Dark"), <MoonIcon key="d" />],
    ["light", t("Light"), <SunIcon key="l" />],
    ["system", t("System"), <MonitorIcon key="s" />],
  ];
  for (const [mode, label, icon] of themes) {
    add(tk("Appearance"), {
      value: `theme-${mode}`,
      label: `${t("Theme")}: ${label}`,
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
  const t = useT();
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
      <CommandInput placeholder={t("Type a command or search…")} />
      <CommandContent>
        <CommandEmpty>{t("No matching commands.")}</CommandEmpty>
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
          <Kbd>↓</Kbd> {t("to navigate")}
          <Kbd className="ms-2">Enter</Kbd> {t("to run")}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Esc</Kbd> {t("to close")}
        </span>
      </CommandFooter>
    </Command>
  );
}

/** Ctrl / ⌘ + K quick launcher for every app action. */
export function CommandPalette() {
  const t = useT();
  const open = useUi((s) => s.panels.command);
  const togglePanel = useUi((s) => s.togglePanel);
  const close = () => togglePanel("command", false);

  return (
    <CommandDialog onOpenChange={(d) => togglePanel("command", d.open)} open={open}>
      <CommandDialogContent className="glass" description={t("Search for an action to run")} title={t("Quick launch")}>
        <PaletteBody onClose={close} />
      </CommandDialogContent>
    </CommandDialog>
  );
}
