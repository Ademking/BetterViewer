import { MaximizeIcon, MinusIcon, PlusIcon, ScanIcon } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SegmentGroup, SegmentGroupItem, SegmentGroupItemText } from "@/components/ui/segment-group";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Hinted, MOD, ToolButton } from "@/components/tools/ToolButton";
import { zoomActual, zoomFit, zoomIn, zoomOut, zoomToSelection } from "@/lib/actions";
import { MAX_SCALE, MIN_SCALE, useView, viewport } from "@/lib/viewport";
import { cn } from "@/lib/utils";
import { useUi } from "@/state/ui";
import { useT } from "@/lib/i18n";

const LMIN = Math.log(MIN_SCALE);
const LMAX = Math.log(MAX_SCALE);
const toSlider = (s: number) => ((Math.log(s) - LMIN) / (LMAX - LMIN)) * 1000;
const fromSlider = (v: number) => Math.exp(LMIN + (v / 1000) * (LMAX - LMIN));

const PRESETS = [0.25, 0.5, 1, 2, 4, 8];

export function ZoomControls({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const scale = useView((s) => s.scale);
  const hasSelection = useUi((s) => s.selectedIds.length > 0);
  const pct = Math.round(scale * 100);

  return (
    <div className="flex items-center gap-0.5">
      {!compact && (
        <ToolButton label={t("Zoom out")} onClick={zoomOut} shortcut={`${MOD} −`}>
          <MinusIcon />
        </ToolButton>
      )}
      <Popover modal={false} positioning={{ placement: "top", gutter: 14 }}>
        <Hinted label={t("Zoom options")}>
          <PopoverTrigger
            className={cn(
              "h-8 min-w-14 rounded-lg px-1.5 font-medium text-xs tabular-nums",
              "text-foreground/85 transition-colors hover:bg-accent data-[state=open]:bg-accent"
            )}
          >
            {pct}%
          </PopoverTrigger>
        </Hinted>
        <PopoverContent className="w-72 gap-3 p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{t("Zoom")}</span>
            <span className="font-mono text-muted-foreground text-xs tabular-nums">{pct}%</span>
          </div>
          <Slider
            aria-label={[t("Zoom level")]}
            max={1000}
            min={0}
            onValueChange={(d) => viewport.zoomTo(fromSlider(d.value[0]), viewport.center, false)}
            step={1}
            value={[toSlider(scale)]}
          />
          <SegmentGroup
            aria-label={t("Zoom presets")}
            className="grid grid-cols-6 gap-0.5 rounded-lg bg-muted/60 p-0.5 [&>[data-part=indicator]]:bg-foreground/12 [&>[data-part=indicator]]:shadow-sm"
            onValueChange={(d) => d.value && viewport.zoomTo(Number(d.value))}
            value={PRESETS.find((p) => Math.abs(scale - p) < 0.005)?.toString() ?? null}
          >
            {PRESETS.map((p) => (
              <SegmentGroupItem
                className="flex h-7 items-center justify-center rounded-md font-medium text-muted-foreground text-xs tabular-nums transition-colors hover:text-foreground data-[state=checked]:text-foreground"
                key={p}
                value={p.toString()}
              >
                <SegmentGroupItemText>{p * 100}%</SegmentGroupItemText>
              </SegmentGroupItem>
            ))}
          </SegmentGroup>
          <Separator />
          <div className="grid gap-0.5">
            <ZoomRow icon={<MaximizeIcon />} label={t("Fit to screen")} onClick={zoomFit} shortcut="0" />
            <ZoomRow icon={<span className="font-semibold text-[10px]">1:1</span>} label={t("Actual size (100%)")} onClick={zoomActual} shortcut="1" />
            <ZoomRow
              disabled={!hasSelection}
              icon={<ScanIcon />}
              label={t("Zoom to selection")}
              onClick={zoomToSelection}
              shortcut="2"
            />
          </div>
        </PopoverContent>
      </Popover>
      {!compact && (
        <ToolButton label={t("Zoom in")} onClick={zoomIn} shortcut={`${MOD} +`}>
          <PlusIcon />
        </ToolButton>
      )}
      {!compact && (
        <ToolButton label={t("Fit to screen")} onClick={zoomFit} shortcut="0">
          <MaximizeIcon />
        </ToolButton>
      )}
    </div>
  );
}

function ZoomRow({
  icon,
  label,
  shortcut,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="flex size-4 items-center justify-center text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      <Kbd>{shortcut}</Kbd>
    </button>
  );
}
