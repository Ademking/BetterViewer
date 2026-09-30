import { MaximizeIcon, XIcon } from "lucide-react";
import { memo, useEffect, useRef } from "react";
import { ToolButton } from "@/components/tools/ToolButton";
import { renderDocumentThumbnail, zoomFit } from "@/lib/actions";
import { stageRegistry } from "@/lib/stageRegistry";
import { useView, viewport } from "@/lib/viewport";
import { cn } from "@/lib/utils";
import { displaySize, useDoc } from "@/state/document";
import { useSettings } from "@/state/settings";
import { getUi } from "@/state/ui";
import { useT } from "@/lib/i18n";

/** Largest size of the navigator's picture (CSS px). */
const MAX_W = 208;
const MAX_H = 156;
/** Wait this long after the last redraw of the board before refreshing the picture. */
const REFRESH_DELAY = 250;

export const toggleNavigator = () => {
  const { showNavigator, set } = useSettings.getState();
  set("showNavigator", !showNavigator);
};

/**
 * Bottom-right overview of the whole image while it doesn't fit in the
 * window: the visible part is outlined; click or drag to move there, scroll
 * to zoom.
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
  const overflows = left < -1 || top < -1 || left + cw * scale > vw + 1 || top + ch * scale > vh + 1;
  if (!overflows) return null;

  const k = Math.min(MAX_W / cw, MAX_H / ch);
  return (
    <NavigatorBox
      height={Math.max(1, Math.round(ch * k))}
      k={k}
      // Visible part of the image, in navigator px.
      view={{ x: (-left / scale) * k, y: (-top / scale) * k, width: (vw / scale) * k, height: (vh / scale) * k }}
      width={Math.max(1, Math.round(cw * k))}
      zoom={scale}
    />
  );
});

interface BoxProps {
  width: number;
  height: number;
  /** Navigator px per image px. */
  k: number;
  view: { x: number; y: number; width: number; height: number };
  zoom: number;
}

function NavigatorBox({ width, height, k, view, zoom }: BoxProps) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const toolbar = useSettings((s) => s.showToolbar);

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
        const pic = renderDocumentThumbnail(Math.ceil(Math.max(width, height) * dpr));
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
  }, [width, height]);

  // Scroll over the navigator to zoom around the centre of the view.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
      viewport.zoomBy(Math.exp(-e.deltaY * unit * 0.0018));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Click to centre the view on a point, drag to move the outlined area.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const box = e.currentTarget.getBoundingClientRect();
    const at = (ev: { clientX: number; clientY: number }) => ({ x: ev.clientX - box.left, y: ev.clientY - box.top });
    const p = at(e);
    const inside = p.x >= view.x && p.x <= view.x + view.width && p.y >= view.y && p.y <= view.y + view.height;
    // Keep the grabbed spot under the pointer; elsewhere, jump to the point.
    const grab = inside ? { x: p.x - (view.x + view.width / 2), y: p.y - (view.y + view.height / 2) } : { x: 0, y: 0 };
    const centreOn = (q: { x: number; y: number }) => {
      const { cur, size } = viewport;
      const { width: cw, height: ch } = viewport.content;
      // Image point (from its top-left corner) to bring to the middle of the view.
      const ix = (q.x - grab.x) / k;
      const iy = (q.y - grab.y) / k;
      const left = cur.x - (cw / 2) * cur.scale;
      const top = cur.y - (ch / 2) * cur.scale;
      viewport.panBy(size.width / 2 - ix * cur.scale - left, size.height / 2 - iy * cur.scale - top);
    };
    centreOn(p);
    getUi().set({ isPanning: true });
    const move = (ev: PointerEvent) => centreOn(at(ev));
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
  const x0 = Math.max(0, view.x);
  const y0 = Math.max(0, view.y);
  const x1 = Math.min(width, view.x + view.width);
  const y1 = Math.min(height, view.y + view.height);

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
        className="relative cursor-pointer touch-none select-none overflow-hidden rounded-md"
        onPointerDown={onPointerDown}
        ref={areaRef}
        role="presentation"
        style={{ width, height }}
      >
        <canvas className="checker-sm block size-full" ref={canvasRef} />
        {x1 > x0 && y1 > y0 && (
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
        <ToolButton className="size-6" label={t("Fit to screen")} onClick={zoomFit} shortcut="0">
          <MaximizeIcon className="size-3.5" />
        </ToolButton>
        <ToolButton className="size-6" label={t("Hide navigator")} onClick={toggleNavigator} shortcut="Shift N">
          <XIcon className="size-3.5" />
        </ToolButton>
      </div>
    </div>
  );
}
