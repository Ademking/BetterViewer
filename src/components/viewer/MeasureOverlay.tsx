import { XIcon } from "lucide-react";
import { memo, useEffect } from "react";
import { stageRegistry } from "@/lib/stageRegistry";
import { useView } from "@/lib/viewport";
import { useDoc } from "@/state/document";
import {
  armsAngle,
  cancelPendingMeasurement,
  fmt,
  lengthOf,
  type Measurement,
  removeMeasurement,
  screenAngle,
  updateMeasurement,
  useMeasure,
} from "@/state/measure";
import { useUi } from "@/state/ui";

type Pt = { x: number; y: number };

const LINE = "#facc15";

/** Image-local ↔ board (screen) coordinates, from the live Konva transform. */
function useTransforms() {
  // Re-render on pan / zoom and on document geometry changes.
  useView((s) => `${s.x}|${s.y}|${s.scale}|${s.width}|${s.height}`);
  useDoc((s) => (s.doc ? `${s.doc.rotation}|${s.doc.flipX}|${s.doc.flipY}|${s.doc.image.width}|${s.doc.image.height}` : ""));
  const g = stageRegistry.annotationGroup;
  if (!g) return null;
  const t = g.getAbsoluteTransform().copy();
  const inv = t.copy().invert();
  return {
    toScreen: (x: number, y: number): Pt => t.point({ x, y }),
    toLocal: (p: Pt): Pt => inv.point(p),
  };
}

function Handle({
  p,
  onDrag,
  interactive,
}: {
  p: Pt;
  onDrag: (screen: Pt) => void;
  interactive: boolean;
}) {
  if (!interactive) return null;
  return (
    <span
      className="pointer-events-auto absolute size-3 -translate-x-1/2 -translate-y-1/2 cursor-move rounded-full border-2 bg-neutral-900 shadow"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const board = (e.currentTarget as HTMLElement).closest("[data-measure-overlay]")!.getBoundingClientRect();
        const move = (ev: PointerEvent) => onDrag({ x: ev.clientX - board.left, y: ev.clientY - board.top });
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }}
      style={{ left: p.x, top: p.y, borderColor: LINE }}
    />
  );
}

function Label({ at, text, id, interactive }: { at: Pt; text: string; id: string; interactive: boolean }) {
  return (
    <span
      className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-md bg-neutral-950/85 py-0.5 pr-1 pl-1.5 font-medium font-mono text-[11px] text-white tabular-nums shadow"
      style={{ left: at.x, top: at.y }}
    >
      {text}
      {interactive && (
        <button
          aria-label="Remove measurement"
          className="pointer-events-auto flex size-4 items-center justify-center rounded text-white/60 hover:bg-white/15 hover:text-white"
          onClick={() => removeMeasurement(id)}
          onPointerDown={(e) => e.stopPropagation()}
          type="button"
        >
          <XIcon className="size-3" />
        </button>
      )}
    </span>
  );
}

function Stroke({ pts }: { pts: Pt[] }) {
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  return (
    <>
      <path d={d} fill="none" stroke="rgba(0,0,0,0.55)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} />
      <path d={d} fill="none" stroke={LINE} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} />
    </>
  );
}

function MeasureItem({
  m,
  tf,
  interactive,
}: {
  m: Measurement;
  tf: NonNullable<ReturnType<typeof useTransforms>>;
  interactive: boolean;
}) {
  const s = [];
  for (let i = 0; i < m.pts.length; i += 2) s.push(tf.toScreen(m.pts[i], m.pts[i + 1]));
  const move = (index: number) => (screen: Pt) => {
    const p = tf.toLocal(screen);
    const pts = [...m.pts];
    pts[index * 2] = p.x;
    pts[index * 2 + 1] = p.y;
    updateMeasurement(m.id, pts, m.pending);
  };

  if (m.kind === "distance") {
    const [a, b] = s;
    const len = lengthOf(m.pts[0], m.pts[1], m.pts[2], m.pts[3]);
    let ang = screenAngle(a, b);
    if (ang > 90) ang -= 180;
    if (ang < -90) ang += 180;
    // Label beside the middle, off the line.
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const n = Math.hypot(dx, dy) || 1;
    const at = { x: (a.x + b.x) / 2 + (-dy / n) * 16, y: (a.y + b.y) / 2 + (dx / n) * 16 };
    // End ticks perpendicular to the line.
    const tick = (p: Pt) => [
      { x: p.x + (-dy / n) * 6, y: p.y + (dx / n) * 6 },
      { x: p.x - (-dy / n) * 6, y: p.y - (dx / n) * 6 },
    ];
    return (
      <>
        <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
          <Stroke pts={[a, b]} />
          <Stroke pts={tick(a)} />
          <Stroke pts={tick(b)} />
        </svg>
        <Label at={at} id={m.id} interactive={interactive} text={`${fmt(len)} px · ${fmt(Math.abs(ang))}°`} />
        <Handle interactive={interactive} onDrag={move(0)} p={a} />
        <Handle interactive={interactive} onDrag={move(1)} p={b} />
      </>
    );
  }

  const [v, a, b] = s;
  const deg = armsAngle(v, a, b);
  // Arc between the arms (screen space, so it looks the same at any zoom).
  const r = Math.min(28, lengthOf(v.x, v.y, a.x, a.y) * 0.6, lengthOf(v.x, v.y, b.x, b.y) * 0.6);
  const a1 = Math.atan2(a.y - v.y, a.x - v.x);
  const a2 = Math.atan2(b.y - v.y, b.x - v.x);
  let delta = a2 - a1;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const p1 = { x: v.x + Math.cos(a1) * r, y: v.y + Math.sin(a1) * r };
  const p2 = { x: v.x + Math.cos(a1 + delta) * r, y: v.y + Math.sin(a1 + delta) * r };
  const mid = a1 + delta / 2;
  const at = { x: v.x + Math.cos(mid) * (r + 22), y: v.y + Math.sin(mid) * (r + 22) };
  return (
    <>
      <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
        <Stroke pts={[a, v, b]} />
        {r > 4 && (
          <path
            d={`M${p1.x} ${p1.y} A${r} ${r} 0 0 ${delta > 0 ? 1 : 0} ${p2.x} ${p2.y}`}
            fill="none"
            stroke={LINE}
            strokeDasharray="3 3"
            strokeWidth={1.5}
          />
        )}
      </svg>
      <Label at={at} id={m.id} interactive={interactive && !m.pending} text={`${fmt(deg)}°`} />
      <Handle interactive={interactive && !m.pending} onDrag={move(0)} p={v} />
      <Handle interactive={interactive && !m.pending} onDrag={move(1)} p={a} />
      <Handle interactive={interactive && !m.pending} onDrag={move(2)} p={b} />
    </>
  );
}

/** Measurements drawn over the board in screen space (never exported). */
export const MeasureOverlay = memo(function MeasureOverlay() {
  const items = useMeasure((s) => s.items);
  const interactive = useUi((s) => s.tool === "measure");
  const session = useDoc((s) => s.session);
  const tf = useTransforms();

  useEffect(() => {
    cancelPendingMeasurement();
    useMeasure.setState({ items: [], guides: [] });
  }, [session]);

  useEffect(() => {
    if (!interactive) cancelPendingMeasurement();
  }, [interactive]);

  if (!tf || !items.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" data-board-overlay data-measure-overlay>
      {items.map((m) => (
        <MeasureItem interactive={interactive} key={m.id} m={m} tf={tf} />
      ))}
    </div>
  );
});
