import { CheckIcon, CopyIcon, ExternalLinkIcon, ImageIcon, InfoIcon, MapPinIcon } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleIndicator, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";
import { Hint, HintContent, HintTrigger } from "@/components/ui/hint";
import { ScreenFloatingPanel } from "@/components/panels/FloatingPanel";
import { copyText } from "@/lib/actions";
import { type ExifData, readExif } from "@/lib/exif";
import { formatBytes } from "@/lib/image";
import { isDefaultFilters } from "@/lib/filters";
import { cn } from "@/lib/utils";
import { normRotation, useDoc } from "@/state/document";
import { useUi } from "@/state/ui";

/** Top-left file chip; toggles the floating image info panel. */
export function InfoBar() {
  const image = useDoc((s) => s.doc?.image);
  const open = useUi((s) => s.panels.info);
  const togglePanel = useUi((s) => s.togglePanel);
  if (!image) return null;

  return (
    <Hint positioning={{ placement: "bottom", gutter: "8px" }}>
      <HintTrigger asChild>
        <button
          aria-pressed={open}
          className={cn(
            "glass flex max-w-[min(60vw,22rem)] items-center gap-2 rounded-full border py-1 pr-3 pl-1.5 text-xs shadow-lg/10 transition-colors hover:bg-accent",
            open && "border-brand/60"
          )}
          onClick={() => togglePanel("info")}
          type="button"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent">
            <ImageIcon className="size-3.5" />
          </span>
          <span className="truncate font-medium">{image.name}</span>
          <span className="shrink-0 text-muted-foreground tabular-nums max-sm:hidden">
            {image.width} × {image.height}
          </span>
        </button>
      </HintTrigger>
      {!open && <HintContent>Image info</HintContent>}
    </Hint>
  );
}

type Row = [label: string, value: string];
type Section = { title: string; rows: Row[] };

const lineText = ([k, v]: Row) => `${k}: ${v}`;

/** Plain-text version of the panel, for "Copy all". */
const sectionsToText = (title: string, sections: Section[]) =>
  [title, ...sections.map((s) => [`\n${s.title}`, ...s.rows.map((r) => `  ${lineText(r)}`)].join("\n"))].join("\n");

/** Small copy button that confirms with a check mark. */
function CopyButton({
  text,
  label,
  className,
  children,
}: {
  text: string;
  label: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1 rounded text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          copyText(text, label.replace(/^Copy /, ""));
        }
      }}
      title={label}
      type="button"
    >
      {copied ? <CheckIcon className="size-3 text-success-foreground" /> : <CopyIcon className="size-3" />}
      {children}
    </button>
  );
}

/** Copies on click and briefly reports success. */
function useCopied(text: string, label: string) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      copyText(text, label);
    }
  };
  return { copied, copy };
}

/** A label/value line; click anywhere on it to copy the value. */
function InfoRow({ row, mono }: { row: Row; mono?: boolean }) {
  const [k, v] = row;
  const { copied, copy } = useCopied(v, k.toLowerCase());
  return (
    <button
      aria-label={`Copy ${k} (${v})`}
      className="group/row -mx-1.5 flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-xs outline-none transition-colors hover:bg-accent/70 focus-visible:bg-accent/70"
      onClick={copy}
      title={`${v}\n(click to copy)`}
      type="button"
    >
      <span className={cn("shrink-0 text-muted-foreground", mono && "font-mono text-[11px]")}>{k}</span>
      <span
        aria-hidden
        className={cn(
          "shrink-0 text-muted-foreground transition-opacity",
          copied ? "opacity-100" : "opacity-0 group-hover/row:opacity-100 group-focus-visible/row:opacity-100"
        )}
      >
        {copied ? <CheckIcon className="size-3 text-success-foreground" /> : <CopyIcon className="size-3" />}
      </span>
      <span className="ms-auto min-w-0 truncate ps-2 text-right font-medium tabular-nums">{v}</span>
    </button>
  );
}

function InfoRows({ rows, mono }: { rows: Row[]; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      {rows.map((row) => (
        <InfoRow key={row[0]} mono={mono} row={row} />
      ))}
    </div>
  );
}

function SectionTitle({ children, icon, copy }: { children: React.ReactNode; icon?: React.ReactNode; copy?: string }) {
  return (
    <h3 className="group/title flex items-center gap-1.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
      {icon}
      {children}
      {copy && (
        <CopyButton
          className="size-4 opacity-0 focus-visible:opacity-100 group-hover/title:opacity-100"
          label={`Copy ${String(children).toLowerCase()} section`}
          text={copy}
        />
      )}
    </h3>
  );
}

function InfoSection({ title, rows }: Section) {
  return (
    <section className="flex flex-col gap-1.5">
      <SectionTitle copy={rows.map(lineText).join("\n")}>{title}</SectionTitle>
      <InfoRows rows={rows} />
    </section>
  );
}

function useExif(src: string | undefined) {
  const [state, setState] = useState<{ src?: string; data: ExifData | null; loading: boolean }>({
    data: null,
    loading: false,
  });
  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    setState({ src, data: null, loading: true });
    readExif(src).then((data) => !cancelled && setState({ src, data, loading: false }));
    return () => {
      cancelled = true;
    };
  }, [src]);
  return state.src === src ? state : { data: null, loading: !!src };
}

/** Camera metadata read from the original file with exif-js. */
function ExifBlock({ data, loading, type }: { data: ExifData | null; loading: boolean; type: string }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Spinner className="size-3.5" /> Reading metadata…
      </div>
    );
  }

  if (!data) {
    return <InfoSection rows={[["EXIF", exifUnavailable(type)]]} title="Metadata" />;
  }

  return (
    <>
      {data.sections.map((s) =>
        s.title === "Location" && data.gps ? (
          <section className="flex flex-col gap-1.5" key={s.title}>
            <SectionTitle copy={s.rows.map(lineText).join("\n")} icon={<MapPinIcon className="size-3" />}>
              Location
            </SectionTitle>
            <InfoRows rows={s.rows} />
            <Button
              onClick={() =>
                window.open(
                  `https://www.openstreetmap.org/?mlat=${data.gps!.lat}&mlon=${data.gps!.lng}#map=15/${data.gps!.lat}/${data.gps!.lng}`,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              size="sm"
              variant="outline"
            >
              <ExternalLinkIcon /> Open map
            </Button>
            <p className="text-[11px] text-muted-foreground leading-snug">
              This photo records where it was taken. Exports and uploads from BetterViewer don't include it.
            </p>
          </section>
        ) : (
          <InfoSection key={s.title} rows={s.rows} title={s.title} />
        )
      )}
      {data.all.length > 0 && (
        <Collapsible>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger className="flex flex-1 items-center justify-between rounded-md py-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wide hover:text-foreground">
              All EXIF tags ({data.all.length})
              <CollapsibleIndicator className="[&_svg]:size-3.5" />
            </CollapsibleTrigger>
            <CopyButton label="Copy all EXIF tags" text={data.all.map(lineText).join("\n")} />
          </div>
          <CollapsibleContent className="pt-1.5">
            <InfoRows mono rows={data.all} />
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  );
}

const exifUnavailable = (type: string) =>
  /jpe?g/i.test(type) ? "None found" : "Not available for this format";

function CopyAllButton({ text }: { text: string }) {
  const { copied, copy } = useCopied(text, "image info");
  return (
    <Button className="w-full" onClick={copy} size="sm" variant="outline">
      {copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Copied" : "Copy all info"}
    </Button>
  );
}

/** Floating, draggable panel with details about the current image. */
export function ImageInfoPanel() {
  const doc = useDoc((s) => s.doc);
  const original = useDoc((s) => s.original);
  const edits = useDoc((s) => s.past.length);
  const open = useUi((s) => s.panels.info);
  const togglePanel = useUi((s) => s.togglePanel);
  // EXIF lives in the original file (crops re-encode without it).
  const exif = useExif(open ? original?.src : undefined);
  if (!doc || !original) return null;
  const { image } = doc;
  const r = normRotation(doc.rotation);

  const sections: Section[] = [
    {
      title: "File",
      rows: [
        ["Name", original.name],
        ["Type", (original.type.split("/")[1] ?? original.type).toUpperCase()],
        ["File size", formatBytes(original.size)],
        ...(original.sourceUrl ? ([["Source", original.sourceUrl]] as Row[]) : []),
      ],
    },
    {
      title: "Dimensions",
      rows: [
        ["Original", `${original.width} × ${original.height} px`],
        ["Current", `${image.width} × ${image.height} px`],
        ["Megapixels", `${((image.width * image.height) / 1e6).toFixed(2)} MP`],
        ["Aspect ratio", aspectLabel(image.width, image.height)],
      ],
    },
    {
      title: "Edits",
      rows: [
        ["Rotation", `${r}°`],
        ["Flip", [doc.flipX && "Horizontal", doc.flipY && "Vertical"].filter(Boolean).join(", ") || "None"],
        ["Cropped", image.width === original.width && image.height === original.height ? "No" : "Yes"],
        ["Background", image.backgroundRemoved ? "Removed" : "Original"],
        ["Filters", isDefaultFilters(doc.filters) ? "None" : "Adjusted"],
        ["Curves", doc.curves ? "Adjusted" : "None"],
        ["Levels", doc.levels ? "Adjusted" : "None"],
        ["Annotations", String(doc.annotations.length)],
        ["History", `${edits} step${edits === 1 ? "" : "s"}`],
      ],
    },
  ];

  const exifSections: Section[] = exif.loading
    ? []
    : exif.data
      ? exif.data.sections
      : [{ title: "Metadata", rows: [["EXIF", exifUnavailable(original.type)]] }];
  const allText = sectionsToText("Image info", [...sections, ...exifSections]);

  return (
    <ScreenFloatingPanel
      bodyClassName="gap-4"
      footer={<CopyAllButton text={allText} />}
      icon={<InfoIcon />}
      initialPosition={() => ({ x: 16, y: 60 })}
      initialSize={{ width: 300, height: 520 }}
      minSize={{ width: 260, height: 200 }}
      onOpenChange={(o) => togglePanel("info", o)}
      open={open}
      title="Image info"
    >
      <div className="checkerboard flex h-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
        <img
          alt=""
          className="max-h-full max-w-full object-contain"
          draggable={false}
          src={image.src}
          style={{
            transform: `rotate(${r}deg) scale(${doc.flipX ? -1 : 1}, ${doc.flipY ? -1 : 1})`,
          }}
        />
      </div>
      {sections.map((section) => (
        <InfoSection key={section.title} rows={section.rows} title={section.title} />
      ))}
      <ExifBlock data={exif.data} loading={exif.loading} type={original.type} />
    </ScreenFloatingPanel>
  );
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

function aspectLabel(w: number, h: number) {
  const g = gcd(w, h);
  const a = w / g;
  const b = h / g;
  return a <= 50 && b <= 50 ? `${a}:${b}` : `${(w / h).toFixed(2)}:1`;
}
