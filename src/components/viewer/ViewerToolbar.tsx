import {
  ExternalLinkIcon,
  ClipboardPasteIcon,
  ChartSplineIcon,
  LayersIcon,
  CheckIcon,
  EyeIcon,
  MapIcon,
  RulerIcon,
  SaveAllIcon,
  FolderOpenIcon,
  CircleHelpIcon,
  HistoryIcon,
  ScanSearchIcon,
  FileImageIcon,
  Share2Icon,
  SquarePenIcon,
  WandSparklesIcon,
  EraserIcon,
  ScanTextIcon,
  FileDownIcon,
  ImagePlusIcon,
  SquareArrowOutUpRightIcon,
  CloudUploadIcon,
  QrCodeIcon,
  CommandIcon,
  CopyIcon,
  CropIcon,
  DownloadIcon,
  EllipsisIcon,
  HandIcon,
  ImageIcon,
  ImageUpIcon,
  InfoIcon,
  KeyboardIcon,
  BadgeInfoIcon,
  MirrorRectangularIcon,
  MousePointer2Icon,
  Redo2Icon,
  RotateCcwIcon,
  RotateCwIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/menu";
import { confirmAction } from "@/components/panels/ConfirmDialog";
import { BOARD_OPTIONS, BoardSwatch } from "@/components/panels/SettingsPanel";
import { ColorPickerTool } from "@/components/tools/ColorPicker";
import { startCrop } from "@/components/tools/CropTool";
import { DrawToolButton } from "@/components/tools/DrawTool";
import { ShapeToolButton } from "@/components/tools/ShapeTool";
import { RedactToolButton } from "@/components/tools/RedactTool";
import { SpotlightToolButton } from "@/components/tools/SpotlightTool";
import { viewOriginal } from "@/lib/openUrl";
import { MeasureToolButton, toggleRulers } from "@/components/tools/MeasureTool";
import { toggleNavigator } from "@/components/viewer/Navigator";
import { TextToolButton } from "@/components/tools/TextTool";
import { EmojiToolButton } from "@/components/tools/EmojiTool";
import { MOD, ToolbarDivider, ToolButton } from "@/components/tools/ToolButton";
import { TransformTools } from "@/components/tools/TransformTools";
import { ZoomControls } from "@/components/tools/ZoomControls";
import {
  closeImage,
  copyImageToClipboard,
  exportImage,
  flipHorizontal,
  insertImagePicker,
  openFilePicker,
  pasteFromClipboard,
  redo,
  rotate,
  saveOriginalImage,
  undo,
} from "@/lib/actions";
import { isDefaultFilters } from "@/lib/filters";
import { openInPhotopea, SEARCH_ENGINES, searchImage } from "@/lib/external";
import { removeBackground } from "@/lib/bgRemoval";
import { openOcr } from "@/components/tools/OcrPanel";
import { type BoardBackground, type SaveFormat, useSettings } from "@/state/settings";
import { hasEdits, useDoc } from "@/state/document";
import { scanCurrentImage } from "@/state/qr";
import { useUi } from "@/state/ui";
import { useShortcutText } from "@/lib/shortcuts";
import { useT } from "@/lib/i18n";

export function ViewerToolbar() {
  const t = useT();
  const tool = useUi((s) => s.tool);
  const setTool = useUi((s) => s.setTool);
  const adjustOpen = useUi((s) => s.panels.adjust);
  const layersOpen = useUi((s) => s.panels.layers);
  const togglePanel = useUi((s) => s.togglePanel);
  const canUndo = useDoc((s) => s.past.length > 0);
  const canRedo = useDoc((s) => s.future.length > 0);
  const filtersActive = useDoc((s) => (s.doc ? !isDefaultFilters(s.doc.filters) || !!s.doc.curves || !!s.doc.levels : false));

  return (
    <div
      className="glass flex max-w-[calc(100vw-1.5rem)] items-center gap-0.5 overflow-x-auto rounded-2xl border p-1 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] [scrollbar-width:none]"
      role="toolbar"
      aria-label={t("Tools")}
    >
      <ToolButton active={tool === "select"} label={t("Select")} onClick={() => setTool("select")} command="select">
        <MousePointer2Icon />
      </ToolButton>
      <div className="flex max-sm:hidden">
        <ToolButton active={tool === "pan"} label={t("Pan")} onClick={() => setTool("pan")} command="pan">
          <HandIcon />
        </ToolButton>
      </div>

      <ToolbarDivider />

      <DrawToolButton />
      <ShapeToolButton />
      <TextToolButton />
      <EmojiToolButton />
      <RedactToolButton />
      <SpotlightToolButton />

      <ToolbarDivider />

      <ToolButton active={tool === "crop"} label={t("Crop")} command="crop" onClick={startCrop}>
        <CropIcon />
      </ToolButton>
      <ToolButton
        active={adjustOpen}
        label={t("Adjustments")}
        onClick={() => togglePanel("adjust")}
        command="adjust"
      >
        <SlidersHorizontalIcon />
        {filtersActive && !adjustOpen && (
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-brand" />
        )}
      </ToolButton>
      <ColorPickerTool />
      <MeasureToolButton />
      <div className="flex max-md:hidden">
        <ToolButton
          active={layersOpen}
          label={t("Layers")}
          onClick={() => togglePanel("layers")}
          command="layers"
        >
          <LayersIcon />
        </ToolButton>
      </div>

      <ToolbarDivider className="max-md:hidden" />
      <div className="flex items-center gap-0.5 max-md:hidden">
        <TransformTools />
      </div>

      <ToolbarDivider />
      <div className="max-sm:hidden">
        <ZoomControls />
      </div>
      <div className="sm:hidden">
        <ZoomControls compact />
      </div>

      <ToolbarDivider className="max-md:hidden" />
      <div className="flex items-center gap-0.5 max-md:hidden">
        <ToolButton disabled={!canUndo} label={t("Undo")} onClick={undo} command="undo">
          <Undo2Icon />
        </ToolButton>
        <ToolButton disabled={!canRedo} label={t("Redo")} onClick={redo} command="redo">
          <Redo2Icon />
        </ToolButton>
      </div>

      <ToolbarDivider />
      <MoreMenu canRedo={canRedo} canUndo={canUndo} />
    </div>
  );
}

const SAVE_LABEL: Record<SaveFormat, string> = { png: "PNG", jpeg: "JPEG", webp: "WebP" };

/** Submenu placement; it flips automatically when there is no room. */
const SUB = { placement: "left-start", gutter: 4 } as const;

function MoreMenu({ canUndo, canRedo }: { canUndo: boolean; canRedo: boolean }) {
  const t = useT();
  const keys = useShortcutText();
  const sourceUrl = useDoc((s) => s.original?.sourceUrl);
  const board = useSettings((s) => s.boardBackground);
  const set = useSettings((s) => s.set);
  const saveFormat = useSettings((s) => s.saveFormat);
  const rulers = useSettings((s) => s.showRulers);
  const navigatorShown = useSettings((s) => s.showNavigator);
  const togglePanel = useUi((s) => s.togglePanel);
  const dirty = useDoc((s) => s.past.length > 0);
  const edited = useDoc(hasEdits);

  return (
    <Menu positioning={{ placement: "top-end", gutter: 14 }}>
      <MenuTrigger asChild>
        <ToolButton label={t("More")}>
          <EllipsisIcon />
        </ToolButton>
      </MenuTrigger>
      <MenuContent className="w-max min-w-60">
        <MenuItem onSelect={() => togglePanel("command", true)} value="command">
          <CommandIcon /> {t("Quick launch…")}
          <MenuShortcut>{keys("commandPalette")}</MenuShortcut>
        </MenuItem>
        <MenuSeparator />

        <MenuSub positioning={SUB}>
          <MenuSubTrigger>
            <FolderOpenIcon /> {t("Open")}
          </MenuSubTrigger>
          <MenuSubContent className="w-max min-w-56">
            <MenuItem onSelect={openFilePicker} value="open">
              <ImageUpIcon /> {t("Open image…")}
              <MenuShortcut>{keys("openImage")}</MenuShortcut>
            </MenuItem>
            <MenuItem onSelect={insertImagePicker} value="insert">
              <ImagePlusIcon /> {t("Insert image on top…")}
            </MenuItem>
            <MenuItem onSelect={pasteFromClipboard} value="paste">
              <ClipboardPasteIcon /> {t("Paste image")}
              <MenuShortcut>{MOD} V</MenuShortcut>
            </MenuItem>
            {sourceUrl && (
              <>
                <MenuSeparator />
                <MenuItem onSelect={() => viewOriginal(sourceUrl)} value="view-original">
                  <ExternalLinkIcon /> {t("View original")}
                </MenuItem>
              </>
            )}
          </MenuSubContent>
        </MenuSub>
        <MenuSub positioning={SUB}>
          <MenuSubTrigger>
            <DownloadIcon /> {t("Save")}
          </MenuSubTrigger>
          <MenuSubContent className="w-max min-w-56">
            {/* The Save format setting, like {MOD} S. */}
            <MenuItem onSelect={() => exportImage()} value="save">
              <DownloadIcon /> {t("Save as {format}", { format: SAVE_LABEL[saveFormat] })}
              <MenuShortcut>{keys("save")}</MenuShortcut>
            </MenuItem>
            <MenuSeparator />
            <MenuGroup heading={t("Other formats")}>
              {(Object.keys(SAVE_LABEL) as (keyof typeof SAVE_LABEL)[])
                .filter((f) => f !== saveFormat)
                .map((f) => (
                  <MenuItem key={f} onSelect={() => exportImage(f)} value={`save-${f}`}>
                    <SaveAllIcon /> {t("Save as {format}", { format: SAVE_LABEL[f] })}
                  </MenuItem>
                ))}
              <MenuItem onSelect={saveOriginalImage} value="save-original">
                <FileImageIcon /> {t("Original file")}
              </MenuItem>
            </MenuGroup>
            <MenuSeparator />
            <MenuItem onSelect={() => togglePanel("compress", true)} value="compress">
              <FileDownIcon /> {t("Compress & save…")}
            </MenuItem>
          </MenuSubContent>
        </MenuSub>
        <MenuItem onSelect={copyImageToClipboard} value="copy">
          <CopyIcon /> {t("Copy image")}
          <MenuShortcut>{keys("copyImage")}</MenuShortcut>
        </MenuItem>
        <MenuSeparator />

        <MenuSub positioning={SUB}>
          <MenuSubTrigger>
            <WandSparklesIcon /> {t("Image tools")}
          </MenuSubTrigger>
          <MenuSubContent className="w-max min-w-56">
            <MenuItem onSelect={() => void removeBackground()} value="remove-bg">
              <EraserIcon /> {t("Remove background")}
            </MenuItem>
            <MenuItem onSelect={openOcr} value="ocr">
              <ScanTextIcon /> {t("Extract text (OCR)")}
            </MenuItem>
            <MenuItem onSelect={() => scanCurrentImage({ reveal: true })} value="qr">
              <QrCodeIcon /> {t("Scan QR codes")}
              <MenuShortcut>{keys("scanQr")}</MenuShortcut>
            </MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={() => togglePanel("curves", true)} value="curves">
              <ChartSplineIcon /> {t("Histogram")}
              <MenuShortcut>{keys("curves")}</MenuShortcut>
            </MenuItem>
            <MenuItem onSelect={() => togglePanel("info", true)} value="info">
              <InfoIcon /> {t("Image info")}
            </MenuItem>
          </MenuSubContent>
        </MenuSub>

        <MenuSub positioning={SUB}>
          <MenuSubTrigger>
            <ScanSearchIcon /> {t("Search image")}
          </MenuSubTrigger>
          <MenuSubContent className="w-max min-w-52">
            {SEARCH_ENGINES.map((e) => (
              <MenuItem key={e.id} onSelect={() => void searchImage(e.id)} value={`search-${e.id}`}>
                <ScanSearchIcon /> {e.name}
              </MenuItem>
            ))}
          </MenuSubContent>
        </MenuSub>
        <MenuSub positioning={SUB}>
          <MenuSubTrigger>
            <Share2Icon /> {t("Share")}
          </MenuSubTrigger>
          <MenuSubContent className="w-max min-w-56">
            <MenuItem onSelect={() => togglePanel("upload", true)} value="upload">
              <CloudUploadIcon /> {t("Upload & get link…")}
            </MenuItem>
            <MenuItem onSelect={openInPhotopea} value="photopea">
              <SquareArrowOutUpRightIcon /> {t("Open in Photopea")}
            </MenuItem>
          </MenuSubContent>
        </MenuSub>
        <MenuSub positioning={SUB}>
          <MenuSubTrigger>
            <EyeIcon /> {t("View")}
          </MenuSubTrigger>
          <MenuSubContent className="w-max min-w-56">
            <MenuItem onSelect={() => togglePanel("layers", true)} value="layers">
              <LayersIcon /> {t("Layers")}
              <MenuShortcut>{keys("layers")}</MenuShortcut>
            </MenuItem>
            <MenuItem onSelect={() => togglePanel("history", true)} value="history">
              <HistoryIcon /> {t("History")}
            </MenuItem>
            <MenuItem closeOnSelect={false} onSelect={toggleRulers} value="rulers">
              <RulerIcon /> {t("Rulers & guides")}
              {rulers ? <CheckIcon className="ms-auto text-brand" /> : <MenuShortcut>{keys("rulers")}</MenuShortcut>}
            </MenuItem>
            <MenuItem closeOnSelect={false} onSelect={toggleNavigator} value="navigator">
              <MapIcon /> {t("Navigator")}
              {navigatorShown ? <CheckIcon className="ms-auto text-brand" /> : <MenuShortcut>{keys("navigator")}</MenuShortcut>}
            </MenuItem>
            <MenuSeparator />
            <MenuRadioGroup
              heading={t("Board background")}
              onValueChange={(d) => set("boardBackground", d.value as BoardBackground)}
              value={board}
            >
              {BOARD_OPTIONS.map((o) => (
                <MenuRadioItem key={o.value} value={o.value}>
                  <span className="flex items-center gap-2">
                    <BoardSwatch
                      className="checker-sm size-3.5 rounded-sm border border-white/20"
                      mode={o.value}
                    />
                    {t(o.label)}
                  </span>
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuSubContent>
        </MenuSub>

        {/* Toolbar groups that are hidden on small screens */}
        <div className="md:hidden">
          <MenuSub positioning={SUB}>
            <MenuSubTrigger>
              <SquarePenIcon /> {t("Edit")}
            </MenuSubTrigger>
            <MenuSubContent className="w-max min-w-52">
              <MenuItem closeOnSelect={false} disabled={!canUndo} onSelect={undo} value="undo">
                <Undo2Icon /> {t("Undo")}
              </MenuItem>
              <MenuItem closeOnSelect={false} disabled={!canRedo} onSelect={redo} value="redo">
                <Redo2Icon /> {t("Redo")}
              </MenuItem>
              <MenuSeparator />
              <MenuItem closeOnSelect={false} onSelect={() => rotate(-1)} value="rotate-l">
                <RotateCcwIcon /> {t("Rotate left")}
              </MenuItem>
              <MenuItem closeOnSelect={false} onSelect={() => rotate(1)} value="rotate-r">
                <RotateCwIcon /> {t("Rotate right")}
              </MenuItem>
              <MenuItem closeOnSelect={false} onSelect={flipHorizontal} value="flip">
                <MirrorRectangularIcon /> {t("Flip horizontal")}
              </MenuItem>
            </MenuSubContent>
          </MenuSub>
        </div>

        <MenuSeparator />
        <MenuItem onSelect={() => togglePanel("settings", true)} value="settings">
          <Settings2Icon /> {t("Settings")}
          <MenuShortcut>{keys("settings")}</MenuShortcut>
        </MenuItem>
        <MenuSub positioning={SUB}>
          <MenuSubTrigger>
            <CircleHelpIcon /> {t("Help")}
          </MenuSubTrigger>
          <MenuSubContent className="w-max min-w-56">
            <MenuItem onSelect={() => togglePanel("shortcuts", true)} value="shortcuts">
              <KeyboardIcon /> {t("Keyboard shortcuts")}
              <MenuShortcut>{keys("shortcuts")}</MenuShortcut>
            </MenuItem>
            <MenuItem onSelect={() => togglePanel("about", true)} value="about">
              <BadgeInfoIcon /> {t("About BetterViewer")}
            </MenuItem>
          </MenuSubContent>
        </MenuSub>
        <MenuSeparator />
        <MenuItem
          disabled={!edited}
          onSelect={() =>
            confirmAction({
              title: t("Reset all edits?"),
              description: t("Crops, rotation, filters and annotations will be removed. You can still undo this."),
              confirmLabel: t("Reset"),
              destructive: true,
              onConfirm: () => useDoc.getState().resetAll(),
            })
          }
          value="reset"
          variant="destructive"
        >
          <ImageIcon /> {t("Reset all edits")}
        </MenuItem>
        <MenuItem
          onSelect={() => {
            if (!dirty) {
              closeImage();
              return;
            }
            confirmAction({
              title: t("Close this image?"),
              description: t("Your edits haven't been exported and will be lost."),
              confirmLabel: t("Close image"),
              destructive: true,
              onConfirm: closeImage,
            });
          }}
          value="close"
          variant="destructive"
        >
          <XIcon /> {t("Close image")}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
