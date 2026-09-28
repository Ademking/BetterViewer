import Konva from "konva";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { Group } from "react-konva";
import { useDoc } from "@/state/document";
import { useSettings } from "@/state/settings";

interface DocGroupProps {
  children: ReactNode;
  onNode?: (node: Konva.Group | null) => void;
}

/**
 * The document coordinate system: image-local space, centred on the world
 * origin, with rotation and flips applied (and animated) around the centre.
 */
export function DocGroup({ children, onNode }: DocGroupProps) {
  const ref = useRef<Konva.Group>(null);
  const width = useDoc((s) => s.doc?.image.width ?? 0);
  const height = useDoc((s) => s.doc?.image.height ?? 0);
  const rotation = useDoc((s) => s.doc?.rotation ?? 0);
  const flipX = useDoc((s) => s.doc?.flipX ?? false);
  const flipY = useDoc((s) => s.doc?.flipY ?? false);
  const smooth = useSettings((s) => s.smoothAnimations);
  const initialised = useRef(false);

  useLayoutEffect(() => {
    onNode?.(ref.current);
    return () => onNode?.(null);
  }, [onNode]);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const attrs = {
      rotation,
      scaleX: flipX ? -1 : 1,
      scaleY: flipY ? -1 : 1,
    };
    if (!initialised.current || !smooth) {
      initialised.current = true;
      node.setAttrs(attrs);
      node.getLayer()?.batchDraw();
      return;
    }
    const tween = new Konva.Tween({
      node,
      duration: 0.34,
      easing: Konva.Easings.EaseInOut,
      ...attrs,
    });
    tween.play();
    return () => tween.destroy();
  }, [rotation, flipX, flipY, smooth]);

  return (
    <Group offsetX={width / 2} offsetY={height / 2} ref={ref}>
      {children}
    </Group>
  );
}
