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
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const dmsToDecimal = (dms: unknown, ref: unknown) => {
  if (!Array.isArray(dms) || dms.length < 3) return undefined;
  const [d, m, s] = dms.map((x) => num(x) ?? 0);
  let dec = d + m / 60 + s / 3600;
  if (ref === "S" || ref === "W") dec = -dec;
  return Number.isFinite(dec) ? dec : undefined;
};

const ORIENTATION: Record<number, string> = {
  1: "Normal",
  2: "Mirrored",
  3: "Rotated 180°",
  4: "Mirrored vertically",
  5: "Mirrored, rotated 90° CCW",
  6: "Rotated 90° CW",
  7: "Mirrored, rotated 90° CW",
  8: "Rotated 90° CCW",
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
  push(camera, "Camera", cameraName || undefined);
  push(camera, "Software", str(t.Software));
  push(camera, "Artist", str(t.Artist));
  push(camera, "Copyright", str(t.Copyright));

  // Capture
  const capture: ExifRow[] = [];
  push(capture, "Taken", formatExifDate(t.DateTimeOriginal) ?? formatExifDate(t.DateTime));
  push(capture, "Exposure", formatExposure(t.ExposureTime));
  const f = num(t.FNumber);
  push(capture, "Aperture", f ? `f/${round(f)}` : undefined);
  const iso = num(Array.isArray(t.ISOSpeedRatings) ? t.ISOSpeedRatings[0] : t.ISOSpeedRatings);
  push(capture, "ISO", iso ? String(iso) : undefined);
  const focal = num(t.FocalLength);
  const focal35 = num(t.FocalLengthIn35mmFilm);
  push(
    capture,
    "Focal length",
    focal ? `${round(focal)} mm${focal35 && focal35 !== Math.round(focal) ? ` (${focal35} mm eq.)` : ""}` : undefined
  );
  const bias = num(t.ExposureBias);
  push(capture, "Exposure bias", bias ? `${bias > 0 ? "+" : ""}${round(bias)} EV` : undefined);
  push(capture, "Flash", str(t.Flash));
  push(capture, "Program", str(t.ExposureProgram));
  push(capture, "Metering", str(t.MeteringMode));
  push(capture, "White balance", str(t.WhiteBalance));

  // Location
  const location: ExifRow[] = [];
  const lat = dmsToDecimal(t.GPSLatitude, t.GPSLatitudeRef);
  const lng = dmsToDecimal(t.GPSLongitude, t.GPSLongitudeRef);
  let gps: ExifData["gps"] = null;
  if (lat !== undefined && lng !== undefined && !(lat === 0 && lng === 0)) {
    const altRaw = num(t.GPSAltitude);
    const alt = altRaw === undefined ? undefined : Number(t.GPSAltitudeRef) === 1 ? -altRaw : altRaw;
    gps = { lat, lng, alt };
    push(location, "Coordinates", `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    push(location, "Altitude", alt === undefined ? undefined : `${Math.round(alt)} m`);
  }

  // Image
  const image: ExifRow[] = [];
  const o = num(t.Orientation);
  push(image, "Orientation", o ? ORIENTATION[o] ?? String(o) : undefined);
  push(image, "Color space", t.ColorSpace === 1 ? "sRGB" : t.ColorSpace === 65535 ? "Uncalibrated" : undefined);
  const xr = num(t.XResolution);
  push(image, "Resolution", xr ? `${Math.round(xr)} dpi` : undefined);
  push(image, "Description", str(t.ImageDescription));

  const sections = [
    { title: "Camera", rows: camera },
    { title: "Capture", rows: capture },
    { title: "Location", rows: location },
    { title: "Image", rows: image },
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
