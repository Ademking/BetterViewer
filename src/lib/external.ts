import { toast } from "@/components/ui/toast";
import { renderDocument } from "@/lib/actions";
import { baseName } from "@/lib/image";
import { getUsableProvider } from "@/lib/upload";
import { getDoc, hasEdits, useDoc } from "@/state/document";
import { getUi } from "@/state/ui";

/**
 * External sites that take an image by URL. The image is uploaded as a
 * temporary copy (deleted after 10 minutes) and the site is opened with it.
 */
interface ExternalTarget {
  name: string;
  buildUrl: (imageUrl: string) => string;
  /** Reverse image search: an unedited web image is sent by its own address. */
  search?: boolean;
}

const TARGETS = {
  photopea: {
    name: "Photopea",
    buildUrl: (u) => `https://www.photopea.com#${encodeURI(JSON.stringify({ files: [u] }))}`,
  },
  googleLens: {
    name: "Google Lens",
    buildUrl: (u) => `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(u)}`,
    search: true,
  },
  bing: {
    name: "Bing",
    buildUrl: (u) => `https://www.bing.com/images/searchbyimage?cbir=sbi&imgurl=${encodeURIComponent(u)}`,
    search: true,
  },
  yandex: {
    name: "Yandex",
    buildUrl: (u) => `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(u)}`,
    search: true,
  },
  tineye: {
    name: "TinEye",
    buildUrl: (u) => `https://www.tineye.com/search/?url=${encodeURIComponent(u)}`,
    search: true,
  },
} satisfies Record<string, ExternalTarget>;

export type ExternalTargetId = keyof typeof TARGETS;

/** Reverse image search engines, in menu order. */
export const SEARCH_ENGINES = (Object.keys(TARGETS) as ExternalTargetId[])
  .filter((id) => (TARGETS[id] as ExternalTarget).search)
  .map((id) => ({ id, name: TARGETS[id].name }));

/** The site only needs to fetch the file once; the copy is removed after this. */
const TEMP_EXPIRATION = 10 * 60;

const pendingHtml = (name: string) => `<!doctype html><title>Opening in ${name}…</title>
<body style="margin:0;height:100vh;display:grid;place-items:center;background:#0a0a0a;color:#d4d4d4;font:14px system-ui,sans-serif">
<div>Preparing image for ${name}…</div></body>`;

let busy = false;

/**
 * Export the edited image, upload a temporary copy and open it on
 * an external site. The tab is opened synchronously (inside the click) so
 * popup blockers allow it, then redirected once the upload finishes.
 */
export async function openExternally(id: ExternalTargetId) {
  const target: ExternalTarget = TARGETS[id];
  const doc = getDoc();
  if (!doc || busy) return;

  // Unedited image from the web: search engines can fetch it themselves, so
  // nothing needs uploading.
  const sourceUrl = useDoc.getState().original?.sourceUrl;
  if (target.search && sourceUrl && /^https?:/i.test(sourceUrl) && !hasEdits(useDoc.getState())) {
    window.open(target.buildUrl(sourceUrl), "_blank", "noopener,noreferrer");
    return;
  }

  const provider = getUsableProvider();
  const unavailable = provider.unavailableReason();
  if (unavailable) {
    toast.error({
      title: `Can't open in ${target.name}`,
      description: unavailable,
      action: { label: "Settings", onClick: () => getUi().togglePanel("settings", true) },
    });
    return;
  }

  const tab = window.open("", "_blank");
  if (tab) {
    tab.opener = null;
    tab.document.write(pendingHtml(target.name));
    tab.document.close();
  }

  busy = true;
  const toastId = toast.create({
    type: "loading",
    title: `Opening in ${target.name}…`,
    description: `Uploading a temporary copy to ${provider.label} (deleted after 10 minutes).`,
    duration: Number.POSITIVE_INFINITY,
    closable: false,
  });

  try {
    const blob = await renderDocument("png");
    const upload = await provider.upload(blob, {
      expiration: TEMP_EXPIRATION,
      name: baseName(doc.image.name),
    });
    // Providers without expiry: remove the copy ourselves (best effort: only
    // while BetterViewer stays open).
    if (!provider.supportsExpiry && upload.deleteNow) {
      const remove = upload.deleteNow;
      setTimeout(() => void remove().catch(() => undefined), TEMP_EXPIRATION * 1000);
    }
    const url = target.buildUrl(upload.directUrl);

    if (tab && !tab.closed) {
      tab.location.replace(url);
      toast.update(toastId, {
        type: "success",
        title: `Opened in ${target.name}`,
        description: "Check the new tab.",
        duration: 4000,
        closable: true,
      });
    } else {
      // Popup blocked or closed: let the user open it from a click.
      toast.update(toastId, {
        type: "info",
        title: `Image ready for ${target.name}`,
        description: "Your browser blocked the new tab.",
        duration: 20000,
        closable: true,
        action: { label: "Open", onClick: () => window.open(url, "_blank", "noopener,noreferrer") },
      });
    }
  } catch (err) {
    if (tab && !tab.closed) tab.close();
    toast.update(toastId, {
      type: "error",
      title: `Couldn't open in ${target.name}`,
      description: (err as Error).message,
      duration: 6000,
      closable: true,
    });
  } finally {
    busy = false;
  }
}

export const openInPhotopea = () => openExternally("photopea");
export const searchImage = (id: ExternalTargetId) => openExternally(id);
