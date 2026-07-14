import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

type MiniPlayerProps = {
  src: string;
  accent?: "saffron" | "magenta";
};

function formatTime(sec: number) {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MiniPlayer({ src, accent = "saffron" }: MiniPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  };

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = (Number(e.target.value) / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const accentColor = accent === "magenta" ? "#d4538a" : "#ef9f27";
  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play button */}
      <button
        onClick={togglePlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
        style={{
          background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor}99)`,
          boxShadow: `0 0 12px ${accentColor}40`,
        }}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying
          ? <Pause className="h-3.5 w-3.5 text-midnight" />
          : <Play className="h-3.5 w-3.5 ml-0.5 text-midnight" />
        }
      </button>

      {/* Scrubber */}
      <div className="flex-1 relative">
        {/* Track background */}
        <div className="w-full h-1 rounded-full bg-white/10 relative overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${progressPct}%`, background: accentColor }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={progressPct}
          onChange={onScrub}
          style={{ accentColor, position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
        />
      </div>

      {/* Time */}
      <span className="text-[10px] font-mono tabular-nums text-white/45 shrink-0">
        {formatTime(currentTime)}<span className="text-white/25"> / </span>{formatTime(duration)}
      </span>
    </div>
  );
}
