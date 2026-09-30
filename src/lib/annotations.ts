import { t, tk } from "@/lib/i18n";
/**
 * Annotation model. All coordinates live in image-local space (0..width, 0..height
 * of the current, cropped image) so annotations follow the image through
 * rotation and flipping.
 */

export type ShapeKind =
  // Basic
  | "rect"
  | "roundRect"
  | "ellipse"
  | "triangle"
  | "rightTriangle"
  | "diamond"
  | "polygon"
  | "star"
  | "heart"
  | "cross"
  | "parallelogram"
  | "trapezoid"
  | "pentagon"
  | "octagon"
  | "halfCircle"
  | "star4"
  | "lightning"
  | "chevron"
  | "tag"
  | "document"
  // Block arrows
  | "blockArrowRight"
  | "blockArrowLeft"
  | "blockArrowUp"
  | "blockArrowDown"
  | "blockArrowBoth"
  // Lines
  | "line"
  | "arrow"
  | "doubleArrow"
  // Callouts
  | "callout"
  | "roundCallout"
  // Markers
  | "counter";

/** Kinds drawn as a straight segment between the drag start and end. */
export const isLineKind = (k: ShapeKind) =>
  k === "line" || k === "arrow" || k === "doubleArrow";

export type DrawMode = "pen" | "highlighter" | "eraser";

interface BaseAnnotation {
  id: string;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  /** Hidden from the canvas and exports (Layers panel). */
  hidden?: boolean;
}

export interface RectAnnotation extends BaseAnnotation {
  type: "rect";
  width: number;
  height: number;
  cornerRadius: number;
  stroke: string;
  strokeWidth: number;
  fill: string;
}

export interface EllipseAnnotation extends BaseAnnotation {
  type: "ellipse";
  radiusX: number;
  radiusY: number;
  stroke: string;
  strokeWidth: number;
  fill: string;
}

/** Straight line / arrow / closed polygon / freehand path: points relative to (x, y). */
export interface PointsAnnotation extends BaseAnnotation {
  type: "line" | "arrow" | "polygon" | "path";
  points: number[];
  stroke: string;
  strokeWidth: number;
  fill: string;
  /** Freehand highlighter strokes are drawn with multiply blending. */
  highlighter?: boolean;
  /** Arrow with heads at both ends. */
  doubleHeaded?: boolean;
  /** The shape preset a polygon was created from (for labels). */
  shape?: ShapeKind;
}

export interface TextAnnotation extends BaseAnnotation {
  type: "text";
  text: string;
  /** Font id from lib/fonts (undefined → default). */
  fontFamily?: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  align: "left" | "center" | "right";
  fill: string;
  background: string;
  /** Outline colour (undefined = none); width as a fraction of fontSize. */
  outline?: string;
  outlineWidth?: number;
  /** Drop-shadow colour with alpha (undefined = none); blur / offset as fractions of fontSize. */
  shadow?: string;
  shadowBlur?: number;
  shadowOffset?: number;
  /** undefined → auto width (no wrapping). */
  width?: number;
}

/** Text effect defaults when switched on. */
export const TEXT_OUTLINE_DEFAULT = { outline: "#000000", outlineWidth: 0.06 };
export const TEXT_SHADOW_DEFAULT = { shadow: "#000000a6", shadowBlur: 0.18, shadowOffset: 0.06 };

/** Numbered marker: a filled circle with a number, centred on (x, y). */
export interface CounterAnnotation extends BaseAnnotation {
  type: "counter";
  number: number;
  radius: number;
  /** Circle color; the number is drawn in a contrasting color. */
  fill: string;
}

export type RedactMode = "pixelate" | "blur";

/**
 * Privacy zone: the image inside the rectangle is pixelated or blurred.
 * Always axis-aligned in image space and fully opaque.
 */
export interface RedactAnnotation extends BaseAnnotation {
  type: "redact";
  width: number;
  height: number;
  mode: RedactMode;
  /** Pixel block size (pixelate) or blur radius (blur), in image px. */
  strength: number;
}

/** An inserted picture, placed on top of the main image. */
export interface ImageAnnotation extends BaseAnnotation {
  type: "image";
  src: string;
  name: string;
  width: number;
  height: number;
}

/**
 * A bright area: everything outside all spotlights is dimmed by one shared
 * overlay (see SpotlightOverlay).
 */
export interface SpotlightAnnotation extends BaseAnnotation {
  type: "spotlight";
  shape: "rect" | "ellipse";
  width: number;
  height: number;
  /** Darkness outside the spotlights, 0..1. */
  dim: number;
  /** Soft edge as a fraction of the smaller side, 0..0.5. */
  feather: number;
}

/** An emoji, drawn with the system emoji font in a size × size box. */
export interface EmojiAnnotation extends BaseAnnotation {
  type: "emoji";
  emoji: string;
  /** Unicode name, e.g. "grinning face". */
  label: string;
  size: number;
}

export type Annotation =
  | EmojiAnnotation
  | SpotlightAnnotation
  | RectAnnotation
  | EllipseAnnotation
  | PointsAnnotation
  | TextAnnotation
  | CounterAnnotation
  | RedactAnnotation
  | ImageAnnotation;

export const TRANSPARENT = "transparent";

export const isTransparent = (c: string | undefined) =>
  !c || c === TRANSPARENT || /^#[0-9a-f]{6}00$/i.test(c);

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const SHAPE_LABELS: Record<ShapeKind, string> = {
  rect: tk("Rectangle"),
  roundRect: tk("Rounded rectangle"),
  ellipse: tk("Ellipse"),
  triangle: tk("Triangle"),
  rightTriangle: tk("Right triangle"),
  diamond: tk("Diamond"),
  polygon: tk("Polygon"),
  star: tk("Star"),
  heart: tk("Heart"),
  cross: tk("Cross"),
  line: tk("Line"),
  arrow: tk("Arrow"),
  doubleArrow: tk("Double arrow"),
  callout: tk("Speech bubble"),
  roundCallout: tk("Round bubble"),
  counter: tk("Counter"),
  parallelogram: tk("Parallelogram"),
  trapezoid: tk("Trapezoid"),
  pentagon: tk("Pentagon"),
  octagon: tk("Octagon"),
  halfCircle: tk("Half circle"),
  star4: tk("4-point star"),
  lightning: tk("Lightning"),
  chevron: tk("Chevron"),
  tag: tk("Tag"),
  document: tk("Document"),
  blockArrowRight: tk("Arrow right"),
  blockArrowLeft: tk("Arrow left"),
  blockArrowUp: tk("Arrow up"),
  blockArrowDown: tk("Arrow down"),
  blockArrowBoth: tk("Arrow both ways"),
};

/** Order of the shape picker (a flat icon grid). */
export const SHAPE_GROUPS: { label: string; kinds: ShapeKind[] }[] = [
  {
    label: tk("Basic"),
    kinds: [
      "rect",
      "roundRect",
      "ellipse",
      "halfCircle",
      "triangle",
      "rightTriangle",
      "diamond",
      "parallelogram",
      "trapezoid",
      "pentagon",
      "polygon",
      "octagon",
      "star",
      "star4",
      "heart",
      "cross",
      "lightning",
      "chevron",
      "tag",
      "document",
    ],
  },
  {
    label: tk("Arrows"),
    kinds: [
      "blockArrowRight",
      "blockArrowLeft",
      "blockArrowUp",
      "blockArrowDown",
      "blockArrowBoth",
      "line",
      "arrow",
      "doubleArrow",
    ],
  },
  { label: tk("Callouts & markers"), kinds: ["callout", "roundCallout", "counter"] },
];

export interface StyleDefaults {
  stroke: string;
  strokeWidth: number;
  fill: string;
  opacity: number;
  polygonSides: number;
}

const polygonPoints = (w: number, h: number, sides: number, offset = 0) => {
  const pts: number[] = [];
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + offset + (i * 2 * Math.PI) / sides;
    pts.push(cx + (Math.cos(a) * w) / 2, cy + (Math.sin(a) * h) / 2);
  }
  return pts;
};

const starPoints = (w: number, h: number, spikes = 5, inner = 0.45) => {
  const pts: number[] = [];
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 1 : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / spikes;
    pts.push(cx + (Math.cos(a) * w * r) / 2, cy + (Math.sin(a) * h * r) / 2);
  }
  return pts;
};

const heartPoints = (w: number, h: number, samples = 72) => {
  // Classic parametric heart, normalised into the w × h box.
  const raw: [number, number][] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    raw.push([
      16 * Math.sin(t) ** 3,
      -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
    ]);
  }
  return normalise(raw, w, h);
};

const crossPoints = (w: number, h: number) => {
  const t = Math.min(w, h) * 0.34;
  const x1 = (w - t) / 2;
  const x2 = (w + t) / 2;
  const y1 = (h - t) / 2;
  const y2 = (h + t) / 2;
  return [x1, 0, x2, 0, x2, y1, w, y1, w, y2, x2, y2, x2, h, x1, h, x1, y2, 0, y2, 0, y1, x1, y1];
};

/** Rounded-rectangle speech bubble with a tail at the bottom-left. */
const calloutPoints = (w: number, h: number) => {
  const bodyH = h * 0.78;
  const r = Math.min(w, bodyH) * 0.16;
  const pts: number[] = [];
  const arc = (cx: number, cy: number, from: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = from + (i / 6) * (Math.PI / 2);
      pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
  };
  arc(r, r, Math.PI); // top-left
  arc(w - r, r, -Math.PI / 2); // top-right
  arc(w - r, bodyH - r, 0); // bottom-right
  // Tail
  pts.push(w * 0.42, bodyH, w * 0.2, h, w * 0.26, bodyH);
  arc(r, bodyH - r, Math.PI / 2); // bottom-left
  return pts;
};

/** Elliptical speech bubble with a tail at the bottom-left. */
const roundCalloutPoints = (w: number, h: number, samples = 60) => {
  const bodyH = h * 0.8;
  const cx = w / 2;
  const cy = bodyH / 2;
  const tailA = (Math.PI * 3) / 4 - 0.18; // gap in the ellipse for the tail
  const tailB = (Math.PI * 3) / 4 + 0.22;
  const pts: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const a = tailB + (i / samples) * (Math.PI * 2 - (tailB - tailA));
    pts.push(cx + (Math.cos(a) * w) / 2, cy + (Math.sin(a) * bodyH) / 2);
  }
  pts.push(w * 0.1, h);
  return pts;
};

const normalise = (raw: [number, number][], w: number, h: number) => {
  const xs = raw.map((p) => p[0]);
  const ys = raw.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const sx = w / (Math.max(...xs) - minX || 1);
  const sy = h / (Math.max(...ys) - minY || 1);
  return raw.flatMap(([x, y]) => [(x - minX) * sx, (y - minY) * sy]);
};

const POLYGON_BUILDERS: Partial<
  Record<ShapeKind, (w: number, h: number, sides: number) => number[]>
> = {
  triangle: (w, h) => [w / 2, 0, w, h, 0, h],
  rightTriangle: (w, h) => [0, 0, w, h, 0, h],
  diamond: (w, h) => [w / 2, 0, w, h / 2, w / 2, h, 0, h / 2],
  polygon: (w, h, sides) => polygonPoints(w, h, sides),
  star: (w, h) => starPoints(w, h),
  heart: (w, h) => heartPoints(w, h),
  cross: (w, h) => crossPoints(w, h),
  callout: (w, h) => calloutPoints(w, h),
  roundCallout: (w, h) => roundCalloutPoints(w, h),
  parallelogram: (w, h) => [w * 0.25, 0, w, 0, w * 0.75, h, 0, h],
  trapezoid: (w, h) => [w * 0.2, 0, w * 0.8, 0, w, h, 0, h],
  pentagon: (w, h) => polygonPoints(w, h, 5),
  // Flat top and bottom.
  octagon: (w, h) => polygonPoints(w, h, 8, Math.PI / 8),
  halfCircle: (w, h) => {
    const pts: number[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = -Math.PI / 2 + (i / 40) * Math.PI;
      pts.push(Math.cos(t) * w, h / 2 + (Math.sin(t) * h) / 2);
    }
    return pts;
  },
  star4: (w, h) => starPoints(w, h, 4, 0.38),
  lightning: (w, h) =>
    [0.62, 0, 0.12, 0.6, 0.46, 0.6, 0.36, 1, 0.9, 0.38, 0.56, 0.38, 0.78, 0].map((v, i) =>
      i % 2 === 0 ? v * w : v * h
    ),
  chevron: (w, h) => [0, 0, w * 0.7, 0, w, h / 2, w * 0.7, h, 0, h, w * 0.3, h / 2],
  tag: (w, h) => [0, 0, w * 0.72, 0, w, h / 2, w * 0.72, h, 0, h],
  document: (w, h) => [0, 0, w * 0.7, 0, w, h * 0.3, w, h, 0, h],
  blockArrowRight: (w, h) => blockArrow(w, h),
  blockArrowLeft: (w, h) => mapPoints(blockArrow(w, h), (x, y) => [w - x, y]),
  blockArrowUp: (w, h) => mapPoints(blockArrow(h, w), (x, y) => [y, h - x]),
  blockArrowDown: (w, h) => mapPoints(blockArrow(h, w), (x, y) => [y, x]),
  blockArrowBoth: (w, h) => [
    0, h / 2, w * 0.28, 0, w * 0.28, h * 0.3, w * 0.72, h * 0.3, w * 0.72, 0,
    w, h / 2, w * 0.72, h, w * 0.72, h * 0.7, w * 0.28, h * 0.7, w * 0.28, h,
  ],
};

/** Right-pointing block arrow in a w × h box. */
function blockArrow(w: number, h: number) {
  const head = Math.min(w * 0.45, h * 0.9);
  return [0, h * 0.3, w - head, h * 0.3, w - head, 0, w, h / 2, w - head, h, w - head, h * 0.7, 0, h * 0.7];
}

function mapPoints(pts: number[], f: (x: number, y: number) => [number, number]) {
  const out: number[] = [];
  for (let i = 0; i < pts.length; i += 2) out.push(...f(pts[i], pts[i + 1]));
  return out;
}

/**
 * Closed outline of a polygon-based shape in a w × h box, or null for kinds
 * drawn another way (rectangles, ellipses, lines, counters).
 */
export const shapeOutline = (kind: ShapeKind, w: number, h: number, sides = 6) =>
  POLYGON_BUILDERS[kind]?.(w, h, sides) ?? null;

/**
 * Build a shape annotation from a drag gesture between two image-local points.
 */
export const createShape = (
  kind: ShapeKind,
  a: { x: number; y: number },
  b: { x: number; y: number },
  style: StyleDefaults,
  id = uid()
): Annotation => {
  const base = { id, rotation: 0, opacity: style.opacity };
  const stroke = style.stroke;
  const strokeWidth = style.strokeWidth;

  if (isLineKind(kind)) {
    return {
      ...base,
      type: kind === "line" ? "line" : "arrow",
      x: a.x,
      y: a.y,
      points: [0, 0, b.x - a.x, b.y - a.y],
      stroke,
      strokeWidth,
      fill: stroke,
      doubleHeaded: kind === "doubleArrow" || undefined,
      shape: kind,
    };
  }

  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.max(1, Math.abs(b.x - a.x));
  const h = Math.max(1, Math.abs(b.y - a.y));

  switch (kind) {
    case "rect":
    case "roundRect":
      return {
        ...base,
        type: "rect",
        x,
        y,
        width: w,
        height: h,
        cornerRadius: kind === "roundRect" ? Math.min(w, h) * 0.18 : 0,
        stroke,
        strokeWidth,
        fill: style.fill,
      };
    case "ellipse":
      return {
        ...base,
        type: "ellipse",
        x: x + w / 2,
        y: y + h / 2,
        radiusX: w / 2,
        radiusY: h / 2,
        stroke,
        strokeWidth,
        fill: style.fill,
      };
    case "counter":
      return {
        ...base,
        type: "counter",
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        number: 1,
        radius: Math.max(w, h) / 2,
        fill: stroke,
      };
    default: {
      const build = POLYGON_BUILDERS[kind]!;
      return {
        ...base,
        type: "polygon",
        x,
        y,
        points: build(w, h, style.polygonSides),
        stroke,
        strokeWidth,
        fill: style.fill,
        shape: kind,
      };
    }
  }
};

export const scalePoints = (pts: number[], sx: number, sy: number) =>
  pts.map((v, i) => (i % 2 === 0 ? v * sx : v * sy));

/**
 * Konva's Transformer changes scaleX/scaleY. We fold that scale back into the
 * geometry so stroke widths and font sizes stay stable.
 */
export interface NodeTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  /** Unscaled layout width of a text node (before scaleX). */
  textWidth?: number;
}

export const bakeTransform = (a: Annotation, t: NodeTransform): Annotation => {
  const { x, y, rotation, scaleX: sx, scaleY: sy } = t;
  switch (a.type) {
    case "rect":
      return {
        ...a,
        x,
        y,
        rotation,
        width: Math.max(2, a.width * sx),
        height: Math.max(2, a.height * sy),
      };
    case "ellipse":
      return {
        ...a,
        x,
        y,
        rotation,
        radiusX: Math.max(1, a.radiusX * sx),
        radiusY: Math.max(1, a.radiusY * sy),
      };
    case "line":
    case "arrow":
    case "polygon":
    case "path":
      return { ...a, x, y, rotation, points: scalePoints(a.points, sx, sy) };
    case "text": {
      const cornerScale = Math.abs(sy - 1) > 0.001;
      if (cornerScale) {
        // Corner handles scale the type; keep the wrap box proportional.
        return {
          ...a,
          x,
          y,
          rotation,
          fontSize: Math.max(4, a.fontSize * sy),
          width: a.width !== undefined ? a.width * sx : undefined,
        };
      }
      // Side handles change the wrap width only.
      return {
        ...a,
        x,
        y,
        rotation,
        width: Math.max(a.fontSize, (t.textWidth ?? a.width ?? 100) * sx),
      };
    }
    case "counter":
      return { ...a, x, y, rotation, radius: Math.max(4, a.radius * ((sx + sy) / 2)) };
    case "image":
      return {
        ...a,
        x,
        y,
        rotation,
        width: Math.max(4, a.width * sx),
        height: Math.max(4, a.height * sy),
      };
    case "emoji":
      return { ...a, x, y, rotation, size: Math.max(8, a.size * ((sx + sy) / 2)) };
    case "spotlight":
      return {
        ...a,
        x,
        y,
        rotation,
        width: Math.max(4, a.width * sx),
        height: Math.max(4, a.height * sy),
      };
    case "redact":
      return {
        ...a,
        x,
        y,
        rotation: 0,
        width: Math.max(4, a.width * sx),
        height: Math.max(4, a.height * sy),
      };
  }
};

/** Next counter number: one more than the highest counter on the image. */
export const nextCounterNumber = (annotations: Annotation[]) =>
  annotations.reduce((n, a) => (a.type === "counter" ? Math.max(n, a.number) : n), 0) + 1;

export const translateAnnotation = (
  a: Annotation,
  dx: number,
  dy: number
): Annotation => ({ ...a, x: a.x + dx, y: a.y + dy });

/** Translated name of an annotation (layers, history). */
export const annotationLabel = (a: Annotation) => {
  switch (a.type) {
    case "rect":
      return a.cornerRadius > 0 ? t("Rounded rectangle") : t("Rectangle");
    case "ellipse":
      return t("Ellipse");
    case "line":
      return t("Line");
    case "arrow":
      return a.doubleHeaded ? t("Double arrow") : t("Arrow");
    case "polygon":
      return a.shape ? t(SHAPE_LABELS[a.shape]) : t("Polygon");
    case "path":
      return a.highlighter ? t("Highlight") : t("Drawing");
    case "text":
      return t("Text");
    case "emoji":
      return a.label ? a.label[0].toUpperCase() + a.label.slice(1) : t("Emoji");
    case "spotlight":
      return t("Spotlight");
    case "counter":
      return t("Counter {number}", { number: a.number });
    case "redact":
      return a.mode === "blur" ? t("Blur") : t("Pixelate");
    case "image":
      return t("Image");
  }
};

export const hasStroke = (a: Annotation) =>
  a.type !== "text" && a.type !== "counter" && a.type !== "redact" && a.type !== "image";
export const hasFill = (a: Annotation) =>
  a.type === "rect" || a.type === "ellipse" || a.type === "polygon";
