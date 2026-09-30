import Konva from "konva";
import { toast } from "@/components/ui/toast";
import { askIncomingImage } from "@/components/panels/IncomingImageDialog";
import { MOD } from "@/components/tools/ToolButton";
import {
  type Annotation,
  hasFill,
  type ImageAnnotation,
  hasStroke,
  uid,
} from "@/lib/annotations";
import {
  ACCEPT_ATTRIBUTE,
  baseName,
  createSampleImage,
  downloadBlob,
  imageInfoFromBlob,
  isImageFile,
  isSupportedImageType,
  SUPPORTED_FORMATS_TEXT,
} from "@/lib/image";
import { closeOverlay, isOverlay } from "@/lib/overlay";
import { writeClipboardImage, writeClipboardText } from "@/lib/clipboard";
import { stageRegistry } from "@/lib/stageRegistry";
import { viewport, ZOOM_STEP } from "@/lib/viewport";
import { displaySize, getDoc, updateAnnotations, updateDoc, useDoc, type ImageInfo } from "@/state/document";
import { getSettings, type SaveFormat } from "@/state/settings";
import { getUi, useUi } from "@/state/ui";

/* ------------------------------------------------------------------ Image IO */

export async function openBlob(blob: Blob, name = "Pasted image", extra?: Partial<ImageInfo>) {
  const ui = getUi();
  ui.set({ loading: true });
  try {
    const info = await imageInfoFromBlob(blob, name);
    openInfo({ ...info, ...extra });
  } catch (err) {
    toast.error({
      title: "Couldn't open image",
      description: (err as Error).message,
    });
  } finally {
    ui.set({ loading: false });
  }
}

function openInfo(info: Parameters<ReturnType<typeof useDoc.getState>["load"]>[0]) {
  useDoc.getState().load(info);
  const s = getSettings();
  // Default sizes are expressed in "screen px at fit" → image px.
  // The board may not be mounted yet on first open; fall back to the window.
  const vw = viewport.size.width || window.innerWidth;
  const vh = viewport.size.height || window.innerHeight;
  const fitScale = Math.min((vw - 48) / info.width, (vh - 152) / info.height);
  const docUnit = Math.min(50, Math.max(0.25, 1 / (fitScale || 1)));
  useUi.setState((u) => ({
    tool: "select",
    selectedIds: [],
    editingTextId: null,
    crop: null,
    compareOriginal: false,
    docUnit,
    style: {
      ...u.style,
      strokeWidth: s.defaultStrokeWidth * docUnit,
      counterRadius: 16 * docUnit,
      redactStrength: 20 * docUnit,
    },
    counterNext: null,
    textStyle: { ...u.textStyle, fontSize: Math.round(28 * docUnit) },
  }));
}

/**
 * Place a picture on top of the current image, centred in the view and
 * scaled to fit comfortably (≤ 50% of the image).
 */
export async function insertImageLayer(blob: Blob, name = "Image") {
  const doc = getDoc();
  if (!doc) return openBlob(blob, name);
  try {
    const info = await imageInfoFromBlob(blob, name);
    const { image } = doc;
    const fit = Math.min(1, (image.width * 0.5) / info.width, (image.height * 0.5) / info.height);
    const width = info.width * fit;
    const height = info.height * fit;
    // Centre of the visible board, in image-local coordinates.
    const group = stageRegistry.annotationGroup;
    const c = group
      ? group.getAbsoluteTransform().copy().invert().point(viewport.center)
      : { x: image.width / 2, y: image.height / 2 };
    const layer: ImageAnnotation = {
      id: uid(),
      type: "image",
      src: info.src,
      name,
      x: Math.min(Math.max(0, c.x - width / 2), Math.max(0, image.width - width)),
      y: Math.min(Math.max(0, c.y - height / 2), Math.max(0, image.height - height)),
      width,
      height,
      rotation: 0,
      opacity: 1,
    };
    addAnnotation(layer, true);
    getUi().set({ tool: "select", selectedIds: [layer.id] });
  } catch (err) {
    toast.error({ title: "Couldn't add image", description: (err as Error).message });
  }
}

/**
 * A picture that was dropped or pasted: opens it when nothing is open;
 * otherwise asks whether to add it on top or open it instead (unless the
 * user chose to remember an answer).
 */
export async function receiveImage(blob: Blob, name: string) {
  if (!getDoc()) return openBlob(blob, name);
  const action = getSettings().incomingImage;
  if (action === "layer") return insertImageLayer(blob, name);
  if (action === "open") return openBlob(blob, name);
  askIncomingImage({
    blob,
    name,
    onLayer: () => void insertImageLayer(blob, name),
    onOpen: () => void openBlob(blob, name),
  });
}

/** Pick a file and insert it as a layer. */
export function insertImagePicker() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ACCEPT_ATTRIBUTE;
  input.onchange = () => {
    const files = Array.from(input.files ?? []);
    const file = files.find(isImageFile);
    if (file) void insertImageLayer(file, file.name);
    else if (files.length) unsupportedFile(files[0]);
  };
  input.click();
}

function unsupportedFile(f: File) {
  const svg = /svg/i.test(f.type) || /\.svgz?$/i.test(f.name);
  toast.error({
    title: svg ? "SVG files aren't supported" : "Unsupported file",
    description: `Use a ${SUPPORTED_FORMATS_TEXT} image.`,
  });
}

export async function openFiles(files: FileList | File[] | null | undefined) {
  const list = Array.from(files ?? []);
  const file = list.find(isImageFile);
  if (!file) {
    if (list.length) unsupportedFile(list[0]);
    return;
  }
  await receiveImage(file, file.name);
}

export function openFilePicker() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ACCEPT_ATTRIBUTE;
  input.onchange = () => openFiles(input.files);
  input.click();
}

export async function openSample() {
  const ui = getUi();
  ui.set({ loading: true });
  try {
    openInfo(await createSampleImage());
  } catch (err) {
    toast.error({ title: "Couldn't open the sample", description: (err as Error).message });
  } finally {
    ui.set({ loading: false });
  }
}

export async function pasteFromClipboard() {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find(isSupportedImageType);
      if (type) {
        const blob = await item.getType(type);
        await receiveImage(blob, "Pasted image");
        return true;
      }
    }
    toast.info({ title: "No image on the clipboard" });
  } catch {
    toast.info({
      title: `Press ${MOD} V to paste`,
      description: "Your browser needs a paste gesture to read images.",
    });
  }
  return false;
}

export function closeImage() {
  // In the right-click overlay, closing the image returns to the web page.
  if (isOverlay) {
    closeOverlay();
    return;
  }
  useDoc.getState().close();
  getUi().set({ selectedIds: [], crop: null, tool: "select", editingTextId: null });
}

/* ------------------------------------------------------------------ Export */

export type ExportFormat = SaveFormat;

/** Render the edited image (annotations included) at full resolution. */
export function renderDocumentCanvas(
  options: {
    /** Annotation types to leave out (e.g. OCR only wants the picture). */
    exclude?: Annotation["type"][];
  } = {}
): HTMLCanvasElement {
  const doc = getDoc();
  if (!doc) throw new Error("Nothing to export");
  const { width, height } = displaySize(doc);
  stageRegistry.exporting = true;
  try {
    return renderDocumentAt(width, height, options.exclude);
  } finally {
    stageRegistry.exporting = false;
    stageRegistry.stage?.batchDraw();
  }
}

/**
 * Small, quick copy of the edited image (annotations included) whose longest
 * side is `maxSide` px: draws the on-screen image, not the full-resolution one.
 */
export function renderDocumentThumbnail(maxSide: number): HTMLCanvasElement {
  const doc = getDoc();
  if (!doc) throw new Error("Nothing to render");
  const { width, height } = displaySize(doc);
  const k = Math.min(1, maxSide / Math.max(width, height));
  // Handles hidden for the render come back as they were: no redraw needed.
  const autoDraw = Konva.autoDrawEnabled;
  Konva.autoDrawEnabled = false;
  stageRegistry.thumbnail = true;
  try {
    return renderDocumentAt(Math.max(1, Math.round(width * k)), Math.max(1, Math.round(height * k)));
  } finally {
    stageRegistry.thumbnail = false;
    Konva.autoDrawEnabled = autoDraw;
  }
}

/** Render the document (as displayed: rotated, flipped) to a `width` × `height` canvas. */
function renderDocumentAt(width: number, height: number, exclude?: Annotation["type"][]): HTMLCanvasElement {
  const { stage, imageGroup, annotationLayer } = stageRegistry;
  const doc = getDoc();
  if (!stage || !imageGroup || !doc) throw new Error("Nothing to export");

  const excludedIds = new Set(
    doc.annotations.filter((a) => exclude?.includes(a.type)).map((a) => a.id)
  );
  const hidden = annotationLayer?.find(
    (n: { getClassName: () => string; name: () => string; id: () => string }) =>
      n.getClassName() === "Transformer" ||
      n.name() === "line-handle" ||
      n.name() === "qr-outline" ||
      n.name() === "crop-rect" ||
      (n.name() === "annotation" && excludedIds.has(n.id()))
  ) ?? [];
  const prevVisible = hidden.map((n) => n.visible());
  hidden.forEach((n) => n.visible(false));

  try {
    // Screen-space bounds of the image, from its exact transform (Konva's
    // getClientRect pads custom shapes).
    const t = imageGroup.getAbsoluteTransform();
    const { width: iw, height: ih } = doc.image;
    const corners = [
      t.point({ x: 0, y: 0 }),
      t.point({ x: iw, y: 0 }),
      t.point({ x: iw, y: ih }),
      t.point({ x: 0, y: ih }),
    ];
    const minX = Math.min(...corners.map((p) => p.x));
    const minY = Math.min(...corners.map((p) => p.y));
    const rect = {
      x: minX,
      y: minY,
      width: Math.max(...corners.map((p) => p.x)) - minX,
      height: Math.max(...corners.map((p) => p.y)) - minY,
    };
    const canvas = stage.toCanvas({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      pixelRatio: width / rect.width || 1 / viewport.cur.scale,
    });
    // Normalise to exact pixel dimensions.
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    out.getContext("2d")!.drawImage(canvas, 0, 0, width, height);
    return out;
  } finally {
    hidden.forEach((n, i) => n.visible(prevVisible[i]));
  }
}

/**
 * Encode a canvas. JPEG has no transparency, so it gets a white background;
 * `scale` resizes before encoding.
 */
export function encodeCanvas(
  source: HTMLCanvasElement,
  format: ExportFormat,
  quality = 0.92,
  scale = 1
): Promise<Blob> {
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d")!;
  if (format === "jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) =>
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encoding failed"))),
      `image/${format}`,
      quality
    )
  );
}

export async function renderDocument(format: ExportFormat = "png", quality = 0.92) {
  return encodeCanvas(renderDocumentCanvas(), format, quality);
}

/** Download the edited image; without a format, uses the Save format setting. */
export async function exportImage(format: ExportFormat = getSettings().saveFormat) {
  const doc = getDoc();
  if (!doc) return;
  try {
    const blob = await renderDocument(format);
    const ext = format === "jpeg" ? "jpg" : format;
    downloadBlob(blob, `${baseName(doc.image.name)}-edited.${ext}`);
    toast.success({ title: "Image exported", description: `Saved as ${ext.toUpperCase()}` });
  } catch (err) {
    toast.error({ title: "Export failed", description: (err as Error).message });
  }
}

/** The file exactly as it was opened (before any edit). */
async function originalFile() {
  const original = useDoc.getState().original;
  if (!original) return null;
  const blob = await (await fetch(original.src)).blob();
  return { blob, name: original.name };
}

/** Download the original file, untouched (same bytes and name). */
export async function saveOriginalImage() {
  try {
    const file = await originalFile();
    if (!file) return;
    downloadBlob(file.blob, file.name);
    toast.success({ title: "Original image saved" });
  } catch (err) {
    toast.error({ title: "Couldn't save the original", description: (err as Error).message });
  }
}

/** Copy the original image; clipboards only take PNG, so others are converted. */
export async function copyOriginalImage() {
  try {
    const file = await originalFile();
    if (!file) return;
    let png = file.blob;
    if (png.type !== "image/png") {
      const bitmap = await createImageBitmap(file.blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
      bitmap.close();
      png = await encodeCanvas(canvas, "png");
    }
    await writeClipboardImage(png);
    toast.success({ title: "Original image copied" });
  } catch (err) {
    toast.error({ title: "Couldn't copy image", description: (err as Error).message });
  }
}

export async function copyImageToClipboard() {
  if (!getDoc()) return;
  try {
    const blob = await renderDocument("png");
    await writeClipboardImage(blob);
    toast.success({ title: "Copied to clipboard" });
  } catch (err) {
    toast.error({ title: "Couldn't copy image", description: (err as Error).message });
  }
}

/* ------------------------------------------------------------------ View */

export const zoomIn = () => viewport.zoomBy(ZOOM_STEP);
export const zoomOut = () => viewport.zoomBy(1 / ZOOM_STEP);
export const zoomFit = () => viewport.fit();
export const zoomActual = () => viewport.actualSize();

export function zoomToSelection() {
  const { selectedIds } = getUi();
  const layer = stageRegistry.annotationLayer;
  const stage = stageRegistry.stage;
  if (!layer || !stage || !selectedIds.length) return;
  const rects = selectedIds
    .map((id) => layer.findOne(`#${id}`))
    .filter(Boolean)
    .map((n) => n!.getClientRect({ relativeTo: stage }));
  if (!rects.length) return;
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const x2 = Math.max(...rects.map((r) => r.x + r.width));
  const y2 = Math.max(...rects.map((r) => r.y + r.height));
  viewport.zoomToRect({ x, y, width: x2 - x, height: y2 - y });
}

/* ------------------------------------------------------------------ Transform */

export const rotate = (dir: 1 | -1) =>
  updateDoc((d) => ({ ...d, rotation: d.rotation + 90 * dir }));

export const flipHorizontal = () =>
  updateDoc((d) => {
    // Flip in *screen* space: at 90/270° the image-local axis is the other one.
    const r = ((d.rotation % 180) + 180) % 180;
    return r === 90 ? { ...d, flipY: !d.flipY } : { ...d, flipX: !d.flipX };
  });

export const flipVertical = () =>
  updateDoc((d) => {
    const r = ((d.rotation % 180) + 180) % 180;
    return r === 90 ? { ...d, flipX: !d.flipX } : { ...d, flipY: !d.flipY };
  });

/* ------------------------------------------------------------------ History */

export const undo = () => {
  // Counter numbering follows the image again after history moves.
  getUi().set({ editingTextId: null, counterNext: null });
  if (!useDoc.getState().undo()) return;
  pruneSelection();
};

export const redo = () => {
  getUi().set({ editingTextId: null, counterNext: null });
  if (!useDoc.getState().redo()) return;
  pruneSelection();
};

const pruneSelection = () => {
  const ids = new Set(getDoc()?.annotations.map((a) => a.id));
  const { selectedIds, select } = getUi();
  const next = selectedIds.filter((id) => ids.has(id));
  if (next.length !== selectedIds.length) select(next);
};

/* ------------------------------------------------------------------ Annotations */

export function addAnnotation(a: Annotation, selectAfter = true) {
  updateDoc((d) => ({ ...d, annotations: [...d.annotations, a] }));
  if (selectAfter) getUi().select([a.id]);
}

export function deleteSelected() {
  const { selectedIds } = getUi();
  if (!selectedIds.length) return false;
  const ids = new Set(selectedIds);
  updateDoc((d) => ({
    ...d,
    annotations: d.annotations.filter((a) => !ids.has(a.id)),
  }));
  getUi().select([]);
  return true;
}

export function duplicateSelected() {
  const doc = getDoc();
  const { selectedIds, docUnit } = getUi();
  if (!doc || !selectedIds.length) return;
  const off = 16 * docUnit;
  const copies = doc.annotations
    .filter((a) => selectedIds.includes(a.id))
    .map((a) => ({ ...a, id: uid(), x: a.x + off, y: a.y + off }));
  updateDoc((d) => ({ ...d, annotations: [...d.annotations, ...copies] }));
  getUi().select(copies.map((c) => c.id));
}

export function reorderSelected(where: "front" | "back" | "forward" | "backward") {
  const { selectedIds } = getUi();
  if (!selectedIds.length) return;
  const ids = new Set(selectedIds);
  updateDoc((d) => {
    const list = [...d.annotations];
    if (where === "front" || where === "back") {
      const sel = list.filter((a) => ids.has(a.id));
      const rest = list.filter((a) => !ids.has(a.id));
      return { ...d, annotations: where === "front" ? [...rest, ...sel] : [...sel, ...rest] };
    }
    const dir = where === "forward" ? 1 : -1;
    const order = dir === 1 ? [...list.keys()].reverse() : [...list.keys()];
    for (const i of order) {
      const j = i + dir;
      if (ids.has(list[i].id) && j >= 0 && j < list.length && !ids.has(list[j].id)) {
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    return { ...d, annotations: list };
  });
}

export function selectAll() {
  const doc = getDoc();
  if (!doc) return;
  getUi().set({ tool: "select", selectedIds: doc.annotations.map((a) => a.id) });
}

export function nudgeSelected(dx: number, dy: number) {
  const { selectedIds } = getUi();
  if (!selectedIds.length) return false;
  updateAnnotations(selectedIds, (a) => ({ ...a, x: a.x + dx, y: a.y + dy }), {
    key: "nudge",
  });
  return true;
}

/**
 * Set the active color; also recolors the current selection (stroke for
 * shapes, fill for text).
 */
export function applyColor(color: string, key = "color") {
  const ui = getUi();
  ui.setStyle({ stroke: color });
  ui.setTextStyle({ fill: color });
  if (ui.selectedIds.length) {
    updateAnnotations(
      ui.selectedIds,
      (a) => {
        if (a.type === "text") return { ...a, fill: color };
        if (a.type === "counter") return { ...a, fill: color };
        if (a.type === "arrow" || a.type === "line") return { ...a, stroke: color, fill: color };
        return hasStroke(a) ? { ...a, stroke: color } : a;
      },
      { key }
    );
  }
}

export function applyFill(color: string, key = "fill") {
  const ui = getUi();
  ui.setStyle({ fill: color });
  if (ui.selectedIds.length) {
    updateAnnotations(ui.selectedIds, (a) => (hasFill(a) ? { ...a, fill: color } : a), {
      key,
    });
  }
}

export async function copyText(text: string, label = text) {
  try {
    await writeClipboardText(text);
    toast.success({ title: `Copied ${label}` });
  } catch {
    toast.error({ title: "Clipboard unavailable" });
  }
}
