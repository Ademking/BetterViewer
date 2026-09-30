import { currentLanguage, t as tr, tk } from "@/lib/i18n";
import EXIF from "exif-js";

/** exif-js returns rationals as Number objects carrying numerator/denominator. */
type Rational = number & { numerator?: number; denominator?: number };
type RawTags = Record<string, unknown>;

export type ExifRow = [label: string, value: string];

export interface ExifSection {
  title: string;
  rows: ExifRow[];
}

export interface ExifData {
  sections: ExifSection[];
  /** Every readable tag, for the "All tags" list. */
  all: ExifRow[];
  gps: { lat: number; lng: number; alt?: number } | null;
}

/* ------------------------------------------------------------------ reading */

const cache = new Map<string, Promise<ExifData | null>>();

const isJpeg = (buf: ArrayBuffer) => {
  const v = new DataView(buf);
  return buf.byteLength > 4 && v.getUint8(0) === 0xff && v.getUint8(1) === 0xd8;
};

/**
 * Read EXIF metadata from an image URL (object URLs included). exif-js only
 * understands JPEG, so other formats resolve to null. Results are cached.
 */
export function readExif(src: string): Promise<ExifData | null> {
  let p = cache.get(src);
  if (!p) {
    p = (async () => {
      const buf = await (await fetch(src)).arrayBuffer();
      if (!isJpeg(buf)) return null;
      const tags = EXIF.readFromBinaryFile(buf) as RawTags | false;
      if (!tags || Object.keys(tags).length === 0) return null;
      return summarise(tags);
    })().catch(() => null);
    cache.set(src, p);
  }
  return p;
}

/* ------------------------------------------------------------------ formatting */

const num = (v: unknown): number | undefined => {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const str = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const s = v.replace(/\0/g, "").trim();
  return s || undefined;
};

const round = (n: number, d = 1) => {
  const f = 10 ** d;
  return String(Math.round(n * f) / f);
};

const formatExposure = (v: unknown) => {
  const n = num(v);
  if (n === undefined || n <= 0) return undefined;
  return n >= 1 ? `${round(n)} s` : `1/${Math.round(1 / n)} s`;
};

/** "2024:05:01 14:22:10" → localised date and time. */
const formatExifDate = (v: unknown) => {
  const s = str(v);
  if (!s) return undefined;
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return s;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleString(currentLanguage(), { dateStyle: "medium", timeStyle: "short" });
};

const dmsToDecimal = (dms: unknown, ref: unknown) => {
  if (!Array.isArray(dms) || dms.length < 3) return undefined;
  const [d, m, s] = dms.map((x) => num(x) ?? 0);
  let dec = d + m / 60 + s / 3600;
  if (ref === "S" || ref === "W") dec = -dec;
  return Number.isFinite(dec) ? dec : undefined;
};

const ORIENTATION: Record<number, string> = {
  1: tk("Normal"),
  2: tk("Mirrored"),
  3: tk("Rotated 180°"),
  4: tk("Mirrored vertically"),
  5: tk("Mirrored, rotated 90° CCW"),
  6: tk("Rotated 90° CW"),
  7: tk("Mirrored, rotated 90° CW"),
  8: tk("Rotated 90° CCW"),
};

/** Tags that are binary blobs or duplicated in the summary sections. */
const SKIP_IN_ALL = new Set(["thumbnail", "MakerNote", "UserComment", "undefined"]);

const formatRaw = (v: unknown): string | undefined => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") return str(v);
  if (typeof v === "number" || v instanceof Number) {
    const r = v as Rational;
    if (r.denominator !== undefined && r.denominator !== 1 && r.numerator !== undefined) {
      return `${round(Number(r), 4)}`;
    }
    return String(Number(v));
  }
  if (Array.isArray(v)) {
    if (v.length > 12) return undefined;
    return v.map((x) => formatRaw(x) ?? "").join(", ");
  }
  return undefined;
};

function summarise(t: RawTags): ExifData {
  const push = (rows: ExifRow[], label: string, value: string | undefined) => {
    if (value) rows.push([label, value]);
  };

  // Camera
  const camera: ExifRow[] = [];
  const make = str(t.Make);
  const model = str(t.Model);
  // Many models already start with the maker name ("Canon EOS R5").
  const cameraName =
    make && model && model.toLowerCase().startsWith(make.toLowerCase().split(" ")[0])
      ? model
      : [make, model].filter(Boolean).join(" ");
  push(camera, tr("Camera"), cameraName || undefined);
  push(camera, tr("Software"), str(t.Software));
  push(camera, tr("Artist"), str(t.Artist));
  push(camera, tr("Copyright"), str(t.Copyright));

  // Capture
  const capture: ExifRow[] = [];
  push(capture, tr("Taken"), formatExifDate(t.DateTimeOriginal) ?? formatExifDate(t.DateTime));
  push(capture, tr("Exposure"), formatExposure(t.ExposureTime));
  const f = num(t.FNumber);
  push(capture, tr("Aperture"), f ? `f/${round(f)}` : undefined);
  const iso = num(Array.isArray(t.ISOSpeedRatings) ? t.ISOSpeedRatings[0] : t.ISOSpeedRatings);
  push(capture, "ISO", iso ? String(iso) : undefined);
  const focal = num(t.FocalLength);
  const focal35 = num(t.FocalLengthIn35mmFilm);
  push(
    capture,
    tr("Focal length"),
    focal ? `${round(focal)} mm${focal35 && focal35 !== Math.round(focal) ? ` (${tr("{focal} mm eq.", { focal: focal35 })})` : ""}` : undefined
  );
  const bias = num(t.ExposureBias);
  push(capture, tr("Exposure bias"), bias ? `${bias > 0 ? "+" : ""}${round(bias)} EV` : undefined);
  push(capture, tr("Flash"), str(t.Flash));
  push(capture, tr("Program"), str(t.ExposureProgram));
  push(capture, tr("Metering"), str(t.MeteringMode));
  push(capture, tr("White balance"), str(t.WhiteBalance));

  // Location
  const location: ExifRow[] = [];
  const lat = dmsToDecimal(t.GPSLatitude, t.GPSLatitudeRef);
  const lng = dmsToDecimal(t.GPSLongitude, t.GPSLongitudeRef);
  let gps: ExifData["gps"] = null;
  if (lat !== undefined && lng !== undefined && !(lat === 0 && lng === 0)) {
    const altRaw = num(t.GPSAltitude);
    const alt = altRaw === undefined ? undefined : Number(t.GPSAltitudeRef) === 1 ? -altRaw : altRaw;
    gps = { lat, lng, alt };
    push(location, tr("Coordinates"), `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    push(location, tr("Altitude"), alt === undefined ? undefined : `${Math.round(alt)} m`);
  }

  // Image
  const image: ExifRow[] = [];
  const o = num(t.Orientation);
  push(image, tr("Orientation"), o ? (ORIENTATION[o] ? tr(ORIENTATION[o]) : String(o)) : undefined);
  push(image, tr("Color space"), t.ColorSpace === 1 ? "sRGB" : t.ColorSpace === 65535 ? tr("Uncalibrated") : undefined);
  const xr = num(t.XResolution);
  push(image, tr("Resolution"), xr ? `${Math.round(xr)} dpi` : undefined);
  push(image, tr("Description"), str(t.ImageDescription));

  const sections = [
    { title: tr("Camera"), rows: camera },
    { title: tr("Capture"), rows: capture },
    { title: tr("Location"), rows: location },
    { title: tr("Image"), rows: image },
  ].filter((s) => s.rows.length > 0);

  const all: ExifRow[] = Object.keys(t)
    .filter((k) => !SKIP_IN_ALL.has(k))
    .sort((a, b) => a.localeCompare(b))
    .map((k): ExifRow | null => {
      const v = formatRaw(t[k]);
      return v ? [k, v] : null;
    })
    .filter((r): r is ExifRow => r !== null);

  return { sections, all, gps };
}
