import {
  AppleIcon,
  ClockIcon,
  FlagIcon,
  HandIcon,
  HeartIcon,
  LightbulbIcon,
  PawPrintIcon,
  PlaneIcon,
  ReplaceIcon,
  SearchIcon,
  SmileIcon,
  VolleyballIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/toast";
import { FixedValue, LabeledSlider, setOpacity } from "@/components/tools/StyleControls";
import { Hinted, ToolButton } from "@/components/tools/ToolButton";
import { addAnnotation } from "@/lib/actions";
import { type EmojiAnnotation, uid } from "@/lib/annotations";
import {
  EMOJI_FONT,
  type EmojiGroup,
  type EmojiItem,
  loadEmojiGroups,
  SKIN_TONES,
  searchEmojis,
  withTone,
} from "@/lib/emoji";
import { stageRegistry } from "@/lib/stageRegistry";
import { cn } from "@/lib/utils";
import { viewport } from "@/lib/viewport";
import { getDoc, updateAnnotations } from "@/state/document";
import { getSettings, useSettings } from "@/state/settings";
import { getUi, useUi } from "@/state/ui";
import { t, tk, useT } from "@/lib/i18n";

const COLUMNS = 8;
const MAX_RECENTS = 24;

const GROUP_ICONS: Record<string, React.ReactNode> = {
  recent: <ClockIcon />,
  smileys: <SmileIcon />,
  people: <HandIcon />,
  nature: <PawPrintIcon />,
  food: <AppleIcon />,
  travel: <PlaneIcon />,
  activities: <VolleyballIcon />,
  objects: <LightbulbIcon />,
  symbols: <HeartIcon />,
  flags: <FlagIcon />,
};

/* ------------------------------------------------------------------ actions */

function rememberEmoji(emoji: string) {
  const { recentEmojis, set } = getSettings();
  set("recentEmojis", [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(0, MAX_RECENTS));
}

/** Add an emoji at the centre of the view (cascading if one is already there). */
export function insertEmoji(emoji: string, label: string) {
  const doc = getDoc();
  if (!doc) return;
  const { image } = doc;
  // About 112 screen px at the current zoom, within the image.
  const size = Math.round(Math.min(Math.max(112 / viewport.cur.scale, 12), Math.min(image.width, image.height) * 0.8));
  const group = stageRegistry.annotationGroup;
  const c = group
    ? group.getAbsoluteTransform().copy().invert().point(viewport.center)
    : { x: image.width / 2, y: image.height / 2 };
  let x = c.x - size / 2;
  let y = c.y - size / 2;
  const step = size * 0.3;
  const taken = (px: number, py: number) =>
    doc.annotations.some((a) => a.type === "emoji" && Math.abs(a.x - px) < 1 && Math.abs(a.y - py) < 1);
  for (let i = 0; i < 20 && taken(x, y); i++) {
    x += step;
    y += step;
  }
  const a: EmojiAnnotation = { id: uid(), type: "emoji", emoji, label, size, x, y, rotation: 0, opacity: 1 };
  addAnnotation(a, true);
  getUi().set({ tool: "select" });
  rememberEmoji(emoji);
}

/** Swap the emoji of the selected emoji layers. */
function replaceSelected(emoji: string, label: string) {
  const ids = getUi().selectedIds;
  updateAnnotations(ids, (a) => (a.type === "emoji" ? { ...a, emoji, label } : a));
  rememberEmoji(emoji);
}

/* ------------------------------------------------------------------ picker */

function useEmojiGroups() {
  const [groups, setGroups] = useState<EmojiGroup[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadEmojiGroups().then(
      (g) => !cancelled && setGroups(g),
      (err: Error) => toast.error({ title: t("Couldn't load emojis"), description: err.message })
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return groups;
}

interface Section {
  id: string;
  label: string;
  items: EmojiItem[];
}

function SkinTonePicker() {
  const t = useT();
  const tr = t;
  const tone = useSettings((s) => s.emojiSkinTone);
  const set = useSettings((s) => s.set);
  const [open, setOpen] = useState(false);
  const current = SKIN_TONES[tone] ?? SKIN_TONES[0];
  if (!open) {
    return (
      <Hinted label={t("Skin tone")}>
        <button
          aria-label={`${t("Skin tone")}: ${t(current.label)}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent"
          onClick={() => setOpen(true)}
          type="button"
        >
          <span className="size-4 rounded-full border border-black/15" style={{ background: current.swatch }} />
        </button>
      </Hinted>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-muted/60 p-0.5" role="radiogroup">
      {SKIN_TONES.map((t) => (
        <button
          aria-checked={t.tone === tone}
          aria-label={tr(t.label)}
          className={cn(
            "flex size-6 items-center justify-center rounded transition-colors hover:bg-accent",
            t.tone === tone && "bg-accent"
          )}
          key={t.tone}
          onClick={() => {
            set("emojiSkinTone", t.tone);
            setOpen(false);
          }}
          role="radio"
          title={tr(t.label)}
          type="button"
        >
          <span className="size-3.5 rounded-full border border-black/15" style={{ background: t.swatch }} />
        </button>
      ))}
    </div>
  );
}

/**
 * Searchable emoji grid with categories, recents and skin tones.
 * `onPick(emoji, label, keepOpen)`; keepOpen is true for Shift+click / Shift+Enter.
 */
export function EmojiPicker({
  onPick,
  hint,
}: {
  onPick: (emoji: string, label: string, keepOpen: boolean) => void;
  hint?: string;
}) {
  const t = useT();
  const groups = useEmojiGroups();
  const tone = useSettings((s) => s.emojiSkinTone);
  const recents = useSettings((s) => s.recentEmojis);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const [activeSection, setActiveSection] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const jumping = useRef(false);

  // Every tone variant → its base item, so recents keep their names.
  const byEmoji = useMemo(() => {
    const map = new Map<string, EmojiItem>();
    for (const g of groups ?? [])
      for (const e of g.emojis) {
        map.set(e.emoji, e);
        for (const s of e.skins ?? []) map.set(s, e);
      }
    return map;
  }, [groups]);

  const sections = useMemo<Section[]>(() => {
    if (!groups) return [];
    if (query.trim()) return [{ id: "results", label: tk("Results"), items: searchEmojis(groups, query) }];
    const recent: EmojiItem[] = recents.map((e) => {
      const base = byEmoji.get(e);
      // Keep the exact variant that was used.
      return base ? { ...base, emoji: e, skins: undefined } : { emoji: e, label: "", search: "" };
    });
    return [
      ...(recent.length ? [{ id: "recent", label: tk("Recently used"), items: recent }] : []),
      ...groups.map((g) => ({ id: g.id, label: g.label, items: g.emojis })),
    ];
  }, [groups, query, recents, byEmoji]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const shown = highlight >= 0 ? flat[highlight] : null;

  useEffect(() => setActiveSection(sections[0]?.id ?? ""), [sections]);

  const viewportEl = () =>
    scrollRef.current?.closest<HTMLElement>("[data-slot=scroll-area-viewport]") ?? null;

  // Highlight the tab of the section at the top while scrolling.
  useEffect(() => {
    const vp = viewportEl();
    if (!vp) return;
    const onScroll = () => {
      if (jumping.current) return;
      const top = vp.getBoundingClientRect().top;
      let current = sections[0]?.id ?? "";
      for (const el of vp.querySelectorAll<HTMLElement>("[data-section]")) {
        if (el.getBoundingClientRect().top - top <= 12) current = el.dataset.section!;
      }
      setActiveSection(current);
    };
    vp.addEventListener("scroll", onScroll, { passive: true });
    return () => vp.removeEventListener("scroll", onScroll);
  }, [sections]);

  const jumpTo = (id: string) => {
    const vp = viewportEl();
    const el = vp?.querySelector<HTMLElement>(`[data-section="${id}"]`);
    if (!vp || !el) return;
    jumping.current = true;
    setActiveSection(id);
    vp.scrollTop += el.getBoundingClientRect().top - vp.getBoundingClientRect().top;
    requestAnimationFrame(() => {
      jumping.current = false;
    });
  };

  const pick = (item: EmojiItem, keepOpen: boolean) => onPick(withTone(item, tone), item.label, keepOpen);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!flat.length) return;
    const move = (d: number) => {
      e.preventDefault();
      setHighlight((h) => Math.min(flat.length - 1, Math.max(0, (h < 0 ? 0 : h) + d)));
    };
    if (e.key === "ArrowRight") move(1);
    else if (e.key === "ArrowLeft") move(-1);
    else if (e.key === "ArrowDown") move(highlight < 0 ? 0 : COLUMNS);
    else if (e.key === "ArrowUp") move(-COLUMNS);
    else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[Math.max(0, highlight)];
      if (item) pick(item, e.shiftKey);
    }
  };

  // Keep the keyboard highlight in view.
  useEffect(() => {
    if (highlight < 0) return;
    viewportEl()?.querySelector(`[data-index="${highlight}"]`)?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  let index = 0;
  return (
    <div className="flex w-[21rem] max-w-[calc(100vw-2rem)] flex-col">
      <div className="flex items-center gap-2 border-b py-1 pr-1.5 pl-3">
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
        <input
          aria-label={t("Search emojis")}
          autoFocus
          className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(e.target.value.trim() ? 0 : -1);
            viewportEl()?.scrollTo({ top: 0 });
          }}
          onKeyDown={onKeyDown}
          placeholder={t("Search emojis…")}
          value={query}
        />
        {query && (
          <button
            aria-label={t("Clear search")}
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:size-3.5"
            onClick={() => setQuery("")}
            type="button"
          >
            <XIcon />
          </button>
        )}
        <SkinTonePicker />
      </div>

      {!query.trim() && groups && (
        <div className="flex items-center justify-between gap-0.5 border-b px-1.5 py-1" role="tablist">
          {sections.map((s) => (
            <Hinted key={s.id} label={t(s.label)}>
              <button
                aria-label={t(s.label)}
                aria-selected={activeSection === s.id}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-4",
                  activeSection === s.id && "bg-accent text-brand"
                )}
                onClick={() => jumpTo(s.id)}
                role="tab"
                type="button"
              >
                {GROUP_ICONS[s.id]}
              </button>
            </Hinted>
          ))}
        </div>
      )}

      <ScrollArea className="h-72" scrollFade>
        <div className="px-1.5 pb-1.5" ref={scrollRef} role="listbox">
          {!groups && (
            <div className="grid grid-cols-8 gap-0.5 pt-8">
              {Array.from({ length: 32 }, (_, i) => (
                <div className="mx-auto size-7 animate-pulse rounded-md bg-muted" key={i} />
              ))}
            </div>
          )}
          {groups && flat.length === 0 && (
            <div className="px-3 py-10 text-center text-muted-foreground text-sm">{t("No emojis found.")}</div>
          )}
          {sections.map((s) =>
            s.items.length === 0 ? null : (
              <div data-section={s.id} key={s.id} role="group">
                <div className="sticky top-0 z-10 bg-popover/95 px-1.5 pt-2 pb-1 font-medium text-[11px] text-muted-foreground backdrop-blur-sm">
                  {t(s.label)}
                </div>
                <div className="grid grid-cols-8 gap-0.5" style={{ contentVisibility: "auto" }}>
                  {s.items.map((item) => {
                    const i = index++;
                    const glyph = s.id === "recent" ? item.emoji : withTone(item, tone);
                    return (
                      <button
                        aria-label={item.label || glyph}
                        className={cn(
                          "flex aspect-square items-center justify-center rounded-md text-[26px] leading-none transition-transform hover:scale-110 hover:bg-accent active:scale-95",
                          i === highlight && "bg-accent"
                        )}
                        data-index={i}
                        key={`${s.id}-${item.emoji}`}
                        onClick={(e) =>
                          s.id === "recent"
                            ? onPick(item.emoji, item.label, e.shiftKey)
                            : pick(item, e.shiftKey)
                        }
                        onMouseEnter={() => setHighlight(i)}
                        role="option"
                        style={{ fontFamily: EMOJI_FONT }}
                        type="button"
                      >
                        {glyph}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </ScrollArea>

      <div className="flex h-12 items-center gap-2.5 border-t px-3">
        {shown ? (
          <>
            <span className="text-[28px] leading-none" style={{ fontFamily: EMOJI_FONT }}>
              {withTone(shown, tone)}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-sm first-letter:uppercase">
              {shown.label}
            </span>
          </>
        ) : (
          <span className="flex-1 truncate text-muted-foreground text-xs">{hint ?? t("Shift-click to add several")}</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ toolbar */

export function EmojiToolButton() {
  const t = useT();
  const open = useUi((s) => s.emojiPickerOpen);
  const set = useUi((s) => s.set);
  return (
    <Popover
      lazyMount
      modal={false}
      onOpenChange={(d) => set({ emojiPickerOpen: d.open })}
      open={open}
      positioning={{ placement: "top", gutter: 14 }}
      unmountOnExit
    >
      <PopoverTrigger asChild>
        <ToolButton active={open} label={t("Emoji")}>
          <SmileIcon />
        </ToolButton>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0">
        <EmojiPicker
          onPick={(emoji, label, keepOpen) => {
            insertEmoji(emoji, label);
            if (!keepOpen) set({ emojiPickerOpen: false });
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ selection */

export function EmojiControls({ targets }: { targets: EmojiAnnotation[] }) {
  const t = useT();
  const first = targets[0];
  const docUnit = useUi((s) => s.docUnit);
  const size = Math.max(8, Math.round(first.size / docUnit));
  const opacity = Math.round(first.opacity * 100);
  const [replacing, setReplacing] = useState(false);

  const setSize = (display: number) =>
    updateAnnotations(
      getUi().selectedIds,
      (a) => {
        if (a.type !== "emoji") return a;
        // Resize around the centre.
        const next = display * docUnit;
        const d = (next - a.size) / 2;
        return { ...a, size: next, x: a.x - d, y: a.y - d };
      },
      { key: "emoji-size" }
    );

  return (
    <>
      <Popover modal={false} onOpenChange={(d) => setReplacing(d.open)} open={replacing} positioning={{ placement: "top", gutter: 12 }}>
        <Hinted label={t("Replace emoji")}>
          <PopoverTrigger
            aria-label={t("Replace emoji")}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs transition-colors hover:bg-accent data-[state=open]:bg-accent [&_svg]:size-3.5"
          >
            <span className="text-lg leading-none" style={{ fontFamily: EMOJI_FONT }}>
              {first.emoji}
            </span>
            <ReplaceIcon className="text-muted-foreground" />
          </PopoverTrigger>
        </Hinted>
        <PopoverContent className="w-auto overflow-hidden p-0">
          {replacing && (
            <EmojiPicker
              hint={t("Pick an emoji to swap it in")}
              onPick={(emoji, label) => {
                replaceSelected(emoji, label);
                setReplacing(false);
              }}
            />
          )}
        </PopoverContent>
      </Popover>
      <Popover modal={false} positioning={{ placement: "top", gutter: 12 }}>
        <Hinted label={t("Size")}>
          <PopoverTrigger
            aria-label={`${t("Size")} ${size} px`}
            className="flex h-8 items-center gap-2 rounded-lg px-2 text-xs transition-colors hover:bg-accent data-[state=open]:bg-accent"
          >
            <span className="font-medium text-muted-foreground">{t("Size")}</span>
            <FixedValue unit="px" value={size} widest={888} />
          </PopoverTrigger>
        </Hinted>
        <PopoverContent className="w-60 p-4">
          <LabeledSlider label={t("Size")} max={600} min={12} onChange={setSize} step={1} suffix="px" value={Math.min(600, size)} />
        </PopoverContent>
      </Popover>
      <Popover modal={false} positioning={{ placement: "top", gutter: 12 }}>
        <Hinted label={t("Opacity")}>
          <PopoverTrigger
            aria-label={`${t("Opacity")} ${opacity}%`}
            className="flex h-8 items-center gap-2 rounded-lg px-2 text-xs transition-colors hover:bg-accent data-[state=open]:bg-accent"
          >
            <span className="font-medium text-muted-foreground">{t("Opacity")}</span>
            <FixedValue unit="%" value={opacity} widest={888} />
          </PopoverTrigger>
        </Hinted>
        <PopoverContent className="w-60 p-4">
          <LabeledSlider
            label={t("Opacity")}
            max={100}
            min={5}
            onChange={(v) => setOpacity(v / 100)}
            step={1}
            suffix="%"
            value={opacity}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
