import type { QrWorkerCode, QrWorkerRequest, QrWorkerResponse } from "@/lib/qr.worker";
import { t as tr } from "@/lib/i18n";
import { loadHtmlImage } from "@/lib/image";

export type QrCode = QrWorkerCode;

export type QrKind = "url" | "email" | "phone" | "sms" | "wifi" | "geo" | "contact" | "event" | "text";

export interface QrInfo {
  kind: QrKind;
  label: string;
  /** A URL to open for actionable content (http(s), mailto, tel…). */
  href?: string;
  /** Parsed key/value details (e.g. Wi-Fi network and password). */
  details?: [string, string][];
}

/* ------------------------------------------------------------------ worker */

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (c: QrCode[]) => void; reject: (e: Error) => void }>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./qr.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<QrWorkerResponse>) => {
      const job = pending.get(e.data.id);
      if (!job) return;
      pending.delete(e.data.id);
      if (e.data.error) job.reject(new Error(e.data.error));
      else job.resolve(e.data.codes ?? []);
    };
    worker.onerror = (e) => {
      for (const job of pending.values()) job.reject(new Error(e.message || "QR worker failed"));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

async function scanBitmap(img: HTMLImageElement, maxSide: number) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const factor = Math.min(1, maxSide / Math.max(w, h));
  const bitmap = await createImageBitmap(img, {
    resizeWidth: Math.max(1, Math.round(w * factor)),
    resizeHeight: Math.max(1, Math.round(h * factor)),
    resizeQuality: "high",
  });
  const id = nextId++;
  return new Promise<QrCode[]>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, bitmap, scale: 1 / factor } satisfies QrWorkerRequest, [bitmap]);
  });
}

/**
 * Scan an image for QR codes off the main thread. Very large images are
 * scanned downscaled first; if nothing is found a smaller pass is tried,
 * which helps with noisy, high-resolution photos.
 */
export async function scanImageForQr(src: string): Promise<QrCode[]> {
  const img = await loadHtmlImage(src);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const passes = [Math.min(longest, 3000)];
  if (longest > 1400) passes.push(1200);
  for (const side of passes) {
    const codes = await scanBitmap(img, side);
    if (codes.length) return codes;
  }
  return [];
}

/* ------------------------------------------------------------------ content */

// Labels are translated when described (tr = t; `t` is the content below).
const parseWifi = (s: string): [string, string][] => {
  const body = s.replace(/^WIFI:/i, "");
  const fields: Record<string, string> = {};
  // Fields are `K:value;` with `\` escaping `;`, `,`, `:` and `\`.
  const re = /([A-Z]+):((?:\\.|[^;])*);/gi;
  for (const m of body.matchAll(re)) {
    fields[m[1].toUpperCase()] = m[2].replace(/\\(.)/g, "$1");
  }
  const out: [string, string][] = [];
  if (fields.S) out.push([tr("Network"), fields.S]);
  if (fields.P) out.push([tr("Password"), fields.P]);
  if (fields.T) out.push([tr("Security"), fields.T]);
  if (fields.H) out.push([tr("Hidden"), fields.H === "true" ? tr("Yes") : tr("No")]);
  return out;
};

const vcardField = (s: string, key: string) =>
  s.match(new RegExp(`^${key}[^:]*:(.+)$`, "im"))?.[1]?.trim();

/** Recognise common QR payload formats. */
export function describeQr(content: string): QrInfo {
  const t = content.trim();
  if (/^https?:\/\/\S+$/i.test(t)) return { kind: "url", label: tr("Link"), href: t };
  if (/^www\.\S+\.\S+$/i.test(t)) return { kind: "url", label: tr("Link"), href: `https://${t}` };
  if (/^mailto:/i.test(t)) return { kind: "email", label: tr("Email"), href: t, details: [[tr("To"), t.slice(7).split("?")[0]]] };
  if (/^MATMSG:/i.test(t)) {
    const to = t.match(/TO:([^;]*)/i)?.[1] ?? "";
    return { kind: "email", label: tr("Email"), href: `mailto:${to}`, details: [[tr("To"), to]] };
  }
  if (/^tel:/i.test(t)) return { kind: "phone", label: tr("Phone number"), href: t, details: [[tr("Number"), t.slice(4)]] };
  if (/^(sms|smsto):/i.test(t)) {
    const [, num = "", body = ""] = t.split(":");
    return { kind: "sms", label: tr("Text message"), href: `sms:${num}`, details: [[tr("To"), num], ...(body ? [[tr("Message"), body] as [string, string]] : [])] };
  }
  if (/^WIFI:/i.test(t)) return { kind: "wifi", label: tr("Wi-Fi network"), details: parseWifi(t) };
  if (/^geo:/i.test(t)) {
    const [lat, lng] = t.slice(4).split(/[,?]/);
    return {
      kind: "geo",
      label: tr("Location"),
      href: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
      details: [[tr("Coordinates"), `${lat}, ${lng}`]],
    };
  }
  if (/^BEGIN:VCARD/i.test(t)) {
    const details: [string, string][] = [];
    const name = vcardField(t, "FN") ?? vcardField(t, "N")?.split(";").filter(Boolean).reverse().join(" ");
    const tel = vcardField(t, "TEL");
    const email = vcardField(t, "EMAIL");
    const org = vcardField(t, "ORG");
    if (name) details.push([tr("Name"), name]);
    if (org) details.push([tr("Organisation"), org]);
    if (tel) details.push([tr("Phone"), tel]);
    if (email) details.push([tr("Email"), email]);
    return { kind: "contact", label: tr("Contact card"), details };
  }
  if (/^MECARD:/i.test(t)) {
    const details: [string, string][] = [];
    const name = t.match(/N:([^;]*)/i)?.[1];
    const tel = t.match(/TEL:([^;]*)/i)?.[1];
    const email = t.match(/EMAIL:([^;]*)/i)?.[1];
    if (name) details.push([tr("Name"), name.replace(",", " ")]);
    if (tel) details.push([tr("Phone"), tel]);
    if (email) details.push([tr("Email"), email]);
    return { kind: "contact", label: tr("Contact card"), details };
  }
  if (/^BEGIN:VEVENT/i.test(t) || /BEGIN:VCALENDAR/i.test(t)) {
    const summary = vcardField(t, "SUMMARY");
    return { kind: "event", label: tr("Calendar event"), details: summary ? [[tr("Event"), summary]] : [] };
  }
  return { kind: "text", label: tr("Text") };
}

/** Only allow schemes that are safe to hand to window.open. */
export const isSafeHref = (href: string) => /^(https?:|mailto:|tel:|sms:)/i.test(href);
