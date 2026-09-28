"use client";

import { Menu as ArkMenu, useMenuContext } from "@ark-ui/react/menu";
import type React from "react";
import { cn } from "@/lib/utils";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from "@/components/ui/menu";

export const useContextMenu = useMenuContext;

export const ContextMenu = (props: React.ComponentProps<typeof Menu>) => (
  <Menu data-slot="context-menu" {...props} />
);

export const ContextMenuTrigger = (
  props: React.ComponentProps<typeof ArkMenu.ContextTrigger>
) => {
  const { className, ...rest } = props;

  return (
    <ArkMenu.ContextTrigger
      className={cn("cursor-default", className)}
      data-slot="context-menu-trigger"
      {...rest}
    />
  );
};

export const ContextMenuContent = (
  props: React.ComponentProps<typeof MenuContent>
) => <MenuContent data-slot="context-menu-content" {...props} />;

export const ContextMenuGroup = (
  props: React.ComponentProps<typeof MenuGroup>
) => <MenuGroup data-slot="context-menu-group" {...props} />;

export const ContextMenuSeparator = (
  props: React.ComponentProps<typeof MenuSeparator>
) => <MenuSeparator data-slot="context-menu-separator" {...props} />;

export const ContextMenuItem = (
  props: React.ComponentProps<typeof MenuItem>
) => <MenuItem data-slot="context-menu-item" {...props} />;

export const ContextMenuSub = (props: React.ComponentProps<typeof MenuSub>) => (
  <MenuSub data-slot="context-menu-sub" {...props} />
);

export const ContextMenuSubContent = (
  props: React.ComponentProps<typeof MenuContent>
) => <MenuSubContent data-slot="context-menu-sub-content" {...props} />;

export const ContextMenuSubTrigger = (
  props: React.ComponentProps<typeof MenuSubTrigger>
) => <MenuSubTrigger data-slot="context-menu-sub-trigger" {...props} />;

export const ContextMenuShortcut = (
  props: React.ComponentProps<typeof MenuShortcut>
) => <MenuShortcut data-slot="context-menu-shortcut" {...props} />;
