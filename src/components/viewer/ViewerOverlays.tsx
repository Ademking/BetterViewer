import { memo, useEffect, useRef, useState } from "react";
import { sampleImageColor, visibleLayerCanvases } from "@/lib/colors";
import { useView, viewport } from "@/lib/viewport";
import { cn } from "@/lib/utils";
import { displaySize, useDoc } from "@/state/document";
import { useDraft } from "@/state/draft";
import { useSettings } from "@/state/settings";
import { useUi } from "@/state/ui";

/** Brief zoom percentage pill while zooming. */
export const ZoomHud = memo(function ZoomHud() {
  const scale = useView((s) => s.scale);
  const zooming = useView((s) => s.zooming);
  const [visible, setVisible] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!zooming) {
      const t = setTimeout(() => setVisible(false), 650);
      return () => clearTimeout(t);
    }
    setVisible(true);
  }, [zooming]);

  return (
    <div
      className={cn(
        "glass pointer-events-none absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full border px-3 py-1",
        "font-medium text-xs tabular-nums shadow-lg/10 transition-all duration-200",
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      )}
    >
      {Math.round(scale * 100)}%
    </div>
  );
});

/** Rubber-band selection rectangle. */
export const Marquee = memo(function Marquee() {
  const m = useDraft((s) => s.marquee);
  if (!m) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-sm border border-brand bg-brand/10"
      style={{ left: m.x, top: m.y, width: m.width, height: m.height }}
    />
  );
});

/** Magnifier that follows the cursor while the eyedropper is active. */
export const EyedropperLoupe = memo(function EyedropperLoupe() {
  const active = useUi((s) => s.tool === "eyedropper");
  const pointer = useDraft((s) => s.pointer);
  const hovering = useDraft((s) => s.hovering);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hex, setHex] = useState<string | null>(null);
  const SIZE = 128;
  const CELLS = 13;

  useEffect(() => {
    if (!active || !pointer) return;
    const raf = requestAnimationFrame(() => {
      const out = canvasRef.current?.getContext("2d");
      const layers = visibleLayerCanvases();
      if (!out || !layers.length) return;
      const half = Math.floor(CELLS / 2);
      out.imageSmoothingEnabled = false;
      out.clearRect(0, 0, SIZE, SIZE);
      out.fillStyle = "#1a1a1a";
      out.fillRect(0, 0, SIZE, SIZE);
      // Magnify what's on screen: the image plus everything drawn on it.
      for (const { canvas, ratio } of layers) {
        const cx = Math.floor(pointer.x * ratio);
        const cy = Math.floor(pointer.y * ratio);
        out.drawImage(canvas, cx - half, cy - half, CELLS, CELLS, 0, 0, SIZE, SIZE);
      }
      const cell = SIZE / CELLS;
      out.strokeStyle = "rgba(255,255,255,0.08)";
      out.lineWidth = 1;
      for (let i = 1; i < CELLS; i++) {
        out.beginPath();
        out.moveTo(i * cell, 0);
        out.lineTo(i * cell, SIZE);
        out.moveTo(0, i * cell);
        out.lineTo(SIZE, i * cell);
        out.stroke();
      }
      out.strokeStyle = "#fff";
      out.lineWidth = 2;
      out.strokeRect(half * cell, half * cell, cell, cell);
      setHex(sampleImageColor(pointer));
    });
    return () => cancelAnimationFrame(raf);
  }, [active, pointer]);

  if (!active || !pointer || !hovering) return null;

  return (
    <div
      className="pointer-events-none absolute z-20 flex flex-col items-center gap-1.5"
      style={{ left: pointer.x + 18, top: pointer.y + 18 }}
    >
      <div
        className="overflow-hidden rounded-full border-2 shadow-xl"
        style={{ borderColor: hex ?? "rgba(255,255,255,0.6)" }}
      >
        <canvas className="block" height={SIZE} ref={canvasRef} width={SIZE} />
      </div>
      <div className="glass flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] shadow-md">
        <span
          className="size-2.5 rounded-full border border-white/30"
          style={{ background: hex ?? "transparent" }}
        />
        {hex ? hex.toUpperCase() : "-"}
      </div>
    </div>
  );
});

/** Thin, draggable scrollbars indicating position when zoomed in. */
export const Scrollbars = memo(function Scrollbars() {
  const enabled = useSettings((s) => s.showScrollbars);
  const { x, y, scale, width: vw, height: vh } = useViewSnapshot();
  const doc = useDoc((s) => s.doc);
  const [active, setActive] = useState(false);
  const zooming = useView((s) => s.zooming);
  const isPanning = useUi((s) => s.isPanning);

  useEffect(() => {
    if (zooming || isPanning) {
      setActive(true);
      return;
    }
    const t = setTimeout(() => setActive(false), 900);
    return () => clearTimeout(t);
  }, [zooming, isPanning, x, y]);

  if (!enabled || !doc || !vw || !vh) return null;
  const { width: cw, height: ch } = displaySize(doc);
  // Content rect in screen space (content is centred on the world origin).
  const left = x - (cw / 2) * scale;
  const top = y - (ch / 2) * scale;
  const right = left + cw * scale;
  const bottom = top + ch * scale;

  const axis = (start: number, end: number, view: number) => {
    const min = Math.min(start, 0);
    const max = Math.max(end, view);
    const total = max - min;
    if (total <= view + 1) return null;
    return { size: view / total, offset: (0 - min) / total, total };
  };
  const h = axis(left, right, vw);
  const v = axis(top, bottom, vh);

  const drag = (dir: "h" | "v", total: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const start = dir === "h" ? e.clientX : e.clientY;
    let last = start;
    const view = dir === "h" ? vw : vh;
    const ratio = total / view;
    setActive(true);
    const move = (ev: PointerEvent) => {
      const cur = dir === "h" ? ev.clientX : ev.clientY;
      const d = (cur - last) * ratio;
      last = cur;
      viewport.panBy(dir === "h" ? -d : 0, dir === "v" ? -d : 0);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const track = "group absolute z-10 transition-opacity duration-300 hover:opacity-100";
  const thumb =
    "absolute rounded-full bg-white/35 shadow-[0_0_0_1px_rgba(0,0,0,0.25)] transition-[background-color,width,height] hover:bg-white/60";

  return (
    <>
      {h && (
        <div
          className={cn(track, "inset-x-3 bottom-1.5 h-2.5", active ? "opacity-100" : "opacity-0")}
          data-board-overlay
        >
          <div
            className={cn(thumb, "top-1/2 h-1.5 -translate-y-1/2 group-hover:h-2")}
            onPointerDown={drag("h", h.total)}
            style={{ left: `${h.offset * 100}%`, width: `${h.size * 100}%` }}
          />
        </div>
      )}
      {v && (
        <div
          className={cn(track, "inset-y-3 right-1.5 w-2.5", active ? "opacity-100" : "opacity-0")}
          data-board-overlay
        >
          <div
            className={cn(thumb, "left-1/2 w-1.5 -translate-x-1/2 group-hover:w-2")}
            onPointerDown={drag("v", v.total)}
            style={{ top: `${v.offset * 100}%`, height: `${v.size * 100}%` }}
          />
        </div>
      )}
    </>
  );
});

function useViewSnapshot() {
  const x = useView((s) => s.x);
  const y = useView((s) => s.y);
  const scale = useView((s) => s.scale);
  const width = useView((s) => s.width);
  const height = useView((s) => s.height);
  return { x, y, scale, width, height };
}
