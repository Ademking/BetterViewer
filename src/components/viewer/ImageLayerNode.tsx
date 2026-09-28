import type Konva from "konva";
import { memo } from "react";
import { Image as KonvaImage } from "react-konva";
import { useImage } from "@/hooks/useImage";
import type { ImageAnnotation } from "@/lib/annotations";

type NodeProps = Omit<Konva.ImageConfig, "image">;

/**
 * A picture inserted on top of the main image. Always the same Konva node
 * type (even before the bitmap decodes) so selection handles stay attached.
 */
export const ImageLayerNode = memo(function ImageLayerNode({
  a,
  nodeProps,
}: {
  a: ImageAnnotation;
  nodeProps: NodeProps;
}) {
  const { image } = useImage(a.src);
  return (
    <KonvaImage
      {...nodeProps}
      // Placeholder tint until decoded; also gives a hit area.
      fill={image ? undefined : "rgba(128,128,128,0.25)"}
      height={a.height}
      image={image ?? undefined}
      width={a.width}
    />
  );
});
