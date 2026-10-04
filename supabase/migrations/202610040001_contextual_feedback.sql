-- Additive, private contextual feedback. No change to practice recordings or catalog.
create function public.valid_feedback_navigation(events jsonb, captured timestamptz)
returns boolean language plpgsql immutable set search_path = '' as $$
declare event jsonb; instant timestamptz; previous timestamptz := captured - interval '5 minutes';
begin
 if jsonb_typeof(events) <> 'array' or jsonb_array_length(events) > 20 or octet_length(events::text) > 16384 then return false; end if;
 for event in select value from jsonb_array_elements(events) loop
  if jsonb_typeof(event) <> 'object' or not (event ?& array['path','action','at']) or (event - 'path' - 'action' - 'at') <> '{}'::jsonb
   or jsonb_typeof(event->'path') <> 'string' or jsonb_typeof(event->'action') <> 'string' or jsonb_typeof(event->'at') <> 'string'
   or event->>'path' !~ '^/(home|scenarios/[a-z0-9-]{1,80})$'
   or not (event->>'action' = any(array['page','select-phrase','select-voice','listen-reference','replay-word','record','stop-recording','compare','next-phrase']))
   or event->>'at' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$' then return false; end if;
  instant := (event->>'at')::timestamptz;
  if instant < previous or instant > captured then return false; end if;
  previous := instant;
 end loop;
 return true;
exception when others then return false;
end;
$$;
create table public.app_feedback (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 message text not null check(char_length(btrim(message)) between 10 and 5000),
 page_path text not null check(page_path ~ '^/(home|scenarios/[a-z0-9-]{1,80})$'),
 submitted_at timestamptz not null default now(),
 captured_at timestamptz not null,
 viewport jsonb not null check(jsonb_typeof(viewport)='object' and viewport ?& array['width','height'] and (viewport - 'width' - 'height') = '{}'::jsonb and jsonb_typeof(viewport->'width')='number' and jsonb_typeof(viewport->'height')='number' and viewport->>'width' ~ '^[0-9]{1,5}$' and viewport->>'height' ~ '^[0-9]{1,5}$' and (viewport->>'width')::integer between 1 and 10000 and (viewport->>'height')::integer between 1 and 10000),
 navigation jsonb not null default '[]'::jsonb check(public.valid_feedback_navigation(navigation,captured_at)),
 screenshot_path text check(screenshot_path is null or screenshot_path=user_id::text||'/'||id::text||'.png'),
 request_sha256 text not null check(request_sha256 ~ '^[0-9a-f]{64}$')
);
create index app_feedback_owner_time on public.app_feedback(user_id,submitted_at desc);
alter table public.app_feedback enable row level security;
revoke all on public.app_feedback from anon,authenticated;
grant select on public.app_feedback to authenticated;
grant insert(id,user_id,message,page_path,captured_at,viewport,navigation,screenshot_path,request_sha256) on public.app_feedback to authenticated;
create policy feedback_read_own on public.app_feedback for select to authenticated using ((select auth.uid())=user_id);
create policy feedback_insert_own on public.app_feedback for insert to authenticated with check ((select auth.uid())=user_id);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('feedback-screenshots','feedback-screenshots',false,2097152,array['image/png']);
create policy feedback_screenshot_read on storage.objects for select to authenticated
 using(bucket_id='feedback-screenshots' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy feedback_screenshot_insert on storage.objects for insert to authenticated
 with check(bucket_id='feedback-screenshots' and name ~ ('^'||(select auth.uid())::text||'/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$'));
create policy feedback_screenshot_delete on storage.objects for delete to authenticated
 using(bucket_id='feedback-screenshots' and (storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.app_feedback where screenshot_path=name));
