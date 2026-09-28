import type Konva from "konva";
import { memo, useCallback, useEffect, useRef } from "react";
import { Rect, Shape } from "react-konva";
import { useImage } from "@/hooks/useImage";
import { developedFullSync, useDevelopedSource, useDevelopParams } from "@/lib/develop";
import { pickLevel, useMipmaps } from "@/lib/mipmap";
import { useStraightenPreview } from "@/lib/straighten";
import { toCssFilter } from "@/lib/filters";
import { stageRegistry } from "@/lib/stageRegistry";
import { viewport } from "@/lib/viewport";
import { useDoc } from "@/state/document";
import { useSettings } from "@/state/settings";
import { useUi } from "@/state/ui";

/**
 * The main image. Drawn with a custom scene function so adjustments can use
 * the GPU-accelerated Canvas2D `filter` instead of Konva's per-pixel filters
 * (which would require caching the full-resolution bitmap on every change).
 */
export const ImageNode = memo(function ImageNode() {
  const info = useDoc((s) => s.doc?.image);
  const filters = useDoc((s) => s.doc?.filters);
  const compare = useUi((s) => s.compareOriginal);
  const pixelated = useSettings((s) => s.pixelatedZoom);
  const board = useSettings((s) => s.boardBackground);
  const { image } = useImage(info?.src);
  const develop = useDevelopParams();
  const source = useDevelopedSource(image, develop);
  const straighten = useUi((s) => s.straighten);
  const preview = useStraightenPreview(straighten ? (source ?? image) : null, straighten, info?.width ?? 0, info?.height ?? 0);
  const shown = preview ?? source ?? image;
  const mipmaps = useMipmaps(shown);

  const sceneFunc = useCallback(
    (ctx: Konva.Context) => {
      if (!image || !info) return;
      const native = (ctx as unknown as { _context: CanvasRenderingContext2D })
        ._context;
      const m = native.getTransform();
      const deviceScale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
      native.filter = compare || !filters ? "none" : toCssFilter(filters, deviceScale);
      // Crisp pixels when zoomed well past 100%.
      native.imageSmoothingEnabled = !(
        pixelated &&
        !stageRegistry.exporting &&
        viewport.cur.scale >= 3
      );
      native.imageSmoothingQuality = "high";
      // Exports always get the full-resolution result; on screen, the smallest
      // copy that still covers the pixels shown.
      const src = stageRegistry.exporting
        ? developedFullSync(image, develop)
        : shown
          ? pickLevel(shown, mipmaps, info.width * deviceScale)
          : image;
      native.drawImage(src, 0, 0, info.width, info.height);
      native.filter = "none";
    },
    [image, shown, mipmaps, info, filters, develop, compare, pixelated]
  );

  const opaque = !!info && /jpe?g/i.test(info.type);
  const withShadow = opaque && board !== "white";
  const shadowRef = useRef<Konva.Rect>(null);

  // A 60px canvas shadow blur on every zoom frame is expensive (very much so
  // where canvas runs on the CPU); render it once, small, and let it stretch.
  useEffect(() => {
    const n = shadowRef.current;
    if (!n || !info || !image) return;
    n.cache({ pixelRatio: Math.min(1, 600 / Math.max(info.width, info.height)) });
    n.getLayer()?.batchDraw();
    return () => {
      n.clearCache();
    };
  }, [info, image, withShadow]);

  if (!info || !image) return null;

  return (
    <>
      {withShadow && (
        <Rect
          fill="#000"
          height={info.height}
          listening={false}
          perfectDrawEnabled={false}
          ref={shadowRef}
          shadowColor="#000"
          shadowBlur={60}
          shadowOpacity={0.45}
          shadowOffsetY={12}
          width={info.width}
        />
      )}
      <Shape
        height={info.height}
        listening={false}
        perfectDrawEnabled={false}
        sceneFunc={sceneFunc}
        width={info.width}
      />
    </>
  );
});
