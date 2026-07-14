import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import ProcessingPipeline from "@/components/ProcessingPipeline";
import { useAudioMixer } from "@/hooks/useAudioMixer";
import { sessionStore } from "@/lib/sessionStore";
import { getCoachingTips } from "@/lib/groq";
import { FUSION_VARIANT_LABELS, type FusionVariantKey } from "@/lib/audioEngine";

const TOP3: FusionVariantKey[] = ["studio", "cinematic", "acoustic"];
const ALL6: FusionVariantKey[] = ["studio", "cinematic", "acoustic", "duet", "lofi", "pitchdown"];

export default function Processing() {
  const navigate = useNavigate();
  const mixer = useAudioMixer();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const input = sessionStore.input;
    if (!input.voiceUrl || !input.trackUrl) {
      navigate({ to: "/studio" });
      return;
    }

    const variantKeys =
      input.variantMode === "all"
        ? ALL6
        : input.variantMode === "top3"
        ? TOP3
        : input.customVariants;

    (async () => {
      const results = await mixer.run({
        voiceUrl: input.voiceUrl!,
        trackUrl: input.trackUrl!,
        voiceVolumePct: input.voiceVolumePct,
        musicVolumePct: input.musicVolumePct,
        variantKeys,
        skipSeparation: input.separationModel === "skip",
      });

      if (results.length === 0) return;

      const tips = await getCoachingTips({
        songName: input.trackMeta?.name ?? "your uploaded track",
        languages: input.languages,
        variantNames: results.map((r) => FUSION_VARIANT_LABELS[r.variant]),
        voiceVolume: input.voiceVolumePct,
        musicVolume: input.musicVolumePct,
      });

      sessionStore.setResult({
        instrumentalUrl: mixer.instrumentalUrl,
        instrumentalBlob: mixer.instrumentalBlob,
        variants: results,
        aiTips: tips,
        separationWarning: mixer.separationWarning,
      });

      navigate({ to: "/results" });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(239,159,39,0.06) 0%, transparent 70%)" }}
      />

      {/* Pulsing rings */}
      <div className="relative flex items-center justify-center mb-10">
        <div
          className="ring-1-anim absolute rounded-full border border-saffron/15"
          style={{ width: 200, height: 200 }}
        />
        <div
          className="ring-2-anim absolute rounded-full border border-saffron/10"
          style={{ width: 150, height: 150 }}
        />
        <div
          className="ring-3-anim absolute rounded-full border border-saffron/20"
          style={{ width: 100, height: 100 }}
        />
        {/* Center icon */}
        <div
          className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "linear-gradient(135deg, rgba(239,159,39,0.2), rgba(212,83,138,0.15))", border: "1px solid rgba(239,159,39,0.3)" }}
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-saffron fill-none stroke-current" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <div className="text-center mb-10 max-w-lg">
        <h1 className="font-logo text-3xl mb-3 gradient-text-saffron w-fit mx-auto">
          Fusing your Swar…
        </h1>
        <p className="text-white/45 text-sm leading-relaxed">
          Sit tight while we separate, align, and mix your voice into studio-quality variants.
          Vocal separation runs locally in your browser — nothing leaves your device.
        </p>
      </div>

      {/* Pipeline card */}
      <div className="w-full max-w-md rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5 shadow-card">
        <p className="text-xs text-white/40 uppercase tracking-widest mb-4">Processing pipeline</p>
        <ProcessingPipeline
          pipeline={mixer.pipeline}
          separationStatus={mixer.separationStatus}
          separationProgressPct={mixer.separationProgressPct}
        />
        {mixer.separationWarning && (
          <p className="text-xs text-amber-400 mt-4 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
            {mixer.separationWarning}
          </p>
        )}
        {mixer.error && (
          <p className="text-xs text-red-400 mt-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            {mixer.error}
          </p>
        )}
      </div>
    </div>
  );
}
