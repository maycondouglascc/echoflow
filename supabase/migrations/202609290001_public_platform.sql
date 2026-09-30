create function public.valid_word_timings(timings jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare cue jsonb; previous_end numeric := 0;
begin
  if jsonb_typeof(timings) is distinct from 'array' then return false; end if;
  for cue in select value from jsonb_array_elements(timings) loop
    if jsonb_typeof(cue->'word') is distinct from 'string' or jsonb_typeof(cue->'startMs') is distinct from 'number'
       or jsonb_typeof(cue->'endMs') is distinct from 'number' then return false; end if;
    if length(trim(cue->>'word')) = 0 then return false; end if;
    if (cue->>'startMs')::numeric < previous_end or (cue->>'endMs')::numeric <= (cue->>'startMs')::numeric then return false; end if;
    previous_end := (cue->>'endMs')::numeric;
  end loop;
  return true;
exception when others then return false;
end $$;

create table public.playlists (
  id uuid primary key, slug text unique not null, title text not null check (length(trim(title)) > 0),
  description text not null default '', sort_order integer not null check (sort_order > 0),
  published boolean not null default false, created_at timestamptz not null default now()
);
create table public.phrases (
  id uuid primary key, slug text unique not null, playlist_id uuid not null references public.playlists(id),
  category text not null, text text not null check (length(trim(text)) > 0),
  sort_order integer not null check (sort_order > 0), published boolean not null default false,
  unique (playlist_id, sort_order)
);
create table public.audio_variants (
  id uuid primary key, slug text unique not null, phrase_id uuid not null references public.phrases(id),
  model_id text not null, voice_id text not null, voice_label text not null,
  format text not null check (format in ('wav', 'mp3')), storage_path text unique not null,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'), provenance jsonb not null,
  word_timings jsonb not null default '[]' check (public.valid_word_timings(word_timings)),
  model_metadata jsonb not null, audio_metadata jsonb not null,
  active boolean not null default false, unique (phrase_id, model_id, voice_id)
);
create table public.playlist_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  playlist_id uuid not null references public.playlists(id),
  completed_at timestamptz not null default now(), primary key (user_id, playlist_id)
);
create index phrases_playlist_idx on public.phrases(playlist_id);
create index audio_variants_phrase_idx on public.audio_variants(phrase_id);

alter table public.playlists enable row level security;
alter table public.phrases enable row level security;
alter table public.audio_variants enable row level security;
alter table public.playlist_completions enable row level security;
revoke all on public.playlists, public.phrases, public.audio_variants, public.playlist_completions from anon, authenticated;
grant select on public.playlists, public.phrases, public.audio_variants to authenticated;
grant select, insert on public.playlist_completions to authenticated;
grant all on public.playlists, public.phrases, public.audio_variants, public.playlist_completions to service_role;
create policy published_playlists on public.playlists for select to authenticated using (published);
create policy published_phrases on public.phrases for select to authenticated using (
  published and exists (select 1 from public.playlists p where p.id = playlist_id and p.published)
);
create policy published_audio on public.audio_variants for select to authenticated using (
  active and exists (select 1 from public.phrases p where p.id = phrase_id)
);
create policy own_completion_read on public.playlist_completions for select to authenticated using (user_id = (select auth.uid()));
create policy own_completion_insert on public.playlist_completions for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (select 1 from public.playlists p where p.id = playlist_id and p.published)
);
-- Completion is append-only: ignore duplicate inserts rather than changing its timestamp.
