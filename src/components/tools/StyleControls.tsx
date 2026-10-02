import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  BoldIcon,
  CopyPlusIcon,
  ItalicIcon,
  RatioIcon,
  RotateCcwIcon,
  SparklesIcon,
  TextAlignCenterIcon,
  TextAlignEndIcon,
  TextAlignStartIcon,
  TrashIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NumberInput,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
  NumberInputInput,
} from "@/components/ui/number-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ColorField } from "@/components/tools/ColorField";
import { FontPicker } from "@/components/tools/FontPicker";
import { Hinted, ToolbarDivider, ToolButton } from "@/components/tools/ToolButton";
import {
  applyColor,
  applyFill,
  deleteSelected,
  duplicateSelected,
  reorderSelected,
} from "@/lib/actions";
import {
  type Annotation,
  type CounterAnnotation,
  hasFill,
  type ImageAnnotation,
  isTransparent,
  nextCounterNumber,
  TEXT_OUTLINE_DEFAULT,
  TEXT_SHADOW_DEFAULT,
  type TextAnnotation,
} from "@/lib/annotations";
import { loadHtmlImage } from "@/lib/image";
import { updateAnnotations, useDoc } from "@/state/document";
import { getUi, type TextStyle, useUi } from "@/state/ui";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";


/* ------------------------------------------------------------------ stroke */

/**
 * A numeric readout whose width is always that of its widest possible value,
 * so changing the value never shifts the bar (and leaves no trailing gap).
 */
export function FixedValue({ value, widest, unit }: { value: number; widest: number; unit?: string }) {
  const text = (v: number) => (
    <>
      {v}
      {unit && <span className="text-muted-foreground"> {unit}</span>}
    </>
  );
  return (
    <span className="grid text-right font-medium tabular-nums">
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {text(widest)}
      </span>
      <span className="col-start-1 row-start-1">{text(value)}</span>
    </span>
  );
}

export function setStrokeWidth(displayWidth: number) {
  const ui = getUi();
  const w = displayWidth * ui.docUnit;
  ui.setStyle({ strokeWidth: w });
  if (ui.selectedIds.length) {
    updateAnnotations(
      ui.selectedIds,
      (a) =>
        a.type === "text" || a.type === "redact" || a.type === "counter"
          ? a
          : { ...a, strokeWidth: a.type === "path" && a.highlighter ? w * 3 : w },
      { key: "stroke-width" }
    );
  }
}

export function setOpacity(opacity: number) {
  const ui = getUi();
  ui.setStyle({ opacity });
  if (ui.selectedIds.length) {
    // Blur zones always stay fully opaque, so nothing underneath can show.
    updateAnnotations(ui.selectedIds, (a) => (a.type === "redact" ? a : { ...a, opacity }), {
      key: "opacity",
    });
  }
}

interface StrokeControlProps {
  width: number;
  opacity: number;
  /** Color of the preview line (defaults to the text color). */
  color?: string;
  showOpacity?: boolean;
}

/** Stroke width + opacity in a compact popover. Width is shown in screen px at fit zoom. */
export function StrokeControl({ width, opacity, color, showOpacity = true }: StrokeControlProps) {
  const t = useT();
  const docUnit = useUi((s) => s.docUnit);
  // Whole pixels: fractional values made the readout (and the bar) change width.
  const display = Math.max(1, Math.round(width / docUnit));
  return (
    <Popover modal={false} positioning={{ placement: "top", gutter: 12 }}>
      <Hinted label={showOpacity ? t("Width & opacity") : t("Width")}>
        <PopoverTrigger
          aria-label={`${t("Width")} ${display} px`}
          className="flex h-8 items-center gap-2 rounded-lg px-2 text-xs transition-colors hover:bg-accent data-[state=open]:bg-accent"
        >
          {/* What the stroke looks like: thickness and color. */}
          <span className="flex h-4 w-6 items-center">
            <span
              className="w-full rounded-full"
              style={{
                height: Math.max(1.5, Math.min(12, display / 2)),
                background: color ?? "var(--foreground)",
                opacity: Math.max(0.3, opacity),
              }}
            />
          </span>
          <FixedValue value={display} widest={88} unit="px" />
        </PopoverTrigger>
      </Hinted>
      <PopoverContent className="w-60 gap-4 p-4">
        <LabeledSlider
          label={t("Width")}
          max={60}
          min={1}
          onChange={setStrokeWidth}
          step={1}
          suffix="px"
          value={display}
        />
        {showOpacity && (
          <LabeledSlider
            label={t("Opacity")}
            max={100}
            min={5}
            onChange={(v) => setOpacity(v / 100)}
            step={1}
            suffix="%"
            value={Math.round(opacity * 100)}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

export function LabeledSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  onChangeEnd,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
  onChangeEnd?: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-muted-foreground tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        aria-label={[label]}
        max={max}
        min={min}
        onValueChange={(d) => onChange(d.value[0])}
        onValueChangeEnd={(d) => onChangeEnd?.(d.value[0])}
        step={step}
        value={[value]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ shapes */

export function ShapeStyleControls({
  target,
  showFill = true,
}: {
  target?: Annotation;
  showFill?: boolean;
}) {
  const t = useT();
  const style = useUi((s) => s.style);
  const stroke = target && "stroke" in target ? target.stroke : style.stroke;
  const fill = !showFill
    ? null
    : target
      ? hasFill(target) && "fill" in target
        ? target.fill
        : null
      : style.fill;
  const width = target && "strokeWidth" in target ? target.strokeWidth : style.strokeWidth;
  const opacity = target ? target.opacity : style.opacity;
  const isHighlight = target?.type === "path" && target.highlighter;

  return (
    <>
      <ColorField
        caption={fill !== null ? t("Stroke") : undefined}
        label={fill !== null ? t("Stroke color") : t("Color")}
        onChange={(c) => applyColor(c)}
        value={stroke}
      />
      {fill !== null && (
        <ColorField allowNone alpha caption={t("Fill")} label={t("Fill color")} onChange={(c) => applyFill(c)} value={fill} />
      )}
      <StrokeControl color={stroke} opacity={opacity} width={isHighlight ? width / 3 : width} />
    </>
  );
}

/* ------------------------------------------------------------------ text */

export function setTextProp(patch: Partial<TextStyle>, key = "text-style") {
  const ui = getUi();
  ui.setTextStyle(patch);
  if (ui.selectedIds.length) {
    updateAnnotations(
      ui.selectedIds,
      (a) => (a.type === "text" ? { ...a, ...patch } : a),
      { key: `${key}-${Object.keys(patch).join()}` }
    );
  }
}

export function TextStyleControls({ target }: { target?: TextAnnotation }) {
  const tr = useT();
  const defaults = useUi((s) => s.textStyle);
  const docUnit = useUi((s) => s.docUnit);
  const t = target ?? defaults;
  const display = Math.round(t.fontSize / docUnit);

  return (
    <>
      <FontPicker
        onChange={(id) => setTextProp({ fontFamily: id }, "text-font")}
        value={t.fontFamily}
      />
      <Popover modal={false} positioning={{ placement: "top", gutter: 12 }}>
        <Hinted label={tr("Font size")}>
          <PopoverTrigger className="flex h-8 items-center gap-1 rounded-lg px-2 font-medium text-xs tabular-nums transition-colors hover:bg-accent data-[state=open]:bg-accent">
            <span className="font-serif text-sm italic opacity-70">A</span>
            <FixedValue value={display} widest={888} />
          </PopoverTrigger>
        </Hinted>
        <PopoverContent className="w-60 gap-3 p-4">
          <LabeledSlider
            label={tr("Font size")}
            max={200}
            min={8}
            onChange={(v) => setTextProp({ fontSize: v * docUnit })}
            step={1}
            suffix="px"
            value={display}
          />
          <div className="grid grid-cols-5 gap-1">
            {[16, 24, 32, 48, 72].map((s) => (
              <button
                className={cn(
                  "rounded-md py-1 text-xs hover:bg-accent",
                  display === s && "bg-accent font-semibold"
                )}
                key={s}
                onClick={() => setTextProp({ fontSize: s * docUnit })}
                type="button"
              >
                {s}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Hinted label={tr("Bold")}>
        <Toggle
          aria-label={tr("Bold")}
          onPressedChange={(p) => setTextProp({ fontWeight: p ? "bold" : "normal" })}
          pressed={t.fontWeight === "bold"}
          size="md"
        >
          <BoldIcon />
        </Toggle>
      </Hinted>
      <Hinted label={tr("Italic")}>
        <Toggle
          aria-label={tr("Italic")}
          onPressedChange={(p) => setTextProp({ fontStyle: p ? "italic" : "normal" })}
          pressed={t.fontStyle === "italic"}
          size="md"
        >
          <ItalicIcon />
        </Toggle>
      </Hinted>
      <ToggleGroup
        multiple={false}
        onValueChange={(d) =>
          d.value[0] && setTextProp({ align: d.value[0] as TextStyle["align"] })
        }
        size="md"
        value={[t.align]}
      >
        <ToggleGroupItem aria-label={tr("Align left")} value="left">
          <TextAlignStartIcon />
        </ToggleGroupItem>
        <ToggleGroupItem aria-label={tr("Align centre")} value="center">
          <TextAlignCenterIcon />
        </ToggleGroupItem>
        <ToggleGroupItem aria-label={tr("Align right")} value="right">
          <TextAlignEndIcon />
        </ToggleGroupItem>
      </ToggleGroup>
      <ToolbarDivider />
      <ColorField
        caption={tr("Text")}
        label={tr("Text color")}
        onChange={(c) => setTextProp({ fill: c }, "text-fill")}
        value={t.fill}
      />
      <ColorField
        allowNone
        alpha
        caption={tr("Background")}
        label={tr("Background color")}
        onChange={(c) => setTextProp({ background: c }, "text-bg")}
        value={t.background}
      />
      <TextEffects t={t} />
    </>
  );
}

/** Outline and drop shadow for text (sizes relative to the font size). */
function TextEffects({ t }: { t: TextStyle | TextAnnotation }) {
  const tr = useT();
  const hasOutline = !!t.outline && !isTransparent(t.outline);
  const hasShadow = !!t.shadow && !isTransparent(t.shadow);
  const pct = (v: number | undefined, d: number) => Math.round((v ?? d) * 100);
  return (
    <Popover modal={false} positioning={{ placement: "top", gutter: 12 }}>
      <Hinted label={tr("Outline & shadow")}>
        <PopoverTrigger
          aria-label={tr("Outline and shadow")}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2 font-medium text-xs transition-colors hover:bg-accent data-[state=open]:bg-accent [&_svg]:size-4"
        >
          <SparklesIcon />
          {tr("Effects")}
          {(hasOutline || hasShadow) && <span className="size-1.5 rounded-full bg-brand" />}
        </PopoverTrigger>
      </Hinted>
      <PopoverContent className="w-64 gap-4 p-4">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{tr("Outline")}</span>
            <Switch
              aria-label={tr("Outline")}
              checked={hasOutline}
              onCheckedChange={(d) =>
                setTextProp(d.checked ? TEXT_OUTLINE_DEFAULT : { outline: undefined }, "text-outline")
              }
            />
          </div>
          {hasOutline && (
            <>
              <ColorField
                caption={tr("Color")}
                label={tr("Outline color")}
                onChange={(c) => setTextProp({ outline: c }, "text-outline-color")}
                value={t.outline!}
              />
              <LabeledSlider
                label={tr("Thickness")}
                max={25}
                min={1}
                onChange={(v) => setTextProp({ outlineWidth: v / 100 }, "text-outline-width")}
                step={1}
                suffix="%"
                value={pct(t.outlineWidth, TEXT_OUTLINE_DEFAULT.outlineWidth)}
              />
            </>
          )}
        </section>
        <div className="h-px bg-border" />
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{tr("Shadow")}</span>
            <Switch
              aria-label={tr("Shadow")}
              checked={hasShadow}
              onCheckedChange={(d) =>
                setTextProp(d.checked ? TEXT_SHADOW_DEFAULT : { shadow: undefined }, "text-shadow")
              }
            />
          </div>
          {hasShadow && (
            <>
              <ColorField
                alpha
                caption={tr("Color")}
                label={tr("Shadow color")}
                onChange={(c) => setTextProp({ shadow: c }, "text-shadow-color")}
                value={t.shadow!}
              />
              <LabeledSlider
                label={tr("Blur")}
                max={100}
                min={0}
                onChange={(v) => setTextProp({ shadowBlur: v / 100 }, "text-shadow-blur")}
                step={1}
                suffix="%"
                value={pct(t.shadowBlur, TEXT_SHADOW_DEFAULT.shadowBlur)}
              />
              <LabeledSlider
                label={tr("Distance")}
                max={50}
                min={0}
                onChange={(v) => setTextProp({ shadowOffset: v / 100 }, "text-shadow-offset")}
                step={1}
                suffix="%"
                value={pct(t.shadowOffset, TEXT_SHADOW_DEFAULT.shadowOffset)}
              />
            </>
          )}
        </section>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ counters */

export function setCounterRadius(displaySize: number) {
  const ui = getUi();
  const radius = displaySize * ui.docUnit;
  ui.setStyle({ counterRadius: radius });
  if (ui.selectedIds.length) {
    updateAnnotations(ui.selectedIds, (a) => (a.type === "counter" ? { ...a, radius } : a), {
      key: "counter-radius",
    });
  }
}

function CounterSize({ radius }: { radius: number }) {
  const t = useT();
  const docUnit = useUi((s) => s.docUnit);
  const display = Math.max(4, Math.round(radius / docUnit));
  return (
    <Popover modal={false} positioning={{ placement: "top", gutter: 12 }}>
      <Hinted label={t("Size")}>
        <PopoverTrigger
          aria-label={`${t("Size")} ${display} px`}
          className="flex h-8 items-center gap-2 rounded-lg px-2 text-xs transition-colors hover:bg-accent data-[state=open]:bg-accent"
        >
          <span className="size-3.5 rounded-full border-2 border-current opacity-70" />
          <FixedValue value={display} widest={88} unit="px" />
        </PopoverTrigger>
      </Hinted>
      <PopoverContent className="w-60 p-4">
        <LabeledSlider
          label={t("Size")}
          max={80}
          min={6}
          onChange={setCounterRadius}
          step={1}
          suffix="px"
          value={display}
        />
      </PopoverContent>
    </Popover>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <Hinted label={label}>
      <NumberInput
        className="w-28"
        max={9999}
        min={0}
        onValueChange={(d) => Number.isFinite(d.valueAsNumber) && onChange(d.valueAsNumber)}
        size="sm"
        value={String(value)}
      >
        <NumberInputGroup>
          <NumberInputDecrement className="w-7 shrink-0 px-0" />
          <NumberInputInput aria-label={label} className="min-w-10 px-1 text-center tabular-nums" />
          <NumberInputIncrement className="w-7 shrink-0 px-0" />
        </NumberInputGroup>
      </NumberInput>
    </Hinted>
  );
}

/** Options while placing counters: color, size and the next number. */
export function CounterOptions() {
  const t = useT();
  const color = useUi((s) => s.style.stroke);
  const radius = useUi((s) => s.style.counterRadius);
  const counterNext = useUi((s) => s.counterNext);
  const annotations = useDoc((s) => s.doc?.annotations);
  const next = counterNext ?? nextCounterNumber(annotations ?? []);
  const set = useUi((s) => s.set);
  return (
    <>
      <ToolbarDivider />
      <ColorField label={t("Counter color")} onChange={(c) => applyColor(c)} value={color} />
      <CounterSize radius={radius} />
      <ToolbarDivider />
      <span className="px-1 text-muted-foreground text-xs">{t("Next")}</span>
      <NumberField label={t("Next number")} onChange={(n) => set({ counterNext: n })} value={next} />
      <Hinted label={t("Restart at 1")}>
        <Button aria-label={t("Restart at 1")} onClick={() => set({ counterNext: 1 })} size="icon-sm" variant="ghost">
          <RotateCcwIcon />
        </Button>
      </Hinted>
    </>
  );
}

/** Properties for selected counters. */
export function CounterControls({ targets }: { targets: CounterAnnotation[] }) {
  const t = useT();
  const first = targets[0];
  return (
    <>
      <ColorField label={t("Counter color")} onChange={(c) => applyColor(c)} value={first.fill} />
      <CounterSize radius={first.radius} />
      {targets.length === 1 && (
        <NumberField
          label={t("Number")}
          onChange={(n) =>
            updateAnnotations([first.id], (a) => (a.type === "counter" ? { ...a, number: n } : a), {
              key: `counter-number-${first.id}`,
            })
          }
          value={first.number}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ image layers */

/** Opacity and "original proportions" for inserted pictures. */
export function ImageLayerControls({ targets }: { targets: ImageAnnotation[] }) {
  const t = useT();
  const first = targets[0];
  const opacity = Math.round(first.opacity * 100);
  return (
    <>
      <Popover modal={false} positioning={{ placement: "top", gutter: 12 }}>
        <Hinted label={t("Opacity")}>
          <PopoverTrigger
            aria-label={`${t("Opacity")} ${opacity}%`}
            className="flex h-8 items-center gap-2 rounded-lg px-2 text-xs transition-colors hover:bg-accent data-[state=open]:bg-accent"
          >
            <span className="font-medium text-muted-foreground">{t("Opacity")}</span>
            <FixedValue unit="%" value={opacity} widest={888} />
          </PopoverTrigger>
        </Hinted>
        <PopoverContent className="w-60 p-4">
          <LabeledSlider
            label={t("Opacity")}
            max={100}
            min={5}
            onChange={(v) => setOpacity(v / 100)}
            step={1}
            suffix="%"
            value={opacity}
          />
        </PopoverContent>
      </Popover>
      <Hinted label={t("Restore original proportions")}>
        <Button
          aria-label={t("Restore original proportions")}
          onClick={() => void restoreProportions(targets)}
          size="icon-sm"
          variant="ghost"
        >
          <RatioIcon />
        </Button>
      </Hinted>
    </>
  );
}

async function restoreProportions(targets: ImageAnnotation[]) {
  const sizes = await Promise.all(targets.map((a) => loadHtmlImage(a.src)));
  const ratio = new Map(targets.map((a, i) => [a.id, sizes[i].naturalWidth / sizes[i].naturalHeight]));
  updateAnnotations(
    targets.map((a) => a.id),
    (a) => {
      const r = ratio.get(a.id);
      return a.type === "image" && r ? { ...a, height: a.width / r } : a;
    }
  );
}

/* ------------------------------------------------------------------ actions */

export function SelectionActions() {
  const t = useT();
  return (
    <>
      <ToolButton label={t("Duplicate")} onClick={duplicateSelected} command="duplicate">
        <CopyPlusIcon />
      </ToolButton>
      <ToolButton label={t("Bring to front")} command="bringToFront" onClick={() => reorderSelected("front")}>
        <ArrowUpToLineIcon />
      </ToolButton>
      <ToolButton label={t("Send to back")} command="sendToBack" onClick={() => reorderSelected("back")}>
        <ArrowDownToLineIcon />
      </ToolButton>
      <ToolButton
        className="hover:bg-destructive/15 hover:text-destructive-foreground"
        label={t("Delete")}
        onClick={deleteSelected}
        shortcut="Del"
      >
        <TrashIcon />
      </ToolButton>
    </>
  );
}
