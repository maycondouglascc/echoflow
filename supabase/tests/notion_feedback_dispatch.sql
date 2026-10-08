begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(9);
select is((select count(*)::integer from cron.job where jobname='echoflow-notion-feedback' and schedule='* * * * *' and active),1,'minute recovery enabled once');
select is((select count(*)::integer from pg_trigger where tgname='wake_notion_feedback' and not tgisinternal),1,'new jobs wake dispatcher');
set local role anon;
select throws_ok('select public.dispatch_notion_feedback()','42501',null,'anon cannot invoke dispatcher');
select throws_ok('select public.wake_notion_feedback()','42501',null,'anon cannot invoke trigger function');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',true);
select throws_ok('select public.dispatch_notion_feedback()','42501',null,'A cannot invoke dispatcher');
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',true);
select throws_ok('select public.dispatch_notion_feedback()','42501',null,'B cannot invoke dispatcher');
reset role;
-- Synthetic Vault values, all rolled back: pg_net only sends after commit.
insert into auth.users(id,email) values('eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee','dispatch@example.test');
insert into public.app_feedback(id,user_id,message,page_path,captured_at,viewport,request_sha256)
 values('ffffffff-ffff-4fff-afff-ffffffffffff','eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee','Dispatch fixture feedback.','/home',now(),'{"width":375,"height":800}',repeat('a',64));
select lives_ok('select public.dispatch_notion_feedback()','missing Vault config never breaks feedback');
select vault.create_secret('fixture-secret','notion_feedback_invoke_secret');
select vault.create_secret('https://example.invalid/functions/v1/notion-feedback','notion_feedback_function_url');
select ok(public.dispatch_notion_feedback() is not null,'due job schedules asynchronous HTTP when configured');
update public.feedback_notion_exports set next_attempt_at=now()+interval '1 day';
select is(public.dispatch_notion_feedback(),null::bigint,'idle queue sends zero network requests');
select * from finish();
rollback;
