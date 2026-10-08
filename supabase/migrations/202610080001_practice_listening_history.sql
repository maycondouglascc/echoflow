-- Reported full-reference listens only; never recording bytes or recognized text.
create table public.phrase_listen_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null,
  phrase_id uuid not null references public.phrases(id) on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  primary key (user_id, event_id)
);
create index phrase_listen_events_user_time_idx on public.phrase_listen_events(user_id, created_at);
create table public.phrase_listen_counts (
  user_id uuid not null references auth.users(id) on delete cascade,
  phrase_id uuid not null references public.phrases(id) on delete cascade,
  count bigint not null check (count >= 0 and count <= 9007199254740991),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, phrase_id)
);
alter table public.phrase_listen_events enable row level security;
alter table public.phrase_listen_counts enable row level security;
revoke all on public.phrase_listen_events, public.phrase_listen_counts from public, anon, authenticated;
grant select on public.phrase_listen_events, public.phrase_listen_counts to authenticated;
create policy own_published_listen_events on public.phrase_listen_events for select to authenticated using (
  user_id = (select auth.uid()) and exists (select 1 from public.phrases p where p.id = phrase_id)
);
create policy own_published_listen_counts on public.phrase_listen_counts for select to authenticated using (
  user_id = (select auth.uid()) and exists (select 1 from public.phrases p where p.id = phrase_id)
);

-- Only this bounded function can write. It uses the session identity, not a client owner.
create function public.record_phrase_listen(p_event_id uuid, p_phrase_id uuid, p_expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  previous_phrase uuid;
  current_count bigint;
  quota_since timestamptz;
begin
  if caller is null then return jsonb_build_object('ok',false,'reason','unauthenticated'); end if;
  if p_expected_user_id is distinct from caller then
    return jsonb_build_object('ok',false,'reason','identity_changed');
  end if;
  if p_event_id is null or p_phrase_id is null then
    return jsonb_build_object('ok',false,'reason','not_available');
  end if;
  -- Serialize only this user's submissions; distinct tabs cannot lose increments or bypass quota.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text, 8008));
  if not exists (
    select 1 from public.phrases p join public.playlists l on l.id = p.playlist_id
    where p.id = p_phrase_id and p.published and l.published
  ) then return jsonb_build_object('ok',false,'reason','not_available'); end if;
  select phrase_id into previous_phrase from public.phrase_listen_events
    where user_id = caller and event_id = p_event_id;
  if found then
    if previous_phrase <> p_phrase_id then return jsonb_build_object('ok',false,'reason','conflict'); end if;
    select count into current_count from public.phrase_listen_counts where user_id=caller and phrase_id=p_phrase_id;
    return jsonb_build_object('ok',true,'count',current_count,'duplicate',true);
  end if;
  quota_since := clock_timestamp() - interval '1 minute';
  if (select count(*) from public.phrase_listen_events
      where user_id=caller and created_at > quota_since) >= 60 then
    return jsonb_build_object('ok',false,'reason','rate_limited');
  end if;
  select count into current_count from public.phrase_listen_counts where user_id=caller and phrase_id=p_phrase_id;
  -- Check before either write, under the same transaction lock: saturation leaves no orphan event.
  if current_count >= 9007199254740991 then
    return jsonb_build_object('ok',false,'reason','limit_reached');
  end if;
  insert into public.phrase_listen_events(user_id,event_id,phrase_id) values(caller,p_event_id,p_phrase_id);
  insert into public.phrase_listen_counts(user_id,phrase_id,count) values(caller,p_phrase_id,1)
  on conflict(user_id,phrase_id) do update
    set count=public.phrase_listen_counts.count + 1, updated_at=clock_timestamp()
  returning count into current_count;
  return jsonb_build_object('ok',true,'count',current_count,'duplicate',false);
end $$;
revoke all on function public.record_phrase_listen(uuid,uuid,uuid) from public, anon;
grant execute on function public.record_phrase_listen(uuid,uuid,uuid) to authenticated;
