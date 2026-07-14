// Supabase Edge Function: cleanup-old-fusions
//
// Deletes fusion sessions — and their voice/track/instrumental/variant
// files in Storage — once they're older than RETENTION_DAYS. Invoked on a
// schedule by pg_cron (see supabase/migrations/002_retention_policy.sql).
//
// Deploy with:
//   supabase functions deploy cleanup-old-fusions
//
// This function uses the service role key (auto-injected as
// SUPABASE_SERVICE_ROLE_KEY by the Edge Functions runtime) so it can bypass
// RLS and clean up every user's old sessions, not just one.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const RETENTION_DAYS = 30;

type FusionRow = {
  id: string;
  user_id: string;
  voice_path: string | null;
  track_path: string | null;
  instrumental_path: string | null;
  variants: { path?: string }[] | null;
};

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error:
            "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in function environment.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const cutoffIso = new Date(
      Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: oldFusions, error: fetchError } = await supabase
      .from("fusions")
      .select("id, user_id, voice_path, track_path, instrumental_path, variants")
      .lt("created_at", cutoffIso);

    if (fetchError) throw fetchError;

    const rows = (oldFusions ?? []) as FusionRow[];

    let filesDeleted = 0;
    let sessionsDeleted = 0;
    const errors: string[] = [];

    for (const fusion of rows) {
      try {
        // Voice + original track live in their own buckets; the
        // instrumental and all 6 fusion variants live in "fusions".
        if (fusion.voice_path) {
          await supabase.storage.from("voice").remove([fusion.voice_path]);
          filesDeleted++;
        }
        if (fusion.track_path) {
          await supabase.storage.from("tracks").remove([fusion.track_path]);
          filesDeleted++;
        }

        const fusionBucketPaths: string[] = [];
        if (fusion.instrumental_path) fusionBucketPaths.push(fusion.instrumental_path);
        for (const variant of fusion.variants ?? []) {
          if (variant.path) fusionBucketPaths.push(variant.path);
        }
        if (fusionBucketPaths.length > 0) {
          await supabase.storage.from("fusions").remove(fusionBucketPaths);
          filesDeleted += fusionBucketPaths.length;
        }

        const { error: deleteError } = await supabase
          .from("fusions")
          .delete()
          .eq("id", fusion.id);
        if (deleteError) throw deleteError;

        sessionsDeleted++;
      } catch (err) {
        errors.push(
          `Fusion ${fusion.id}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return new Response(
      JSON.stringify({
        retentionDays: RETENTION_DAYS,
        cutoff: cutoffIso,
        sessionsFound: rows.length,
        sessionsDeleted,
        filesDeleted,
        errors,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
