import { useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toast";
import { CommandPalette } from "@/components/panels/CommandPalette";
import { ConfirmDialog } from "@/components/panels/ConfirmDialog";
import { SettingsPanel } from "@/components/panels/SettingsPanel";
import { ShortcutsDialog } from "@/components/panels/ShortcutsDialog";
import { AboutDialog } from "@/components/panels/AboutDialog";
import { IncomingImageDialog } from "@/components/panels/IncomingImageDialog";
import { openFromLocation } from "@/lib/openUrl";
import { isOverlay, receiveOverlayImage } from "@/lib/overlay";
import { isGallery, startGallery, useGallery } from "@/lib/gallery";
import { GALLERY_RAIL_SPACE, GalleryRail } from "@/components/viewer/GalleryRail";
import { OverlayControls } from "@/components/viewer/OverlayControls";
import { UploadDialog } from "@/components/panels/UploadDialog";
import { CompressDialog } from "@/components/panels/CompressDialog";
import { ResizeDialog } from "@/components/panels/ResizeDialog";
import { ColorPickerPanel } from "@/components/tools/ColorPicker";
import { FilterPanel } from "@/components/tools/FilterPanel";
import { QrPanel } from "@/components/tools/QrScanner";
import { OcrPanel } from "@/components/tools/OcrPanel";
import { LayersPanel } from "@/components/panels/LayersPanel";
import { CurvesPanel } from "@/components/panels/CurvesPanel";
import { BoardBackground } from "@/components/viewer/BoardBackground";
import { CanvasContextMenu } from "@/components/viewer/CanvasContextMenu";
import { DropOverlay, EmptyState } from "@/components/viewer/EmptyState";
import { ImageInfoPanel, InfoBar } from "@/components/viewer/InfoBar";
import { ViewerCanvas } from "@/components/viewer/ViewerCanvas";
import { ViewerControls } from "@/components/viewer/ViewerControls";
import { EyedropperLoupe, Marquee, Scrollbars, ZoomHud } from "@/components/viewer/ViewerOverlays";
import { ViewerToolbar } from "@/components/viewer/ViewerToolbar";
import { useAutoHideChrome, useKeyboardShortcuts, useTheme } from "@/hooks/useKeyboardShortcuts";
import { openFiles } from "@/lib/actions";
import { viewport } from "@/lib/viewport";
import { cn } from "@/lib/utils";
import { useDoc } from "@/state/document";
import { useSettings } from "@/state/settings";
import { resetQr, scanCurrentImage } from "@/state/qr";
import { resetOcr } from "@/lib/ocr";
import { useUi } from "@/state/ui";

function useFileDrop() {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  useEffect(() => {
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current++;
      setDragging(true);
    };
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      openFiles(e.dataTransfer?.files);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);
  return dragging;
}

/** Scan each newly shown image (including after a crop) for QR codes. */
function useAutoQrScan() {
  const src = useDoc((s) => s.doc?.image.src);
  const enabled = useSettings((s) => s.autoDetectQr);
  useEffect(() => {
    if (!src) {
      resetQr();
      resetOcr();
      useUi.getState().togglePanel("qr", false);
      return;
    }
    if (!enabled) return;
    // Let the image settle on screen first; scanning runs in a worker.
    const t = setTimeout(() => scanCurrentImage(), 500);
    return () => clearTimeout(t);
  }, [src, enabled]);
}

export function ImageViewer() {
  // Images handed over by the extension (or any `?src=` link).
  useEffect(() => {
    void openFromLocation();
    receiveOverlayImage();
    startGallery();
  }, []);

  // Tab title: the image's name.
  const imageName = useDoc((s) => s.doc?.image.name);
  useEffect(() => {
    document.title = imageName ? `${imageName} · BetterViewer` : "BetterViewer";
  }, [imageName]);

  const hasDoc = useDoc((s) => !!s.doc);
  const showToolbar = useSettings((s) => s.showToolbar);
  const showRulers = useSettings((s) => s.showRulers);
  const chromeVisible = useUi((s) => s.chromeVisible);
  const dragging = useFileDrop();

  useKeyboardShortcuts();
  useTheme();
  useAutoHideChrome();
  useAutoQrScan();

  // Reserve room for the toolbar (and the gallery rail) when fitting the image.
  const galleryRail = useGallery((s) => isGallery && s.railOpen && s.items.length > 0);
  useEffect(() => {
    viewport.setInsets({ top: 64, bottom: showToolbar ? 88 : 24, left: galleryRail ? GALLERY_RAIL_SPACE : 24 });
  }, [showToolbar, galleryRail]);

  const chrome = cn(
    "transition-[opacity,translate] duration-300",
    !chromeVisible && "pointer-events-none opacity-0"
  );

  return (
    <main className="relative h-svh w-full overflow-hidden bg-background text-foreground">
      {hasDoc ? (
        <div className="absolute inset-0 animate-in fade-in-0 duration-500">
          <BoardBackground />
          <CanvasContextMenu>
            <ViewerCanvas />
          </CanvasContextMenu>
          <Marquee />
          <EyedropperLoupe />
          <Scrollbars />
          <ZoomHud />

          <div
            className={cn("absolute z-20", showRulers ? "top-8 left-8" : "top-3 left-3", chrome, !chromeVisible && "-translate-y-2")}
            data-chrome
          >
            <InfoBar />
          </div>

          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-3 z-20 flex flex-col items-center gap-2 px-3",
              chrome,
              !chromeVisible && "translate-y-3"
            )}
          >
            <div className="pointer-events-auto" data-chrome>
              <ViewerControls />
            </div>
            {showToolbar && (
              <div className="pointer-events-auto max-w-full" data-chrome>
                <ViewerToolbar />
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState />
      )}

      <FilterPanel />
      <ImageInfoPanel />
      <ColorPickerPanel />
      <QrPanel />
      <OcrPanel />
      <LayersPanel />
      <CurvesPanel />
      <SettingsPanel />
      <ShortcutsDialog />
      <AboutDialog />
      <CommandPalette />
      <UploadDialog />
      <CompressDialog />
      <ResizeDialog />
      <ConfirmDialog />
      <IncomingImageDialog />
      {isGallery && (
        <div className={chrome}>
          <GalleryRail />
        </div>
      )}
      {isOverlay && <OverlayControls />}
      <Toaster />
      <DropOverlay active={dragging} />
    </main>
  );
}
