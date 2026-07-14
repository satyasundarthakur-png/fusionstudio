import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Mail, Lock, User, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      if (authError) {
        setError(authError.message);
      } else {
        navigate({ to: "/studio" });
      }
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
    <div className="max-w-md mx-auto px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="font-logo text-2xl text-center">
            {mode === "signin" ? "Welcome back" : "Join SwarFusion"}
          </CardTitle>
          <p className="text-center text-sm text-white/50 mt-1">
            {mode === "signin"
              ? "Sign in to keep fusing your favorite tracks."
              : "Create an account to save and share your fusions."}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    id="displayName"
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
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  id="email"
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
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  id="password"
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

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/40">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            <Chrome className="h-4 w-4" /> Continue with Google
          </Button>

          <p className="text-center text-sm text-white/50 mt-5">
            {mode === "signin" ? "New to SwarFusion?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="text-saffron hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
