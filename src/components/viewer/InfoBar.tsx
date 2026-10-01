import { CheckIcon, CopyIcon, ExternalLinkIcon, ImageIcon, InfoIcon, MapPinIcon } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleIndicator, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";
import { Hint, HintContent, HintTrigger } from "@/components/ui/hint";
import { ScreenFloatingPanel } from "@/components/panels/FloatingPanel";
import { toast } from "@/components/ui/toast";
import { writeClipboardText } from "@/lib/clipboard";
import { type ExifData, readExif } from "@/lib/exif";
import { formatBytes } from "@/lib/image";
import { isDefaultFilters } from "@/lib/filters";
import { cn } from "@/lib/utils";
import { normRotation, useDoc } from "@/state/document";
import { useUi } from "@/state/ui";
import { dims, midSentence, t, useT } from "@/lib/i18n";

/** Top-left file chip; toggles the floating image info panel. */
export function InfoBar() {
  const t = useT();
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
            {dims(image.width, image.height)}
          </span>
        </button>
      </HintTrigger>
      {!open && <HintContent>{t("Image info")}</HintContent>}
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
  const t = useT();
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
          await writeClipboardText(text);
          setCopied(true);
        } catch {
          toast.error({ title: t("Couldn't copy"), description: t("This page doesn't allow copying.") });
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
      await writeClipboardText(text);
      setCopied(true);
    } catch {
      toast.error({ title: t("Couldn't copy {item}", { item: label }), description: t("This page doesn't allow copying.") });
    }
  };
  return { copied, copy };
}

/** A label/value line; click anywhere on it to copy the value. */
function InfoRow({ row, mono }: { row: Row; mono?: boolean }) {
  const t = useT();
  const [k, v] = row;
  const { copied, copy } = useCopied(v, mono ? k : midSentence(k));
  return (
    <button
      aria-label={`${t("Copy {item}", { item: mono ? k : midSentence(k) })} (${v})`}
      className="group/row -mx-1.5 flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-xs outline-none transition-colors hover:bg-accent/70 focus-visible:bg-accent/70"
      onClick={copy}
      title={`${v}\n(${t("click to copy")})`}
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
  const t = useT();
  return (
    <h3 className="group/title flex items-center gap-1.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
      {icon}
      {children}
      {copy && (
        <CopyButton
          className="size-4 opacity-0 focus-visible:opacity-100 group-hover/title:opacity-100"
          label={t("Copy the {section} section", { section: midSentence(String(children)) })}
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
  const t = useT();
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Spinner className="size-3.5" /> {t("Reading metadata…")}
      </div>
    );
  }

  if (!data) {
    return <InfoSection rows={[["EXIF", exifUnavailable(type)]]} title={t("Metadata")} />;
  }

  return (
    <>
      {data.sections.map((s) =>
        s.title === "Location" && data.gps ? (
          <section className="flex flex-col gap-1.5" key={s.title}>
            <SectionTitle copy={s.rows.map(lineText).join("\n")} icon={<MapPinIcon className="size-3" />}>
              {t("Location")}
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
              <ExternalLinkIcon /> {t("Open map")}
            </Button>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {t("This photo records where it was taken. Exports and uploads from BetterViewer don't include it.")}
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
            <CopyButton label={t("Copy all EXIF tags")} text={data.all.map(lineText).join("\n")} />
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
  /jpe?g/i.test(type) ? t("None found") : t("Not available for this format");

function CopyAllButton({ text }: { text: string }) {
  const t = useT();
  const { copied, copy } = useCopied(text, t("image info"));
  return (
    <Button className="w-full" onClick={copy} size="sm" variant="outline">
      {copied ? <CheckIcon /> : <CopyIcon />} {copied ? t("Copied") : t("Copy all info")}
    </Button>
  );
}

/** Floating, draggable panel with details about the current image. */
export function ImageInfoPanel() {
  const t = useT();
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
      title: t("File"),
      rows: [
        [t("Name"), original.name],
        [t("Type"), (original.type.split("/")[1] ?? original.type).toUpperCase()],
        [t("File size"), formatBytes(original.size)],
        ...(original.sourceUrl ? ([[t("Source"), original.sourceUrl]] as Row[]) : []),
      ],
    },
    {
      title: t("Dimensions"),
      rows: [
        [t("Original"), `${dims(original.width, original.height)} px`],
        [t("Current"), `${dims(image.width, image.height)} px`],
        [t("Megapixels"), `${((image.width * image.height) / 1e6).toFixed(2)} MP`],
        [t("Aspect ratio"), aspectLabel(image.width, image.height)],
      ],
    },
    {
      title: t("Edits"),
      rows: [
        [t("Rotation"), `${r}°`],
        [t("Flip"), [doc.flipX && t("Horizontal"), doc.flipY && t("Vertical")].filter(Boolean).join(", ") || t("None")],
        [t("Cropped"), image.width === original.width && image.height === original.height ? t("No") : t("Yes")],
        [t("Background"), image.backgroundRemoved ? t("Removed") : t("Original")],
        [t("Filters"), isDefaultFilters(doc.filters) ? t("None") : t("Adjusted")],
        [t("Curves"), doc.curves ? t("Adjusted") : t("None")],
        [t("Levels"), doc.levels ? t("Adjusted") : t("None")],
        [t("Annotations"), String(doc.annotations.length)],
        [t("History"), t("{count} steps", { count: edits })],
      ],
    },
  ];

  const exifSections: Section[] = exif.loading
    ? []
    : exif.data
      ? exif.data.sections
      : [{ title: t("Metadata"), rows: [["EXIF", exifUnavailable(original.type)]] }];
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
      title={t("Image info")}
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
