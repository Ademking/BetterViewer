import { applyPalette, GIFEncoder, quantize } from "gifenc";

/**
 * Animated GIF encoding (gifenc). Each frame gets its own 256-colour palette;
 * pixels more than half transparent become transparent, the rest opaque (GIF
 * has no partial transparency).
 */
export function createGifWriter(width: number, height: number, loops: number) {
  const gif = GIFEncoder();
  // NETSCAPE loop count: 0 = forever, -1 = no loop block (plays once), n = n repeats.
  const repeat = loops === Number.POSITIVE_INFINITY ? 0 : loops <= 0 ? -1 : Math.min(65535, Math.round(loops));
  return {
    /** Add one frame (`width` × `height` RGBA pixels) shown for `delay` ms. */
    add(data: Uint8ClampedArray, delay: number) {
      let transparent = false;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          transparent = true;
          break;
        }
      }
      const format = transparent ? "rgba4444" : "rgb565";
      const palette = quantize(data, 256, { format, oneBitAlpha: transparent });
      const index = applyPalette(data, palette, format);
      const transparentIndex = transparent ? palette.findIndex((c) => c[3] === 0) : -1;
      gif.writeFrame(index, width, height, {
        palette,
        delay,
        repeat,
        transparent: transparentIndex >= 0,
        transparentIndex: Math.max(0, transparentIndex),
        // Every frame is whole: clear the previous one first, so it can't show
        // through the transparent pixels of the next.
        dispose: 2,
      });
    },
    finish() {
      gif.finish();
      return new Blob([gif.bytes()], { type: "image/gif" });
    },
  };
}
