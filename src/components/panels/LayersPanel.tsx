import {
  ArrowDownIcon,
  ArrowUpIcon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  HighlighterIcon,
  ImageIcon,
  LayersIcon,
  PencilIcon,
  TrashIcon,
  TypeIcon,
  SpotlightIcon,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { ScreenFloatingPanel } from "@/components/panels/FloatingPanel";
import { PixelateIcon } from "@/components/tools/RedactTool";
import { SHAPE_ICONS } from "@/components/tools/ShapeTool";
import { Hinted } from "@/components/tools/ToolButton";
import { type Annotation, annotationLabel } from "@/lib/annotations";
import { EMOJI_FONT } from "@/lib/emoji";
import { cn } from "@/lib/utils";
import { updateDoc, useDoc } from "@/state/document";
import { getUi, useUi } from "@/state/ui";

/* ------------------------------------------------------------------ helpers */

function layerIcon(a: Annotation): React.ReactNode {
  switch (a.type) {
    case "rect":
      return SHAPE_ICONS[a.cornerRadius > 0 ? "roundRect" : "rect"];
    case "ellipse":
      return SHAPE_ICONS.ellipse;
    case "line":
      return SHAPE_ICONS.line;
    case "arrow":
      return SHAPE_ICONS[a.doubleHeaded ? "doubleArrow" : "arrow"];
    case "polygon":
      return SHAPE_ICONS[a.shape ?? "polygon"];
    case "path":
      return a.highlighter ? <HighlighterIcon /> : <PencilIcon />;
    case "text":
      return <TypeIcon />;
    case "counter":
      return SHAPE_ICONS.counter;
    case "redact":
      return <PixelateIcon />;
    case "image":
      return <ImageIcon />;
    case "spotlight":
      return <SpotlightIcon />;
    case "emoji":
      return (
        <span className="text-[15px] leading-none" style={{ fontFamily: EMOJI_FONT }}>
          {a.emoji}
        </span>
      );
  }
}

function layerName(a: Annotation) {
  if (a.type === "text") return a.text.trim().split("\n")[0] || "Text";
  if (a.type === "image") return a.name.replace(/\.[^.]+$/, "") || "Image";
  return annotationLabel(a);
}

/** Small color chip for layers that have one. */
function layerColor(a: Annotation): string | null {
  if (a.type === "text" || a.type === "counter") return a.fill;
  if ("stroke" in a) return a.stroke;
  return null;
}

/** Move the annotation with `id` to array index `to` (0 = bottom). */
function moveLayer(id: string, to: number) {
  updateDoc((d) => {
    const list = [...d.annotations];
    const from = list.findIndex((a) => a.id === id);
    if (from < 0 || from === to) return d;
    const [item] = list.splice(from, 1);
    list.splice(Math.max(0, Math.min(list.length, to)), 0, item);
    return { ...d, annotations: list };
  });
}

const deleteLayer = (id: string) => {
  updateDoc((d) => ({ ...d, annotations: d.annotations.filter((a) => a.id !== id) }));
  const ui = getUi();
  ui.select(ui.selectedIds.filter((s) => s !== id));
};

const toggleHidden = (id: string) => {
  updateDoc((d) => ({
    ...d,
    annotations: d.annotations.map((a) => (a.id === id ? { ...a, hidden: !a.hidden } : a)),
  }));
  // A hidden layer can't stay selected on the canvas.
  const ui = getUi();
  ui.select(ui.selectedIds.filter((s) => s !== id));
};

/* ------------------------------------------------------------------ row */

function IconAction({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Hinted label={label}>
      <button
        aria-label={label}
        className={cn(
          "flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-3.5",
          danger && "hover:bg-destructive/15 hover:text-destructive-foreground"
        )}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        type="button"
      >
        {children}
      </button>
    </Hinted>
  );
}

interface RowProps {
  a: Annotation;
  /** Index in the annotation array (0 = bottom). */
  index: number;
  count: number;
  selected: boolean;
  dropHint: "above" | "below" | null;
  onDragStart: () => void;
  onDragOverRow: (e: React.DragEvent, above: boolean) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

function LayerRow({ a, index, count, selected, dropHint, onDragStart, onDragOverRow, onDrop, onDragEnd }: RowProps) {
  const color = layerColor(a);
  return (
    <div
      aria-selected={selected}
      className={cn(
        "group/layer relative flex h-9 cursor-default items-center gap-2 rounded-lg px-1.5 text-sm transition-colors",
        selected ? "bg-brand/15 text-foreground" : "hover:bg-accent/70",
        a.hidden && "text-muted-foreground"
      )}
      draggable
      onClick={(e) => {
        const ui = getUi();
        if (a.hidden) return;
        ui.set({ tool: "select", editingTextId: null });
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          ui.select(selected ? ui.selectedIds.filter((s) => s !== a.id) : [...ui.selectedIds, a.id]);
        } else {
          ui.select([a.id]);
        }
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        onDragOverRow(e, e.clientY < r.top + r.height / 2);
      }}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", a.id);
        onDragStart();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      role="option"
    >
      {dropHint && (
        <span
          className={cn(
            "pointer-events-none absolute inset-x-1 h-0.5 rounded-full bg-brand",
            dropHint === "above" ? "-top-px" : "-bottom-px"
          )}
        />
      )}
      <GripVerticalIcon className="size-3.5 shrink-0 cursor-grab text-muted-foreground/50 group-hover/layer:text-muted-foreground" />
      <span className={cn("flex size-5 shrink-0 items-center justify-center [&_svg]:size-4", a.hidden && "opacity-50")}>
        {layerIcon(a)}
      </span>
      <span className={cn("min-w-0 flex-1 truncate", a.hidden && "line-through decoration-muted-foreground/60")}>
        {layerName(a)}
      </span>
      {color && (
        <span
          className="size-3 shrink-0 rounded-[4px] ring-1 ring-foreground/20 ring-inset group-hover/layer:hidden"
          style={{ background: color }}
        />
      )}
      <span className="hidden items-center gap-0.5 group-hover/layer:flex">
        <IconAction disabled={index === count - 1} label="Move up" onClick={() => moveLayer(a.id, index + 1)}>
          <ArrowUpIcon />
        </IconAction>
        <IconAction disabled={index === 0} label="Move down" onClick={() => moveLayer(a.id, index - 1)}>
          <ArrowDownIcon />
        </IconAction>
        <IconAction danger label="Delete layer" onClick={() => deleteLayer(a.id)}>
          <TrashIcon />
        </IconAction>
      </span>
      <IconAction label={a.hidden ? "Show layer" : "Hide layer"} onClick={() => toggleHidden(a.id)}>
        {a.hidden ? <EyeOffIcon /> : <EyeIcon />}
      </IconAction>
    </div>
  );
}

/* ------------------------------------------------------------------ panel */

// Stable fallback: a fresh [] per render would make the store selector loop.
const NO_LAYERS: Annotation[] = [];

export function LayersPanel() {
  const open = useUi((s) => s.panels.layers);
  const togglePanel = useUi((s) => s.togglePanel);
  const selectedIds = useUi((s) => s.selectedIds);
  const annotations = useDoc((s) => s.doc?.annotations ?? NO_LAYERS);
  const image = useDoc((s) => s.doc?.image);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; above: boolean } | null>(null);

  const count = annotations.length;
  // Top of the stack first, like design tools.
  const rows = annotations.map((a, index) => ({ a, index })).reverse();

  const finishDrop = () => {
    if (dragId && drop && dragId !== drop.id) {
      const from = annotations.findIndex((a) => a.id === dragId);
      const target = annotations.findIndex((a) => a.id === drop.id);
      // "Above" in the list means higher in the stack (larger index).
      let to = drop.above ? target + 1 : target;
      if (from < to) to -= 1;
      moveLayer(dragId, to);
    }
    setDragId(null);
    setDrop(null);
  };

  return (
    <ScreenFloatingPanel
      bodyClassName="gap-0.5 p-2"
      icon={<LayersIcon />}
      initialPosition={(vp, size) => ({ x: vp.width - size.width - 16, y: 60 })}
      initialSize={{ width: 280, height: 420 }}
      minSize={{ width: 240, height: 200 }}
      onOpenChange={(o) => togglePanel("layers", o)}
      open={open}
      title={`Layers${count ? ` · ${count}` : ""}`}
    >
      <div className="flex flex-col gap-0.5" role="listbox" aria-label="Layers" aria-multiselectable>
        {rows.map(({ a, index }) => (
          <LayerRow
            a={a}
            count={count}
            dropHint={drop?.id === a.id && dragId !== a.id ? (drop.above ? "above" : "below") : null}
            index={index}
            key={a.id}
            onDragEnd={() => {
              setDragId(null);
              setDrop(null);
            }}
            onDragOverRow={(_, above) => setDrop({ id: a.id, above })}
            onDragStart={() => setDragId(a.id)}
            onDrop={finishDrop}
            selected={selectedIds.includes(a.id)}
          />
        ))}
      </div>

      {count === 0 && (
        <p className="px-2 py-4 text-center text-muted-foreground text-xs">
          Drawings, shapes, text and inserted images will appear here.
        </p>
      )}

      {image && (
        <div className="mt-1 flex h-10 items-center gap-2 rounded-lg border border-dashed px-1.5 text-muted-foreground text-sm">
          <img alt="" className="checkerboard checker-sm size-7 shrink-0 rounded object-cover" src={image.src} />
          <span className="min-w-0 flex-1 truncate">Image</span>
          <span className="pe-1 text-[11px]">Base</span>
        </div>
      )}
    </ScreenFloatingPanel>
  );
}
