import type Konva from "konva";
import { create } from "zustand";
import { getSettings } from "@/state/settings";

export interface ViewState {
  x: number;
  y: number;
  scale: number;
}

export const MIN_SCALE = 0.02;
export const MAX_SCALE = 64;
export const ZOOM_STEP = 1.25;
/** Wheel zoom per pixel scrolled (a mouse wheel notch is about 100px). */
export const WHEEL_ZOOM = 0.0018;
/** Alt, or Ctrl / ⌘ with Shift, + wheel zooms this many times faster. */
export const FAST_ZOOM = 3;

/** One step of the zoom buttons and keys, at the Zoom speed setting. */
export const zoomStep = () => ZOOM_STEP ** getSettings().zoomSpeed;

/** Zoom for a wheel movement of `dy` pixels, at the Zoom speed setting (faster with `fast`). */
export const wheelZoom = (dy: number, fast = false) =>
  Math.exp(-dy * WHEEL_ZOOM * getSettings().zoomSpeed * (fast ? FAST_ZOOM : 1));

/** Holding Alt, or Ctrl / ⌘ with Shift, while scrolling zooms faster. */
export const isFastZoom = (e: WheelEvent) => e.altKey || ((e.ctrlKey || e.metaKey) && e.shiftKey);

interface ViewStore extends ViewState {
  width: number;
  height: number;
  /** True while a zoom animation or wheel gesture is in flight. */
  zooming: boolean;
}

/** Published viewport state for UI (zoom label, scrollbars, overlays). */
export const useView = create<ViewStore>()(() => ({
  x: 0,
  y: 0,
  scale: 1,
  width: 0,
  height: 0,
  zooming: false,
}));

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

type Anim =
  | {
      kind: "anchor";
      target: number;
      ax: number;
      ay: number;
      wx: number;
      wy: number;
    }
  | {
      kind: "tween";
      from: ViewState;
      to: ViewState;
      start: number;
      duration: number;
    };

/**
 * Imperative pan/zoom controller. It writes the Konva stage transform directly
 * (no React re-render per frame) and publishes the result to `useView`.
 */
class ViewportController {
  private stage: Konva.Stage | null = null;
  private anim: Anim | null = null;
  private raf = 0;
  private lastFrame = 0;
  private zoomingTimer = 0;
  private movingTimer = 0;
  cur: ViewState = { x: 0, y: 0, scale: 1 };
  size = { width: 0, height: 0 };
  content = { width: 0, height: 0 };
  insets = { top: 24, right: 24, bottom: 96, left: 24 };
  /** True while the view is in "fit" mode; content changes re-fit. */
  fitted = true;

  attach(stage: Konva.Stage | null) {
    this.stage = stage;
    if (stage) this.apply();
  }

  get smooth() {
    return getSettings().smoothAnimations;
  }

  setSize(width: number, height: number) {
    const prev = this.size;
    this.size = { width, height };
    if (prev.width === 0 || prev.height === 0) {
      this.apply();
      return;
    }
    if (this.fitted) {
      this.refit(false);
    } else {
      // Keep the view centred on the same world point.
      this.cur = {
        ...this.cur,
        x: this.cur.x + (width - prev.width) / 2,
        y: this.cur.y + (height - prev.height) / 2,
      };
      this.apply();
    }
  }

  setContent(width: number, height: number, refit = this.fitted) {
    const changed =
      width !== this.content.width || height !== this.content.height;
    this.content = { width, height };
    if (changed && refit) this.refit(this.smooth);
  }

  setInsets(insets: Partial<typeof this.insets>) {
    this.insets = { ...this.insets, ...insets };
  }

  screenToWorld(p: { x: number; y: number }, s = this.cur) {
    return { x: (p.x - s.x) / s.scale, y: (p.y - s.y) / s.scale };
  }

  get center() {
    return { x: this.size.width / 2, y: this.size.height / 2 };
  }

  /** Current target scale (includes in-flight zoom animation). */
  get targetScale() {
    if (this.anim?.kind === "anchor") return this.anim.target;
    if (this.anim?.kind === "tween") return this.anim.to.scale;
    return this.cur.scale;
  }

  fitState(mode: "fit" | "shrink" | "actual"): ViewState {
    const { width, height } = this.content;
    const { top, right, bottom, left } = this.insets;
    const availW = Math.max(40, this.size.width - left - right);
    const availH = Math.max(40, this.size.height - top - bottom);
    if (!width || !height) return this.cur;
    let scale = Math.min(availW / width, availH / height);
    if (mode === "shrink") scale = Math.min(1, scale);
    if (mode === "actual") scale = 1;
    scale = clampScale(scale);
    // Content is centred on the world origin.
    return {
      scale,
      x: left + availW / 2,
      y: top + availH / 2,
    };
  }

  /** Mode used to re-fit when the content or window changes while fitted. */
  private fitMode: "fit" | "shrink" | "actual" = "shrink";

  /** Explicit "fit to screen": fills the available area. */
  fit(animate = this.smooth) {
    this.fitted = true;
    this.fitMode = "fit";
    this.tweenTo(this.fitState("fit"), animate);
  }

  private refit(animate: boolean) {
    this.tweenTo(this.fitState(this.fitMode), animate);
  }

  /** Initial view for a newly opened image, honouring the default zoom setting. */
  initial(animate = this.smooth) {
    const mode = getSettings().defaultZoom;
    this.fitMode = mode;
    this.fitted = mode !== "actual";
    const to = this.fitState(mode);
    if (animate) {
      // Start slightly smaller for a gentle "settle" entrance.
      this.cur = { ...to, scale: to.scale * 0.94 };
      this.apply();
    }
    this.tweenTo(to, animate, 420);
  }

  actualSize(animate = this.smooth) {
    this.fitted = false;
    const fits =
      this.content.width <= this.size.width - this.insets.left - this.insets.right &&
      this.content.height <= this.size.height - this.insets.top - this.insets.bottom;
    if (fits) {
      this.tweenTo({ ...this.fitState("fit"), scale: 1 }, animate);
    } else {
      this.zoomTo(1, this.center, animate);
    }
  }

  zoomBy(factor: number, anchor = this.center, animate = this.smooth) {
    this.zoomTo(this.targetScale * factor, anchor, animate);
  }

  zoomTo(scale: number, anchor = this.center, animate = this.smooth) {
    this.fitted = false;
    const target = clampScale(scale);
    const world = this.screenToWorld(anchor);
    this.markZooming();
    if (!animate) {
      this.anim = null;
      this.cur = {
        scale: target,
        x: anchor.x - world.x * target,
        y: anchor.y - world.y * target,
      };
      this.apply();
      return;
    }
    this.anim = {
      kind: "anchor",
      target,
      ax: anchor.x,
      ay: anchor.y,
      wx: world.x,
      wy: world.y,
    };
    this.start();
  }

  /** Centre a world-space rectangle in the view (e.g. zoom to selection). */
  zoomToRect(
    r: { x: number; y: number; width: number; height: number },
    animate = this.smooth
  ) {
    this.fitted = false;
    const { top, right, bottom, left } = this.insets;
    const availW = Math.max(40, this.size.width - left - right);
    const availH = Math.max(40, this.size.height - top - bottom);
    const scale = clampScale(
      Math.min(availW / Math.max(1, r.width), availH / Math.max(1, r.height)) * 0.85
    );
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    this.tweenTo(
      { scale, x: left + availW / 2 - cx * scale, y: top + availH / 2 - cy * scale },
      animate
    );
  }

  panBy(dx: number, dy: number) {
    this.fitted = false;
    if (this.anim?.kind === "tween") this.anim = null;
    if (this.anim?.kind === "anchor") {
      this.anim.ax += dx;
      this.anim.ay += dy;
    }
    this.cur = { ...this.cur, x: this.cur.x + dx, y: this.cur.y + dy };
    this.apply();
  }

  set(state: ViewState, animate = false) {
    this.tweenTo(state, animate);
  }

  private tweenTo(to: ViewState, animate: boolean, duration = 320) {
    this.markZooming();
    if (!animate) {
      this.anim = null;
      this.cur = to;
      this.apply();
      return;
    }
    this.anim = {
      kind: "tween",
      from: { ...this.cur },
      to,
      start: performance.now(),
      duration,
    };
    this.start();
  }

  private markZooming() {
    if (!useView.getState().zooming) useView.setState({ zooming: true });
    window.clearTimeout(this.zoomingTimer);
    this.zoomingTimer = window.setTimeout(() => {
      if (!this.anim) useView.setState({ zooming: false });
    }, 180);
  }

  private start() {
    if (this.raf) return;
    this.lastFrame = performance.now();
    const step = (now: number) => {
      const dt = Math.min(64, now - this.lastFrame);
      this.lastFrame = now;
      const done = this.tick(now, dt);
      this.apply();
      if (done) {
        this.raf = 0;
        this.anim = null;
        this.markZooming();
        return;
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  private tick(now: number, dt: number): boolean {
    const a = this.anim;
    if (!a) return true;
    if (a.kind === "anchor") {
      const k = 1 - Math.exp(-dt / 55);
      const ls = Math.log(this.cur.scale);
      const lt = Math.log(a.target);
      const next = Math.abs(lt - ls) < 0.0015 ? lt : lerp(ls, lt, k);
      const scale = Math.exp(next);
      this.cur = { scale, x: a.ax - a.wx * scale, y: a.ay - a.wy * scale };
      return next === lt;
    }
    const t = Math.min(1, (now - a.start) / a.duration);
    const e = easeOutCubic(t);
    this.cur = {
      scale: Math.exp(lerp(Math.log(a.from.scale), Math.log(a.to.scale), e)),
      x: lerp(a.from.x, a.to.x, e),
      y: lerp(a.from.y, a.to.y, e),
    };
    return t >= 1;
  }

  /**
   * `data-view-moving` on <html> while the view pans / zooms, so costly
   * effects can pause (see .glass in index.css).
   */
  private markMoving() {
    const root = document.documentElement;
    if (!root.hasAttribute("data-view-moving")) root.setAttribute("data-view-moving", "");
    window.clearTimeout(this.movingTimer);
    this.movingTimer = window.setTimeout(() => root.removeAttribute("data-view-moving"), 160);
  }

  private apply() {
    this.markMoving();
    const { x, y, scale } = this.cur;
    if (this.stage) {
      this.stage.scale({ x: scale, y: scale });
      this.stage.position({ x, y });
      this.stage.batchDraw();
    }
    useView.setState({
      x,
      y,
      scale,
      width: this.size.width,
      height: this.size.height,
    });
  }
}

export const viewport = new ViewportController();
