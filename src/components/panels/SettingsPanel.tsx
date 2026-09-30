import {
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
import { MOD } from "@/components/tools/ToolButton";
import { cn } from "@/lib/utils";
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

function Toggle<K extends keyof Settings>({ k }: { k: K }) {
  const value = useSettings((s) => s[k]) as boolean;
  const set = useSettings((s) => s.set);
  return (
    <Switch
      aria-label={String(k)}
      checked={value}
      onCheckedChange={(d) => set(k, d.checked as Settings[K])}
    />
  );
}

/** Extension only: lives in extension storage, read by the content script. */
function AutoOpenToggle() {
  const [value, setValue] = useState<boolean | null>(null);
  useEffect(() => {
    getAutoOpen().then(setValue, () => setValue(true));
  }, []);
  return (
    <Switch
      aria-label="Open images automatically"
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

export const BOARD_OPTIONS: { value: BoardBackground; label: string; preview: string }[] = [
  { value: "blur", label: "Blurred image", preview: "" },
  { value: "black", label: "Black", preview: "bg-black" },
  { value: "white", label: "White", preview: "bg-white" },
  { value: "grid", label: "Transparent grid", preview: "checkerboard" },
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

function BoardPicker() {
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
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}

function ImgbbKeyField() {
  const key = useSettings((s) => s.imgbbApiKey);
  const set = useSettings((s) => s.set);
  const hasDefault = !!(import.meta.env.VITE_IMGBB_API_KEY as string | undefined);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          aria-label="ImgBB API key"
          autoComplete="off"
          className="flex-1 font-mono"
          onChange={(e) => set("imgbbApiKey", e.target.value.trim())}
          placeholder={hasDefault ? "Optional: paste your own key" : "Paste your API key"}
          size="sm"
          spellCheck={false}
          type="password"
          value={key}
        />
        {key && (
          <Button onClick={() => set("imgbbApiKey", "")} size="sm" variant="ghost">
            Clear
          </Button>
        )}
      </div>
      <span className="text-muted-foreground text-xs">
        {hasDefault && !key && "If you don't add a key, BetterViewer uses its default one. "}
        {hasDefault && key && "Using your key. Clear it to go back to BetterViewer's default one. "}
        Get {hasDefault ? "your own" : "a"} free key at{" "}
        <a
          className="text-foreground underline underline-offset-2"
          href="https://api.imgbb.com/"
          rel="noreferrer noopener"
          target="_blank"
        >
          api.imgbb.com
        </a>
        .
      </span>
    </div>
  );
}

export function SettingsPanel() {
  const open = useUi((s) => s.panels.settings);
  const togglePanel = useUi((s) => s.togglePanel);
  const defaultColor = useSettings((s) => s.defaultColor);
  const defaultStrokeWidth = useSettings((s) => s.defaultStrokeWidth);
  const gridSize = useSettings((s) => s.gridSize);
  const snap = useSettings((s) => s.snapToGrid);
  const set = useSettings((s) => s.set);
  const reset = useSettings((s) => s.reset);

  return (
    <Dialog onOpenChange={(d) => togglePanel("settings", d.open)} open={open}>
      <DialogContent className="glass max-h-[min(640px,calc(100svh-2rem))]" size="lg">
        <DialogHeader description="Preferences are saved on this device." title="Settings" />
        <Tabs className="min-h-0 flex-1" defaultValue="appearance">
          <div className="px-6">
            <TabsList className="w-full">
              <TabsTrigger value="appearance">
                <PaletteIcon /> Appearance
              </TabsTrigger>
              <TabsTrigger value="viewer">
                <MousePointerClickIcon /> Viewer
              </TabsTrigger>
              <TabsTrigger value="editing">
                <PenLineIcon /> Editing
              </TabsTrigger>
              <TabsTrigger value="sharing">
                <Share2Icon /> Sharing
              </TabsTrigger>
            </TabsList>
          </div>
          <DialogBody className="pt-2">
            <TabsContent className="divide-y" value="appearance">
              <Row
                description="What's shown behind the image."
                stacked
                title="Board background"
              >
                <BoardPicker />
              </Row>
              <Row title="Theme">
                <Segments
                  k="theme"
                  options={[
                    { value: "dark", label: "Dark", icon: <MoonIcon /> },
                    { value: "light", label: "Light", icon: <SunIcon /> },
                    { value: "system", label: "System", icon: <MonitorIcon /> },
                  ]}
                />
              </Row>
              <Row description="The floating tool bar at the bottom." title="Show toolbar">
                <Toggle k="showToolbar" />
              </Row>
              <Row description="Tooltips with names and shortcuts." title="Show hints">
                <Toggle k="showHints" />
              </Row>
              <Row
                description="Fade the interface after a few seconds of inactivity."
                title="Auto-hide interface"
              >
                <Toggle k="autoHideUi" />
              </Row>
              <Row title="Show scrollbars">
                <Toggle k="showScrollbars" />
              </Row>
              <Row
                description="A small overview of the image while it doesn't fit in the window. Click or drag it to move around."
                title="Show navigator"
              >
                <Toggle k="showNavigator" />
              </Row>
            </TabsContent>

            <TabsContent className="divide-y" value="viewer">
              {isExtension && (
                <Row
                  description="Images you open in a tab (links, “Open image in new tab”, files) show up here instead of the browser's viewer."
                  title="Open images automatically"
                >
                  <AutoOpenToggle />
                </Row>
              )}
              <Row description="Zoom used when an image is opened." title="Default zoom">
                <Segments
                  k="defaultZoom"
                  options={[
                    { value: "shrink", label: "Fit if larger" },
                    { value: "fit", label: "Fit" },
                    { value: "actual", label: "100%" },
                  ]}
                />
              </Row>
              <Row
                description={`${MOD} + wheel and pinch always zoom.`}
                title="Mouse wheel"
              >
                <Segments
                  k="wheelBehavior"
                  options={[
                    { value: "zoom", label: "Zoom" },
                    { value: "scroll", label: "Scroll" },
                  ]}
                />
              </Row>
              <Row
                description="Otherwise dragging empty space draws a selection box. Space + drag always pans."
                title="Drag empty space to pan"
              >
                <Toggle k="panOnEmptyDrag" />
              </Row>
              <Row description="Animate zoom, fit and rotation." title="Smooth animations">
                <Toggle k="smoothAnimations" />
              </Row>
              <Row description="Show crisp pixels above 300% zoom." title="Pixel-perfect zoom">
                <Toggle k="pixelatedZoom" />
              </Row>
              <Row
                description="Scan opened images and let you know when a QR code is found."
                title="Detect QR codes automatically"
              >
                <Toggle k="autoDetectQr" />
              </Row>
            </TabsContent>

            <TabsContent className="divide-y" value="editing">
              <Row description="Used for new drawings and shapes." title="Default color">
                <ColorField
                  label="Default color"
                  onChange={(c) => {
                    set("defaultColor", c);
                    useUi.getState().setStyle({ stroke: c });
                  }}
                  value={defaultColor}
                />
              </Row>
              <Row stacked title="Default stroke width">
                <LabeledSlider
                  label="Width"
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
              <Row description="Snap moves and new shapes to a grid." title="Snap to grid">
                <Toggle k="snapToGrid" />
              </Row>
              {snap && (
                <Row stacked title="Grid size">
                  <LabeledSlider
                    label="Size (image px)"
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
                description="Resize and rotate handles on selected objects."
                title="Show selection handles"
              >
                <Toggle k="showSelectionHandles" />
              </Row>
              <Row
                description="Switch back to Select after creating a shape or text."
                title="Return to select tool"
              >
                <Toggle k="returnToSelect" />
              </Row>
              <Row
                description={`File type used by ${MOD} S. Other formats stay in Export.`}
                title="Save format"
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
                description="Dropping or pasting a picture while an image is open."
                title="Adding another image"
              >
                <Segments
                  k="incomingImage"
                  options={[
                    { value: "ask", label: "Ask" },
                    { value: "layer", label: "Add on top" },
                    { value: "open", label: "Open new" },
                  ]}
                />
              </Row>
            </TabsContent>
            <TabsContent className="divide-y" value="sharing">
              <Row
                description="Where “Upload image”, Photopea and the image search engines send the image."
                title="Upload service"
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
                description="Only used for ImgBB (kappa.lol needs no key). Stored only in this browser."
                stacked
                title="ImgBB API key"
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
              toast.info({ title: "Settings restored to defaults" });
            }}
            size="sm"
            variant="ghost"
          >
            <RotateCcwIcon /> Restore defaults
          </Button>
          <Button onClick={() => togglePanel("settings", false)} size="sm">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
