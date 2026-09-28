import { CheckIcon, MoveHorizontalIcon, MoveVerticalIcon, RotateCcwIcon, XIcon } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { FixedValue, LabeledSlider } from "@/components/tools/StyleControls";
import { Hinted } from "@/components/tools/ToolButton";
import { applyStraighten, cancelStraighten, setStraighten } from "@/lib/straighten";
import { useView } from "@/lib/viewport";
import { displaySize, useDoc } from "@/state/document";
import { useUi } from "@/state/ui";

/** Grid over the image and the level line being drawn (screen space). */
export function StraightenOverlay() {
  const active = useUi((s) => s.tool === "straighten");
  const line = useUi((s) => s.levelLine);
  const view = useView((s) => s);
  const doc = useDoc((s) => s.doc);
  if (!active || !doc) return null;
  const { width, height } = displaySize(doc);
  const x = view.x - (width / 2) * view.scale;
  const y = view.y - (height / 2) * view.scale;
  const w = width * view.scale;
  const h = height * view.scale;
  const N = 8;
  const lines: React.ReactNode[] = [];
  for (let i = 1; i < N; i++) {
    const major = i % (N / 2) === 0 || i % (N / 4) === 0;
    const op = major ? 0.35 : 0.16;
    lines.push(
      <line key={`v${i}`} stroke="#fff" strokeOpacity={op} x1={x + (w * i) / N} x2={x + (w * i) / N} y1={y} y2={y + h} />,
      <line key={`h${i}`} stroke="#fff" strokeOpacity={op} x1={x} x2={x + w} y1={y + (h * i) / N} y2={y + (h * i) / N} />
    );
  }
  return (
    <svg className="pointer-events-none absolute inset-0 z-[5] size-full" data-board-overlay>
      {lines}
      <rect fill="none" height={h} stroke="#fff" strokeOpacity={0.6} width={w} x={x} y={y} />
      {line && (
        <>
          <line stroke="rgba(0,0,0,0.6)" strokeLinecap="round" strokeWidth={4} x1={line.x1} x2={line.x2} y1={line.y1} y2={line.y2} />
          <line stroke="#facc15" strokeDasharray="6 4" strokeLinecap="round" strokeWidth={2} x1={line.x1} x2={line.x2} y1={line.y1} y2={line.y2} />
        </>
      )}
    </svg>
  );
}

function PerspectiveControl({
  label,
  hint,
  icon,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Popover modal={false} positioning={{ placement: "top", gutter: 12 }}>
      <Hinted label={hint}>
        <PopoverTrigger
          aria-label={`${label} ${value}`}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs transition-colors hover:bg-accent data-[state=open]:bg-accent [&_svg]:size-3.5"
        >
          {icon}
          <span className="font-medium text-muted-foreground max-lg:hidden">{label}</span>
          <FixedValue value={value} widest={-888} />
        </PopoverTrigger>
      </Hinted>
      <PopoverContent className="w-64 gap-2 p-4">
        <LabeledSlider label={label} max={100} min={-100} onChange={onChange} step={1} value={value} />
        <p className="text-muted-foreground text-xs">{hint}</p>
      </PopoverContent>
    </Popover>
  );
}

/** Controls above the toolbar while straightening. */
export function StraightenBar() {
  const s = useUi((st) => st.straighten);
  const [busy, setBusy] = useState(false);
  if (!s) return null;
  return (
    <div className="glass flex max-w-[calc(100vw-2rem)] items-center gap-2 overflow-x-auto rounded-xl border p-1.5 shadow-lg/10">
      <div className="flex shrink-0 items-center gap-2 px-1.5">
        <span className="font-medium text-muted-foreground text-xs">Angle</span>
        <div className="w-40">
          <Slider
            aria-label={["Angle"]}
            max={45}
            min={-45}
            onValueChange={(d) => setStraighten({ angle: Math.round(d.value[0] * 10) / 10 })}
            step={0.1}
            value={[s.angle]}
          />
        </div>
        <input
          aria-label="Angle in degrees"
          className="h-7 w-16 rounded-md border bg-transparent px-1.5 text-right font-mono text-xs tabular-nums outline-none focus-visible:border-brand"
          max={45}
          min={-45}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) setStraighten({ angle: Math.min(45, Math.max(-45, v)) });
          }}
          step={0.1}
          type="number"
          value={s.angle}
        />
        <span className="-ml-1 text-muted-foreground text-xs">°</span>
      </div>
      <div className="h-5 w-px shrink-0 bg-border" />
      <PerspectiveControl
        hint="Fix lines that lean in or out, like buildings shot from below"
        icon={<MoveVerticalIcon />}
        label="Vertical"
        onChange={(v) => setStraighten({ vertical: v })}
        value={s.vertical}
      />
      <PerspectiveControl
        hint="Fix a wall or document shot at an angle from the side"
        icon={<MoveHorizontalIcon />}
        label="Horizontal"
        onChange={(v) => setStraighten({ horizontal: v })}
        value={s.horizontal}
      />
      <div className="h-5 w-px shrink-0 bg-border" />
      <span className="shrink-0 px-1 text-muted-foreground text-xs max-lg:hidden">Drag along the horizon to level it</span>
      <Hinted label="Reset">
        <Button
          aria-label="Reset straighten"
          onClick={() => setStraighten({ angle: 0, vertical: 0, horizontal: 0 })}
          size="icon-sm"
          variant="ghost"
        >
          <RotateCcwIcon />
        </Button>
      </Hinted>
      <Button onClick={cancelStraighten} size="sm" variant="ghost">
        <XIcon /> Cancel
      </Button>
      <Button
        isLoading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await applyStraighten();
          } finally {
            setBusy(false);
          }
        }}
        size="sm"
      >
        <CheckIcon /> Apply
      </Button>
    </div>
  );
}
