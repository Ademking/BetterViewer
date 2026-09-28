/** kappa.lol file host: anonymous uploads, deletable with a per-file key. */

const API = "https://kappa.lol/api";

export interface KappaUpload {
  id: string;
  ext: string;
  type: string;
  checksum: string;
  /** Secret that allows deleting the file. */
  key: string;
  link: string;
  deleteUrl: string;
}

const errorMessage = async (res: Response, fallback: string) => {
  const json = (await res.json().catch(() => null)) as { error?: string } | null;
  return json?.error ?? `${fallback} (HTTP ${res.status}).`;
};

export async function uploadToKappa(image: Blob, filename: string): Promise<KappaUpload> {
  const form = new FormData();
  form.append("file", image, filename);

  let res: Response;
  try {
    res = await fetch(`${API}/upload`, { method: "POST", body: form });
  } catch {
    throw new Error("Couldn't reach kappa.lol. Check your connection and try again.");
  }
  if (!res.ok) throw new Error(await errorMessage(res, "Upload failed"));

  const d = (await res.json()) as {
    id: string;
    ext: string;
    type: string;
    checksum: string;
    key: string;
    link: string;
    delete: string;
    error?: string;
  };
  if (!d?.link || !d.key) throw new Error(d?.error ?? "kappa.lol returned an unexpected response.");
  return {
    id: d.id,
    ext: d.ext,
    type: d.type,
    checksum: d.checksum,
    key: d.key,
    link: d.link,
    deleteUrl: d.delete,
  };
}

export async function deleteFromKappa(key: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API}/delete?key=${encodeURIComponent(key)}`);
  } catch {
    throw new Error("Couldn't reach kappa.lol.");
  }
  if (!res.ok) throw new Error(await errorMessage(res, "Delete failed"));
  const d = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
  if (!d.success) throw new Error(d.error ?? "kappa.lol couldn't delete the file.");
}
