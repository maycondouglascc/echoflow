begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(23);
-- Synthetic feedback only. All modifications roll back.
insert into auth.users(id,email) values
 ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','notion-a@example.test'),
 ('bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb','notion-b@example.test');
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',true);
select lives_ok($$insert into public.app_feedback(id,user_id,message,page_path,captured_at,viewport,navigation,request_sha256)
 values('dddddddd-dddd-4ddd-addd-dddddddddddd','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','Export this feedback please.','/home',now(),'{"width":375,"height":800}','[]',repeat('a',64))$$,'owned insert atomically enqueues');
select throws_ok('select * from public.feedback_notion_exports','42501',null,'A cannot read jobs');
select throws_ok('select public.claim_notion_feedback()','42501',null,'A cannot claim');
select throws_ok($$select public.start_notion_feedback(gen_random_uuid(),gen_random_uuid())$$,'42501',null,'A cannot start');
select throws_ok($$select public.finish_notion_feedback(gen_random_uuid(),gen_random_uuid(),null,'fixture',60,false)$$,'42501',null,'A cannot finish');
select throws_ok('update public.feedback_notion_exports set creation_started=false','42501',null,'A cannot modify jobs');
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',true);
select throws_ok('select * from public.feedback_notion_exports','42501',null,'B cannot read A jobs');
select throws_ok('select public.claim_notion_feedback()','42501',null,'B cannot claim');
reset role;
set local role anon;
select throws_ok('select * from public.feedback_notion_exports','42501',null,'anon cannot read jobs');
select throws_ok('select public.claim_notion_feedback()','42501',null,'anon cannot claim');
reset role;
select is((select count(*)::integer from public.feedback_notion_exports where feedback_id='dddddddd-dddd-4ddd-addd-dddddddddddd'),1,'one queued job per feedback');
-- Exercise the same conflict-safe backfill statement against a preexisting row.
delete from public.feedback_notion_exports where feedback_id='dddddddd-dddd-4ddd-addd-dddddddddddd';
insert into public.feedback_notion_exports(feedback_id) select id from public.app_feedback on conflict do nothing;
insert into public.feedback_notion_exports(feedback_id) select id from public.app_feedback on conflict do nothing;
select is((select count(*)::integer from public.feedback_notion_exports where feedback_id='dddddddd-dddd-4ddd-addd-dddddddddddd'),1,'backfill is complete and repeatable');
-- Prevent unrelated local rows from participating in claim assertions.
update public.feedback_notion_exports set next_attempt_at=now()+interval '1 day' where feedback_id<>'dddddddd-dddd-4ddd-addd-dddddddddddd';
create temporary table claimed(job jsonb);
grant all on claimed to service_role;
set local role service_role;
insert into claimed values(public.claim_notion_feedback());
select is((select job->>'feedback_id' from claimed),'dddddddd-dddd-4ddd-addd-dddddddddddd','worker claims expected row');
select is(public.claim_notion_feedback(),null::jsonb,'second claim cannot take active lease');
select is(public.start_notion_feedback('dddddddd-dddd-4ddd-addd-dddddddddddd',gen_random_uuid()),false,'wrong fencing token rejected');
select is(public.start_notion_feedback('dddddddd-dddd-4ddd-addd-dddddddddddd',(select (job->>'lease_token')::uuid from claimed)),true,'lease owner records intent');
select is((select creation_started from public.feedback_notion_exports where feedback_id='dddddddd-dddd-4ddd-addd-dddddddddddd'),true,'intent persists before external call');
select is(public.finish_notion_feedback('dddddddd-dddd-4ddd-addd-dddddddddddd',(select (job->>'lease_token')::uuid from claimed),null,'notion_transport',120,false),true,'failure recorded');
select is(public.claim_notion_feedback(),null::jsonb,'retry not due immediately');
update public.feedback_notion_exports set next_attempt_at=now() where feedback_id='dddddddd-dddd-4ddd-addd-dddddddddddd';
delete from claimed;
insert into claimed values(public.claim_notion_feedback());
select is((select job->>'creation_started' from claimed),'true','resumed job carries uncertain intent');
update public.feedback_notion_exports set lease_until=now()-interval '1 second' where feedback_id='dddddddd-dddd-4ddd-addd-dddddddddddd';
select is(public.finish_notion_feedback('dddddddd-dddd-4ddd-addd-dddddddddddd',(select (job->>'lease_token')::uuid from claimed),'11111111-1111-4111-8111-111111111111',null,60,false),false,'expired lease cannot acknowledge');
delete from claimed;
insert into claimed values(public.claim_notion_feedback());
select is(public.finish_notion_feedback('dddddddd-dddd-4ddd-addd-dddddddddddd',(select (job->>'lease_token')::uuid from claimed),'11111111-1111-4111-8111-111111111111',null,60,false),true,'new lease acknowledges reconciliation');
select is(public.claim_notion_feedback(),null::jsonb,'delivered job not reclaimed');
reset role;
select * from finish();
rollback;
