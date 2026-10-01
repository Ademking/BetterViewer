import type Tesseract from "tesseract.js";
import { create } from "zustand";
import { renderDocumentCanvas } from "@/lib/actions";
import type { Annotation } from "@/lib/annotations";
import { getDoc } from "@/state/document";
import { isExtension, vendorUrl } from "@/lib/platform";
import { getSettings } from "@/state/settings";
import { currentLanguage, t, tk } from "@/lib/i18n";

export const OCR_LANGUAGES: { value: string; label: string; hint?: string }[] = [
  { value: "eng", label: "English" },
  { value: "fra", label: "French", hint: "Français" },
  { value: "ara", label: "Arabic", hint: "العربية" },
  { value: "eng+fra", label: "English + French" },
  { value: "eng+ara", label: "English + Arabic" },
  { value: "spa", label: "Spanish", hint: "Español" },
  { value: "deu", label: "German", hint: "Deutsch" },
  { value: "ita", label: "Italian", hint: "Italiano" },
  { value: "por", label: "Portuguese", hint: "Português" },
  { value: "tur", label: "Turkish", hint: "Türkçe" },
  { value: "rus", label: "Russian", hint: "Русский" },
  { value: "chi_sim", label: "Chinese", hint: "简体" },
  { value: "jpn", label: "Japanese", hint: "日本語" },
];

const OCR_TO_BCP47: Record<string, string> = {
  eng: "en", fra: "fr", ara: "ar", spa: "es", deu: "de", ita: "it", por: "pt", tur: "tr", rus: "ru", chi_sim: "zh-Hans", jpn: "ja",
};

/** OCR_LANGUAGES with names in the interface language (the native name as hint). */
export function ocrLanguageOptions(): { value: string; label: string; hint?: string }[] {
  const names = new Intl.DisplayNames([currentLanguage()], { type: "language" });
  const name = (code: string) => names.of(OCR_TO_BCP47[code] ?? code) ?? code;
  return OCR_LANGUAGES.map((o) => {
    const label = o.value.split("+").map(name).join(" + ");
    return { ...o, label, hint: o.hint && o.hint !== label ? o.hint : undefined };
  });
}

export interface OcrLine {
  text: string;
  confidence: number;
}

export interface OcrResult {
  text: string;
  lines: OcrLine[];
  confidence: number;
  lang: string;
}

type Status = "idle" | "running" | "done" | "error";

interface OcrStore {
  status: Status;
  /** Human-readable step ("Loading French", "Reading text"). */
  step: string;
  progress: number;
  result: OcrResult | null;
  error: string | null;
  /** Image src the result belongs to. */
  src: string | null;
}

export const useOcr = create<OcrStore>()(() => ({
  status: "idle",
  step: "",
  progress: 0,
  result: null,
  error: null,
  src: null,
}));

/* ------------------------------------------------------------------ worker */

let worker: Tesseract.Worker | null = null;
let workerLang = "";

const STEP_LABELS: Record<string, string> = {
  "loading tesseract core": tk("Loading OCR engine"),
  "initializing tesseract": tk("Starting OCR engine"),
  "loading language traineddata": tk("Downloading language data"),
  "initializing api": tk("Preparing"),
  "recognizing text": tk("Reading text"),
};

const onLog = (m: Tesseract.LoggerMessage) => {
  if (useOcr.getState().status !== "running") return;
  useOcr.setState({
    step: STEP_LABELS[m.status] ? t(STEP_LABELS[m.status]) : m.status,
    progress: typeof m.progress === "number" ? m.progress : 0,
  });
};

async function getWorker(lang: string) {
  if (worker && workerLang === lang) return worker;
  const { createWorker } = await import("tesseract.js");
  if (worker) {
    await worker.reinitialize(lang);
  } else {
    worker = await createWorker(lang, 1, {
      logger: onLog,
      // Extension pages can't load the worker / engine from a CDN: use the
      // bundled copies (language data is still downloaded on first use).
      ...(isExtension
        ? {
            workerPath: vendorUrl("tesseract/worker.min.js"),
            corePath: vendorUrl("tesseract-core"),
            workerBlobURL: false,
          }
        : {}),
    });
  }
  workerLang = lang;
  return worker;
}

/* ------------------------------------------------------------------ run */

/**
 * Annotations OCR ignores: marks drawn on top aren't part of the picture and
 * only produce noise. Blur zones stay (hidden text must stay hidden), and so
 * do inserted images.
 */
const NOT_THE_PICTURE: Annotation["type"][] = [
  "emoji",
  "path",
  "rect",
  "ellipse",
  "polygon",
  "line",
  "arrow",
  "counter",
  "text",
  "spotlight",
];

/** Below this, Tesseract is guessing (textures, faces, icons…). */
const MIN_LINE_CONFIDENCE = 45;

/** A real line: confident enough, with at least two letters/digits in a row. */
const isRealLine = (l: OcrLine) =>
  l.confidence >= MIN_LINE_CONFIDENCE && /[\p{L}\p{N}]{2,}/u.test(l.text);

/**
 * Recognise text in the picture as it's shown (crop, rotation, filters and
 * blur zones included, so hidden text stays hidden), ignoring annotations.
 */
export async function runOcr(lang = getSettings().ocrLang) {
  const doc = getDoc();
  if (!doc) return;
  const src = doc.image.src;
  useOcr.setState({ status: "running", step: "Loading OCR engine", progress: 0, error: null, src });
  try {
    const canvas = renderDocumentCanvas({ exclude: NOT_THE_PICTURE });
    const w = await getWorker(lang);
    const { data } = await w.recognize(canvas, {}, { text: true, blocks: true });
    const lines: OcrLine[] = (data.blocks ?? [])
      .flatMap((b) => b.paragraphs)
      .flatMap((p) => p.lines)
      .map((l) => ({ text: l.text.trim(), confidence: l.confidence }))
      .filter(isRealLine);
    if (useOcr.getState().src !== src) return;
    useOcr.setState({
      status: "done",
      result: {
        text: lines.map((l) => l.text).join("\n"),
        lines,
        // Of the lines kept, weighted by length.
        confidence: lines.length
          ? lines.reduce((s, l) => s + l.confidence * l.text.length, 0) /
            lines.reduce((s, l) => s + l.text.length, 0)
          : 0,
        lang,
      },
    });
  } catch (err) {
    if (useOcr.getState().src !== src) return;
    useOcr.setState({ status: "error", error: (err as Error).message || t("Text recognition failed.") });
  }
}

export const resetOcr = () =>
  useOcr.setState({ status: "idle", step: "", progress: 0, result: null, error: null, src: null });
