import { DraftingCompassIcon, RulerDimensionLineIcon, RulerIcon, Trash2Icon } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { SegmentGroup, SegmentGroupItem, SegmentGroupItemText } from "@/components/ui/segment-group";
import { Toggle } from "@/components/ui/toggle";
import { Hinted, ToolbarDivider, ToolButton } from "@/components/tools/ToolButton";
import { cancelPendingMeasurement, clearMeasurements, useMeasure } from "@/state/measure";
import { useSettings } from "@/state/settings";
import { useUi } from "@/state/ui";
import { tk, useT } from "@/lib/i18n";

type Mode = "distance" | "angle";

const MODES: { id: Mode; label: string; icon: React.ReactNode }[] = [
  { id: "distance", label: tk("Distance"), icon: <RulerDimensionLineIcon /> },
  { id: "angle", label: tk("Angle"), icon: <DraftingCompassIcon /> },
];

export function MeasureToolButton() {
  const t = useT();
  const tool = useUi((s) => s.tool);
  const setTool = useUi((s) => s.setTool);
  return (
    <ToolButton active={tool === "measure"} label={t("Measure")} onClick={() => setTool("measure")} shortcut="U">
      <RulerDimensionLineIcon />
    </ToolButton>
  );
}

export const toggleRulers = () => {
  const { showRulers, set } = useSettings.getState();
  set("showRulers", !showRulers);
};

/** Options while the Measure tool is active. */
export function MeasureOptions() {
  const t = useT();
  const mode = useMeasure((s) => s.mode);
  const count = useMeasure((s) => s.items.filter((m) => !m.pending).length);
  const pending = useMeasure((s) => s.items.some((m) => m.pending));
  const rulers = useSettings((s) => s.showRulers);
  return (
    <>
      <SegmentGroup
        className="gap-0.5 rounded-lg [&>[data-part=indicator]]:bg-foreground/12"
        onValueChange={(d) => {
          if (!d.value) return;
          cancelPendingMeasurement();
          useMeasure.setState({ mode: d.value as Mode });
        }}
        value={mode}
      >
        {MODES.map((m) => (
          <SegmentGroupItem
            className="flex h-8 items-center rounded-md px-2.5 font-medium text-muted-foreground text-xs data-[state=checked]:text-foreground [&_svg]:size-4"
            key={m.id}
            value={m.id}
          >
            <SegmentGroupItemText className="flex items-center gap-1.5">
              {m.icon}
              {t(m.label)}
            </SegmentGroupItemText>
          </SegmentGroupItem>
        ))}
      </SegmentGroup>
      <ToolbarDivider />
      <Hinted label={t("Rulers & guides")} shortcut="Shift U">
        <Toggle aria-label={t("Rulers")} onPressedChange={toggleRulers} pressed={rulers} size="md">
          <RulerIcon />
        </Toggle>
      </Hinted>
      <Hinted label={t("Remove all measurements")}>
        <Button aria-label={t("Remove all measurements")} disabled={!count} onClick={clearMeasurements} size="icon-sm" variant="ghost">
          <Trash2Icon />
        </Button>
      </Hinted>
      <ToolbarDivider />
      <span className="px-2 text-muted-foreground text-xs">
        {mode === "distance"
          ? t("Drag to measure · Shift snaps to 15°")
          : pending
            ? t("Click to place the second arm")
            : t("Drag the first arm from the corner")}
      </span>
    </>
  );
}
