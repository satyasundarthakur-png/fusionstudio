import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Music4, Calendar, Headphones } from "lucide-react";
import MiniPlayer from "@/components/MiniPlayer";
import { supabase, listFusions, type Fusion } from "@/lib/supabase";

export default function Library() {
  const navigate = useNavigate();
  const [fusions, setFusions] = useState<Fusion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) { navigate({ to: "/login" }); return; }
      const list = await listFusions(user.id);
      setFusions(list);
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center">
        <div className="h-8 w-8 rounded-full border-2 border-saffron border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-white/40 text-sm">Loading your fusions…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs text-white/35 uppercase tracking-widest mb-2">Collection</p>
        <h1 className="font-logo text-3xl gradient-text-saffron w-fit mb-1.5">My Fusions</h1>
        <p className="text-white/40 text-sm">Every vocal fusion session you've created, saved and ready to replay.</p>
      </div>

      {fusions.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] py-24 text-center">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(239,159,39,0.08)", border: "1px solid rgba(239,159,39,0.2)" }}>
            <Music4 className="h-7 w-7 text-saffron/60" />
          </div>
          <p className="text-white/50 text-sm mb-1">No fusions yet</p>
          <p className="text-white/30 text-xs">Head to the Studio to record your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fusions.map((fusion) => (
            <div
              key={fusion.id}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] backdrop-blur-sm p-5 space-y-4 card-hover"
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(239,159,39,0.12)", border: "1px solid rgba(239,159,39,0.2)" }}>
                    <Headphones className="h-4 w-4 text-saffron" />
                  </div>
                  <p className="font-semibold text-white/85 text-sm truncate">
                    {fusion.variants?.[0]?.name ?? "Fusion Session"}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-white/35 shrink-0">
                  <Calendar className="h-3 w-3" />
                  {new Date(fusion.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Language tags */}
              {(fusion.settings?.languages ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(fusion.settings?.languages ?? []).map((lang) => (
                    <span
                      key={lang}
                      className="text-[10px] rounded-full px-2.5 py-0.5 font-medium"
                      style={{ background: "rgba(212,83,138,0.12)", color: "#d4538a", border: "1px solid rgba(212,83,138,0.2)" }}
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              )}

              {/* Player */}
              {fusion.variants?.[0]?.url && <MiniPlayer src={fusion.variants[0].url} />}

              {/* Variant count */}
              <p className="text-[10px] text-white/30">
                {fusion.variants?.length ?? 0} variant{(fusion.variants?.length ?? 0) === 1 ? "" : "s"} generated
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
