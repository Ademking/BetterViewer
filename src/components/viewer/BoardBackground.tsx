import { memo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useDoc } from "@/state/document";
import { useSettings } from "@/state/settings";

/**
 * The board behind the image. Default: a heavily blurred, dimmed copy of the
 * current image that cross-fades when the image changes.
 */
export const BoardBackground = memo(function BoardBackground() {
  const mode = useSettings((s) => s.boardBackground);
  const src = useDoc((s) => s.doc?.image.src);
  const [layers, setLayers] = useState<{ src: string; key: number }[]>([]);

  useEffect(() => {
    if (!src) return;
    setLayers((prev) => {
      if (prev.at(-1)?.src === src) return prev;
      return [...prev.slice(-1), { src, key: Date.now() }];
    });
  }, [src]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 transition-colors duration-500",
          mode === "black" && "bg-black",
          mode === "white" && "bg-white",
          mode === "grid" && "checkerboard",
          mode === "blur" && "bg-neutral-950"
        )}
      />
      {mode === "blur" &&
        src &&
        layers.map((l) => (
          <div
            className="bv-fade-in absolute -inset-[12%] bg-cover bg-center opacity-55 blur-[72px] saturate-[1.35]"
            key={l.key}
            style={{ backgroundImage: `url("${l.src}")` }}
          />
        ))}
      {mode === "blur" && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.35)_100%)]" />
      )}
    </div>
  );
});
