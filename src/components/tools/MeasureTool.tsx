import { DraftingCompassIcon, RulerDimensionLineIcon, RulerIcon, Trash2Icon } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { SegmentGroup, SegmentGroupItem, SegmentGroupItemText } from "@/components/ui/segment-group";
import { Toggle } from "@/components/ui/toggle";
import { Hinted, ToolbarDivider, ToolButton } from "@/components/tools/ToolButton";
import { cancelPendingMeasurement, clearMeasurements, useMeasure } from "@/state/measure";
import { useSettings } from "@/state/settings";
import { useUi } from "@/state/ui";

type Mode = "distance" | "angle";

const MODES: { id: Mode; label: string; icon: React.ReactNode }[] = [
  { id: "distance", label: "Distance", icon: <RulerDimensionLineIcon /> },
  { id: "angle", label: "Angle", icon: <DraftingCompassIcon /> },
];

export function MeasureToolButton() {
  const tool = useUi((s) => s.tool);
  const setTool = useUi((s) => s.setTool);
  return (
    <ToolButton active={tool === "measure"} label="Measure" onClick={() => setTool("measure")} shortcut="U">
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
              {m.label}
            </SegmentGroupItemText>
          </SegmentGroupItem>
        ))}
      </SegmentGroup>
      <ToolbarDivider />
      <Hinted label="Rulers & guides" shortcut="Shift U">
        <Toggle aria-label="Rulers" onPressedChange={toggleRulers} pressed={rulers} size="md">
          <RulerIcon />
        </Toggle>
      </Hinted>
      <Hinted label="Remove all measurements">
        <Button aria-label="Remove all measurements" disabled={!count} onClick={clearMeasurements} size="icon-sm" variant="ghost">
          <Trash2Icon />
        </Button>
      </Hinted>
      <ToolbarDivider />
      <span className="px-2 text-muted-foreground text-xs">
        {mode === "distance"
          ? "Drag to measure · Shift snaps to 15°"
          : pending
            ? "Click to place the second arm"
            : "Drag the first arm from the corner"}
      </span>
    </>
  );
}
