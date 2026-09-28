/**
 * Emoji picker data and helpers. Emojis are drawn with the system's colour
 * emoji font (works offline, exports as-is); emojis the OS can't draw are
 * hidden so the grid never shows empty boxes.
 */

export const EMOJI_FONT =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", "Segoe UI Symbol", sans-serif';

export interface EmojiItem {
  emoji: string;
  label: string;
  /** Lower-cased label + keywords, for search. */
  search: string;
  /** Tone variants (light → dark), when the emoji has skin tones. */
  skins?: string[];
}

export interface EmojiGroup {
  id: string;
  label: string;
  emojis: EmojiItem[];
}

type RawRow = [string, string, string, number, string[]?];
interface RawData {
  groups: { id: string; label: string; emojis: RawRow[] }[];
  sentinels: Record<string, string>;
}

/** Skin tones: 0 = default yellow, 1–5 = light → dark. */
export const SKIN_TONES = [
  { tone: 0, swatch: "#ffc93a", label: "Default" },
  { tone: 1, swatch: "#f7dece", label: "Light" },
  { tone: 2, swatch: "#f3d2a2", label: "Medium-light" },
  { tone: 3, swatch: "#d5ab88", label: "Medium" },
  { tone: 4, swatch: "#af7e57", label: "Medium-dark" },
  { tone: 5, swatch: "#7c533e", label: "Dark" },
];

export const withTone = (item: EmojiItem, tone: number) =>
  tone > 0 && item.skins ? item.skins[tone - 1] : item.emoji;

/* ------------------------------------------------------------------ support */

let probe: CanvasRenderingContext2D | null = null;

/**
 * Whether the OS draws `emoji` as a single colour glyph: a colour glyph
 * ignores fillStyle, while a missing glyph (tofu) or plain text follows it.
 */
export function canRender(emoji: string) {
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const ctx = probe;
  if (!ctx) return true;
  const size = 24;
  ctx.canvas.width = size * 2;
  ctx.canvas.height = size;
  ctx.font = `${size - 4}px ${EMOJI_FONT}`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#f00";
  ctx.fillText(emoji, 0, 0);
  ctx.fillStyle = "#00f";
  ctx.fillText(emoji, size, 0);
  const a = ctx.getImageData(0, 0, size, size).data;
  const b = ctx.getImageData(size, 0, size, size).data;
  let ink = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] < 32) continue;
    ink++;
    // Same pixel in both colours → the glyph brings its own colours.
    if (Math.abs(a[i] - b[i]) > 40 || Math.abs(a[i + 2] - b[i + 2]) > 40) return false;
  }
  return ink > 20;
}

/* ------------------------------------------------------------------ data */

let loaded: Promise<EmojiGroup[]> | null = null;

/** Emoji groups the current OS can draw (loaded on first use). */
export function loadEmojiGroups() {
  loaded ??= import("@/lib/emoji-data.json").then(({ default: raw }) => {
    const data = raw as unknown as RawData;
    // Newest Unicode emoji version the OS supports (older ones are universal).
    let maxVersion = 11;
    for (const v of Object.keys(data.sentinels).map(Number).filter((v) => v > 11).sort((x, y) => x - y)) {
      if (!canRender(data.sentinels[String(v)])) break;
      maxVersion = v;
    }
    const flags = canRender("🇺🇸");
    return data.groups
      .filter((g) => g.id !== "flags" || flags)
      .map((g) => ({
        id: g.id,
        label: g.label,
        emojis: g.emojis
          .filter(([, , , version]) => version <= maxVersion)
          .map(([emoji, label, tags, , skins]) => ({
            emoji,
            label,
            search: `${label} ${tags}`.toLowerCase(),
            skins,
          })),
      }));
  });
  return loaded;
}

/**
 * Every term must match the start of a word in the label or keywords.
 * Best first: exact name, then names containing the terms as whole words,
 * then as word starts (shorter names first), then keyword-only matches.
 */
export function searchEmojis(groups: EmojiGroup[], query: string, limit = 240) {
  const q = query.toLowerCase().trim();
  const terms = q.split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const wordStart = (hay: string, t: string) => hay.startsWith(t) || hay.includes(` ${t}`);
  const scored: { e: EmojiItem; score: number; i: number }[] = [];
  let i = 0;
  for (const g of groups) {
    for (const e of g.emojis) {
      i++;
      if (!terms.every((t) => wordStart(e.search, t))) continue;
      const label = e.label.toLowerCase();
      const words = label.split(/[\s:,-]+/);
      const score =
        label === q ? 0
        : terms.every((t) => words.includes(t)) ? 1
        : terms.every((t) => wordStart(label, t)) ? 2
        : 3;
      scored.push({ e, score, i: score === 3 ? i : label.length * 10000 + i });
    }
  }
  return scored
    .sort((x, y) => x.score - y.score || x.i - y.i)
    .slice(0, limit)
    .map((s) => s.e);
}

/* ------------------------------------------------------------------ geometry */

/** Glyph size relative to the box, and its offset so it's optically centred. */
export function emojiMetrics(ctx: CanvasRenderingContext2D, emoji: string, size: number) {
  const fontSize = size * 0.86;
  ctx.font = `${fontSize}px ${EMOJI_FONT}`;
  const m = ctx.measureText(emoji);
  const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  return {
    font: ctx.font,
    x: (size - w) / 2 + m.actualBoundingBoxLeft,
    y: (size - h) / 2 + m.actualBoundingBoxAscent,
  };
}
