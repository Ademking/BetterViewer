import { XIcon } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FloatingPanel as SharkFloatingPanel,
  FloatingPanelBody,
  FloatingPanelCloseTrigger,
  FloatingPanelContent,
  FloatingPanelControl,
  FloatingPanelFooter,
  FloatingPanelHeader,
  FloatingPanelMinimize,
  FloatingPanelRestore,
  FloatingPanelTitle,
} from "@/components/ui/floating-panel";
import { cn } from "@/lib/utils";

type Point = { x: number; y: number };
type Size = { width: number; height: number };

const MARGIN = 12;

const viewportSize = () => ({ width: window.innerWidth, height: window.innerHeight });

/** Keep a panel rect fully inside the window. */
const clampRect = (pos: Point, size: Size, minIn: Size, staged = false) => {
  const vp = viewportSize();
  // Minimized panels collapse to their header; don't force the min size.
  const min = staged ? { width: minIn.width, height: 0 } : minIn;
  const width = Math.max(Math.min(min.width, vp.width - MARGIN * 2), Math.min(size.width, vp.width - MARGIN * 2));
  const height = Math.max(Math.min(min.height, vp.height - MARGIN * 2), Math.min(size.height, vp.height - MARGIN * 2));
  return {
    size: { width, height },
    position: {
      x: Math.min(Math.max(MARGIN, pos.x), vp.width - width - MARGIN),
      y: Math.min(Math.max(MARGIN, pos.y), vp.height - height - MARGIN),
    },
  };
};

/** Top-left corners of the panels currently open, to avoid stacking new ones. */
const openPanels = new Map<string, Point>();
const CASCADE = 32;

/**
 * Step a new panel down and towards the middle of the screen while another
 * open panel sits at (nearly) the same spot.
 */
function cascade(pos: Point, size: Size, minSize: Size, self: string) {
  const vp = viewportSize();
  const dx = pos.x + size.width / 2 > vp.width / 2 ? -CASCADE : CASCADE;
  let rect = clampRect(pos, size, minSize);
  for (let i = 0; i < 12; i++) {
    const p = rect.position;
    const taken = [...openPanels].some(
      ([id, o]) => id !== self && Math.abs(o.x - p.x) < CASCADE / 2 && Math.abs(o.y - p.y) < CASCADE / 2
    );
    if (!taken) break;
    const next = clampRect({ x: p.x + dx, y: p.y + CASCADE }, size, minSize);
    // Out of room: stay where we are rather than loop in place.
    if (next.position.x === p.x && next.position.y === p.y) break;
    rect = next;
  }
  return rect;
}

interface ScreenFloatingPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  icon?: React.ReactNode;
  /**
   * Default placement, used each time the panel opens until the user moves it;
   * shifted if another open panel is already there.
   */
  initialPosition: (vp: Size, size: Size) => Point;
  initialSize: Size;
  minSize?: Size;
  resizable?: boolean;
  footer?: React.ReactNode;
  bodyClassName?: string;
  children: React.ReactNode;
}

/**
 * Shark floating panel with a controlled rect that is always clamped to the
 * window: while dragging, resizing and when the window itself resizes.
 */
export function ScreenFloatingPanel({
  open,
  onOpenChange,
  title,
  icon,
  initialPosition,
  initialSize,
  minSize: minSizeProp,
  resizable = true,
  footer,
  bodyClassName,
  children,
}: ScreenFloatingPanelProps) {
  const minW = minSizeProp?.width ?? 260;
  const minH = minSizeProp?.height ?? 200;
  const minSize = useMemo(() => ({ width: minW, height: minH }), [minW, minH]);
  const [rect, setRect] = useState(() =>
    clampRect(initialPosition(viewportSize(), initialSize), initialSize, minSize)
  );
  const id = useId();
  // Once dragged, the panel reopens where the user left it.
  const userMoved = useRef(false);

  // Place the panel as it opens (before paint, so it never flashes elsewhere).
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on open
  useLayoutEffect(() => {
    if (!open || userMoved.current) return;
    const size = rect.size;
    setRect(cascade(initialPosition(viewportSize(), size), size, minSize, id));
  }, [open]);

  // Share where this panel is while it's open.
  useEffect(() => {
    if (open) openPanels.set(id, rect.position);
    else openPanels.delete(id);
  }, [open, id, rect.position]);
  useEffect(() => () => void openPanels.delete(id), [id]);

  // Ark fires the stage change and the size change back-to-back, before React
  // re-renders, so the stage lives in a ref the size handler can read at once.
  const stagedRef = useRef(false);
  // Ark's stage can't be controlled; remount the panel after it closes so it
  // always reopens un-minimized (rect lives here, so position is kept).
  const [instance, setInstance] = useState(0);
  const unstagedRect = useRef<typeof rect | null>(null);
  useEffect(() => {
    if (open) return;
    if (stagedRef.current && unstagedRect.current) setRect(unstagedRect.current);
    stagedRef.current = false;
    setInstance((i) => i + 1);
  }, [open]);

  const update = useCallback(
    (pos: Point, size: Size) => setRect(clampRect(pos, size, minSize, stagedRef.current)),
    [minSize]
  );

  // Re-clamp when the window changes size, and on open in case it changed
  // while the panel was closed.
  useEffect(() => {
    if (!open) return;
    const reclamp = () =>
      setRect((r) => clampRect(r.position, r.size, minSize, stagedRef.current));
    reclamp();
    window.addEventListener("resize", reclamp);
    return () => window.removeEventListener("resize", reclamp);
  }, [open, minSize]);

  return (
    <SharkFloatingPanel
      allowOverflow={false}
      key={instance}
      minSize={minSize}
      onOpenChange={(d) => onOpenChange(d.open)}
      onPositionChange={(d) => {
        if (Math.abs(d.position.x - rect.position.x) > 1 || Math.abs(d.position.y - rect.position.y) > 1)
          userMoved.current = true;
        update(d.position, rect.size);
      }}
      onSizeChange={(d) => update(rect.position, d.size)}
      onStageChange={(d) => {
        if (!stagedRef.current) unstagedRect.current = rect;
        stagedRef.current = d.stage !== "default";
      }}
      open={open}
      position={rect.position}
      resizable={resizable}
      size={rect.size}
    >
      <FloatingPanelContent
        className="glass"
        // No maximize on header double-click (Ark's default): panels stay
        // floating. Capture phase runs before Ark's handler, which skips
        // events that are already default-prevented.
        onDoubleClickCapture={(e) => e.preventDefault()}
        resizable={resizable}
      >
        <FloatingPanelHeader>
          <FloatingPanelTitle>
            {icon && <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>}
            {title}
          </FloatingPanelTitle>
          <FloatingPanelControl>
            <FloatingPanelMinimize />
            <FloatingPanelRestore size="icon-xs" variant="ghost" />
            <FloatingPanelCloseTrigger asChild>
              <Button aria-label="Close" size="icon-xs" variant="ghost">
                <XIcon />
              </Button>
            </FloatingPanelCloseTrigger>
          </FloatingPanelControl>
        </FloatingPanelHeader>
        <FloatingPanelBody className={cn("w-full min-w-0", bodyClassName)}>
          {children}
        </FloatingPanelBody>
        {footer && (
          <FloatingPanelFooter className="flex-row justify-between py-3 group-data-minimized/floating-panel:hidden sm:justify-between">
            {footer}
          </FloatingPanelFooter>
        )}
      </FloatingPanelContent>
    </SharkFloatingPanel>
  );
}
