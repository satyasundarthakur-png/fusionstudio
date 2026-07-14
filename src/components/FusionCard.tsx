import { Download, Share2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MiniPlayer from "@/components/MiniPlayer";
import type { MixResult } from "@/lib/audioEngine";

type FusionCardProps = {
  mix: MixResult;
  isFeatured?: boolean;
  songName: string;
};

const DESCRIPTIONS: Record<string, string> = {
  studio: "Balanced voice + instrumental with light EQ and reverb — your best all-round take.",
  cinematic: "Large hall reverb with a wide stereo image, like a playback recording studio.",
  acoustic: "Intimate room ambience with soft-knee compression for a warm, close-mic feel.",
  duet: "Your voice blended with the original vocals at 50% for a duet-style rendition.",
  lofi: "Vinyl-style filtering and tape saturation for a relaxed, lo-fi chill vibe.",
  pitchdown: "The full studio treatment, pitched down two semitones for a deeper tone.",
};

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function FusionCard({ mix, isFeatured, songName }: FusionCardProps) {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = mix.url;
    a.download = `SwarFusion-${mix.variant}-${songName.replace(/\s+/g, "_")}.wav`;
    a.click();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Check out my "${mix.label}" fusion of "${songName}" made with SwarFusion 🎤🎶`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <Card className={isFeatured ? "ring-1 ring-saffron/60 relative" : "relative"}>
      {isFeatured && (
        <span className="absolute -top-2.5 right-4 flex items-center gap-1 rounded-full bg-saffron px-2.5 py-0.5 text-xs font-semibold text-midnight">
          <Sparkles className="h-3 w-3" /> Best match
        </span>
      )}
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{mix.label}</CardTitle>
        <span className="text-xs text-white/50">{formatDuration(mix.durationSec)}</span>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-white/60">{DESCRIPTIONS[mix.variant]}</p>
        <MiniPlayer src={mix.url} accent={isFeatured ? "saffron" : "magenta"} />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleDownload} className="flex-1">
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="flex-1">
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
