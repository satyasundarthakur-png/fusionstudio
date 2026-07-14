import type { MixResult, FusionVariantKey } from "@/lib/audioEngine";

export type StudioSessionInput = {
  voiceBlob: Blob | null;
  voiceUrl: string | null;
  voicePath: string | null;
  trackFile: File | null;
  trackUrl: string | null;
  trackPath: string | null;
  trackMeta: { name: string; sizeMB: number; durationSec: number } | null;
  voiceVolumePct: number;
  musicVolumePct: number;
  separationModel: "demucs" | "spleeter" | "skip";
  quality: "high" | "lossless" | "standard";
  variantMode: "all" | "top3" | "custom";
  customVariants: FusionVariantKey[];
  languages: string[];
};

export type StudioSessionResult = {
  instrumentalUrl: string | null;
  instrumentalPath: string | null;
  /** The separated instrumental as a Blob, kept so Results.tsx can persist
   * it to Supabase Storage (the in-browser Demucs separation only produces
   * a local blob: URL, which isn't retrievable after the tab closes). */
  instrumentalBlob: Blob | null;
  variants: MixResult[];
  aiTips: string[];
};

const initialInput: StudioSessionInput = {
  voiceBlob: null,
  voiceUrl: null,
  voicePath: null,
  trackFile: null,
  trackUrl: null,
  trackPath: null,
  trackMeta: null,
  voiceVolumePct: 75,
  musicVolumePct: 65,
  separationModel: "demucs",
  quality: "high",
  variantMode: "all",
  customVariants: ["studio", "cinematic", "acoustic"],
  languages: [],
};

const initialResult: StudioSessionResult = {
  instrumentalUrl: null,
  instrumentalPath: null,
  instrumentalBlob: null,
  variants: [],
  aiTips: [],
};

/**
 * Lightweight in-memory session store shared across Studio -> Processing ->
 * Results pages within a single browser session. Avoids needing to
 * serialize large audio blobs into the URL/router state.
 *
 * Alongside each signed URL (which expires after 7 days — see
 * useSupabaseStorage.ts), we keep the permanent Supabase Storage `path` for
 * voice/track/instrumental files. Signed URLs are only good for playback in
 * this session; the storage `path` is what the 30-day retention cleanup job
 * (supabase/functions/cleanup-old-fusions) uses to actually delete files
 * later, since it can't rely on an already-expired signed URL.
 */
class SessionStore {
  input: StudioSessionInput = { ...initialInput };
  result: StudioSessionResult = { ...initialResult };

  setInput(partial: Partial<StudioSessionInput>) {
    this.input = { ...this.input, ...partial };
  }

  setResult(partial: Partial<StudioSessionResult>) {
    this.result = { ...this.result, ...partial };
  }

  reset() {
    this.input = { ...initialInput };
    this.result = { ...initialResult };
  }
}

export const sessionStore = new SessionStore();
