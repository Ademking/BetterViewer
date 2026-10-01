import { XIcon } from "lucide-react";
import { memo, useLayoutEffect, useRef, useState } from "react";
import { uid } from "@/lib/annotations";
import { useView } from "@/lib/viewport";
import { cn } from "@/lib/utils";
import { displaySize, useDoc } from "@/state/document";
import { useDraft } from "@/state/draft";
import { clearGuides, type Guide, useMeasure } from "@/state/measure";
import { useSettings } from "@/state/settings";
import { useT } from "@/lib/i18n";

export const RULER = 20;
const GUIDE = "#22d3ee";

/** Tick spacing so labels are at least ~64px apart. */
function stepFor(scale: number) {
  for (const s of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 50000]) {
    if (s * scale >= 64) return s;
  }
  return 100000;
}

/** Screen position of displayed-image px 0 on each axis, and px → screen scale. */
function useDisplayOrigin() {
  const view = useView((s) => s);
  const doc = useDoc((s) => s.doc);
  if (!doc) return null;
  const { width, height } = displaySize(doc);
  return {
    ox: view.x - (width / 2) * view.scale,
    oy: view.y - (height / 2) * view.scale,
    scale: view.scale,
    width,
    height,
    boardW: view.width,
    boardH: view.height,
  };
}

function RulerCanvas({ axis, origin, pointer }: { axis: "h" | "v"; origin: NonNullable<ReturnType<typeof useDisplayOrigin>>; pointer: number | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const length = axis === "h" ? origin.boardW - RULER : origin.boardH - RULER;

  useLayoutEffect(() => {
    const c = ref.current;
    if (!c || length <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const w = axis === "h" ? length : RULER;
    const h = axis === "h" ? RULER : length;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const color = getComputedStyle(c).color;
    const o = (axis === "h" ? origin.ox : origin.oy) - RULER;
    const { scale } = origin;
    const step = stepFor(scale);
    const minor = step / (step * scale >= 120 ? 10 : 5);
    const first = Math.floor(-o / scale / minor) * minor;
    const last = (length - o) / scale;
    const extent = axis === "h" ? origin.width : origin.height;

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.font = "10px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "top";
    // The image's own extent, lightly highlighted.
    ctx.globalAlpha = 0.07;
    if (axis === "h") ctx.fillRect(o, 0, extent * scale, RULER);
    else ctx.fillRect(0, o, RULER, extent * scale);
    ctx.globalAlpha = 1;

    ctx.beginPath();
    for (let v = first; v <= last; v += minor) {
      const p = Math.round(o + v * scale) + 0.5;
      const major = Math.abs(v / step - Math.round(v / step)) < 1e-6;
      const len = major ? RULER - 4 : 5;
      if (axis === "h") {
        ctx.moveTo(p, RULER);
        ctx.lineTo(p, RULER - len);
      } else {
        ctx.moveTo(RULER, p);
        ctx.lineTo(RULER - len, p);
      }
      if (major) {
        const label = String(Math.round(v));
        ctx.globalAlpha = 0.85;
        if (axis === "h") ctx.fillText(label, p + 3, 2);
        else {
          ctx.save();
          ctx.translate(2, p + 3);
          ctx.rotate(Math.PI / 2);
          ctx.fillText(label, 0, -9);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
    }
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (pointer !== null) {
      const p = Math.round(pointer - RULER) + 0.5;
      ctx.strokeStyle = GUIDE;
      ctx.beginPath();
      if (axis === "h") {
        ctx.moveTo(p, 0);
        ctx.lineTo(p, RULER);
      } else {
        ctx.moveTo(0, p);
        ctx.lineTo(RULER, p);
      }
      ctx.stroke();
    }
  });

  return (
    <canvas
      className="block text-muted-foreground"
      ref={ref}
      style={axis === "h" ? { width: length, height: RULER } : { width: RULER, height: length }}
    />
  );
}

/** Drag a guide (new or existing); drop it on its ruler to remove it. */
function dragGuide(
  guide: Guide,
  board: HTMLElement,
  origin: { ox: number; oy: number; scale: number },
  isNew: boolean,
  e: React.PointerEvent
) {
  const r = board.getBoundingClientRect();
  const toPos = (ev: PointerEvent) => {
    const screen = guide.axis === "h" ? ev.clientY - r.top : ev.clientX - r.left;
    return Math.round((screen - (guide.axis === "h" ? origin.oy : origin.ox)) / origin.scale);
  };
  const overRuler = (ev: PointerEvent) =>
    guide.axis === "h" ? ev.clientY - r.top < RULER : ev.clientX - r.left < RULER;
  if (isNew) useMeasure.setState((s) => ({ guides: [...s.guides, { ...guide, pos: toPos(e.nativeEvent) }] }));
  useMeasure.setState({ dragging: guide.id });
  const move = (ev: PointerEvent) => {
    const pos = toPos(ev);
    useMeasure.setState((s) => ({ guides: s.guides.map((g) => (g.id === guide.id ? { ...g, pos } : g)) }));
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    useMeasure.setState({ dragging: null });
    if (overRuler(ev)) useMeasure.setState((s) => ({ guides: s.guides.filter((g) => g.id !== guide.id) }));
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

/** Top and left rulers (displayed-image px) and the guides dragged out of them. */
export const Rulers = memo(function Rulers() {
  const t = useT();
  const show = useSettings((s) => s.showRulers);
  const origin = useDisplayOrigin();
  const guides = useMeasure((s) => s.guides);
  const dragging = useMeasure((s) => s.dragging);
  const pointer = useDraft((s) => (s.hovering ? s.pointer : null));
  const boardRef = useRef<HTMLDivElement>(null);
  const [hoverGuide, setHoverGuide] = useState<string | null>(null);
  if (!show || !origin) return null;

  const start = (axis: "h" | "v") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const board = boardRef.current?.parentElement;
    if (!board) return;
    dragGuide({ id: uid(), axis, pos: 0 }, board, origin, true, e);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-[6]" ref={boardRef}>
      {guides.map((g) => {
        const p = g.axis === "h" ? origin.oy + g.pos * origin.scale : origin.ox + g.pos * origin.scale;
        const active = dragging === g.id || hoverGuide === g.id;
        return (
          <div
            className={cn(
              "pointer-events-auto absolute",
              g.axis === "h" ? "inset-x-0 h-[7px] -translate-y-[3px] cursor-row-resize" : "inset-y-0 w-[7px] -translate-x-[3px] cursor-col-resize"
            )}
            data-board-overlay
            key={g.id}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const board = boardRef.current?.parentElement;
              if (board) dragGuide(g, board, origin, false, e);
            }}
            onPointerEnter={() => setHoverGuide(g.id)}
            onPointerLeave={() => setHoverGuide(null)}
            style={g.axis === "h" ? { top: p } : { left: p }}
            title={t("Drag to move · drop on the ruler to remove")}
          >
            <div
              className={cn("absolute", g.axis === "h" ? "inset-x-0 top-[3px] h-px" : "inset-y-0 left-[3px] w-px")}
              style={{ background: GUIDE, opacity: active ? 1 : 0.75 }}
            />
            {active && (
              <span
                className="absolute rounded bg-neutral-950/85 px-1.5 py-0.5 font-mono text-[10px] text-white tabular-nums"
                style={g.axis === "h" ? { left: RULER + 6, top: -18 } : { top: RULER + 6, left: 8 }}
              >
                {g.axis === "h" ? "y" : "x"} {g.pos}
              </span>
            )}
          </div>
        );
      })}

      {/* Rulers */}
      <div
        className="pointer-events-auto absolute top-0 left-[20px] cursor-row-resize border-b bg-background/85 backdrop-blur-sm"
        data-board-overlay
        onPointerDown={start("h")}
        title={t("Drag down to add a guide")}
      >
        <RulerCanvas axis="h" origin={origin} pointer={pointer ? pointer.x : null} />
      </div>
      <div
        className="pointer-events-auto absolute top-[20px] left-0 cursor-col-resize border-r bg-background/85 backdrop-blur-sm"
        data-board-overlay
        onPointerDown={start("v")}
        title={t("Drag right to add a guide")}
      >
        <RulerCanvas axis="v" origin={origin} pointer={pointer ? pointer.y : null} />
      </div>
      <div className="pointer-events-auto absolute top-0 left-0 flex size-[20px] items-center justify-center border-r border-b bg-background/85 backdrop-blur-sm" data-board-overlay>
        {guides.length > 0 && (
          <button
            aria-label={t("Remove all guides")}
            className="flex size-4 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={clearGuides}
            title={t("Remove all guides")}
            type="button"
          >
            <XIcon className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
});
