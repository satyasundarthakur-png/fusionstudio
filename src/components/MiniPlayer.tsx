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

/** Compact inline audio player with a scrub-able progress bar. */
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
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
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
    <div className="flex items-center gap-3 rounded-xl bg-black/30 px-3 py-2">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={togglePlay}
        style={{ backgroundColor: accentColor }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-midnight"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={progressPct}
        onChange={onScrub}
        style={{ accentColor }}
        className="flex-1 h-1.5 cursor-pointer"
      />
      <span className="text-xs tabular-nums text-white/60 w-20 text-right">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}
