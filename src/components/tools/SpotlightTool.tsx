import { CircleIcon, SpotlightIcon, SquareIcon } from "lucide-react";
import type React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentGroup, SegmentGroupItem, SegmentGroupItemText } from "@/components/ui/segment-group";
import { FixedValue, LabeledSlider } from "@/components/tools/StyleControls";
import { Hinted, ToolbarDivider, ToolButton } from "@/components/tools/ToolButton";
import type { SpotlightAnnotation } from "@/lib/annotations";
import { updateAnnotations } from "@/state/document";
import { getUi, useUi } from "@/state/ui";

type Shape = SpotlightAnnotation["shape"];

const SHAPES: { id: Shape; label: string; icon: React.ReactNode }[] = [
  { id: "ellipse", label: "Ellipse", icon: <CircleIcon /> },
  { id: "rect", label: "Rectangle", icon: <SquareIcon /> },
];

export function SpotlightToolButton() {
  const tool = useUi((s) => s.tool);
  const setTool = useUi((s) => s.setTool);
  return (
    <ToolButton active={tool === "spotlight"} label="Spotlight" onClick={() => setTool("spotlight")} shortcut="G">
      <SpotlightIcon />
    </ToolButton>
  );
}

/** Apply to new spotlights and to any selected ones. */
function setSpotlight(patch: { shape?: Shape; dim?: number; feather?: number }) {
  const ui = getUi();
  ui.setStyle({
    ...(patch.shape ? { spotlightShape: patch.shape } : {}),
    ...(patch.dim !== undefined ? { spotlightDim: patch.dim } : {}),
    ...(patch.feather !== undefined ? { spotlightFeather: patch.feather } : {}),
  });
  if (ui.selectedIds.length) {
    updateAnnotations(ui.selectedIds, (a) => (a.type === "spotlight" ? { ...a, ...patch } : a), {
      key: `spotlight-${Object.keys(patch).join()}`,
    });
  }
}

function ShapeSwitch({ shape }: { shape: Shape }) {
  return (
    <SegmentGroup
      className="gap-0.5 rounded-lg [&>[data-part=indicator]]:bg-foreground/12"
      onValueChange={(d) => d.value && setSpotlight({ shape: d.value as Shape })}
      value={shape}
    >
      {SHAPES.map((s) => (
        <SegmentGroupItem
          className="flex h-8 items-center rounded-md px-2.5 font-medium text-muted-foreground text-xs data-[state=checked]:text-foreground [&_svg]:size-4"
          key={s.id}
          value={s.id}
        >
          <SegmentGroupItemText className="flex items-center gap-1.5">
            {s.icon}
            {s.label}
          </SegmentGroupItemText>
        </SegmentGroupItem>
      ))}
    </SegmentGroup>
  );
}

function PercentControl({
  label,
  hint,
  value,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <Popover modal={false} positioning={{ placement: "top", gutter: 12 }}>
      <Hinted label={hint}>
        <PopoverTrigger
          aria-label={`${label} ${value}%`}
          className="flex h-8 items-center gap-2 rounded-lg px-2 text-xs transition-colors hover:bg-accent data-[state=open]:bg-accent"
        >
          <span className="font-medium text-muted-foreground">{label}</span>
          <FixedValue unit="%" value={value} widest={888} />
        </PopoverTrigger>
      </Hinted>
      <PopoverContent className="w-60 p-4">
        <LabeledSlider label={label} max={max} min={0} onChange={onChange} step={1} suffix="%" value={value} />
      </PopoverContent>
    </Popover>
  );
}

function SpotlightSettings({ shape, dim, feather }: { shape: Shape; dim: number; feather: number }) {
  return (
    <>
      <ShapeSwitch shape={shape} />
      <ToolbarDivider />
      <PercentControl
        hint="How dark the rest of the image gets"
        label="Dim"
        max={95}
        onChange={(v) => setSpotlight({ dim: v / 100 })}
        value={Math.round(dim * 100)}
      />
      <PercentControl
        hint="Soft edge"
        label="Soften"
        max={50}
        onChange={(v) => setSpotlight({ feather: v / 100 })}
        value={Math.round(feather * 100)}
      />
    </>
  );
}

/** Options while the Spotlight tool is active. */
export function SpotlightOptions() {
  const style = useUi((s) => s.style);
  return (
    <>
      <SpotlightSettings dim={style.spotlightDim} feather={style.spotlightFeather} shape={style.spotlightShape} />
      <ToolbarDivider />
      <span className="px-2 text-muted-foreground text-xs">Drag over what should stand out</span>
    </>
  );
}

/** Properties for selected spotlights. */
export function SpotlightControls({ targets }: { targets: SpotlightAnnotation[] }) {
  const first = targets[0];
  return <SpotlightSettings dim={first.dim} feather={first.feather} shape={first.shape} />;
}
