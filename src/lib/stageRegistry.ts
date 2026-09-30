import type Konva from "konva";

/** Handles to live Konva nodes, for imperative work (export, picking, hit tests). */
export const stageRegistry: {
  stage: Konva.Stage | null;
  imageLayer: Konva.Layer | null;
  annotationLayer: Konva.Layer | null;
  imageGroup: Konva.Group | null;
  annotationGroup: Konva.Group | null;
  exporting: boolean;
  /** True while a small preview (the navigator's) is rendered off screen. */
  thumbnail: boolean;
} = {
  stage: null,
  imageLayer: null,
  annotationLayer: null,
  imageGroup: null,
  annotationGroup: null,
  exporting: false,
  thumbnail: false,
};

/** Pointer position in image-local coordinates. */
export const pointerToLocal = () => {
  const { stage, annotationGroup } = stageRegistry;
  const p = stage?.getPointerPosition();
  if (!p || !annotationGroup) return null;
  return annotationGroup.getAbsoluteTransform().copy().invert().point(p);
};

export const screenToLocal = (p: { x: number; y: number }) => {
  const { annotationGroup } = stageRegistry;
  if (!annotationGroup) return p;
  return annotationGroup.getAbsoluteTransform().copy().invert().point(p);
};

if (import.meta.env.DEV) {
  (window as unknown as { __bv: typeof stageRegistry }).__bv = stageRegistry;
}
