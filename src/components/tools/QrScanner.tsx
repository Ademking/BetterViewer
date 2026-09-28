import {
  CalendarIcon,
  CheckIcon,
  ContactIcon,
  CopyIcon,
  ExternalLinkIcon,
  LinkIcon,
  MailIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  PhoneIcon,
  QrCodeIcon,
  RefreshCwIcon,
  ScanSearchIcon,
  TextIcon,
  WifiIcon,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Line } from "react-konva";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ScreenFloatingPanel } from "@/components/panels/FloatingPanel";
import { Hinted } from "@/components/tools/ToolButton";
import { copyText } from "@/lib/actions";
import { describeQr, isSafeHref, type QrCode, type QrKind } from "@/lib/qr";
import { stageRegistry } from "@/lib/stageRegistry";
import { useView, viewport } from "@/lib/viewport";
import { cn } from "@/lib/utils";
import { useDoc } from "@/state/document";
import { scanCurrentImage, useQr } from "@/state/qr";
import { useUi } from "@/state/ui";
import { ACCENT } from "@/components/viewer/SelectionTransformer";

const KIND_ICONS: Record<QrKind, React.ReactNode> = {
  url: <LinkIcon />,
  email: <MailIcon />,
  phone: <PhoneIcon />,
  sms: <MessageSquareTextIcon />,
  wifi: <WifiIcon />,
  geo: <MapPinIcon />,
  contact: <ContactIcon />,
  event: <CalendarIcon />,
  text: <TextIcon />,
};


/** Zoom the board to a code's outline. */
export function locateQr(index: number) {
  const stage = stageRegistry.stage;
  const node = stageRegistry.annotationLayer?.findOne(`#qr-outline-${index}`);
  useQr.setState({ active: index });
  if (!stage || !node) return;
  const r = node.getClientRect({ relativeTo: stage });
  const pad = Math.max(r.width, r.height) * 0.6;
  viewport.zoomToRect({ x: r.x - pad, y: r.y - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
}

/** Outlines of detected codes, drawn in document space while the panel is open. */
export function QrHighlights() {
  const open = useUi((s) => s.panels.qr);
  const src = useDoc((s) => s.doc?.image.src);
  const qrSrc = useQr((s) => s.src);
  const codes = useQr((s) => s.codes);
  const active = useQr((s) => s.active);
  const scale = useView((s) => s.scale);
  if (!open || !codes.length || src !== qrSrc) return null;
  const px = 1 / scale;

  return (
    <>
      {codes.map((c, i) => {
        const pts = c.corners.flatMap((p) => [p.x, p.y]);
        const isActive = active === i;
        return (
          <Line
            closed
            dash={isActive ? undefined : [6 * px, 4 * px]}
            fill={isActive ? "rgba(49,130,237,0.16)" : "rgba(49,130,237,0.06)"}
            id={`qr-outline-${i}`}
            name="qr-outline"
            key={i}
            lineJoin="round"
            listening={false}
            points={pts}
            stroke={ACCENT}
            strokeWidth={(isActive ? 3 : 2) * px}
          />
        );
      })}
    </>
  );
}

function QrResultCard({ code, index }: { code: QrCode; index: number }) {
  const info = describeQr(code.content);
  const active = useQr((s) => s.active === index);
  const [copied, setCopied] = useState(false);
  const canOpen = info.href && isSafeHref(info.href);

  const copy = async () => {
    await copyText(code.content, info.kind === "url" ? "link" : "QR content");
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border bg-background/40 p-3 transition-colors",
        active && "border-brand/60"
      )}
      onPointerEnter={() => useQr.setState({ active: index })}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-foreground [&_svg]:size-4">
          {KIND_ICONS[info.kind]}
        </span>
        <div className="min-w-0 flex-1 font-medium text-sm">{info.label}</div>
        <Hinted label="Locate on image">
          <Button aria-label="Locate on image" onClick={() => locateQr(index)} size="icon-sm" variant="ghost">
            <ScanSearchIcon />
          </Button>
        </Hinted>
      </div>

      <div className="max-h-40 overflow-auto rounded-lg bg-muted/60 px-2.5 py-2 font-mono text-xs break-all whitespace-pre-wrap select-text">
        {code.content || <span className="text-muted-foreground">(empty)</span>}
      </div>

      {info.details && info.details.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {info.details.map(([k, v]) => (
            <div className="contents" key={k}>
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="flex min-w-0 items-center justify-end gap-1">
                <span className="truncate font-medium" title={v}>
                  {v}
                </span>
                <button
                  aria-label={`Copy ${k}`}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => copyText(v, k.toLowerCase())}
                  type="button"
                >
                  <CopyIcon className="size-3" />
                </button>
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex gap-2">
        <Button className="flex-1" onClick={copy} size="sm" variant="outline">
          {copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Copied" : "Copy"}
        </Button>
        {canOpen && (
          <Button
            className="flex-1"
            onClick={() => window.open(info.href, "_blank", "noopener,noreferrer")}
            size="sm"
          >
            <ExternalLinkIcon />
            {info.kind === "url" ? "Open link" : info.kind === "geo" ? "Open map" : "Open"}
          </Button>
        )}
      </div>
    </div>
  );
}

export function QrPanel() {
  const open = useUi((s) => s.panels.qr);
  const togglePanel = useUi((s) => s.togglePanel);
  const status = useQr((s) => s.status);
  const codes = useQr((s) => s.codes);
  const error = useQr((s) => s.error);
  const qrSrc = useQr((s) => s.src);
  const src = useDoc((s) => s.doc?.image.src);
  const stale = !!src && qrSrc !== src;
  const scanning = status === "scanning" && !stale;

  return (
    <ScreenFloatingPanel
      bodyClassName="gap-3"
      footer={
        <>
          <span className="self-center text-muted-foreground text-xs">
            {scanning
              ? "Scanning…"
              : status === "done" && !stale
                ? `${codes.length} code${codes.length === 1 ? "" : "s"} found`
                : ""}
          </span>
          <Button
            disabled={scanning || !src}
            onClick={() => scanCurrentImage({ reveal: true, force: true })}
            size="sm"
            variant="ghost"
          >
            <RefreshCwIcon /> {status === "idle" || stale ? "Scan" : "Rescan"}
          </Button>
        </>
      }
      icon={<QrCodeIcon />}
      initialPosition={(vp, size) => ({ x: vp.width - size.width - 16, y: 60 })}
      initialSize={{ width: 320, height: 460 }}
      minSize={{ width: 280, height: 200 }}
      onOpenChange={(o) => {
        togglePanel("qr", o);
        if (!o) useQr.setState({ active: null });
      }}
      open={open}
      title="QR codes"
    >
      {scanning && (
        <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground text-sm">
          <Spinner className="size-6" />
          Looking for QR codes…
        </div>
      )}

      {!scanning && (status === "idle" || stale) && (
        <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground text-sm">
          <QrCodeIcon className="size-8 opacity-60" />
          Scan this image for QR codes.
          <Button onClick={() => scanCurrentImage({ reveal: true, force: true })} size="sm">
            <ScanSearchIcon /> Scan image
          </Button>
        </div>
      )}

      {!scanning && !stale && status === "error" && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive-foreground text-sm">
          Scanning failed: {error}
        </div>
      )}

      {!scanning && !stale && status === "done" && codes.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <QrCodeIcon className="size-8 text-muted-foreground opacity-60" />
          <div className="font-medium text-sm">No QR code found</div>
          <p className="max-w-60 text-muted-foreground text-xs">
            If there is one, try cropping closer to it or undoing filters, then rescan.
          </p>
        </div>
      )}

      {!scanning &&
        !stale &&
        status === "done" &&
        codes.map((code, i) => <QrResultCard code={code} index={i} key={`${i}-${code.content}`} />)}
    </ScreenFloatingPanel>
  );
}
