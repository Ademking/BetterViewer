import { create } from "zustand";
import { toast } from "@/components/ui/toast";
import { type QrCode, describeQr, scanImageForQr } from "@/lib/qr";
import { getDoc } from "@/state/document";
import { getUi } from "@/state/ui";
import { t } from "@/lib/i18n";

type Status = "idle" | "scanning" | "done" | "error";

interface QrStore {
  /** Image src the results belong to. */
  src: string | null;
  status: Status;
  codes: QrCode[];
  error: string | null;
  /** Result highlighted on the board (hover / locate). */
  active: number | null;
}

export const useQr = create<QrStore>()(() => ({
  src: null,
  status: "idle",
  codes: [],
  error: null,
  active: null,
}));

/**
 * Scan the current image. `reveal` opens the results panel straight away
 * (manual scan); otherwise a toast announces codes that were found.
 */
export async function scanCurrentImage({ reveal = false, force = false } = {}) {
  const doc = getDoc();
  if (!doc) return;
  const src = doc.image.src;
  const state = useQr.getState();
  if (reveal) getUi().togglePanel("qr", true);

  const cached = state.src === src && (state.status === "done" || state.status === "scanning");
  if (cached && !force) return;

  useQr.setState({ src, status: "scanning", codes: [], error: null, active: null });
  try {
    const codes = await scanImageForQr(src);
    if (useQr.getState().src !== src) return; // image changed meanwhile
    useQr.setState({ status: "done", codes });
    if (!reveal && codes.length && !getUi().panels.qr) {
      const first = describeQr(codes[0].content);
      toast.info({
        title: t("{count} QR codes found", { count: codes.length }),
        description:
          codes.length > 1
            ? t("Open the QR panel to see them all.")
            : `${first.label}: ${truncate(codes[0].content, 60)}`,
        action: { label: t("Show"), onClick: () => getUi().togglePanel("qr", true) },
      });
    }
  } catch (err) {
    if (useQr.getState().src !== src) return;
    useQr.setState({ status: "error", error: (err as Error).message });
  }
}

export const resetQr = () =>
  useQr.setState({ src: null, status: "idle", codes: [], error: null, active: null });

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
