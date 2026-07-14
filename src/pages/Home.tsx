import { Link } from "@tanstack/react-router";
import { Mic2, Music4, Sparkles, Wand2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Mic2,
    title: "Record or upload your voice",
    description: "Sing along to your favourite Bollywood, classical, or folk track — live or from a saved file.",
    accent: "saffron",
  },
  {
    icon: Music4,
    title: "AI vocal separation",
    description: "Demucs isolates the instrumental from any track so your voice takes centre stage — in-browser, free.",
    accent: "magenta",
  },
  {
    icon: Wand2,
    title: "Studio-grade effects",
    description: "Reverb, echo, warmth, and pitch shifting powered by Tone.js. No DAW, no downloads required.",
    accent: "saffron",
  },
  {
    icon: Sparkles,
    title: "6 fusion variants + AI coaching",
    description: "Get Studio, Cinematic, Acoustic, Duet, Lo-fi, and Pitch-shifted mixes, plus Groq-powered vocal tips.",
    accent: "magenta",
  },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* ── Ambient glow orbs ─────────────────────── */}
      <div
        className="glow-orb-a pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full"
        style={{ background: "radial-gradient(ellipse at center, rgba(239,159,39,0.09) 0%, transparent 70%)" }}
      />
      <div
        className="glow-orb-b pointer-events-none absolute top-64 -right-40 h-[400px] w-[400px] rounded-full"
        style={{ background: "radial-gradient(ellipse at center, rgba(212,83,138,0.07) 0%, transparent 70%)" }}
      />

      {/* ── Hero ───────────────────────────────────── */}
      <section className="relative max-w-5xl mx-auto px-4 pt-24 pb-20 text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full border border-saffron/25 bg-saffron/8 px-4 py-1.5 mb-7">
          <span className="h-1.5 w-1.5 rounded-full bg-saffron animate-pulse-slow" />
          <span className="text-xs font-medium text-saffron tracking-widest uppercase">
            स्वर • Swar — the musical note within you
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-logo text-5xl sm:text-7xl font-bold mb-6 leading-[1.1]">
          Fuse your voice{" "}
          <br className="hidden sm:block" />
          with{" "}
          <span className="gradient-text-saffron italic">Sur</span>
        </h1>

        {/* Tanpura string decoration */}
        <div className="relative mx-auto mb-8 h-4 max-w-xs">
          <svg viewBox="0 0 320 16" className="w-full h-full tanpura-string">
            <path
              d="M 0 8 Q 80 0 160 8 Q 240 16 320 8"
              fill="none"
              stroke="url(#string-grad)"
              strokeWidth="1"
            />
            <defs>
              <linearGradient id="string-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#ef9f27" stopOpacity="0" />
                <stop offset="30%"  stopColor="#ef9f27" stopOpacity="0.8" />
                <stop offset="70%"  stopColor="#f5c842" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f5c842" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <p className="text-white/55 max-w-xl mx-auto mb-10 text-lg leading-relaxed">
          Record your vocals over "Tum Hi Ho", a Rabindra Sangeet classic, or any track you love.
          SwarFusion separates the instrumental, aligns your pitch, and delivers six studio-quality
          fusion variants in minutes — entirely in your browser.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Button asChild size="lg" className="gap-2 px-8">
            <Link to="/studio">
              Start a Fusion
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/library">My Fusions</Link>
          </Button>
        </div>
      </section>

      {/* ── Feature grid ───────────────────────────── */}
      <section className="relative max-w-5xl mx-auto px-4 pb-28 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map((f) => {
          const accent = f.accent === "saffron" ? "#ef9f27" : "#d4538a";
          return (
            <div
              key={f.title}
              className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 flex gap-4 card-hover"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110"
                style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
              >
                <f.icon className="h-5 w-5" style={{ color: accent }} />
              </div>
              <div>
                <h3 className="font-semibold text-white/90 mb-1.5 text-sm">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.description}</p>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
