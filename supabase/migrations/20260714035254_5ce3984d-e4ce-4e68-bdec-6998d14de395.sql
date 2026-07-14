
create table public.profiles (
  id uuid references auth.users primary key,
  display_name text,
  languages text[],
  total_fusions int default 0,
  created_at timestamptz default now()
);

create table public.fusions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  voice_url text,
  voice_path text,
  track_url text,
  track_path text,
  instrumental_url text,
  instrumental_path text,
  variants jsonb,
  settings jsonb,
  ai_tips text[],
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select, insert, update, delete on public.fusions to authenticated;
grant all on public.fusions to service_role;

alter table public.profiles enable row level security;
alter table public.fusions enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own fusions" on public.fusions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own voice files" on storage.objects for all
  using (bucket_id = 'voice' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'voice' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own track files" on storage.objects for all
  using (bucket_id = 'tracks' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'tracks' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own fusion files" on storage.objects for all
  using (bucket_id = 'fusions' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'fusions' and auth.uid()::text = (storage.foldername(name))[1]);

create or replace function public.increment_total_fusions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set total_fusions = total_fusions + 1 where id = new.user_id;
  return new;
end;
$$;

create trigger on_fusion_created
  after insert on public.fusions
  for each row execute procedure public.increment_total_fusions();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, languages, total_fusions)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), '{}', 0);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
