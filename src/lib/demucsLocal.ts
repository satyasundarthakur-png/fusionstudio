import * as ort from "onnxruntime-web";
import { audioBufferToWavBlob } from "@/lib/audioEngine";

// HTDemucs (fine-tuned, vocals-focused) exported to ONNX — runs fully
// client-side via onnxruntime-web. No server, no API key, no per-run cost.
// Weights (~316MB) download once and are cached by the browser after that.
const MODEL_URL =
  "https://huggingface.co/StemSplitio/htdemucs-ft-vocals-onnx/resolve/main/htdemucs_ft_vocals.onnx";

const TARGET_SAMPLE_RATE = 44100;
const NUM_STEMS = 4; // drums, bass, other, vocals
const VOCALS_STEM_INDEX = 3;

// Load the WASM/WebGPU runtime binaries from a CDN so Lovable's static build
// doesn't need to bundle or copy onnxruntime-web's binary assets manually.
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

// Single-threaded WASM avoids the extra SharedArrayBuffer memory the
// multi-threaded build reserves up front, which otherwise eats into the
// budget available for the 316MB model itself.
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;

let sessionPromise: Promise<ort.InferenceSession> | null = null;

// Disabling the memory arena and memory-pattern optimization stops ONNX
// Runtime from pre-reserving large, doubling-growth memory blocks at
// session-creation time. That upfront over-reservation — not the model
// itself — is what typically throws std::bad_alloc / ERROR_CODE 6 inside a
// browser's constrained WASM heap, even when the model would otherwise fit.
const LOW_MEMORY_SESSION_OPTIONS: ort.InferenceSession.SessionOptions = {
  enableCpuMemArena: false,
  enableMemPattern: false,
  executionMode: "sequential",
  graphOptimizationLevel: "basic",
};

/**
 * Downloads (or reuses the browser HTTP cache for) the Demucs ONNX model
 * and creates an inference session. WebGPU is tried first for speed; if the
 * browser doesn't support it, this transparently falls back to WASM.
 */
export async function loadDemucs(
  onProgress?: (pct: number) => void
): Promise<ort.InferenceSession> {
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    const resp = await fetch(MODEL_URL);
    if (!resp.ok || !resp.body) {
      throw new Error(
        `Failed to download Demucs ONNX model (HTTP ${resp.status}).`
      );
    }

    const total = Number(resp.headers.get("content-length") || 0);
    const reader = resp.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      onProgress?.(total ? (received / total) * 100 : 0);
    }

    const modelBuffer = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      modelBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    try {
      return await ort.InferenceSession.create(modelBuffer.buffer, {
        ...LOW_MEMORY_SESSION_OPTIONS,
        executionProviders: ["webgpu", "wasm"],
      });
    } catch (err) {
      // Some browsers report webgpu support but fail at session creation —
      // retry with wasm only rather than failing the whole pipeline.
      console.warn(
        "WebGPU session creation failed, falling back to WASM only.",
        err
      );
      return ort.InferenceSession.create(modelBuffer.buffer, {
        ...LOW_MEMORY_SESSION_OPTIONS,
        executionProviders: ["wasm"],
      });
    }
  })().catch((err) => {
    // Don't cache a failed session — otherwise every retry immediately
    // rejects with the same stale promise instead of trying again.
    sessionPromise = null;
    throw err;
  });

  return sessionPromise;
}

/** Linear resample of a mono/stereo channel to the target sample rate. */
function resampleChannel(
  data: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (fromRate === toRate) return data;
  const ratio = toRate / fromRate;
  const newLength = Math.round(data.length * ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcPos = i / ratio;
    const srcIndexLow = Math.floor(srcPos);
    const srcIndexHigh = Math.min(srcIndexLow + 1, data.length - 1);
    const frac = srcPos - srcIndexLow;
    result[i] = data[srcIndexLow] * (1 - frac) + data[srcIndexHigh] * frac;
  }
  return result;
}

export type LocalSeparationResult = {
  noVocalsUrl: string;
  vocalsUrl: string;
  noVocalsBlob: Blob;
  vocalsBlob: Blob;
};

/**
 * Runs Demucs entirely in the browser (WebGPU/WASM via onnxruntime-web) on
 * the given track buffer, returning separated instrumental ("no vocals")
 * and isolated vocal stems as playable Blob URLs. Zero uploads, zero cost.
 */
export async function separateVocalsLocal(
  audioBuffer: AudioBuffer,
  onProgress?: (status: string, pct?: number) => void
): Promise<LocalSeparationResult> {
  onProgress?.("Downloading Demucs model (first run only, cached after)…", 0);
  const session = await loadDemucs((pct) =>
    onProgress?.("Downloading Demucs model (first run only, cached after)…", pct)
  );

  onProgress?.("Preparing audio for separation…");

  const leftRaw = audioBuffer.getChannelData(0);
  const rightRaw =
    audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : leftRaw;

  const left = resampleChannel(leftRaw, audioBuffer.sampleRate, TARGET_SAMPLE_RATE);
  const right = resampleChannel(rightRaw, audioBuffer.sampleRate, TARGET_SAMPLE_RATE);
  const samplesPerStem = left.length;

  onProgress?.("Running AI separation in your browser (this can take a few minutes)…");

  const inputName = session.inputNames[0] ?? "input";
  const outputName = session.outputNames[0] ?? "output";

  // Run the model on short overlapping chunks instead of the whole track at
  // once. Demucs' architecture needs a huge amount of working memory per
  // sample fed in; a multi-minute track in a single pass reliably blows past
  // the browser's WASM heap (std::bad_alloc / ERROR_CODE 6). Chunking keeps
  // peak memory roughly constant no matter how long the track is.
  const CHUNK_SECONDS = 8;
  const OVERLAP_SECONDS = 1;
  const chunkSize = CHUNK_SECONDS * TARGET_SAMPLE_RATE;
  const overlapSize = OVERLAP_SECONDS * TARGET_SAMPLE_RATE;
  const hopSize = chunkSize - overlapSize;

  const outStems: Float32Array[] = Array.from(
    { length: NUM_STEMS * 2 },
    () => new Float32Array(samplesPerStem)
  );
  const weightSum = new Float32Array(samplesPerStem);

  // Linear ramp used to crossfade overlapping chunk boundaries together.
  const fadeRamp = new Float32Array(overlapSize);
  for (let i = 0; i < overlapSize; i++) fadeRamp[i] = i / Math.max(1, overlapSize - 1);

  let chunkIndex = 0;
  const totalChunks = Math.max(1, Math.ceil(samplesPerStem / hopSize));

  for (let start = 0; start < samplesPerStem; start += hopSize) {
    const end = Math.min(start + chunkSize, samplesPerStem);
    const len = end - start;

    const chunkInterleaved = new Float32Array(len * 2);
    chunkInterleaved.set(left.subarray(start, end), 0);
    chunkInterleaved.set(right.subarray(start, end), len);

    const inputTensor = new ort.Tensor("float32", chunkInterleaved, [1, 2, len]);
    const output = await session.run({ [inputName]: inputTensor });
    const stems = output[outputName].data as Float32Array;

    // Per-sample weight for this chunk: ramp up over the leading overlap,
    // full weight in the middle, ramp down over the trailing overlap — so
    // adjacent chunks blend smoothly instead of clicking at the seams.
    for (let i = 0; i < len; i++) {
      let w = 1;
      if (start > 0 && i < overlapSize) w = Math.min(w, fadeRamp[i]);
      if (end < samplesPerStem && i >= len - overlapSize) {
        w = Math.min(w, fadeRamp[len - 1 - i]);
      }
      weightSum[start + i] += w;
      for (let s = 0; s < NUM_STEMS; s++) {
        const chunkOff = s * 2 * len;
        outStems[s * 2][start + i] += stems[chunkOff + i] * w;
        outStems[s * 2 + 1][start + i] += stems[chunkOff + len + i] * w;
      }
    }

    chunkIndex++;
    onProgress?.(
      "Running AI separation in your browser (this can take a few minutes)…",
      (chunkIndex / totalChunks) * 100
    );

    if (end >= samplesPerStem) break;
  }

  // Normalize by accumulated crossfade weight.
  for (let i = 0; i < samplesPerStem; i++) {
    const w = weightSum[i] || 1;
    for (let s = 0; s < NUM_STEMS * 2; s++) outStems[s][i] /= w;
  }

  onProgress?.("Building instrumental and vocal stems…");

  const vocalsL = outStems[VOCALS_STEM_INDEX * 2];
  const vocalsR = outStems[VOCALS_STEM_INDEX * 2 + 1];

  const instL = new Float32Array(samplesPerStem);
  const instR = new Float32Array(samplesPerStem);
  for (let s = 0; s < NUM_STEMS - 1; s++) {
    for (let i = 0; i < samplesPerStem; i++) {
      instL[i] += outStems[s * 2][i];
      instR[i] += outStems[s * 2 + 1][i];
    }
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
  const vocalsBlob = audioBufferToWavBlob(toBuffer(vocalsL, vocalsR));
  await ctx.close();

  onProgress?.("Separation complete.", 100);

  return {
    noVocalsUrl: URL.createObjectURL(noVocalsBlob),
    vocalsUrl: URL.createObjectURL(vocalsBlob),
    noVocalsBlob,
    vocalsBlob,
  };
}
