begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
-- Match the Storage API's transaction setting; still test as distinct caller roles.
set local storage.allow_delete_query = 'true';
select plan(18);
insert into auth.users(id,email) values
 ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','feedback-a@example.test'),
 ('bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb','feedback-b@example.test');
select is((select public from storage.buckets where id='feedback-screenshots'),false,'screenshots private');
set local role anon;
select throws_ok('select * from public.app_feedback','42501',null,'anon denied feedback');
select is((select count(*)::integer from storage.objects where bucket_id='feedback-screenshots'),0,'anon denied screenshots');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',true);
select lives_ok($$insert into public.app_feedback(id,user_id,message,page_path,captured_at,viewport,navigation,request_sha256) values('cccccccc-cccc-4ccc-accc-cccccccccccc','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','Improve this app please.','/home',now(),'{"width":375,"height":800}','[]',repeat('a',64))$$,'A inserts own feedback');
select lives_ok($$insert into storage.objects(bucket_id,name) values('feedback-screenshots','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa/cccccccc-cccc-4ccc-accc-cccccccccccc.png')$$,'A uploads own screenshot');
select is((select count(*)::integer from public.app_feedback),1,'A reads own feedback');
select throws_ok($$insert into public.app_feedback(id,user_id,message,page_path,captured_at,viewport,navigation,request_sha256) values(gen_random_uuid(),'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb','Improve this app please.','/home',now(),'{"width":375,"height":800}','[]',repeat('a',64))$$,'42501',null,'cannot impersonate B');
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',true);
select is((select count(*)::integer from public.app_feedback),0,'B cannot read A');
select is((select count(*)::integer from storage.objects where bucket_id='feedback-screenshots'),0,'B cannot read A screenshot');
select throws_ok('update public.app_feedback set message=''Changed text''','42501',null,'feedback immutable');
select throws_ok('delete from public.app_feedback','42501',null,'feedback cannot be deleted by user');
select throws_ok($$insert into storage.objects(bucket_id,name) values('feedback-screenshots','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa/dddddddd-dddd-4ddd-addd-dddddddddddd.png')$$,'42501',null,'B cannot attach to A');
with removed as (delete from storage.objects where bucket_id='feedback-screenshots' returning *) select is((select count(*)::integer from removed),0,'B cannot delete A screenshot');
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',true);
select is((select count(*)::integer from storage.objects where bucket_id='feedback-screenshots'),1,'A reads own screenshot');
select lives_ok($$delete from storage.objects where bucket_id='feedback-screenshots'$$,'A may clean own upload');
select throws_ok($$insert into public.app_feedback(id,user_id,message,page_path,captured_at,viewport,navigation,screenshot_path,request_sha256) values(gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','Improve this app please.','/home',now(),'{"width":375,"height":800}','[]','bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb/cccccccc-cccc-4ccc-accc-cccccccccccc.png',repeat('a',64))$$,'23514',null,'screenshot path cannot name B');
select throws_ok($$insert into public.app_feedback(id,user_id,message,page_path,captured_at,viewport,navigation,request_sha256) values(gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','Improve this app please.','/home',now(),'{"width":375,"height":800}','[{"path":"/home?token=secret","action":"page","at":"2026-10-04T12:00:00.000Z"}]',repeat('a',64))$$,'23514',null,'database rejects unsafe navigation');
select throws_ok($$insert into public.app_feedback(id,user_id,message,page_path,submitted_at,captured_at,viewport,navigation,request_sha256) values(gen_random_uuid(),'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','Improve this app please.','/home',now(),now(),'{"width":375,"height":800}','[]',repeat('a',64))$$,'42501',null,'submission time is server generated');

reset role;
select * from finish();
rollback;
