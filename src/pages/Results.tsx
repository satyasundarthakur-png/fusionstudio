import { useEffect } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import jsPDF from "jspdf";
import { FileDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import FusionCard from "@/components/FusionCard";
import VoiceCoach from "@/components/VoiceCoach";
import { sessionStore } from "@/lib/sessionStore";

export default function Results() {
  const navigate = useNavigate();

  const input = sessionStore.input;
  const result = sessionStore.result;

  useEffect(() => {
    if (result.variants.length === 0) navigate({ to: "/studio" });
  }, [result.variants.length, navigate]);

  if (result.variants.length === 0) return null;

  const songName = input.trackMeta?.name?.replace(/\.[^/.]+$/, "") ?? "your track";

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
    const tipsY = 78 + result.variants.length * 8 + 12;
    doc.setFontSize(13);
    doc.text("AI Vocal Coaching Tips", 14, tipsY);
    doc.setFontSize(10);
    result.aiTips.forEach((tip, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${tip}`, 180);
      doc.text(lines, 14, tipsY + 8 + i * 14);
    });
    doc.save(`SwarFusion-${songName.replace(/\s+/g, "_")}.pdf`);
  };

  const featuredVariant = result.variants.find((v) => v.variant === "studio") ?? result.variants[0];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs text-white/35 uppercase tracking-widest mb-1.5">Ready</p>
          <h1 className="font-logo text-3xl gradient-text-saffron w-fit">Your Fusion Results</h1>
          <p className="text-white/45 text-sm mt-1">
            {result.variants.length} variant{result.variants.length === 1 ? "" : "s"} ready for &ldquo;{songName}&rdquo;
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <FileDown className="h-3.5 w-3.5" /> Export PDF
          </Button>
        </div>
      </div>

      {result.separationWarning && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-amber-400">
          {result.separationWarning}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {result.variants.map((mix) => (
          <FusionCard
            key={mix.variant}
            mix={mix}
            isFeatured={mix.variant === featuredVariant.variant}
            songName={songName}
          />
        ))}
      </div>

      {/* AI coaching */}
      <VoiceCoach tips={result.aiTips} />

      {/* Start over */}
      <div className="flex justify-center pt-2">
        <Button variant="ghost" asChild className="text-white/45 hover:text-white/70">
          <Link to="/studio">
            <RefreshCw className="h-3.5 w-3.5" /> Start another fusion
          </Link>
        </Button>
      </div>
    </div>
  );
}
