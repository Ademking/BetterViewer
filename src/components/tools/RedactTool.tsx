import { DropletIcon } from "lucide-react";
import type React from "react";
import { useId } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentGroup, SegmentGroupItem, SegmentGroupItemText } from "@/components/ui/segment-group";
import { FixedValue, LabeledSlider } from "@/components/tools/StyleControls";
import { Hinted, ToolbarDivider, ToolButton } from "@/components/tools/ToolButton";
import type { RedactAnnotation, RedactMode } from "@/lib/annotations";
import { updateAnnotations } from "@/state/document";
import { getUi, useUi } from "@/state/ui";

/** 3×3 mosaic shading from solid to faint, like a pixelated image. */
const MOSAIC = [
  [1, 0.55, 0.25],
  [0.55, 1, 0.55],
  [0.25, 0.55, 1],
];

/** Pixelation mark sized and aligned like Lucide icons. */
export function PixelateIcon({ className, ...rest }: React.SVGProps<SVGSVGElement>) {
  const clipId = useId();
  return (
    <svg
      aria-hidden
      className={className ? `lucide ${className}` : "lucide"}
      fill="currentColor"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <defs>
        <clipPath id={clipId}>
          <rect height="18" rx="3" width="18" x="3" y="3" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {MOSAIC.flatMap((row, y) =>
          row.map((opacity, x) => (
            <rect height="6" key={`${x}-${y}`} opacity={opacity} width="6" x={3 + x * 6} y={3 + y * 6} />
          ))
        )}
      </g>
    </svg>
  );
}

const MODES: { id: RedactMode; label: string; icon: React.ReactNode }[] = [
  { id: "pixelate", label: "Pixelate", icon: <PixelateIcon /> },
  { id: "blur", label: "Blur", icon: <DropletIcon /> },
];

export function RedactToolButton() {
  const tool = useUi((s) => s.tool);
  const setTool = useUi((s) => s.setTool);
  return (
    <ToolButton active={tool === "redact"} label="Blur / pixelate" onClick={() => setTool("redact")} shortcut="M">
      <PixelateIcon />
    </ToolButton>
  );
}

/* ------------------------------------------------------------------ setters */

/** Apply to new zones and to any selected zones. */
function setRedact(patch: { mode?: RedactMode; strength?: number }) {
  const ui = getUi();
  ui.setStyle({
    ...(patch.mode ? { redactMode: patch.mode } : {}),
    ...(patch.strength !== undefined ? { redactStrength: patch.strength } : {}),
  });
  if (ui.selectedIds.length) {
    updateAnnotations(ui.selectedIds, (a) => (a.type === "redact" ? { ...a, ...patch } : a), {
      key: `redact-${Object.keys(patch).join()}`,
    });
  }
}

/* ------------------------------------------------------------------ controls */

function ModeSwitch({ mode }: { mode: RedactMode }) {
  return (
    <SegmentGroup
      className="gap-0.5 rounded-lg [&>[data-part=indicator]]:bg-foreground/12"
      onValueChange={(d) => d.value && setRedact({ mode: d.value as RedactMode })}
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
  );
}

function StrengthControl({ strength, mode }: { strength: number; mode: RedactMode }) {
  const docUnit = useUi((s) => s.docUnit);
  const display = Math.max(2, Math.round(strength / docUnit));
  const label = mode === "pixelate" ? "Block size" : "Blur amount";
  return (
    <Popover modal={false} positioning={{ placement: "top", gutter: 12 }}>
      <Hinted label={label}>
        <PopoverTrigger
          aria-label={`${label} ${display} px`}
          className="flex h-8 items-center gap-2 rounded-lg px-2 text-xs transition-colors hover:bg-accent data-[state=open]:bg-accent"
        >
          <span className="font-medium text-muted-foreground">Strength</span>
          <FixedValue unit="px" value={display} widest={88} />
        </PopoverTrigger>
      </Hinted>
      <PopoverContent className="w-60 p-4">
        <LabeledSlider
          label={label}
          max={60}
          min={2}
          onChange={(v) => setRedact({ strength: v * docUnit })}
          step={1}
          suffix="px"
          value={display}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Options while the Blur tool is active. */
export function RedactOptions() {
  const mode = useUi((s) => s.style.redactMode);
  const strength = useUi((s) => s.style.redactStrength);
  return (
    <>
      <ModeSwitch mode={mode} />
      <ToolbarDivider />
      <StrengthControl mode={mode} strength={strength} />
      <ToolbarDivider />
      <span className="px-2 text-muted-foreground text-xs">Drag over the area to hide</span>
    </>
  );
}

/** Properties for selected zones. */
export function RedactControls({ targets }: { targets: RedactAnnotation[] }) {
  const first = targets[0];
  return (
    <>
      <ModeSwitch mode={first.mode} />
      <ToolbarDivider />
      <StrengthControl mode={first.mode} strength={first.strength} />
    </>
  );
}
