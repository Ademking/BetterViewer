"use client";

import { Field as ArkField } from "@ark-ui/react/field";
import type React from "react";
import { cn } from "@/lib/utils";

export const Textarea = (
  props: React.ComponentProps<typeof ArkField.Textarea>
) => {
  const { className, ...rest } = props;

  return (
    <ArkField.Textarea
      className={cn(
        "field-sizing-content min-h-16 w-full",
        "flex",
        "px-3 py-2",
        "bg-transparent dark:bg-input/30",
        "text-base md:text-sm",
        "rounded-lg border border-input shadow-xs/5",
        "placeholder:text-muted-foreground/64",
        "transition-[color,box-shadow]",
        "outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/32",
        "aria-invalid:border-destructive aria-invalid:text-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/24",
        "data-invalid:border-destructive data-invalid:text-destructive data-invalid:ring-[3px] data-invalid:ring-destructive/24",
        "dark:aria-invalid:border-destructive-foreground dark:aria-invalid:text-destructive-foreground dark:aria-invalid:ring-destructive-foreground/40",
        "dark:data-invalid:border-destructive-foreground dark:data-invalid:text-destructive-foreground dark:data-invalid:ring-destructive-foreground/40",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-64",
        "motion-reduce:transition-none!",
        className
      )}
      data-slot="textarea"
      {...rest}
    />
  );
};
