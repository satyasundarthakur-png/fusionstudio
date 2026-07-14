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

let sessionPromise: Promise<ort.InferenceSession> | null = null;

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
        executionProviders: ["wasm"],
      });
    }
  })();

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

  const interleaved = new Float32Array(samplesPerStem * 2);
  interleaved.set(left, 0);
  interleaved.set(right, samplesPerStem);

  onProgress?.("Running AI separation in your browser (this can take a few minutes)…");

  const inputName = session.inputNames[0] ?? "input";
  const inputTensor = new ort.Tensor("float32", interleaved, [1, 2, samplesPerStem]);
  const feeds: Record<string, ort.Tensor> = { [inputName]: inputTensor };

  const output = await session.run(feeds);
  const outputName = session.outputNames[0] ?? "output";
  const stems = output[outputName].data as Float32Array;

  onProgress?.("Building instrumental and vocal stems…");

  const vocalsOffset = VOCALS_STEM_INDEX * 2 * samplesPerStem;
  const vocalsL = stems.slice(vocalsOffset, vocalsOffset + samplesPerStem);
  const vocalsR = stems.slice(
    vocalsOffset + samplesPerStem,
    vocalsOffset + 2 * samplesPerStem
  );

  const instL = new Float32Array(samplesPerStem);
  const instR = new Float32Array(samplesPerStem);
  for (let s = 0; s < NUM_STEMS - 1; s++) {
    const off = s * 2 * samplesPerStem;
    for (let i = 0; i < samplesPerStem; i++) {
      instL[i] += stems[off + i];
      instR[i] += stems[off + samplesPerStem + i];
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
