import { useEffect, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import jsPDF from "jspdf";
import { FileDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import FusionCard from "@/components/FusionCard";
import VoiceCoach from "@/components/VoiceCoach";
import { sessionStore } from "@/lib/sessionStore";
import { supabase, saveFusion } from "@/lib/supabase";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";

export default function Results() {
  const navigate = useNavigate();
  const { upload } = useSupabaseStorage();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const input = sessionStore.input;
  const result = sessionStore.result;

  useEffect(() => {
    if (result.variants.length === 0) {
      navigate({ to: "/studio" });
    }
  }, [result.variants.length, navigate]);

  if (result.variants.length === 0) return null;

  const songName = input.trackMeta?.name?.replace(/\.[^/.]+$/, "") ?? "your track";

  const handleSaveSession = async () => {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        navigate({ to: "/login" });
        return;
      }

      // Upload each fusion variant, keeping both the signed URL (for
      // immediate playback) and the permanent storage path (for the
      // 30-day retention cleanup job to delete later).
      const uploadedVariants = await Promise.all(
        result.variants.map(async (v) => {
          const up = await upload("fusions", v.blob, user.id, `${v.variant}.wav`);
          return {
            name: v.label,
            url: up?.signedUrl ?? v.url,
            path: up?.path ?? "",
            effect: v.variant,
            duration: v.durationSec,
          };
        })
      );

      // The instrumental produced by in-browser Demucs separation only
      // exists as a local blob: URL until we persist it — upload it to
      // Storage so it survives past this browser session and can be
      // cleaned up by path later. If separation was skipped, the
      // "instrumental" is just the original uploaded track.
      let instrumentalUrl = result.instrumentalUrl;
      let instrumentalPath = input.trackPath;
      if (result.instrumentalBlob) {
        const instUpload = await upload(
          "fusions",
          result.instrumentalBlob,
          user.id,
          "instrumental.wav"
        );
        instrumentalUrl = instUpload?.signedUrl ?? result.instrumentalUrl;
        instrumentalPath = instUpload?.path ?? null;
      }

      await saveFusion({
        user_id: user.id,
        voice_url: input.voiceUrl,
        voice_path: input.voicePath,
        track_url: input.trackUrl,
        track_path: input.trackPath,
        instrumental_url: instrumentalUrl,
        instrumental_path: instrumentalPath,
        variants: uploadedVariants,
        settings: {
          voice_vol: input.voiceVolumePct,
          music_vol: input.musicVolumePct,
          languages: input.languages,
          model: input.separationModel,
          quality: input.quality,
        },
        ai_tips: result.aiTips,
      });

      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("SwarFusion — Session Summary", 14, 20);
    doc.setFontSize(11);
    doc.text(`Track: ${songName}`, 14, 32);
    doc.text(`Languages: ${input.languages.join(", ") || "—"}`, 14, 40);
    doc.text(`Voice volume: ${input.voiceVolumePct}%   Music volume: ${input.musicVolumePct}%`, 14, 48);
    doc.text(`Separation model: ${input.separationModel}   Quality: ${input.quality}`, 14, 56);

    doc.setFontSize(13);
    doc.text("Fusion Variants", 14, 70);
    doc.setFontSize(11);
    result.variants.forEach((v, i) => {
      doc.text(`${i + 1}. ${v.label} — ${Math.round(v.durationSec)}s`, 14, 78 + i * 8);
    });

    const tipsStartY = 78 + result.variants.length * 8 + 12;
    doc.setFontSize(13);
    doc.text("AI Vocal Coaching Tips", 14, tipsStartY);
    doc.setFontSize(10);
    result.aiTips.forEach((tip, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${tip}`, 180);
      doc.text(lines, 14, tipsStartY + 8 + i * 14);
    });

    doc.save(`SwarFusion-${songName.replace(/\s+/g, "_")}.pdf`);
  };

  const featuredVariant = result.variants.find((v) => v.variant === "studio") ?? result.variants[0];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-logo text-3xl mb-1">Your Fusion Results</h1>
          <p className="text-white/50">
            {result.variants.length} variant{result.variants.length === 1 ? "" : "s"} ready for "{songName}"
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPdf}>
            <FileDown className="h-4 w-4" /> Export summary PDF
          </Button>
          <Button onClick={handleSaveSession} disabled={saving || saved}>
            {saving ? "Saving…" : saved ? "Saved to Library" : "Save to Library"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {result.variants.map((mix) => (
          <FusionCard
            key={mix.variant}
            mix={mix}
            isFeatured={mix.variant === featuredVariant.variant}
            songName={songName}
          />
        ))}
      </div>

      <VoiceCoach tips={result.aiTips} />

      <div className="flex justify-center pt-4">
        <Button variant="ghost" asChild>
          <Link to="/studio">
            <RefreshCw className="h-4 w-4" /> Start another fusion
          </Link>
        </Button>
      </div>
    </div>
  );
}
