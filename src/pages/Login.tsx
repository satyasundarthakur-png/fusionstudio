import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Mail, Lock, User, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from "@/lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: authError } =
        mode === "signin"
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password, displayName);
      if (authError) setError(authError.message);
      else navigate({ to: "/studio" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const { error: authError } = await signInWithGoogle();
    if (authError) setError(authError.message);
  };

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4 py-16 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 70% at 50% 30%, rgba(239,159,39,0.07) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full glow-orb-b"
        style={{ background: "radial-gradient(ellipse at center, rgba(212,83,138,0.07) 0%, transparent 70%)" }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/[0.08] backdrop-blur-sm p-8 shadow-card"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        {/* Logo watermark */}
        <div className="text-center mb-7">
          <p className="font-logo text-2xl gradient-text-saffron w-fit mx-auto mb-1">SwarFusion</p>
          <h2 className="text-lg font-semibold text-white/85">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-white/40 mt-1">
            {mode === "signin"
              ? "Sign in to keep fusing your favourite tracks."
              : "Save and share your fusions with the world."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label className="text-white/55 text-xs uppercase tracking-wider">Display name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Meera Suresh"
                  className="pl-9"
                  required
                />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-white/55 text-xs uppercase tracking-wider">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-9"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/55 text-xs uppercase tracking-wider">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                minLength={6}
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-white/[0.08]" />
          <span className="text-xs text-white/30">or</span>
          <div className="h-px flex-1 bg-white/[0.08]" />
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogle}>
          <Chrome className="h-4 w-4" /> Continue with Google
        </Button>

        <p className="text-center text-sm text-white/40 mt-6">
          {mode === "signin" ? "New to SwarFusion? " : "Already have an account? "}
          <button
            type="button"
            className="text-saffron hover:text-gold transition-colors font-medium"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
