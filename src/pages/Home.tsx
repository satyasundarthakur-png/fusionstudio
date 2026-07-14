import { Link } from "@tanstack/react-router";
import { Mic2, Music4, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Mic2,
    title: "Record or upload your voice",
    description: "Sing along to your favorite Bollywood, classical, or folk track — live or from a saved file.",
  },
  {
    icon: Music4,
    title: "AI vocal separation",
    description: "Demucs isolates the instrumental from any track so your voice takes center stage.",
  },
  {
    icon: Wand2,
    title: "Studio-grade effects",
    description: "Reverb, echo, warmth, and pitch shifting powered by Tone.js — no DAW required.",
  },
  {
    icon: Sparkles,
    title: "6 fusion variants + AI coaching",
    description: "Get Studio, Cinematic, Acoustic, Duet, Lo-fi, and Pitch-shifted mixes, plus tips from Groq.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
        <p className="text-magenta font-medium tracking-wide text-sm mb-3">
          स्वर • Swar — the musical note within you
        </p>
        <h1 className="font-logo text-4xl sm:text-6xl font-bold mb-6">
          Fuse your voice with <span className="text-saffron">Sur</span>
        </h1>
        <p className="text-white/60 max-w-2xl mx-auto mb-8 text-lg">
          Record your vocals over "Tum Hi Ho," a Rabindra Sangeet classic, or a Punjabi folk anthem —
          SwarFusion separates the instrumental, aligns your pitch, and mixes six studio-quality
          fusion variants in minutes.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link to="/studio">Start a Fusion</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/library">See My Fusions</Link>
          </Button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-24 grid grid-cols-1 sm:grid-cols-2 gap-5">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <CardContent className="flex gap-4 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-saffron/15 text-saffron">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-white/60">{f.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
