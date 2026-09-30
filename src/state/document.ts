import { create } from "zustand";
import type { Annotation } from "@/lib/annotations";
import type { Curves } from "@/lib/curves";
import type { Levels } from "@/lib/develop-core";
import { DEFAULT_FILTERS, type Filters, isDefaultFilters } from "@/lib/filters";

export interface ImageInfo {
  src: string;
  name: string;
  width: number;
  height: number;
  type: string;
  size: number;
  /** Set once the background has been removed. */
  backgroundRemoved?: boolean;
  /** Web address the image was opened from (extension / `?src=`). */
  sourceUrl?: string;
}

/** Everything that participates in undo / redo. */
export interface Doc {
  image: ImageInfo;
  /** Multiple of 90. Not normalized so rotation can animate across 0°. */
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  filters: Filters;
  /** Tone curves; null = none. */
  curves: Curves | null;
  /** Levels (master RGB); null = none. */
  levels: Levels | null;
  annotations: Annotation[];
}

interface UpdateOptions {
  /** Consecutive updates with the same key within 1s merge into one undo step. */
  key?: string;
  /** false → apply without creating an undo step. */
  record?: boolean;
}

interface DocStore {
  doc: Doc | null;
  /** The image as it was first opened (for info / reset). */
  original: ImageInfo | null;
  past: Doc[];
  future: Doc[];
  lastKey: string | null;
  lastTime: number;
  /** Incremented whenever a new image is opened. */
  session: number;
  load: (image: ImageInfo) => void;
  close: () => void;
  update: (fn: (doc: Doc) => Doc, opts?: UpdateOptions) => void;
  undo: () => boolean;
  redo: () => boolean;
  resetAll: () => void;
}

const HISTORY_LIMIT = 150;
const MERGE_WINDOW = 1000;

export const useDoc = create<DocStore>()((set, get) => ({
  doc: null,
  original: null,
  past: [],
  future: [],
  lastKey: null,
  lastTime: 0,
  session: 0,

  load: (image) =>
    set((s) => ({
      doc: {
        image,
        rotation: 0,
        flipX: false,
        flipY: false,
        filters: DEFAULT_FILTERS,
        curves: null,
        levels: null,
        annotations: [],
      },
      original: image,
      past: [],
      future: [],
      lastKey: null,
      lastTime: 0,
      session: s.session + 1,
    })),

  close: () =>
    set({
      doc: null,
      original: null,
      past: [],
      future: [],
      lastKey: null,
    }),

  update: (fn, opts = {}) => {
    const { doc, past, lastKey, lastTime } = get();
    if (!doc) return;
    const next = fn(doc);
    if (next === doc) return;
    const record = opts.record ?? true;
    if (!record) {
      set({ doc: next });
      return;
    }
    const now = performance.now();
    const merge =
      opts.key !== undefined &&
      opts.key === lastKey &&
      now - lastTime < MERGE_WINDOW;
    set({
      doc: next,
      past: merge ? past : [...past, doc].slice(-HISTORY_LIMIT),
      future: [],
      lastKey: opts.key ?? null,
      lastTime: now,
    });
  },

  undo: () => {
    const { doc, past, future } = get();
    if (!doc || past.length === 0) return false;
    const prev = past[past.length - 1];
    set({
      doc: prev,
      past: past.slice(0, -1),
      future: [doc, ...future],
      lastKey: null,
    });
    return true;
  },

  redo: () => {
    const { doc, past, future } = get();
    if (!doc || future.length === 0) return false;
    const [next, ...rest] = future;
    set({ doc: next, past: [...past, doc], future: rest, lastKey: null });
    return true;
  },

  resetAll: () => {
    const { original } = get();
    if (!original) return;
    get().update(() => ({
      image: original,
      rotation: 0,
      flipX: false,
      flipY: false,
      filters: DEFAULT_FILTERS,
      curves: null,
      levels: null,
      annotations: [],
    }));
  },
}));

export const getDoc = () => useDoc.getState().doc;
export const updateDoc: DocStore["update"] = (fn, opts) =>
  useDoc.getState().update(fn, opts);

export const updateAnnotations = (
  ids: string[] | Set<string>,
  fn: (a: Annotation) => Annotation,
  opts?: UpdateOptions
) => {
  const set = ids instanceof Set ? ids : new Set(ids);
  updateDoc(
    (d) => ({
      ...d,
      annotations: d.annotations.map((a) => (set.has(a.id) ? fn(a) : a)),
    }),
    opts
  );
};

export const normRotation = (r: number) => ((r % 360) + 360) % 360;

/** Size of the document as displayed (after rotation). */
export const displaySize = (doc: Doc) => {
  const r = normRotation(doc.rotation);
  const swap = r === 90 || r === 270;
  return swap
    ? { width: doc.image.height, height: doc.image.width }
    : { width: doc.image.width, height: doc.image.height };
};

export const isDirty = (s: DocStore) => s.past.length > 0;

/** True when the image differs from the file as it was opened. */
export const hasEdits = (s: DocStore) => {
  const d = s.doc;
  return (
    !!d &&
    (d.annotations.length > 0 ||
      d.rotation % 360 !== 0 ||
      d.flipX ||
      d.flipY ||
      !isDefaultFilters(d.filters) ||
      !!d.curves ||
      !!d.levels ||
      d.image !== s.original)
  );
};
