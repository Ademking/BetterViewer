import { MaximizeIcon, XIcon } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import { ToolButton } from "@/components/tools/ToolButton";
import { renderDocumentThumbnail, zoomFit } from "@/lib/actions";
import { stageRegistry } from "@/lib/stageRegistry";
import { isFastZoom, useView, viewport, wheelZoom } from "@/lib/viewport";
import { cn } from "@/lib/utils";
import { displaySize, useDoc } from "@/state/document";
import { useSettings } from "@/state/settings";
import { getUi } from "@/state/ui";
import { useT } from "@/lib/i18n";

/** Largest size of the navigator's picture for most images (CSS px). */
const MAX_W = 160;
const MAX_H = 120;
/** A long image's navigator grows along its long side, up to this (CSS px). */
const MAX_LONG = 240;
/** Thinnest a long image's picture gets when zoomed in; its long side is then cropped. */
const MIN_SIDE = 72;
/** Most of the navigator the outlined view takes up before the picture is enlarged. */
const VIEW_SHARE = 0.6;
/** Largest picture to render for a long image (device px). */
const MAX_RENDER = 4096;
/** Wait this long after the last redraw of the board before refreshing the picture. */
const REFRESH_DELAY = 250;

export const toggleNavigator = () => {
  const { showNavigator, set } = useSettings.getState();
  set("showNavigator", !showNavigator);
};

/**
 * Bottom-right overview of the image, shown whenever it's enabled: the
 * visible part is outlined; click or drag to move there, scroll to zoom. For a
 * long image zoomed in, the picture grows (up to MIN_SIDE thin) to keep the
 * outline usable, showing the part around the view.
 */
export const Navigator = memo(function Navigator() {
  const enabled = useSettings((s) => s.showNavigator);
  const doc = useDoc((s) => s.doc);
  const x = useView((s) => s.x);
  const y = useView((s) => s.y);
  const scale = useView((s) => s.scale);
  const vw = useView((s) => s.width);
  const vh = useView((s) => s.height);

  if (!enabled || !doc || !vw || !vh) return null;
  const { width: cw, height: ch } = displaySize(doc);
  // Content rect in screen space (content is centred on the world origin).
  const left = x - (cw / 2) * scale;
  const top = y - (ch / 2) * scale;

  // Picture px per image px: the whole image fits, unless the visible part
  // would get too small to work with.
  const maxW = clamp((MAX_W * cw) / (2 * ch), MAX_W, MAX_LONG);
  const maxH = clamp((MAX_H * ch) / (2 * cw), MAX_H, MAX_LONG);
  const fit = Math.min(maxW / cw, maxH / ch);
  const largest = Math.max(fit, MIN_SIDE / Math.min(cw, ch));
  const seen = VIEW_SHARE * Math.min(maxW / Math.min(vw / scale, cw), maxH / Math.min(vh / scale, ch));
  const k = clamp(seen, fit, largest);
  return (
    <NavigatorBox
      height={ch * k}
      k={k}
      max={{ width: maxW, height: maxH }}
      renderSide={Math.max(cw, ch) * largest}
      // Visible part of the image, in picture px.
      view={{ x: (-left / scale) * k, y: (-top / scale) * k, width: (vw / scale) * k, height: (vh / scale) * k }}
      width={cw * k}
      zoom={scale}
    />
  );
});

interface BoxProps {
  /** Size of the whole picture, which may be larger than the navigator. */
  width: number;
  height: number;
  /** Picture px per image px. */
  k: number;
  /** Largest size of the part on show (CSS px). */
  max: { width: number; height: number };
  /** Long side to render the picture at (CSS px), covering every `k`. */
  renderSide: number;
  view: { x: number; y: number; width: number; height: number };
  zoom: number;
}

function NavigatorBox({ width, height, k, max, renderSide, view, zoom }: BoxProps) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const toolbar = useSettings((s) => s.showToolbar);

  // The part of the picture on show: all of it, or for a long image the part
  // around the view.
  const aw = Math.max(1, Math.round(Math.min(width, max.width)));
  const ah = Math.max(1, Math.round(Math.min(height, max.height)));
  const ox = clamp(view.x + view.width / 2 - aw / 2, 0, width - aw);
  const oy = clamp(view.y + view.height / 2 - ah / 2, 0, height - ah);

  // The picture: the board as drawn (adjustments, annotations…), refreshed a
  // moment after it last changed.
  useEffect(() => {
    const layers = [stageRegistry.imageLayer, stageRegistry.annotationLayer];
    let timer = 0;
    let rendering = false;
    const refresh = () => {
      const out = canvasRef.current;
      if (!out) return;
      rendering = true;
      try {
        const dpr = window.devicePixelRatio || 1;
        const pic = renderDocumentThumbnail(Math.min(MAX_RENDER, Math.ceil(renderSide * dpr)));
        out.width = pic.width;
        out.height = pic.height;
        out.getContext("2d")?.drawImage(pic, 0, 0);
      } catch {
        // Nothing on the board yet; the next draw retries.
      } finally {
        rendering = false;
      }
    };
    // Rendering draws the layers too; those draws aren't changes.
    const schedule = () => {
      if (rendering) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, REFRESH_DELAY);
    };
    refresh();
    for (const l of layers) l?.on("draw.navigator", schedule);
    return () => {
      window.clearTimeout(timer);
      for (const l of layers) l?.off("draw.navigator");
    };
  }, [renderSide]);

  // Scroll over the navigator to zoom around the centre of the view.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
      // Shift turns a mouse wheel sideways in some browsers.
      const delta = e.shiftKey && e.deltaY === 0 ? e.deltaX : e.deltaY;
      viewport.zoomBy(wheelZoom(delta * unit, isFastZoom(e)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Click to centre the view on a point, drag to move the outlined area.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const box = e.currentTarget.getBoundingClientRect();
    // Picture point under the pointer.
    const px = e.clientX - box.left + ox;
    const py = e.clientY - box.top + oy;
    const inside = px >= view.x && px <= view.x + view.width && py >= view.y && py <= view.y + view.height;
    if (!inside) {
      const { cur, size } = viewport;
      const { width: cw, height: ch } = viewport.content;
      const left = cur.x - (cw / 2) * cur.scale;
      const top = cur.y - (ch / 2) * cur.scale;
      viewport.panBy(size.width / 2 - (px / k) * cur.scale - left, size.height / 2 - (py / k) * cur.scale - top);
    }
    // The outline follows the pointer from there; by how far it moves, as the
    // picture itself may scroll along.
    let last = { x: e.clientX, y: e.clientY };
    getUi().set({ isPanning: true });
    const move = (ev: PointerEvent) => {
      const { scale } = viewport.cur;
      viewport.panBy((-(ev.clientX - last.x) / k) * scale, (-(ev.clientY - last.y) / k) * scale);
      last = { x: ev.clientX, y: ev.clientY };
    };
    const up = () => {
      getUi().set({ isPanning: false });
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  // The outline, kept inside the picture.
  const x0 = Math.max(0, view.x - ox);
  const y0 = Math.max(0, view.y - oy);
  const x1 = Math.min(aw, view.x + view.width - ox);
  const y1 = Math.min(ah, view.y + view.height - oy);
  // Nothing to point out while the whole image is in view.
  const whole =
    view.x <= 0.5 && view.y <= 0.5 && view.x + view.width >= width - 0.5 && view.y + view.height >= height - 0.5;

  return (
    <div
      className={cn(
        "glass absolute right-3 bottom-3 z-20 hidden animate-in rounded-xl border p-1.5 shadow-lg/10 fade-in-0 zoom-in-95 duration-200 md:block",
        // Above the toolbar until there's room beside it.
        toolbar && "bottom-16 xl:bottom-3"
      )}
      data-chrome
    >
      <div
        aria-label={t("Navigator: drag to move around the image")}
        className="relative mx-auto cursor-pointer touch-none select-none overflow-hidden rounded-md"
        onPointerDown={onPointerDown}
        ref={areaRef}
        role="presentation"
        style={{ width: aw, height: ah }}
      >
        <canvas
          className="checker-sm absolute block"
          ref={canvasRef}
          style={{ left: -ox, top: -oy, width, height }}
        />
        {!whole && x1 > x0 && y1 > y0 && (
          <div
            className={cn(
              "pointer-events-none absolute rounded-[2px] border-2 border-brand",
              // Dim everything outside the visible part.
              "shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
            )}
            style={{ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }}
          />
        )}
      </div>
      <div className="mt-1 flex items-center gap-0.5 ps-1">
        <span className="me-auto font-medium text-muted-foreground text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
        <ToolButton className="size-6" label={t("Fit to screen")} onClick={zoomFit} command="zoomFit">
          <MaximizeIcon className="size-3.5" />
        </ToolButton>
        <ToolButton className="size-6" label={t("Hide navigator")} onClick={toggleNavigator} command="navigator">
          <XIcon className="size-3.5" />
        </ToolButton>
      </div>
    </div>
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
