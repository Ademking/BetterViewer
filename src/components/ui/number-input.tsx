"use client";

import {
  NumberInput as ArkNumberInput,
  useNumberInputContext,
} from "@ark-ui/react/number-input";
import { MinusIcon, PlusIcon } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { Input, type InputProps } from "@/components/ui/input";

export const useNumberInput = useNumberInputContext;

interface NumberInputProps
  extends React.ComponentProps<typeof ArkNumberInput.Root>,
    Pick<InputProps, "size"> {}

export const NumberInput = (props: NumberInputProps) => {
  const { size = "md", className, ...rest } = props;

  return (
    <ArkNumberInput.Root
      className={cn(
        "group/number-field",
        "flex w-full flex-col items-start gap-2",
        "has-data-[slot=number-field-increment]:has-data-[slot=number-field-decrement]:**:data-[slot=number-field-input]:text-center",
        className
      )}
      data-size={size}
      data-slot="number-field"
      {...rest}
    />
  );
};

export const NumberInputGroup = (
  props: React.ComponentProps<typeof ArkNumberInput.Control>
) => {
  const { className, ...rest } = props;

  return (
    <ArkNumberInput.Control
      className={cn(
        "relative",
        "w-full",
        "flex justify-between",
        "bg-transparent dark:bg-input/30",
        "text-base",
        "rounded-lg border border-input shadow-xs/5 ring-ring/32",
        "transition-shadow",
        "focus-within:border-primary focus-within:ring-[3px] focus-within:ring-ring/32",
        "data-disabled:pointer-events-none data-disabled:opacity-64",
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/24",
        "dark:aria-invalid:border-destructive-foreground dark:aria-invalid:text-destructive-foreground dark:aria-invalid:ring-destructive-foreground/20",
        "motion-reduce:transition-none!",
        className
      )}
      data-slot="number-field-group"
      {...rest}
    />
  );
};

export const NumberInputDecrement = (
  props: React.ComponentProps<typeof ArkNumberInput.DecrementTrigger>
) => {
  const { className, ...rest } = props;

  return (
    <ArkNumberInput.DecrementTrigger
      asChild
      className={cn(
        "relative",
        "h-8 in-data-[size=lg]:h-9 in-data-[size=sm]:h-7",
        "flex shrink-0",
        "text-foreground",
        "rounded-none rounded-s-[calc(var(--radius-lg)+1px)]",
        "cursor-pointer",
        "pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11",
        className
      )}
      data-slot="number-field-decrement"
      {...rest}
    >
      <Button aria-label="Decrement" variant="ghost">
        <MinusIcon aria-hidden />
      </Button>
    </ArkNumberInput.DecrementTrigger>
  );
};

export const NumberInputIncrement = (
  props: React.ComponentProps<typeof ArkNumberInput.IncrementTrigger>
) => {
  const { className, ...rest } = props;

  return (
    <ArkNumberInput.IncrementTrigger
      asChild
      className={cn(
        "relative",
        "h-8 in-data-[size=lg]:h-9 in-data-[size=sm]:h-7",
        "flex shrink-0",
        "text-foreground",
        "rounded-none rounded-e-[calc(var(--radius-lg)+1px)]",
        "cursor-pointer",
        "pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11",
        className
      )}
      data-slot="number-field-increment"
      {...rest}
    >
      <Button aria-label="Increment" variant="ghost">
        <PlusIcon aria-hidden />
      </Button>
    </ArkNumberInput.IncrementTrigger>
  );
};

export const NumberInputInput = (props: React.ComponentProps<typeof Input>) => {
  const { size, className, ...rest } = props;

  return (
    <ArkNumberInput.Input asChild data-slot="number-field-input" {...rest}>
      <Input
        size={size}
        className={cn(
          "grow",
          "h-8 in-data-[size=lg]:h-9 in-data-[size=sm]:h-7",
          "tabular-nums",
          "border-0 shadow-none ring-0",
          "focus-visible:ring-0 aria-invalid:ring-0 data-invalid:ring-0",
          "dark:bg-transparent",
          className
        )}
      />
    </ArkNumberInput.Input>
  );
};

export const NumberInputScrubber = (
  props: React.ComponentProps<typeof ArkNumberInput.Scrubber>
) => {
  const { className, children, ...rest } = props;

  return (
    <ArkNumberInput.Scrubber
      asChild
      className={cn("flex cursor-ew-resize", className)}
      data-slot="number-field-scrubber"
      {...rest}
    >
      <ArkNumberInput.Label asChild>
        <FieldLabel>{children}</FieldLabel>
      </ArkNumberInput.Label>
    </ArkNumberInput.Scrubber>
  );
};
