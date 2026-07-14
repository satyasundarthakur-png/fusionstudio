import { cn } from "@/lib/utils";
import type { EffectPreset } from "@/lib/audioEngine";

type EffectChipsProps = {
  value: EffectPreset;
  onChange: (preset: EffectPreset) => void;
};

const CHIPS: { id: EffectPreset; label: string }[] = [
  { id: "clean", label: "Clean" },
  { id: "reverb", label: "Reverb" },
  { id: "echo", label: "Echo" },
  { id: "warm", label: "Warm" },
  { id: "pitch-up", label: "Pitch +2" },
  { id: "pitch-down", label: "Pitch -2" },
];

/** Chip selector for live voice effect monitoring (Tone.js chain preview). */
export default function EffectChips({ value, onChange }: EffectChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHIPS.map((chip) => (
        <button
          key={chip.id}
          onClick={() => onChange(chip.id)}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium border transition-colors",
            value === chip.id
              ? "bg-saffron text-midnight border-saffron"
              : "bg-white/5 text-white/70 border-white/15 hover:border-saffron/50 hover:text-white"
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
