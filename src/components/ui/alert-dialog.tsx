"use client";

import type React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const AlertDialog = (props: React.ComponentProps<typeof Dialog>) => (
  <Dialog data-slot="alert-dialog-root" role="alertdialog" {...props} />
);

export const AlertDialogTrigger = (
  props: React.ComponentProps<typeof DialogTrigger>
) => <DialogTrigger data-slot="alert-dialog-trigger" {...props} />;

export const AlertDialogContent = (
  props: React.ComponentProps<typeof DialogContent>
) => (
  <DialogContent
    data-slot="alert-dialog-content"
    showCloseButton={false}
    {...props}
  />
);

export const AlertDialogBody = (
  props: React.ComponentProps<typeof DialogBody>
) => {
  const { className, ...rest } = props;

  return (
    <DialogBody
      className={cn(
        "in-[[data-slot=alert-dialog-content]:has([data-slot=alert-dialog-header])]:pt-0",
        className
      )}
      data-slot="alert-dialog-body"
      {...rest}
    />
  );
};

export const AlertDialogHeader = (
  props: React.ComponentProps<typeof DialogHeader>
) => <DialogHeader data-slot="alert-dialog-header" {...props} />;

export const AlertDialogTitle = (
  props: React.ComponentProps<typeof DialogTitle>
) => <DialogTitle data-slot="alert-dialog-title" {...props} />;

export const AlertDialogDescription = (
  props: React.ComponentProps<typeof DialogDescription>
) => <DialogDescription data-slot="alert-dialog-description" {...props} />;

export const AlertDialogClose = (
  props: React.ComponentProps<typeof DialogClose>
) => <DialogClose data-slot="alert-dialog-close" {...props} />;

export const AlertDialogFooter = (
  props: React.ComponentProps<typeof DialogFooter>
) => <DialogFooter data-slot="alert-dialog-footer" {...props} />;

interface AlertDialogActionProps
  extends React.ComponentProps<typeof DialogClose>,
    Omit<ButtonProps, "variant"> {
  /**
   * The variant of the action button
   *
   * @default "default"
   */
  variant?: "default" | "destructive";
}

export const AlertDialogAction = (props: AlertDialogActionProps) => {
  const { variant = "default", ...rest } = props;

  return <Button variant={variant} {...rest} />;
};

interface AlertDialogCancelProps
  extends React.ComponentProps<typeof DialogClose>,
    Omit<ButtonProps, "variant"> {}

export const AlertDialogCancel = (props: AlertDialogCancelProps) => (
  <AlertDialogClose asChild data-slot="alert-dialog-cancel">
    <Button variant="outline" {...props} />
  </AlertDialogClose>
);
