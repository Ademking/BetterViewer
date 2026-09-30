import { create } from "zustand";
import en from "@/locales/en.json";

/**
 * Interface translations. The English text is the key: `t("Fit to screen")`.
 * Each language is a JSON file in src/locales mapping English → translated
 * text; anything missing shows in English. `{name}` placeholders are filled
 * from `vars`. A value can also be an object of plural forms (Intl.PluralRules
 * categories: zero, one, two, few, many, other) chosen by `vars.count`.
 * `npm run i18n` lists missing and unused keys.
 */

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>>;
export type Messages = Record<string, string | PluralForms>;
type Vars = Record<string, string | number>;

export interface LanguageInfo {
  code: string;
  /** Name in the language itself. */
  name: string;
  rtl?: boolean;
}

/** Most spoken languages first after English; codes are BCP 47. */
export const LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English" },
  { code: "zh-CN", name: "简体中文" },
  { code: "zh-TW", name: "繁體中文" },
  { code: "hi", name: "हिन्दी" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "ar", name: "العربية", rtl: true },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "de", name: "Deutsch" },
  { code: "ja", name: "日本語" },
  { code: "tr", name: "Türkçe" },
  { code: "ko", name: "한국어" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "it", name: "Italiano" },
];

const loaders = import.meta.glob<{ default: Messages }>(["../locales/*.json", "!../locales/en.json"]);

const english = en as Messages;
let messages: Messages = english;
let plural = new Intl.PluralRules("en");

/** The language in use (re-renders components through `useT`). */
export const useLanguage = create<{ code: string }>()(() => ({ code: "en" }));

/** Supported language for a setting ("auto" = the browser's languages). */
export function resolveLanguage(preference: string): string {
  const wanted = preference === "auto" ? [...(navigator.languages ?? []), navigator.language] : [preference];
  for (const tag of wanted) {
    if (!tag) continue;
    const lower = tag.toLowerCase();
    const exact = LANGUAGES.find((l) => l.code.toLowerCase() === lower);
    if (exact) return exact.code;
    // Chinese: Traditional for Taiwan, Hong Kong, Macau and zh-Hant.
    if (lower.startsWith("zh")) return /hant|tw|hk|mo/.test(lower) ? "zh-TW" : "zh-CN";
    const base = LANGUAGES.find((l) => l.code === lower.split("-")[0]);
    if (base) return base.code;
  }
  return "en";
}

/** Load a language and switch the interface to it. */
export async function setLanguage(code: string) {
  const info = LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
  let next = english;
  if (info.code !== "en") {
    try {
      next = (await loaders[`../locales/${info.code}.json`]()).default;
    } catch (err) {
      console.warn(`Couldn't load the ${info.code} translation:`, err);
    }
  }
  messages = next;
  plural = new Intl.PluralRules(info.code);
  const root = document.documentElement;
  root.lang = info.code;
  root.dir = info.rtl ? "rtl" : "ltr";
  useLanguage.setState({ code: info.code });
}

/** Translate `key` (English text), filling `{placeholders}` from `vars`. */
export function t(key: string, vars?: Vars): string {
  let msg = messages[key] ?? english[key] ?? key;
  if (typeof msg === "object") {
    const n = Number(vars?.count ?? 0);
    msg = msg[plural.select(n)] ?? msg.other ?? key;
  }
  if (!vars) return msg;
  return msg.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** `t` for components: re-renders them when the language changes. */
export function useT() {
  useLanguage((s) => s.code);
  return t;
}

/** Current language code (for Intl formatting). */
export const currentLanguage = () => useLanguage.getState().code;

/**
 * Marks English text that is translated later with `t(value)` (labels kept
 * in constants), so `npm run i18n` finds it. Returns the text unchanged.
 */
export const tk = <T extends string>(text: T): T => text;

/** A name as used inside a sentence: lower case, except in German, where nouns keep their capital. */
export const midSentence = (name: string) => {
  const code = currentLanguage();
  return code === "de" ? name : name.toLocaleLowerCase(code);
};

/** Keep numbers like "2539 × 1920" in order inside right-to-left text. */
export const ltr = (text: string | number) =>
  LANGUAGES.find((l) => l.code === currentLanguage())?.rtl ? `⁦${text}⁩` : String(text);

/** "width × height" (kept left to right). */
export const dims = (width: number | undefined, height: number | undefined) => ltr(`${width} × ${height}`);
