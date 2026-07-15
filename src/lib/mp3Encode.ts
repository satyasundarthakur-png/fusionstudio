import { Mp3Encoder } from "@breezystack/lamejs";

/** Converts a Float32 PCM channel (-1..1 range) to 16-bit signed integer PCM. */
function floatTo16BitPcm(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

/**
 * Encodes a decoded AudioBuffer to an MP3 Blob, entirely in the browser.
 *
 * Note: this uses the `@breezystack/lamejs` fork, not the original `lamejs`
 * npm package — the original's published CommonJS build is broken (its
 * `Lame.js` references `MPEGMode` as an implicit global that's never
 * actually defined in that build, so constructing `Mp3Encoder` throws
 * `ReferenceError: MPEGMode is not defined` immediately). This fork fixes
 * that packaging bug while keeping the same pure-JS, no-WASM, no-server
 * encoding approach.
 */
export function audioBufferToMp3Blob(buffer: AudioBuffer, kbps = 128): Blob {
  const channels = Math.min(2, buffer.numberOfChannels);
  const sampleRate = buffer.sampleRate;
  const encoder = new Mp3Encoder(channels, sampleRate, kbps);

  const left = floatTo16BitPcm(buffer.getChannelData(0));
  const right = channels > 1 ? floatTo16BitPcm(buffer.getChannelData(1)) : undefined;

  const chunks: Uint8Array[] = [];
  const blockSize = 1152; // lamejs's required per-call frame size

  for (let i = 0; i < left.length; i += blockSize) {
    const leftChunk = left.subarray(i, i + blockSize);
    const rightChunk = right ? right.subarray(i, i + blockSize) : undefined;
    const encoded = encoder.encodeBuffer(leftChunk, rightChunk);
    if (encoded.length > 0) chunks.push(encoded);
  }

  const final = encoder.flush();
  if (final.length > 0) chunks.push(final);

  return new Blob(chunks as BlobPart[], { type: "audio/mp3" });
}

/**
 * Decodes an arbitrary audio Blob (webm, wav, whatever the browser's
 * MediaRecorder produced) and re-encodes it as MP3.
 */
export async function blobToMp3Blob(blob: Blob, kbps = 128): Promise<Blob> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx: AudioContext = new AudioCtx();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return audioBufferToMp3Blob(audioBuffer, kbps);
  } finally {
    await ctx.close();
  }
}
