import { BanIcon } from "lucide-react";
import type React from "react";
import {
  ColorPicker,
  ColorPickerArea,
  ColorPickerAreaThumb,
  ColorPickerEyeDropperTrigger,
  ColorPickerInput,
  ColorPickerSlider,
  ColorPickerSwatch,
  ColorPickerSwatchGroup,
  ColorPickerSwatchTrigger,
  ColorPickerTransparencyGrid,
} from "@/components/ui/color-picker";
import { inputVariants } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Hinted } from "@/components/tools/ToolButton";
import { isTransparent, TRANSPARENT } from "@/lib/annotations";
import { SWATCHES } from "@/lib/colors";
import { cn } from "@/lib/utils";

interface ColorPanelProps {
  value: string;
  onChange: (color: string) => void;
  allowNone?: boolean;
  alpha?: boolean;
  className?: string;
}

/** Inline Shark color picker: area, hue/alpha, hex input, eyedropper, swatches. */
export function ColorPanel({ value, onChange, allowNone, alpha, className }: ColorPanelProps) {
  const none = isTransparent(value);
  const pickerValue = none ? "#ffffff" : value;

  return (
    <ColorPicker
      className={cn("flex w-60 flex-col gap-3", className)}
      format="hsla"
      inline
      onValueChange={(d) => {
        const a = d.value.getChannelValue("alpha");
        onChange(a < 1 ? d.value.toString("hexa") : d.value.toString("hex"));
      }}
      value={pickerValue}
    >
      <div className="flex flex-col gap-3">
        <ColorPickerArea className="aspect-[4/3] rounded-lg">
          <ColorPickerAreaThumb />
        </ColorPickerArea>
        <div className="flex items-center gap-2">
          <ColorPickerEyeDropperTrigger size="icon-sm" />
          <div className="flex flex-1 flex-col gap-2">
            <ColorPickerSlider channel="hue" />
            {alpha && (
              <ColorPickerSlider channel="alpha">
                <ColorPickerTransparencyGrid className="rounded-full" />
              </ColorPickerSlider>
            )}
          </div>
        </div>
        <ColorPickerInput
          className={cn(inputVariants({ size: "sm" }), "font-mono uppercase")}
          key={pickerValue}
        />
        <ColorPickerSwatchGroup className="grid grid-cols-7 gap-1.5">
          {allowNone && (
            <button
              aria-label="No color"
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-muted-foreground transition-transform hover:scale-110",
                none && "ring-2 ring-brand"
              )}
              onClick={() => onChange(TRANSPARENT)}
              type="button"
            >
              <BanIcon className="size-3.5" />
            </button>
          )}
          {SWATCHES.map((c) => (
            <ColorPickerSwatchTrigger className="size-6" key={c} value={c}>
              <ColorPickerSwatch className="border border-white/10" value={c} />
            </ColorPickerSwatchTrigger>
          ))}
        </ColorPickerSwatchGroup>
      </div>
    </ColorPicker>
  );
}

interface ColorFieldProps extends ColorPanelProps {
  label: string;
  /** Short visible label next to the swatch ("Stroke", "Fill"…). */
  caption?: string;
  children?: React.ReactNode;
}

/** Square swatch showing a color (checkerboard + slash for "none"). */
export function Swatch({ value, className }: { value: string; className?: string }) {
  const none = isTransparent(value);
  return (
    <span
      className={cn(
        "checkerboard checker-sm relative block size-4 shrink-0 overflow-hidden rounded-[5px] ring-1 ring-foreground/25 ring-inset",
        className
      )}
    >
      {!none && <span className="absolute inset-0" style={{ background: value }} />}
      {none && <span className="absolute inset-0 m-auto h-[150%] w-[1.5px] rotate-45 bg-red-500" />}
    </span>
  );
}

/** Swatch (+ optional caption) button that opens a color picker popover. */
export function ColorField({ label, caption, value, ...rest }: ColorFieldProps) {
  return (
    <Popover modal={false} positioning={{ placement: "top", gutter: 12 }}>
      <Hinted label={label}>
        <PopoverTrigger
          aria-label={label}
          className={cn(
            "flex h-8 shrink-0 items-center gap-1.5 rounded-lg transition-colors hover:bg-accent data-[state=open]:bg-accent",
            caption ? "px-2" : "w-8 justify-center"
          )}
        >
          <Swatch value={value} />
          {caption && <span className="font-medium text-xs">{caption}</span>}
        </PopoverTrigger>
      </Hinted>
      <PopoverContent className="p-3">
        <ColorPanel value={value} {...rest} />
      </PopoverContent>
    </Popover>
  );
}
