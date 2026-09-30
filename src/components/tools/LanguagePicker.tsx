import { CheckIcon, ChevronsUpDownIcon, LanguagesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface LanguageOption {
  value: string;
  label: string;
  /** Optional secondary text (e.g. native name). */
  hint?: string;
}

interface LanguagePickerProps {
  value: string;
  options: LanguageOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Full-width language button with a scrollable, keyboard-friendly list. */
export function LanguagePicker({ value, options, onChange, disabled }: LanguagePickerProps) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const i = Math.max(0, options.findIndex((o) => o.value === value));
    setHighlight(i);
    // Bring the selected language into view when the list opens.
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`[data-index="${i}"]`)?.scrollIntoView({ block: "nearest" });
      listRef.current?.focus();
    });
  }, [open, options, value]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const moveTo = (i: number) => {
    setHighlight(i);
    listRef.current?.querySelector<HTMLElement>(`[data-index="${i}"]`)?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      moveTo((highlight + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    } else if (e.key.length === 1 && /\p{L}/u.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Type a letter to jump to the next language starting with it.
      const letter = e.key.toLowerCase();
      for (let step = 1; step <= options.length; step++) {
        const i = (highlight + step) % options.length;
        if (options[i].label.toLowerCase().startsWith(letter)) {
          e.preventDefault();
          moveTo(i);
          break;
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(options[highlight].value);
    }
  };

  return (
    <Popover
      modal={false}
      onOpenChange={(d) => setOpen(d.open)}
      open={open}
      positioning={{ placement: "bottom-start", gutter: 6, sameWidth: true }}
    >
      <PopoverTrigger
        aria-label={`Language: ${current.label}`}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-lg border bg-background/40 px-2.5 text-left text-sm transition-colors",
          "hover:bg-accent data-[state=open]:border-brand/60 data-[state=open]:bg-accent",
          "disabled:pointer-events-none disabled:opacity-60"
        )}
        disabled={disabled}
      >
        <LanguagesIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium">{current.label}</span>
        <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="overflow-hidden p-0">
        {/* Tall enough to show every language; scrolls only on short windows. */}
        <ScrollArea className="max-h-[min(28rem,calc(var(--available-height,28rem)-8px))]" scrollFade>
          <div
            aria-label="Languages"
            className="flex flex-col p-1 outline-none"
            onKeyDown={onKeyDown}
            ref={listRef}
            role="listbox"
            tabIndex={-1}
          >
            {options.map((o, i) => {
              const selected = o.value === value;
              return (
                <button
                  aria-selected={selected}
                  className={cn(
                    "flex w-full items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-left text-sm outline-none",
                    i === highlight && "bg-accent"
                  )}
                  data-index={i}
                  key={o.value}
                  onClick={() => choose(o.value)}
                  onMouseMove={() => setHighlight(i)}
                  role="option"
                  tabIndex={-1}
                  type="button"
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="shrink-0 text-muted-foreground text-xs">{o.hint}</span>}
                  <CheckIcon className={cn("size-4 shrink-0 text-brand", !selected && "invisible")} />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
