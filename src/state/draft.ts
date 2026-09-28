import { create } from "zustand";
import type { Annotation } from "@/lib/annotations";

/** Transient, high-frequency interaction state (kept out of the main stores). */
interface DraftStore {
  /** Annotation being drawn right now (not yet committed). */
  draft: Annotation | null;
  /** Rubber-band selection rectangle in screen coordinates. */
  marquee: { x: number; y: number; width: number; height: number } | null;
  /** Last pointer position over the board in screen coordinates. */
  pointer: { x: number; y: number } | null;
  /** True while the pointer is over the board. */
  hovering: boolean;
}

export const useDraft = create<DraftStore>()(() => ({
  draft: null,
  marquee: null,
  pointer: null,
  hovering: false,
}));
