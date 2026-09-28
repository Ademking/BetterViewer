import { LinkIcon, ScalingIcon, TriangleAlertIcon, UnlinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { SegmentGroup, SegmentGroupItem, SegmentGroupItemText } from "@/components/ui/segment-group";
import { toast } from "@/components/ui/toast";
import { Hinted } from "@/components/tools/ToolButton";
import { undo } from "@/lib/actions";
import { resizeImage } from "@/lib/resize";
import { cn } from "@/lib/utils";
import { displaySize, useDoc } from "@/state/document";
import { useUi } from "@/state/ui";

type Unit = "px" | "%";

const MAX_SIDE = 16384;

const PERCENT_PRESETS = [25, 50, 75, 150, 200];
const WIDTH_PRESETS = [
  { label: "4K", width: 3840 },
  { label: "Full HD", width: 1920 },
  { label: "HD", width: 1280 },
  { label: "Web", width: 800 },
];

function Field({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: string;
  unit: Unit;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <span className="flex h-9 items-center rounded-lg border bg-background/40 pe-2.5 focus-within:border-brand/60 focus-within:ring-[3px] focus-within:ring-brand/20">
        <input
          aria-label={label}
          className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm tabular-nums outline-none"
          inputMode="decimal"
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
          onFocus={(e) => e.target.select()}
          value={value}
        />
        <span className="text-muted-foreground text-xs">{unit}</span>
      </span>
    </label>
  );
}

const fmt = (n: number, unit: Unit) => (unit === "%" ? String(Math.round(n * 100) / 100) : String(Math.round(n)));

export function ResizeDialog() {
  const open = useUi((s) => s.panels.resize);
  const togglePanel = useUi((s) => s.togglePanel);
  const doc = useDoc((s) => s.doc);
  const current = doc ? displaySize(doc) : { width: 0, height: 0 };

  const [unit, setUnit] = useState<Unit>("px");
  const [locked, setLocked] = useState(true);
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [busy, setBusy] = useState(false);

  // Start from the current size each time the dialog opens.
  useEffect(() => {
    if (!open || !doc) return;
    setUnit("px");
    setLocked(true);
    setW(String(current.width));
    setH(String(current.height));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ratio = current.height ? current.width / current.height : 1;

  // Target size in pixels.
  const toPx = (v: string, side: number) => {
    const n = Number.parseFloat(v);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(unit === "%" ? (side * n) / 100 : n);
  };
  const outW = toPx(w, current.width);
  const outH = toPx(h, current.height);

  const setWidth = (v: string) => {
    setW(v);
    if (!locked) return;
    const n = Number.parseFloat(v);
    if (!Number.isFinite(n)) return setH("");
    setH(fmt(unit === "%" ? n : n / ratio, unit));
  };
  const setHeight = (v: string) => {
    setH(v);
    if (!locked) return;
    const n = Number.parseFloat(v);
    if (!Number.isFinite(n)) return setW("");
    setW(fmt(unit === "%" ? n : n * ratio, unit));
  };

  const switchUnit = (u: Unit) => {
    if (u === unit) return;
    if (u === "%") {
      setW(fmt((outW / current.width) * 100 || 100, "%"));
      setH(fmt((outH / current.height) * 100 || 100, "%"));
    } else {
      setW(String(outW || current.width));
      setH(String(outH || current.height));
    }
    setUnit(u);
  };

  const applyPercent = (p: number) => {
    setLocked(true);
    if (unit === "%") {
      setW(String(p));
      setH(String(p));
    } else {
      setW(String(Math.round((current.width * p) / 100)));
      setH(String(Math.round((current.height * p) / 100)));
    }
  };
  const applyWidth = (px: number) => {
    setLocked(true);
    setUnit("px");
    setW(String(px));
    setH(String(Math.round(px / ratio)));
  };

  const valid = outW >= 1 && outH >= 1 && outW <= MAX_SIDE && outH <= MAX_SIDE;
  const unchanged = outW === current.width && outH === current.height;
  const upscale = outW > current.width || outH > current.height;
  const tooBig = outW > MAX_SIDE || outH > MAX_SIDE;

  const apply = async () => {
    if (!valid || unchanged) return;
    setBusy(true);
    try {
      await resizeImage(outW, outH);
      togglePanel("resize", false);
      toast.success({
        title: "Image resized",
        description: `${current.width} × ${current.height} → ${outW} × ${outH} px`,
        action: { label: "Undo", onClick: undo },
      });
    } catch (err) {
      toast.error({ title: "Couldn't resize", description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog onOpenChange={(d) => togglePanel("resize", d.open)} open={open}>
      <DialogContent className="glass" size="sm">
        <DialogHeader
          description={`Currently ${current.width} × ${current.height} px. Drawings and text are scaled too.`}
          title="Resize image"
        />
        <DialogBody className="flex flex-col gap-5">
          <SegmentGroup
            className="grid grid-cols-2 gap-0.5 rounded-lg bg-muted/60 p-0.5 [&>[data-part=indicator]]:bg-foreground/12 [&>[data-part=indicator]]:shadow-sm"
            onValueChange={(d) => d.value && switchUnit(d.value as Unit)}
            value={unit}
          >
            {(["px", "%"] as Unit[]).map((u) => (
              <SegmentGroupItem
                className="flex h-7 items-center justify-center rounded-md font-medium text-muted-foreground text-xs data-[state=checked]:text-foreground"
                key={u}
                value={u}
              >
                <SegmentGroupItemText>{u === "px" ? "Pixels" : "Percent"}</SegmentGroupItemText>
              </SegmentGroupItem>
            ))}
          </SegmentGroup>

          <div className="flex items-end gap-2">
            <Field label="Width" onChange={setWidth} unit={unit} value={w} />
            <Hinted label={locked ? "Proportions locked" : "Proportions unlocked"}>
              <button
                aria-label={locked ? "Unlock proportions" : "Lock proportions"}
                aria-pressed={locked}
                className={cn(
                  "mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-accent [&_svg]:size-4",
                  locked ? "text-brand" : "text-muted-foreground"
                )}
                onClick={() => {
                  const next = !locked;
                  setLocked(next);
                  // Re-lock from the width so the two agree again.
                  if (next) setWidth(w);
                }}
                type="button"
              >
                {locked ? <LinkIcon /> : <UnlinkIcon />}
              </button>
            </Hinted>
            <Field label="Height" onChange={setHeight} unit={unit} value={h} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-medium text-muted-foreground text-xs">Quick sizes</span>
            <div className="flex flex-wrap gap-1.5">
              {PERCENT_PRESETS.map((p) => (
                <Button key={p} onClick={() => applyPercent(p)} size="xs" variant="outline">
                  {p}%
                </Button>
              ))}
              {WIDTH_PRESETS.filter((p) => p.width !== current.width).map((p) => (
                <Button key={p.label} onClick={() => applyWidth(p.width)} size="xs" variant="outline">
                  {p.label} <span className="text-muted-foreground">{p.width}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">New size</span>
            <span className="font-medium tabular-nums">
              {valid ? `${outW} × ${outH} px` : "-"}
              {valid && !unchanged && (
                <span className="ms-2 text-muted-foreground text-xs">
                  {Math.round((outW / current.width) * 100)}%
                </span>
              )}
            </span>
          </div>

          {tooBig && (
            <p className="flex items-start gap-2 text-destructive-foreground text-xs">
              <TriangleAlertIcon className="mt-px size-3.5 shrink-0" /> Maximum is {MAX_SIDE} px per side.
            </p>
          )}
          {!tooBig && valid && upscale && (
            <p className="flex items-start gap-2 text-muted-foreground text-xs">
              <TriangleAlertIcon className="mt-px size-3.5 shrink-0 text-warning" />
              Enlarging can't add detail, so the image may look soft.
            </p>
          )}
        </DialogBody>
        <DialogFooter className="py-3">
          <Button onClick={() => togglePanel("resize", false)} size="sm" variant="ghost">
            Cancel
          </Button>
          <Button disabled={!valid || unchanged} isLoading={busy} onClick={apply} size="sm">
            <ScalingIcon /> Resize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
