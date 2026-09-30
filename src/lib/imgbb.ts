import { getSettings } from "@/state/settings";
import { t, tk } from "@/lib/i18n";

export interface ImgbbUpload {
  id: string;
  /** Share page on ibb.co. */
  viewerUrl: string;
  /** Direct image link. */
  url: string;
  displayUrl: string;
  thumbUrl: string;
  /** Anyone with this link can delete the image. */
  deleteUrl: string;
  width: number;
  height: number;
  size: number;
  /** Seconds until the image expires (0 = never). */
  expiration: number;
}

export const EXPIRY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: tk("Never") },
  { value: 60 * 60, label: tk("1 hour") },
  { value: 60 * 60 * 24, label: tk("1 day") },
  { value: 60 * 60 * 24 * 7, label: tk("1 week") },
  { value: 60 * 60 * 24 * 30, label: tk("1 month") },
];

/** API key from Settings, falling back to the built-in default (VITE_IMGBB_API_KEY). */
export const getImgbbKey = () =>
  getSettings().imgbbApiKey.trim() || (import.meta.env.VITE_IMGBB_API_KEY as string | undefined)?.trim() || "";

interface ImgbbResponse {
  success?: boolean;
  status?: number;
  error?: { message?: string; code?: number };
  data?: {
    id: string;
    url_viewer: string;
    url: string;
    display_url: string;
    delete_url: string;
    width: string | number;
    height: string | number;
    size: string | number;
    expiration: string | number;
    thumb?: { url: string };
  };
}

/**
 * Upload an image to ImgBB. The file is sent as binary form data (smaller
 * than base64). `expiration` is in seconds (60 – 15 552 000), 0 = never.
 */
export async function uploadToImgbb(
  image: Blob,
  { expiration = 0, name }: { expiration?: number; name?: string } = {}
): Promise<ImgbbUpload> {
  const key = getImgbbKey();
  if (!key) throw new Error(t("Add your ImgBB API key in Settings → Sharing."));

  const params = new URLSearchParams({ key });
  if (expiration > 0) params.set("expiration", String(expiration));

  const form = new FormData();
  form.append("image", image, name ?? "image");
  if (name) form.append("name", name);

  let res: Response;
  try {
    res = await fetch(`https://api.imgbb.com/1/upload?${params}`, { method: "POST", body: form });
  } catch {
    throw new Error(t("Couldn't reach ImgBB. Check your connection and try again."));
  }

  const json = (await res.json().catch(() => ({}))) as ImgbbResponse;
  if (!res.ok || !json.success || !json.data) {
    const msg = json.error?.message ?? `Upload failed (HTTP ${res.status}).`;
    if (res.status === 400 && /key/i.test(msg)) throw new Error(t("ImgBB rejected the API key. Check it in Settings → Sharing."));
    throw new Error(msg);
  }

  const d = json.data;
  return {
    id: d.id,
    viewerUrl: d.url_viewer,
    url: d.url,
    displayUrl: d.display_url,
    thumbUrl: d.thumb?.url ?? d.display_url,
    deleteUrl: d.delete_url,
    width: Number(d.width),
    height: Number(d.height),
    size: Number(d.size),
    expiration: Number(d.expiration) || 0,
  };
}
