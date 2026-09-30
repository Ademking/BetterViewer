"use client";

import { t } from "@/lib/i18n";
import { ark } from "@ark-ui/react/factory";
import {
  FloatingPanel as ArkFloatingPanel,
  useFloatingPanelContext,
} from "@ark-ui/react/floating-panel";
import { Portal } from "@ark-ui/react/portal";
import { Maximize, MaximizeIcon, MinimizeIcon, MinusIcon } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export const useFloatingPanel = useFloatingPanelContext;

export const FloatingPanel = (
  props: React.ComponentProps<typeof ArkFloatingPanel.Root>
) => {
  const { lazyMount = true, unmountOnExit = true, ...rest } = props;

  return (
    <ArkFloatingPanel.Root
      data-slot="floating-panel"
      lazyMount={lazyMount}
      unmountOnExit={unmountOnExit}
      {...rest}
    />
  );
};

export const FloatingPanelTrigger = (
  props: React.ComponentProps<typeof ArkFloatingPanel.Trigger>
) => <ArkFloatingPanel.Trigger data-slot="floating-panel-trigger" {...props} />;

interface FloatingPanelContentProps
  extends React.ComponentProps<typeof ArkFloatingPanel.Content> {
  /**
   * Enable resizable panel
   *
   * @default true
   */
  resizable?: boolean;
}

export const FloatingPanelContent = (props: FloatingPanelContentProps) => {
  const { resizable = true, className, children, ...rest } = props;

  return (
    <Portal>
      {/* Ark sets an inline z-index of 1, 2, … (most recently used panel on
          top). Keep that order, but above the viewer's floating controls
          (z-20) and below dialogs and menus (z-50). */}
      <ArkFloatingPanel.Positioner
        className="inset-s-(--x) top-(--y) z-[calc(30+var(--z-index,0))]!"
        data-slot="floating-panel-positioner"
      >
        <ArkFloatingPanel.Content
          className={cn(
            "[--space:--spacing(4)]",
            "group/floating-panel",
            "relative",
            "flex flex-col",
            "h-(--height) min-h-0 w-(--width)",
            "bg-popover",
            "text-popover-foreground",
            "rounded-2xl border shadow-lg/5",
            "transition-[scale,opacity,translate] duration-200 ease-in-out will-change-transform",
            "data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[98%] data-[state=open]:animate-in",
            "motion-reduce:animate-none! motion-reduce:transition-none!",
            className
          )}
          data-slot="floating-panel-content"
          {...rest}
        >
          {children}

          {resizable && (
            <>
              <FloatingPanelResizeTrigger axis="n" />
              <FloatingPanelResizeTrigger axis="e" />
              <FloatingPanelResizeTrigger axis="w" />
              <FloatingPanelResizeTrigger axis="s" />
              <FloatingPanelResizeTrigger axis="ne" />
              <FloatingPanelResizeTrigger axis="se" />
              <FloatingPanelResizeTrigger axis="sw" />
              <FloatingPanelResizeTrigger axis="nw" />
            </>
          )}
        </ArkFloatingPanel.Content>
      </ArkFloatingPanel.Positioner>
    </Portal>
  );
};

export const FloatingPanelDragTrigger = (
  props: React.ComponentProps<typeof ArkFloatingPanel.DragTrigger>
) => (
  <ArkFloatingPanel.DragTrigger
    data-slot="floating-panel-drag-trigger"
    {...props}
  />
);

export const FloatingPanelHeader = (
  props: React.ComponentProps<typeof ArkFloatingPanel.Header>
) => {
  const { className, ...rest } = props;

  return (
    <FloatingPanelDragTrigger>
      <ArkFloatingPanel.Header
        className={cn(
          "relative",
          "min-w-0",
          "px-(--space) py-[calc(var(--space)*0.5)]",
          "flex flex-1 shrink-0 items-center gap-2",
          "bg-muted/48",
          "rounded-t-2xl border-b",
          "overflow-hidden",
          "[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          className
        )}
        {...rest}
      />
    </FloatingPanelDragTrigger>
  );
};

export const FloatingPanelControl = (
  props: React.ComponentProps<typeof ArkFloatingPanel.Control>
) => {
  const { className, ...rest } = props;

  return (
    <ArkFloatingPanel.Control
      className={cn("ms-auto flex items-center gap-2", className)}
      {...rest}
    />
  );
};

interface FloatingPanelStageTriggerProps
  extends Omit<
      React.ComponentProps<typeof ArkFloatingPanel.StageTrigger>,
      "stage"
    >,
    ButtonProps {}

export const FloatingPanelMinimize = (
  props: FloatingPanelStageTriggerProps
) => {
  const { size = "icon-xs", variant = "ghost", ...rest } = props;

  return (
    <ArkFloatingPanel.StageTrigger {...rest} asChild stage="minimized">
      <Button aria-label={t("Minimize")} size={size} variant={variant}>
        <MinusIcon />
      </Button>
    </ArkFloatingPanel.StageTrigger>
  );
};

export const FloatingPanelMaximize = (
  props: FloatingPanelStageTriggerProps
) => {
  const { size = "icon-xs", variant = "ghost", ...rest } = props;

  return (
    <ArkFloatingPanel.StageTrigger {...rest} asChild stage="maximized">
      <Button aria-label={t("Maximize")} size={size} variant={variant}>
        <Maximize />
      </Button>
    </ArkFloatingPanel.StageTrigger>
  );
};

export const FloatingPanelRestore = (props: FloatingPanelStageTriggerProps) => {
  const { size = "icon-xs", variant = "outline", ...rest } = props;

  return (
    <ArkFloatingPanel.StageTrigger {...rest} asChild stage="default">
      <Button aria-label={t("Restore")} size={size} variant={variant}>
        <MinimizeIcon className="hidden group-data-maximized/floating-panel:block" />
        <MaximizeIcon className="hidden group-data-minimized/floating-panel:block" />
      </Button>
    </ArkFloatingPanel.StageTrigger>
  );
};

export const FloatingPanelTitle = (
  props: React.ComponentProps<typeof ArkFloatingPanel.Title>
) => {
  const { className, ...rest } = props;

  return (
    <ArkFloatingPanel.Title
      className={cn(
        "min-w-0 flex-1",
        "flex items-center gap-2",
        "truncate whitespace-nowrap font-medium text-sm leading-none",
        className
      )}
      data-slot="floating-panel-title"
      {...rest}
    />
  );
};

export const FloatingPanelResizeTrigger = (
  props: React.ComponentProps<typeof ArkFloatingPanel.ResizeTrigger>
) => (
  <ArkFloatingPanel.ResizeTrigger
    data-slot="floating-panel-resize-trigger"
    {...props}
  />
);

export const FloatingPanelStageTrigger = (
  props: React.ComponentProps<typeof ArkFloatingPanel.StageTrigger>
) => (
  <ArkFloatingPanel.StageTrigger
    data-slot="floating-panel-stage-trigger"
    {...props}
  />
);

export const FloatingPanelCloseTrigger = (
  props: React.ComponentProps<typeof ArkFloatingPanel.CloseTrigger>
) => (
  <ArkFloatingPanel.CloseTrigger
    data-slot="floating-panel-close-trigger"
    {...props}
  />
);

interface FloatingPanelBodyProps
  extends React.ComponentProps<typeof ArkFloatingPanel.Body> {
  /**
   * Add a fade effect to the scroll area
   *
   * @default false
   */
  scrollFade?: boolean;
}

export const FloatingPanelBody = (props: FloatingPanelBodyProps) => {
  const { scrollFade = false, className, children, ...rest } = props;

  return (
    <ScrollArea className="[&_[data-slot=scroll-area-content]]:min-w-0!" scrollFade={scrollFade}>
      <ArkFloatingPanel.Body
        className={cn(
          "flex flex-col gap-4",
          "p-(--space)",
          "overflow-auto",
          "in-[[data-slot=floating-panel-content]:has([data-slot=floating-panel-footer]:not(.border-t))]:pb-1",
          className
        )}
        data-slot="floating-panel-body"
        {...rest}
      >
        {children}
      </ArkFloatingPanel.Body>
    </ScrollArea>
  );
};

export const FloatingPanelFooter = (
  props: React.ComponentProps<typeof ark.div>
) => {
  const { className, ...rest } = props;

  return (
    <ark.div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        "sm:rounded-b-[calc(var(--radius-2xl)-1px)]",
        "px-(--space) py-4",
        "bg-muted/48",
        "border-t",
        className
      )}
      data-slot="floating-panel-footer"
      {...rest}
    />
  );
};
