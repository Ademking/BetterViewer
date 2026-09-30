import { Dialog, DialogBody, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { ALT, MOD } from "@/components/tools/ToolButton";
import { isExtension } from "@/lib/platform";
import { useUi } from "@/state/ui";
import { tk, useT } from "@/lib/i18n";

/** Labels are English (marked with tk); translated where shown. */
export const SHORTCUT_GROUPS: { title: string; items: [string, string[]][] }[] = [
  {
    title: tk("Tools"),
    items: [
      [tk("Select"), ["V"]],
      [tk("Pan (hold for temporary)"), ["H", "/", "Space"]],
      [tk("Draw · Highlighter"), ["P", "/", "Shift", "P"]],
      [tk("Eraser"), ["E"]],
      [tk("Rectangle · Ellipse"), ["S", "/", "O"]],
      [tk("Line · Arrow"), ["L", "/", "A"]],
      [tk("Numbered counter"), ["N"]],
      [tk("Blur / pixelate zone"), ["M"]],
      [tk("Spotlight"), ["G"]],
      [tk("Measure"), ["U"]],
      [tk("Rulers & guides"), ["Shift", "U"]],
      [tk("Text"), ["T"]],
      [tk("Color picker"), ["I"]],
      [tk("Crop"), ["C"]],
      [tk("Adjustments"), ["F"]],
      [tk("Histogram"), ["Shift", "C"]],
      [tk("Layers"), ["Shift", "L"]],
      [tk("Scan QR codes"), ["Q"]],
    ],
  },
  {
    title: tk("View"),
    items: [
      [tk("Zoom in / out"), [MOD, "+", "/", "−"]],
      [tk("Fit to screen"), ["0"]],
      [tk("Actual size"), ["1"]],
      [tk("Zoom to selection"), ["2"]],
      [tk("Rotate right / left"), ["R", "/", "Shift", "R"]],
      [tk("Flip horizontal / vertical"), ["Shift", "H", "/", "Shift", "V"]],
      [tk("Resize image"), [MOD, ALT, "I"]],
      [tk("Navigator"), ["Shift", "N"]],
      [tk("Toggle interface"), ["Tab"]],
    ],
  },
  {
    title: tk("Edit"),
    items: [
      [tk("Undo"), [MOD, "Z"]],
      [tk("Redo"), [MOD, "Shift", "Z"]],
      [tk("Delete selection"), ["Del"]],
      [tk("Duplicate"), [MOD, "D"]],
      [tk("Select all"), [MOD, "A"]],
      [tk("Nudge (×10 with Shift)"), ["←", "↑", "→", "↓"]],
      [tk("Bring to front / back"), ["]", "/", "["]],
      [tk("Cancel / deselect"), ["Esc"]],
    ],
  },
  {
    title: tk("File"),
    items: [
      [tk("Quick launch"), [MOD, "K"]],
      [tk("Open image"), [MOD, "O"]],
      [tk("Paste image"), [MOD, "V"]],
      [tk("Save (format set in Settings)"), [MOD, "S"]],
      [tk("Copy image"), [MOD, "Shift", "C"]],
      [tk("Settings"), [MOD, ","]],
      [tk("This list"), ["?"]],
    ],
  },
  // Browser-wide shortcuts of the extension (change them in the browser's
  // extension shortcut settings).
  ...(isExtension
    ? [
        {
          title: tk("On web pages"),
          items: [
            [tk("Browse all page images"), [ALT, "Shift", "G"]],
            [tk("Screenshot this page"), [ALT, "Shift", "S"]],
          ] as [string, string[]][],
        },
      ]
    : []),
];

export function ShortcutsDialog() {
  const t = useT();
  const open = useUi((s) => s.panels.shortcuts);
  const togglePanel = useUi((s) => s.togglePanel);
  return (
    <Dialog onOpenChange={(d) => togglePanel("shortcuts", d.open)} open={open}>
      <DialogContent className="glass" size="3xl">
        <DialogHeader title={t("Keyboard shortcuts")} />
        <DialogBody>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {SHORTCUT_GROUPS.map((g) => (
              <section className="flex flex-col gap-1" key={g.title}>
                <h3 className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {t(g.title)}
                </h3>
                {g.items.map(([label, keys]) => (
                  <div className="flex items-center justify-between gap-3 py-1 text-sm" key={label}>
                    <span>{t(label)}</span>
                    <KbdGroup>
                      {keys.map((k, i) =>
                        k === "/" ? (
                          <span className="text-muted-foreground text-xs" key={i}>
                            /
                          </span>
                        ) : (
                          <Kbd key={i}>{k}</Kbd>
                        )
                      )}
                    </KbdGroup>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
