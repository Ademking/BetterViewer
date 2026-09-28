/// <reference types="vite/client" />

/** package.json version, injected by Vite. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Optional ImgBB API key used when none is set in Settings. */
  readonly VITE_IMGBB_API_KEY?: string;
}
