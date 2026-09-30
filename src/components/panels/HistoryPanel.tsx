import {
  CropIcon,
  EraserIcon,
  FlipHorizontal2Icon,
  FlipVertical2Icon,
  HistoryIcon,
  ImageIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  Redo2Icon,
  RotateCcwIcon,
  RotateCwIcon,
  SlidersHorizontalIcon,
  SplineIcon,
  TrashIcon,
  Undo2Icon,
  WandSparklesIcon,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef } from "react";
import { ScreenFloatingPanel } from "@/components/panels/FloatingPanel";
import { Button } from "@/components/ui/button";
import { annotationLabel } from "@/lib/annotations";
import { FILTER_SPECS, isDefaultFilters } from "@/lib/filters";
import { cn } from "@/lib/utils";
import { type Doc, useDoc } from "@/state/document";
import { useUi } from "@/state/ui";
import { midSentence, t, useT } from "@/lib/i18n";

interface Step {
  label: string;
  icon: React.ReactNode;
}


/** A short name for what changed between two history states. */
export function describeStep(prev: Doc, next: Doc): Step {
  // Everything back to the start at once.
  const cleared =
    next.annotations.length === 0 &&
    isDefaultFilters(next.filters) &&
    !next.curves &&
    !next.levels &&
    next.rotation % 360 === 0 &&
    !next.flipX &&
    !next.flipY;
  const changes =
    Number(prev.image !== next.image) +
    Number(prev.rotation !== next.rotation) +
    Number(prev.flipX !== next.flipX || prev.flipY !== next.flipY) +
    Number(prev.filters !== next.filters) +
    Number(prev.curves !== next.curves || prev.levels !== next.levels) +
    Number(prev.annotations !== next.annotations);
  if (cleared && changes > 1) return { label: t("Reset all edits"), icon: <RotateCcwIcon /> };

  if (prev.image !== next.image) {
    const a = prev.image;
    const b = next.image;
    if (b.backgroundRemoved && !a.backgroundRemoved) return { label: t("Remove background"), icon: <EraserIcon /> };
    if (a.width !== b.width || a.height !== b.height) {
      const sameShape = Math.abs(a.width / a.height - b.width / b.height) < 0.01;
      return sameShape
        ? { label: t("Resize to {width} × {height}", { width: b.width, height: b.height }), icon: <ImageIcon /> }
        : { label: t("Crop to {width} × {height}", { width: b.width, height: b.height }), icon: <CropIcon /> };
    }
    return { label: t("Edit image"), icon: <WandSparklesIcon /> };
  }
  if (prev.rotation !== next.rotation) {
    return next.rotation > prev.rotation
      ? { label: t("Rotate right"), icon: <RotateCwIcon /> }
      : { label: t("Rotate left"), icon: <RotateCcwIcon /> };
  }
  if (prev.flipX !== next.flipX || prev.flipY !== next.flipY) {
    // Name the flip as it looks on screen: at 90° / 270° the image's axes swap.
    const sideways = ((prev.rotation % 180) + 180) % 180 === 90;
    const horizontal = (prev.flipX !== next.flipX) !== sideways;
    return horizontal
      ? { label: t("Flip horizontal"), icon: <FlipHorizontal2Icon /> }
      : { label: t("Flip vertical"), icon: <FlipVertical2Icon /> };
  }

  if (prev.filters !== next.filters) {
    if (isDefaultFilters(next.filters)) return { label: t("Reset adjustments"), icon: <SlidersHorizontalIcon /> };
    const changed = FILTER_SPECS.filter((f) => prev.filters[f.key] !== next.filters[f.key]);
    if (changed.length === 1) return { label: changed[0].label, icon: <SlidersHorizontalIcon /> };
    return { label: t("Adjustments"), icon: <SlidersHorizontalIcon /> };
  }
  if (prev.curves !== next.curves) return { label: next.curves ? t("Curves") : t("Reset curves"), icon: <SplineIcon /> };
  if (prev.levels !== next.levels) return { label: next.levels ? t("Levels") : t("Reset levels"), icon: <SplineIcon /> };

  if (prev.annotations !== next.annotations) {
    const before = new Map(prev.annotations.map((a) => [a.id, a]));
    const after = new Map(next.annotations.map((a) => [a.id, a]));
    const added = next.annotations.filter((a) => !before.has(a.id));
    const removed = prev.annotations.filter((a) => !after.has(a.id));
    if (added.length) {
      return {
        label:
          added.length === 1
            ? t("Add {item}", { item: midSentence(annotationLabel(added[0])) })
            : t("Add {count} items", { count: added.length }),
        icon: <PlusIcon />,
      };
    }
    if (removed.length) {
      return {
        label:
          removed.length === 1
            ? t("Delete {item}", { item: midSentence(annotationLabel(removed[0])) })
            : t("Delete {count} items", { count: removed.length }),
        icon: <TrashIcon />,
      };
    }
    const edited = next.annotations.filter((a) => before.get(a.id) !== a);
    if (edited.length === 0) return { label: t("Reorder layers"), icon: <LayersIcon /> };
    return {
      label:
        edited.length === 1
          ? t("Edit {item}", { item: midSentence(annotationLabel(edited[0])) })
          : t("Edit {count} items", { count: edited.length }),
      icon: <PencilIcon />,
    };
  }
  return { label: t("Edit"), icon: <PencilIcon /> };
}

/** Every step since the image was opened; click one to go back (or forward) to it. */
export function HistoryPanel() {
  const t = useT();
  const open = useUi((s) => s.panels.history);
  const togglePanel = useUi((s) => s.togglePanel);
  const doc = useDoc((s) => s.doc);
  const past = useDoc((s) => s.past);
  const future = useDoc((s) => s.future);
  const listRef = useRef<HTMLDivElement>(null);

  const states = useMemo(() => (doc ? [...past, doc, ...future] : []), [doc, past, future]);
  const current = past.length;
  const steps = useMemo(
    () => states.map((s, i) => (i === 0 ? null : describeStep(states[i - 1], s))),
    [states]
  );

  // Keep the current step in view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-step="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, current]);

  const jumpTo = useDoc((s) => s.jumpTo);

  return (
    <ScreenFloatingPanel
      bodyClassName="p-2"
      footer={
        <>
          <Button disabled={current === 0} onClick={() => useDoc.getState().undo()} size="sm" variant="outline">
            <Undo2Icon /> {t("Undo")}
          </Button>
          <Button disabled={future.length === 0} onClick={() => useDoc.getState().redo()} size="sm" variant="outline">
            {t("Redo")} <Redo2Icon />
          </Button>
        </>
      }
      icon={<HistoryIcon />}
      initialPosition={(vp, size) => ({ x: vp.width - size.width - 16, y: 60 })}
      initialSize={{ width: 280, height: 420 }}
      minSize={{ width: 240, height: 200 }}
      onOpenChange={(o) => togglePanel("history", o)}
      open={open}
      title={`${t("History")}${states.length > 1 ? ` · ${states.length - 1}` : ""}`}
    >
      <div aria-label={t("Edit history")} className="flex flex-col gap-0.5" ref={listRef} role="listbox">
        {states.map((_, i) => {
          const step = steps[i];
          const isCurrent = i === current;
          const undone = i > current;
          return (
            <button
              aria-selected={isCurrent}
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none transition-colors",
                "hover:bg-accent focus-visible:bg-accent [&_svg]:size-3.5 [&_svg]:shrink-0",
                isCurrent && "bg-brand/15 text-brand hover:bg-brand/20",
                undone && "text-muted-foreground/60"
              )}
              data-step={i}
              key={i}
              onClick={() => jumpTo(i)}
              role="option"
              title={isCurrent ? t("Current state") : undone ? t("Click to redo up to here") : t("Click to go back to here")}
              type="button"
            >
              {step ? step.icon : <ImageIcon />}
              <span className="min-w-0 flex-1 truncate">{step ? step.label : states.length > 150 ? t("Earlier") : t("Opened image")}</span>
            </button>
          );
        })}
      </div>
      {states.length <= 1 && (
        <p className="px-2 py-4 text-center text-muted-foreground text-xs">
          {t("Your edits will appear here. Click any step to go back to it.")}
        </p>
      )}
    </ScreenFloatingPanel>
  );
}
