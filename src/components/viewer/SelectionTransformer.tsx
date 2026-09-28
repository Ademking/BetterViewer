import type Konva from "konva";
import { useEffect, useMemo, useRef } from "react";
import { Circle, Transformer } from "react-konva";
import {
  type Annotation,
  bakeTransform,
  type PointsAnnotation,
} from "@/lib/annotations";
import { stageRegistry } from "@/lib/stageRegistry";
import { useView } from "@/lib/viewport";
import { updateAnnotations, updateDoc, useDoc } from "@/state/document";
import { useSettings } from "@/state/settings";
import { useUi } from "@/state/ui";

export const ACCENT = "#3182ed";

const CORNER_ANCHORS = ["top-left", "top-right", "bottom-left", "bottom-right"];

const TEXT_ANCHORS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "middle-left",
  "middle-right",
];

/** Transformer for the current selection (resize / rotate / move). */
export function SelectionTransformer() {
  const trRef = useRef<Konva.Transformer>(null);
  const selectedIds = useUi((s) => s.selectedIds);
  const tool = useUi((s) => s.tool);
  const editingTextId = useUi((s) => s.editingTextId);
  const annotations = useDoc((s) => s.doc?.annotations);
  const showHandles = useSettings((s) => s.showSelectionHandles);

  const selected = useMemo(
    () => annotations?.filter((a) => selectedIds.includes(a.id)) ?? [],
    [annotations, selectedIds]
  );

  // A single line / arrow is edited with endpoint handles instead.
  const singleLine = isSingleLine(selected) && showHandles;
  const onlyText = selected.length > 0 && selected.every((a) => a.type === "text");
  const onlyCounters = selected.length > 0 && selected.every((a) => a.type === "counter");
  const anyRedact = selected.some((a) => a.type === "redact");
  const onlyImages = selected.length > 0 && selected.every((a) => a.type === "image");
  const onlyEmoji = selected.length > 0 && selected.every((a) => a.type === "emoji");
  const active = tool === "select" && !editingTextId && !singleLine;

  useEffect(() => {
    const tr = trRef.current;
    const layer = stageRegistry.annotationLayer;
    if (!tr || !layer) return;
    const nodes = active
      ? selected
          .map((a) => layer.findOne(`#${a.id}`))
          .filter((n): n is Konva.Node => !!n)
      : [];
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selected, active]);

  const handleTransformEnd = () => {
    const tr = trRef.current;
    if (!tr) return;
    const updates = new Map<string, Konva.Node>();
    for (const n of tr.nodes()) updates.set(n.id(), n);
    updateDoc((d) => ({
      ...d,
      annotations: d.annotations.map((a) => {
        const n = updates.get(a.id);
        if (!n) return a;
        const next = bakeTransform(a, {
          x: n.x(),
          y: n.y(),
          rotation: n.rotation(),
          scaleX: n.scaleX(),
          scaleY: n.scaleY(),
          textWidth:
            a.type === "text" ? (n as Konva.Label).getText().width() : undefined,
        });
        n.scale({ x: 1, y: 1 });
        return next;
      }),
    }));
  };

  return (
    <>
      <Transformer
        anchorCornerRadius={3}
        anchorFill="#ffffff"
        anchorSize={9}
        anchorStroke={ACCENT}
        anchorStrokeWidth={1.5}
        borderStroke={ACCENT}
        borderStrokeWidth={1.5}
        enabledAnchors={onlyText ? TEXT_ANCHORS : onlyCounters || onlyEmoji ? CORNER_ANCHORS : undefined}
        flipEnabled={false}
        ignoreStroke
        keepRatio={onlyText || onlyCounters || onlyImages || onlyEmoji}
        onTransformEnd={handleTransformEnd}
        padding={4}
        ref={trRef}
        resizeEnabled={showHandles}
        rotateAnchorOffset={22}
        rotateEnabled={showHandles && !anyRedact}
        rotationSnapTolerance={6}
        rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
        shouldOverdrawWholeArea={false}
        boundBoxFunc={(oldBox, newBox) =>
          Math.abs(newBox.width) < 4 || Math.abs(newBox.height) < 4 ? oldBox : newBox
        }
      />
    </>
  );
}

const isSingleLine = (selected: Annotation[]) =>
  selected.length === 1 &&
  (selected[0].type === "line" || selected[0].type === "arrow") &&
  selected[0].rotation === 0;

/** Endpoint handles for a selected line/arrow; rendered in document space. */
export function SelectedLineHandles() {
  const selectedIds = useUi((s) => s.selectedIds);
  const tool = useUi((s) => s.tool);
  const showHandles = useSettings((s) => s.showSelectionHandles);
  const annotations = useDoc((s) => s.doc?.annotations);
  if (tool !== "select" || !showHandles || selectedIds.length !== 1) return null;
  const selected = annotations?.filter((a) => a.id === selectedIds[0]) ?? [];
  if (!isSingleLine(selected)) return null;
  return <LineHandles a={selected[0] as PointsAnnotation} />;
}

/** Draggable endpoint handles for a straight line or arrow. */
function LineHandles({ a }: { a: PointsAnnotation }) {
  const scale = useView((s) => s.scale);
  const gesture = useRef(0);
  const r = 6 / scale;
  const ends = [
    { i: 0, x: a.x + a.points[0], y: a.y + a.points[1] },
    { i: 2, x: a.x + a.points[2], y: a.y + a.points[3] },
  ];

  const move = (i: number, e: Konva.KonvaEventObject<DragEvent>) => {
    const p = e.target.position();
    updateAnnotations(
      [a.id],
      (cur) => {
        if (cur.type !== "line" && cur.type !== "arrow") return cur;
        const abs = [
          cur.x + cur.points[0],
          cur.y + cur.points[1],
          cur.x + cur.points[2],
          cur.y + cur.points[3],
        ];
        abs[i] = p.x;
        abs[i + 1] = p.y;
        return {
          ...cur,
          x: abs[0],
          y: abs[1],
          rotation: 0,
          points: [0, 0, abs[2] - abs[0], abs[3] - abs[1]],
        };
      },
      { key: `line-handle-${a.id}-${gesture.current}` }
    );
  };

  return (
    <>
      {ends.map((end) => (
        <Circle
          draggable
          fill="#ffffff"
          hitStrokeWidth={10 / scale}
          key={end.i}
          name="line-handle"
          onDragMove={(e) => move(end.i, e)}
          onDragStart={() => {
            gesture.current = performance.now();
          }}
          onMouseEnter={(e) => {
            const c = e.target.getStage()?.container();
            if (c) c.style.cursor = "move";
          }}
          onMouseLeave={(e) => {
            const c = e.target.getStage()?.container();
            if (c) c.style.cursor = "";
          }}
          radius={r}
          shadowBlur={4 / scale}
          shadowColor="rgba(0,0,0,0.4)"
          stroke={ACCENT}
          strokeWidth={2 / scale}
          x={end.x}
          y={end.y}
        />
      ))}
    </>
  );
}
