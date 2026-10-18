-- One fixed Notion destination. Workers only; ordinary account access stays unchanged.
create table public.feedback_notion_exports (
 feedback_id uuid primary key references public.app_feedback(id) on delete cascade,
 attempts integer not null default 0 check(attempts >= 0),
 next_attempt_at timestamptz not null default now(),
 lease_token uuid,
 lease_until timestamptz,
 creation_started boolean not null default false,
 notion_page_id uuid,
 delivered_at timestamptz,
 last_error text check(last_error ~ '^[a-z0-9_]{1,64}$'),
 check((lease_token is null) = (lease_until is null)),
 check((notion_page_id is null) = (delivered_at is null))
);
alter table public.feedback_notion_exports enable row level security;
revoke all on public.feedback_notion_exports from public, anon, authenticated;
grant all on public.feedback_notion_exports to service_role;
create index feedback_notion_pending on public.feedback_notion_exports(next_attempt_at)
 where delivered_at is null;

create function public.enqueue_notion_feedback() returns trigger
 language plpgsql security definer set search_path = '' as $$
begin
 insert into public.feedback_notion_exports(feedback_id) values(new.id);
 return new;
end;
$$;
revoke all on function public.enqueue_notion_feedback() from public, anon, authenticated;
create trigger enqueue_notion_feedback after insert on public.app_feedback
 for each row execute function public.enqueue_notion_feedback();
insert into public.feedback_notion_exports(feedback_id) select id from public.app_feedback
 on conflict do nothing;

create function public.claim_notion_feedback() returns jsonb
 language plpgsql security definer set search_path = '' as $$
declare job public.feedback_notion_exports;
begin
 select * into job from public.feedback_notion_exports
 where delivered_at is null and next_attempt_at <= now()
 and (lease_until is null or lease_until <= now())
 order by next_attempt_at, feedback_id for update skip locked limit 1;
 if not found then return null; end if;
 update public.feedback_notion_exports set attempts=attempts+1,
 lease_token=gen_random_uuid(), lease_until=now()+interval '10 minutes'
 where feedback_id=job.feedback_id returning * into job;
 return to_jsonb(job) || jsonb_build_object('feedback',
  (select to_jsonb(f) - 'request_sha256' from public.app_feedback f where id=job.feedback_id));
end;
$$;

create function public.start_notion_feedback(p_id uuid,p_token uuid) returns boolean
 language plpgsql security definer set search_path = '' as $$
begin
 update public.feedback_notion_exports set creation_started=true
 where feedback_id=p_id and lease_token=p_token and lease_until > now() and delivered_at is null;
 return found;
end;
$$;

create function public.finish_notion_feedback(p_id uuid,p_token uuid,p_page uuid,
 p_error text,p_delay integer,p_reset boolean) returns boolean
 language plpgsql security definer set search_path = '' as $$
begin
 if p_error is not null and p_error !~ '^[a-z0-9_]{1,64}$' then
  raise exception 'invalid operational error code';
 end if;
 update public.feedback_notion_exports set
 notion_page_id=p_page, delivered_at=case when p_page is not null then now() end,
 last_error=case when p_page is null then p_error end,
 next_attempt_at=now()+make_interval(secs=>greatest(60,least(86400,p_delay))),
 creation_started=case when p_reset then false else creation_started end,
 lease_token=null, lease_until=null
 where feedback_id=p_id and lease_token=p_token and lease_until > now() and delivered_at is null;
 return found;
end;
$$;
revoke all on function public.claim_notion_feedback() from public, anon, authenticated;
revoke all on function public.start_notion_feedback(uuid,uuid) from public, anon, authenticated;
revoke all on function public.finish_notion_feedback(uuid,uuid,uuid,text,integer,boolean) from public, anon, authenticated;
grant execute on function public.claim_notion_feedback() to service_role;
grant execute on function public.start_notion_feedback(uuid,uuid) to service_role;
grant execute on function public.finish_notion_feedback(uuid,uuid,uuid,text,integer,boolean) to service_role;
