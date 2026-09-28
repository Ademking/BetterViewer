import { RotateCcwIcon, WandSparklesIcon } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Hinted } from "@/components/tools/ToolButton";
import { applyAutoLevels } from "@/lib/autoEnhance";
import { DEFAULT_LEVELS, isIdentityLevels, type Levels } from "@/lib/develop-core";
import { histogramPath, histogramPeak } from "@/lib/histogram";
import { cn } from "@/lib/utils";
import { updateDoc, useDoc } from "@/state/document";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Midtone handle position (0..1 between black and white) ↔ gamma. */
const gammaToPos = (g: number) => 0.5 ** g;
const posToGamma = (p: number) => clamp(Math.log(clamp(p, 0.01, 0.99)) / Math.log(0.5), 0.1, 9.99);

let gestures = 0;

function setLevels(patch: Partial<Levels>, key: string) {
  updateDoc(
    (d) => {
      const next = { ...(d.levels ?? DEFAULT_LEVELS), ...patch };
      return { ...d, levels: isIdentityLevels(next) ? null : next };
    },
    { key }
  );
}

/** Triangle handle under a track. */
function Handle({
  pos,
  fill,
  label,
  onDrag,
}: {
  pos: number;
  fill: string;
  label: string;
  onDrag: (value01: number, key: string) => void;
}) {
  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    const track = (e.currentTarget as HTMLElement).parentElement!;
    const key = `levels-${++gestures}`;
    const move = (ev: PointerEvent) => {
      const r = track.getBoundingClientRect();
      onDrag(clamp((ev.clientX - r.left) / r.width, 0, 1), key);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <button
      aria-label={label}
      className="absolute top-0 -translate-x-1/2 cursor-ew-resize touch-none p-0.5 outline-none focus-visible:[&>svg]:stroke-brand"
      onPointerDown={start}
      style={{ left: `${pos * 100}%` }}
      title={label}
      type="button"
    >
      <svg aria-hidden className="block size-3.5" viewBox="0 0 14 12">
        <path d="M7 1 L13 11 H1 Z" fill={fill} stroke="currentColor" strokeLinejoin="round" strokeOpacity={0.6} />
      </svg>
    </button>
  );
}

function NumberBox({
  value,
  label,
  onChange,
  step = 1,
  min,
  max,
  digits = 0,
}: {
  value: number;
  label: string;
  onChange: (v: number) => void;
  step?: number;
  min: number;
  max: number;
  digits?: number;
}) {
  return (
    <input
      aria-label={label}
      className="h-7 w-14 rounded-md border bg-transparent px-1.5 text-center font-mono text-xs tabular-nums outline-none focus-visible:border-brand"
      max={max}
      min={min}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (Number.isFinite(v)) onChange(clamp(v, min, max));
      }}
      step={step}
      title={label}
      type="number"
      value={digits ? value.toFixed(digits) : Math.round(value)}
    />
  );
}

/** Levels: input black / midtones / white over the histogram, and output range. */
export function LevelsEditor({ hist }: { hist: Uint32Array | null }) {
  const levels = useDoc((s) => s.doc?.levels) ?? DEFAULT_LEVELS;
  const { inBlack, inWhite, gamma, outBlack, outWhite } = levels;
  const midPos = (inBlack + gammaToPos(gamma) * (inWhite - inBlack)) / 255;
  const numKey = useRef(`levels-num-${Date.now()}`).current;
  const H = 110;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col">
        <div className="relative overflow-hidden rounded-lg border bg-black/40">
          <svg className="block w-full" preserveAspectRatio="none" style={{ height: H }} viewBox={`0 0 256 ${H}`}>
            {hist && <path d={histogramPath(hist, H, histogramPeak([hist]))} fill="#d4d4d4" fillOpacity={0.8} />}
            {/* Clipped ranges */}
            <rect fill="#000" fillOpacity={0.45} height={H} width={inBlack} x={0} y={0} />
            <rect fill="#000" fillOpacity={0.45} height={H} width={255 - inWhite} x={inWhite + 1} y={0} />
          </svg>
        </div>
        <div className="relative mx-0 h-4">
          <Handle
            fill="#000"
            label="Input black point"
            onDrag={(v, key) => setLevels({ inBlack: Math.min(Math.round(v * 255), inWhite - 2) }, key)}
            pos={inBlack / 255}
          />
          <Handle
            fill="#808080"
            label="Midtones"
            onDrag={(v, key) => {
              const p = (v * 255 - inBlack) / Math.max(1, inWhite - inBlack);
              setLevels({ gamma: Math.round(posToGamma(p) * 100) / 100 }, key);
            }}
            pos={midPos}
          />
          <Handle
            fill="#fff"
            label="Input white point"
            onDrag={(v, key) => setLevels({ inWhite: Math.max(Math.round(v * 255), inBlack + 2) }, key)}
            pos={inWhite / 255}
          />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <NumberBox label="Input black" max={inWhite - 2} min={0} onChange={(v) => setLevels({ inBlack: v }, numKey)} value={inBlack} />
          <NumberBox
            digits={2}
            label="Midtones (gamma)"
            max={9.99}
            min={0.1}
            onChange={(v) => setLevels({ gamma: v }, numKey)}
            step={0.01}
            value={gamma}
          />
          <NumberBox label="Input white" max={255} min={inBlack + 2} onChange={(v) => setLevels({ inWhite: v }, numKey)} value={inWhite} />
        </div>
      </div>

      <div className="flex flex-col">
        <span className="mb-1.5 font-medium text-[11px] text-muted-foreground">Output</span>
        <div className="h-3 rounded-sm border bg-linear-to-r from-black to-white" />
        <div className="relative h-4">
          <Handle
            fill="#000"
            label="Output black"
            onDrag={(v, key) => setLevels({ outBlack: Math.round(v * 255) }, key)}
            pos={outBlack / 255}
          />
          <Handle
            fill="#fff"
            label="Output white"
            onDrag={(v, key) => setLevels({ outWhite: Math.round(v * 255) }, key)}
            pos={outWhite / 255}
          />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <NumberBox label="Output black" max={255} min={0} onChange={(v) => setLevels({ outBlack: v }, numKey)} value={outBlack} />
          <NumberBox label="Output white" max={255} min={0} onChange={(v) => setLevels({ outWhite: v }, numKey)} value={outWhite} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button onClick={() => void applyAutoLevels()} size="sm" variant="outline">
          <WandSparklesIcon /> Auto
        </Button>
        <Hinted label="Reset levels">
          <Button
            aria-label="Reset levels"
            className={cn(isIdentityLevels(levels) && "invisible")}
            onClick={() => updateDoc((d) => ({ ...d, levels: null }))}
            size="icon-sm"
            variant="ghost"
          >
            <RotateCcwIcon />
          </Button>
        </Hinted>
      </div>
    </div>
  );
}
