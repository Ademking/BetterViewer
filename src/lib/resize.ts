import type { Annotation } from "@/lib/annotations";
import { loadHtmlImage } from "@/lib/image";
import { getDoc, type ImageInfo, normRotation, updateDoc } from "@/state/document";
import { getUi } from "@/state/ui";
import { viewport } from "@/lib/viewport";
import { t } from "@/lib/i18n";

/**
 * Resample an image to width × height. Large reductions are done in halving
 * steps, which keeps them much sharper than a single browser downscale.
 */
export async function resampleImage(info: ImageInfo, width: number, height: number): Promise<ImageInfo> {
  const img = await loadHtmlImage(info.src);
  let source: CanvasImageSource = img;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  while (sw / 2 >= width && sh / 2 >= height) {
    const step = document.createElement("canvas");
    step.width = Math.round(sw / 2);
    step.height = Math.round(sh / 2);
    const sctx = step.getContext("2d")!;
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(source, 0, 0, step.width, step.height);
    source = step;
    sw = step.width;
    sh = step.height;
  }

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);

  const type = info.type === "image/jpeg" ? "image/jpeg" : "image/png";
  const blob = await new Promise<Blob>((resolve, reject) =>
    out.toBlob((b) => (b ? resolve(b) : reject(new Error(t("Resize failed")))), type, 0.95)
  );
  const src = URL.createObjectURL(blob);
  await loadHtmlImage(src);
  return { ...info, src, width, height, size: blob.size, type };
}

/** Scale an annotation from image space into the resized image's space. */
export function scaleAnnotation(a: Annotation, sx: number, sy: number): Annotation {
  // Uniform measures (stroke, font, radius) follow the average scale.
  const s = Math.sqrt(sx * sy);
  const base = { ...a, x: a.x * sx, y: a.y * sy };
  switch (a.type) {
    case "rect":
      return {
        ...base,
        width: a.width * sx,
        height: a.height * sy,
        cornerRadius: a.cornerRadius * s,
        strokeWidth: a.strokeWidth * s,
      } as Annotation;
    case "ellipse":
      return { ...base, radiusX: a.radiusX * sx, radiusY: a.radiusY * sy, strokeWidth: a.strokeWidth * s } as Annotation;
    case "line":
    case "arrow":
    case "polygon":
    case "path":
      return {
        ...base,
        points: a.points.map((v, i) => v * (i % 2 === 0 ? sx : sy)),
        strokeWidth: a.strokeWidth * s,
      } as Annotation;
    case "text":
      return { ...base, fontSize: a.fontSize * s, width: a.width !== undefined ? a.width * sx : undefined } as Annotation;
    case "counter":
      return { ...base, radius: a.radius * s } as Annotation;
    case "emoji":
      return { ...base, size: a.size * s } as Annotation;
    case "spotlight":
      return { ...base, width: a.width * sx, height: a.height * sy } as Annotation;
    case "redact":
      return { ...base, width: a.width * sx, height: a.height * sy, strength: Math.max(1, a.strength * s) } as Annotation;
    case "image":
      return { ...base, width: a.width * sx, height: a.height * sy } as Annotation;
  }
}

/**
 * Resize the current image to a size given in *displayed* orientation
 * (what the user sees after rotation). Undoable in one step.
 */
export async function resizeImage(displayWidth: number, displayHeight: number) {
  const doc = getDoc();
  if (!doc) return;
  const r = normRotation(doc.rotation);
  const swapped = r === 90 || r === 270;
  const width = Math.max(1, Math.round(swapped ? displayHeight : displayWidth));
  const height = Math.max(1, Math.round(swapped ? displayWidth : displayHeight));
  if (width === doc.image.width && height === doc.image.height) return;

  const sx = width / doc.image.width;
  const sy = height / doc.image.height;
  const image = await resampleImage(doc.image, width, height);

  updateDoc((d) => ({
    ...d,
    image: { ...image, backgroundRemoved: d.image.backgroundRemoved },
    annotations: d.annotations.map((a) => scaleAnnotation(a, sx, sy)),
  }));

  // Keep default tool sizes proportional to the new image.
  const s = Math.sqrt(sx * sy);
  const ui = getUi();
  ui.set({
    docUnit: ui.docUnit * s,
    style: {
      ...ui.style,
      strokeWidth: ui.style.strokeWidth * s,
      counterRadius: ui.style.counterRadius * s,
      redactStrength: ui.style.redactStrength * s,
    },
    textStyle: { ...ui.textStyle, fontSize: ui.textStyle.fontSize * s },
  });
  viewport.fit();
}
