
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'cleanup-old-fusions-daily',
  '0 3 * * *',
  $$
  select net.http_post(
    url := 'https://hkizlwltivavbdgigrgx.supabase.co/functions/v1/cleanup-old-fusions',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  ) as request_id;
  $$
);
