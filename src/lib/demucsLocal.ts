import * as ort from "onnxruntime-web";
import { DemucsProcessor, CONSTANTS } from "demucs-web";
import { audioBufferToWavBlob } from "@/lib/audioEngine";

// Lighter community ONNX export of HTDemucs (~172MB vs the ~316MB full
// export we used previously) — meaningfully less memory pressure on the
// browser's WASM heap, which is what was causing std::bad_alloc / ERROR_CODE
// 6 on lower-memory devices. Hosted on Hugging Face by the demucs-web
// project (github.com/timcsy/demucs-web).
const MODEL_URL = CONSTANTS.DEFAULT_MODEL_URL;

const TARGET_SAMPLE_RATE = CONSTANTS.SAMPLE_RATE; // 44100

// Load the WASM/WebGPU runtime binaries from a CDN so Lovable's static build
// doesn't need to bundle or copy onnxruntime-web's binary assets manually.
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

// Single-threaded WASM avoids needing SharedArrayBuffer, which in turn means
// we don't need Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy
// response headers — those aren't something a static Lovable deployment can
// easily set. It also avoids the extra memory multi-threaded WASM reserves
// upfront for thread coordination.
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;

// Disabling the memory arena and memory-pattern optimization stops ONNX
// Runtime from pre-reserving large, doubling-growth memory blocks at
// session-creation time — the usual cause of std::bad_alloc in a browser's
// constrained WASM heap, even when the model would otherwise fit.
//
// executionProviders tries WebGPU first, falling back to WASM: forcing
// WASM-only avoids some memory overhead but makes each of the ~30-40 chunk
// inferences for a full track run on pure single-threaded CPU, which is
// dramatically slower (minutes-to-tens-of-minutes) and can look like the
// separation step has hung even though it's just crawling through compute.
const LOW_MEMORY_SESSION_OPTIONS: ort.InferenceSession.SessionOptions = {
  enableCpuMemArena: false,
  enableMemPattern: false,
  executionProviders: ["webgpu", "wasm"],
  graphOptimizationLevel: "basic",
};

let processorPromise: Promise<DemucsProcessor> | null = null;

// The DemucsProcessor instance is cached/reused across separation runs, but
// its onProgress/onDownloadProgress callbacks are bound once at
// construction. Routing through a mutable relay lets each call to
// separateVocalsLocal point progress updates at *its own* callback/local
// state, instead of only the very first call's.
const progressRelay: {
  onDownloadProgress: ((loaded: number, total: number) => void) | null;
  onProgress: ((progress: number) => void) | null;
} = { onDownloadProgress: null, onProgress: null };

/**
 * Creates (and caches) a DemucsProcessor with the lighter ~172MB model,
 * downloading it on first use. The demucs-web package handles chunking,
 * windowing, and STFT/ISTFT internally, so we don't need to hand-roll the
 * overlap-add logic ourselves.
 */
function loadDemucs(
  onProgress?: (status: string, pct?: number) => void
): Promise<DemucsProcessor> {
  progressRelay.onDownloadProgress = (loaded, total) => {
    onProgress?.(
      "Downloading Demucs model (first run only, cached after)…",
      total ? (loaded / total) * 100 : 0
    );
  };
  progressRelay.onProgress = (progress) => {
    onProgress?.(
      "Running AI separation in your browser (this can take a few minutes)…",
      progress * 100
    );
  };

  if (processorPromise) return processorPromise;

  processorPromise = (async () => {
    const processor = new DemucsProcessor({
      ort,
      sessionOptions: LOW_MEMORY_SESSION_OPTIONS,
      onDownloadProgress: (loaded, total) => progressRelay.onDownloadProgress?.(loaded, total),
      onProgress: ({ progress }) => progressRelay.onProgress?.(progress),
    });

    await processor.loadModel(MODEL_URL);
    return processor;
  })().catch((err) => {
    // Don't cache a failed load — otherwise every retry instantly rejects
    // with the same stale error instead of trying again.
    processorPromise = null;
    throw err;
  });

  return processorPromise;
}

export type LocalSeparationResult = {
  noVocalsUrl: string;
  vocalsUrl: string;
  noVocalsBlob: Blob;
  vocalsBlob: Blob;
};

export type TimeoutExtensionOffer = {
  /** Best-known progress (0-100) at the moment the timeout was hit. */
  progressPct: number;
};

/**
 * Races a promise against a timeout, but instead of failing outright when
 * the timeout fires, optionally asks the caller (via onTimeoutOffer) whether
 * to grant more time. The underlying work keeps running in the background
 * either way — Promise.race doesn't cancel the loser — so if the person
 * says "yes, keep going", nothing is lost or restarted, we just keep
 * waiting on the same in-progress work with a fresh timer.
 */
async function raceWithExtendableTimeout<T>(
  work: Promise<T>,
  initialMs: number,
  extensionMs: number,
  getProgressPct: () => number,
  onTimeoutOffer?: (offer: TimeoutExtensionOffer) => Promise<boolean>
): Promise<T> {
  let ms = initialMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const TIMED_OUT = Symbol("timed-out");
    const result = await Promise.race([
      work,
      new Promise<typeof TIMED_OUT>((resolve) => setTimeout(() => resolve(TIMED_OUT), ms)),
    ]);

    if (result !== TIMED_OUT) return result;

    if (!onTimeoutOffer) {
      throw new Error(
        "Local vocal separation timed out (device likely too slow for in-browser separation)."
      );
    }

    const shouldExtend = await onTimeoutOffer({ progressPct: getProgressPct() });
    if (!shouldExtend) {
      throw new Error("Local vocal separation timed out (user declined to wait longer).");
    }

    ms = extensionMs; // wait another round, same in-progress work
  }
}

/**
 * Runs Demucs entirely in the browser (WASM via onnxruntime-web) on the
 * given track buffer, returning separated instrumental ("no vocals") and
 * isolated vocal stems as playable Blob URLs. Zero uploads, zero cost.
 */
export async function separateVocalsLocal(
  audioBuffer: AudioBuffer,
  onProgress?: (status: string, pct?: number) => void,
  onTimeoutOffer?: (offer: TimeoutExtensionOffer) => Promise<boolean>
): Promise<LocalSeparationResult> {
  let latestProgressPct = 0;
  const trackingOnProgress: typeof onProgress = (status, pct) => {
    if (typeof pct === "number") latestProgressPct = pct;
    onProgress?.(status, pct);
  };

  trackingOnProgress?.("Downloading Demucs model (first run only, cached after)…", 0);
  const processor = await loadDemucs(trackingOnProgress);

  trackingOnProgress?.("Preparing audio for separation…");

  const left = audioBuffer.getChannelData(0);
  const right =
    audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;

  trackingOnProgress?.("Running AI separation in your browser (this can take a few minutes)…");

  // Safety net: if a device is slow enough that separation would take an
  // unreasonable amount of time (e.g. no WebGPU + weak CPU), offer the
  // person a chance to grant 5 more minutes instead of failing outright —
  // this matters most right near the end (e.g. stuck at 99%), where failing
  // and falling back would throw away nearly-finished work.
  const SEPARATION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  const EXTENSION_MS = 5 * 60 * 1000; // +5 minutes per extension

  const { drums, bass, other, vocals } = await raceWithExtendableTimeout(
    processor.separate(left, right),
    SEPARATION_TIMEOUT_MS,
    EXTENSION_MS,
    () => latestProgressPct,
    onTimeoutOffer
  );

  onProgress?.("Building instrumental and vocal stems…");

  const samplesPerStem = vocals.left.length;
  const instL = new Float32Array(samplesPerStem);
  const instR = new Float32Array(samplesPerStem);
  for (let i = 0; i < samplesPerStem; i++) {
    instL[i] = drums.left[i] + bass.left[i] + other.left[i];
    instR[i] = drums.right[i] + bass.right[i] + other.right[i];
  }

  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: TARGET_SAMPLE_RATE,
  });

  const toBuffer = (l: Float32Array, r: Float32Array) => {
    const buf = ctx.createBuffer(2, l.length, TARGET_SAMPLE_RATE);
    buf.copyToChannel(l as any, 0);
    buf.copyToChannel(r as any, 1);
    return buf;
  };

  const noVocalsBlob = audioBufferToWavBlob(toBuffer(instL, instR));
  const vocalsBlob = audioBufferToWavBlob(toBuffer(vocals.left, vocals.right));
  await ctx.close();

  onProgress?.("Separation complete.", 100);

  return {
    noVocalsUrl: URL.createObjectURL(noVocalsBlob),
    vocalsUrl: URL.createObjectURL(vocalsBlob),
    noVocalsBlob,
    vocalsBlob,
  };
}
