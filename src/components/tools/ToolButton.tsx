import type React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type ShortcutId, useShortcutText } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { useSettings } from "@/state/settings";

export { ALT, isMac, MOD } from "@/lib/platform";

interface HintedProps {
  label: string;
  /** Keys shown next to the label: fixed text, or a customizable command's keys. */
  shortcut?: string;
  command?: ShortcutId;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
}

/** Wraps a trigger with a Shark tooltip (respects the "Show hints" setting). */
export function Hinted({ label, shortcut: fixed, command, children, side = "top" }: HintedProps) {
  const show = useSettings((s) => s.showHints);
  const keys = useShortcutText();
  const shortcut = command ? keys(command) : fixed;
  if (!show) return children;
  return (
    <Tooltip openDelay={350} positioning={{ placement: side, gutter: 10 }}>
      {/* Own wrapper: composing two Ark triggers on one element makes their
          ids collide, which breaks popover / menu positioning. */}
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0">{children}</span>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  );
}

interface ToolButtonProps extends ButtonProps {
  label: string;
  shortcut?: string;
  command?: ShortcutId;
  active?: boolean;
  side?: HintedProps["side"];
}

export const toolButtonClass = cn(
  "text-foreground/80 hover:text-foreground",
  "data-[active=true]:bg-brand data-[active=true]:text-white",
  "data-[state=open]:bg-accent data-[state=open]:text-foreground"
);

/** Icon button used across the toolbar. Extra props flow to the Button so it
 * can be composed as a Menu / Popover trigger via `asChild`. */
export function ToolButton({
  label,
  shortcut,
  command,
  active,
  side,
  className,
  children,
  ...rest
}: ToolButtonProps) {
  return (
    <Hinted command={command} label={label} shortcut={shortcut} side={side}>
      <Button
        aria-label={label}
        aria-pressed={active}
        className={cn(toolButtonClass, className)}
        data-active={active ? "true" : undefined}
        size="icon-md"
        variant="ghost"
        {...rest}
      >
        {children}
      </Button>
    </Hinted>
  );
}

export function ToolbarDivider({ className }: { className?: string }) {
  return <div aria-hidden className={cn("mx-0.5 h-5 w-px shrink-0 bg-border max-sm:mx-0", className)} />;
}
