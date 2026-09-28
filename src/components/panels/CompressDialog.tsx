import { ArrowRightIcon, DownloadIcon, MoveHorizontalIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { SegmentGroup, SegmentGroupItem, SegmentGroupItemText } from "@/components/ui/segment-group";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { LabeledSlider } from "@/components/tools/StyleControls";
import { encodeCanvas, type ExportFormat, renderDocumentCanvas } from "@/lib/actions";
import { baseName, downloadBlob, formatBytes } from "@/lib/image";
import { cn } from "@/lib/utils";
import { useDoc } from "@/state/document";
import { useUi } from "@/state/ui";

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
  { value: "png", label: "PNG" },
];

const SCALES = [
  { value: 1, label: "100%" },
  { value: 0.75, label: "75%" },
  { value: 0.5, label: "50%" },
  { value: 0.25, label: "25%" },
];

function Segments<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <SegmentGroup
      className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-lg bg-muted/60 p-0.5 [&>[data-part=indicator]]:bg-foreground/12 [&>[data-part=indicator]]:shadow-sm"
      onValueChange={(d) => {
        const opt = options.find((o) => String(o.value) === d.value);
        if (opt) onChange(opt.value);
      }}
      value={String(value)}
    >
      {options.map((o) => (
        <SegmentGroupItem
          className="flex h-7 items-center justify-center rounded-md px-2 font-medium text-muted-foreground text-xs transition-colors hover:text-foreground data-[state=checked]:text-foreground"
          key={String(o.value)}
          value={String(o.value)}
        >
          <SegmentGroupItemText>{o.label}</SegmentGroupItemText>
        </SegmentGroupItem>
      ))}
    </SegmentGroup>
  );
}

/** Before / after comparison with a draggable divider. */
function Compare({ before, after, actualSize }: { before: string; after: string; actualSize: boolean }) {
  const [split, setSplit] = useState(50);
  const ref = useRef<HTMLDivElement>(null);

  const moveTo = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setSplit(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  const img = cn(
    "pointer-events-none absolute inset-0 size-full select-none",
    actualSize ? "object-none" : "object-contain"
  );

  return (
    <div
      className="checkerboard checker-sm relative h-64 cursor-ew-resize touch-none overflow-hidden rounded-xl border"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        moveTo(e.clientX);
      }}
      onPointerMove={(e) => e.buttons === 1 && moveTo(e.clientX)}
      ref={ref}
    >
      <img alt="Before" className={img} draggable={false} src={before} />
      <img
        alt="After"
        className={img}
        draggable={false}
        src={after}
        style={{ clipPath: `inset(0 0 0 ${split}%)` }}
      />
      <div className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.3)]" style={{ left: `${split}%` }}>
        <span className="absolute top-1/2 left-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-900 shadow-md">
          <MoveHorizontalIcon className="size-4" />
        </span>
      </div>
      <span className="pointer-events-none absolute top-2 left-2 rounded-md bg-black/60 px-1.5 py-0.5 font-medium text-[11px] text-white">
        Before
      </span>
      <span className="pointer-events-none absolute top-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 font-medium text-[11px] text-white">
        After
      </span>
    </div>
  );
}

export function CompressDialog() {
  const open = useUi((s) => s.panels.compress);
  const togglePanel = useUi((s) => s.togglePanel);
  const original = useDoc((s) => s.original);
  const image = useDoc((s) => s.doc?.image);

  const [format, setFormat] = useState<ExportFormat>("jpeg");
  const [quality, setQuality] = useState(75);
  const [scale, setScale] = useState(1);
  const [actualSize, setActualSize] = useState(false);
  const [base, setBase] = useState<{ canvas: HTMLCanvasElement; url: string } | null>(null);
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null);
  const [encoding, setEncoding] = useState(false);

  // Render the edited image once per opening.
  useEffect(() => {
    if (!open) return;
    let url = "";
    try {
      const canvas = renderDocumentCanvas();
      canvas.toBlob((b) => {
        if (!b) return;
        url = URL.createObjectURL(b);
        setBase({ canvas, url });
      }, "image/png");
    } catch (err) {
      toast.error({ title: "Couldn't prepare the image", description: (err as Error).message });
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
      setBase(null);
    };
  }, [open]);

  // Re-encode (debounced) whenever a setting changes.
  useEffect(() => {
    if (!base) return;
    let cancelled = false;
    setEncoding(true);
    const t = setTimeout(async () => {
      const blob = await encodeCanvas(base.canvas, format, quality / 100, scale);
      if (cancelled) return;
      setResult((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { blob, url: URL.createObjectURL(blob) };
      });
      setEncoding(false);
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [base, format, quality, scale]);

  // Release the last preview when the dialog closes.
  useEffect(() => {
    if (open) return;
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, [open]);

  const before = original?.size ?? 0;
  const after = result?.blob.size ?? 0;
  const saved = before && after ? Math.round((1 - after / before) * 100) : 0;
  const lossless = format === "png";
  const outW = image ? Math.round((base?.canvas.width ?? image.width) * scale) : 0;
  const outH = image ? Math.round((base?.canvas.height ?? image.height) * scale) : 0;

  const download = () => {
    if (!result || !image) return;
    const ext = format === "jpeg" ? "jpg" : format;
    downloadBlob(result.blob, `${baseName(image.name)}-compressed.${ext}`);
    toast.success({ title: "Compressed image saved", description: `${formatBytes(after)} ${ext.toUpperCase()}` });
  };

  return (
    <Dialog onOpenChange={(d) => togglePanel("compress", d.open)} open={open}>
      <DialogContent className="glass" size="lg">
        <DialogHeader
          description="Make the file smaller. Drag the divider to compare quality."
          title="Compress image"
        />
        <DialogBody className="flex flex-col gap-5">
          {base && result ? (
            <Compare actualSize={actualSize} after={result.url} before={base.url} />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border text-muted-foreground text-sm">
              <Spinner className="me-2 size-4" /> Preparing preview…
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm tabular-nums">
              <div className="flex flex-col">
                <span className="text-[11px] text-muted-foreground">Original file</span>
                <span className="font-medium">{formatBytes(before)}</span>
              </div>
              <ArrowRightIcon className="size-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-[11px] text-muted-foreground">Compressed</span>
                <span className="flex items-center gap-1.5 font-medium">
                  {result ? formatBytes(after) : "-"}
                  {encoding && <Spinner className="size-3" />}
                </span>
              </div>
              {result && before > 0 && (
                <span
                  className={cn(
                    "ms-1 rounded-md px-1.5 py-0.5 font-semibold text-xs",
                    saved > 0 ? "bg-success/15 text-success-foreground" : "bg-destructive/15 text-destructive-foreground"
                  )}
                >
                  {saved > 0 ? `−${saved}%` : `+${Math.abs(saved)}%`}
                </span>
              )}
            </div>
            <Segments
              onChange={(v) => setActualSize(v === "actual")}
              options={[
                { value: "fit", label: "Fit" },
                { value: "actual", label: "100%" },
              ]}
              value={actualSize ? "actual" : "fit"}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-medium text-sm">Format</span>
            <Segments onChange={setFormat} options={FORMATS} value={format} />
          </div>

          {lossless ? (
            <p className="text-muted-foreground text-xs">
              PNG is lossless, so there's no quality setting. Reduce the size or pick JPEG / WebP for smaller files.
            </p>
          ) : (
            <LabeledSlider
              label="Quality"
              max={100}
              min={1}
              onChange={setQuality}
              step={1}
              suffix="%"
              value={quality}
            />
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="font-medium text-sm">Size</span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {outW} × {outH} px
              </span>
            </div>
            <Segments onChange={setScale} options={SCALES} value={scale} />
          </div>
        </DialogBody>
        <DialogFooter className="py-3">
          <Button onClick={() => togglePanel("compress", false)} size="sm" variant="ghost">
            Cancel
          </Button>
          <Button disabled={!result || encoding} onClick={download} size="sm">
            <DownloadIcon /> Download {result ? formatBytes(after) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
