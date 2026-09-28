import { getImgbbKey, uploadToImgbb } from "@/lib/imgbb";
import { deleteFromKappa, uploadToKappa } from "@/lib/kappa";
import { getSettings, type UploadProviderId } from "@/state/settings";

/** Normalised result of an upload, whatever the provider. */
export interface UploadResult {
  provider: UploadProviderId;
  /** Page to share / open in a browser. */
  pageUrl: string;
  /** Direct link to the image file (for embedding, Photopea, TinEye…). */
  directUrl: string;
  thumbUrl: string;
  /** Link that deletes the image (anyone with it can). */
  deleteUrl: string;
  /** Deletes the image from inside the app, when the provider supports it. */
  deleteNow?: () => Promise<void>;
  size?: number;
  width?: number;
  height?: number;
  /** Seconds until automatic deletion (0 / undefined = never). */
  expiration?: number;
}

export interface UploadOptions {
  name: string;
  /** Seconds; only honoured by providers with `supportsExpiry`. */
  expiration?: number;
}

export interface UploadProvider {
  id: UploadProviderId;
  label: string;
  host: string;
  supportsExpiry: boolean;
  /** Why it can't be used right now, or null when ready. */
  unavailableReason: () => string | null;
  upload: (image: Blob, opts: UploadOptions) => Promise<UploadResult>;
}

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const PROVIDERS: Record<UploadProviderId, UploadProvider> = {
  kappa: {
    id: "kappa",
    label: "kappa.lol",
    host: "kappa.lol",
    supportsExpiry: false,
    unavailableReason: () => null,
    upload: async (image, { name }) => {
      const ext = EXT[image.type] ?? "png";
      const r = await uploadToKappa(image, `${name}.${ext}`);
      return {
        provider: "kappa",
        pageUrl: r.link,
        directUrl: r.link,
        thumbUrl: r.link,
        deleteUrl: r.deleteUrl,
        deleteNow: () => deleteFromKappa(r.key),
        size: image.size,
      };
    },
  },
  imgbb: {
    id: "imgbb",
    label: "ImgBB",
    host: "ibb.co",
    supportsExpiry: true,
    unavailableReason: () => (getImgbbKey() ? null : "ImgBB needs an API key (Settings → Sharing)."),
    upload: async (image, { name, expiration }) => {
      const r = await uploadToImgbb(image, { name, expiration });
      return {
        provider: "imgbb",
        pageUrl: r.viewerUrl,
        directUrl: r.url,
        thumbUrl: r.thumbUrl,
        deleteUrl: r.deleteUrl,
        size: r.size,
        width: r.width,
        height: r.height,
        expiration: r.expiration,
      };
    },
  },
};

export const PROVIDER_LIST = Object.values(PROVIDERS);

export const getDefaultProvider = () => PROVIDERS[getSettings().uploadProvider] ?? PROVIDERS.kappa;

/**
 * The provider to use for background uploads (Photopea / TinEye): the
 * default one, or the other one if the default can't be used.
 */
export const getUsableProvider = () => {
  const preferred = getDefaultProvider();
  if (!preferred.unavailableReason()) return preferred;
  return PROVIDER_LIST.find((p) => !p.unavailableReason()) ?? preferred;
};
