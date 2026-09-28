import type Konva from "konva";
import { type RefObject, useEffect } from "react";
import { toast } from "@/components/ui/toast";
import { addAnnotation, applyColor } from "@/lib/actions";
import {
  type Annotation,
  type CounterAnnotation,
  createShape,
  isLineKind,
  nextCounterNumber,
  type PointsAnnotation,
  type RedactAnnotation,
  type ShapeKind,
  type SpotlightAnnotation,
  type TextAnnotation,
  uid,
} from "@/lib/annotations";
import { sampleImageColor } from "@/lib/colors";
import { screenToLocal, stageRegistry } from "@/lib/stageRegistry";
import { viewport } from "@/lib/viewport";
import { getDoc, updateDoc } from "@/state/document";
import { useDraft } from "@/state/draft";
import { getSettings } from "@/state/settings";
import { levelTo } from "@/lib/straighten";
import { removeMeasurement, setPendingFollow, updateMeasurement, useMeasure } from "@/state/measure";
import { getUi } from "@/state/ui";

type Pt = { x: number; y: number };

const findAnnotation = (node: Konva.Node | null): Konva.Node | null => {
  let n: Konva.Node | null = node;
  while (n && n.getType() !== "Layer") {
    if (n.name() === "annotation") return n;
    n = n.getParent();
  }
  return null;
};

const snapPt = (p: Pt): Pt => {
  const { snapToGrid, gridSize } = getSettings();
  if (!snapToGrid) return p;
  return {
    x: Math.round(p.x / gridSize) * gridSize,
    y: Math.round(p.y / gridSize) * gridSize,
  };
};

/** Constrain a drag to squares / 45° steps (Shift). */
const constrain = (a: Pt, b: Pt, kind: ShapeKind): Pt => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (isLineKind(kind)) {
    const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
    const len = Math.hypot(dx, dy);
    return { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len };
  }
  const s = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: a.x + Math.sign(dx || 1) * s, y: a.y + Math.sign(dy || 1) * s };
};

/** Light smoothing for freehand strokes (moving average, endpoints kept). */
const smooth = (pts: number[]) => {
  if (pts.length < 8) return pts;
  const out = [pts[0], pts[1]];
  for (let i = 2; i < pts.length - 2; i += 2) {
    out.push(
      (pts[i - 2] + pts[i] * 2 + pts[i + 2]) / 4,
      (pts[i - 1] + pts[i + 1] * 2 + pts[i + 3]) / 4
    );
  }
  out.push(pts[pts.length - 2], pts[pts.length - 1]);
  return out;
};

export function startTextAt(p: Pt) {
  const ui = getUi();
  const ts = ui.textStyle;
  const a: TextAnnotation = {
    id: uid(),
    type: "text",
    x: p.x,
    y: p.y - ts.fontSize * 0.6,
    rotation: 0,
    opacity: 1,
    text: "",
    fontFamily: ts.fontFamily,
    fontSize: ts.fontSize,
    fontWeight: ts.fontWeight,
    fontStyle: ts.fontStyle,
    align: ts.align,
    fill: ts.fill,
    background: ts.background,
    outline: ts.outline,
    outlineWidth: ts.outlineWidth,
    shadow: ts.shadow,
    shadowBlur: ts.shadowBlur,
    shadowOffset: ts.shadowOffset,
  };
  // Created without an undo step; committing the text records it.
  updateDoc((d) => ({ ...d, annotations: [...d.annotations, a] }), { record: false });
  ui.set({ selectedIds: [a.id], editingTextId: a.id });
}

/**
 * Native pointer / wheel handling for the board. Konva still handles node
 * dragging and transformer handles; this hook adds panning, zooming and the
 * creation tools on top.
 */
export function useCanvasInteractions(containerRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const local = (e: PointerEvent | MouseEvent): Pt => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    /* ------------------------------------------------ pinch (touch) */
    const touches = new Map<number, Pt>();
    let pinch: { dist: number; mid: Pt } | null = null;

    /* ------------------------------------------------ wheel */
    const onWheel = (e: WheelEvent) => {
      if (!getDoc()) return;
      e.preventDefault();
      // Firefox reports mouse wheels in lines (3 per notch); ~33px per line
      // makes a notch zoom / scroll as much as in other browsers (~100px).
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? el.clientHeight : 1;
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      const p = local(e);
      const { wheelBehavior } = getSettings();
      const trackpadLike =
        e.deltaMode === 0 && (dx !== 0 || (!Number.isInteger(e.deltaY) && Math.abs(dy) < 40));

      if (e.ctrlKey || e.metaKey) {
        // Trackpad pinch (ctrl+wheel) → continuous, un-animated zoom.
        const factor = Math.exp(-dy * (trackpadLike || Math.abs(dy) < 20 ? 0.012 : 0.0018));
        viewport.zoomBy(factor, p, !trackpadLike && Math.abs(dy) >= 20 && viewport.smooth);
        return;
      }
      if (wheelBehavior === "zoom" && !trackpadLike && !e.shiftKey) {
        viewport.zoomBy(Math.exp(-dy * 0.0018), p);
        return;
      }
      if (e.shiftKey && dx === 0) viewport.panBy(-dy, 0);
      else viewport.panBy(-dx, -dy);
    };

    /* ------------------------------------------------ gestures */
    let cleanupGesture: (() => void) | null = null;

    const startPan = (e: PointerEvent, onClick?: () => void) => {
      let last = { x: e.clientX, y: e.clientY };
      let moved = 0;
      getUi().set({ isPanning: true });
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - last.x;
        const dy = ev.clientY - last.y;
        moved += Math.abs(dx) + Math.abs(dy);
        last = { x: ev.clientX, y: ev.clientY };
        viewport.panBy(dx, dy);
      };
      const up = () => {
        getUi().set({ isPanning: false });
        cleanup();
        if (moved < 4) onClick?.();
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        cleanupGesture = null;
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      cleanupGesture = cleanup;
    };

    const startMarquee = (e: PointerEvent, additive: boolean) => {
      const start = local(e);
      const base = additive ? getUi().selectedIds : [];
      const move = (ev: PointerEvent) => {
        const p = local(ev);
        const rect = {
          x: Math.min(start.x, p.x),
          y: Math.min(start.y, p.y),
          width: Math.abs(p.x - start.x),
          height: Math.abs(p.y - start.y),
        };
        useDraft.setState({ marquee: rect });
        const layer = stageRegistry.annotationLayer;
        if (!layer) return;
        const hits = layer
          .find(".annotation")
          .filter((n) => {
            const r = n.getClientRect();
            return (
              r.x < rect.x + rect.width &&
              r.x + r.width > rect.x &&
              r.y < rect.y + rect.height &&
              r.y + r.height > rect.y
            );
          })
          .map((n) => n.id());
        getUi().select([...new Set([...base, ...hits])]);
      };
      const up = () => {
        useDraft.setState({ marquee: null });
        cleanup();
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        cleanupGesture = null;
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      cleanupGesture = cleanup;
    };

    const startDraw = (e: PointerEvent) => {
      const ui = getUi();
      const scale = viewport.cur.scale;
      const p0 = screenToLocal(local(e));
      const highlighter = ui.drawMode === "highlighter";
      const draft: PointsAnnotation = {
        id: uid(),
        type: "path",
        x: 0,
        y: 0,
        rotation: 0,
        opacity: highlighter ? 0.45 : ui.style.opacity,
        points: [p0.x, p0.y, p0.x + 0.01, p0.y],
        stroke: ui.style.stroke,
        strokeWidth: ui.style.strokeWidth * (highlighter ? 3 : 1),
        fill: "transparent",
        highlighter,
      };
      const pts = draft.points.slice(0, 2);
      useDraft.setState({ draft });
      const minDist = 1.5 / scale;
      const move = (ev: PointerEvent) => {
        const events = ev.getCoalescedEvents?.() ?? [ev];
        for (const ce of events.length ? events : [ev]) {
          const p = screenToLocal(local(ce));
          const lx = pts[pts.length - 2];
          const ly = pts[pts.length - 1];
          if (Math.hypot(p.x - lx, p.y - ly) >= minDist) pts.push(p.x, p.y);
        }
        useDraft.setState({ draft: { ...draft, points: [...pts] } });
      };
      const up = () => {
        cleanup();
        useDraft.setState({ draft: null });
        const finalPts = pts.length === 2 ? [pts[0], pts[1], pts[0] + 0.01, pts[1]] : smooth(pts);
        addAnnotation({ ...draft, points: finalPts }, false);
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        cleanupGesture = null;
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      cleanupGesture = cleanup;
    };

    const startErase = (e: PointerEvent) => {
      const stage = stageRegistry.stage;
      if (!stage) return;
      const key = `erase-${performance.now()}`;
      let count = 0;
      const eraseAt = (p: Pt) => {
        const hit = findAnnotation(stage.getIntersection(p));
        if (!hit) return;
        const id = hit.id();
        const doc = getDoc();
        const a = doc?.annotations.find((x) => x.id === id);
        if (!a || a.type !== "path") return;
        count++;
        updateDoc((d) => ({ ...d, annotations: d.annotations.filter((x) => x.id !== id) }), { key });
      };
      eraseAt(local(e));
      const move = (ev: PointerEvent) => eraseAt(local(ev));
      const up = () => {
        cleanup();
        if (count === 0 && !getDoc()?.annotations.some((a) => a.type === "path")) {
          toast.info({ title: "Nothing to erase", description: "The eraser removes freehand strokes." });
        }
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        cleanupGesture = null;
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      cleanupGesture = cleanup;
    };

    /** Counter tool: every click stamps the next number. */
    const placeCounter = (e: PointerEvent) => {
      const ui = getUi();
      const doc = getDoc();
      if (!doc) return;
      const p = snapPt(screenToLocal(local(e)));
      const number = ui.counterNext ?? nextCounterNumber(doc.annotations);
      const counter: CounterAnnotation = {
        id: uid(),
        type: "counter",
        x: p.x,
        y: p.y,
        rotation: 0,
        opacity: ui.style.opacity,
        number,
        radius: ui.style.counterRadius,
        fill: ui.style.stroke,
      };
      addAnnotation(counter, false);
      // An explicit starting number (restart / typed) continues from itself;
      // otherwise the sequence is derived from the counters on the image, so
      // undo and delete never leave gaps or duplicates.
      if (ui.counterNext !== null) ui.set({ counterNext: number + 1 });
    };

    const startShape = (e: PointerEvent) => {
      const ui = getUi();
      const kind = ui.shapeKind;
      if (kind === "counter") {
        placeCounter(e);
        return;
      }
      const startScreen = local(e);
      const a = snapPt(screenToLocal(startScreen));
      const id = uid();
      let dragged = false;
      const style = { ...ui.style };
      const move = (ev: PointerEvent) => {
        const ps = local(ev);
        if (!dragged && Math.hypot(ps.x - startScreen.x, ps.y - startScreen.y) < 4) return;
        dragged = true;
        let b = snapPt(screenToLocal(ps));
        if (ev.shiftKey) b = constrain(a, b, kind);
        if (ev.altKey && !isLineKind(kind)) {
          // Alt: draw from centre.
          const from = { x: a.x - (b.x - a.x), y: a.y - (b.y - a.y) };
          useDraft.setState({ draft: createShape(kind, from, b, style, id) });
          return;
        }
        useDraft.setState({ draft: createShape(kind, a, b, style, id) });
      };
      const up = () => {
        cleanup();
        let shape: Annotation | null = useDraft.getState().draft;
        useDraft.setState({ draft: null });
        if (!dragged) {
          // Click without drag → default-sized shape.
          const size = 140 / viewport.cur.scale;
          const b =
            isLineKind(kind)
              ? { x: a.x + size, y: a.y }
              : { x: a.x + size / 2, y: a.y + size / 2 };
          const from =
            isLineKind(kind) ? a : { x: a.x - size / 2, y: a.y - size / 2 };
          shape = createShape(kind, from, b, style, id);
        }
        if (!shape) return;
        addAnnotation(shape, true);
        if (getSettings().returnToSelect) getUi().set({ tool: "select", selectedIds: [shape.id] });
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        cleanupGesture = null;
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      cleanupGesture = cleanup;
    };

    /** Blur tool: drag a zone to pixelate / blur (click = default size). */
    const startRedact = (e: PointerEvent) => {
      const ui = getUi();
      const startScreen = local(e);
      const a = snapPt(screenToLocal(startScreen));
      const id = uid();
      let dragged = false;
      const make = (p: Pt, q: Pt): RedactAnnotation => ({
        id,
        type: "redact",
        x: Math.min(p.x, q.x),
        y: Math.min(p.y, q.y),
        width: Math.max(4, Math.abs(q.x - p.x)),
        height: Math.max(4, Math.abs(q.y - p.y)),
        rotation: 0,
        opacity: 1,
        mode: ui.style.redactMode,
        strength: ui.style.redactStrength,
      });
      const move = (ev: PointerEvent) => {
        const ps = local(ev);
        if (!dragged && Math.hypot(ps.x - startScreen.x, ps.y - startScreen.y) < 4) return;
        dragged = true;
        let b = snapPt(screenToLocal(ps));
        if (ev.shiftKey) b = constrain(a, b, "rect");
        useDraft.setState({ draft: make(a, b) });
      };
      const up = () => {
        cleanup();
        let zone = useDraft.getState().draft as RedactAnnotation | null;
        useDraft.setState({ draft: null });
        if (!dragged) {
          const half = 80 / viewport.cur.scale;
          zone = make({ x: a.x - half, y: a.y - half }, { x: a.x + half, y: a.y + half });
        }
        if (!zone) return;
        addAnnotation(zone, true);
        if (getSettings().returnToSelect) getUi().set({ tool: "select", selectedIds: [zone.id] });
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        cleanupGesture = null;
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      cleanupGesture = cleanup;
    };

    /** Spotlight tool: drag an area to keep bright (click = default size). */
    const startSpotlight = (e: PointerEvent) => {
      const ui = getUi();
      const startScreen = local(e);
      const a = snapPt(screenToLocal(startScreen));
      const id = uid();
      let dragged = false;
      const make = (p: Pt, q: Pt): SpotlightAnnotation => ({
        id,
        type: "spotlight",
        x: Math.min(p.x, q.x),
        y: Math.min(p.y, q.y),
        width: Math.max(4, Math.abs(q.x - p.x)),
        height: Math.max(4, Math.abs(q.y - p.y)),
        rotation: 0,
        opacity: 1,
        shape: ui.style.spotlightShape,
        dim: ui.style.spotlightDim,
        feather: ui.style.spotlightFeather,
      });
      const move = (ev: PointerEvent) => {
        const ps = local(ev);
        if (!dragged && Math.hypot(ps.x - startScreen.x, ps.y - startScreen.y) < 4) return;
        dragged = true;
        let b = snapPt(screenToLocal(ps));
        if (ev.shiftKey) b = constrain(a, b, "rect");
        if (ev.altKey) {
          // Alt: draw from centre.
          useDraft.setState({ draft: make({ x: a.x - (b.x - a.x), y: a.y - (b.y - a.y) }, b) });
          return;
        }
        useDraft.setState({ draft: make(a, b) });
      };
      const up = () => {
        cleanup();
        let spot = useDraft.getState().draft as SpotlightAnnotation | null;
        useDraft.setState({ draft: null });
        if (!dragged) {
          const half = 110 / viewport.cur.scale;
          spot = make({ x: a.x - half, y: a.y - half }, { x: a.x + half, y: a.y + half });
        }
        if (!spot) return;
        addAnnotation(spot, true);
        if (getSettings().returnToSelect) getUi().set({ tool: "select", selectedIds: [spot.id] });
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        cleanupGesture = null;
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      cleanupGesture = cleanup;
    };

    /**
     * Measure tool. Distance: drag a line. Angle: drag the first arm from the
     * vertex, then the second arm follows the pointer until a click.
     */
    const startMeasure = (e: PointerEvent) => {
      const { mode, items } = useMeasure.getState();
      const p = screenToLocal(local(e));
      const pending = items.find((m) => m.pending);
      if (pending) {
        setPendingFollow(null);
        updateMeasurement(pending.id, [...pending.pts.slice(0, 4), p.x, p.y], false);
        return;
      }
      const id = uid();
      const startScreen = local(e);
      let dragged = false;
      useMeasure.setState((s) => ({
        items: [
          ...s.items,
          { id, kind: mode, pts: mode === "distance" ? [p.x, p.y, p.x, p.y] : [p.x, p.y, p.x, p.y, p.x, p.y] },
        ],
      }));
      /** Shift: snap to 15° steps. */
      const snap15 = (q: Pt, ev: PointerEvent): Pt => {
        if (!ev.shiftKey) return q;
        const step = Math.PI / 12;
        const ang = Math.round(Math.atan2(q.y - p.y, q.x - p.x) / step) * step;
        const len = Math.hypot(q.x - p.x, q.y - p.y);
        return { x: p.x + Math.cos(ang) * len, y: p.y + Math.sin(ang) * len };
      };
      const move = (ev: PointerEvent) => {
        const ps = local(ev);
        if (!dragged && Math.hypot(ps.x - startScreen.x, ps.y - startScreen.y) < 4) return;
        dragged = true;
        const q = snap15(screenToLocal(ps), ev);
        updateMeasurement(id, mode === "distance" ? [p.x, p.y, q.x, q.y] : [p.x, p.y, q.x, q.y, q.x, q.y]);
      };
      const up = () => {
        cleanup();
        if (!dragged) {
          removeMeasurement(id);
          return;
        }
        if (mode !== "angle") return;
        // Second arm follows the pointer until the next click.
        const m = useMeasure.getState().items.find((x) => x.id === id);
        if (!m) return;
        updateMeasurement(id, m.pts, true);
        const follow = (ev: PointerEvent) => {
          const cur = useMeasure.getState().items.find((x) => x.id === id);
          if (!cur?.pending) return;
          const q = screenToLocal(local(ev));
          updateMeasurement(id, [...cur.pts.slice(0, 4), q.x, q.y], true);
        };
        el.addEventListener("pointermove", follow);
        setPendingFollow(() => el.removeEventListener("pointermove", follow));
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        cleanupGesture = null;
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      cleanupGesture = cleanup;
    };

    /** Straighten: drag along something that should be level. */
    const startLevelLine = (e: PointerEvent) => {
      const a = local(e);
      let dragged = false;
      const move = (ev: PointerEvent) => {
        const b = local(ev);
        if (!dragged && Math.hypot(b.x - a.x, b.y - a.y) < 6) return;
        dragged = true;
        getUi().set({ levelLine: { x1: a.x, y1: a.y, x2: b.x, y2: b.y } });
      };
      const up = (ev: PointerEvent) => {
        cleanup();
        getUi().set({ levelLine: null });
        const b = local(ev);
        if (dragged && Math.hypot(b.x - a.x, b.y - a.y) >= 12) levelTo(a, b);
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        cleanupGesture = null;
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      cleanupGesture = cleanup;
    };

    const pickColor = (e: PointerEvent) => {
      const hex = sampleImageColor(local(e));
      if (!hex) {
        toast.info({ title: "Pick inside the image" });
        return;
      }
      const ui = getUi();
      ui.set({ pickedColor: hex });
      ui.pushRecentColor(hex);
      applyColor(hex);
      toast.success({
        title: `Picked ${hex.toUpperCase()}`,
        description: "Set as the drawing color.",
        action: {
          label: "Copy",
          onClick: () => navigator.clipboard?.writeText(hex.toUpperCase()),
        },
      });
    };

    /* ------------------------------------------------ pointer down */
    const onPointerDown = (e: PointerEvent) => {
      const stage = stageRegistry.stage;
      if (!stage || !getDoc()) return;
      // Ignore events from overlays (e.g. the text editor).
      if ((e.target as HTMLElement).closest("[data-board-overlay]")) return;

      if (e.pointerType === "touch") {
        touches.set(e.pointerId, local(e));
        if (touches.size === 2) {
          cleanupGesture?.();
          useDraft.setState({ draft: null });
          const [a, b] = [...touches.values()];
          pinch = {
            dist: Math.hypot(a.x - b.x, a.y - b.y),
            mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          };
          return;
        }
      }

      stage.setPointersPositions(e);
      const p = local(e);
      const ui = getUi();
      const hit = stage.getIntersection(p);
      const annotation = findAnnotation(hit);
      const isHandle = !!hit && !annotation;

      if (e.button === 1 || (e.button === 0 && (ui.spaceHeld || ui.tool === "pan"))) {
        e.preventDefault();
        startPan(e);
        return;
      }
      if (e.button !== 0) {
        // Right click selects the shape under the cursor for the context menu.
        if (e.button === 2 && annotation && !ui.selectedIds.includes(annotation.id())) {
          ui.set({ tool: "select", selectedIds: [annotation.id()] });
        }
        return;
      }
      if (ui.editingTextId) return; // the editor's blur commits first

      switch (ui.tool) {
        case "select": {
          if (annotation) {
            const id = annotation.id();
            if (e.shiftKey || e.ctrlKey || e.metaKey) {
              ui.select(
                ui.selectedIds.includes(id)
                  ? ui.selectedIds.filter((x) => x !== id)
                  : [...ui.selectedIds, id]
              );
            } else if (!ui.selectedIds.includes(id)) {
              ui.select([id]);
            }
            return;
          }
          if (isHandle) return;
          if (e.shiftKey || !getSettings().panOnEmptyDrag) {
            startMarquee(e, e.shiftKey);
            return;
          }
          startPan(e, () => ui.select([]));
          return;
        }
        case "draw":
          if (ui.drawMode === "eraser") startErase(e);
          else startDraw(e);
          return;
        case "redact":
          if (annotation && ui.selectedIds.includes(annotation.id())) return;
          startRedact(e);
          return;
        case "spotlight":
          if (annotation && ui.selectedIds.includes(annotation.id())) return;
          startSpotlight(e);
          return;
        case "measure":
          startMeasure(e);
          return;
        case "straighten":
          startLevelLine(e);
          return;
        case "shape":
          startShape(e);
          return;
        case "text": {
          if (annotation) {
            const doc = getDoc();
            const a = doc?.annotations.find((x) => x.id === annotation.id());
            if (a?.type === "text") {
              ui.set({ selectedIds: [a.id], editingTextId: a.id });
              return;
            }
          }
          e.preventDefault();
          startTextAt(snapPt(screenToLocal(p)));
          return;
        }
        case "eyedropper":
          pickColor(e);
          return;
        case "crop":
          if (!hit) startPan(e);
          return;
      }
    };

    /* ------------------------------------------------ hover / touch move */
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" && touches.has(e.pointerId)) {
        touches.set(e.pointerId, local(e));
        if (pinch && touches.size === 2) {
          const [a, b] = [...touches.values()];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          viewport.panBy(mid.x - pinch.mid.x, mid.y - pinch.mid.y);
          viewport.zoomBy(dist / pinch.dist, mid, false);
          pinch = { dist, mid };
        }
      }
      useDraft.setState({ pointer: local(e), hovering: true });

      const ui = getUi();
      const stage = stageRegistry.stage;
      if (ui.tool === "select" && stage && !ui.isPanning && e.buttons === 0) {
        const hit = findAnnotation(stage.getIntersection(local(e)));
        el.dataset.hover = hit ? "annotation" : "";
      }
    };

    const onPointerEnd = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      if (touches.size < 2) pinch = null;
    };

    const onPointerLeave = () => useDraft.setState({ hovering: false });

    /* ------------------------------------------------ double click */
    const onDblClick = (e: MouseEvent) => {
      const stage = stageRegistry.stage;
      const ui = getUi();
      if (!stage || !getDoc() || ui.tool !== "select") return;
      if ((e.target as HTMLElement).closest("[data-board-overlay]")) return;
      const p = local(e);
      const annotation = findAnnotation(stage.getIntersection(p));
      if (annotation) {
        const a = getDoc()?.annotations.find((x) => x.id === annotation.id());
        if (a?.type === "text") ui.set({ selectedIds: [a.id], editingTextId: a.id });
        return;
      }
      // Double-click empty board toggles fit ↔ 100% at the cursor.
      if (Math.abs(viewport.cur.scale - 1) < 0.01) viewport.fit();
      else viewport.zoomTo(1, p);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerEnd);
    el.addEventListener("pointercancel", onPointerEnd);
    el.addEventListener("pointerleave", onPointerLeave);
    el.addEventListener("dblclick", onDblClick);
    return () => {
      cleanupGesture?.();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerEnd);
      el.removeEventListener("pointercancel", onPointerEnd);
      el.removeEventListener("pointerleave", onPointerLeave);
      el.removeEventListener("dblclick", onDblClick);
    };
  }, [containerRef]);
}
