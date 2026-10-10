import { getCurrentWindow } from "@tauri-apps/api/window";
import type React from "react";
import { useEffect, useState } from "react";
import { useGallery } from "@/lib/gallery";
import { isDesktop } from "@/lib/platform";
import { cn } from "@/lib/utils";
import { useDoc } from "@/state/document";
import { useT } from "@/lib/i18n";

/** Height of the bar; also `--titlebar-h`, which dialogs and panels keep clear of. */
const HEIGHT = 36;

const appWindow = isDesktop ? getCurrentWindow() : null;

/** Windows 11 caption glyphs: thin 10 px strokes. */
function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg aria-hidden className="size-2.5" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 10 10">
      {children}
    </svg>
  );
}

function CaptionButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "flex h-full w-[46px] items-center justify-center text-foreground/80 transition-colors duration-100",
        danger ? "hover:bg-[#c42b1c] hover:text-white active:bg-[#c42b1c]/85" : "hover:bg-foreground/8 active:bg-foreground/5"
      )}
      onClick={onClick}
      tabIndex={-1}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

/**
 * Desktop app: the window's title bar (the system one is turned off in
 * src-tauri/tauri.conf.json). Drag it to move the window, double-click to
 * maximize. Hidden in full screen (F11).
 */
export function TitleBar() {
  const t = useT();
  const name = useDoc((s) => s.doc?.image.name);
  const position = useGallery((s) => (s.items.length > 1 && s.index >= 0 ? `${s.index + 1} / ${s.items.length}` : null));
  const [maximized, setMaximized] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!appWindow) return;
    const update = async () => {
      setMaximized(await appWindow.isMaximized());
      setFullscreen(await appWindow.isFullscreen());
    };
    void update();
    const unlisten = appWindow.onResized(() => void update());
    return () => void unlisten.then((stop) => stop());
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--titlebar-h", `${fullscreen ? 0 : HEIGHT}px`);
  }, [fullscreen]);

  if (!appWindow || fullscreen) return null;

  return (
    <header
      className="relative z-[60] flex shrink-0 select-none items-center bg-background text-foreground"
      data-tauri-drag-region
      style={{ height: HEIGHT }}
    >
      {/* Not a drag target itself: the bar under it is. */}
      <div className="pointer-events-none flex min-w-0 flex-1 items-center gap-2.5 ps-3 text-xs">
        <img alt="" className="size-4 shrink-0" draggable={false} src={`${import.meta.env.BASE_URL}favicon-32.png`} />
        <span className="truncate font-medium text-foreground/90">{name ?? "BetterViewer"}</span>
        {position && <span className="shrink-0 text-muted-foreground tabular-nums">{position}</span>}
      </div>
      <div className="flex h-full shrink-0" dir="ltr">
        <CaptionButton label={t("Minimize")} onClick={() => void appWindow.minimize()}>
          <Glyph>
            <path d="M0 5.5h10" />
          </Glyph>
        </CaptionButton>
        <CaptionButton label={maximized ? t("Restore") : t("Maximize")} onClick={() => void appWindow.toggleMaximize()}>
          <Glyph>
            {maximized ? (
              <>
                <rect height="7" rx="1" width="7" x="0.5" y="2.5" />
                <path d="M2.5 2.5v-.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-.5" />
              </>
            ) : (
              <rect height="9" rx="1" width="9" x="0.5" y="0.5" />
            )}
          </Glyph>
        </CaptionButton>
        <CaptionButton danger label={t("Close")} onClick={() => void appWindow.close()}>
          <Glyph>
            <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" />
          </Glyph>
        </CaptionButton>
      </div>
    </header>
  );
}

/** Desktop: F11 toggles full screen (which hides the title bar). */
export function toggleFullscreen() {
  if (!appWindow) return;
  void appWindow.isFullscreen().then((on) => appWindow.setFullscreen(!on));
}
