import { ExternalLinkIcon, FolderDownIcon, GalleryVerticalEndIcon, XIcon } from "lucide-react";
import { ToolButton } from "@/components/tools/ToolButton";
import { Spinner } from "@/components/ui/spinner";
import { downloadGalleryZip, isGallery, toggleGalleryRail, useGallery } from "@/lib/gallery";
import { closeOverlay, openOverlayInTab, overlaySourceUrl } from "@/lib/overlay";
import { cn } from "@/lib/utils";
import { useDoc } from "@/state/document";
import { useT } from "@/lib/i18n";

/** Top-right buttons of the right-click overlay: open in a tab, back to the page. */
export function OverlayControls() {
  const t = useT();
  const count = useGallery((s) => s.items.length);
  const railOpen = useGallery((s) => s.railOpen);
  const zipping = useGallery((s) => s.zipping);
  const webImage = useDoc((s) => !!(s.original?.sourceUrl ?? overlaySourceUrl));
  return (
    <div
      className="glass absolute top-3 right-3 z-40 flex items-center gap-0.5 rounded-full border p-1 shadow-lg/10"
      data-chrome
    >
      {isGallery && count > 0 && (
        <ToolButton
          aria-pressed={railOpen}
          className={cn("w-auto gap-1.5 rounded-full px-3 font-medium text-xs tabular-nums", railOpen && "bg-accent text-foreground")}
          label={railOpen ? t("Hide image list") : t("Show image list")}
          onClick={toggleGalleryRail}
          side="bottom"
        >
          <GalleryVerticalEndIcon /> {count}
        </ToolButton>
      )}
      {isGallery && count > 0 && (
        <ToolButton
          className="rounded-full"
          disabled={zipping}
          label={t("Download all {count} images as ZIP", { count })}
          onClick={() => void downloadGalleryZip()}
          side="bottom"
        >
          {zipping ? <Spinner className="size-4" /> : <FolderDownIcon />}
        </ToolButton>
      )}
      {webImage && (
        <ToolButton className="rounded-full" label={t("Open in a new tab")} onClick={openOverlayInTab} side="bottom">
          <ExternalLinkIcon />
        </ToolButton>
      )}
      <ToolButton className="rounded-full" label={t("Back to the page")} onClick={closeOverlay} shortcut="Esc" side="bottom">
        <XIcon />
      </ToolButton>
    </div>
  );
}
