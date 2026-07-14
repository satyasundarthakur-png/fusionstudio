-- users profile (extends auth.users)
create table profiles (
  id uuid references auth.users primary key,
  display_name text,
  languages text[],
  total_fusions int default 0,
  created_at timestamptz default now()
);

-- fusion sessions
create table fusions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  voice_url text,
  track_url text,
  instrumental_url text,
  variants jsonb,   -- array of {name, url, effect, duration}
  settings jsonb,   -- voice_vol, music_vol, languages, model, quality
  ai_tips text[],
  created_at timestamptz default now()
);

-- storage buckets
insert into storage.buckets (id, name, public) values ('voice', 'voice', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('tracks', 'tracks', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('fusions', 'fusions', false)
  on conflict (id) do nothing;

-- RLS
alter table profiles enable row level security;
alter table fusions enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own fusions" on fusions for all using (auth.uid() = user_id);

-- storage policies
create policy "own voice files" on storage.objects for all
  using (bucket_id = 'voice' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own track files" on storage.objects for all
  using (bucket_id = 'tracks' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own fusion files" on storage.objects for all
  using (bucket_id = 'fusions' and auth.uid()::text = (storage.foldername(name))[1]);

-- keep total_fusions in sync
create or replace function increment_total_fusions()
returns trigger as $$
begin
  update profiles set total_fusions = total_fusions + 1 where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_fusion_created
  after insert on fusions
  for each row execute procedure increment_total_fusions();

-- auto-create profile row on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, languages, total_fusions)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), '{}', 0);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
