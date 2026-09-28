"use client";

import { ark } from "@ark-ui/react/factory";
import type React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const inpuGroupVariants = tv({
  base: [
    "group/input-group",
    "relative",
    "w-full min-w-0",
    "flex items-center",
    "bg-background dark:bg-input/30",
    "rounded-lg border border-input shadow-xs/5",
    "transition-[color,box-shadow]",
    "has-[>textarea]:h-auto",
    "has-[>[data-align=inline-start]]:[&>input]:ps-2",
    "has-[>[data-align=inline-end]]:[&>input]:pe-2",
    "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
    "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",
    "outline-none focus-within:border-primary focus-within:ring-[3px] focus-within:ring-ring/32",
    "has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-[3px] has-[[data-slot][aria-invalid=true]]:ring-destructive/24",
    "dark:has-[[data-slot][aria-invalid=true]]:border-destructive-foreground dark:has-[[data-slot][aria-invalid=true]]:ring-destructive-foreground/40",
    "motion-reduce:transition-none!",
  ],
  variants: {
    size: {
      sm: ["h-7"],
      md: ["h-8"],
      lg: ["h-9"],
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface InputGroupProps
  extends React.ComponentProps<typeof ark.div>,
    VariantProps<typeof inpuGroupVariants> {}

export const InputGroup = (props: InputGroupProps) => {
  const { size = "md", className, ...rest } = props;

  return (
    <ark.div
      className={cn(inpuGroupVariants({ size }), className)}
      data-size={size}
      data-slot="input-group"
      role="group"
      {...rest}
    />
  );
};

const inputGroupAddonVariants = tv({
  base: [
    "h-auto",
    "flex items-center justify-center gap-2",
    "py-1.5",
    "select-none font-medium text-muted-foreground text-sm",
    "cursor-text",
    "group-data-[disabled=true]/input-group:opacity-64",
    "[&>kbd]:rounded-[calc(var(--radius)-5px)]",
    "[&_svg:not([class*='size-'])]:size-4",
  ],
  variants: {
    align: {
      "inline-start": [
        "order-first ps-3",
        "has-[>button]:ms-[-0.45rem]",
        "has-[>kbd]:ms-[-0.35rem]",
      ],
      "inline-end": [
        "order-last pe-3",
        "has-[>button]:me-[-0.45rem]",
        "has-[>kbd]:me-[-0.35rem]",
      ],
      "block-start": [
        "order-first w-full justify-start px-3 pt-3",
        "group-has-[>input]/input-group:pt-2.5",
        "[.border-b]:pb-3",
      ],
      "block-end": [
        "order-last w-full justify-start px-3 pb-3",
        "group-has-[>input]/input-group:pb-2.5",
        "[.border-t]:pt-3",
      ],
    },
  },
  defaultVariants: {
    align: "inline-start",
  },
});

interface InputGroupAddonProps
  extends React.ComponentProps<typeof ark.div>,
    VariantProps<typeof inputGroupAddonVariants> {}

export const InputGroupAddon = (props: InputGroupAddonProps) => {
  const { className, align = "inline-start", ...rest } = props;

  return (
    <ark.div
      className={cn(inputGroupAddonVariants({ align }), className)}
      data-align={align}
      data-slot="input-group-addon"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return;
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      role="group"
      {...rest}
    />
  );
};

const inputGroupButtonVariants = tv({
  base: [
    "relative",
    "flex items-center gap-2",
    "text-sm",
    "shadow-none",
    "pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11",
  ],
  variants: {
    size: {
      xs: [
        "h-6",
        "gap-1",
        "px-2",
        "rounded-[calc(var(--radius)-5px)]",
        "has-[>svg]:px-2",
        "[&_svg:not([class*='size-'])]:size-3.5",
      ],
      sm: ["h-8", "gap-1.5", "px-2.5", "rounded-md", "has-[>svg]:px-2.5"],
      "icon-xs": [
        "size-6",
        "rounded-[calc(var(--radius)-5px)]",
        "p-0",
        "has-[>svg]:p-0",
      ],
      "icon-sm": ["size-8", "p-0", "has-[>svg]:p-0"],
    },
  },
  defaultVariants: {
    size: "xs",
  },
});

interface InputGroupButtonProps
  extends Omit<React.ComponentProps<typeof Button>, "size">,
    VariantProps<typeof inputGroupButtonVariants> {}

export const InputGroupButton = (props: InputGroupButtonProps) => {
  const {
    className,
    type = "button",
    variant = "ghost",
    size = "xs",
    ...rest
  } = props;

  return (
    <Button
      className={cn(inputGroupButtonVariants({ size }), className)}
      data-size={size}
      data-slot="input-group-button"
      type={type}
      variant={variant}
      {...rest}
    />
  );
};

export const InputGroupText = (
  props: React.ComponentProps<typeof ark.span>
) => {
  const { className, ...rest } = props;

  return (
    <ark.span
      className={cn(
        "flex items-center gap-2",
        "text-muted-foreground text-sm",
        "[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
        className
      )}
      data-slot="input-group-text"
      {...rest}
    />
  );
};

export const InputGroupInput = (props: React.ComponentProps<typeof Input>) => {
  const { className, ...rest } = props;

  return (
    <Input
      className={cn(
        "flex-1",
        "bg-transparent",
        "rounded-none border-0 shadow-none",
        "focus-visible:ring-0",
        "disabled:bg-transparent aria-invalid:ring-0 data-invalid:ring-0",
        "dark:bg-transparent dark:disabled:bg-transparent",
        className
      )}
      data-slot="input-group-control"
      {...rest}
    />
  );
};

export const InputGroupTextarea = (
  props: React.ComponentProps<typeof Textarea>
) => {
  const { className, ...rest } = props;

  return (
    <Textarea
      className={cn(
        "flex-1",
        "py-3",
        "bg-transparent",
        "resize-none rounded-none border-0 shadow-none",
        "focus-visible:ring-0",
        "disabled:bg-transparent aria-invalid:ring-0 data-invalid:ring-0",
        "dark:bg-transparent dark:disabled:bg-transparent",
        className
      )}
      data-slot="input-group-control"
      {...rest}
    />
  );
};
