import { useEffect } from "react";
import { openColorPicker } from "@/components/tools/ColorPicker";
import { applyCrop, cancelCrop, startCrop } from "@/components/tools/CropTool";
import {
  copyImageToClipboard,
  deleteSelected,
  duplicateSelected,
  exportImage,
  flipHorizontal,
  flipVertical,
  nudgeSelected,
  receiveImage,
  openFilePicker,
  redo,
  reorderSelected,
  rotate,
  selectAll,
  undo,
  zoomActual,
  zoomFit,
  zoomIn,
  zoomOut,
  zoomToSelection,
} from "@/lib/actions";
import { isSupportedImageType } from "@/lib/image";
import { applyStraighten, cancelStraighten } from "@/lib/straighten";
import { toggleRulers } from "@/components/tools/MeasureTool";
import { getDoc } from "@/state/document";
import { scanCurrentImage } from "@/state/qr";
import { getUi, useUi } from "@/state/ui";
import { getSettings, useSettings } from "@/state/settings";

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  if (!el) return false;
  return (
    el.isContentEditable ||
    el.tagName === "TEXTAREA" ||
    (el.tagName === "INPUT" &&
      !["checkbox", "radio", "range", "button"].includes((el as HTMLInputElement).type))
  );
};

/** True while an overlay (dialog / menu / popover) owns the keyboard. */
const overlayOpen = () =>
  !!document.querySelector(
    '[data-scope="dialog"][data-part="content"][data-state="open"], [data-scope="menu"][data-part="content"][data-state="open"], [data-scope="popover"][data-part="content"][data-state="open"]'
  );

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const ui = getUi();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const hasDoc = !!getDoc();

      // Global (work without an image)
      if (mod && key === "k") {
        e.preventDefault();
        ui.togglePanel("command");
        return;
      }
      if (mod && key === "o") {
        e.preventDefault();
        openFilePicker();
        return;
      }
      if (mod && e.key === ",") {
        e.preventDefault();
        ui.togglePanel("settings", true);
        return;
      }
      if (e.key === "?" && !overlayOpen()) {
        ui.togglePanel("shortcuts");
        return;
      }
      if (!hasDoc || overlayOpen()) return;

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        if (!ui.spaceHeld) ui.set({ spaceHeld: true });
        return;
      }

      if (mod && e.altKey && key === "i") {
        e.preventDefault();
        ui.togglePanel("resize", true);
        return;
      }

      if (mod) {
        switch (key) {
          case "z":
            e.preventDefault();
            if (e.shiftKey) redo();
            else undo();
            return;
          case "y":
            e.preventDefault();
            redo();
            return;
          case "=":
          case "+":
            e.preventDefault();
            zoomIn();
            return;
          case "-":
          case "_":
            e.preventDefault();
            zoomOut();
            return;
          case "0":
            e.preventDefault();
            zoomFit();
            return;
          case "1":
            e.preventDefault();
            zoomActual();
            return;
          case "d":
            e.preventDefault();
            duplicateSelected();
            return;
          case "a":
            e.preventDefault();
            selectAll();
            return;
          case "s":
            e.preventDefault();
            exportImage("png");
            return;
          case "c":
            if (e.shiftKey) {
              e.preventDefault();
              copyImageToClipboard();
            }
            return;
        }
        return;
      }
      if (e.altKey) return;

      // Straighten mode keys
      if (ui.tool === "straighten") {
        if (e.key === "Enter") {
          e.preventDefault();
          void applyStraighten();
          return;
        }
        if (e.key === "Escape") {
          cancelStraighten();
          return;
        }
      }

      // Crop mode keys
      if (ui.tool === "crop") {
        if (e.key === "Enter") {
          e.preventDefault();
          applyCrop();
          return;
        }
        if (e.key === "Escape") {
          cancelCrop();
          return;
        }
      }

      switch (e.key) {
        case "Escape":
          if (ui.selectedIds.length) ui.select([]);
          else if (ui.tool !== "select") ui.setTool("select");
          ui.set({ compareOriginal: false });
          return;
        case "Delete":
        case "Backspace":
          if (deleteSelected()) e.preventDefault();
          return;
        case "ArrowLeft":
        case "ArrowRight":
        case "ArrowUp":
        case "ArrowDown": {
          const step = (e.shiftKey ? 10 : 1) * ui.docUnit;
          const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
          if (nudgeSelected(dx, dy)) e.preventDefault();
          return;
        }
        case "]":
          reorderSelected(e.shiftKey ? "forward" : "front");
          return;
        case "[":
          reorderSelected(e.shiftKey ? "backward" : "back");
          return;
        case "Tab": {
          e.preventDefault();
          const s = getSettings();
          s.set("showToolbar", !s.showToolbar);
          return;
        }
      }

      switch (key) {
        case "v":
          if (e.shiftKey) flipVertical();
          else ui.setTool("select");
          return;
        case "h":
          if (e.shiftKey) flipHorizontal();
          else ui.setTool("pan");
          return;
        case "p":
          ui.setDrawMode(e.shiftKey ? "highlighter" : "pen");
          return;
        case "b":
          ui.setDrawMode("pen");
          return;
        case "e":
          ui.setDrawMode("eraser");
          return;
        case "s":
          ui.setShapeKind("rect");
          return;
        case "o":
          ui.setShapeKind("ellipse");
          return;
        case "l":
          if (e.shiftKey) ui.togglePanel("layers");
          else ui.setShapeKind("line");
          return;
        case "n":
          ui.setShapeKind("counter");
          return;
        case "m":
          ui.setTool("redact");
          return;
        case "g":
          ui.setTool("spotlight");
          return;
        case "u":
          if (e.shiftKey) toggleRulers();
          else ui.setTool("measure");
          return;
        case "a":
          ui.setShapeKind("arrow");
          return;
        case "t":
          ui.setTool("text");
          return;
        case "i":
          openColorPicker();
          return;
        case "c":
          if (e.shiftKey) ui.togglePanel("curves");
          else startCrop();
          return;
        case "f":
          ui.togglePanel("adjust");
          return;
        case "q":
          scanCurrentImage({ reveal: true });
          return;
        case "r":
          rotate(e.shiftKey ? -1 : 1);
          return;
        case "0":
          zoomFit();
          return;
        case "1":
          zoomActual();
          return;
        case "2":
          zoomToSelection();
          return;
        case "+":
        case "=":
          zoomIn();
          return;
        case "-":
          zoomOut();
          return;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && getUi().spaceHeld) getUi().set({ spaceHeld: false });
    };
    const onBlur = () => getUi().set({ spaceHeld: false, compareOriginal: false });

    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const file = items.find((i) => isSupportedImageType(i.type))?.getAsFile();
      if (file) {
        e.preventDefault();
        const name = file.name && file.name !== "image.png" ? file.name : "Pasted image.png";
        void receiveImage(file, name);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("paste", onPaste);
    };
  }, []);
}

/** Apply the theme setting to <html>. */
export function useTheme() {
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
}

/** Hide chrome after inactivity when "auto-hide" is enabled. */
export function useAutoHideChrome() {
  const autoHide = useSettings((s) => s.autoHideUi);
  useEffect(() => {
    if (!autoHide) {
      useUi.setState({ chromeVisible: true });
      return;
    }
    let timer = 0;
    const busy = () => {
      const ui = getUi();
      return (
        ui.tool !== "select" ||
        ui.selectedIds.length > 0 ||
        Object.values(ui.panels).some(Boolean) ||
        !!document.querySelector('[data-part="content"][data-state="open"]') ||
        !!document.querySelector("[data-chrome]:hover")
      );
    };
    const wake = () => {
      if (!getUi().chromeVisible) useUi.setState({ chromeVisible: true });
      window.clearTimeout(timer);
      timer = window.setTimeout(function check() {
        if (busy()) {
          timer = window.setTimeout(check, 1500);
          return;
        }
        useUi.setState({ chromeVisible: false });
      }, 2600);
    };
    wake();
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [autoHide]);
}
