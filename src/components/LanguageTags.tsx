import { cn } from "@/lib/utils";

export const AVAILABLE_LANGUAGES = [
  "Hindi",
  "Odia",
  "Bengali",
  "Telugu",
  "Punjabi",
  "Classical",
  "Filmi",
  "Folk",
] as const;

export type LanguageTag = (typeof AVAILABLE_LANGUAGES)[number];

/**
 * Each language/style tag gets its own hue drawn from the same rainbow
 * palette used across the app (variant pills, mesh blobs, tagline wave)
 * so the multi-select reads as a full spectrum instead of a wall of
 * identical magenta chips.
 */
const TAG_COLORS: Record<LanguageTag, string> = {
  Hindi:     "#ef9f27", // saffron
  Odia:      "#f5c842", // gold
  Bengali:   "#4ade80", // green
  Telugu:    "#4fb8a8", // teal
  Punjabi:   "#38bdf8", // sky
  Classical: "#7c6aff", // indigo
  Filmi:     "#d4538a", // magenta
  Folk:      "#fb923c", // ember
};

type LanguageTagsProps = {
  selected: string[];
  onToggle: (tag: string) => void;
};

/** Multi-select chips for song language/style tags. */
export default function LanguageTags({ selected, onToggle }: LanguageTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {AVAILABLE_LANGUAGES.map((tag) => {
        const active = selected.includes(tag);
        const color = TAG_COLORS[tag];
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            style={
              active
                ? {
                    background: color,
                    borderColor: color,
                    color: "#0a0a14",
                    boxShadow: `0 0 16px ${color}55`,
                  }
                : {
                    background: `${color}14`,
                    borderColor: `${color}55`,
                    color: color,
                  }
            }
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all",
              !active && "hover:brightness-125"
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
