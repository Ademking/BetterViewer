import { ChartSplineIcon, EyeIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { SegmentGroup, SegmentGroupItem, SegmentGroupItemText } from "@/components/ui/segment-group";
import { ScreenFloatingPanel } from "@/components/panels/FloatingPanel";
import { Hinted } from "@/components/tools/ToolButton";
import {
  buildLut,
  CHANNELS,
  CURVE_PRESETS,
  type CurveChannel,
  type CurvePoint,
  type Curves,
  IDENTITY_CURVES,
  isIdentityCurves,
  isLinear,
} from "@/lib/curves";
import { canvasFilterSupported } from "@/lib/filters";
import {
  type Histogram,
  histogramOf,
  histogramPath,
  histogramPeak,
  histogramStats,
  loadSample,
  renderSample,
  type Sample,
} from "@/lib/histogram";
import { useDevelopParams } from "@/lib/develop";
import { isIdentityLevels } from "@/lib/develop-core";
import { LevelsEditor } from "@/components/panels/LevelsEditor";
import { cn } from "@/lib/utils";
import { updateDoc, useDoc } from "@/state/document";
import { useUi } from "@/state/ui";

/* ------------------------------------------------------------------ data */

function setChannelPoints(channel: CurveChannel, points: CurvePoint[], key = `curves-${channel}`) {
  updateDoc(
    (d) => {
      const next: Curves = { ...(d.curves ?? IDENTITY_CURVES), [channel]: points };
      return { ...d, curves: isIdentityCurves(next) ? null : next };
    },
    { key }
  );
}

/** A small copy of the original image, loaded while the panel is open. */
function useSample() {
  const src = useDoc((s) => s.doc?.image.src);
  const open = useUi((s) => s.panels.curves);
  const [sample, setSample] = useState<{ src: string; sample: Sample } | null>(null);
  useEffect(() => {
    if (!open || !src || sample?.src === src) return;
    let cancelled = false;
    loadSample(src).then((d) => !cancelled && setSample({ src, sample: d }));
    return () => {
      cancelled = true;
    };
  }, [open, src, sample?.src]);
  return sample && sample.src === src ? sample.sample : null;
}

/** Recompute at most once per frame while sliders / points move. */
function useFrameValue<T>(value: T) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = requestAnimationFrame(() => setV(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return v;
}

/* ------------------------------------------------------------------ histogram */

function HistogramView({ hist }: { hist: Histogram | null }) {
  const [mode, setMode] = useState<"rgb" | "luma">("rgb");
  const H = 90;
  const stats = hist ? histogramStats(hist) : null;
  const peak = hist ? histogramPeak(mode === "rgb" ? [hist.r, hist.g, hist.b] : [hist.l]) : 1;
  const pct = (v: number) => (v >= 0.001 ? `${(v * 100).toFixed(1)}%` : "0%");

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">Histogram</span>
        <SegmentGroup
          className="gap-0.5 rounded-md bg-muted/60 p-0.5 [&>[data-part=indicator]]:bg-foreground/12"
          onValueChange={(d) => d.value && setMode(d.value as "rgb" | "luma")}
          value={mode}
        >
          {[
            { v: "rgb", l: "RGB" },
            { v: "luma", l: "Luminance" },
          ].map((o) => (
            <SegmentGroupItem
              className="rounded px-1.5 py-0.5 font-medium text-[10.5px] text-muted-foreground data-[state=checked]:text-foreground"
              key={o.v}
              value={o.v}
            >
              <SegmentGroupItemText>{o.l}</SegmentGroupItemText>
            </SegmentGroupItem>
          ))}
        </SegmentGroup>
      </div>
      <div className="relative overflow-hidden rounded-lg border bg-black/40">
        <svg className="block h-[90px] w-full" preserveAspectRatio="none" viewBox={`0 0 256 ${H}`}>
          {hist &&
            (mode === "rgb" ? (
              <g style={{ mixBlendMode: "screen" }}>
                <path d={histogramPath(hist.r, H, peak)} fill="#ff4d4d" fillOpacity={0.75} />
                <path d={histogramPath(hist.g, H, peak)} fill="#3ddc6f" fillOpacity={0.75} />
                <path d={histogramPath(hist.b, H, peak)} fill="#4f8dff" fillOpacity={0.75} />
              </g>
            ) : (
              <path d={histogramPath(hist.l, H, peak)} fill="#d4d4d4" fillOpacity={0.85} />
            ))}
        </svg>
        {!hist && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
            Reading image…
          </div>
        )}
      </div>
      {stats && (
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          {[
            ["Shadows", pct(stats.shadowsClipped), stats.shadowsClipped > 0.01],
            ["Mean", Math.round(stats.mean).toString(), false],
            ["Highlights", pct(stats.highlightsClipped), stats.highlightsClipped > 0.01],
          ].map(([label, value, warn]) => (
            <div
              className="flex flex-col rounded-md bg-muted/50 px-2 py-1"
              key={String(label)}
              title={label === "Mean" ? "Average brightness (0–255)" : `Pixels clipped to pure ${label === "Shadows" ? "black" : "white"}`}
            >
              <span className="text-muted-foreground">{label}</span>
              <span className={cn("font-medium tabular-nums", warn && "text-warning-foreground")}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ curve editor */

const REMOVE_MARGIN = 28;

function CurveEditor({
  channel,
  points,
  inputHist,
}: {
  channel: CurveChannel;
  points: CurvePoint[];
  inputHist: Uint32Array | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [outside, setOutside] = useState(false);
  const gesture = useRef(0);
  const color = CHANNELS.find((c) => c.id === channel)!.color;

  const lut = useMemo(() => buildLut(points), [points]);
  const curvePath = useMemo(() => {
    let d = "";
    for (let x = 0; x < 256; x++) d += `${x === 0 ? "M" : "L"}${x} ${255 - lut[x]}`;
    return d;
  }, [lut]);

  const toValue = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 255;
    const y = 255 - ((e.clientY - r.top) / r.height) * 255;
    return { x, y, outside: x < -REMOVE_MARGIN || x > 255 + REMOVE_MARGIN || y < -REMOVE_MARGIN || y > 255 + REMOVE_MARGIN };
  };

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  const startDrag = (index: number, list: CurvePoint[], e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    gesture.current += 1;
    const key = `curves-${channel}-${gesture.current}`;
    setActive(index);
    let current = list;
    let idx = index;
    const endpoint = () => idx === 0 || idx === current.length - 1;

    const move = (ev: PointerEvent) => {
      const v = toValue(ev);
      const out = v.outside && !endpoint() && current.length > 2;
      setOutside(out);
      const lo = idx === 0 ? 0 : current[idx - 1][0] + 1;
      const hi = idx === current.length - 1 ? 255 : current[idx + 1][0] - 1;
      const next = [...current];
      next[idx] = [Math.round(clamp(v.x, lo, hi)), Math.round(clamp(v.y, 0, 255))];
      current = next;
      setChannelPoints(channel, next, key);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setOutside(false);
      // Dragging a middle point off the grid removes it.
      if (toValue(ev).outside && !endpoint() && current.length > 2) {
        setChannelPoints(channel, current.filter((_, i) => i !== idx), key);
        setActive(null);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onBackgroundDown = (e: React.PointerEvent) => {
    const v = toValue(e);
    const x = Math.round(clamp(v.x, 1, 254));
    if (points.some((p) => Math.abs(p[0] - x) < 4)) return;
    const y = Math.round(clamp(v.y, 0, 255));
    const next = [...points, [x, y] as CurvePoint].sort((a, b) => a[0] - b[0]);
    setChannelPoints(channel, next);
    startDrag(next.findIndex((p) => p[0] === x), next, e);
  };

  const removePoint = (i: number) => {
    if (i === 0 || i === points.length - 1) return;
    setChannelPoints(channel, points.filter((_, j) => j !== i));
    setActive(null);
  };

  // Keyboard nudging for the active point.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (active === null || !points[active]) return;
    const step = e.shiftKey ? 10 : 1;
    const [x, y] = points[active];
    const lo = active === 0 ? 0 : points[active - 1][0] + 1;
    const hi = active === points.length - 1 ? 255 : points[active + 1][0] - 1;
    let next: CurvePoint | null = null;
    if (e.key === "ArrowUp") next = [x, clamp(y + step, 0, 255)];
    if (e.key === "ArrowDown") next = [x, clamp(y - step, 0, 255)];
    if (e.key === "ArrowLeft") next = [clamp(x - step, lo, hi), y];
    if (e.key === "ArrowRight") next = [clamp(x + step, lo, hi), y];
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      removePoint(active);
      return;
    }
    if (!next) return;
    e.preventDefault();
    e.stopPropagation();
    const list = [...points];
    list[active] = next;
    setChannelPoints(channel, list, `curves-${channel}-keys`);
  };

  const shown = active ?? hover;
  const readout = shown !== null && points[shown] ? points[shown] : null;
  const histPeak = inputHist ? histogramPeak([inputHist]) : 1;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "relative aspect-square w-full touch-none rounded-lg border bg-black/40 outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
          outside && "border-destructive/60"
        )}
        onKeyDown={onKeyDown}
        tabIndex={0}
      >
        <svg
          className="block size-full cursor-crosshair overflow-visible"
          onPointerDown={onBackgroundDown}
          preserveAspectRatio="none"
          ref={svgRef}
          viewBox="0 0 255 255"
        >
          {/* Input histogram of this channel */}
          {inputHist && <path d={histogramPath(inputHist, 255, histPeak)} fill={color} fillOpacity={0.12} />}
          {/* Quarter grid + neutral diagonal */}
          {[64, 128, 192].map((v) => (
            <g key={v} stroke="currentColor" strokeOpacity={0.12} vectorEffect="non-scaling-stroke">
              <line vectorEffect="non-scaling-stroke" x1={v} x2={v} y1={0} y2={255} />
              <line vectorEffect="non-scaling-stroke" x1={0} x2={255} y1={v} y2={v} />
            </g>
          ))}
          <line
            stroke="currentColor"
            strokeDasharray="3 3"
            strokeOpacity={0.25}
            vectorEffect="non-scaling-stroke"
            x1={0}
            x2={255}
            y1={255}
            y2={0}
          />
          <path d={curvePath} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
        {/* Points as HTML so they stay round at any panel size */}
        {points.map(([x, y], i) => (
          <span
            aria-label={`Point ${x}, ${y}`}
            className={cn(
              "absolute size-3 -translate-x-1/2 translate-y-1/2 cursor-grab rounded-full border-2 bg-neutral-900 transition-transform active:cursor-grabbing",
              (active === i || hover === i) && "scale-125",
              active === i && outside && "opacity-40"
            )}
            key={i}
            onDoubleClick={() => removePoint(i)}
            onPointerDown={(e) => {
              e.stopPropagation();
              startDrag(i, points, e);
            }}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            role="slider"
            style={{
              left: `${(x / 255) * 100}%`,
              bottom: `${(y / 255) * 100}%`,
              borderColor: color,
              background: active === i ? color : undefined,
            }}
            aria-valuemax={255}
            aria-valuemin={0}
            aria-valuenow={y}
            aria-valuetext={`Input ${x}, output ${y}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between px-0.5 text-[11px] text-muted-foreground tabular-nums">
        <span>
          {readout ? (
            <>
              Input <span className="font-medium text-foreground">{readout[0]}</span> → Output{" "}
              <span className="font-medium text-foreground">{readout[1]}</span>
            </>
          ) : (
            "Click to add · double-click or drag off to remove"
          )}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ panel */

export function CurvesPanel() {
  const open = useUi((s) => s.panels.curves);
  const togglePanel = useUi((s) => s.togglePanel);
  const compare = useUi((s) => s.compareOriginal);
  const setUi = useUi((s) => s.set);
  const curves = useDoc((s) => s.doc?.curves ?? null);
  const [channel, setChannel] = useState<CurveChannel>("rgb");
  const [mode, setMode] = useState<"curves" | "levels">("curves");
  const levels = useDoc((s) => s.doc?.levels ?? null);
  const filters = useDoc((s) => s.doc?.filters ?? null);
  const sample = useSample();
  const develop = useDevelopParams();
  const look = useFrameValue(useMemo(() => ({ filters, develop }), [filters, develop]));

  // Curves act on the original pixels; the histogram shows the final result.
  const inputHist = useMemo(() => (sample ? histogramOf(sample.data.data) : null), [sample]);
  const outputHist = useMemo(
    () => (sample ? histogramOf(renderSample(sample, look.filters, look.develop)) : null),
    [sample, look]
  );
  const points = (curves ?? IDENTITY_CURVES)[channel];
  const channelHist = inputHist ? (channel === "rgb" ? inputHist.l : inputHist[channel]) : null;
  const pristine = isIdentityCurves(curves) && isIdentityLevels(levels);

  return (
    <ScreenFloatingPanel
      bodyClassName="gap-4"
      footer={
        <>
          <Hinted label="Hold to compare with the original">
            <Button
              className={cn(compare && "bg-accent")}
              disabled={pristine}
              onPointerDown={() => setUi({ compareOriginal: true })}
              onPointerLeave={() => setUi({ compareOriginal: false })}
              onPointerUp={() => setUi({ compareOriginal: false })}
              size="sm"
              variant="outline"
            >
              <EyeIcon /> Compare
            </Button>
          </Hinted>
          <Button
            disabled={pristine}
            onClick={() => updateDoc((d) => ({ ...d, curves: null, levels: null }))}
            size="sm"
            variant="ghost"
          >
            <RotateCcwIcon /> Reset all
          </Button>
        </>
      }
      icon={<ChartSplineIcon />}
      initialPosition={(vp, size) => ({ x: vp.width - size.width - 16, y: Math.max(16, (vp.height - size.height) / 2) })}
      initialSize={{ width: 320, height: 740 }}
      minSize={{ width: 280, height: 320 }}
      onOpenChange={(o) => togglePanel("curves", o)}
      open={open}
      title="Histogram"
    >
      {!canvasFilterSupported && (
        <p className="rounded-lg bg-warning/10 p-2 text-warning-foreground text-xs">
          This browser can't apply canvas filters; some adjustments won't be visible.
        </p>
      )}

      <HistogramView hist={outputHist} />

      <SegmentGroup
        className="grid grid-cols-2 gap-0.5 rounded-lg bg-muted/60 p-0.5 [&>[data-part=indicator]]:bg-foreground/12 [&>[data-part=indicator]]:shadow-sm"
        onValueChange={(d) => d.value && setMode(d.value as "curves" | "levels")}
        value={mode}
      >
        {[
          { v: "curves", l: "Curves", edited: !isIdentityCurves(curves) },
          { v: "levels", l: "Levels", edited: !isIdentityLevels(levels) },
        ].map((o) => (
          <SegmentGroupItem
            className="flex h-7 items-center justify-center rounded-md font-medium text-muted-foreground text-xs data-[state=checked]:text-foreground"
            key={o.v}
            value={o.v}
          >
            <SegmentGroupItemText className="flex items-center gap-1.5">
              {o.l}
              {o.edited && <span className="size-1 rounded-full bg-brand" />}
            </SegmentGroupItemText>
          </SegmentGroupItem>
        ))}
      </SegmentGroup>

      {mode === "levels" ? (
        <LevelsEditor hist={inputHist?.l ?? null} />
      ) : (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">Channel</span>
            <div className="flex items-center gap-1">
              <Menu positioning={{ placement: "bottom-end", gutter: 6 }}>
                <MenuTrigger asChild>
                  <Button className="h-6 px-2 text-xs" size="xs" variant="ghost">
                    Presets
                  </Button>
                </MenuTrigger>
                <MenuContent className="w-44">
                  {CURVE_PRESETS.map((p) => (
                    <MenuItem
                      key={p.name}
                      onSelect={() => {
                        setChannel("rgb");
                        setChannelPoints("rgb", p.rgb, "curves-preset");
                      }}
                      value={p.name}
                    >
                      {p.name}
                    </MenuItem>
                  ))}
                </MenuContent>
              </Menu>
              <Hinted label={`Reset ${CHANNELS.find((c) => c.id === channel)!.label}`}>
                <Button
                  aria-label="Reset channel"
                  className="size-6"
                  disabled={isLinear(points) && points.length === 2}
                  onClick={() => setChannelPoints(channel, IDENTITY_CURVES[channel], "curves-reset")}
                  size="icon-xs"
                  variant="ghost"
                >
                  <RotateCcwIcon />
                </Button>
              </Hinted>
            </div>
          </div>

          <SegmentGroup
            className="grid grid-cols-4 gap-0.5 rounded-lg bg-muted/60 p-0.5 [&>[data-part=indicator]]:bg-foreground/12 [&>[data-part=indicator]]:shadow-sm"
            onValueChange={(d) => d.value && setChannel(d.value as CurveChannel)}
            value={channel}
          >
            {CHANNELS.map((c) => {
              const edited = curves ? !isLinear(curves[c.id]) : false;
              return (
                <SegmentGroupItem
                  className="flex h-7 items-center justify-center gap-1.5 rounded-md font-medium text-muted-foreground text-xs data-[state=checked]:text-foreground"
                  key={c.id}
                  value={c.id}
                >
                  <SegmentGroupItemText className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: c.color }} />
                    {c.label}
                    {edited && <span className="size-1 rounded-full bg-brand" />}
                  </SegmentGroupItemText>
                </SegmentGroupItem>
              );
            })}
          </SegmentGroup>

          <CurveEditor channel={channel} inputHist={channelHist} points={points} />
        </section>
      )}
    </ScreenFloatingPanel>
  );
}
