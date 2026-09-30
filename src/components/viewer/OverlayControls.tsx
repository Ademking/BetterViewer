import { ExternalLinkIcon, XIcon } from "lucide-react";
import { ToolButton } from "@/components/tools/ToolButton";
import { closeOverlay, openOverlayInTab, overlaySourceUrl } from "@/lib/overlay";

/** Top-right buttons of the right-click overlay: open in a tab, back to the page. */
export function OverlayControls() {
  return (
    <div
      className="glass absolute top-3 right-3 z-30 flex items-center gap-0.5 rounded-full border p-1 shadow-lg/10"
      data-chrome
    >
      {overlaySourceUrl && (
        <ToolButton label="Open in a new tab" onClick={openOverlayInTab} side="bottom">
          <ExternalLinkIcon />
        </ToolButton>
      )}
      <ToolButton label="Back to the page" onClick={closeOverlay} shortcut="Esc" side="bottom">
        <XIcon />
      </ToolButton>
    </div>
  );
}
