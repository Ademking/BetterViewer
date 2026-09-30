import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  ClipboardPasteIcon,
  CopyIcon,
  CopyPlusIcon,
  MaximizeIcon,
  DownloadIcon,
  FileImageIcon,
  ImageIcon,
  WandSparklesIcon,
  FlipHorizontal2Icon,
  FlipVertical2Icon,
  RotateCcwIcon,
  PipetteIcon,
  ScanTextIcon,
  QrCodeIcon,
  ScanSearchIcon,
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
import { SEARCH_ENGINES, searchImage } from "@/lib/external";
import { openOcr } from "@/components/tools/OcrPanel";
import { scanCurrentImage } from "@/state/qr";
import { useUi } from "@/state/ui";
import { useT } from "@/lib/i18n";

/** Submenu placement; it flips automatically when there is no room. */
const SUB = { placement: "right-start", gutter: 4 } as const;

export function CanvasContextMenu({ children }: { children: React.ReactNode }) {
  const t = useT();
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
              <CopyPlusIcon /> {t("Duplicate")}
              <ContextMenuShortcut>{MOD} D</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => reorderSelected("front")} value="front">
              <ArrowUpToLineIcon /> {t("Bring to front")}
              <ContextMenuShortcut>]</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => reorderSelected("back")} value="back">
              <ArrowDownToLineIcon /> {t("Send to back")}
              <ContextMenuShortcut>[</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={deleteSelected} value="delete" variant="destructive">
              <TrashIcon /> {t("Delete")}
              <ContextMenuShortcut>Del</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuItem onSelect={zoomFit} value="fit">
              <MaximizeIcon /> {t("Fit to screen")}
              <ContextMenuShortcut>0</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={zoomActual} value="actual">
              <span className="w-3.5 text-center font-semibold text-[9px]">1:1</span> Actual size
              <ContextMenuShortcut>1</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSub positioning={SUB}>
              <ContextMenuSubTrigger>
                <RotateCwIcon /> {t("Rotate & flip")}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-max min-w-52">
                <ContextMenuItem closeOnSelect={false} onSelect={() => rotate(1)} value="rotate-r">
                  <RotateCwIcon /> {t("Rotate right")}
                  <ContextMenuShortcut>R</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem closeOnSelect={false} onSelect={() => rotate(-1)} value="rotate-l">
                  <RotateCcwIcon /> {t("Rotate left")}
                  <ContextMenuShortcut>Shift R</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem closeOnSelect={false} onSelect={flipHorizontal} value="flip-h">
                  <FlipHorizontal2Icon /> {t("Flip horizontal")}
                  <ContextMenuShortcut>Shift H</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem closeOnSelect={false} onSelect={flipVertical} value="flip-v">
                  <FlipVertical2Icon /> {t("Flip vertical")}
                  <ContextMenuShortcut>Shift V</ContextMenuShortcut>
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSeparator />

            {/* "Modified" includes edits and annotations; "original" is the file as opened. */}
            <ContextMenuSub positioning={SUB}>
              <ContextMenuSubTrigger>
                <CopyIcon /> {t("Copy")}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-max min-w-52">
                <ContextMenuItem onSelect={copyImageToClipboard} value="copy">
                  <ImageIcon /> {t("Modified image")}
                  <ContextMenuShortcut>{MOD} Shift C</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onSelect={copyOriginalImage} value="copy-original">
                  <FileImageIcon /> {t("Original image")}
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub positioning={SUB}>
              <ContextMenuSubTrigger>
                <DownloadIcon /> {t("Save")}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-max min-w-52">
                <ContextMenuItem onSelect={() => void exportImage()} value="save">
                  <ImageIcon /> {t("Modified image")}
                  <ContextMenuShortcut>{MOD} S</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onSelect={saveOriginalImage} value="save-original">
                  <FileImageIcon /> {t("Original image")}
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem onSelect={pasteFromClipboard} value="paste">
              <ClipboardPasteIcon /> {t("Paste image")}
              <ContextMenuShortcut>{MOD} V</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />

            <ContextMenuSub positioning={SUB}>
              <ContextMenuSubTrigger>
                <WandSparklesIcon /> {t("Image tools")}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-max min-w-52">
                <ContextMenuItem onSelect={openColorPicker} value="pick">
                  <PipetteIcon /> {t("Pick color")}
                  <ContextMenuShortcut>I</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem onSelect={openOcr} value="ocr">
                  <ScanTextIcon /> {t("Extract text")}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => scanCurrentImage({ reveal: true })} value="qr">
                  <QrCodeIcon /> {t("Scan QR codes")}
                  <ContextMenuShortcut>Q</ContextMenuShortcut>
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuSub positioning={SUB}>
              <ContextMenuSubTrigger>
                <ScanSearchIcon /> {t("Search image")}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-max min-w-48">
                {SEARCH_ENGINES.map((e) => (
                  <ContextMenuItem key={e.id} onSelect={() => void searchImage(e.id)} value={`search-${e.id}`}>
                    <ScanSearchIcon /> {e.name}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
