import { ClipboardPasteIcon, ImageUpIcon, SparklesIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { GitHubMark, REPO_URL } from "@/components/panels/AboutDialog";
import { isExtension } from "@/lib/platform";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { MOD } from "@/components/tools/ToolButton";
import { openFilePicker, openSample, pasteFromClipboard } from "@/lib/actions";
import { comboParts, shortcutKeys } from "@/lib/shortcuts";
import { useSettings } from "@/state/settings";
import { useUi } from "@/state/ui";
import { useT } from "@/lib/i18n";
import { withSlots } from "@/lib/i18n-react";

const STORES = [
  {
    label: "Chrome",
    href: "https://chromewebstore.google.com/detail/betterviewer/llcpfkbjgkpmapiidpnohffjmmnhpmpb",
    icon: "chrome.svg",
  },
  {
    label: "Firefox",
    href: "https://addons.mozilla.org/en-US/firefox/addon/betterviewer/",
    icon: "firefox.svg",
  },
  {
    label: "Edge",
    href: "https://microsoftedge.microsoft.com/addons/detail/betterviewer/jfladbainajdjpmdjpgndbgmkgibeddg",
    icon: "edge.svg",
  },
];

/** Web version only: where to get the extension, and the source. */
function GetTheExtension() {
  const t = useT();
  return (
    <div className="flex w-full flex-col items-center gap-3 pt-1">
      <span className="text-balance text-muted-foreground text-xs">
        {t("Get the extension to open images from any website in BetterViewer")}
      </span>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {STORES.map((s) => (
          <a
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href={s.href}
            key={s.label}
            rel="noopener noreferrer"
            target="_blank"
          >
            <img
              alt=""
              className="size-4"
              draggable={false}
              src={`${import.meta.env.BASE_URL}brands/${s.icon}`}
            />
            {s.label}
          </a>
        ))}
        <a
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          href={REPO_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          <GitHubMark className="size-4" />
          GitHub
        </a>
      </div>
    </div>
  );
}

export function EmptyState() {
  const t = useT();
  const overrides = useSettings((s) => s.shortcuts);
  const paletteKeys = shortcutKeys("commandPalette", overrides)[0];
  const openKeys = shortcutKeys("openImage", overrides)[0];
  const loading = useUi((s) => s.loading);

  return (
    <div className="absolute inset-0 overflow-y-auto">
      {/* Faint grid, fading out from the centre (follows the theme). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 text-foreground/[0.045] [background-image:linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_65%)]"
      />

      {/* Centred when there's room; scrolls (with the footer after it) when there isn't. */}
      <div className="relative flex min-h-full flex-col items-center px-6 pt-6 pb-3">
        <div className="bv-fade-in my-auto flex w-full max-w-lg flex-col items-center py-8 text-center">
          {/* Brand */}
          <img
            alt=""
            className="size-16 drop-shadow-sm"
            draggable={false}
            height={64}
            src="/icon.png"
            width={64}
          />
          <h1 className="mt-4 font-semibold text-3xl tracking-tight">
            BetterViewer
          </h1>
          <p className="mt-2 max-w-sm text-balance text-muted-foreground">
            {t("Fast, Simple, Easy image viewer.")}
          </p>

          {/* Drop zone */}
          <button
            className="group mt-9 flex w-full flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-border bg-card/60 px-6 py-10 transition-colors hover:border-brand/70 hover:bg-brand/[0.04] focus-visible:border-brand focus-visible:outline-none disabled:pointer-events-none"
            disabled={loading}
            onClick={openFilePicker}
            type="button"
          >
            {loading ? (
              <>
                <Spinner className="size-8 text-brand" />
                <span className="font-medium text-muted-foreground">
                  {t("Opening image…")}
                </span>
              </>
            ) : (
              <>
                <span className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20 transition-all group-hover:-translate-y-0.5 group-hover:bg-brand group-hover:text-white group-hover:ring-brand">
                  <ImageUpIcon className="size-7" />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-semibold text-base">
                    {t("Drop an image here")}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {withSlots(t("or {browse}"), {
                      browse: (
                        <span className="font-medium text-brand underline-offset-4 group-hover:underline">
                          {t("browse your files")}
                        </span>
                      ),
                    })}
                  </span>
                </span>
              </>
            )}
          </button>

          {/* Other ways in */}
          <div className="mt-3 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              className="justify-between"
              disabled={loading}
              onClick={pasteFromClipboard}
              variant="outline"
            >
              <span className="flex items-center gap-2">
                <ClipboardPasteIcon /> {t("Paste image")}
              </span>
              <KbdGroup>
                <Kbd>{MOD}</Kbd>
                <Kbd>V</Kbd>
              </KbdGroup>
            </Button>
            <Button
              className="justify-between"
              disabled={loading}
              onClick={openSample}
              variant="outline"
            >
              <span className="flex items-center gap-2">
                <SparklesIcon /> {t("Try a sample")}
              </span>
              <span className="text-muted-foreground text-xs">{t("Demo image")}</span>
            </Button>
          </div>

          {paletteKeys && openKeys && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5 text-muted-foreground text-xs">
              {withSlots(t("Press {palette} for every command, or {open} to open a file"), {
                palette: (
                  <KbdGroup>
                    {comboParts(paletteKeys).map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </KbdGroup>
                ),
                open: (
                  <KbdGroup>
                    {comboParts(openKeys).map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </KbdGroup>
                ),
              })}
            </div>
          )}

          {!isExtension && <GetTheExtension />}
        </div>

        <button
          className="shrink-0 rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
          onClick={() => useUi.getState().togglePanel("about", true)}
          type="button"
        >
          {t("About BetterViewer")} · v{__APP_VERSION__}
        </button>
      </div>
    </div>
  );
}

export function DropOverlay({ active }: { active: boolean }) {
  const t = useT();
  return (
    <div
      aria-hidden={!active}
      className={`pointer-events-none absolute inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div
        className={`relative flex size-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-brand bg-brand/8 transition-transform duration-200 ${
          active ? "scale-100" : "scale-[0.98]"
        }`}
      >
        <span className="flex size-16 items-center justify-center rounded-2xl bg-brand text-white">
          <ImageUpIcon className="size-8" />
        </span>
        <span className="font-medium text-lg text-white">{t("Drop to open")}</span>
      </div>
    </div>
  );
}
