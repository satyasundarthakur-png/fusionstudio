import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";

type VoiceCoachProps = {
  tips: string[];
  isLoading?: boolean;
};

/** Collapsible panel showing Groq-generated AI vocal coaching tips. */
export default function VoiceCoach({ tips, isLoading }: VoiceCoachProps) {
  const [open, setOpen] = useState(true);

  const labels = ["Pitch accuracy", "Breath control", "Emotional delivery"];

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-saffron" />
            <span className="font-semibold text-white">AI Vocal Coaching</span>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {isLoading ? (
              <p className="text-sm text-white/50">Analyzing your fusion for coaching tips…</p>
            ) : tips.length === 0 ? (
              <p className="text-sm text-white/50">
                Coaching tips will appear here once your fusion is ready.
              </p>
            ) : (
              tips.map((tip, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="shrink-0 rounded-full bg-saffron/15 text-saffron text-xs font-semibold px-2 py-0.5 h-fit">
                    {labels[i] ?? `Tip ${i + 1}`}
                  </span>
                  <p className="text-white/80">{tip}</p>
                </div>
              ))
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
