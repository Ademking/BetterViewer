import { PipetteIcon } from "lucide-react";
import { useMemo } from "react";
import { Kbd } from "@/components/ui/kbd";
import { CropBar } from "@/components/tools/CropTool";
import { StraightenBar } from "@/components/tools/StraightenTool";
import { DrawOptions } from "@/components/tools/DrawTool";
import { RedactControls, RedactOptions } from "@/components/tools/RedactTool";
import { EmojiControls } from "@/components/tools/EmojiTool";
import { ShapeOptions } from "@/components/tools/ShapeTool";
import { SpotlightControls, SpotlightOptions } from "@/components/tools/SpotlightTool";
import { MeasureOptions } from "@/components/tools/MeasureTool";
import {
  CounterControls,
  ImageLayerControls,
  SelectionActions,
  ShapeStyleControls,
  TextStyleControls,
} from "@/components/tools/StyleControls";
import { ToolbarDivider } from "@/components/tools/ToolButton";
import {
  annotationLabel,
  type CounterAnnotation,
  type EmojiAnnotation,
  type ImageAnnotation,
  type RedactAnnotation,
  type SpotlightAnnotation,
  type TextAnnotation,
} from "@/lib/annotations";
import { useDoc } from "@/state/document";
import { useUi } from "@/state/ui";
import { useT } from "@/lib/i18n";

function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass animate-in fade-in-0 slide-in-from-bottom-2 flex max-w-[calc(100vw-1.5rem)] items-center gap-1 overflow-x-auto rounded-xl border p-1 shadow-lg/10 duration-200 [scrollbar-width:none]">
      {children}
    </div>
  );
}

/**
 * Contextual controls that float above the toolbar: tool options while a
 * creation tool is active, or properties + actions for the selection.
 */
export function ViewerControls() {
  const t = useT();
  const tool = useUi((s) => s.tool);
  const selectedIds = useUi((s) => s.selectedIds);
  const editing = useUi((s) => s.editingTextId);
  const picked = useUi((s) => s.pickedColor);
  const annotations = useDoc((s) => s.doc?.annotations);

  const selected = useMemo(
    () => annotations?.filter((a) => selectedIds.includes(a.id)) ?? [],
    [annotations, selectedIds]
  );

  if (tool === "crop") return <CropBar />;
  if (tool === "straighten") return <StraightenBar />;

  if (tool === "eyedropper") {
    return (
      <Bar>
        <span className="flex items-center gap-2 px-2 text-xs">
          <PipetteIcon className="size-4 text-muted-foreground" />
          {t("Click the image to pick a color")}
        </span>
        {picked && (
          <span className="flex items-center gap-1.5 rounded-md bg-accent px-2 py-1 font-mono text-xs">
            <span className="size-3 rounded-full border border-white/20" style={{ background: picked }} />
            {picked.toUpperCase()}
          </span>
        )}
        <span className="flex items-center gap-1 pr-2 text-muted-foreground text-xs">
          <Kbd>Esc</Kbd> {t("to finish")}
        </span>
      </Bar>
    );
  }

  if (tool === "draw") {
    return (
      <Bar>
        <DrawOptions />
      </Bar>
    );
  }

  if (tool === "redact") {
    return (
      <Bar>
        <RedactOptions />
      </Bar>
    );
  }

  if (tool === "measure") {
    return (
      <Bar>
        <MeasureOptions />
      </Bar>
    );
  }

  if (tool === "spotlight") {
    return (
      <Bar>
        <SpotlightOptions />
      </Bar>
    );
  }

  if (tool === "shape") {
    return (
      <Bar>
        <ShapeOptions />
      </Bar>
    );
  }

  const allText = selected.length > 0 && selected.every((a) => a.type === "text");
  const allCounters = selected.length > 0 && selected.every((a) => a.type === "counter");
  const allRedact = selected.length > 0 && selected.every((a) => a.type === "redact");
  const allImages = selected.length > 0 && selected.every((a) => a.type === "image");
  const allEmoji = selected.length > 0 && selected.every((a) => a.type === "emoji");
  const allSpotlights = selected.length > 0 && selected.every((a) => a.type === "spotlight");

  if (tool === "text" && selected.length === 0) {
    return (
      <Bar>
        <TextStyleControls />
        <ToolbarDivider />
        <span className="px-2 text-muted-foreground text-xs">{t("Click to add text")}</span>
      </Bar>
    );
  }

  if (selected.length === 0) return null;

  return (
    <Bar>
      <span className="max-w-32 truncate px-2 font-medium text-muted-foreground text-xs">
        {selected.length === 1 ? annotationLabel(selected[0]) : `${selected.length} objects`}
      </span>
      <ToolbarDivider />
      {allText ? (
        <TextStyleControls target={selected[0] as TextAnnotation} />
      ) : allCounters ? (
        <CounterControls targets={selected as CounterAnnotation[]} />
      ) : allRedact ? (
        <RedactControls targets={selected as RedactAnnotation[]} />
      ) : allImages ? (
        <ImageLayerControls targets={selected as ImageAnnotation[]} />
      ) : allEmoji ? (
        <EmojiControls targets={selected as EmojiAnnotation[]} />
      ) : allSpotlights ? (
        <SpotlightControls targets={selected as SpotlightAnnotation[]} />
      ) : (
        <ShapeStyleControls
          target={selected.find((a) => a.type !== "text") ?? selected[0]}
        />
      )}
      {!editing && (
        <>
          <ToolbarDivider />
          <SelectionActions />
        </>
      )}
    </Bar>
  );
}
