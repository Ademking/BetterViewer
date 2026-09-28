import { useEffect, useState } from "react";
import { loadHtmlImage } from "@/lib/image";

/** Resolve an image src to a decoded HTMLImageElement (cached). */
export function useImage(src: string | undefined) {
  const [state, setState] = useState<{
    src?: string;
    image: HTMLImageElement | null;
    error: Error | null;
  }>({ image: null, error: null });

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    loadHtmlImage(src).then(
      (image) => !cancelled && setState({ src, image, error: null }),
      (error: Error) => !cancelled && setState({ src, image: null, error })
    );
    return () => {
      cancelled = true;
    };
  }, [src]);

  // Keep showing the previous image until the next one is decoded.
  return state;
}
