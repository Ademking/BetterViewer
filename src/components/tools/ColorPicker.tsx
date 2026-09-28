import { CopyIcon, PaletteIcon, PipetteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScreenFloatingPanel } from "@/components/panels/FloatingPanel";
import { ColorPanel } from "@/components/tools/ColorField";
import { Hinted, ToolButton } from "@/components/tools/ToolButton";
import { applyColor, copyText } from "@/lib/actions";
import { hexToRgb, rgbToHsl } from "@/lib/colors";
import { getUi, useUi } from "@/state/ui";

/** Open the color panel and start picking from the image right away. */
export function openColorPicker() {
  const ui = getUi();
  ui.togglePanel("color", true);
  ui.setTool("eyedropper");
}

/** Close the color panel and stop picking. */
export function closeColorPicker() {
  const ui = getUi();
  ui.togglePanel("color", false);
  if (ui.tool === "eyedropper") ui.setTool("select");
}

/** Toolbar button: toggles the color tool (panel + eyedropper). */
export function ColorPickerTool() {
  const open = useUi((s) => s.panels.color);
  const picking = useUi((s) => s.tool === "eyedropper");

  return (
    <ToolButton
      active={open || picking}
      label="Color picker"
      onClick={() => (open ? closeColorPicker() : openColorPicker())}
      shortcut="I"
    >
      <PipetteIcon />
    </ToolButton>
  );
}

/**
 * Floating color panel: active color, pick from the image (eyedropper),
 * manual selection, and copyable HEX / RGB / HSL values. It stays open while
 * picking so values can be copied right after.
 */
export function ColorPickerPanel() {
  const open = useUi((s) => s.panels.color);
  const togglePanel = useUi((s) => s.togglePanel);
  const color = useUi((s) => s.style.stroke);
  const tool = useUi((s) => s.tool);
  const recent = useUi((s) => s.recentColors);
  const setTool = useUi((s) => s.setTool);
  const picking = tool === "eyedropper";

  const hex = color.slice(0, 7).toUpperCase();
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const formats = [
    { label: "HEX", value: hex },
    { label: "RGB", value: `rgb(${r}, ${g}, ${b})` },
    { label: "HSL", value: `hsl(${h}, ${s}%, ${l}%)` },
  ];

  return (
    <ScreenFloatingPanel
      bodyClassName="gap-3"
      icon={<PaletteIcon />}
      // Docked right, clear of the centred toolbar.
      initialPosition={(vp, size) => ({ x: vp.width - size.width - 16, y: 60 })}
      initialSize={{ width: 292, height: 560 }}
      minSize={{ width: 260, height: 220 }}
      onOpenChange={(o) => (o ? togglePanel("color", true) : closeColorPicker())}
      open={open}
      title="Color"
    >
      <div className="flex items-center gap-3">
        <div
          className="size-12 shrink-0 rounded-xl border border-white/10 shadow-inner"
          style={{ background: color }}
        />
        <div className="min-w-0 flex-1">
          <div className="font-mono font-semibold text-sm">{hex}</div>
          <div className="text-muted-foreground text-xs">Drawing color</div>
        </div>
        <Button
          onClick={() => setTool(picking ? "select" : "eyedropper")}
          size="sm"
          variant={picking ? "default" : "outline"}
        >
          <PipetteIcon /> {picking ? "Picking…" : "Pick"}
        </Button>
      </div>

      <div className="grid gap-1">
        {formats.map((f) => (
          <button
            className="group flex items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-accent"
            key={f.label}
            onClick={() => copyText(f.value)}
            type="button"
          >
            <span className="w-8 font-medium text-muted-foreground">{f.label}</span>
            <span className="flex-1 truncate font-mono">{f.value}</span>
            <CopyIcon className="size-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
          </button>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs">Picked from image</span>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((c) => (
              <Hinted key={c} label={c.toUpperCase()}>
                <button
                  aria-label={`Use ${c}`}
                  className="size-6 rounded-md border border-white/15 transition-transform hover:scale-110"
                  onClick={() => applyColor(c)}
                  style={{ background: c }}
                  type="button"
                />
              </Hinted>
            ))}
          </div>
        </div>
      )}

      <Separator />
      <ColorPanel className="w-full" onChange={(c) => applyColor(c)} value={color} />
    </ScreenFloatingPanel>
  );
}
