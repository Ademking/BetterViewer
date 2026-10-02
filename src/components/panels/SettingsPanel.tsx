import {
  EyeIcon,
  KeyboardIcon,
  MonitorIcon,
  MoonIcon,
  MousePointerClickIcon,
  PaletteIcon,
  PenLineIcon,
  RotateCcwIcon,
  Share2Icon,
  SunIcon,
} from "lucide-react";
import { getAutoOpen, isExtension, setAutoOpen } from "@/lib/platform";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { SegmentGroup, SegmentGroupItem, SegmentGroupItemText } from "@/components/ui/segment-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { ColorField } from "@/components/tools/ColorField";
import { LabeledSlider } from "@/components/tools/StyleControls";
import { ALT, MOD } from "@/components/tools/ToolButton";
import { FAST_ZOOM } from "@/lib/viewport";
import { cn } from "@/lib/utils";
import { LANGUAGES, resolveLanguage, tk, useT } from "@/lib/i18n";
import { LanguagePicker } from "@/components/tools/LanguagePicker";
import { setToolbarItemShown, showAllToolbarItems, TOOLBAR_ITEMS } from "@/components/viewer/toolbarItems";
import { type BoardBackground, type Settings, useSettings } from "@/state/settings";
import { useDoc } from "@/state/document";
import { useUi } from "@/state/ui";

function Row({
  title,
  description,
  children,
  stacked,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-4 py-3",
        stacked ? "flex-col gap-2.5" : "items-center justify-between"
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium text-sm">{title}</span>
        {description && <span className="text-muted-foreground text-xs">{description}</span>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle<K extends keyof Settings>({ k, label }: { k: K; label: string }) {
  const value = useSettings((s) => s[k]) as boolean;
  const set = useSettings((s) => s.set);
  return (
    <Switch
      aria-label={label}
      checked={value}
      onCheckedChange={(d) => set(k, d.checked as Settings[K])}
    />
  );
}

/** Extension only: lives in extension storage, read by the content script. */
function AutoOpenToggle() {
  const t = useT();
  const [value, setValue] = useState<boolean | null>(null);
  useEffect(() => {
    getAutoOpen().then(setValue, () => setValue(true));
  }, []);
  return (
    <Switch
      aria-label={t("Open images automatically")}
      checked={value ?? true}
      disabled={value === null}
      onCheckedChange={(d) => {
        setValue(d.checked);
        void setAutoOpen(d.checked);
      }}
    />
  );
}

function Segments<K extends keyof Settings>({
  k,
  options,
}: {
  k: K;
  options: { value: string; label: string; icon?: React.ReactNode }[];
}) {
  const value = useSettings((s) => s[k]) as string;
  const set = useSettings((s) => s.set);
  return (
    <SegmentGroup
      className="gap-0.5 rounded-lg bg-muted/60 p-0.5"
      onValueChange={(d) => d.value && set(k, d.value as Settings[K])}
      value={value}
    >
      {options.map((o) => (
        <SegmentGroupItem
          className="rounded-md px-2.5 py-1 font-medium text-muted-foreground text-xs data-[state=checked]:text-foreground [&_svg]:size-3.5"
          key={o.value}
          value={o.value}
        >
          <SegmentGroupItemText className="flex items-center gap-1.5">
            {o.icon}
            {o.label}
          </SegmentGroupItemText>
        </SegmentGroupItem>
      ))}
    </SegmentGroup>
  );
}

/** Labels are English; translate with t() where shown. */
export const BOARD_OPTIONS: { value: BoardBackground; label: string; preview: string }[] = [
  { value: "blur", label: tk("Blurred image"), preview: "" },
  { value: "black", label: tk("Black"), preview: "bg-black" },
  { value: "white", label: tk("White"), preview: "bg-white" },
  { value: "grid", label: tk("Transparent grid"), preview: "checkerboard" },
];

/** Miniature board preview using the open image (neutral placeholder otherwise). */
export function BoardSwatch({ mode, className }: { mode: BoardBackground; className?: string }) {
  const src = useDoc((s) => s.doc?.image.src);
  const option = BOARD_OPTIONS.find((o) => o.value === mode)!;
  return (
    <span className={cn("relative block overflow-hidden", option.preview, className)}>
      {mode === "blur" &&
        (src ? (
          <span
            className="absolute -inset-2 scale-125 bg-cover bg-center opacity-80 blur-[6px] saturate-150"
            style={{ backgroundImage: `url("${src}")` }}
          />
        ) : (
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,#6b7280,transparent_65%),#27272a] blur-[4px]" />
        ))}
    </span>
  );
}

function ToolbarButtonsPicker() {
  const t = useT();
  const hidden = useSettings((s) => s.hiddenToolbarItems);
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {TOOLBAR_ITEMS.map((item) => {
          const shown = !hidden.includes(item.id);
          return (
            <button
              aria-pressed={shown}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-lg border px-2 py-1.5 text-start text-xs transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
                shown
                  ? "border-brand/60 bg-brand/10 text-foreground"
                  : "border-border text-muted-foreground hover:border-white/25 hover:text-foreground"
              )}
              key={item.id}
              onClick={() => setToolbarItemShown(item.id, !shown)}
              title={t(item.label)}
              type="button"
            >
              {item.icon}
              <span className="truncate">{t(item.label)}</span>
            </button>
          );
        })}
      </div>
      {hidden.length > 0 && (
        <Button className="self-start" onClick={showAllToolbarItems} size="xs" variant="ghost">
          <EyeIcon /> {t("Show all buttons")}
        </Button>
      )}
    </div>
  );
}

function BoardPicker() {
  const t = useT();
  const value = useSettings((s) => s.boardBackground);
  const set = useSettings((s) => s.set);
  const src = useDoc((s) => s.doc?.image.src);
  return (
    <div className="grid grid-cols-4 gap-2" role="radiogroup">
      {BOARD_OPTIONS.map((o) => (
        <button
          aria-checked={value === o.value}
          className="group flex flex-col items-center gap-1.5"
          key={o.value}
          onClick={() => set("boardBackground", o.value)}
          role="radio"
          type="button"
        >
          <span
            className={cn(
              "relative block h-14 w-full overflow-hidden rounded-lg border-2 transition-all",
              value === o.value ? "border-brand" : "border-border group-hover:border-white/25"
            )}
          >
            <BoardSwatch className="absolute inset-0" mode={o.value} />
            {src ? (
              <img
                alt=""
                className="absolute inset-x-3 inset-y-2.5 m-auto max-h-[calc(100%-1.25rem)] max-w-[calc(100%-1.5rem)] rounded-[3px] object-contain shadow-md"
                draggable={false}
                src={src}
              />
            ) : (
              <span className="absolute inset-x-4 inset-y-3 rounded-[3px] bg-neutral-400/80 shadow-md" />
            )}
          </span>
          <span
            className={cn(
              "text-center text-[11px] leading-tight",
              value === o.value ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {t(o.label)}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Interface language: automatic (the browser's) or one of LANGUAGES. */
function LanguageSetting() {
  const t = useT();
  const value = useSettings((s) => s.language);
  const set = useSettings((s) => s.set);
  const names = new Intl.DisplayNames([resolveLanguage(value)], { type: "language" });
  const localName = (code: string) => {
    try {
      return names.of(code) ?? code;
    } catch {
      return code;
    }
  };
  const auto = LANGUAGES.find((l) => l.code === resolveLanguage("auto"))!;
  return (
    <div className="w-56">
      <LanguagePicker
        onChange={(v) => set("language", v)}
        options={[
          { value: "auto", label: t("Automatic"), hint: auto.name },
          ...LANGUAGES.map((l) => ({ value: l.code, label: l.name, hint: l.name === localName(l.code) ? undefined : localName(l.code) })),
        ]}
        value={value}
      />
    </div>
  );
}

function ImgbbKeyField() {
  const t = useT();
  const key = useSettings((s) => s.imgbbApiKey);
  const set = useSettings((s) => s.set);
  const hasDefault = !!(import.meta.env.VITE_IMGBB_API_KEY as string | undefined);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          aria-label={t("ImgBB API key")}
          autoComplete="off"
          className="flex-1 font-mono"
          onChange={(e) => set("imgbbApiKey", e.target.value.trim())}
          placeholder={hasDefault ? t("Optional: paste your own key") : t("Paste your API key")}
          size="sm"
          spellCheck={false}
          type="password"
          value={key}
        />
        {key && (
          <Button onClick={() => set("imgbbApiKey", "")} size="sm" variant="ghost">
            {t("Clear")}
          </Button>
        )}
      </div>
      <span className="text-muted-foreground text-xs">
        {hasDefault && !key && `${t("If you don't add a key, BetterViewer uses its default one.")} `}
        {hasDefault && key && `${t("Using your key. Clear it to go back to BetterViewer's default one.")} `}
        {(hasDefault ? t("Get your own free key at {site}.") : t("Get a free key at {site}."))
          .split("{site}")
          .map((part, i) =>
            i === 0 ? (
              part
            ) : (
              <span key={part}>
                <a
                  className="text-foreground underline underline-offset-2"
                  href="https://api.imgbb.com/"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  api.imgbb.com
                </a>
                {part}
              </span>
            )
          )}
      </span>
    </div>
  );
}

export function SettingsPanel() {
  const t = useT();
  const open = useUi((s) => s.panels.settings);
  const togglePanel = useUi((s) => s.togglePanel);
  const defaultColor = useSettings((s) => s.defaultColor);
  const zoomSpeed = useSettings((s) => s.zoomSpeed);
  const defaultStrokeWidth = useSettings((s) => s.defaultStrokeWidth);
  const gridSize = useSettings((s) => s.gridSize);
  const snap = useSettings((s) => s.snapToGrid);
  const set = useSettings((s) => s.set);
  const reset = useSettings((s) => s.reset);

  return (
    <Dialog onOpenChange={(d) => togglePanel("settings", d.open)} open={open}>
      <DialogContent className="glass max-h-[min(640px,calc(100svh-2rem))]" size="lg">
        <DialogHeader description={t("Preferences are saved on this device.")} title={t("Settings")} />
        <Tabs className="min-h-0 flex-1" defaultValue="appearance">
          <div className="px-6">
            <TabsList className="w-full">
              <TabsTrigger value="appearance">
                <PaletteIcon /> {t("Appearance")}
              </TabsTrigger>
              <TabsTrigger value="viewer">
                <MousePointerClickIcon /> {t("Viewer")}
              </TabsTrigger>
              <TabsTrigger value="editing">
                <PenLineIcon /> {t("Editing")}
              </TabsTrigger>
              <TabsTrigger value="sharing">
                <Share2Icon /> {t("Sharing")}
              </TabsTrigger>
            </TabsList>
          </div>
          <DialogBody className="pt-2">
            <TabsContent className="divide-y" value="appearance">
              <Row title={t("Language")}>
                <LanguageSetting />
              </Row>
              <Row
                description={t("What's shown behind the image.")}
                stacked
                title={t("Board background")}
              >
                <BoardPicker />
              </Row>
              <Row title={t("Theme")}>
                <Segments
                  k="theme"
                  options={[
                    { value: "dark", label: t("Dark"), icon: <MoonIcon /> },
                    { value: "light", label: t("Light"), icon: <SunIcon /> },
                    { value: "system", label: t("System"), icon: <MonitorIcon /> },
                  ]}
                />
              </Row>
              <Row description={t("The floating tool bar at the bottom.")} title={t("Show toolbar")}>
                <Toggle k="showToolbar" label={t("Show toolbar")} />
              </Row>
              <Row
                description={t("Pick the buttons shown in the toolbar. You can also right-click the toolbar.")}
                stacked
                title={t("Toolbar buttons")}
              >
                <ToolbarButtonsPicker />
              </Row>
              <Row description={t("Tooltips with names and shortcuts.")} title={t("Show hints")}>
                <Toggle k="showHints" label={t("Show hints")} />
              </Row>
              <Row
                description={t("Fade the interface after a few seconds of inactivity.")}
                title={t("Auto-hide interface")}
              >
                <Toggle k="autoHideUi" label={t("Auto-hide interface")} />
              </Row>
              <Row title={t("Show scrollbars")}>
                <Toggle k="showScrollbars" label={t("Show scrollbars")} />
              </Row>
              <Row
                description={t("A small overview of the image while it doesn't fit in the window. Click or drag it to move around.")}
                title={t("Show navigator")}
              >
                <Toggle k="showNavigator" label={t("Show navigator")} />
              </Row>
            </TabsContent>

            <TabsContent className="divide-y" value="viewer">
              {isExtension && (
                <Row
                  description={t("Images you open in a tab (links, “Open image in new tab”, files) show up here instead of the browser's viewer.")}
                  title={t("Open images automatically")}
                >
                  <AutoOpenToggle />
                </Row>
              )}
              <Row description={t("Zoom used when an image is opened.")} title={t("Default zoom")}>
                <Segments
                  k="defaultZoom"
                  options={[
                    { value: "shrink", label: t("Fit if larger") },
                    { value: "fit", label: t("Fit") },
                    { value: "actual", label: "100%" },
                  ]}
                />
              </Row>
              <Row
                description={t("{mod} + wheel and pinch always zoom.", { mod: MOD })}
                title={t("Mouse wheel")}
              >
                <Segments
                  k="wheelBehavior"
                  options={[
                    { value: "zoom", label: t("Zoom") },
                    { value: "scroll", label: t("Scroll") },
                  ]}
                />
              </Row>
              <Row
                description={t("How far each wheel notch, zoom button and zoom key zooms. Hold {alt} or {mod} Shift while scrolling to zoom {times}× faster.", { alt: ALT, mod: MOD, times: FAST_ZOOM })}
                stacked
                title={t("Zoom speed")}
              >
                <LabeledSlider
                  label={t("Speed")}
                  max={3}
                  min={0.25}
                  onChange={(v) => set("zoomSpeed", v)}
                  step={0.25}
                  suffix="×"
                  value={zoomSpeed}
                />
              </Row>
              <Row
                description={t("Otherwise dragging empty space draws a selection box. Space + drag always pans.")}
                title={t("Drag empty space to pan")}
              >
                <Toggle k="panOnEmptyDrag" label={t("Drag empty space to pan")} />
              </Row>
              <Row description={t("Animate zoom, fit and rotation.")} title={t("Smooth animations")}>
                <Toggle k="smoothAnimations" label={t("Smooth animations")} />
              </Row>
              <Row description={t("Show crisp pixels above 300% zoom.")} title={t("Pixel-perfect zoom")}>
                <Toggle k="pixelatedZoom" label={t("Pixel-perfect zoom")} />
              </Row>
              <Row
                description={t("Scan opened images and let you know when a QR code is found.")}
                title={t("Detect QR codes automatically")}
              >
                <Toggle k="autoDetectQr" label={t("Detect QR codes automatically")} />
              </Row>
              <Row description={t("Change the keys for any command.")} title={t("Keyboard shortcuts")}>
                <Button
                  onClick={() => {
                    togglePanel("settings", false);
                    togglePanel("shortcuts", true);
                  }}
                  size="sm"
                  variant="outline"
                >
                  <KeyboardIcon /> {t("Customize…")}
                </Button>
              </Row>
            </TabsContent>

            <TabsContent className="divide-y" value="editing">
              <Row description={t("Used for new drawings and shapes.")} title={t("Default color")}>
                <ColorField
                  label={t("Default color")}
                  onChange={(c) => {
                    set("defaultColor", c);
                    useUi.getState().setStyle({ stroke: c });
                  }}
                  value={defaultColor}
                />
              </Row>
              <Row stacked title={t("Default stroke width")}>
                <LabeledSlider
                  label={t("Width")}
                  max={30}
                  min={1}
                  onChange={(v) => {
                    set("defaultStrokeWidth", v);
                    const ui = useUi.getState();
                    ui.setStyle({ strokeWidth: v * ui.docUnit });
                  }}
                  step={1}
                  suffix="px"
                  value={defaultStrokeWidth}
                />
              </Row>
              <Row description={t("Snap moves and new shapes to a grid.")} title={t("Snap to grid")}>
                <Toggle k="snapToGrid" label={t("Snap to grid")} />
              </Row>
              {snap && (
                <Row stacked title={t("Grid size")}>
                  <LabeledSlider
                    label={t("Size (image px)")}
                    max={100}
                    min={2}
                    onChange={(v) => set("gridSize", v)}
                    step={1}
                    suffix="px"
                    value={gridSize}
                  />
                </Row>
              )}
              <Row
                description={t("Resize and rotate handles on selected objects.")}
                title={t("Show selection handles")}
              >
                <Toggle k="showSelectionHandles" label={t("Show selection handles")} />
              </Row>
              <Row
                description={t("Switch back to Select after creating a shape or text.")}
                title={t("Return to select tool")}
              >
                <Toggle k="returnToSelect" label={t("Return to select tool")} />
              </Row>
              <Row
                description={t("File type used by {mod} S. Other formats stay in Export.", { mod: MOD })}
                title={t("Save format")}
              >
                <Segments
                  k="saveFormat"
                  options={[
                    { value: "png", label: "PNG" },
                    { value: "jpeg", label: "JPEG" },
                    { value: "webp", label: "WebP" },
                  ]}
                />
              </Row>
              <Row
                description={t("Dropping or pasting a picture while an image is open.")}
                title={t("Adding another image")}
              >
                <Segments
                  k="incomingImage"
                  options={[
                    { value: "ask", label: t("Ask") },
                    { value: "layer", label: t("Add on top") },
                    { value: "open", label: t("Open new") },
                  ]}
                />
              </Row>
            </TabsContent>
            <TabsContent className="divide-y" value="sharing">
              <Row
                description={t("Where “Upload image”, Photopea and the image search engines send the image.")}
                title={t("Upload service")}
              >
                <Segments
                  k="uploadProvider"
                  options={[
                    { value: "kappa", label: "kappa.lol" },
                    { value: "imgbb", label: "ImgBB" },
                  ]}
                />
              </Row>
              <Row
                description={t("Only used for ImgBB (kappa.lol needs no key). Stored only in this browser.")}
                stacked
                title={t("ImgBB API key")}
              >
                <ImgbbKeyField />
              </Row>
            </TabsContent>
          </DialogBody>
        </Tabs>
        <DialogFooter className="py-3">
          <Button
            onClick={() => {
              reset();
              toast.info({ title: t("Settings restored to defaults") });
            }}
            size="sm"
            variant="ghost"
          >
            <RotateCcwIcon /> {t("Restore defaults")}
          </Button>
          <Button onClick={() => togglePanel("settings", false)} size="sm">
            {t("Done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
