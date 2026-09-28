// Builds src/lib/emoji-data.json from emojibase-data (dev dependency):
// only the fields the picker needs. Run: npm run emoji-data
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const data = require("emojibase-data/en/data.json");

const GROUPS = [
  [0, "smileys", "Smileys & emotion"],
  [1, "people", "People & body"],
  [3, "nature", "Animals & nature"],
  [4, "food", "Food & drink"],
  [5, "travel", "Travel & places"],
  [6, "activities", "Activities"],
  [7, "objects", "Objects"],
  [8, "symbols", "Symbols"],
  [9, "flags", "Flags"],
];

/** Tone variants with one tone for everyone (skip mixed-tone combinations). */
const skinsOf = (e) => {
  if (!e.skins) return undefined;
  const single = e.skins.filter((s) => !Array.isArray(s.tone) || s.tone.every((t) => t === s.tone[0]));
  return single.length === 5 ? single.map((s) => s.emoji) : undefined;
};

const groups = GROUPS.map(([n, id, label]) => ({
  id,
  label,
  // [emoji, label, keywords, version, skins?]
  emojis: data
    .filter((e) => e.group === n)
    .sort((a, b) => a.order - b.order)
    .map((e) => {
      const row = [e.emoji, e.label, (e.tags ?? []).join(" "), e.version];
      const skins = skinsOf(e);
      if (skins) row.push(skins);
      return row;
    }),
}));

// One single-code-point emoji per Unicode version, to detect what the OS can draw.
const sentinels = {};
for (const e of [...data].sort((a, b) => a.order - b.order)) {
  if (e.group === 2 || e.group === 9 || e.hexcode.includes("-")) continue;
  sentinels[e.version] ??= e.emoji;
}

const out = { groups, sentinels };
const path = new URL("../src/lib/emoji-data.json", import.meta.url);
writeFileSync(path, JSON.stringify(out));
const count = groups.reduce((n, g) => n + g.emojis.length, 0);
console.log(`emoji-data.json: ${count} emojis, ${(readFileSync(path).length / 1024).toFixed(0)} KB`);
