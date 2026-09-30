import {
  ExternalLinkIcon,
  ClipboardPasteIcon,
  ChartSplineIcon,
  LayersIcon,
  CheckIcon,
  EyeIcon,
  RulerIcon,
  SaveAllIcon,
  FileImageIcon,
  Share2Icon,
  SquarePenIcon,
  WandSparklesIcon,
  EraserIcon,
  ScanTextIcon,
  FileDownIcon,
  ImagePlusIcon,
  SquareArrowOutUpRightIcon,
  ImageUpscaleIcon,
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
import { openInPhotopea, openInTinEye } from "@/lib/external";
import { removeBackground } from "@/lib/bgRemoval";
import { openOcr } from "@/components/tools/OcrPanel";
import { type BoardBackground, type SaveFormat, useSettings } from "@/state/settings";
import { hasEdits, useDoc } from "@/state/document";
import { scanCurrentImage } from "@/state/qr";
import { useUi } from "@/state/ui";

export function ViewerToolbar() {
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
      aria-label="Tools"
    >
      <ToolButton active={tool === "select"} label="Select" onClick={() => setTool("select")} shortcut="V">
        <MousePointer2Icon />
      </ToolButton>
      <div className="flex max-sm:hidden">
        <ToolButton active={tool === "pan"} label="Pan" onClick={() => setTool("pan")} shortcut="H">
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

      <ToolButton active={tool === "crop"} label="Crop" onClick={startCrop} shortcut="C">
        <CropIcon />
      </ToolButton>
      <ToolButton
        active={adjustOpen}
        label="Adjustments"
        onClick={() => togglePanel("adjust")}
        shortcut="F"
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
          label="Layers"
          onClick={() => togglePanel("layers")}
          shortcut="Shift L"
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
        <ToolButton disabled={!canUndo} label="Undo" onClick={undo} shortcut={`${MOD} Z`}>
          <Undo2Icon />
        </ToolButton>
        <ToolButton disabled={!canRedo} label="Redo" onClick={redo} shortcut={`${MOD} Shift Z`}>
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
  const sourceUrl = useDoc((s) => s.original?.sourceUrl);
  const board = useSettings((s) => s.boardBackground);
  const set = useSettings((s) => s.set);
  const saveFormat = useSettings((s) => s.saveFormat);
  const rulers = useSettings((s) => s.showRulers);
  const togglePanel = useUi((s) => s.togglePanel);
  const dirty = useDoc((s) => s.past.length > 0);
  const edited = useDoc(hasEdits);

  return (
    <Menu positioning={{ placement: "top-end", gutter: 14 }}>
      <MenuTrigger asChild>
        <ToolButton label="More">
          <EllipsisIcon />
        </ToolButton>
      </MenuTrigger>
      <MenuContent className="w-max min-w-60">
        <MenuItem onSelect={() => togglePanel("command", true)} value="command">
          <CommandIcon /> Quick launch…
          <MenuShortcut>{MOD} K</MenuShortcut>
        </MenuItem>
        <MenuSeparator />

        <MenuItem onSelect={openFilePicker} value="open">
          <ImageUpIcon /> Open image…
          <MenuShortcut>{MOD} O</MenuShortcut>
        </MenuItem>
        <MenuItem onSelect={insertImagePicker} value="insert">
          <ImagePlusIcon /> Insert image on top…
        </MenuItem>
        <MenuItem onSelect={pasteFromClipboard} value="paste">
          <ClipboardPasteIcon /> Paste image
          <MenuShortcut>{MOD} V</MenuShortcut>
        </MenuItem>
        {sourceUrl && (
          <MenuItem onSelect={() => viewOriginal(sourceUrl)} value="view-original">
            <ExternalLinkIcon /> View original
          </MenuItem>
        )}
        <MenuSeparator />

        {/* Save follows the Save format setting, like {MOD} S. */}
        <MenuItem onSelect={() => exportImage()} value="save">
          <DownloadIcon /> Save as {SAVE_LABEL[saveFormat]}
          <MenuShortcut>{MOD} S</MenuShortcut>
        </MenuItem>
        <MenuSub positioning={SUB}>
          <MenuSubTrigger>
            <SaveAllIcon /> Save as
          </MenuSubTrigger>
          <MenuSubContent className="w-max min-w-52">
            {(Object.keys(SAVE_LABEL) as (keyof typeof SAVE_LABEL)[]).map((f) => (
              <MenuItem key={f} onSelect={() => exportImage(f)} value={`save-${f}`}>
                <DownloadIcon /> {SAVE_LABEL[f]}
              </MenuItem>
            ))}
            <MenuItem onSelect={saveOriginalImage} value="save-original">
              <FileImageIcon /> Original file
            </MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={() => togglePanel("compress", true)} value="compress">
              <FileDownIcon /> Compress &amp; save…
            </MenuItem>
          </MenuSubContent>
        </MenuSub>
        <MenuItem onSelect={copyImageToClipboard} value="copy">
          <CopyIcon /> Copy image
          <MenuShortcut>{MOD} Shift C</MenuShortcut>
        </MenuItem>
        <MenuSub positioning={SUB}>
          <MenuSubTrigger>
            <Share2Icon /> Share
          </MenuSubTrigger>
          <MenuSubContent className="w-max min-w-56">
            <MenuItem onSelect={() => togglePanel("upload", true)} value="upload">
              <CloudUploadIcon /> Upload &amp; get link…
            </MenuItem>
            <MenuItem onSelect={openInPhotopea} value="photopea">
              <SquareArrowOutUpRightIcon /> Open in Photopea
            </MenuItem>
            <MenuItem onSelect={openInTinEye} value="tineye">
              <ImageUpscaleIcon /> Search on TinEye
            </MenuItem>
          </MenuSubContent>
        </MenuSub>
        <MenuSeparator />

        <MenuSub positioning={SUB}>
          <MenuSubTrigger>
            <WandSparklesIcon /> Image tools
          </MenuSubTrigger>
          <MenuSubContent className="w-max min-w-56">
            <MenuItem onSelect={() => void removeBackground()} value="remove-bg">
              <EraserIcon /> Remove background
            </MenuItem>
            <MenuItem onSelect={openOcr} value="ocr">
              <ScanTextIcon /> Extract text (OCR)
            </MenuItem>
            <MenuItem onSelect={() => scanCurrentImage({ reveal: true })} value="qr">
              <QrCodeIcon /> Scan QR codes
              <MenuShortcut>Q</MenuShortcut>
            </MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={() => togglePanel("curves", true)} value="curves">
              <ChartSplineIcon /> Histogram
              <MenuShortcut>Shift C</MenuShortcut>
            </MenuItem>
            <MenuItem onSelect={() => togglePanel("info", true)} value="info">
              <InfoIcon /> Image info
            </MenuItem>
          </MenuSubContent>
        </MenuSub>

        <MenuSub positioning={SUB}>
          <MenuSubTrigger>
            <EyeIcon /> View
          </MenuSubTrigger>
          <MenuSubContent className="w-max min-w-56">
            <MenuItem onSelect={() => togglePanel("layers", true)} value="layers">
              <LayersIcon /> Layers
              <MenuShortcut>Shift L</MenuShortcut>
            </MenuItem>
            <MenuItem closeOnSelect={false} onSelect={toggleRulers} value="rulers">
              <RulerIcon /> Rulers &amp; guides
              {rulers ? <CheckIcon className="ms-auto text-brand" /> : <MenuShortcut>Shift U</MenuShortcut>}
            </MenuItem>
            <MenuSeparator />
            <MenuRadioGroup
              heading="Board background"
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
                    {o.label}
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
              <SquarePenIcon /> Edit
            </MenuSubTrigger>
            <MenuSubContent className="w-max min-w-52">
              <MenuItem closeOnSelect={false} disabled={!canUndo} onSelect={undo} value="undo">
                <Undo2Icon /> Undo
              </MenuItem>
              <MenuItem closeOnSelect={false} disabled={!canRedo} onSelect={redo} value="redo">
                <Redo2Icon /> Redo
              </MenuItem>
              <MenuSeparator />
              <MenuItem closeOnSelect={false} onSelect={() => rotate(-1)} value="rotate-l">
                <RotateCcwIcon /> Rotate left
              </MenuItem>
              <MenuItem closeOnSelect={false} onSelect={() => rotate(1)} value="rotate-r">
                <RotateCwIcon /> Rotate right
              </MenuItem>
              <MenuItem closeOnSelect={false} onSelect={flipHorizontal} value="flip">
                <MirrorRectangularIcon /> Flip horizontal
              </MenuItem>
            </MenuSubContent>
          </MenuSub>
        </div>

        <MenuSeparator />
        <MenuItem onSelect={() => togglePanel("settings", true)} value="settings">
          <Settings2Icon /> Settings
          <MenuShortcut>{MOD} ,</MenuShortcut>
        </MenuItem>
        <MenuItem onSelect={() => togglePanel("shortcuts", true)} value="shortcuts">
          <KeyboardIcon /> Keyboard shortcuts
          <MenuShortcut>?</MenuShortcut>
        </MenuItem>
        <MenuItem onSelect={() => togglePanel("about", true)} value="about">
          <BadgeInfoIcon /> About BetterViewer
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          disabled={!edited}
          onSelect={() =>
            confirmAction({
              title: "Reset all edits?",
              description:
                "Crops, rotation, filters and annotations will be removed. You can still undo this.",
              confirmLabel: "Reset",
              destructive: true,
              onConfirm: () => useDoc.getState().resetAll(),
            })
          }
          value="reset"
          variant="destructive"
        >
          <ImageIcon /> Reset all edits
        </MenuItem>
        <MenuItem
          onSelect={() => {
            if (!dirty) {
              closeImage();
              return;
            }
            confirmAction({
              title: "Close this image?",
              description: "Your edits haven't been exported and will be lost.",
              confirmLabel: "Close image",
              destructive: true,
              onConfirm: closeImage,
            });
          }}
          value="close"
          variant="destructive"
        >
          <XIcon /> Close image
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
