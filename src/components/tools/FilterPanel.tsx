import { ChartSplineIcon, EyeIcon, RotateCcwIcon, SlidersHorizontalIcon, WandSparklesIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScreenFloatingPanel } from "@/components/panels/FloatingPanel";
import { Hinted } from "@/components/tools/ToolButton";
import { LabeledSlider } from "@/components/tools/StyleControls";
import {
  canvasFilterSupported,
  DEFAULT_FILTERS,
  FILTER_GROUPS,
  FILTER_PRESETS,
  FILTER_SPECS,
  type FilterKey,
  isDefaultFilters,
  toCssFilter,
} from "@/lib/filters";
import { autoEnhance } from "@/lib/autoEnhance";
import { cn } from "@/lib/utils";
import { updateDoc, useDoc } from "@/state/document";
import { useUi } from "@/state/ui";
import { midSentence, useT } from "@/lib/i18n";

const setFilter = (key: FilterKey, value: number) =>
  updateDoc((d) => ({ ...d, filters: { ...d.filters, [key]: value } }), {
    key: `filter-${key}`,
  });

export function FilterPanel() {
  const t = useT();
  const open = useUi((s) => s.panels.adjust);
  const togglePanel = useUi((s) => s.togglePanel);
  const filters = useDoc((s) => s.doc?.filters ?? DEFAULT_FILTERS);
  const src = useDoc((s) => s.doc?.image.src);
  const compare = useUi((s) => s.compareOriginal);
  const setUi = useUi((s) => s.set);
  const levels = useDoc((s) => s.doc?.levels ?? null);
  const curves = useDoc((s) => s.doc?.curves ?? null);
  const pristine = isDefaultFilters(filters) && !levels && !curves;
  const [enhancing, setEnhancing] = useState(false);

  return (
    <ScreenFloatingPanel
      bodyClassName="gap-5"
      footer={
        <>
          <Hinted label={t("Hold to compare with the original")}>
            <Button
              className={cn(compare && "bg-accent")}
              disabled={pristine}
              onPointerDown={() => setUi({ compareOriginal: true })}
              onPointerLeave={() => setUi({ compareOriginal: false })}
              onPointerUp={() => setUi({ compareOriginal: false })}
              size="sm"
              variant="outline"
            >
              <EyeIcon /> {t("Compare")}
            </Button>
          </Hinted>
          <Button
            disabled={pristine}
            onClick={() => updateDoc((d) => ({ ...d, filters: DEFAULT_FILTERS, levels: null, curves: null }))}
            size="sm"
            variant="ghost"
          >
            <RotateCcwIcon /> {t("Reset all")}
          </Button>
        </>
      }
      icon={<SlidersHorizontalIcon />}
      initialPosition={(vp, size) => ({ x: vp.width - size.width - 16, y: 72 })}
      initialSize={{ width: 336, height: 600 }}
      minSize={{ width: 280, height: 240 }}
      onOpenChange={(o) => togglePanel("adjust", o)}
      open={open}
      title={t("Adjustments")}
    >
      {!canvasFilterSupported && (
        <p className="rounded-lg bg-warning/10 p-2 text-warning-foreground text-xs">
          This browser can't apply canvas filters; adjustments won't be visible.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button
          isLoading={enhancing}
          onClick={async () => {
            setEnhancing(true);
            try {
              await autoEnhance();
            } finally {
              setEnhancing(false);
            }
          }}
          size="sm"
        >
          <WandSparklesIcon /> {t("Auto enhance")}
        </Button>
        <Hinted label={t("Curves, levels and histogram")} shortcut="Shift C">
          <Button onClick={() => togglePanel("curves", true)} size="sm" variant="outline">
            <ChartSplineIcon /> {t("Levels & curves")}
          </Button>
        </Hinted>
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {t("Presets")}
        </span>
        <div className="grid grid-cols-4 gap-x-2 gap-y-2.5">
          {FILTER_PRESETS.map((p) => {
            const f = { ...DEFAULT_FILTERS, ...p.filters };
            const activePreset = (Object.keys(DEFAULT_FILTERS) as FilterKey[]).every(
              (k) => f[k] === filters[k]
            );
            return (
              <button
                className="group flex min-w-0 flex-col items-center gap-1"
                key={p.name}
                onClick={() => updateDoc((d) => ({ ...d, filters: f }))}
                type="button"
              >
                <span
                  className={cn(
                    "block aspect-square w-full overflow-hidden rounded-lg border-2 transition-all",
                    activePreset ? "border-brand" : "border-transparent group-hover:border-white/20"
                  )}
                >
                  {src && (
                    <img
                      alt=""
                      className="size-full object-cover"
                      draggable={false}
                      src={src}
                      style={{ filter: toCssFilter(f, 0.15) }}
                    />
                  )}
                </span>
                <span
                  className={cn(
                    "text-[11px]",
                    activePreset ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {t(p.name)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {FILTER_GROUPS.map((group) => (
        <div className="flex flex-col gap-4" key={group}>
          <span className="-mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">{t(group)}</span>
          {FILTER_SPECS.filter((s) => s.group === group).map((spec) => (
            <div className="group/row relative" key={spec.key}>
              <LabeledSlider
                label={t(spec.label)}
                max={spec.max}
                min={spec.min}
                onChange={(v) => setFilter(spec.key, v)}
                step={spec.step}
                suffix={spec.unit}
                value={filters[spec.key] ?? DEFAULT_FILTERS[spec.key]}
              />
              {(filters[spec.key] ?? DEFAULT_FILTERS[spec.key]) !== DEFAULT_FILTERS[spec.key] && (
                <button
                  aria-label={t("Reset {name}", { name: midSentence(t(spec.label)) })}
                  className="absolute top-0 right-12 rounded px-1 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/row:opacity-100"
                  onClick={() => setFilter(spec.key, DEFAULT_FILTERS[spec.key])}
                  type="button"
                >
                  reset
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
    </ScreenFloatingPanel>
  );
}
