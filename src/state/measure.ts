import { create } from "zustand";

/** A distance (2 points) or angle (vertex + 2 arm ends) in image-local px. */
export interface Measurement {
  id: string;
  kind: "distance" | "angle";
  /** [x1, y1, x2, y2] or [vx, vy, ax, ay, bx, by]. */
  pts: number[];
  /** Angle still waiting for its second arm. */
  pending?: boolean;
}

/** A horizontal or vertical guide at a position in displayed-image px. */
export interface Guide {
  id: string;
  axis: "h" | "v";
  pos: number;
}

interface MeasureStore {
  mode: "distance" | "angle";
  items: Measurement[];
  guides: Guide[];
  /** Guide being dragged (shows its position). */
  dragging: string | null;
}

/**
 * Measurements and guides are viewing aids: not part of the document, not
 * exported, cleared when another image is opened.
 */
export const useMeasure = create<MeasureStore>()(() => ({
  mode: "distance",
  items: [],
  guides: [],
  dragging: null,
}));

export const clearMeasurements = () => useMeasure.setState({ items: [] });
export const clearGuides = () => useMeasure.setState({ guides: [] });

export const updateMeasurement = (id: string, pts: number[], pending?: boolean) =>
  useMeasure.setState((s) => ({
    items: s.items.map((m) => (m.id === id ? { ...m, pts, pending } : m)),
  }));

/** Stops the pointer-follow of an angle waiting for its second arm. */
let stopFollow: (() => void) | null = null;
export const setPendingFollow = (fn: (() => void) | null) => {
  stopFollow?.();
  stopFollow = fn;
};

/** Drop an angle that never got its second arm. */
export const cancelPendingMeasurement = () => {
  setPendingFollow(null);
  if (useMeasure.getState().items.some((m) => m.pending))
    useMeasure.setState((s) => ({ items: s.items.filter((m) => !m.pending) }));
};

export const removeMeasurement = (id: string) =>
  useMeasure.setState((s) => ({ items: s.items.filter((m) => m.id !== id) }));

/* ------------------------------------------------------------------ geometry */

/** Length in image px. */
export const lengthOf = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);

/** Angle of a screen-space segment from the horizontal, −180..180°, counter-clockwise positive. */
export const screenAngle = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  (Math.atan2(a.y - b.y, b.x - a.x) * 180) / Math.PI;

/** Angle between two arms from a vertex, 0..180°. */
export const armsAngle = (v: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
  const a1 = Math.atan2(a.y - v.y, a.x - v.x);
  const a2 = Math.atan2(b.y - v.y, b.x - v.x);
  let d = Math.abs(a1 - a2) * (180 / Math.PI);
  if (d > 180) d = 360 - d;
  return d;
};

export const fmt = (v: number, digits = 1) => {
  const r = Number(v.toFixed(digits));
  return Number.isInteger(r) ? String(r) : r.toFixed(digits);
};
