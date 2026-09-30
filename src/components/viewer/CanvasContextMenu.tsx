import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  ClipboardPasteIcon,
  CopyIcon,
  CopyPlusIcon,
  MaximizeIcon,
  DownloadIcon,
  FileImageIcon,
  FlipHorizontal2Icon,
  FlipVertical2Icon,
  RotateCcwIcon,
  PipetteIcon,
  ScanTextIcon,
  SquareArrowOutUpRightIcon,
  ImageUpscaleIcon,
  QrCodeIcon,
  RotateCwIcon,
  TrashIcon,
} from "lucide-react";
import type React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { openColorPicker } from "@/components/tools/ColorPicker";
import { MOD } from "@/components/tools/ToolButton";
import {
  copyImageToClipboard,
  copyOriginalImage,
  deleteSelected,
  duplicateSelected,
  exportImage,
  flipHorizontal,
  flipVertical,
  pasteFromClipboard,
  reorderSelected,
  rotate,
  saveOriginalImage,
  zoomActual,
  zoomFit,
} from "@/lib/actions";
import { openInPhotopea, openInTinEye } from "@/lib/external";
import { openOcr } from "@/components/tools/OcrPanel";
import { scanCurrentImage } from "@/state/qr";
import { useUi } from "@/state/ui";

/** Submenu placement; it flips automatically when there is no room. */
const SUB = { placement: "right-start", gutter: 4 } as const;

export function CanvasContextMenu({ children }: { children: React.ReactNode }) {
  const hasSelection = useUi((s) => s.selectedIds.length > 0);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="absolute inset-0">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-max min-w-56">
        {hasSelection ? (
          <>
            <ContextMenuItem onSelect={duplicateSelected} value="dup">
              <CopyPlusIcon /> Duplicate
              <ContextMenuShortcut>{MOD} D</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => reorderSelected("front")} value="front">
              <ArrowUpToLineIcon /> Bring to front
              <ContextMenuShortcut>]</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => reorderSelected("back")} value="back">
              <ArrowDownToLineIcon /> Send to back
              <ContextMenuShortcut>[</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={deleteSelected} value="delete" variant="destructive">
              <TrashIcon /> Delete
              <ContextMenuShortcut>Del</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuItem onSelect={zoomFit} value="fit">
              <MaximizeIcon /> Fit to screen
              <ContextMenuShortcut>0</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={zoomActual} value="actual">
              <span className="w-3.5 text-center font-semibold text-[9px]">1:1</span> Actual size
              <ContextMenuShortcut>1</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSub positioning={SUB}>
              <ContextMenuSubTrigger>
                <RotateCwIcon /> Rotate &amp; flip
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-max min-w-52">
                <ContextMenuItem closeOnSelect={false} onSelect={() => rotate(1)} value="rotate-r">
                  <RotateCwIcon /> Rotate right
                  <ContextMenuShortcut>R</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem closeOnSelect={false} onSelect={() => rotate(-1)} value="rotate-l">
                  <RotateCcwIcon /> Rotate left
                  <ContextMenuShortcut>Shift R</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem closeOnSelect={false} onSelect={flipHorizontal} value="flip-h">
                  <FlipHorizontal2Icon /> Flip horizontal
                  <ContextMenuShortcut>Shift H</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem closeOnSelect={false} onSelect={flipVertical} value="flip-v">
                  <FlipVertical2Icon /> Flip vertical
                  <ContextMenuShortcut>Shift V</ContextMenuShortcut>
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />

            {/* "Modified" includes edits and annotations; "original" is the file as opened. */}
            <ContextMenuItem onSelect={copyImageToClipboard} value="copy">
              <CopyIcon /> Copy image (modified)
              <ContextMenuShortcut>{MOD} Shift C</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={copyOriginalImage} value="copy-original">
              <CopyIcon /> Copy image (original)
            </ContextMenuItem>
            <ContextMenuItem onSelect={pasteFromClipboard} value="paste">
              <ClipboardPasteIcon /> Paste image
              <ContextMenuShortcut>{MOD} V</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />

            <ContextMenuItem onSelect={() => void exportImage()} value="save">
              <DownloadIcon /> Save modified image
              <ContextMenuShortcut>{MOD} S</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={saveOriginalImage} value="save-original">
              <FileImageIcon /> Save original image
            </ContextMenuItem>
            <ContextMenuSeparator />

            <ContextMenuItem onSelect={openColorPicker} value="pick">
              <PipetteIcon /> Pick color
              <ContextMenuShortcut>I</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={openOcr} value="ocr">
              <ScanTextIcon /> Extract text
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => scanCurrentImage({ reveal: true })} value="qr">
              <QrCodeIcon /> Scan QR codes
              <ContextMenuShortcut>Q</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSub positioning={SUB}>
              <ContextMenuSubTrigger>
                <SquareArrowOutUpRightIcon /> Open in
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-max min-w-48">
                <ContextMenuItem onSelect={openInPhotopea} value="photopea">
                  <SquareArrowOutUpRightIcon /> Photopea
                </ContextMenuItem>
                <ContextMenuItem onSelect={openInTinEye} value="tineye">
                  <ImageUpscaleIcon /> TinEye (search)
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
