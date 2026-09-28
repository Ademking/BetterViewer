import type Konva from "konva";
import { memo, useCallback } from "react";
import { Shape } from "react-konva";
import type { SpotlightAnnotation } from "@/lib/annotations";
import { canvasFilterSupported } from "@/lib/filters";
import { stageRegistry } from "@/lib/stageRegistry";
import { useDoc } from "@/state/document";
import { useDraft } from "@/state/draft";
import { useUi } from "@/state/ui";

type NodeProps = Omit<Konva.ShapeConfig, "sceneFunc" | "hitFunc">;

const native = (ctx: Konva.Context) => (ctx as unknown as { _context: CanvasRenderingContext2D })._context;

function tracePath(c: CanvasRenderingContext2D, shape: "rect" | "ellipse", w: number, h: number) {
  c.beginPath();
  if (shape === "ellipse") c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else c.rect(0, 0, w, h);
}

/**
 * The spotlight itself is invisible: it's the handle for moving / resizing.
 * A dashed outline shows where it is while spotlights are being worked on.
 */
export const SpotlightNode = memo(function SpotlightNode({
  a,
  nodeProps,
}: {
  a: SpotlightAnnotation;
  nodeProps: NodeProps;
}) {
  const showOutline = useUi(
    (s) => s.tool === "spotlight" || (s.selectedIds.includes(a.id) && s.tool === "select")
  );

  const sceneFunc = useCallback(
    (ctx: Konva.Context) => {
      if (!showOutline || stageRegistry.exporting) return;
      const c = native(ctx);
      const m = c.getTransform();
      const px = 1 / Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
      c.save();
      tracePath(c, a.shape, a.width, a.height);
      c.setLineDash([6 * px, 5 * px]);
      c.lineWidth = 1.5 * px;
      c.strokeStyle = "rgba(255,255,255,0.8)";
      c.stroke();
      c.restore();
    },
    [a.shape, a.width, a.height, showOutline]
  );

  const hitFunc = useCallback(
    (ctx: Konva.Context, shape: Konva.Shape) => {
      const c = native(ctx);
      tracePath(c, a.shape, a.width, a.height);
      ctx.fillStrokeShape(shape);
    },
    [a.shape, a.width, a.height]
  );

  return (
    <Shape
      {...nodeProps}
      fill="#000"
      height={a.height}
      hitFunc={hitFunc}
      opacity={1}
      sceneFunc={sceneFunc}
      width={a.width}
    />
  );
});

/**
 * One dimming layer over the whole image with a soft hole per spotlight.
 * Drawn first in the annotation layer, so `destination-out` only cuts this
 * overlay (every Konva layer renders to its own canvas, exports included).
 * Positions are read from the live nodes, so holes follow drags / resizes.
 */
export const SpotlightOverlay = memo(function SpotlightOverlay() {
  const annotations = useDoc((s) => s.doc?.annotations);
  const width = useDoc((s) => s.doc?.image.width ?? 0);
  const height = useDoc((s) => s.doc?.image.height ?? 0);
  const draft = useDraft((s) => (s.draft?.type === "spotlight" ? s.draft : null));

  const spots = [
    ...(annotations?.filter((a): a is SpotlightAnnotation => a.type === "spotlight" && !a.hidden) ?? []),
    ...(draft ? [draft] : []),
  ];

  const sceneFunc = useCallback(
    (ctx: Konva.Context, shape: Konva.Shape) => {
      if (!spots.length) return;
      const c = native(ctx);
      const m = c.getTransform();
      const deviceScale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
      const layer = shape.getLayer();
      c.save();
      c.fillStyle = `rgba(0,0,0,${Math.max(...spots.map((s) => s.dim))})`;
      c.fillRect(0, 0, width, height);
      c.globalCompositeOperation = "destination-out";
      c.fillStyle = "#000";
      for (const s of spots) {
        // Live node (dragging / transforming) or the committed values.
        const n = layer?.findOne(`#${s.id}`) as Konva.Node | undefined;
        const x = n?.x() ?? s.x;
        const y = n?.y() ?? s.y;
        const rot = n?.rotation() ?? s.rotation;
        const w = s.width * (n?.scaleX() ?? 1);
        const h = s.height * (n?.scaleY() ?? 1);
        const soft = s.feather * Math.min(w, h);
        c.save();
        c.translate(x, y);
        c.rotate((rot * Math.PI) / 180);
        if (soft > 0 && canvasFilterSupported) {
          c.filter = `blur(${((soft / 2) * deviceScale).toFixed(2)}px)`;
          // Shrink by the blur so the soft edge stays inside the shape.
          c.translate(soft / 2, soft / 2);
          tracePath(c, s.shape, Math.max(1, w - soft), Math.max(1, h - soft));
        } else {
          tracePath(c, s.shape, w, h);
        }
        c.fill();
        c.restore();
      }
      c.restore();
    },
    [spots, width, height]
  );

  if (!spots.length) return null;
  return <Shape listening={false} perfectDrawEnabled={false} sceneFunc={sceneFunc} />;
});

