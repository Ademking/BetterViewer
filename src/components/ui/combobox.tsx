"use client";

import {
  Combobox as ArkCombobox,
  type ComboboxList as ArkComboboxList,
  useComboboxContext as useArkComboboxContext,
} from "@ark-ui/react/combobox";
import { Portal } from "@ark-ui/react/portal";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";
import type React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { inputVariants } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

export const useCombobox = useArkComboboxContext;

export const ComboboxContext = ArkCombobox.Context;

export const Combobox: ArkCombobox.RootComponent = (props) => {
  const {
    openOnClick = true,
    lazyMount = true,
    unmountOnExit = true,
    ...rest
  } = props;

  return (
    <ArkCombobox.Root
      data-slot="combobox"
      lazyMount={lazyMount}
      openOnClick={openOnClick}
      unmountOnExit={unmountOnExit}
      {...rest}
    />
  );
};

export const ComboboxControl = (
  props: React.ComponentProps<typeof ArkCombobox.Control>
) => {
  const { className, ...rest } = props;

  return (
    <ArkCombobox.Control
      className={cn(
        "group/combobox-control",
        "relative flex flex-wrap items-center gap-1",
        className
      )}
      data-slot="combobox-control"
      {...rest}
    />
  );
};

interface ComboboxInputProps
  extends Omit<React.ComponentProps<typeof ArkCombobox.Input>, "size">,
    VariantProps<typeof inputVariants> {
  /**
   * Whether the control is disabled.
   *
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether to show the clear button.
   *
   * @default false
   */
  showClear?: boolean;
  /**
   * Whether to show the trigger button.
   *
   * @default true
   */
  showTrigger?: boolean;
}

export const ComboboxInput = (props: ComboboxInputProps) => {
  const {
    size = "md",
    showTrigger = true,
    showClear = false,
    className,
    children,
    ...rest
  } = props;

  const { inputValue } = useCombobox();

  return (
    <ComboboxControl data-size={size}>
      <InputGroup className={cn(className)} size={size}>
        {children}
        <ArkCombobox.Input asChild>
          <InputGroupInput {...rest} />
        </ArkCombobox.Input>
        <InputGroupAddon align="inline-end">
          {showTrigger && (
            <InputGroupButton
              asChild
              className="group-has-data-[slot=combobox-clear]/input-group:hidden"
              size="icon-xs"
              variant="ghost"
            >
              <ComboboxTrigger />
            </InputGroupButton>
          )}
          {showClear && inputValue && (
            <ComboboxClear asChild>
              <InputGroupButton size="icon-xs" variant="ghost">
                <XIcon />
              </InputGroupButton>
            </ComboboxClear>
          )}
        </InputGroupAddon>
      </InputGroup>
    </ComboboxControl>
  );
};

export const ComboboxTrigger = (
  props: React.ComponentProps<typeof ArkCombobox.Trigger>
) => {
  const { className, children, ...rest } = props;

  return (
    <ArkCombobox.Trigger
      className={cn("absolute inset-e-1 inset-y-0", className)}
      data-slot="combobox-trigger"
      {...rest}
      asChild
    >
      {children ?? (
        <Button className="size-4" variant="ghost">
          <ChevronsUpDownIcon />
        </Button>
      )}
    </ArkCombobox.Trigger>
  );
};

export const ComboboxClear = (
  props: React.ComponentProps<typeof ArkCombobox.ClearTrigger>
) => <ArkCombobox.ClearTrigger data-slot="combobox-clear" {...props} />;

/** Composable combobox input for custom controls (e.g. Tags Input). */
export const ComboboxFieldInput = (
  props: React.ComponentProps<typeof ArkCombobox.Input>
) => <ArkCombobox.Input data-slot="combobox-field-input" {...props} />;

export const ComboboxPositioner = (
  props: React.ComponentProps<typeof ArkCombobox.Positioner>
) => <ArkCombobox.Positioner data-slot="combobox-positioner" {...props} />;

export const ComboboxContent = (
  props: React.ComponentProps<typeof ArkCombobox.Content>
) => {
  const { className, children, ...rest } = props;

  return (
    <Portal>
      <ComboboxPositioner>
        <ArkCombobox.Content
          className={cn(
            "relative z-50",
            "max-h-96 min-w-48",
            "origin-(--transform-origin)",
            "p-1",
            "bg-popover",
            "text-popover-foreground",
            "rounded-xl border shadow-lg/5",
            "overflow-y-auto",
            "outline-none",
            "data-[state=closed]:animate-out data-[state=open]:animate-in",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=open]:zoom-in-[98%] data-[state=closed]:zoom-out-[98%]",
            "data-[placement=top]:slide-in-from-bottom-2",
            "data-[placement=bottom]:slide-in-from-top-2",
            "data-[placement=right]:slide-in-from-start-2",
            "data-[placement=left]:slide-in-from-end-2",
            "motion-reduce:animate-none!",
            className
          )}
          data-slot="combobox-content"
          {...rest}
        >
          {children}
        </ArkCombobox.Content>
      </ComboboxPositioner>
    </Portal>
  );
};

interface ComboboxGroupProps
  extends React.ComponentProps<typeof ArkCombobox.ItemGroup> {
  /**
   * The heading of the group
   */
  heading?: string | React.ReactNode;
}

export const ComboboxGroup = (props: ComboboxGroupProps) => {
  const { heading, children, ...rest } = props;

  return (
    <ArkCombobox.ItemGroup data-slot="combobox-group" {...rest}>
      {!!heading && <ComboboxGroupLabel>{heading}</ComboboxGroupLabel>}

      {children}
    </ArkCombobox.ItemGroup>
  );
};

export const ComboboxGroupLabel = (
  props: React.ComponentProps<typeof ArkCombobox.ItemGroupLabel>
) => {
  const { className, ...rest } = props;

  return (
    <ArkCombobox.ItemGroupLabel
      className={cn(
        "px-2 py-1.5 font-semibold text-muted-foreground text-xs",
        className
      )}
      data-slot="combobox-group-label"
      {...rest}
    />
  );
};

export const comboboxItemVariants = tv({
  base: [
    "relative",
    "py-1.5 ps-2",
    "text-sm",
    "flex w-full items-center gap-2",
    "rounded-xl",
    "select-none",
    "cursor-default",
    "outline-hidden",
    "data-[=checked]:bg-accent data-[state=checked]:text-accent-foreground",
    "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
    "data-disabled:pointer-events-none data-disabled:opacity-64",
    "[&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  variants: {
    showIndicator: {
      true: "pe-8",
      false: "pe-2",
    },
  },
  defaultVariants: {
    showIndicator: true,
  },
});

interface ComboboxItemProps
  extends React.ComponentProps<typeof ArkCombobox.Item>,
    VariantProps<typeof comboboxItemVariants> {}

export const ComboboxItem = (props: ComboboxItemProps) => {
  const { showIndicator = true, className, children, ...rest } = props;

  return (
    <ArkCombobox.Item
      className={cn(comboboxItemVariants({ showIndicator }), className)}
      data-slot="combobox-item"
      persistFocus
      {...rest}
    >
      {children}

      {showIndicator ? (
        <span className="absolute inset-e-2 flex size-3.5 items-center justify-center">
          <ArkCombobox.ItemIndicator data-slot="combobox-item-indicator">
            <CheckIcon />
          </ArkCombobox.ItemIndicator>
        </span>
      ) : null}
    </ArkCombobox.Item>
  );
};

export const ComboboxEmpty = (
  props: React.ComponentProps<typeof ArkCombobox.Empty>
) => {
  const { className, children, ...rest } = props;

  return (
    <ArkCombobox.Empty
      className={cn(
        "px-2 py-1.5",
        "text-center text-muted-foreground text-sm",
        className
      )}
      data-slot="combobox-empty"
      {...rest}
    >
      {children || "No results found."}
    </ArkCombobox.Empty>
  );
};

export const ComboboxList = (
  props: React.ComponentProps<typeof ArkComboboxList>
) => {
  const { className, ...rest } = props;

  return (
    <ArkCombobox.List
      className={cn("flex flex-col", className)}
      data-slot="combobox-list"
      {...rest}
    />
  );
};
