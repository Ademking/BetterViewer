import { ChevronLeftIcon, ChevronRightIcon, ImageOffIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Hinted } from "@/components/tools/ToolButton";
import { Spinner } from "@/components/ui/spinner";
import { type GalleryItem, loadThumb, showGalleryItem, stepGallery, useGallery } from "@/lib/gallery";
import { cn } from "@/lib/utils";
import { useSettings } from "@/state/settings";
import { dims, useT } from "@/lib/i18n";

/** Rail width + its margin; the board keeps this much room on the left. */
export const GALLERY_RAIL_SPACE = 112;

function Thumb({ item, i, active }: { item: GalleryItem; i: number; active: boolean }) {
  const t = useT();
  // A downloaded copy when the address can't be shown directly (see loadThumb).
  const downloaded = useGallery((s) => s.thumbs[item.src]);
  const src = downloaded ?? (/^blob:/i.test(item.src) ? undefined : item.src);
  const broken = downloaded === "failed";
  const label = item.alt?.trim() || t("Image {number}", { number: i + 1 });
  return (
    <button
      aria-current={active || undefined}
      aria-label={label}
      className={cn(
        "relative aspect-square w-full shrink-0 overflow-hidden rounded-lg bg-muted/60 outline-none transition",
        "ring-offset-2 ring-offset-transparent hover:opacity-100 focus-visible:ring-2 focus-visible:ring-brand/70",
        active ? "ring-2 ring-brand" : "opacity-70"
      )}
      data-index={i}
      onClick={() => showGalleryItem(i)}
      title={item.width && item.height ? `${label} (${dims(item.width, item.height)})` : label}
      type="button"
    >
      {src && !broken ? (
        <img
          alt=""
          className="size-full object-cover"
          decoding="async"
          draggable={false}
          loading="lazy"
          onError={() => void loadThumb(item.src)}
          src={src}
        />
      ) : (
        <ImageOffIcon className="absolute inset-0 m-auto size-4 text-muted-foreground" />
      )}
    </button>
  );
}

/** Left thumbnail rail + previous / next buttons of the page gallery. */
export function GalleryRail() {
  const t = useT();
  const items = useGallery((s) => s.items);
  const index = useGallery((s) => s.index);
  const busy = useGallery((s) => s.busy);
  const railOpen = useGallery((s) => s.railOpen);
  const rulers = useSettings((s) => s.showRulers);
  const showToolbar = useSettings((s) => s.showToolbar);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the current thumbnail in view.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [index, railOpen]);

  if (!items.length) return null;
  const several = items.length > 1;

  const arrow = "glass absolute top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border text-foreground/80 shadow-lg/10 transition-colors hover:bg-accent hover:text-foreground";

  return (
    <>
      {railOpen && (
        <nav
          aria-label={t("Images on this page")}
          className={cn(
            "glass absolute z-20 flex w-24 flex-col rounded-2xl border shadow-lg/10",
            rulers ? "top-[72px] left-8" : "top-14 left-3",
            showToolbar ? "bottom-24" : "bottom-3"
          )}
          data-chrome
        >
          <div className="flex h-8 shrink-0 items-center justify-center gap-1.5 border-b text-[11px] text-muted-foreground tabular-nums">
            {busy && <Spinner className="size-3" />}
            {index + 1} / {items.length}
          </div>
          <div
            className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2 [scrollbar-width:none]"
            ref={listRef}
          >
            {items.map((item, i) => (
              <Thumb active={i === index} i={i} item={item} key={item.src} />
            ))}
          </div>
        </nav>
      )}

      {several && (
        <>
          <Hinted label={t("Previous image")} shortcut="←" side="right">
            <button
              aria-label={t("Previous image")}
              className={cn(arrow, railOpen ? (rulers ? "left-[136px]" : "left-[112px]") : rulers ? "left-11" : "left-3")}
              data-chrome
              onClick={() => stepGallery(-1)}
              type="button"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
          </Hinted>
          <Hinted label={t("Next image")} shortcut="→" side="left">
            <button
              aria-label={t("Next image")}
              className={cn(arrow, "right-3")}
              data-chrome
              onClick={() => stepGallery(1)}
              type="button"
            >
              <ChevronRightIcon className="size-5" />
            </button>
          </Hinted>
        </>
      )}
    </>
  );
}
