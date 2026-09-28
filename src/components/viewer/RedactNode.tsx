import type Konva from "konva";
import { memo, useCallback, useMemo } from "react";
import { Shape } from "react-konva";
import { useImage } from "@/hooks/useImage";
import type { RedactAnnotation } from "@/lib/annotations";
import { developedFullSync, sourceScale, useDevelopedSource, useDevelopParams } from "@/lib/develop";
import { combineFilters, type Filters, toCssFilter } from "@/lib/filters";
import { stageRegistry } from "@/lib/stageRegistry";
import { useDoc } from "@/state/document";
import { useUi } from "@/state/ui";

type NodeProps = Omit<Konva.ShapeConfig, "sceneFunc" | "hitFunc">;

/** Identity of a draw source, for the zone cache key. */
const sourceIds = new WeakMap<object, number>();
let nextSourceId = 1;
function sourceId(source: CanvasImageSource) {
  // A canvas is reused when adjustments change, so include its content version.
  const version = source instanceof HTMLCanvasElement ? (source.dataset.version ?? "") : "";
  let id = sourceIds.get(source);
  if (!id) sourceIds.set(source, (id = nextSourceId++));
  return `${id}.${version}`;
}

/** One reusable scratch canvas per zone, keyed by what it depends on. */
const scratch = new Map<string, { key: string; canvas: HTMLCanvasElement }>();

/**
 * Render the zone's source pixels (with the document's filters) into a
 * small canvas: downscaled for pixelation, blurred for blur mode. The
 * result is then drawn over the zone on the stage.
 */
function renderZone(
  a: RedactAnnotation,
  image: HTMLImageElement,
  filters: Filters | null,
  /** The image, or a (possibly downscaled) developed copy of it. */
  source: CanvasImageSource
): HTMLCanvasElement | null {
  // Source rects are in natural image pixels; the source may be smaller.
  const k = sourceScale(source, image);
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  // Clamp the zone to the image; nothing to hide outside it.
  const x0 = Math.max(0, Math.floor(a.x));
  const y0 = Math.max(0, Math.floor(a.y));
  const x1 = Math.min(iw, Math.ceil(a.x + a.width));
  const y1 = Math.min(ih, Math.ceil(a.y + a.height));
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return null;

  const strength = Math.max(1, a.strength);
  const key = [a.mode, x0, y0, w, h, strength, image.src, filters ? toCssFilter(filters) : "none", sourceId(source)].join("|");
  const cached = scratch.get(a.id);
  if (cached?.key === key) return cached.canvas;

  const canvas = cached?.canvas ?? document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  if (a.mode === "pixelate") {
    // One pixel per block; drawn back later without smoothing.
    const cw = Math.max(1, Math.ceil(w / strength));
    const ch = Math.max(1, Math.ceil(h / strength));
    canvas.width = cw;
    canvas.height = ch;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.filter = filters ? toCssFilter(filters, cw / w) : "none";
    ctx.drawImage(source, x0 * k, y0 * k, w * k, h * k, 0, 0, cw, ch);
  } else {
    // Blur a padded region so the zone's edges blur with real neighbours,
    // then keep only the zone itself.
    const pad = Math.ceil(strength * 2);
    const px0 = Math.max(0, x0 - pad);
    const py0 = Math.max(0, y0 - pad);
    const pw = Math.min(iw, x1 + pad) - px0;
    const ph = Math.min(ih, y1 + pad) - py0;
    // Work at reduced resolution for big zones: blur hides detail anyway.
    const scale = Math.min(1, 1200 / Math.max(pw, ph));
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    ctx.filter = combineFilters(
      filters ? toCssFilter(filters, scale) : "none",
      `blur(${(strength * scale).toFixed(2)}px)`
    );
    ctx.drawImage(
      source,
      px0 * k,
      py0 * k,
      pw * k,
      ph * k,
      (px0 - x0) * scale,
      (py0 - y0) * scale,
      pw * scale,
      ph * scale
    );
  }
  ctx.filter = "none";
  scratch.set(a.id, { key, canvas });
  return canvas;
}

/** Pixelated / blurred privacy zone. Always fully opaque. */
export const RedactNode = memo(function RedactNode({
  a,
  nodeProps,
}: {
  a: RedactAnnotation;
  nodeProps: NodeProps;
}) {
  const src = useDoc((s) => s.doc?.image.src);
  const filters = useDoc((s) => s.doc?.filters ?? null);
  const compare = useUi((s) => s.compareOriginal);
  const { image } = useImage(src);
  const activeFilters = compare ? null : filters;
  const develop = useDevelopParams();
  const source = useDevelopedSource(image, develop);

  // The canvas depends on where the zone is; Konva moves the node itself while
  // dragging, so read the live position from the shape rather than `a`.
  const sceneFunc = useCallback(
    (ctx: Konva.Context, shape: Konva.Shape) => {
      if (!image) return;
      const zone: RedactAnnotation = {
        ...a,
        x: shape.x(),
        y: shape.y(),
        width: a.width * shape.scaleX(),
        height: a.height * shape.scaleY(),
      };
      const zoneSource = stageRegistry.exporting ? developedFullSync(image, develop) : (source ?? image);
      const canvas = renderZone(zone, image, activeFilters, zoneSource);
      if (!canvas) return;
      const native = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
      native.save();
      native.imageSmoothingEnabled = a.mode !== "pixelate";
      // Undo the node's own scale while a transform is in progress.
      native.scale(1 / shape.scaleX(), 1 / shape.scaleY());
      const x0 = Math.max(0, Math.floor(zone.x)) - zone.x;
      const y0 = Math.max(0, Math.floor(zone.y)) - zone.y;
      const w = Math.min(image.naturalWidth, Math.ceil(zone.x + zone.width)) - Math.max(0, Math.floor(zone.x));
      const h = Math.min(image.naturalHeight, Math.ceil(zone.y + zone.height)) - Math.max(0, Math.floor(zone.y));
      native.drawImage(canvas, x0, y0, w, h);
      native.restore();
    },
    [a, image, source, activeFilters, develop]
  );

  const hitFunc = useCallback(
    (ctx: Konva.Context, shape: Konva.Shape) => {
      ctx.beginPath();
      ctx.rect(0, 0, a.width, a.height);
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    },
    [a.width, a.height]
  );

  // Konva needs a size for transformer bounds.
  const size = useMemo(() => ({ width: a.width, height: a.height }), [a.width, a.height]);

  return (
    <Shape
      {...nodeProps}
      fill="#000"
      height={size.height}
      hitFunc={hitFunc}
      opacity={1}
      perfectDrawEnabled={false}
      rotation={0}
      sceneFunc={sceneFunc}
      width={size.width}
    />
  );
});
