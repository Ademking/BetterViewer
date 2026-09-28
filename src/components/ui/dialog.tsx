"use client";

import { Dialog as ArkDialog, useDialogContext } from "@ark-ui/react/dialog";
import { ark } from "@ark-ui/react/factory";
import { Portal } from "@ark-ui/react/portal";
import { XIcon } from "lucide-react";
import React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export const useDialog = useDialogContext;

interface DialogContextProps {
  /**
   * Used internally to show or hide overlay
   *
   * @default true
   */
  modal?: boolean;
}

const DialogContext = React.createContext({} as DialogContextProps);

export const Dialog = (props: React.ComponentProps<typeof ArkDialog.Root>) => {
  const {
    modal = true,
    lazyMount = true,
    unmountOnExit = true,
    ...rest
  } = props;

  return (
    <DialogContext.Provider value={{ modal }}>
      <ArkDialog.Root
        lazyMount={lazyMount}
        modal={modal}
        unmountOnExit={unmountOnExit}
        {...rest}
      />
    </DialogContext.Provider>
  );
};

export const DialogTrigger = (
  props: React.ComponentProps<typeof ArkDialog.Trigger>
) => <ArkDialog.Trigger {...props} />;

export const dialogOverlayVariants = tv({
  base: [
    "fixed inset-0 z-50",
    "bg-black/32 backdrop-blur-xs",
    "duration-200",
    "peer peer-data-[slot=dialog-overlay]:hidden",
    "data-[state=open]:fade-in-0 data-[state=open]:animate-in",
    "data-[state=closed]:fade-out-0 data-[state=closed]:animate-out",
    "motion-reduce:animate-none!",
  ],
});

export const DialogOverlay = (
  props: React.ComponentProps<typeof ArkDialog.Backdrop>
) => {
  const { className, ...rest } = props;

  const { modal } = _useDialog();

  if (!modal) {
    return null;
  }

  return (
    <ArkDialog.Backdrop
      className={cn(dialogOverlayVariants(), className)}
      data-slot="dialog-overlay"
      {...rest}
    />
  );
};

export const DialogPositioner = (
  props: React.ComponentProps<typeof ArkDialog.Positioner>
) => {
  const { className, ...rest } = props;

  return (
    <ArkDialog.Positioner
      className={cn(
        "fixed inset-0 z-50",
        "h-svh w-screen",
        "grid grid-rows-[1fr_auto_3fr] justify-items-center",
        "p-4",
        className
      )}
      data-slot="dialog-positioner"
      {...rest}
    />
  );
};

export const dialogContentVariants = tv({
  base: [
    "[--space:--spacing(6)]",
    "z-[calc(50+var(--layer-index,0))]",
    "relative",
    "row-start-2",
    "max-h-[calc(100svh-2rem)] min-h-0 w-full min-w-0",
    "flex flex-col overflow-hidden",
    "bg-popover",
    "text-popover-foreground",
    "rounded-2xl border shadow-lg/5",
    "outline-none",
    "translate-y-[calc(-1.25rem*var(--nested-layer-count))]",
    "transition-[scale,opacity,translate] duration-200 ease-in-out will-change-transform",
    "data-[nested=dialog]:data-[state=closed]:slide-in-from-bottom-10 data-[nested=dialog]:data-[state=open]:slide-in-from-bottom-10 data-[has-nested=dialog]:origin-top",
    "scale-[calc(1-0.1*var(--nested-layer-count))] opacity-[calc(1-0.1*var(--nested-layer-count))]",
    "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[98%] data-[state=closed]:animate-out",
    "data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[98%] data-[state=open]:animate-in",
    "motion-reduce:animate-none! motion-reduce:transition-none!",
  ],
  variants: {
    size: {
      sm: ["max-w-md"],
      md: ["max-w-lg"],
      lg: ["max-w-xl"],
      xl: ["max-w-2xl"],
      "2xl": ["max-w-3xl"],
      "3xl": ["max-w-4xl"],
      "4xl": ["max-w-5xl"],
      "5xl": ["max-w-6xl"],
      "6xl": ["max-w-7xl"],
      fullscreen: ["size-full"],
    },
    bottomStickOnMobile: {
      true: [
        "max-sm:max-h-[calc(100svh-3rem)]",
        "max-sm:max-w-none",
        "max-sm:rounded-none max-sm:rounded-t-2xl max-sm:border-x-0 max-sm:border-t max-sm:border-b-0",
        "max-sm:opacity-[calc(1-min(var(--nested-dialogs),1))]",
        "max-sm:data-[state=closed]:slide-out-to-bottom-5 max-sm:data-[state=open]:slide-in-from-bottom-5",
        "max-sm:data-[state=closed]:zoom-out-100 max-sm:data-[state=open]:zoom-in-100",
      ],
    },
  },
  defaultVariants: {
    size: "md",
  },
});

interface DialogContentProps
  extends React.ComponentProps<typeof ArkDialog.Content>,
    VariantProps<typeof dialogContentVariants> {
  /**
   * Stick the dialog to the bottom of the screen on mobile
   *
   * @default true
   */
  bottomStickOnMobile?: boolean;
  /**
   * Show close button at the top right corner
   *
   * @default true
   */
  showCloseButton?: boolean;
}

export const DialogContent = (props: DialogContentProps) => {
  const {
    showCloseButton = true,
    bottomStickOnMobile = true,
    size = "md",
    className,
    children,
    ...rest
  } = props;

  return (
    <Portal>
      <DialogOverlay />

      <DialogPositioner
        className={cn(
          bottomStickOnMobile &&
            "max-sm:grid-rows-[1fr_auto] max-sm:p-0 max-sm:pt-12"
        )}
      >
        <ArkDialog.Content
          className={cn(
            dialogContentVariants({ size, bottomStickOnMobile }),
            className
          )}
          data-slot="dialog-content"
          {...rest}
        >
          {children}

          {!!showCloseButton && (
            <DialogClose asChild>
              <Button
                aria-label="Close"
                className="absolute inset-e-2 top-2 opacity-64 hover:opacity-100"
                size="icon-sm"
                variant="ghost"
              >
                <XIcon />
              </Button>
            </DialogClose>
          )}
        </ArkDialog.Content>
      </DialogPositioner>
    </Portal>
  );
};

interface DialogBodyProps extends React.ComponentProps<typeof ark.div> {
  /**
   * Add a fade effect to the scroll area
   *
   * @default false
   */
  scrollFade?: boolean;
}

export const DialogBody = (props: DialogBodyProps) => {
  const { scrollFade = false, className, ...rest } = props;

  return (
    // Ark's scroll content defaults to min-width: fit-content, which lets
    // unwrappable lines (e.g. truncated file names) widen the dialog.
    <ScrollArea
      className="min-h-0 flex-1 [&_[data-slot=scroll-area-content]]:min-w-0!"
      scrollFade={scrollFade}
    >
      <ark.div
        className={cn(
          "p-(--space)",
          "in-[[data-slot=dialog-content]:has([data-slot=dialog-header])]:pt-0",
          "in-[[data-slot=dialog-content]:has([data-slot=dialog-footer]:not(.border-t))]:pb-1",
          className
        )}
        data-slot="dialog-body"
        {...rest}
      />
    </ScrollArea>
  );
};

interface DialogHeaderProps extends React.ComponentProps<typeof ark.div> {
  /**
   * The description of the dialog
   */
  description?: string;
  /**
   * The title of the dialog
   */
  title?: string;
}

export const DialogHeader = (props: DialogHeaderProps) => {
  const { className, title, description, children, ...rest } = props;

  return (
    <ark.div
      className={cn(
        "shrink-0",
        "p-(--space)",
        "flex flex-col gap-2",
        "in-[[data-slot=dialog-content]:has([data-slot=dialog-body])]:pb-3",
        className
      )}
      data-slot="dialog-header"
      {...rest}
    >
      {!!title && <DialogTitle>{title}</DialogTitle>}

      {!!description && <DialogDescription>{description}</DialogDescription>}

      {!title && typeof children === "string" ? (
        <DialogTitle>{children}</DialogTitle>
      ) : (
        children
      )}
    </ark.div>
  );
};

export const DialogTitle = (
  props: React.ComponentProps<typeof ArkDialog.Title>
) => {
  const { className, ...rest } = props;

  return (
    <ArkDialog.Title
      className={cn(
        "font-heading font-semibold text-lg leading-none",
        className
      )}
      data-slot="dialog-title"
      {...rest}
    />
  );
};

export const DialogDescription = (
  props: React.ComponentProps<typeof ArkDialog.Description>
) => {
  const { className, ...rest } = props;

  return (
    <ArkDialog.Description
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="dialog-description"
      {...rest}
    />
  );
};

export const DialogClose = (
  props: React.ComponentProps<typeof ArkDialog.CloseTrigger>
) => <ArkDialog.CloseTrigger data-slot="dialog-close-trigger" {...props} />;

export const DialogFooter = (props: React.ComponentProps<typeof ark.div>) => {
  const { className, ...rest } = props;

  return (
    <ark.div
      className={cn(
        "shrink-0",
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        "sm:rounded-b-[calc(var(--radius-2xl)-1px)]",
        "px-(--space) py-4",
        "bg-muted/48",
        "border-t",
        className
      )}
      data-slot="dialog-footer"
      {...rest}
    />
  );
};

const _useDialog = () => {
  const context = React.useContext(DialogContext);

  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }

  return context;
};
