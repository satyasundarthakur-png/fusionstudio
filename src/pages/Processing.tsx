import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      });

      navigate({ to: "/results" });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="font-logo text-3xl mb-2">Fusing your Swar…</h1>
        <p className="text-white/50">
          Sit tight while we separate, align, and mix your voice into six studio-quality variants.
          Vocal separation runs locally in your browser and can take a few minutes on the first run
          while the model downloads — completely free, and nothing leaves your device.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Processing pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ProcessingPipeline
            pipeline={mixer.pipeline}
            separationStatus={mixer.separationStatus}
            separationProgressPct={mixer.separationProgressPct}
          />
          {mixer.error && (
            <p className="text-sm text-red-400 mt-4">{mixer.error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
