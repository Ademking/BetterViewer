"use client";

import { t } from "@/lib/i18n";
import { Portal } from "@ark-ui/react";
import { Combobox as ArkCombobox } from "@ark-ui/react/combobox";
import { Dialog as ArkDialog } from "@ark-ui/react/dialog";
import { SearchIcon } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";
import {
  Combobox,
  ComboboxControl,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  type ComboboxItem,
  ComboboxList,
  comboboxItemVariants,
} from "@/components/ui/combobox";
import {
  Dialog,
  type DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPositioner,
  DialogTrigger,
  dialogContentVariants,
} from "@/components/ui/dialog";
import type { InputProps } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { MenuShortcut } from "@/components/ui/menu";
import { Separator } from "@/components/ui/separator";

export const CommandDialog = Dialog;

export const CommandDialogTrigger = (
  props: React.ComponentProps<typeof DialogTrigger>
) => <DialogTrigger data-slot="command-dialog-trigger" {...props} />;

interface CommandDialogContentProps
  extends React.ComponentProps<typeof DialogContent> {
  /**
   * The description of the dialog
   *
   * @default "Search for a command to run..."
   */
  description?: string;
  /**
   * The title of the dialog
   *
   * @default "Command Palette"
   */
  title?: string;
}

export const CommandDialogContent = (props: CommandDialogContentProps) => {
  const {
    size = "lg",
    title = "Command Palette",
    description = "Search for a command to run...",
    className,
    children,
    ...rest
  } = props;

  return (
    <Portal>
      <DialogOverlay />

      <DialogPositioner>
        <ArkDialog.Content
          className={cn(
            "max-sm:row-start-1",
            dialogContentVariants({ size }),
            "border-0 p-0",
            className
          )}
          data-slot="command-dialog-content"
          {...rest}
        >
          <DialogHeader
            className="sr-only"
            description={description}
            title={title}
          />

          {children}
        </ArkDialog.Content>
      </DialogPositioner>
    </Portal>
  );
};

export const Command: ArkCombobox.RootComponent = (props) => {
  const { lazyMount = true, unmountOnExit = true, className, ...rest } = props;

  return (
    <Combobox
      className={cn(
        "isolate",
        "flex min-h-0 flex-1 flex-col",
        "p-2",
        "bg-popover",
        "text-popover-foreground",
        "rounded-2xl border",
        className
      )}
      closeOnSelect={false}
      disableLayer
      inputBehavior="autohighlight"
      lazyMount={lazyMount}
      loopFocus={false}
      open
      selectionBehavior="clear"
      unmountOnExit={unmountOnExit}
      {...rest}
    />
  );
};

interface CommandInputProps
  extends Omit<React.ComponentProps<typeof ArkCombobox.Input>, "size"> {
  /**
   * The size of the input
   *
   * @default "md"
   */
  size?: InputProps["size"];
}

export const CommandContent = (
  props: React.ComponentProps<typeof ArkCombobox.Content>
) => {
  const { className, ...rest } = props;

  return (
    <ArkCombobox.Content
      className={cn(
        "flex flex-1 flex-col",
        "max-h-(--available-height) min-h-0",
        "-mr-2",
        "outline-none",
        "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-foreground/20 overflow-auto overscroll-contain",
        "[:not(.has-[+[data-slot=command-footer]])]:rounded-b-2xl [:not(.has-[+[data-slot=command-footer]])]:border-b",
        className
      )}
      data-slot="command-content"
      {...rest}
    />
  );
};

export const CommandInput = (props: CommandInputProps) => {
  const { size = "md", className, ...rest } = props;

  return (
    <ComboboxControl className="mb-2">
      <InputGroup className={cn("rounded-xl bg-input/32", className)} size={size}>
        <InputGroupAddon>
          <SearchIcon aria-hidden className="opacity-64" />
        </InputGroupAddon>
        {/* Input props (placeholder, etc.) belong on the input itself. */}
        <ArkCombobox.Input asChild data-slot="command-input" {...rest}>
          <InputGroupInput autoFocus />
        </ArkCombobox.Input>
      </InputGroup>
    </ComboboxControl>
  );
};

interface CommandListProps extends React.ComponentProps<typeof ComboboxList> {}

export const CommandList = (props: CommandListProps) => {
  const { className, ...rest } = props;

  return (
    <div className="max-h-72 min-h-0 flex-1">
      <ComboboxList
        className={cn("flex-1 pr-2.5", className)}
        data-slot="command-list"
        {...rest}
      />
    </div>
  );
};

export const CommandEmpty = (
  props: React.ComponentProps<typeof ComboboxEmpty>
) => {
  const { className, children, ...rest } = props;

  return (
    <ComboboxEmpty
      className={cn("py-6 text-center text-sm", className)}
      data-slot="command-empty"
      {...rest}
    >
      {children || t("No results found.")}
    </ComboboxEmpty>
  );
};

export const CommandGroup = (
  props: React.ComponentProps<typeof ComboboxGroup>
) => <ComboboxGroup data-slot="command-group" {...props} />;

export const CommandGroupLabel = (
  props: React.ComponentProps<typeof ComboboxGroupLabel>
) => <ComboboxGroupLabel data-slot="command-group-label" {...props} />;

export const CommandItem = (
  props: React.ComponentProps<typeof ComboboxItem>
) => {
  const { className, ...rest } = props;

  return (
    <ArkCombobox.Item
      className={cn(comboboxItemVariants({ showIndicator: false }), className)}
      data-slot="command-item"
      persistFocus
      {...rest}
    />
  );
};

export const CommandSeparator = (props: React.ComponentProps<"div">) => {
  const { className, ...rest } = props;

  return (
    <Separator
      className={cn("my-2", className)}
      data-slot="command-separator"
      {...rest}
    />
  );
};

export const CommandShortcut = (
  props: React.ComponentProps<typeof MenuShortcut>
) => <MenuShortcut data-slot="command-shortcut" {...props} />;

export const CommandFooter = (props: React.ComponentProps<"div">) => {
  const { className, ...rest } = props;

  return (
    <div
      className={cn(
        "z-10",
        "flex items-center justify-between gap-2",
        "-m-2 mt-2 px-4 py-3",
        "bg-muted/48",
        "text-muted-foreground text-xs",
        "rounded-b-[calc(var(--radius-2xl,1rem)-1px)] border-t",
        className
      )}
      data-slot="command-footer"
      {...rest}
    />
  );
};
