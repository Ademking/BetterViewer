"use client";

import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Spinner = (props: React.ComponentProps<"svg">) => {
  const { "aria-label": ariaLabel, className, ...rest } = props;

  return (
    <Loader2Icon
      aria-label={ariaLabel ?? "Loading"}
      className={cn("size-4 animate-spin", className)}
      data-slot="spinner"
      role="status"
      {...rest}
    />
  );
};
