import { Dialog, DialogBody, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { ALT, MOD } from "@/components/tools/ToolButton";
import { useUi } from "@/state/ui";

export const SHORTCUT_GROUPS: { title: string; items: [string, string[]][] }[] = [
  {
    title: "Tools",
    items: [
      ["Select", ["V"]],
      ["Pan (hold for temporary)", ["H", "/", "Space"]],
      ["Draw · Highlighter", ["P", "/", "Shift", "P"]],
      ["Eraser", ["E"]],
      ["Rectangle · Ellipse", ["S", "/", "O"]],
      ["Line · Arrow", ["L", "/", "A"]],
      ["Numbered counter", ["N"]],
      ["Blur / pixelate zone", ["M"]],
      ["Spotlight", ["G"]],
      ["Measure", ["U"]],
      ["Rulers & guides", ["Shift", "U"]],
      ["Text", ["T"]],
      ["Color picker", ["I"]],
      ["Crop", ["C"]],
      ["Adjustments", ["F"]],
      ["Histogram", ["Shift", "C"]],
      ["Layers", ["Shift", "L"]],
      ["Scan QR codes", ["Q"]],
    ],
  },
  {
    title: "View",
    items: [
      ["Zoom in / out", [MOD, "+", "/", "−"]],
      ["Fit to screen", ["0"]],
      ["Actual size", ["1"]],
      ["Zoom to selection", ["2"]],
      ["Rotate right / left", ["R", "/", "Shift", "R"]],
      ["Flip horizontal / vertical", ["Shift", "H", "/", "Shift", "V"]],
      ["Resize image", [MOD, ALT, "I"]],
      ["Toggle interface", ["Tab"]],
    ],
  },
  {
    title: "Edit",
    items: [
      ["Undo", [MOD, "Z"]],
      ["Redo", [MOD, "Shift", "Z"]],
      ["Delete selection", ["Del"]],
      ["Duplicate", [MOD, "D"]],
      ["Select all", [MOD, "A"]],
      ["Nudge (×10 with Shift)", ["←", "↑", "→", "↓"]],
      ["Bring to front / back", ["]", "/", "["]],
      ["Cancel / deselect", ["Esc"]],
    ],
  },
  {
    title: "File",
    items: [
      ["Quick launch", [MOD, "K"]],
      ["Open image", [MOD, "O"]],
      ["Paste image", [MOD, "V"]],
      ["Export PNG", [MOD, "S"]],
      ["Copy image", [MOD, "Shift", "C"]],
      ["Settings", [MOD, ","]],
      ["This list", ["?"]],
    ],
  },
];

export function ShortcutsDialog() {
  const open = useUi((s) => s.panels.shortcuts);
  const togglePanel = useUi((s) => s.togglePanel);
  return (
    <Dialog onOpenChange={(d) => togglePanel("shortcuts", d.open)} open={open}>
      <DialogContent className="glass" size="3xl">
        <DialogHeader title="Keyboard shortcuts" />
        <DialogBody>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {SHORTCUT_GROUPS.map((g) => (
              <section className="flex flex-col gap-1" key={g.title}>
                <h3 className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {g.title}
                </h3>
                {g.items.map(([label, keys]) => (
                  <div className="flex items-center justify-between gap-3 py-1 text-sm" key={label}>
                    <span>{label}</span>
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
