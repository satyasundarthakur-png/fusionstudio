import { useCallback, useRef, useState } from "react";
import {
  generateFusionVariants,
  detectPitchAutocorrelation,
  semitoneDiff,
  type FusionVariantKey,
  type MixResult,
} from "@/lib/audioEngine";
import { separateVocalsLocal, type TimeoutExtensionOffer } from "@/lib/demucsLocal";

export type PipelineStepId =
  | "upload"
  | "separate"
  | "align"
  | "mix"
  | "effects";

export type PipelineStepStatus = "pending" | "active" | "done" | "error";

export type PipelineState = Record<PipelineStepId, PipelineStepStatus>;

const initialPipelineState: PipelineState = {
  upload: "pending",
  separate: "pending",
  align: "pending",
  mix: "pending",
  effects: "pending",
};

export function useAudioMixer() {
  const [pipeline, setPipeline] = useState<PipelineState>(initialPipelineState);
  const [variants, setVariants] = useState<MixResult[]>([]);
  const [instrumentalUrl, setInstrumentalUrl] = useState<string | null>(null);
  const [instrumentalBlob, setInstrumentalBlob] = useState<Blob | null>(null);
  const [detectedKeyShiftSemitones, setDetectedKeyShiftSemitones] =
    useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [separationStatus, setSeparationStatus] = useState<string | null>(null);
  const [separationProgressPct, setSeparationProgressPct] = useState<number | null>(
    null
  );
  const [separationWarning, setSeparationWarning] = useState<string | null>(null);
  const [timeoutOffer, setTimeoutOffer] = useState<TimeoutExtensionOffer | null>(null);
  const timeoutDecisionRef = useRef<((extend: boolean) => void) | null>(null);

  /** Called by the Processing UI when the person clicks "Add 5 more minutes" or "Stop". */
  const respondToTimeoutOffer = useCallback((extend: boolean) => {
    setTimeoutOffer(null);
    timeoutDecisionRef.current?.(extend);
    timeoutDecisionRef.current = null;
  }, []);

  const setStep = useCallback(
    (step: PipelineStepId, status: PipelineStepStatus) => {
      setPipeline((prev) => ({ ...prev, [step]: status }));
    },
    []
  );

  const run = useCallback(
    async (params: {
      voiceUrl: string;
      trackUrl: string;
      voiceVolumePct: number;
      musicVolumePct: number;
      variantKeys?: FusionVariantKey[];
      skipSeparation?: boolean;
    }) => {
      const {
        voiceUrl,
        trackUrl,
        voiceVolumePct,
        musicVolumePct,
        variantKeys,
        skipSeparation,
      } = params;

      setIsProcessing(true);
      setError(null);
      setPipeline(initialPipelineState);

      try {
        // Step 1: upload (assumed already done by caller before invoking run;
        // marked done immediately since files are already in Supabase Storage)
        setStep("upload", "active");
        await new Promise((r) => setTimeout(r, 400));
        setStep("upload", "done");

        // Step 2: Demucs vocal separation — runs fully client-side via
        // onnxruntime-web (WebGPU with WASM fallback). No uploads, no API
        // cost; the model weights are cached by the browser after the
        // first run.
        setStep("separate", "active");
        setSeparationWarning(null);
        let noVocalsUrl = trackUrl;
        let vocalsUrl: string | null = null;
        if (!skipSeparation) {
          try {
            setSeparationStatus("Loading track for separation…");
            const ctx = new (window.AudioContext ||
              (window as any).webkitAudioContext)();
            const trackBuffer = await fetch(trackUrl)
              .then((r) => r.arrayBuffer())
              .then((ab) => ctx.decodeAudioData(ab));

            const sep = await separateVocalsLocal(
              trackBuffer,
              (status, pct) => {
                setSeparationStatus(status);
                setSeparationProgressPct(pct ?? null);
              },
              (offer) =>
                new Promise<boolean>((resolve) => {
                  timeoutDecisionRef.current = resolve;
                  setTimeoutOffer(offer);
                })
            );
            await ctx.close();

            noVocalsUrl = sep.noVocalsUrl;
            vocalsUrl = sep.vocalsUrl;
            setInstrumentalBlob(sep.noVocalsBlob);
          } catch (sepErr) {
            // Local Demucs can fail on devices without enough memory for the
            // model (std::bad_alloc / ERROR_CODE 6). Rather than failing the
            // whole fusion, fall back to mixing over the original track
            // un-separated — same as the "Skip separation" option.
            console.warn(
              "Local vocal separation failed, continuing without it.",
              sepErr
            );
            setSeparationWarning(
              "Instrumental separation couldn't run on this device (likely low memory), so this fusion mixes your voice directly over the original track instead of an isolated instrumental."
            );
            noVocalsUrl = trackUrl;
            vocalsUrl = null;
            setInstrumentalBlob(null);
          }
        } else {
          // Separation skipped — the "instrumental" is just the original
          // track, which is already uploaded to Storage; no extra blob to
          // persist.
          setInstrumentalBlob(null);
        }
        setSeparationStatus(null);
        setSeparationProgressPct(null);
        setInstrumentalUrl(noVocalsUrl);
        setStep("separate", "done");

        // Step 3: pitch alignment / key detection
        setStep("align", "active");
        try {
          const ctx = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
          const [voiceBuf, instBuf] = await Promise.all([
            fetch(voiceUrl)
              .then((r) => r.arrayBuffer())
              .then((ab) => ctx.decodeAudioData(ab)),
            fetch(noVocalsUrl)
              .then((r) => r.arrayBuffer())
              .then((ab) => ctx.decodeAudioData(ab)),
          ]);
          const voicePitch = detectPitchAutocorrelation(voiceBuf);
          const instPitch = detectPitchAutocorrelation(instBuf);
          const shift = Math.round(semitoneDiff(voicePitch, instPitch));
          setDetectedKeyShiftSemitones(
            Number.isFinite(shift) ? Math.max(-6, Math.min(6, shift)) : 0
          );
          await ctx.close();
        } catch {
          setDetectedKeyShiftSemitones(0);
        }
        setStep("align", "done");

        // Step 4 + 5: mix voice + instrumental and apply effect chains for
        // each of the 6 fusion variants
        setStep("mix", "active");
        const results = await generateFusionVariants({
          voiceUrl,
          instrumentalUrl: noVocalsUrl,
          originalVocalUrl: vocalsUrl,
          voiceVolumePct,
          musicVolumePct,
          variants: variantKeys,
        });
        setStep("mix", "done");

        setStep("effects", "active");
        await new Promise((r) => setTimeout(r, 300));
        setStep("effects", "done");

        setVariants(results);
        return results;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Processing failed.";
        setError(message);
        setPipeline((prev) => {
          const failedStep = (Object.keys(prev) as PipelineStepId[]).find(
            (k) => prev[k] === "active"
          );
          if (!failedStep) return prev;
          return { ...prev, [failedStep]: "error" };
        });
        return [];
      } finally {
        setIsProcessing(false);
      }
    },
    [setStep]
  );

  return {
    pipeline,
    variants,
    instrumentalUrl,
    instrumentalBlob,
    detectedKeyShiftSemitones,
    isProcessing,
    error,
    separationStatus,
    separationProgressPct,
    separationWarning,
    timeoutOffer,
    respondToTimeoutOffer,
    run,
  };
}
