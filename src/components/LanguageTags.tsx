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
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors",
              active
                ? "bg-magenta text-white border-magenta"
                : "bg-white/5 text-white/70 border-white/15 hover:border-magenta/50 hover:text-white"
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
