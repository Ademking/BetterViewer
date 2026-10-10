import {
  CopyIcon,
  EllipsisIcon,
  FileImageIcon,
  ImageDownIcon,
  PauseIcon,
  PlayIcon,
  StepBackIcon,
  StepForwardIcon,
} from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { ToolButton } from "@/components/tools/ToolButton";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
} from "@/components/ui/menu";
import { copyFrame, keepOnlyFrame, saveFrame } from "@/lib/actions";
import {
  type Animation,
  SPEEDS,
  setSpeed,
  showFrame,
  stepFrame,
  togglePlay,
  usePlayer,
} from "@/lib/animation";
import { useShortcutText } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { currentLanguage, useT } from "@/lib/i18n";

/** Height of the frame preview shown over the timeline (CSS px). */
const PREVIEW_H = 64;
/** Previews kept per animation; older ones are made again when needed. */
const MAX_PREVIEWS = 200;

/** Frame previews made so far, per animation, least recently used first. */
const previewCache = new WeakMap<Animation, Map<number, Promise<ImageBitmap>>>();

function preview(animation: Animation, i: number) {
  let previews = previewCache.get(animation);
  if (!previews) previewCache.set(animation, (previews = new Map()));
  let job = previews.get(i);
  if (job) previews.delete(i);
  else job = animation.thumbnail(i, Math.round(PREVIEW_H * (window.devicePixelRatio || 1)));
  previews.set(i, job);
  // Dropped previews are left to the garbage collector: one may still be on its way to a canvas.
  for (const key of previews.keys()) {
    if (previews.size <= MAX_PREVIEWS) break;
    previews.delete(key);
  }
  return job;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** "1.5×", in the interface language's number format. */
const speedLabel = (speed: number) => `${new Intl.NumberFormat(currentLanguage()).format(speed)}×`;

/**
 * Compact player for an animated image: play / pause, step one frame, a
 * timeline to click or drag to any frame (hover it to preview the frame
 * there), the playback speed and what to do with the frame on screen. Play
 * goes on from the frame shown.
 */
export const AnimationBar = memo(function AnimationBar() {
  const t = useT();
  const animation = usePlayer((s) => s.animation);
  const index = usePlayer((s) => s.index);
  const seeking = usePlayer((s) => s.seeking);
  const playing = usePlayer((s) => s.playing);
  if (!animation) return null;
  const count = animation.count;
  const shown = seeking ?? index;

  return (
    <div className="glass flex h-10 w-[min(calc(100vw-1.5rem),30rem)] animate-in items-center gap-0.5 rounded-full border px-1 shadow-lg/10 fade-in-0 slide-in-from-bottom-2 duration-200">
      <ToolButton
        className="size-8 rounded-full"
        command="playPause"
        label={playing ? t("Pause") : t("Play")}
        onClick={togglePlay}
      >
        {playing ? <PauseIcon className="fill-current" /> : <PlayIcon className="fill-current" />}
      </ToolButton>
      <ToolButton
        className="size-7 rounded-full max-sm:hidden"
        command="previousFrame"
        label={t("Previous frame")}
        onClick={() => stepFrame(-1)}
      >
        <StepBackIcon className="size-3.5" />
      </ToolButton>
      <ToolButton
        className="size-7 rounded-full max-sm:hidden"
        command="nextFrame"
        label={t("Next frame")}
        onClick={() => stepFrame(1)}
      >
        <StepForwardIcon className="size-3.5" />
      </ToolButton>
      <Timeline animation={animation} current={shown} />
      <span
        aria-hidden
        className="shrink-0 px-1.5 font-medium text-[11px] text-muted-foreground tabular-nums"
        // Room for the widest count, so the bar doesn't twitch while playing.
        style={{ minWidth: `${String(count).length * 2 + 3}ch` }}
      >
        <span className="text-foreground">{shown + 1}</span> / {count}
      </span>
      <SpeedMenu />
      <FrameMenu />
    </div>
  );
});

/** Playback speed (for viewing: saved files keep their own timing). */
function SpeedMenu() {
  const t = useT();
  const speed = usePlayer((s) => s.speed);
  return (
    <Menu positioning={{ placement: "top", gutter: 10 }}>
      <MenuTrigger asChild>
        <ToolButton
          className={cn(
            "h-7 w-auto shrink-0 rounded-full px-2 font-medium text-[11px] tabular-nums",
            speed !== 1 && "text-brand hover:text-brand"
          )}
          label={t("Playback speed")}
        >
          {speedLabel(speed)}
        </ToolButton>
      </MenuTrigger>
      <MenuContent className="w-max min-w-36">
        <MenuRadioGroup
          heading={t("Playback speed")}
          onValueChange={(d) => setSpeed(Number(d.value))}
          value={String(speed)}
        >
          {SPEEDS.map((s) => (
            <MenuRadioItem key={s} value={String(s)}>
              <span className="tabular-nums">{s === 1 ? `${speedLabel(s)} (${t("Normal")})` : speedLabel(s)}</span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}

/** What to do with the frame on screen. */
function FrameMenu() {
  const t = useT();
  const keys = useShortcutText();
  return (
    <Menu positioning={{ placement: "top-end", gutter: 10 }}>
      <MenuTrigger asChild>
        <ToolButton className="size-7 shrink-0 rounded-full" label={t("This frame")}>
          <EllipsisIcon className="size-4" />
        </ToolButton>
      </MenuTrigger>
      <MenuContent className="w-max min-w-56">
        <MenuItem onSelect={() => void copyFrame()} value="copy-frame">
          <CopyIcon /> {t("Copy this frame")}
          <MenuShortcut>{keys("copyImage")}</MenuShortcut>
        </MenuItem>
        <MenuItem onSelect={() => void saveFrame()} value="save-frame">
          <ImageDownIcon /> {t("Save this frame as PNG")}
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => void keepOnlyFrame()} value="keep-frame">
          <FileImageIcon /> {t("Keep only this frame")}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function Timeline({ animation, current }: { animation: Animation; current: number }) {
  const t = useT();
  const trackRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ index: number; x: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const count = animation.count;
  const last = count - 1;
  const pos = (i: number) => (last > 0 ? i / last : 0);

  /** Frame under a pointer, and where it is along the track (px). */
  const at = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    const p = clamp((clientX - r.left) / r.width, 0, 1);
    return { index: Math.round(p * last), x: p * r.width };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    setDragging(true);
    const hit = at(e.clientX);
    setHover(hit);
    showFrame(hit.index);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const hit = at(e.clientX);
    setHover(hit);
    if (dragging && hit.index !== current) showFrame(hit.index);
  };
  const onPointerUp = () => setDragging(false);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const big = Math.max(1, Math.round(count / 10));
    // From the frame on its way, so held-down keys don't lose steps.
    const { seeking, index } = usePlayer.getState();
    const from = seeking ?? index;
    const to =
      e.key === "ArrowLeft" || e.key === "ArrowDown"
        ? from - 1
        : e.key === "ArrowRight" || e.key === "ArrowUp"
          ? from + 1
          : e.key === "PageDown"
            ? from - big
            : e.key === "PageUp"
              ? from + big
              : e.key === "Home"
                ? 0
                : e.key === "End"
                  ? last
                  : null;
    if (to === null) return;
    // The board's own keys (nudge, gallery) mustn't see these.
    e.preventDefault();
    e.stopPropagation();
    showFrame(clamp(to, 0, last));
  };

  const fill = pos(current) * 100;

  return (
    <div
      aria-label={t("Go to frame")}
      aria-valuemax={count}
      aria-valuemin={1}
      aria-valuenow={current + 1}
      aria-valuetext={t("Frame {current} of {total}", { current: current + 1, total: count })}
      className="group relative mx-2 flex h-full min-w-0 flex-1 cursor-pointer touch-none items-center outline-none"
      onKeyDown={onKeyDown}
      onPointerCancel={onPointerUp}
      onPointerDown={onPointerDown}
      onPointerLeave={() => !dragging && setHover(null)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      ref={trackRef}
      role="slider"
      tabIndex={0}
    >
      <div className="relative h-1 w-full rounded-full bg-foreground/15 transition-[height] group-hover:h-1.5 group-focus-visible:h-1.5">
        <div className="absolute inset-y-0 start-0 rounded-full bg-brand" style={{ width: `${fill}%` }} />
      </div>
      <div
        className={cn(
          "pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm ring-2 ring-brand transition-transform",
          "scale-0 group-hover:scale-100 group-focus-visible:scale-100",
          dragging && "scale-100"
        )}
        style={{ left: `${fill}%` }}
      />
      {hover && <FramePreview animation={animation} index={hover.index} x={hover.x} />}
    </div>
  );
}

/** The frame under the pointer, floating over the timeline. */
function FramePreview({ animation, index, x }: { animation: Animation; index: number; x: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const width = Math.round(clamp((PREVIEW_H * animation.width) / animation.height, 24, PREVIEW_H * 2));

  useEffect(() => {
    let cancelled = false;
    preview(animation, index).then(
      (bitmap) => {
        const c = ref.current;
        if (cancelled || !c) return;
        c.width = bitmap.width;
        c.height = bitmap.height;
        c.getContext("2d")?.drawImage(bitmap, 0, 0);
      },
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, [animation, index]);

  return (
    <div
      className="glass pointer-events-none absolute bottom-full mb-3 flex -translate-x-1/2 flex-col items-center gap-1 rounded-lg border p-1 shadow-lg/20"
      style={{ left: x }}
    >
      <canvas className="checker-sm block rounded-[5px]" ref={ref} style={{ width, height: PREVIEW_H }} />
      <span className="font-medium text-[10px] text-muted-foreground tabular-nums leading-none">{index + 1}</span>
    </div>
  );
}
