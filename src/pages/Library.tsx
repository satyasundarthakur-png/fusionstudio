import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Music4, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MiniPlayer from "@/components/MiniPlayer";
import { supabase, listFusions, type Fusion } from "@/lib/supabase";

export default function Library() {
  const navigate = useNavigate();
  const [fusions, setFusions] = useState<Fusion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) {
        navigate({ to: "/login" });
        return;
      }
      const list = await listFusions(user.id);
      setFusions(list);
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-white/50">Loading your fusions…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-logo text-3xl mb-2">My Fusions</h1>
      <p className="text-white/50 mb-8">Every vocal fusion session you've created, saved and ready to replay.</p>

      {fusions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-white/50">
            <Music4 className="h-10 w-10 mx-auto mb-3 text-white/20" />
            No fusions yet — head to the Studio to record your first one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {fusions.map((fusion) => (
            <Card key={fusion.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  {fusion.variants?.[0]?.name ?? "Fusion Session"}
                </CardTitle>
                <span className="flex items-center gap-1 text-xs text-white/40">
                  <Calendar className="h-3 w-3" />
                  {new Date(fusion.created_at).toLocaleDateString()}
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {(fusion.settings?.languages ?? []).map((lang) => (
                    <span
                      key={lang}
                      className="text-xs rounded-full bg-magenta/15 text-magenta px-2 py-0.5"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
                {fusion.variants?.[0]?.url && <MiniPlayer src={fusion.variants[0].url} />}
                <p className="text-xs text-white/40">
                  {fusion.variants?.length ?? 0} variant{(fusion.variants?.length ?? 0) === 1 ? "" : "s"} generated
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
