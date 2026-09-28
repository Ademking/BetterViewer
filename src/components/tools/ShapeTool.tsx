import { ChevronDownIcon } from "lucide-react";
import type React from "react";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import {
  NumberInput,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
  NumberInputInput,
} from "@/components/ui/number-input";
import { CounterOptions, ShapeStyleControls } from "@/components/tools/StyleControls";
import { Hinted, ToolbarDivider, ToolButton } from "@/components/tools/ToolButton";
import { isLineKind, SHAPE_GROUPS, SHAPE_LABELS, type ShapeKind, shapeOutline } from "@/lib/annotations";
import { cn } from "@/lib/utils";
import { useUi } from "@/state/ui";

/** Shape icons are drawn from the shapes' own geometry, in Lucide's style. */
function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      className="lucide"
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      width="24"
    >
      {children}
    </svg>
  );
}

/** Icon box (x, y, w, h) inside the 24×24 viewBox; wide shapes get a wide box. */
const WIDE: ShapeKind[] = [
  "parallelogram",
  "trapezoid",
  "blockArrowRight",
  "blockArrowLeft",
  "blockArrowBoth",
  "chevron",
  "tag",
  "callout",
  "roundCallout",
];
const TALL: ShapeKind[] = ["blockArrowUp", "blockArrowDown", "document", "halfCircle"];

function boxFor(kind: ShapeKind) {
  if (WIDE.includes(kind)) return { x: 2.5, y: 5.5, w: 19, h: 13 };
  if (TALL.includes(kind)) return { x: 5.5, y: 2.5, w: 13, h: 19 };
  return { x: 3, y: 3, w: 18, h: 18 };
}

function ShapeGlyph({ kind }: { kind: ShapeKind }) {
  switch (kind) {
    case "rect":
      return <Glyph><rect height="14" width="18" x="3" y="5" /></Glyph>;
    case "roundRect":
      return <Glyph><rect height="14" rx="4" width="18" x="3" y="5" /></Glyph>;
    case "ellipse":
      return <Glyph><circle cx="12" cy="12" r="9" /></Glyph>;
    case "line":
      return <Glyph><path d="M5 19 19 5" /></Glyph>;
    case "arrow":
      return <Glyph><path d="M5 19 19 5M9 5h10v10" /></Glyph>;
    case "doubleArrow":
      return <Glyph><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" /></Glyph>;
    case "counter":
      return (
        <Glyph>
          <circle cx="12" cy="12" r="9" />
          <path d="M10.5 9 12.5 7.5V16.5" />
        </Glyph>
      );
    default: {
      const box = boxFor(kind);
      const pts = shapeOutline(kind, box.w, box.h) ?? [];
      const d: string[] = [];
      for (let i = 0; i < pts.length; i += 2) {
        d.push(`${(box.x + pts[i]).toFixed(2)},${(box.y + pts[i + 1]).toFixed(2)}`);
      }
      return <Glyph><polygon points={d.join(" ")} /></Glyph>;
    }
  }
}

export const SHAPE_ICONS = Object.fromEntries(
  (Object.keys(SHAPE_LABELS) as ShapeKind[]).map((k) => [k, <ShapeGlyph key={k} kind={k} />])
) as Record<ShapeKind, React.ReactNode>;

const SHORTCUTS: Partial<Record<ShapeKind, string>> = {
  rect: "S",
  ellipse: "O",
  line: "L",
  arrow: "A",
  counter: "N",
};

const ALL_KINDS = SHAPE_GROUPS.flatMap((g) => g.kinds);

/** Compact grid of shape icons (name + shortcut on hover), in a Shark menu. */
function ShapeGridContent() {
  const tool = useUi((s) => s.tool);
  const kind = useUi((s) => s.shapeKind);
  const setShapeKind = useUi((s) => s.setShapeKind);

  return (
    <MenuContent className="w-auto p-1.5">
      <div className="grid grid-cols-8 gap-0.5">
        {ALL_KINDS.map((k) => {
          const active = tool === "shape" && kind === k;
          const hint = SHORTCUTS[k] ? `${SHAPE_LABELS[k]} (${SHORTCUTS[k]})` : SHAPE_LABELS[k];
          return (
            <MenuItem
              aria-label={SHAPE_LABELS[k]}
              className={cn(
                "size-9 justify-center p-0 [&_svg:not([class*='size-'])]:size-5",
                active && "bg-brand/15 text-brand data-highlighted:bg-brand/20"
              )}
              key={k}
              onSelect={() => setShapeKind(k)}
              title={hint}
              value={k}
            >
              {SHAPE_ICONS[k]}
            </MenuItem>
          );
        })}
      </div>
    </MenuContent>
  );
}

/** Toolbar button: opens the shape grid; the icon reflects the current shape. */
export function ShapeToolButton() {
  const tool = useUi((s) => s.tool);
  const kind = useUi((s) => s.shapeKind);
  return (
    <Menu positioning={{ placement: "top", gutter: 14 }}>
      <MenuTrigger asChild>
        <ToolButton active={tool === "shape"} label="Shapes" shortcut="S">
          {SHAPE_ICONS[kind]}
        </ToolButton>
      </MenuTrigger>
      <ShapeGridContent />
    </Menu>
  );
}

/** Options shown above the toolbar while the shape tool is active. */
export function ShapeOptions() {
  const kind = useUi((s) => s.shapeKind);
  const sides = useUi((s) => s.style.polygonSides);
  const setStyle = useUi((s) => s.setStyle);
  return (
    <>
      <Menu positioning={{ placement: "top", gutter: 12 }}>
        <Hinted label="Change shape">
          <MenuTrigger className="flex h-8 items-center gap-1.5 rounded-lg px-2 font-medium text-xs transition-colors hover:bg-accent data-[state=open]:bg-accent [&_svg]:size-4">
            {SHAPE_ICONS[kind]}
            <span className="max-w-28 truncate">{SHAPE_LABELS[kind]}</span>
            <ChevronDownIcon className="size-3.5! text-muted-foreground" />
          </MenuTrigger>
        </Hinted>
        <ShapeGridContent />
      </Menu>
      {kind === "counter" && <CounterOptions />}
      {kind === "polygon" && (
        <Hinted label="Sides">
          <NumberInput
            className="w-24"
            max={12}
            min={3}
            onValueChange={(d) =>
              Number.isFinite(d.valueAsNumber) && setStyle({ polygonSides: d.valueAsNumber })
            }
            size="sm"
            value={String(sides)}
          >
            <NumberInputGroup>
              <NumberInputDecrement />
              <NumberInputInput className="text-center" />
              <NumberInputIncrement />
            </NumberInputGroup>
          </NumberInput>
        </Hinted>
      )}
      {kind !== "counter" && (
        <>
          <ToolbarDivider />
          <ShapeStyleControls showFill={!isLineKind(kind)} />
        </>
      )}
    </>
  );
}
