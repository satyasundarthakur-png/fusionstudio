import type { MixResult, FusionVariantKey } from "@/lib/audioEngine";

export type StudioSessionInput = {
  voiceBlob: Blob | null;
  voiceUrl: string | null;
  trackFile: File | null;
  trackUrl: string | null;
  trackMeta: { name: string; sizeMB: number; durationSec: number } | null;
  voiceVolumePct: number;
  musicVolumePct: number;
  autoBalanceVocal: boolean;
  autoAlignKey: boolean;
  separationModel: "demucs" | "skip";
  quality: "high" | "lossless" | "standard";
  variantMode: "all" | "top3" | "custom";
  customVariants: FusionVariantKey[];
  languages: string[];
};

export type StudioSessionResult = {
  instrumentalUrl: string | null;
  /** The separated instrumental as a Blob — the in-browser Demucs
   * separation only produces a local blob: URL, which isn't retrievable
   * once the tab closes, so we keep the Blob around too (e.g. for future
   * "download instrumental" support). */
  instrumentalBlob: Blob | null;
  /** The isolated original vocals (before your recording was mixed in), if
   * separation ran successfully — lets the person download just the stems
   * without waiting for the full fusion pipeline. */
  vocalsBlob: Blob | null;
  variants: MixResult[];
  aiTips: string[];
  /** Set when local Demucs separation failed (e.g. low-memory device) and
   * the fusion fell back to mixing over the un-separated track. */
  separationWarning: string | null;
};

const initialInput: StudioSessionInput = {
  voiceBlob: null,
  voiceUrl: null,
  trackFile: null,
  trackUrl: null,
  trackMeta: null,
  voiceVolumePct: 75,
  musicVolumePct: 65,
  autoBalanceVocal: true,
  autoAlignKey: true,
  separationModel: "demucs",
  quality: "high",
  variantMode: "all",
  customVariants: ["studio", "cinematic", "acoustic"],
  languages: [],
};

const initialResult: StudioSessionResult = {
  instrumentalUrl: null,
  instrumentalBlob: null,
  vocalsBlob: null,
  variants: [],
  aiTips: [],
  separationWarning: null,
};

/**
 * Lightweight in-memory session store shared across Studio -> Processing ->
 * Results pages within a single browser session. Avoids needing to
 * serialize large audio blobs into the URL/router state. Everything here is
 * local to the browser tab — there's no backend, so nothing persists past
 * a page refresh.
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
