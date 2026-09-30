import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hinted } from "@/components/tools/ToolButton";
import {
  ensureFont,
  ensureStylesheet,
  FONT_CATEGORIES,
  FONTS,
  type FontOption,
  getFont,
} from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const matches = (f: FontOption, query: string) => {
  const hay = `${f.label} ${f.category}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
};

/** One row; its web font stylesheet is only requested once the row is visible. */
function FontRow({
  font,
  active,
  highlighted,
  onHover,
  onSelect,
}: {
  font: FontOption;
  active: boolean;
  highlighted: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !font.google) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        ensureStylesheet(font);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [font]);

  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  return (
    <button
      aria-selected={active}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[15px] outline-none",
        highlighted && "bg-accent text-accent-foreground"
      )}
      onClick={onSelect}
      onMouseMove={onHover}
      ref={ref}
      role="option"
      tabIndex={-1}
      type="button"
    >
      <span className="flex-1 truncate" style={{ fontFamily: font.stack }}>
        {font.label}
      </span>
      {active && <CheckIcon className="size-4 shrink-0 text-brand" />}
    </button>
  );
}

interface FontPickerProps {
  value: string | undefined;
  onChange: (id: string) => void;
}

/** Searchable font list, grouped by category, previewing each face. */
export function FontPicker({ value, onChange }: FontPickerProps) {
  const t = useT();
  const current = getFont(value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const groups = useMemo(
    () =>
      FONT_CATEGORIES.map((cat) => ({
        cat,
        fonts: FONTS.filter((f) => f.category === cat && matches(f, query)),
      })).filter((g) => g.fonts.length > 0),
    [query]
  );
  const flat = useMemo(() => groups.flatMap((g) => g.fonts), [groups]);

  // Start on the current font whenever the picker opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlight(Math.max(0, FONTS.findIndex((f) => f.id === current.id)));
  }, [open, current.id]);

  const select = (f: FontOption) => {
    onChange(f.id);
    ensureFont(f.id);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!flat.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const f = flat[highlight];
      if (f) select(f);
    }
  };

  return (
    <Popover
      modal={false}
      onOpenChange={(d) => setOpen(d.open)}
      open={open}
      positioning={{ placement: "top", gutter: 12 }}
    >
      <Hinted label={t("Font")}>
        <PopoverTrigger className="flex h-8 max-w-40 items-center gap-1.5 rounded-lg px-2 text-sm transition-colors hover:bg-accent data-[state=open]:bg-accent">
          <span className="truncate" style={{ fontFamily: current.stack }}>
            {current.label}
          </span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
      </Hinted>
      <PopoverContent className="w-64 overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b px-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            aria-label={t("Search fonts")}
            autoFocus
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={t("Search fonts…")}
            value={query}
          />
        </div>
        <ScrollArea className="h-72" scrollFade>
          <div className="p-1" role="listbox">
            {groups.length === 0 && (
              <div className="px-3 py-8 text-center text-muted-foreground text-sm">{t("No fonts found.")}</div>
            )}
            {groups.map((g, gi) => (
              <div className={cn(gi > 0 && "mt-1 border-t pt-1")} key={g.cat} role="group">
                <div className="px-2.5 py-1.5 font-medium text-muted-foreground text-xs">{t(g.cat)}</div>
                {g.fonts.map((f) => {
                  const index = flat.indexOf(f);
                  return (
                    <FontRow
                      active={f.id === current.id}
                      font={f}
                      highlighted={index === highlight}
                      key={f.id}
                      onHover={() => setHighlight(index)}
                      onSelect={() => select(f)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
