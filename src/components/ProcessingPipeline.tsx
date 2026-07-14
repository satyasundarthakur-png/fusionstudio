import { Check, Loader2, UploadCloud, Scissors, Music4, Sliders, Wand2, AlertCircle } from "lucide-react";
import type { PipelineState, PipelineStepId } from "@/hooks/useAudioMixer";

type StepDef = {
  id: PipelineStepId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const STEPS: StepDef[] = [
  {
    id: "upload",
    label: "Uploading files",
    description: "Sending your voice and track to Supabase Storage.",
    icon: UploadCloud,
  },
  {
    id: "separate",
    label: "Separating vocals",
    description:
      "Running Demucs locally in your browser (WebGPU/WASM) to isolate the instrumental — no upload, no cost.",
    icon: Scissors,
  },
  {
    id: "align",
    label: "Pitch alignment",
    description: "Detecting key with autocorrelation and aligning pitch.",
    icon: Music4,
  },
  {
    id: "mix",
    label: "Mixing tracks",
    description: "Blending your voice with the instrumental across 6 variants.",
    icon: Sliders,
  },
  {
    id: "effects",
    label: "Applying effects",
    description: "Adding reverb, EQ, and compression to each fusion variant.",
    icon: Wand2,
  },
];

type ProcessingPipelineProps = {
  pipeline: PipelineState;
  /** Live status text for the "separate" step (e.g. Demucs model download %). */
  separationStatus?: string | null;
  separationProgressPct?: number | null;
};

export default function ProcessingPipeline({
  pipeline,
  separationStatus,
  separationProgressPct,
}: ProcessingPipelineProps) {
  return (
    <div className="space-y-4">
      {STEPS.map((step) => {
        const status = pipeline[step.id];
        const Icon = step.icon;
        const showLiveStatus =
          step.id === "separate" && status === "active" && separationStatus;

        return (
          <div
            key={step.id}
            className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
              status === "active"
                ? "border-saffron/50 bg-saffron/5"
                : status === "done"
                ? "border-emerald-500/30 bg-emerald-500/5"
                : status === "error"
                ? "border-red-500/40 bg-red-500/5"
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                status === "done"
                  ? "bg-emerald-500 text-midnight"
                  : status === "error"
                  ? "bg-red-500 text-white"
                  : status === "active"
                  ? "bg-saffron text-midnight"
                  : "bg-white/10 text-white/40"
              }`}
            >
              {status === "done" ? (
                <Check className="h-5 w-5" />
              ) : status === "active" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : status === "error" ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">{step.label}</p>
              <p className="text-xs text-white/50">
                {showLiveStatus
                  ? `${separationStatus}${
                      typeof separationProgressPct === "number"
                        ? ` (${Math.round(separationProgressPct)}%)`
                        : ""
                    }`
                  : step.description}
              </p>
            </div>
            <div className="w-28 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  status === "done"
                    ? "w-full bg-emerald-500"
                    : status === "active"
                    ? "w-2/3 bg-saffron animate-pulse"
                    : status === "error"
                    ? "w-1/3 bg-red-500"
                    : "w-0"
                }`}
                style={
                  step.id === "separate" &&
                  status === "active" &&
                  typeof separationProgressPct === "number"
                    ? { width: `${separationProgressPct}%` }
                    : undefined
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
