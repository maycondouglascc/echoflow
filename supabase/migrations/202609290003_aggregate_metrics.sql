-- UTC daily counters only. No email, user identifier, transcript or audio is stored here.
create table public.platform_metrics (
  day date not null,
  metric text not null check (metric in ('confirmed_signups','practice_accesses','playlist_completions')),
  count bigint not null default 0 check (count >= 0),
  primary key (day, metric)
);
alter table public.platform_metrics enable row level security;
revoke all on public.platform_metrics from anon, authenticated;
grant select on public.platform_metrics to service_role;

create function public.increment_platform_metric(metric_name text) returns void
language sql security definer set search_path = '' as $$
  insert into public.platform_metrics(day,metric,count)
  values ((now() at time zone 'UTC')::date, metric_name, 1)
  on conflict(day,metric) do update set count = public.platform_metrics.count + 1;
$$;
revoke all on function public.increment_platform_metric(text) from public, anon, authenticated;

create function public.record_practice_access() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  perform public.increment_platform_metric('practice_accesses');
end $$;
revoke all on function public.record_practice_access() from public, anon;
grant execute on function public.record_practice_access() to authenticated;

create function public.count_confirmed_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null then
    if TG_OP = 'INSERT' then perform public.increment_platform_metric('confirmed_signups');
    elsif old.email_confirmed_at is null then perform public.increment_platform_metric('confirmed_signups'); end if;
  end if;
  return new;
end $$;
revoke all on function public.count_confirmed_signup() from public, anon, authenticated;
create trigger aggregate_confirmed_signups after insert or update of email_confirmed_at on auth.users
for each row execute function public.count_confirmed_signup();

create function public.count_playlist_completion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.increment_platform_metric('playlist_completions');
  return new;
end $$;
revoke all on function public.count_playlist_completion() from public, anon, authenticated;
create trigger aggregate_playlist_completions after insert on public.playlist_completions
for each row execute function public.count_playlist_completion();
