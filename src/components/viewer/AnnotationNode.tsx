import type Konva from "konva";
import { memo } from "react";
import { Arrow, Circle, Ellipse, Group, Label, Line, Rect, Tag, Text } from "react-konva";
import type { Annotation, TextAnnotation } from "@/lib/annotations";
import { isTransparent } from "@/lib/annotations";
import { contrastText } from "@/lib/colors";
import { ImageLayerNode } from "@/components/viewer/ImageLayerNode";
import { EmojiNode } from "@/components/viewer/EmojiNode";
import { SpotlightNode } from "@/components/viewer/SpotlightNode";
import { RedactNode } from "@/components/viewer/RedactNode";
import { fontStack } from "@/lib/fonts";
import { stageRegistry } from "@/lib/stageRegistry";
import { updateDoc } from "@/state/document";
import { getSettings } from "@/state/settings";
import { getUi } from "@/state/ui";


export const textFontStyle = (a: Pick<TextAnnotation, "fontStyle" | "fontWeight">) =>
  [a.fontStyle === "italic" ? "italic" : "", a.fontWeight === "bold" ? "bold" : ""]
    .join(" ")
    .trim() || "normal";

export const textPadding = (fontSize: number) => fontSize * 0.25;

const snap = (v: number) => {
  const { snapToGrid, gridSize } = getSettings();
  return snapToGrid ? Math.round(v / gridSize) * gridSize : v;
};

const onDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
  const id = e.target.id();
  const { selectedIds, select } = getUi();
  if (!selectedIds.includes(id)) select([id]);
};

const onDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
  if (!getSettings().snapToGrid) return;
  const n = e.target;
  n.position({ x: snap(n.x()), y: snap(n.y()) });
};

/** Commit the positions of every selected node in a single undo step. */
const onDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
  const layer = stageRegistry.annotationLayer;
  const ids = new Set([...getUi().selectedIds, e.target.id()]);
  const pos = new Map<string, { x: number; y: number }>();
  for (const id of ids) {
    const node = layer?.findOne(`#${id}`);
    if (node) pos.set(id, { x: node.x(), y: node.y() });
  }
  updateDoc((d) => ({
    ...d,
    annotations: d.annotations.map((a) => {
      const p = pos.get(a.id);
      return p && (p.x !== a.x || p.y !== a.y) ? { ...a, ...p } : a;
    }),
  }));
};

/** Side handles on text change wrap width live instead of stretching glyphs. */
const onTextTransform = (e: Konva.KonvaEventObject<Event>) => {
  const label = e.currentTarget as unknown as Konva.Label;
  const tr = label.getStage()?.findOne("Transformer") as Konva.Transformer | undefined;
  const anchor = tr?.getActiveAnchor() ?? "";
  if (anchor === "middle-left" || anchor === "middle-right") {
    const text = label.getText();
    text.width(Math.max(text.fontSize(), text.width() * label.scaleX()));
    label.scaleX(1);
  }
};

interface Props {
  a: Annotation;
  draggable: boolean;
  hidden: boolean;
  hitWidth: number;
}

export const AnnotationNode = memo(function AnnotationNode({
  a,
  draggable,
  hidden,
  hitWidth,
}: Props) {
  const common = {
    id: a.id,
    name: "annotation",
    x: a.x,
    y: a.y,
    rotation: a.rotation,
    opacity: a.opacity,
    draggable,
    visible: !hidden,
    perfectDrawEnabled: false,
    onDragStart,
    onDragMove,
    onDragEnd,
  };

  switch (a.type) {
    case "rect":
      return (
        <Rect
          {...common}
          cornerRadius={a.cornerRadius}
          fill={isTransparent(a.fill) ? undefined : a.fill}
          fillEnabled={!isTransparent(a.fill)}
          height={a.height}
          hitStrokeWidth={Math.max(a.strokeWidth, hitWidth)}
          lineJoin="round"
          stroke={a.stroke}
          strokeWidth={a.strokeWidth}
          width={a.width}
        />
      );
    case "ellipse":
      return (
        <Ellipse
          {...common}
          fill={isTransparent(a.fill) ? undefined : a.fill}
          fillEnabled={!isTransparent(a.fill)}
          hitStrokeWidth={Math.max(a.strokeWidth, hitWidth)}
          radiusX={a.radiusX}
          radiusY={a.radiusY}
          stroke={a.stroke}
          strokeWidth={a.strokeWidth}
        />
      );
    case "arrow":
      return (
        <Arrow
          {...common}
          fill={a.stroke}
          hitStrokeWidth={Math.max(a.strokeWidth, hitWidth)}
          lineCap="round"
          lineJoin="round"
          pointerAtBeginning={!!a.doubleHeaded}
          pointerLength={Math.max(8, a.strokeWidth * 3.4)}
          pointerWidth={Math.max(8, a.strokeWidth * 3.2)}
          points={a.points}
          stroke={a.stroke}
          strokeWidth={a.strokeWidth}
        />
      );
    case "line":
    case "path":
    case "polygon":
      return (
        <Line
          {...common}
          closed={a.type === "polygon"}
          fill={a.type === "polygon" && !isTransparent(a.fill) ? a.fill : undefined}
          globalCompositeOperation={a.highlighter ? "multiply" : "source-over"}
          hitStrokeWidth={Math.max(a.strokeWidth, hitWidth)}
          lineCap="round"
          lineJoin="round"
          points={a.points}
          stroke={a.stroke}
          strokeWidth={a.strokeWidth}
        />
      );
    case "redact":
      return <RedactNode a={a} nodeProps={common} />;
    case "image":
      return <ImageLayerNode a={a} nodeProps={common} />;
    case "emoji":
      return <EmojiNode a={a} nodeProps={common} />;
    case "spotlight":
      return <SpotlightNode a={a} nodeProps={common} />;
    case "counter": {
      const r = a.radius;
      const digits = String(a.number).length;
      return (
        <Group {...common}>
          <Circle fill={a.fill} radius={r} stroke="#ffffff" strokeWidth={r * 0.12} />
          <Text
            align="center"
            fill={contrastText(a.fill.slice(0, 7))}
            fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
            fontSize={r * (digits >= 3 ? 0.78 : digits === 2 ? 0.98 : 1.15)}
            fontStyle="bold"
            height={r * 2}
            listening={false}
            offsetX={r}
            offsetY={r}
            text={String(a.number)}
            verticalAlign="middle"
            width={r * 2}
          />
        </Group>
      );
    }
    case "text":
      return (
        <Label {...common} onTransform={onTextTransform}>
          <Tag
            cornerRadius={a.fontSize * 0.22}
            fill={isTransparent(a.background) ? undefined : a.background}
          />
          <Text
            align={a.align}
            fill={a.fill}
            // Outline: a centred stroke with the fill painted on top, so the
            // visible outline is half the stroke and never thins the letters.
            fillAfterStrokeEnabled
            lineJoin="round"
            stroke={a.outline && !isTransparent(a.outline) ? a.outline : undefined}
            strokeWidth={a.outline && !isTransparent(a.outline) ? (a.outlineWidth ?? 0.06) * a.fontSize * 2 : 0}
            shadowBlur={a.shadow ? (a.shadowBlur ?? 0.18) * a.fontSize : 0}
            shadowColor={a.shadow}
            shadowEnabled={!!a.shadow && !isTransparent(a.shadow)}
            shadowOffsetX={a.shadow ? (a.shadowOffset ?? 0.06) * a.fontSize : 0}
            shadowOffsetY={a.shadow ? (a.shadowOffset ?? 0.06) * a.fontSize : 0}
            fontFamily={fontStack(a.fontFamily)}
            fontSize={a.fontSize}
            fontStyle={textFontStyle(a)}
            lineHeight={1.2}
            padding={textPadding(a.fontSize)}
            text={a.text || " "}
            width={a.width}
            wrap={a.width ? "word" : "none"}
          />
        </Label>
      );
  }
});
