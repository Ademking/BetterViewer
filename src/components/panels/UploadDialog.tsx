import {
  CheckIcon,
  CloudUploadIcon,
  CopyIcon,
  ExternalLinkIcon,
  GlobeIcon,
  KeyRoundIcon,
  RotateCcwIcon,
  TrashIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Clipboard,
  ClipboardIndicator,
  ClipboardInput,
  ClipboardTrigger,
} from "@/components/ui/clipboard";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SegmentGroup, SegmentGroupItem, SegmentGroupItemText } from "@/components/ui/segment-group";
import { toast } from "@/components/ui/toast";
import { type ExportFormat, renderDocument } from "@/lib/actions";
import { baseName, formatBytes } from "@/lib/image";
import { EXPIRY_OPTIONS } from "@/lib/imgbb";
import { PROVIDER_LIST, PROVIDERS, type UploadResult } from "@/lib/upload";
import { useDoc } from "@/state/document";
import { type UploadProviderId, useSettings } from "@/state/settings";
import { useUi } from "@/state/ui";
import { dims, midSentence, useT } from "@/lib/i18n";

function Segments<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const t = useT();
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
          <SegmentGroupItemText>{t(o.label)}</SegmentGroupItemText>
        </SegmentGroupItem>
      ))}
    </SegmentGroup>
  );
}

function LinkRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-sm">{label}</span>
        {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
      </div>
      <Clipboard className="w-full" rootClassName="w-full" value={value}>
        <ClipboardInput className="min-w-0 flex-1 font-mono text-xs" readOnly />
        <ClipboardTrigger asChild>
          <Button aria-label={t("Copy {item}", { item: midSentence(label) })} size="icon-md" variant="outline">
            <ClipboardIndicator copied={<CheckIcon className="text-success" />}>
              <CopyIcon />
            </ClipboardIndicator>
          </Button>
        </ClipboardTrigger>
      </Clipboard>
    </div>
  );
}

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
];

const PROVIDER_OPTIONS = PROVIDER_LIST.map((p) => ({ value: p.id, label: p.label }));

export function UploadDialog() {
  const t = useT();
  const open = useUi((s) => s.panels.upload);
  const togglePanel = useUi((s) => s.togglePanel);
  const image = useDoc((s) => s.doc?.image);
  const providerId = useSettings((s) => s.uploadProvider);
  const savedKey = useSettings((s) => s.imgbbApiKey);
  const setSetting = useSettings((s) => s.set);
  const [format, setFormat] = useState<ExportFormat>("png");
  const [expiration, setExpiration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [keyDraft, setKeyDraft] = useState("");

  const provider = PROVIDERS[providerId] ?? PROVIDERS.kappa;
  // Re-evaluated when the saved key changes.
  const needsKey = provider.id === "imgbb" && !savedKey && !!provider.unavailableReason();

  // Fresh form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setResult(null);
      setError(null);
      setKeyDraft("");
      setDeleted(false);
    }
  }, [open]);

  const upload = async () => {
    if (!image) return;
    if (needsKey && keyDraft.trim()) setSetting("imgbbApiKey", keyDraft.trim());
    setBusy(true);
    setError(null);
    try {
      const blob = await renderDocument(format, 0.92);
      const res = await provider.upload(blob, {
        name: baseName(image.name),
        expiration: provider.supportsExpiry ? expiration : 0,
      });
      setDeleted(false);
      setResult(res);
      toast.success({ title: t("Uploaded to {service}", { service: provider.label }), description: t("The link is ready to share.") });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const deleteNow = async () => {
    if (!result?.deleteNow) return;
    setDeleting(true);
    try {
      await result.deleteNow();
      setDeleted(true);
      toast.success({ title: t("Deleted"), description: t("The image was removed from {service}.", { service: PROVIDERS[result.provider].label }) });
    } catch (err) {
      toast.error({ title: t("Couldn't delete"), description: (err as Error).message });
    } finally {
      setDeleting(false);
    }
  };

  const expiryLabel = (r: UploadResult) => {
    if (r.provider === "kappa") return t("Stays online until you delete it");
    const secs = r.expiration ?? 0;
    const option = EXPIRY_OPTIONS.find((o) => o.value === secs);
    return secs
      ? t("Expires in {time}", { time: option ? t(option.label) : `${Math.round(secs / 3600)} h` })
      : t("Never expires");
  };

  const resultMeta = (r: UploadResult) =>
    [r.width && r.height ? `${dims(r.width, r.height)} px` : null, r.size ? formatBytes(r.size) : null]
      .filter(Boolean)
      .join(" · ");

  return (
    <Dialog onOpenChange={(d) => togglePanel("upload", d.open)} open={open}>
      <DialogContent className="glass" size="md">
        <DialogHeader
          description={
            result
              ? deleted
                ? t("The image has been deleted; these links no longer work.")
                : t("Anyone with these links can view the image.")
              : t("Uploads the edited image and creates a public link anyone can open.")
          }
          title={result ? (deleted ? t("Deleted") : t("Uploaded")) : t("Upload image")}
        />
        <DialogBody className="flex flex-col gap-5">
          {!result && (
            <>
              <div className="flex items-center gap-3">
                {image && (
                  <img
                    alt=""
                    className="checkerboard checker-sm size-16 shrink-0 rounded-lg border object-contain"
                    src={image.src}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-sm" title={image?.name}>
                    {image?.name}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {dims(image?.width, image?.height)} px · {t("includes edits and annotations")}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-medium text-sm">{t("Upload to")}</span>
                <Segments
                  onChange={(v: UploadProviderId) => setSetting("uploadProvider", v)}
                  options={PROVIDER_OPTIONS}
                  value={provider.id}
                />
              </div>

              {needsKey && (
                <div className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-3">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <KeyRoundIcon className="size-4 text-muted-foreground" /> {t("ImgBB API key")}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Get a free key at{" "}
                    <a
                      className="text-foreground underline underline-offset-2"
                      href="https://api.imgbb.com/"
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      api.imgbb.com
                    </a>
                    , or upload to kappa.lol instead (no key needed).
                  </p>
                  <Input
                    aria-label={t("ImgBB API key")}
                    autoComplete="off"
                    onChange={(e) => setKeyDraft(e.target.value)}
                    placeholder={t("Paste your API key")}
                    size="sm"
                    spellCheck={false}
                    type="password"
                    value={keyDraft}
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <span className="font-medium text-sm">{t("Format")}</span>
                <Segments onChange={setFormat} options={FORMATS} value={format} />
              </div>

              {provider.supportsExpiry ? (
                <div className="flex flex-col gap-2">
                  <span className="font-medium text-sm">{t("Delete automatically")}</span>
                  <Segments onChange={setExpiration} options={EXPIRY_OPTIONS} value={expiration} />
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  kappa.lol keeps the image until you delete it. You'll get a delete link, and can
                  delete it right from here after uploading.
                </p>
              )}

              <div className="flex items-start gap-2 text-muted-foreground text-xs">
                <GlobeIcon className="mt-0.5 size-3.5 shrink-0" />
                The image will be public on {provider.host}. Don't upload anything private.
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-destructive-foreground text-sm">
                  <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}

          {result && (
            <>
              <div className="flex items-center gap-3">
                {image && (
                  <img
                    alt={t("Uploaded image")}
                    className="checkerboard checker-sm size-16 shrink-0 rounded-lg border object-contain"
                    src={result.provider === "imgbb" ? result.thumbUrl : image.src}
                  />
                )}
                <div className="min-w-0 text-xs">
                  <div className="font-medium text-sm">
                    {PROVIDERS[result.provider].label}
                    {resultMeta(result) && (
                      <span className="font-normal text-muted-foreground"> · {resultMeta(result)}</span>
                    )}
                  </div>
                  <div className="text-muted-foreground">{deleted ? t("Deleted") : expiryLabel(result)}</div>
                </div>
              </div>
              {!deleted && (
                <>
                  <LinkRow label={t("Share link")} value={result.pageUrl} />
                  {result.directUrl !== result.pageUrl && (
                    <LinkRow label={t("Direct image link")} value={result.directUrl} />
                  )}
                  <LinkRow hint={t("Keep this private")} label={t("Delete link")} value={result.deleteUrl} />
                </>
              )}
            </>
          )}
        </DialogBody>
        <DialogFooter className="py-3">
          {!result ? (
            <>
              <Button onClick={() => togglePanel("upload", false)} size="sm" variant="ghost">
                {t("Cancel")}
              </Button>
              <Button disabled={!image || (needsKey && !keyDraft.trim())} isLoading={busy} onClick={upload} size="sm">
                <CloudUploadIcon /> Upload to {provider.label}
              </Button>
            </>
          ) : (
            <>
              {result.deleteNow && !deleted && (
                <Button
                  className="sm:me-auto"
                  isLoading={deleting}
                  onClick={deleteNow}
                  size="sm"
                  variant="ghost"
                >
                  <TrashIcon /> {t("Delete now")}
                </Button>
              )}
              <Button onClick={() => setResult(null)} size="sm" variant="ghost">
                <RotateCcwIcon /> {t("Upload again")}
              </Button>
              {!deleted && (
                <Button
                  onClick={() => window.open(result.pageUrl, "_blank", "noopener,noreferrer")}
                  size="sm"
                  variant="outline"
                >
                  <ExternalLinkIcon /> {t("Open")}
                </Button>
              )}
              <Button onClick={() => togglePanel("upload", false)} size="sm">
                {t("Done")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
