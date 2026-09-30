import { CheckIcon, CopyIcon, RefreshCwIcon, ScanTextIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ScreenFloatingPanel } from "@/components/panels/FloatingPanel";
import { LanguagePicker } from "@/components/tools/LanguagePicker";
import { copyText } from "@/lib/actions";
import { writeClipboardText } from "@/lib/clipboard";
import { OCR_LANGUAGES, type OcrLine, runOcr, useOcr } from "@/lib/ocr";
import { cn } from "@/lib/utils";
import { useDoc } from "@/state/document";
import { useSettings } from "@/state/settings";
import { getUi, useUi } from "@/state/ui";

/** Open the OCR panel and extract text straight away (unless already done). */
export function openOcr() {
  getUi().togglePanel("ocr", true);
  const doc = useDoc.getState().doc;
  const s = useOcr.getState();
  if (doc && !(s.src === doc.image.src && (s.status === "done" || s.status === "running"))) {
    void runOcr();
  }
}

function useCopied(text: string, label: string) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async () => {
    try {
      await writeClipboardText(text);
      setCopied(true);
    } catch {
      copyText(text, label);
    }
  };
  return { copied, copy };
}

function LineRow({ line }: { line: OcrLine }) {
  const { copied, copy } = useCopied(line.text, "line");
  const unsure = line.confidence < 60;
  return (
    <button
      className="group/line -mx-1 flex items-start gap-2 rounded-md px-1 py-1 text-left text-[13px] leading-snug transition-colors hover:bg-accent/70"
      onClick={copy}
      title={unsure ? `Low confidence (${Math.round(line.confidence)}%). Click to copy` : "Click to copy"}
      type="button"
    >
      <span className={cn("min-w-0 flex-1 break-words", unsure && "text-muted-foreground")}>
        {line.text}
        {unsure && <span className="ms-1.5 text-[10px] text-warning-foreground">?</span>}
      </span>
      <span
        className={cn(
          "mt-0.5 shrink-0 text-muted-foreground transition-opacity",
          copied ? "opacity-100" : "opacity-0 group-hover/line:opacity-100"
        )}
      >
        {copied ? <CheckIcon className="size-3 text-success-foreground" /> : <CopyIcon className="size-3" />}
      </span>
    </button>
  );
}

export function OcrPanel() {
  const open = useUi((s) => s.panels.ocr);
  const togglePanel = useUi((s) => s.togglePanel);
  const lang = useSettings((s) => s.ocrLang);
  const setSetting = useSettings((s) => s.set);
  const src = useDoc((s) => s.doc?.image.src);
  const { status, step, progress, result, error, src: ocrSrc } = useOcr();
  const stale = !!src && ocrSrc !== src && status !== "idle";
  const running = status === "running";
  const all = useCopied(result?.text ?? "", "text");

  return (
    <ScreenFloatingPanel
      bodyClassName="gap-3"
      footer={
        <>
          <Button
            disabled={!result?.text || running}
            onClick={all.copy}
            size="sm"
            variant="outline"
          >
            {all.copied ? <CheckIcon /> : <CopyIcon />} {all.copied ? "Copied" : "Copy all"}
          </Button>
          <Button disabled={running || !src} onClick={() => void runOcr()} size="sm" variant="ghost">
            <RefreshCwIcon /> {status === "idle" || stale ? "Extract" : "Extract again"}
          </Button>
        </>
      }
      icon={<ScanTextIcon />}
      initialPosition={(vp, size) => ({ x: vp.width - size.width - 16, y: 60 })}
      initialSize={{ width: 340, height: 520 }}
      minSize={{ width: 280, height: 240 }}
      onOpenChange={(o) => togglePanel("ocr", o)}
      open={open}
      title="Extract text"
    >
      <LanguagePicker
        disabled={running}
        onChange={(v) => {
          if (v === lang) return;
          setSetting("ocrLang", v);
          if (src) void runOcr(v);
        }}
        options={OCR_LANGUAGES}
        value={lang}
      />

      {running && (
        <div className="flex flex-col gap-2 py-6">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="flex items-center gap-2">
              <Spinner className="size-3.5" /> {step || "Working"}…
            </span>
            <span className="tabular-nums">{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Runs on your device. Language data is downloaded once, then cached.
          </p>
        </div>
      )}

      {!running && status === "error" && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive-foreground text-sm">{error}</div>
      )}

      {!running && (status === "idle" || stale) && (
        <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground text-sm">
          <ScanTextIcon className="size-8 opacity-60" />
          Find and copy the text in this image.
          <Button onClick={() => void runOcr()} size="sm">
            <ScanTextIcon /> Extract text
          </Button>
        </div>
      )}

      {!running && !stale && status === "done" && result && (
        result.lines.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <ScanTextIcon className="size-8 text-muted-foreground opacity-60" />
            <div className="font-medium text-sm">No text found</div>
            <p className="max-w-60 text-muted-foreground text-xs">
              Try another language, zoom-cropping the text, or a sharper image.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-0.5 text-[11px] text-muted-foreground">
              <span>
                {result.lines.length} line{result.lines.length === 1 ? "" : "s"} · click a line to copy
              </span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-px font-medium",
                  result.confidence >= 80
                    ? "bg-success/15 text-success-foreground"
                    : result.confidence >= 60
                      ? "bg-warning/15 text-warning-foreground"
                      : "bg-destructive/15 text-destructive-foreground"
                )}
              >
                {Math.round(result.confidence)}% sure
              </span>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg border bg-background/30 px-2 py-1.5" dir="auto">
              {result.lines.map((line, i) => (
                <LineRow key={`${i}-${line.text}`} line={line} />
              ))}
            </div>
          </>
        )
      )}
    </ScreenFloatingPanel>
  );
}
