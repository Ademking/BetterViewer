"use client";

import {
  Clipboard as ArkClipboard,
  useClipboardContext,
} from "@ark-ui/react/clipboard";
import { CheckIcon, ClipboardIcon } from "lucide-react";
import type React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/lib/utils";
import { inputVariants } from "@/components/ui/input";

export const useClipboard = useClipboardContext;

interface ClipboardProps
  extends React.ComponentProps<typeof ArkClipboard.Root> {
  /**
   * Styles for the root element
   */
  rootClassName?: string;
}

export const Clipboard = (props: ClipboardProps) => {
  const { rootClassName, className, children, ...rest } = props;

  return (
    <ArkClipboard.Root
      className={cn(rootClassName)}
      data-slot="clipboard"
      {...rest}
    >
      <ArkClipboard.Control
        className={cn("flex items-center gap-2", className)}
        data-slot="clipboard-control"
      >
        {children}
      </ArkClipboard.Control>
    </ArkClipboard.Root>
  );
};

export const ClipboardTrigger = (
  props: React.ComponentProps<typeof ArkClipboard.Trigger>
) => <ArkClipboard.Trigger data-slot="clipboard-trigger" {...props} />;

export const ClipboardInput = (
  props: React.ComponentProps<typeof ArkClipboard.Input>
) => {
  const { className, ...rest } = props;

  return (
    <ArkClipboard.Input
      className={cn(inputVariants(), className)}
      data-slot="clipboard-input"
      {...rest}
    />
  );
};

const clipboardValueVariants = tv({
  base: [
    "inline-flex items-center",
    "px-3",
    "bg-transparent dark:bg-input/30",
    "text-base md:text-sm",
    "rounded-lg border border-input shadow-sm/5",
  ],
  variants: {
    size: {
      xs: "h-6",
      sm: "h-7",
      md: "h-8",
      lg: "h-9",
      xl: "h-10",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

interface ClipboardValueProps
  extends React.ComponentProps<typeof ArkClipboard.ValueText>,
    VariantProps<typeof clipboardValueVariants> {}

export const ClipboardValue = (props: ClipboardValueProps) => {
  const { size, className, ...rest } = props;

  return (
    <ArkClipboard.ValueText
      className={cn(clipboardValueVariants({ size }), className)}
      data-slot="clipboard-value"
      {...rest}
    />
  );
};

export const ClipboardIndicator = (
  props: React.ComponentProps<typeof ArkClipboard.Indicator>
) => {
  const { copied = <CheckIcon />, className, children, ...rest } = props;

  return (
    <ArkClipboard.Indicator
      className={cn("pointer-events-none", className)}
      copied={copied}
      data-slot="clipboard-indicator"
      {...rest}
    >
      {children || <ClipboardIcon />}
    </ArkClipboard.Indicator>
  );
};
