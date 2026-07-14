import * as Tone from "tone";

export type EffectPreset =
  | "clean"
  | "reverb"
  | "echo"
  | "warm"
  | "pitch-up"
  | "pitch-down";

export type FusionVariantKey =
  | "studio"
  | "cinematic"
  | "acoustic"
  | "duet"
  | "lofi"
  | "pitchdown";

export const FUSION_VARIANT_LABELS: Record<FusionVariantKey, string> = {
  studio: "Studio Mix",
  cinematic: "Cinematic Reverb",
  acoustic: "Acoustic Warmth",
  duet: "Duet Blend",
  lofi: "Lo-fi Chill",
  pitchdown: "Pitch –2 Semitones",
};

/**
 * Detects the dominant pitch (fundamental frequency) of an AudioBuffer using
 * autocorrelation on a representative window of samples. Returns the
 * detected frequency in Hz (0 if silence/undetectable).
 */
export function detectPitchAutocorrelation(
  buffer: AudioBuffer,
  windowStartSec = 0
): number {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const windowSize = Math.min(2048, channelData.length);
  const startSample = Math.floor(windowStartSec * sampleRate);
  const data = channelData.slice(
    startSample,
    Math.min(startSample + windowSize, channelData.length)
  );

  if (data.length < 8) return 0;

  let rms = 0;
  for (let i = 0; i < data.length; i++) rms += data[i] * data[i];
  rms = Math.sqrt(rms / data.length);
  if (rms < 0.01) return 0; // treat as silence

  const maxLag = Math.floor(sampleRate / 60); // lowest ~60Hz
  const minLag = Math.floor(sampleRate / 1000); // highest ~1000Hz
  let bestLag = -1;
  let bestCorrelation = 0;

  for (let lag = minLag; lag < maxLag; lag++) {
    let correlation = 0;
    for (let i = 0; i < data.length - lag; i++) {
      correlation += data[i] * data[i + lag];
    }
    correlation /= data.length - lag;
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }

  if (bestLag <= 0) return 0;
  return sampleRate / bestLag;
}

/** Converts a frequency difference into semitones between two pitches. */
export function semitoneDiff(freqA: number, freqB: number): number {
  if (freqA <= 0 || freqB <= 0) return 0;
  return 12 * Math.log2(freqB / freqA);
}

async function loadAudioBuffer(url: string): Promise<AudioBuffer> {
  const ctx = Tone.getContext().rawContext as AudioContext;
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

export type EffectChainOptions = {
  preset: EffectPreset;
  voiceVolumeDb: number; // -60..0
  musicVolumeDb: number; // -60..0
};

/**
 * Builds a Tone.js effect chain for a given preset and returns the input
 * node to connect a source to, plus a dispose function.
 */
export function buildEffectChain(preset: EffectPreset) {
  const nodes: Tone.ToneAudioNode[] = [];
  let input: Tone.ToneAudioNode;

  const eq = new Tone.EQ3({ low: 0, mid: 0, high: 0 });
  const compressor = new Tone.Compressor({
    threshold: -18,
    ratio: 3,
    attack: 0.02,
    release: 0.25,
  });

  switch (preset) {
    case "clean": {
      input = eq;
      eq.connect(compressor);
      nodes.push(eq, compressor);
      break;
    }
    case "reverb": {
      const reverb = new Tone.Reverb({ decay: 3.2, wet: 0.35 });
      input = eq;
      eq.chain(reverb, compressor);
      nodes.push(eq, reverb, compressor);
      break;
    }
    case "echo": {
      const delay = new Tone.FeedbackDelay({ delayTime: 0.28, feedback: 0.32, wet: 0.3 });
      input = eq;
      eq.chain(delay, compressor);
      nodes.push(eq, delay, compressor);
      break;
    }
    case "warm": {
      eq.low.value = 3;
      eq.high.value = -2;
      const reverb = new Tone.Reverb({ decay: 1.2, wet: 0.15 });
      input = eq;
      eq.chain(reverb, compressor);
      nodes.push(eq, reverb, compressor);
      break;
    }
    case "pitch-up": {
      const pitch = new Tone.PitchShift({ pitch: 2 });
      input = eq;
      eq.chain(pitch, compressor);
      nodes.push(eq, pitch, compressor);
      break;
    }
    case "pitch-down": {
      const pitch = new Tone.PitchShift({ pitch: -2 });
      input = eq;
      eq.chain(pitch, compressor);
      nodes.push(eq, pitch, compressor);
      break;
    }
    default: {
      input = eq;
      eq.connect(compressor);
      nodes.push(eq, compressor);
    }
  }

  return {
    input,
    output: compressor,
    dispose: () => nodes.forEach((n) => n.dispose()),
  };
}

export type MixResult = {
  variant: FusionVariantKey;
  label: string;
  blob: Blob;
  url: string;
  durationSec: number;
};

/**
 * Renders one fusion variant offline: mixes the voice recording with the
 * instrumental stem (and, for "duet", the original vocal stem too),
 * applies the variant's signature effect chain, and returns an audio Blob.
 */
async function renderVariant(
  variant: FusionVariantKey,
  voiceUrl: string,
  instrumentalUrl: string,
  originalVocalUrl: string | null,
  voiceVolumePct: number,
  musicVolumePct: number,
  pitchShiftSemitones: number
): Promise<MixResult> {
  const [voiceBuf, instBuf, origVocalBuf] = await Promise.all([
    loadAudioBuffer(voiceUrl),
    loadAudioBuffer(instrumentalUrl),
    variant === "duet" && originalVocalUrl
      ? loadAudioBuffer(originalVocalUrl)
      : Promise.resolve(null),
  ]);

  const durationSec = Math.max(voiceBuf.duration, instBuf.duration);

  const result = await Tone.Offline(({ transport }) => {
    const voicePlayer = new Tone.Player(voiceBuf);
    const instPlayer = new Tone.Player(instBuf);
    const voiceGain = new Tone.Gain(voiceVolumePct / 100);
    const musicGain = new Tone.Gain(musicVolumePct / 100);
    const masterBus = new Tone.Gain(1);

    let voiceEffectPreset: EffectPreset = "clean";
    switch (variant) {
      case "studio":
        voiceEffectPreset = "clean";
        break;
      case "cinematic":
        voiceEffectPreset = "reverb";
        break;
      case "acoustic":
        voiceEffectPreset = "warm";
        break;
      case "duet":
        voiceEffectPreset = "clean";
        break;
      case "lofi":
        voiceEffectPreset = "warm";
        break;
      case "pitchdown":
        voiceEffectPreset = "pitch-down";
        break;
    }

    const { input: fxInput, output: fxOutput } = buildEffectChain(voiceEffectPreset);

    voicePlayer.connect(voiceGain);
    voiceGain.connect(fxInput as unknown as Tone.InputNode);
    (fxOutput as unknown as Tone.ToneAudioNode).connect(masterBus);

    instPlayer.connect(musicGain);
    musicGain.connect(masterBus);

    if (variant === "duet" && origVocalBuf) {
      const origPlayer = new Tone.Player(origVocalBuf);
      const origGain = new Tone.Gain(0.5);
      origPlayer.connect(origGain);
      origGain.connect(masterBus);
      origPlayer.start(0);
    }

    if (variant === "lofi") {
      const crusher = new Tone.BitCrusher({ bits: 6 });
      crusher.wet.value = 0.35;
      const filter = new Tone.Filter({ frequency: 3400, type: "lowpass" });
      masterBus.connect(crusher);
      crusher.connect(filter);
      filter.toDestination();
    } else if (variant === "pitchdown") {
      const instPitch = new Tone.PitchShift({ pitch: -2 });
      masterBus.disconnect();
      instPlayer.disconnect();
      musicGain.connect(instPitch);
      instPitch.connect(masterBus);
      masterBus.toDestination();
    } else {
      masterBus.toDestination();
    }

    voicePlayer.start(0);
    instPlayer.start(0);
    transport.start(0);
  }, durationSec + 0.5);

  const wavBlob = await audioBufferToWavBlob(result.get() as AudioBuffer);

  return {
    variant,
    label: FUSION_VARIANT_LABELS[variant],
    blob: wavBlob,
    url: URL.createObjectURL(wavBlob),
    durationSec,
  };
}

/**
 * Generates all 6 (or a subset of) fusion variants for a session.
 */
export async function generateFusionVariants(params: {
  voiceUrl: string;
  instrumentalUrl: string;
  originalVocalUrl: string | null;
  voiceVolumePct: number;
  musicVolumePct: number;
  variants?: FusionVariantKey[];
  onVariantDone?: (variant: FusionVariantKey) => void;
}): Promise<MixResult[]> {
  const {
    voiceUrl,
    instrumentalUrl,
    originalVocalUrl,
    voiceVolumePct,
    musicVolumePct,
    variants = ["studio", "cinematic", "acoustic", "duet", "lofi", "pitchdown"],
    onVariantDone,
  } = params;

  const results: MixResult[] = [];
  for (const variant of variants) {
    const mix = await renderVariant(
      variant,
      voiceUrl,
      instrumentalUrl,
      originalVocalUrl,
      voiceVolumePct,
      musicVolumePct,
      variant === "pitchdown" ? -2 : 0
    );
    results.push(mix);
    onVariantDone?.(variant);
  }
  return results;
}

/** Encodes a raw AudioBuffer into a WAV Blob (16-bit PCM). */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/** Applies a live monitoring effect chip (Clean/Reverb/Echo/Warm/Pitch) to a mic stream for preview. */
export function createLiveEffectMonitor(preset: EffectPreset) {
  const mic = new Tone.UserMedia();
  const { input, output, dispose } = buildEffectChain(preset);
  mic.connect(input as unknown as Tone.InputNode);
  (output as unknown as Tone.ToneAudioNode).toDestination();

  return {
    start: async () => {
      await Tone.start();
      await mic.open();
    },
    stop: () => {
      mic.close();
    },
    dispose: () => {
      mic.close();
      mic.dispose();
      dispose();
    },
  };
}
