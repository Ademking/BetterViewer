import { RotateCcwIcon } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { toast } from "@/components/ui/toast";
import { ALT, MOD } from "@/components/tools/ToolButton";
import { isExtension } from "@/lib/platform";
import {
  assignShortcut,
  clearShortcut,
  comboForBinding,
  comboParts,
  isCustomized,
  isReservedCombo,
  resetAllShortcuts,
  resetShortcut,
  SHORTCUT_BY_ID,
  SHORTCUTS,
  type ShortcutGroup,
  type ShortcutId,
  shortcutKeys,
} from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { useSettings } from "@/state/settings";
import { useUi } from "@/state/ui";
import { t, tk, useT } from "@/lib/i18n";

/** Keys with a fixed job, listed under their group after the ones you can change. */
const FIXED: Record<ShortcutGroup, [string, string[]][]> = {
  Tools: [[tk("Pan (hold for temporary)"), ["Space"]]],
  View: [],
  Edit: [
    [tk("Delete selection"), ["Del"]],
    [tk("Nudge (×10 with Shift)"), ["←", "↑", "→", "↓"]],
    [tk("Cancel / deselect"), ["Esc"]],
  ],
  File: [[tk("Paste image"), [MOD, "V"]]],
};

const GROUPS: { id: ShortcutGroup; title: string }[] = [
  { id: "Tools", title: tk("Tools") },
  { id: "View", title: tk("View") },
  { id: "Edit", title: tk("Edit") },
  { id: "File", title: tk("File") },
];

/** Browser-wide shortcuts of the extension (changed in the browser's extension shortcut settings). */
const PAGE_SHORTCUTS: [string, string[]][] = [
  [tk("Browse all page images"), [ALT, "Shift", "G"]],
  [tk("Screenshot this page"), [ALT, "Shift", "S"]],
];

function Keys({ keys }: { keys: string[] }) {
  return (
    <KbdGroup>
      {keys.map((k, i) => (
        <Kbd key={i}>{k}</Kbd>
      ))}
    </KbdGroup>
  );
}

/** A command's shortcuts, "/" between them. */
function Combos({ combos }: { combos: string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1">
      {combos.map((c, i) => (
        <span className="inline-flex items-center gap-1" key={c}>
          {i > 0 && <span className="text-muted-foreground text-xs">/</span>}
          <Keys keys={comboParts(c)} />
        </span>
      ))}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </div>
  );
}

function EditableRow({
  id,
  recording,
  onRecord,
}: {
  id: ShortcutId;
  recording: boolean;
  onRecord: (id: ShortcutId | null) => void;
}) {
  const t = useT();
  const overrides = useSettings((s) => s.shortcuts);
  const combos = shortcutKeys(id, overrides);
  const label = t(SHORTCUT_BY_ID[id].label);
  return (
    <Row label={label}>
      {isCustomized(id, overrides) && !recording && (
        <Button aria-label={t("Reset")} onClick={() => resetShortcut(id)} size="icon-xs" title={t("Reset")} variant="ghost">
          <RotateCcwIcon />
        </Button>
      )}
      <button
        aria-label={t("Change shortcut for {command}", { command: label })}
        className={cn(
          "rounded-md px-1.5 py-1 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
          recording && "bg-brand/15 ring-2 ring-brand"
        )}
        onClick={() => onRecord(recording ? null : id)}
        type="button"
      >
        {recording ? (
          <span className="px-1 text-brand text-xs">{t("Press keys…")}</span>
        ) : combos.length ? (
          <Combos combos={combos} />
        ) : (
          <span className="px-1 text-muted-foreground text-xs">{t("Not set")}</span>
        )}
      </button>
    </Row>
  );
}

/** While recording, the next key press becomes the shortcut (Esc cancels, Backspace removes it). */
function useRecorder(recording: ShortcutId | null, stop: () => void) {
  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Runs before the dialog and the app's own shortcuts see the key.
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === "Escape") return stop();
      if (e.key === "Backspace" || e.key === "Delete") {
        clearShortcut(recording);
        return stop();
      }
      const combo = comboForBinding(e);
      if (!combo) return; // a lone modifier: wait for the key
      if (isReservedCombo(combo)) {
        toast.error({ title: t("That key is reserved. Try another.") });
        return;
      }
      const taken = assignShortcut(recording, combo);
      for (const other of taken)
        toast.info({ title: t("Removed from “{command}”", { command: t(SHORTCUT_BY_ID[other].label) }) });
      stop();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording, stop]);
}

export function ShortcutsDialog() {
  const t = useT();
  const open = useUi((s) => s.panels.shortcuts);
  const togglePanel = useUi((s) => s.togglePanel);
  const customized = useSettings((s) => Object.keys(s.shortcuts).length > 0);
  const [recording, setRecording] = useState<ShortcutId | null>(null);
  const stop = useCallback(() => setRecording(null), []);
  useRecorder(recording, stop);

  return (
    <Dialog
      onOpenChange={(d) => {
        if (!d.open) setRecording(null);
        togglePanel("shortcuts", d.open);
      }}
      open={open}
    >
      <DialogContent className="glass" size="3xl">
        <DialogHeader
          description={t("Click a shortcut, then press the new keys. Esc cancels, Backspace removes it.")}
          title={t("Keyboard shortcuts")}
        />
        <DialogBody>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {GROUPS.map((g) => (
              <section className="flex flex-col gap-0.5" key={g.id}>
                <h3 className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">{t(g.title)}</h3>
                {SHORTCUTS.filter((s) => s.group === g.id).map((s) => (
                  <EditableRow id={s.id} key={s.id} onRecord={setRecording} recording={recording === s.id} />
                ))}
                {FIXED[g.id].map(([label, keys]) => (
                  <Row key={label} label={t(label)}>
                    <span className="px-1.5">
                      <Keys keys={keys} />
                    </span>
                  </Row>
                ))}
              </section>
            ))}
            {isExtension && (
              <section className="flex flex-col gap-0.5">
                <h3 className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  {t("On web pages")}
                </h3>
                {PAGE_SHORTCUTS.map(([label, keys]) => (
                  <Row key={label} label={t(label)}>
                    <span className="px-1.5">
                      <Keys keys={keys} />
                    </span>
                  </Row>
                ))}
              </section>
            )}
          </div>
        </DialogBody>
        <DialogFooter className="py-3">
          <Button
            disabled={!customized}
            onClick={() => {
              setRecording(null);
              resetAllShortcuts();
              toast.info({ title: t("Shortcuts restored to defaults") });
            }}
            size="sm"
            variant="ghost"
          >
            <RotateCcwIcon /> {t("Restore default shortcuts")}
          </Button>
          <Button onClick={() => togglePanel("shortcuts", false)} size="sm">
            {t("Done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
