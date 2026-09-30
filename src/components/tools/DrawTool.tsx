import { EraserIcon, HighlighterIcon, PencilIcon } from "lucide-react";
import { SegmentGroup, SegmentGroupItem, SegmentGroupItemText } from "@/components/ui/segment-group";
import { ShapeStyleControls } from "@/components/tools/StyleControls";
import { ToolbarDivider, ToolButton } from "@/components/tools/ToolButton";
import type { DrawMode } from "@/lib/annotations";
import { useUi } from "@/state/ui";
import { tk, useT } from "@/lib/i18n";

const MODES: { id: DrawMode; label: string; icon: React.ReactNode; key: string }[] = [
  { id: "pen", label: tk("Pen"), icon: <PencilIcon />, key: "P" },
  { id: "highlighter", label: tk("Highlighter"), icon: <HighlighterIcon />, key: "Shift P" },
  { id: "eraser", label: tk("Eraser"), icon: <EraserIcon />, key: "E" },
];

export function DrawToolButton() {
  const t = useT();
  const tool = useUi((s) => s.tool);
  const mode = useUi((s) => s.drawMode);
  const setDrawMode = useUi((s) => s.setDrawMode);
  const current = MODES.find((m) => m.id === mode) ?? MODES[0];
  return (
    <ToolButton
      active={tool === "draw"}
      label={t("Draw")}
      onClick={() => setDrawMode(mode)}
      shortcut="P"
    >
      {current.icon}
    </ToolButton>
  );
}

/** Options shown above the toolbar while drawing. */
export function DrawOptions() {
  const t = useT();
  const mode = useUi((s) => s.drawMode);
  const setDrawMode = useUi((s) => s.setDrawMode);
  return (
    <>
      <SegmentGroup
        className="gap-0.5 rounded-lg"
        onValueChange={(d) => d.value && setDrawMode(d.value as DrawMode)}
        value={mode}
      >
        {MODES.map((m) => (
          <SegmentGroupItem
            aria-label={t(m.label)}
            className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground data-[state=checked]:text-foreground [&_svg]:size-4"
            key={m.id}
            value={m.id}
          >
            <SegmentGroupItemText className="flex items-center gap-1.5">
              {m.icon}
              <span className="hidden sm:inline">{t(m.label)}</span>
            </SegmentGroupItemText>
          </SegmentGroupItem>
        ))}
      </SegmentGroup>
      {mode !== "eraser" && (
        <>
          <ToolbarDivider />
          <ShapeStyleControls showFill={false} />
        </>
      )}
      {mode === "eraser" && (
        <span className="px-2 text-muted-foreground text-xs">{t("Drag across strokes to erase them")}</span>
      )}
    </>
  );
}
