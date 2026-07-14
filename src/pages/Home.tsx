import { useRef, useState, type MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Mic2, Music4, Sparkles, Wand2, ArrowRight, Disc3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Mic2,
    title: "Record or upload your voice",
    description: "Sing along to your favourite Bollywood, classical, or folk track — live or from a saved file.",
    accent: "#ef9f27",
  },
  {
    icon: Music4,
    title: "AI vocal separation",
    description: "Demucs isolates the instrumental from any track so your voice takes centre stage — in-browser, free.",
    accent: "#d4538a",
  },
  {
    icon: Wand2,
    title: "Studio-grade effects",
    description: "Reverb, echo, warmth, and pitch shifting powered by Tone.js. No DAW, no downloads required.",
    accent: "#4fb8a8",
  },
  {
    icon: Sparkles,
    title: "6 fusion variants + AI coaching",
    description: "Get Studio, Cinematic, Acoustic, Duet, Lo-fi, and Pitch-shifted mixes, plus Groq-powered vocal tips.",
    accent: "#7c8cf0",
  },
];

const GENRES = [
  "Bollywood", "Rabindra Sangeet", "Classical", "Sufi", "Folk", "Ghazal",
  "Indie Pop", "Devotional", "Lo-fi", "Qawwali",
];

const EQ_HEIGHTS = [10, 18, 26, 14, 22, 30, 16, 24, 12, 20, 28, 15];

export default function Home() {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [spot, setSpot] = useState({ x: 50, y: 20 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSpot({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <div className="relative overflow-hidden">
      {/* ── Animated multi-color mesh background ──── */}
      <div
        className="mesh-blob-1 pointer-events-none absolute -top-24 left-[8%] h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(239,159,39,0.16) 0%, transparent 70%)" }}
      />
      <div
        className="mesh-blob-2 pointer-events-none absolute top-40 right-[6%] h-[380px] w-[380px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(212,83,138,0.14) 0%, transparent 70%)" }}
      />
      <div
        className="mesh-blob-3 pointer-events-none absolute top-[420px] left-1/2 h-[360px] w-[360px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(79,184,168,0.12) 0%, transparent 70%)" }}
      />

      {/* ── Hero (mouse-reactive spotlight) ───────── */}
      <section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="relative max-w-5xl mx-auto px-4 pt-24 pb-20 text-center"
      >
        <div
          className="pointer-events-none absolute inset-0 -z-10 transition-[background] duration-300"
          style={{
            background: `radial-gradient(500px circle at ${spot.x}% ${spot.y}%, rgba(239,159,39,0.10), transparent 60%)`,
          }}
        />

        {/* Eyebrow */}
        <div className="fade-up inline-flex items-center gap-2 rounded-full border border-saffron/25 bg-saffron/8 px-4 py-1.5 mb-7">
          <span className="h-1.5 w-1.5 rounded-full bg-saffron animate-pulse-slow" />
          <span className="text-xs font-medium text-saffron tracking-widest uppercase">
            स्वर • Swar — the musical note within you
          </span>
        </div>

        {/* Headline */}
        <h1
          className="fade-up font-logo text-5xl sm:text-7xl font-bold mb-6 leading-[1.1]"
          style={{ animationDelay: "0.08s" }}
        >
          Fuse your voice{" "}
          <br className="hidden sm:block" />
          with{" "}
          <span className="gradient-text-saffron italic">Sur</span>
        </h1>

        {/* Animated equalizer bars */}
        <div
          className="fade-up flex items-end justify-center gap-1 mx-auto mb-8 h-8"
          style={{ animationDelay: "0.16s" }}
        >
          {EQ_HEIGHTS.map((h, i) => (
            <span
              key={i}
              className="eq-bar w-1.5 rounded-full"
              style={{
                height: `${h * 1.3}px`,
                background: i % 2 === 0
                  ? "linear-gradient(180deg, #f5c842, #ef9f27)"
                  : "linear-gradient(180deg, #f0a0c8, #d4538a)",
                animationDelay: `${i * 0.09}s`,
              }}
            />
          ))}
        </div>

        <p
          className="fade-up text-white/55 max-w-xl mx-auto mb-10 text-lg leading-relaxed"
          style={{ animationDelay: "0.24s" }}
        >
          Record your vocals over "Tum Hi Ho", a Rabindra Sangeet classic, or any track you love.
          SwarFusion separates the instrumental, aligns your pitch, and delivers six studio-quality
          fusion variants in minutes — entirely in your browser.
        </p>

        <div
          className="fade-up flex items-center justify-center gap-4 flex-wrap"
          style={{ animationDelay: "0.32s" }}
        >
          <Button asChild size="lg" className="cta-pulse gap-2 px-8">
            <Link to="/studio">
              Start a Fusion
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Scrolling genre marquee */}
        <div
          className="fade-up relative mt-14 overflow-hidden"
          style={{
            animationDelay: "0.4s",
            maskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
            WebkitMaskImage: "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
          }}
        >
          <div className="marquee-track flex w-max gap-3">
            {[...GENRES, ...GENRES].map((g, i) => (
              <span
                key={`${g}-${i}`}
                className="flex items-center gap-1.5 shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-white/50"
              >
                <Disc3 className="h-3 w-3 text-saffron/70" />
                {g}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature grid ───────────────────────────── */}
      <section className="relative max-w-5xl mx-auto px-4 pb-28 grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ perspective: "1000px" }}>
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="tilt-card feature-card-fx group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 flex gap-4"
            style={{
              animationDelay: `${0.45 + i * 0.08}s, ${i * 0.7}s`,
              "--wave-color": `${f.accent}59`,
              "--wave-border": `${f.accent}80`,
            } as React.CSSProperties}
          >
            <div
              className="tilt-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${f.accent}18`, border: `1px solid ${f.accent}30` }}
            >
              <f.icon className="h-5 w-5" style={{ color: f.accent }} />
            </div>
            <div>
              <h3 className="font-semibold text-white/90 mb-1.5 text-sm">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.description}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
