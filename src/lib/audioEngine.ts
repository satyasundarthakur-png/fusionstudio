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

/**
 * Measures the RMS (root-mean-square) loudness of an AudioBuffer, averaged
 * across channels — a reasonable proxy for "how loud does this sound"
 * (closer to perceived loudness than peak amplitude, which is thrown off by
 * single transient spikes). Silence-only regions are skipped from the
 * average so a long quiet intro doesn't make a track look quieter than it
 * actually is during the parts where someone's actually singing.
 */
function measureRms(buffer: AudioBuffer): number {
  const SILENCE_THRESHOLD = 0.0025;
  let sumSquares = 0;
  let count = 0;

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    // Sampling every Nth frame is plenty for a loudness estimate and much
    // faster than reading every single sample on a multi-minute track.
    const stride = Math.max(1, Math.floor(data.length / 200_000));
    for (let i = 0; i < data.length; i += stride) {
      const v = data[i];
      if (Math.abs(v) < SILENCE_THRESHOLD) continue;
      sumSquares += v * v;
      count++;
    }
  }

  if (count === 0) return 0;
  return Math.sqrt(sumSquares / count);
}

/** Converts a linear amplitude ratio to decibels. */
function ratioToDb(ratio: number): number {
  return 20 * Math.log10(Math.max(ratio, 1e-6));
}

export type AutoGainResult = {
  /** Multiplier to apply to the vocal's gain so its loudness matches the
   * instrumental's. 1 = no change. */
  multiplier: number;
  /** Same adjustment expressed in dB, for display ("boosted your vocal by
   * +8.2dB to match the track"). */
  adjustmentDb: number;
};

/**
 * Compares the measured loudness of the recorded/uploaded vocal against the
 * instrumental track and returns a gain multiplier that would bring the
 * vocal up (or down) to match — the actual fix for "the uploaded music is
 * loud but my recorded voice is quiet". Clamped to a sane range so a
 * near-silent recording doesn't get amplified into pure noise, and capped
 * on the downward side too in case the vocal was recorded hotter than the
 * track.
 */
export function computeAutoVocalGain(
  voiceBuf: AudioBuffer,
  instrumentalBuf: AudioBuffer
): AutoGainResult {
  const voiceRms = measureRms(voiceBuf);
  const instRms = measureRms(instrumentalBuf);

  if (voiceRms <= 0 || instRms <= 0) {
    return { multiplier: 1, adjustmentDb: 0 };
  }

  const rawMultiplier = instRms / voiceRms;
  // Clamp: don't boost more than +18dB (a near-silent recording would
  // otherwise get amplified into a wash of hiss/noise-floor) and don't cut
  // more than -9dB (a vocal recorded hot shouldn't be buried).
  const MIN_MULTIPLIER = 10 ** (-9 / 20);
  const MAX_MULTIPLIER = 10 ** (18 / 20);
  const multiplier = Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, rawMultiplier));

  return { multiplier, adjustmentDb: ratioToDb(multiplier) };
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
  pitchShiftSemitones: number,
  autoGainMultiplier: number,
  keyShiftSemitones: number
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
    // The user's manual volume slider is layered on top of the measured
    // auto-gain adjustment, not instead of it — auto-gain corrects for the
    // mismatch between how loud the recording and the track actually are;
    // the slider is then the person's creative choice on top of a
    // level-matched starting point.
    const voiceGain = new Tone.Gain((voiceVolumePct / 100) * autoGainMultiplier);
    const musicGain = new Tone.Gain(musicVolumePct / 100);
    const masterBus = new Tone.Gain(1);
    // A limiter on the master bus catches any clipping introduced by
    // boosting a quiet vocal up to match a loud track — without this, a
    // recording that needed +12dB of auto-gain could push the mix over 0dB
    // and distort.
    const limiter = new Tone.Limiter(-1);

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

    // Key alignment: shifts the recorded/uploaded vocal by the detected
    // semitone difference so it's in the same key as the instrumental,
    // before any stylistic effect (reverb, warmth, etc.) is applied on top.
    // This is what "detect the singer's key and align it with the music"
    // actually means in audio terms — matching pitch/key, not compressing
    // dynamics (that's what the limiter above is for) or time-stretching
    // (tempo alignment is a separate, much harder problem this doesn't
    // attempt). Skipped entirely when the shift is 0 to avoid an unneeded
    // processing node.
    if (keyShiftSemitones !== 0) {
      const keyAlign = new Tone.PitchShift({ pitch: keyShiftSemitones });
      voiceGain.connect(keyAlign);
      keyAlign.connect(fxInput as unknown as Tone.InputNode);
    } else {
      voiceGain.connect(fxInput as unknown as Tone.InputNode);
    }
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
      filter.connect(limiter);
      limiter.toDestination();
    } else if (variant === "pitchdown") {
      const instPitch = new Tone.PitchShift({ pitch: -2 });
      masterBus.disconnect();
      instPlayer.disconnect();
      musicGain.connect(instPitch);
      instPitch.connect(masterBus);
      masterBus.connect(limiter);
      limiter.toDestination();
    } else {
      masterBus.connect(limiter);
      limiter.toDestination();
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
  autoBalanceVocal?: boolean;
  /** Semitones to shift the vocal by to match the instrumental's detected
   * key (0 = no shift / feature disabled). */
  keyShiftSemitones?: number;
  onVariantDone?: (variant: FusionVariantKey) => void;
  onAutoGainComputed?: (result: AutoGainResult) => void;
}): Promise<MixResult[]> {
  const {
    voiceUrl,
    instrumentalUrl,
    originalVocalUrl,
    voiceVolumePct,
    musicVolumePct,
    variants = ["studio", "cinematic", "acoustic", "duet", "lofi", "pitchdown"],
    autoBalanceVocal = true,
    keyShiftSemitones = 0,
    onVariantDone,
    onAutoGainComputed,
  } = params;

  // Measure loudness once up front (not per-variant) so a quiet recording
  // gets boosted to match the track's level automatically, before any of
  // the person's manual volume sliders are applied on top.
  let autoGainMultiplier = 1;
  if (autoBalanceVocal) {
    try {
      const [voiceBuf, instBuf] = await Promise.all([
        loadAudioBuffer(voiceUrl),
        loadAudioBuffer(instrumentalUrl),
      ]);
      const autoGain = computeAutoVocalGain(voiceBuf, instBuf);
      autoGainMultiplier = autoGain.multiplier;
      onAutoGainComputed?.(autoGain);
    } catch (err) {
      console.warn("Auto vocal gain measurement failed, using unadjusted volume.", err);
    }
  }

  const results: MixResult[] = [];
  for (const variant of variants) {
    const mix = await renderVariant(
      variant,
      voiceUrl,
      instrumentalUrl,
      originalVocalUrl,
      voiceVolumePct,
      musicVolumePct,
      variant === "pitchdown" ? -2 : 0,
      autoGainMultiplier,
      keyShiftSemitones
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
