import { StarIcon } from "lucide-react";
import { Dialog, DialogBody, DialogContent } from "@/components/ui/dialog";
import { useUi } from "@/state/ui";

export const REPO_URL = "https://github.com/Ademking/BetterViewer";
const AUTHOR_URL = "https://github.com/Ademking";

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3" />
    </svg>
  );
}

/** About BetterViewer: version, what it is, where to star it, who made it. */
export function AboutDialog() {
  const open = useUi((s) => s.panels.about);
  const togglePanel = useUi((s) => s.togglePanel);
  return (
    <Dialog onOpenChange={(d) => togglePanel("about", d.open)} open={open}>
      <DialogContent aria-label="About BetterViewer" className="glass" size="sm">
        <DialogBody>
          <div className="flex flex-col items-center px-2 pt-4 pb-2 text-center">
            <img alt="" className="size-20" draggable={false} height={80} src="/icon.png" width={80} />
            <div className="mt-4 flex items-center gap-2">
              <h2 className="font-semibold text-2xl tracking-tight">BetterViewer</h2>
              <span className="rounded-full bg-brand/15 px-2 py-0.5 font-medium text-brand text-xs tabular-nums">
                v{__APP_VERSION__}
              </span>
            </div>
            <p className="mt-1 font-medium text-muted-foreground text-sm">Fast, simple &amp; easy image viewer</p>

            <p className="mt-5 max-w-sm text-pretty text-sm leading-relaxed">
              BetterViewer makes viewing images faster, easier and more fun. It's designed as a better
              alternative to your browser's built-in image viewer.
            </p>

            <div className="mt-6 flex w-full flex-col items-center gap-3 rounded-xl border bg-muted/40 p-4">
              <p className="text-balance text-muted-foreground text-sm">
                Find BetterViewer useful? Don't forget to leave a star!
              </p>
              <a
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 font-medium text-sm text-white transition-colors hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
                href={REPO_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                <StarIcon className="size-4" /> Star on GitHub
              </a>
              <a
                className="inline-flex max-w-full items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
                href={REPO_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                <GitHubMark className="size-3.5 shrink-0" />
                <span className="truncate">github.com/Ademking/BetterViewer</span>
              </a>
            </div>

            <p className="mt-6 text-muted-foreground text-sm">
              Created with ❤️🍪 by{" "}
              <a
                className="font-medium text-foreground underline-offset-4 hover:underline"
                href={AUTHOR_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                Adem Kouki
              </a>
            </p>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
