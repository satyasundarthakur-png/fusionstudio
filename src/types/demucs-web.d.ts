declare module "demucs-web" {
  import type { InferenceSession } from "onnxruntime-web";

  export const CONSTANTS: {
    SAMPLE_RATE: number;
    FFT_SIZE: number;
    HOP_SIZE: number;
    TRAINING_SAMPLES: number;
    MODEL_SPEC_BINS: number;
    MODEL_SPEC_FRAMES: number;
    SEGMENT_OVERLAP: number;
    TRACKS: string[];
    DEFAULT_MODEL_URL: string;
  };

  export type StemChannels = { left: Float32Array; right: Float32Array };

  export type SeparationResult = {
    drums: StemChannels;
    bass: StemChannels;
    other: StemChannels;
    vocals: StemChannels;
  };

  export type ProgressInfo = {
    progress: number;
    currentSegment: number;
    totalSegments: number;
  };

  export interface DemucsProcessorOptions {
    ort: typeof import("onnxruntime-web");
    modelPath?: string;
    sessionOptions?: InferenceSession.SessionOptions;
    onProgress?: (info: ProgressInfo) => void;
    onLog?: (phase: string, message: string) => void;
    onDownloadProgress?: (loaded: number, total: number) => void;
  }

  export class DemucsProcessor {
    constructor(options: DemucsProcessorOptions);
    loadModel(pathOrBuffer?: string | ArrayBuffer): Promise<void>;
    separate(left: Float32Array, right: Float32Array): Promise<SeparationResult>;
  }
}
