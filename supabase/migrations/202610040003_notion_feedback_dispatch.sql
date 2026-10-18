-- Queue durability never depends on outbound HTTP availability.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create function public.dispatch_notion_feedback() returns bigint
language plpgsql security definer set search_path='' as $$
declare token text; target text;
begin
 -- A fresh deployment remains dormant until an operator configures Vault.
 if not exists(select 1 from public.feedback_notion_exports
   where delivered_at is null and next_attempt_at <= now()
   and (lease_until is null or lease_until <= now())) then return null; end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='notion_feedback_invoke_secret';
 select decrypted_secret into target from vault.decrypted_secrets where name='notion_feedback_function_url';
 if token is null or target is null then return null; end if;
 return net.http_post(url:=target,
   headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),
   body:='{}'::jsonb, timeout_milliseconds:=130000);
exception when others then
 -- Do not log headers/credentials or let a dispatch failure reject feedback.
 return null;
end;
$$;
revoke all on function public.dispatch_notion_feedback() from public,anon,authenticated;
grant execute on function public.dispatch_notion_feedback() to service_role;

create function public.wake_notion_feedback() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform public.dispatch_notion_feedback();
 return new;
end;
$$;
revoke all on function public.wake_notion_feedback() from public,anon,authenticated;
create trigger wake_notion_feedback after insert on public.feedback_notion_exports
for each row execute function public.wake_notion_feedback();
select cron.schedule('echoflow-notion-feedback','* * * * *','select public.dispatch_notion_feedback();');
