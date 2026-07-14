import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Change the site password here.
const SITE_PASSWORD = "SwarFusion@108";
const SESSION_KEY = "swarfusion_unlocked";

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value !== SITE_PASSWORD) {
      setError(true);
      return;
    }
    setError(false);
    sessionStorage.setItem(SESSION_KEY, "1");
    setUnlocked(true);
  };

  // Avoid a flash of the lock screen while sessionStorage is checked.
  if (unlocked === null) return null;

  if (unlocked) return <>{children}</>;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-midnight">
      <div
        className="glow-orb-a pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full"
        style={{ background: "radial-gradient(ellipse at center, rgba(239,159,39,0.09) 0%, transparent 70%)" }}
      />
      <div
        className="glow-orb-b pointer-events-none absolute top-64 -right-40 h-[400px] w-[400px] rounded-full"
        style={{ background: "radial-gradient(ellipse at center, rgba(212,83,138,0.07) 0%, transparent 70%)" }}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] backdrop-blur-sm p-8 shadow-card text-center"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-saffron/30 bg-saffron/10">
          <Lock className="h-5 w-5 text-saffron" />
        </div>

        <p className="font-logo text-2xl gradient-text-saffron w-fit mx-auto mb-1">SwarFusion</p>
        <h2 className="text-lg font-semibold text-white/85 mb-1">This studio is locked</h2>
        <p className="text-sm text-white/40 mb-6">Enter the access password to continue.</p>

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              type="password"
              autoFocus
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(false);
              }}
              placeholder="Access password"
              className="pl-9"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-400 text-center">
              That password isn't right — try again.
            </div>
          )}

          <Button type="submit" className="w-full gap-2" disabled={!value}>
            <Sparkles className="h-4 w-4" />
            Unlock SwarFusion
          </Button>
        </form>
      </div>
    </div>
  );
}
