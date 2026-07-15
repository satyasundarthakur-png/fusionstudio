import { Download, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import MiniPlayer from "@/components/MiniPlayer";
import { downloadBlob } from "@/lib/utils";
import type { MixResult } from "@/lib/audioEngine";

type FusionCardProps = {
  mix: MixResult;
  isFeatured?: boolean;
  songName: string;
};

const VARIANT_META: Record<string, { label: string; description: string; accent: string; tag: string }> = {
  studio: {
    label: "Studio",
    description: "Balanced voice + instrumental with light EQ and reverb — your best all-round take.",
    accent: "#ef9f27",
    tag: "best mix",
  },
  cinematic: {
    label: "Cinematic",
    description: "Large hall reverb with a wide stereo image, like a playback recording studio.",
    accent: "#7c6aff",
    tag: "epic",
  },
  acoustic: {
    label: "Acoustic",
    description: "Intimate room ambience with soft-knee compression for a warm, close-mic feel.",
    accent: "#4ade80",
    tag: "warm",
  },
  duet: {
    label: "Duet",
    description: "Your voice blended with the original vocals at 50% for a duet-style rendition.",
    accent: "#d4538a",
    tag: "duet",
  },
  lofi: {
    label: "Lo-fi",
    description: "Vinyl-style filtering and tape saturation for a relaxed, lo-fi chill vibe.",
    accent: "#fb923c",
    tag: "chill",
  },
  pitchdown: {
    label: "Pitch Down",
    description: "The full studio treatment, pitched down two semitones for a deeper tone.",
    accent: "#38bdf8",
    tag: "deep",
  },
};

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function FusionCard({ mix, isFeatured, songName }: FusionCardProps) {
  const meta = VARIANT_META[mix.variant] ?? {
    label: mix.label,
    description: "",
    accent: "#ef9f27",
    tag: "mix",
  };

  const handleDownload = () => {
    downloadBlob(mix.blob, `SwarFusion-${mix.variant}-${songName.replace(/\s+/g, "_")}.wav`);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Check out my "${meta.label}" fusion of "${songName}" made with SwarFusion 🎤🎶`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div
      className="relative rounded-2xl border bg-white/[0.025] backdrop-blur-sm overflow-hidden card-hover transition-all duration-300"
      style={{
        borderColor: isFeatured ? `${meta.accent}40` : "rgba(255,255,255,0.07)",
        boxShadow: isFeatured ? `0 0 32px ${meta.accent}18, 0 4px 24px rgba(0,0,0,0.3)` : "0 4px 24px rgba(0,0,0,0.25)",
      }}
    >
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${meta.accent}80, transparent)` }}
      />

      {/* Featured badge */}
      {isFeatured && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-midnight"
          style={{ background: `linear-gradient(135deg, ${meta.accent}, #f5c842)` }}>
          <Sparkles className="h-2.5 w-2.5" /> Best match
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pr-20">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-white/90">{meta.label}</h3>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: `${meta.accent}18`, color: meta.accent }}
              >
                {meta.tag}
              </span>
            </div>
            <span className="text-xs font-mono text-white/35">{formatDuration(mix.durationSec)}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-white/50 leading-relaxed">{meta.description}</p>

        {/* Player */}
        <MiniPlayer src={mix.url} accent={isFeatured ? "saffron" : "magenta"} />

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleDownload} className="flex-1 text-xs">
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="flex-1 text-xs">
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
        </div>
      </div>
    </div>
  );
}
