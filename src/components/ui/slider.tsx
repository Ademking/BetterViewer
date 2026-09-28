"use client";

import { Slider as ArkSlider, useSliderContext } from "@ark-ui/react/slider";
import React from "react";
import { cn } from "@/lib/utils";
import { FieldLabel } from "@/components/ui/field";

export const useSlider = useSliderContext;

interface SliderProps extends React.ComponentProps<typeof ArkSlider.Root> {
  /**
   * The interval between markers.
   *
   * @default 1
   */
  markerInterval?: number;
  /**
   * The labels to show on the markers.
   *
   * @default []
   */
  markerLabels?: string[];
  /**
   * Whether to show markers.
   *
   * @default false
   */
  showMarkers?: boolean;
}

export const Slider = (props: SliderProps) => {
  const {
    value,
    defaultValue,
    min = 0,
    max = 100,
    markerInterval = 1,
    showMarkers = false,
    markerLabels = [],
    tabIndex,
    className,
    children,
    ...rest
  } = props;

  const _values = React.useMemo(() => {
    if (Array.isArray(value)) {
      return value;
    }
    if (Array.isArray(defaultValue)) {
      return defaultValue;
    }
    return [min, max];
  }, [value, defaultValue, min, max]);

  return (
    <ArkSlider.Root
      className={cn(
        "flex flex-col gap-3",
        "data-[orientation=horizontal]:w-full",
        "data-[orientation=vertical]:h-full",
        className
      )}
      data-slot="slider"
      defaultValue={defaultValue}
      max={max}
      min={min}
      value={value}
      {...rest}
    >
      {children}

      <ArkSlider.Control
        className={cn(
          "relative",
          "w-full",
          "flex items-center",
          "touch-none select-none",
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
          "data-disabled:pointer-events-none data-disabled:opacity-64"
        )}
        data-slot="slider-control"
      >
        <ArkSlider.Track
          className={cn(
            "grow",
            "bg-input/64",
            "rounded-full",
            "select-none overflow-hidden",
            "data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:w-full",
            "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2"
          )}
          data-slot="slider-track"
        >
          <ArkSlider.Range
            className={cn(
              "absolute",
              "bg-primary",
              "select-none",
              "data-[orientation=horizontal]:h-full",
              "data-[orientation=vertical]:w-full data-[orientation=vertical]:not-[[class^='h-']]:not-[[class*='_h-']]:self-stretch"
            )}
            data-slot="slider-range"
          />
        </ArkSlider.Track>

        {Array.from({ length: _values.length }, (_, index) => {
          const key = `slider-thumb-${index}`;

          return (
            <ArkSlider.Thumb
              className={cn(
                "relative",
                "shrink-0",
                "size-4.5",
                "bg-white",
                "rounded-full border border-input shadow-xs/5",
                "cursor-grab select-none",
                "transition-[color,box-shadow,transform]",
                "focus-visible:border-primary focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/32",
                "origin-left data-dragging:scale-110 data-dragging:cursor-grabbing data-dragging:border-primary data-dragging:ring-[3px] data-dragging:ring-ring/32",
                "pointer-coarse:after:absolute pointer-coarse:after:h-full pointer-coarse:after:min-h-11",
                "motion-reduce:transition-none!"
              )}
              data-slot="slider-thumb"
              index={index}
              key={key}
              tabIndex={tabIndex ?? undefined}
            >
              <ArkSlider.HiddenInput />
            </ArkSlider.Thumb>
          );
        })}
      </ArkSlider.Control>

      {showMarkers && (
        <ArkSlider.MarkerGroup
          className={cn(
            "w-full",
            "flex items-center justify-between gap-1",
            "mt-3 px-2.5",
            "font-medium text-muted-foreground text-xs",
            "data-[orientation=vertical]:hidden",
            "pointer-events-none"
          )}
        >
          {Array.from({ length: max + 1 }, (_, index) => (
            <ArkSlider.Marker
              className={cn(
                "group/marker",
                "flex w-0 flex-col items-center justify-center gap-2",
                "data-[state=at-value]:text-foreground data-[state=under-value]:text-foreground"
              )}
              data-interval={index % markerInterval === 0 ? undefined : ""}
              data-slot="slider-marker"
              key={String(index)}
              value={index}
            >
              <span
                className={cn(
                  "h-1 w-px",
                  "bg-muted-foreground/70 group-data-[state=at-value]/marker:bg-foreground group-data-[state=under-value]/marker:bg-foreground",
                  "group-data-interval/marker:h-0.5"
                )}
              />

              <span className={cn("group-data-interval/marker:opacity-0")}>
                {markerLabels?.[index] ?? index}
              </span>
            </ArkSlider.Marker>
          ))}
        </ArkSlider.MarkerGroup>
      )}
    </ArkSlider.Root>
  );
};

export const SliderLabel = (props: React.ComponentProps<typeof FieldLabel>) => {
  const { children, ...rest } = props;

  return (
    <FieldLabel {...rest}>
      <ArkSlider.Label data-slot="slider-label">{children}</ArkSlider.Label>
    </FieldLabel>
  );
};

export const SliderValue = (
  props: React.ComponentProps<typeof ArkSlider.ValueText>
) => {
  const { className, ...rest } = props;

  return (
    <FieldLabel asChild>
      <ArkSlider.ValueText
        className={cn("ms-auto tabular-nums", className)}
        data-slot="progress-value"
        {...rest}
      />
    </FieldLabel>
  );
};
