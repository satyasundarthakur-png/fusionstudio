-- 30-day storage retention policy.
--
-- Vocal separation is free (runs in-browser), but Supabase Storage still
-- costs money once a project outgrows the free tier — and voice/track/
-- fusion-variant files accumulate fast (a single session can be 20-50MB
-- across all buckets). This migration adds the columns the cleanup job
-- needs, then schedules that job to run automatically every day.

-- 1. Track the permanent Storage path alongside each signed URL, so a
--    background job can locate and delete the underlying file later (the
--    signed URLs saved into `variants` and `*_url` columns expire after 7
--    days and can't be used to identify a file once they've gone stale).
alter table fusions
  add column if not exists voice_path text,
  add column if not exists track_path text,
  add column if not exists instrumental_path text;

-- 2. Extensions needed to call an Edge Function on a schedule.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- 3. The service role key must never be committed to a migration file.
--    Store it once, via the Supabase dashboard, as a Vault secret:
--      Project Settings -> Vault -> New secret
--      name:  service_role_key
--      value: <your project's service_role key>
--    (This is the one manual step required to activate retention cleanup.)

-- 4. Schedule the cleanup Edge Function (supabase/functions/cleanup-old-fusions)
--    to run daily at 03:00 UTC. It deletes fusion sessions — and their
--    voice/track/instrumental/variant files in Storage — once they are
--    older than 30 days.
--
--    Replace <project-ref> below with your actual Supabase project ref
--    (visible in your project URL: https://<project-ref>.supabase.co).
select
  cron.schedule(
    'cleanup-old-fusions-daily',
    '0 3 * * *',
    $$
    select
      net.http_post(
        url := 'https://<project-ref>.supabase.co/functions/v1/cleanup-old-fusions',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'service_role_key'
          )
        ),
        body := jsonb_build_object('triggered_at', now())
      ) as request_id;
    $$
  );

-- To check the job is registered:
--   select * from cron.job;
-- To inspect recent runs:
--   select * from cron.job_run_details order by start_time desc limit 10;
-- To change the retention window, edit RETENTION_DAYS in
-- supabase/functions/cleanup-old-fusions/index.ts and redeploy the function.
