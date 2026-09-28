import type Konva from "konva";
import { memo, useCallback } from "react";
import { Shape } from "react-konva";
import type { EmojiAnnotation } from "@/lib/annotations";
import { emojiMetrics } from "@/lib/emoji";

type NodeProps = Omit<Konva.ShapeConfig, "sceneFunc" | "hitFunc">;

/** An emoji glyph, centred in its size × size box. */
export const EmojiNode = memo(function EmojiNode({ a, nodeProps }: { a: EmojiAnnotation; nodeProps: NodeProps }) {
  const sceneFunc = useCallback(
    (ctx: Konva.Context) => {
      const native = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
      native.save();
      native.textAlign = "left";
      native.textBaseline = "alphabetic";
      const m = emojiMetrics(native, a.emoji, a.size);
      native.font = m.font;
      native.fillStyle = "#000";
      native.fillText(a.emoji, m.x, m.y);
      native.restore();
    },
    [a.emoji, a.size]
  );

  const hitFunc = useCallback(
    (ctx: Konva.Context, shape: Konva.Shape) => {
      ctx.beginPath();
      ctx.rect(0, 0, a.size, a.size);
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    },
    [a.size]
  );

  return (
    <Shape
      {...nodeProps}
      fill="#000"
      height={a.size}
      hitFunc={hitFunc}
      sceneFunc={sceneFunc}
      width={a.size}
    />
  );
});
