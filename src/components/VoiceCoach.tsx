import { useState } from "react";
import { ChevronDown, Sparkles, Mic, Wind, Heart } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type VoiceCoachProps = {
  tips: string[];
  isLoading?: boolean;
};

const TIP_META = [
  { label: "Pitch accuracy",     icon: Mic,   color: "#ef9f27" },
  { label: "Breath control",     icon: Wind,  color: "#4ade80" },
  { label: "Emotional delivery", icon: Heart, color: "#d4538a" },
];

export default function VoiceCoach({ tips, isLoading }: VoiceCoachProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-sm overflow-hidden card-hover">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(239,159,39,0.15)", border: "1px solid rgba(239,159,39,0.3)" }}>
              <Sparkles className="h-4 w-4 text-saffron" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-white/90 text-sm">AI Vocal Coaching</p>
              <p className="text-xs text-white/40">Powered by Groq</p>
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-white/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-5 pb-5 pt-1 space-y-3 border-t border-white/[0.05]">
            {isLoading ? (
              <div className="flex items-center gap-3 py-4 text-sm text-white/40">
                <div className="h-4 w-4 rounded-full border-2 border-saffron border-t-transparent animate-spin" />
                Analyzing your fusion for coaching tips…
              </div>
            ) : tips.length === 0 ? (
              <p className="text-sm text-white/40 py-4">
                Coaching tips will appear here once your fusion is ready.
              </p>
            ) : (
              tips.map((tip, i) => {
                const m = TIP_META[i] ?? { label: `Tip ${i + 1}`, icon: Sparkles, color: "#ef9f27" };
                const Icon = m.icon;
                return (
                  <div
                    key={i}
                    className="flex gap-3 rounded-xl p-3.5 mt-2"
                    style={{ background: `${m.color}08`, border: `1px solid ${m.color}18` }}
                  >
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${m.color}18` }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: m.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: m.color }}>
                        {m.label}
                      </p>
                      <p className="text-sm text-white/75 leading-relaxed">{tip}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
