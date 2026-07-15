import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Triggers a browser download for an in-memory Blob (e.g. a separated
 * audio stem or generated fusion variant) without needing a server. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke shortly after — immediate revocation can cancel the download in
  // some browsers before it actually starts.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
