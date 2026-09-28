import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  ClipboardPasteIcon,
  CopyIcon,
  CopyPlusIcon,
  MaximizeIcon,
  MirrorRectangularIcon,
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
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { openColorPicker } from "@/components/tools/ColorPicker";
import { MOD } from "@/components/tools/ToolButton";
import {
  copyImageToClipboard,
  deleteSelected,
  duplicateSelected,
  flipHorizontal,
  pasteFromClipboard,
  reorderSelected,
  rotate,
  zoomActual,
  zoomFit,
} from "@/lib/actions";
import { openInPhotopea, openInTinEye } from "@/lib/external";
import { openOcr } from "@/components/tools/OcrPanel";
import { scanCurrentImage } from "@/state/qr";
import { useUi } from "@/state/ui";

export function CanvasContextMenu({ children }: { children: React.ReactNode }) {
  const hasSelection = useUi((s) => s.selectedIds.length > 0);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="absolute inset-0">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
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
            <ContextMenuItem onSelect={() => rotate(1)} value="rotate">
              <RotateCwIcon /> Rotate right
              <ContextMenuShortcut>R</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={flipHorizontal} value="flip">
              <MirrorRectangularIcon /> Flip horizontal
              <ContextMenuShortcut>Shift H</ContextMenuShortcut>
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
            <ContextMenuItem onSelect={openInPhotopea} value="photopea">
              <SquareArrowOutUpRightIcon /> Open in Photopea
            </ContextMenuItem>
            <ContextMenuItem onSelect={openInTinEye} value="tineye">
              <ImageUpscaleIcon /> Search on TinEye
            </ContextMenuItem>
            <ContextMenuItem onSelect={copyImageToClipboard} value="copy">
              <CopyIcon /> Copy image
              <ContextMenuShortcut>{MOD} Shift C</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={pasteFromClipboard} value="paste">
              <ClipboardPasteIcon /> Paste image
              <ContextMenuShortcut>{MOD} V</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
