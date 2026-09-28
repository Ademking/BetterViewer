import { ImageIcon, LayersIcon, TriangleAlertIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { formatBytes } from "@/lib/image";
import { useDoc } from "@/state/document";
import { type IncomingImageAction, useSettings } from "@/state/settings";

interface IncomingRequest {
  blob: Blob;
  name: string;
  onLayer: () => void;
  onOpen: () => void;
}

const useIncoming = create<{ request: IncomingRequest | null }>()(() => ({ request: null }));

/** Ask whether a dropped / pasted picture goes on top of the open image or replaces it. */
export const askIncomingImage = (request: IncomingRequest) => useIncoming.setState({ request });

function ChoiceCard({
  icon,
  title,
  description,
  warning,
  onClick,
  autoFocus,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  warning?: string;
  onClick: () => void;
  autoFocus?: boolean;
}) {
  return (
    <button
      autoFocus={autoFocus}
      className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-left outline-none transition-colors hover:border-brand/70 hover:bg-brand/[0.05] focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
      onClick={onClick}
      type="button"
    >
      <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white [&_svg]:size-5">
        {icon}
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-semibold text-sm">{title}</span>
        <span className="text-muted-foreground text-xs leading-relaxed">{description}</span>
        {warning && (
          <span className="mt-1 flex items-start gap-1.5 text-warning-foreground text-xs">
            <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
            {warning}
          </span>
        )}
      </span>
    </button>
  );
}

export function IncomingImageDialog() {
  const request = useIncoming((s) => s.request);
  const hasHistory = useDoc((s) => s.past.length > 0);
  const setSetting = useSettings((s) => s.set);
  const [remember, setRemember] = useState(false);
  const [preview, setPreview] = useState<{ url: string; width: number; height: number } | null>(null);

  // Thumbnail + size of the incoming picture.
  useEffect(() => {
    if (!request) return;
    setRemember(false);
    const url = URL.createObjectURL(request.blob);
    const img = new Image();
    img.onload = () => setPreview({ url, width: img.naturalWidth, height: img.naturalHeight });
    img.src = url;
    return () => {
      URL.revokeObjectURL(url);
      setPreview(null);
    };
  }, [request]);

  const close = () => useIncoming.setState({ request: null });
  const choose = (action: Exclude<IncomingImageAction, "ask">) => {
    if (!request) return;
    if (remember) setSetting("incomingImage", action);
    close();
    if (action === "layer") request.onLayer();
    else request.onOpen();
  };

  return (
    <Dialog onOpenChange={(d) => !d.open && close()} open={!!request}>
      <DialogContent className="glass" size="md">
        <DialogHeader
          description="You already have an image open. Where should this one go?"
          title="Add this image?"
        />
        <DialogBody>
          <div className="flex flex-col gap-4">
            {request && (
              <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-muted/40 p-2.5">
                <div className="checkerboard flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
                  {preview && <img alt="" className="size-full object-contain" draggable={false} src={preview.url} />}
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-sm">{request.name}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {preview ? `${preview.width} × ${preview.height} px · ` : ""}
                    {formatBytes(request.blob.size)}
                  </span>
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard
                autoFocus
                description="Place it on top as a layer you can move, resize and rotate."
                icon={<LayersIcon />}
                onClick={() => choose("layer")}
                title="Add to this image"
              />
              <ChoiceCard
                description="Close the current image and view this one instead."
                icon={<ImageIcon />}
                onClick={() => choose("open")}
                title="Open as new image"
                warning={hasHistory ? "Your current edits will be closed." : undefined}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-muted-foreground text-xs">
            <Switch checked={remember} onCheckedChange={(d) => setRemember(d.checked)} />
            Remember my choice
          </label>
          <Button onClick={close} size="sm" variant="ghost">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
