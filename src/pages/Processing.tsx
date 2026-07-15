import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Download } from "lucide-react";
import ProcessingPipeline from "@/components/ProcessingPipeline";
import { useAudioMixer } from "@/hooks/useAudioMixer";
import { sessionStore } from "@/lib/sessionStore";
import { getCoachingTips } from "@/lib/groq";
import { downloadBlob } from "@/lib/utils";
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
        autoBalanceVocal: input.autoBalanceVocal,
        autoAlignKey: input.autoAlignKey,
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
        vocalsBlob: mixer.vocalsBlob,
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
        {(mixer.instrumentalBlob || mixer.vocalsBlob) && (
          <div className="mt-4 rounded-lg bg-teal-500/8 border border-teal-500/20 px-3 py-3 space-y-2">
            <p className="text-xs text-white/60">
              Separation is done — grab these now if you just want the stems (no need to wait for the full fusion):
            </p>
            <div className="flex flex-wrap gap-2">
              {mixer.instrumentalBlob && (
                <button
                  onClick={() => downloadBlob(mixer.instrumentalBlob!, "instrumental.wav")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-white/95 hover:border-white/25 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Instrumental (music only)
                </button>
              )}
              {mixer.vocalsBlob && (
                <button
                  onClick={() => downloadBlob(mixer.vocalsBlob!, "vocals.wav")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-white/95 hover:border-white/25 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Original vocals (isolated)
                </button>
              )}
            </div>
          </div>
        )}
        {mixer.timeoutOffer && (
          <div className="mt-4 rounded-lg bg-saffron/10 border border-saffron/25 px-3 py-3 space-y-2.5">
            <p className="text-xs text-white/70">
              Still separating{mixer.timeoutOffer.progressPct >= 1 ? ` (${Math.round(mixer.timeoutOffer.progressPct)}%)` : ""} —
              this is taking longer than usual. Want to give it 5 more minutes rather than stopping now?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => mixer.respondToTimeoutOffer(true)}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-midnight"
                style={{ background: "linear-gradient(135deg, #ef9f27, #f5c842)" }}
              >
                Add 5 more minutes
              </button>
              <button
                onClick={() => mixer.respondToTimeoutOffer(false)}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold border border-white/15 text-white/65 hover:text-white/90 hover:border-white/25"
              >
                Stop and continue without it
              </button>
            </div>
          </div>
        )}
        {mixer.detectedKeyShiftSemitones !== 0 && (
          <p className="text-xs text-white/50 mt-4 rounded-lg bg-white/[0.03] border border-white/[0.07] px-3 py-2">
            🎼 Auto-aligned: your vocal was shifted by{" "}
            <span className="text-magenta font-mono">
              {mixer.detectedKeyShiftSemitones > 0 ? "+" : ""}
              {mixer.detectedKeyShiftSemitones} semitone{Math.abs(mixer.detectedKeyShiftSemitones) === 1 ? "" : "s"}
            </span>{" "}
            to match the track's key.
          </p>
        )}
        {mixer.autoGainInfo && Math.abs(mixer.autoGainInfo.adjustmentDb) >= 0.5 && (
          <p className="text-xs text-white/50 mt-4 rounded-lg bg-white/[0.03] border border-white/[0.07] px-3 py-2">
            🎚️ Auto-balanced: your vocal was {mixer.autoGainInfo.adjustmentDb > 0 ? "boosted" : "reduced"} by{" "}
            <span className="text-saffron font-mono">
              {mixer.autoGainInfo.adjustmentDb > 0 ? "+" : ""}
              {mixer.autoGainInfo.adjustmentDb.toFixed(1)}dB
            </span>{" "}
            to match the track's loudness.
          </p>
        )}
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
