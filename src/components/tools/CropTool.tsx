import type Konva from "konva";
import { CheckIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Rect, Shape, Transformer } from "react-konva";
import { Button } from "@/components/ui/button";
import { SegmentGroup, SegmentGroupItem, SegmentGroupItemText } from "@/components/ui/segment-group";
import { toast } from "@/components/ui/toast";
import { cropImage } from "@/lib/image";
import { stageRegistry } from "@/lib/stageRegistry";
import { useView, viewport } from "@/lib/viewport";
import { getDoc, normRotation, updateDoc, useDoc } from "@/state/document";
import { type CropRect, getUi, useUi } from "@/state/ui";
import { ACCENT } from "@/components/viewer/SelectionTransformer";

export const ASPECTS: { id: string; label: string; value: number | null | "original" }[] = [
  { id: "free", label: "Free", value: null },
  { id: "original", label: "Original", value: "original" },
  { id: "1:1", label: "1:1", value: 1 },
  { id: "4:3", label: "4:3", value: 4 / 3 },
  { id: "3:2", label: "3:2", value: 3 / 2 },
  { id: "16:9", label: "16:9", value: 16 / 9 },
  { id: "9:16", label: "9:16", value: 9 / 16 },
];

const MIN_CROP = 8;

/** Largest rect with the given local aspect inside the image, centred on `c`. */
const fitAspect = (
  imgW: number,
  imgH: number,
  aspect: number,
  c: { x: number; y: number }
): CropRect => {
  let w = imgW;
  let h = w / aspect;
  if (h > imgH) {
    h = imgH;
    w = h * aspect;
  }
  const x = Math.min(Math.max(0, c.x - w / 2), imgW - w);
  const y = Math.min(Math.max(0, c.y - h / 2), imgH - h);
  return { x, y, width: w, height: h };
};

export const startCrop = () => {
  const doc = getDoc();
  if (!doc) return;
  const ui = getUi();
  ui.set({
    tool: "crop",
    selectedIds: [],
    editingTextId: null,
    crop: {
      rect: { x: 0, y: 0, width: doc.image.width, height: doc.image.height },
      aspect: null,
      aspectId: "free",
    },
  });
};

export const setCropAspect = (id: string) => {
  const doc = getDoc();
  const crop = getUi().crop;
  if (!doc || !crop) return;
  const spec = ASPECTS.find((a) => a.id === id);
  if (!spec) return;
  const { width: W, height: H } = doc.image;
  const r = normRotation(doc.rotation);
  const swapped = r === 90 || r === 270;
  const displayAspect: number | null =
    spec.value === "original" ? (swapped ? H / W : W / H) : spec.value;
  if (displayAspect === null) {
    getUi().setCrop({ ...crop, aspect: null, aspectId: id });
    return;
  }
  const local = swapped ? 1 / displayAspect : displayAspect;
  const c = {
    x: crop.rect.x + crop.rect.width / 2,
    y: crop.rect.y + crop.rect.height / 2,
  };
  getUi().setCrop({
    rect: fitAspect(W, H, local, c),
    aspect: displayAspect,
    aspectId: id,
  });
};

export const cancelCrop = () => getUi().set({ crop: null, tool: "select" });

export async function applyCrop() {
  const doc = getDoc();
  const crop = getUi().crop;
  if (!doc || !crop) return;
  const { x, y, width, height } = crop.rect;
  const full =
    x < 0.5 && y < 0.5 &&
    Math.abs(width - doc.image.width) < 1 &&
    Math.abs(height - doc.image.height) < 1;
  if (full) {
    cancelCrop();
    return;
  }
  try {
    const image = await cropImage(doc.image, crop.rect);
    const dx = Math.round(x);
    const dy = Math.round(y);
    updateDoc((d) => ({
      ...d,
      image,
      annotations: d.annotations.map((a) => ({ ...a, x: a.x - dx, y: a.y - dy })),
    }));
    getUi().set({ crop: null, tool: "select" });
    viewport.fit();
    toast.success({ title: "Image cropped", description: `${image.width} × ${image.height} px` });
  } catch (err) {
    toast.error({ title: "Crop failed", description: String((err as Error).message) });
  }
}

/** Dimmed surround, frame and rule-of-thirds guides (document space). */
export function CropShapes() {
  const crop = useUi((s) => s.crop);
  const img = useDoc((s) => s.doc?.image);
  const scale = useView((s) => s.scale);
  if (!crop || !img) return null;
  const { x, y, width, height } = crop.rect;
  const px = 1 / scale;

  const commitNode = (node: Konva.Node) => {
    const rect = {
      x: node.x(),
      y: node.y(),
      width: Math.max(MIN_CROP, node.width() * node.scaleX()),
      height: Math.max(MIN_CROP, node.height() * node.scaleY()),
    };
    node.setAttrs({ ...rect, scaleX: 1, scaleY: 1 });
    const c = getUi().crop;
    if (c) getUi().setCrop({ ...c, rect });
  };

  return (
    <>
      <Shape
        listening={false}
        sceneFunc={(ctx) => {
          const c = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
          c.beginPath();
          c.rect(0, 0, img.width, img.height);
          c.rect(x, y, width, height);
          c.fillStyle = "rgba(0,0,0,0.58)";
          c.fill("evenodd");
        }}
      />
      <Shape
        listening={false}
        sceneFunc={(ctx) => {
          const c = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
          c.beginPath();
          for (let i = 1; i < 3; i++) {
            c.moveTo(x + (width * i) / 3, y);
            c.lineTo(x + (width * i) / 3, y + height);
            c.moveTo(x, y + (height * i) / 3);
            c.lineTo(x + width, y + (height * i) / 3);
          }
          c.strokeStyle = "rgba(255,255,255,0.35)";
          c.lineWidth = px;
          c.stroke();
          // Corner brackets
          const L = Math.min(22 * px, width / 3, height / 3);
          c.beginPath();
          const corners: [number, number, number, number][] = [
            [x, y, 1, 1],
            [x + width, y, -1, 1],
            [x, y + height, 1, -1],
            [x + width, y + height, -1, -1],
          ];
          for (const [cx, cy, sx, sy] of corners) {
            c.moveTo(cx, cy + sy * L);
            c.lineTo(cx, cy);
            c.lineTo(cx + sx * L, cy);
          }
          c.strokeStyle = "#fff";
          c.lineWidth = 3 * px;
          c.stroke();
        }}
      />
      <Rect
        draggable
        fill="rgba(0,0,0,0)"
        height={height}
        name="crop-rect"
        onDragEnd={(e) => commitNode(e.target)}
        onDragMove={(e) => {
          const n = e.target;
          n.x(Math.min(Math.max(0, n.x()), img.width - n.width()));
          n.y(Math.min(Math.max(0, n.y()), img.height - n.height()));
          commitNode(n);
        }}
        onMouseEnter={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = "move";
        }}
        onMouseLeave={(e) => {
          const c = e.target.getStage()?.container();
          if (c) c.style.cursor = "";
        }}
        onTransform={(e) => commitNode(e.target)}
        onTransformEnd={(e) => commitNode(e.target)}
        stroke="rgba(255,255,255,0.9)"
        strokeScaleEnabled={false}
        strokeWidth={1}
        width={width}
        x={x}
        y={y}
      />
    </>
  );
}

const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"];

/** Resize handles for the crop rectangle (layer space). */
export function CropTransformer() {
  const trRef = useRef<Konva.Transformer>(null);
  const hasCrop = useUi((s) => !!s.crop);
  const aspect = useUi((s) => s.crop?.aspect ?? null);
  const img = useDoc((s) => s.doc?.image);

  useEffect(() => {
    const tr = trRef.current;
    const node = stageRegistry.annotationLayer?.findOne(".crop-rect");
    if (!tr) return;
    tr.nodes(hasCrop && node ? [node] : []);
    tr.getLayer()?.batchDraw();
  });

  if (!hasCrop || !img) return null;

  return (
    <Transformer
      anchorCornerRadius={2}
      anchorFill="#ffffff"
      anchorSize={11}
      anchorStroke={ACCENT}
      borderEnabled={false}
      boundBoxFunc={(oldBox, newBox) => {
        const g = stageRegistry.annotationGroup;
        if (!g) return newBox;
        const inv = g.getAbsoluteTransform().copy().invert();
        const cos = Math.cos(newBox.rotation);
        const sin = Math.sin(newBox.rotation);
        const pts = [
          [0, 0],
          [newBox.width, 0],
          [newBox.width, newBox.height],
          [0, newBox.height],
        ].map(([u, v]) =>
          inv.point({
            x: newBox.x + u * cos - v * sin,
            y: newBox.y + u * sin + v * cos,
          })
        );
        const eps = 0.75;
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        const ok =
          Math.min(...xs) >= -eps &&
          Math.min(...ys) >= -eps &&
          Math.max(...xs) <= img.width + eps &&
          Math.max(...ys) <= img.height + eps &&
          Math.max(...xs) - Math.min(...xs) >= MIN_CROP &&
          Math.max(...ys) - Math.min(...ys) >= MIN_CROP;
        return ok ? newBox : oldBox;
      }}
      enabledAnchors={aspect ? CORNERS : undefined}
      flipEnabled={false}
      ignoreStroke
      keepRatio={!!aspect}
      ref={trRef}
      rotateEnabled={false}
    />
  );
}

/** Contextual controls shown above the toolbar while cropping. */
export function CropBar() {
  const crop = useUi((s) => s.crop);
  const rotation = useDoc((s) => s.doc?.rotation ?? 0);
  const [busy, setBusy] = useState(false);
  if (!crop) return null;
  const r = normRotation(rotation);
  const swapped = r === 90 || r === 270;
  const w = Math.round(swapped ? crop.rect.height : crop.rect.width);
  const h = Math.round(swapped ? crop.rect.width : crop.rect.height);

  return (
    <div className="glass flex max-w-[calc(100vw-2rem)] items-center gap-2 overflow-x-auto rounded-xl border p-1.5 shadow-lg/10">
      <SegmentGroup
        className="gap-0.5 rounded-lg"
        onValueChange={(d) => d.value && setCropAspect(d.value)}
        value={crop.aspectId}
      >
        {ASPECTS.map((a) => (
          <SegmentGroupItem
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground data-[state=checked]:text-foreground"
            key={a.id}
            value={a.id}
          >
            <SegmentGroupItemText>{a.label}</SegmentGroupItemText>
          </SegmentGroupItem>
        ))}
      </SegmentGroup>
      <div className="h-5 w-px shrink-0 bg-border" />
      <span className="shrink-0 px-1 font-mono text-xs tabular-nums text-muted-foreground">
        {w} × {h}
      </span>
      <Button
        aria-label="Reset crop"
        onClick={() => {
          const doc = getDoc();
          if (!doc) return;
          getUi().setCrop({
            rect: { x: 0, y: 0, width: doc.image.width, height: doc.image.height },
            aspect: null,
            aspectId: "free",
          });
        }}
        size="icon-sm"
        variant="ghost"
      >
        <RotateCcwIcon />
      </Button>
      <Button onClick={cancelCrop} size="sm" variant="ghost">
        <XIcon /> Cancel
      </Button>
      <Button
        isLoading={busy}
        onClick={async () => {
          setBusy(true);
          await applyCrop();
          setBusy(false);
        }}
        size="sm"
      >
        <CheckIcon /> Apply
      </Button>
    </div>
  );
}
