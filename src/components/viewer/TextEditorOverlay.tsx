import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { textPadding } from "@/components/viewer/AnnotationNode";
import { fontStack } from "@/lib/fonts";
import { isTransparent, type TextAnnotation } from "@/lib/annotations";
import { stageRegistry } from "@/lib/stageRegistry";
import { useView } from "@/lib/viewport";
import { getDoc, updateDoc, useDoc } from "@/state/document";
import { getSettings } from "@/state/settings";
import { getUi, useUi } from "@/state/ui";

/** Finish editing: record the change, or drop an empty text box. */
function commitText(id: string, text: string) {
  const doc = getDoc();
  const a = doc?.annotations.find((x) => x.id === id);
  getUi().set({ editingTextId: null });
  if (!a || a.type !== "text") return;
  const wasNew = a.text === "";
  const trimmed = text.replace(/\s+$/, "");
  const without = (d: NonNullable<typeof doc>) => ({
    ...d,
    annotations: d.annotations.filter((x) => x.id !== id),
  });

  if (!trimmed.trim()) {
    updateDoc(without, { record: !wasNew });
    getUi().select([]);
  } else if (wasNew) {
    // The placeholder was inserted without history; record the real insertion.
    const index = doc!.annotations.findIndex((x) => x.id === id);
    updateDoc(without, { record: false });
    updateDoc((d) => {
      const list = [...d.annotations];
      list.splice(index, 0, { ...a, text: trimmed });
      return { ...d, annotations: list };
    });
  } else if (trimmed !== a.text) {
    updateDoc((d) => ({
      ...d,
      annotations: d.annotations.map((x) => (x.id === id ? { ...a, text: trimmed } : x)),
    }));
  }
  if (getUi().tool === "text" && getSettings().returnToSelect) {
    getUi().set({ tool: "select", selectedIds: trimmed.trim() ? [id] : [] });
  }
}

/**
 * A textarea laid exactly over the Konva text node (same matrix, font and
 * padding) for in-place editing, including rotated / flipped documents.
 */
export function TextEditorOverlay() {
  const editingId = useUi((s) => s.editingTextId);
  const annotation = useDoc((s) =>
    s.doc?.annotations.find((a) => a.id === editingId && a.type === "text")
  ) as TextAnnotation | undefined;

  if (!editingId || !annotation) return null;
  return <Editor a={annotation} key={editingId} />;
}

function Editor({ a }: { a: TextAnnotation }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(a.text);
  const vx = useView((s) => s.x);
  const vy = useView((s) => s.y);
  const vs = useView((s) => s.scale);
  const [matrix, setMatrix] = useState<number[] | null>(null);
  const valueRef = useRef(value);
  const committed = useRef(false);
  valueRef.current = value;

  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    commitText(a.id, valueRef.current);
  };

  // Follow the node through zoom / pan / rotation.
  useLayoutEffect(() => {
    const node = stageRegistry.annotationLayer?.findOne(`#${a.id}`);
    if (!node) return;
    setMatrix(node.getAbsoluteTransform().getMatrix().slice());
  }, [a, vx, vy, vs]);

  const ready = matrix !== null;
  useEffect(() => {
    if (!ready) return;
    ref.current?.focus();
    ref.current?.select();
  }, [ready]);

  // Unmounting without blur (e.g. a tool switch) still commits. Deferred so
  // StrictMode's mount → unmount → mount cycle doesn't end the edit.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setTimeout(() => {
        if (!mounted.current) commit();
      }, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-size to content.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (a.width === undefined) {
      el.style.width = "1px";
      el.style.width = `${Math.max(el.scrollWidth + 2, a.fontSize * 0.8)}px`;
    }
    el.style.height = "1px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, a.width, a.fontSize, matrix]);

  if (!matrix) return null;
  const pad = textPadding(a.fontSize);

  return (
    <textarea
      aria-label="Edit text"
      className="text-editor-overlay"
      data-board-overlay
      onBlur={commit}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
          e.preventDefault();
          ref.current?.blur();
        }
      }}
      placeholder="Type…"
      ref={ref}
      spellCheck={false}
      style={{
        left: 0,
        top: 0,
        transform: `matrix(${matrix.join(",")})`,
        opacity: a.opacity,
        font: `${a.fontStyle === "italic" ? "italic " : ""}${a.fontWeight === "bold" ? 700 : 400} ${a.fontSize}px/1.2 ${fontStack(a.fontFamily)}`,
        padding: pad,
        color: a.fill,
        ...(a.outline && !isTransparent(a.outline)
          ? {
              WebkitTextStroke: `${(a.outlineWidth ?? 0.06) * a.fontSize * 2}px ${a.outline}`,
              paintOrder: "stroke fill",
            }
          : {}),
        textShadow:
          a.shadow && !isTransparent(a.shadow)
            ? `${(a.shadowOffset ?? 0.06) * a.fontSize}px ${(a.shadowOffset ?? 0.06) * a.fontSize}px ${(a.shadowBlur ?? 0.18) * a.fontSize}px ${a.shadow}`
            : undefined,
        background: isTransparent(a.background) ? "transparent" : a.background,
        borderRadius: a.fontSize * 0.22,
        textAlign: a.align,
        width: a.width,
        whiteSpace: a.width ? "pre-wrap" : "pre",
        overflowWrap: a.width ? "break-word" : "normal",
        boxShadow: `0 0 0 ${1.5 / Math.hypot(matrix[0], matrix[1])}px #3182ed`,
      }}
      value={value}
    />
  );
}
