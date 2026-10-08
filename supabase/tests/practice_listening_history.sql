begin;
select plan(37);
insert into auth.users(id,email) values
('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','history-a@example.test'),
('bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb','history-b@example.test');
insert into public.playlists(id,slug,title,sort_order,published) values
('cccccccc-cccc-4ccc-accc-cccccccccccc','history-test','History test',999,true);
insert into public.phrases(id,playlist_id,slug,text,category,sort_order,published) values
('dddddddd-dddd-4ddd-addd-dddddddddddd','cccccccc-cccc-4ccc-accc-cccccccccccc','history-one','One','test',1,true),
('eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee','cccccccc-cccc-4ccc-accc-cccccccccccc','history-two','Two','test',2,true);
select has_table('public','phrase_listen_events','events ledger exists');
select has_table('public','phrase_listen_counts','aggregate exists');
select ok(exists(select 1 from pg_indexes where schemaname='public' and tablename='phrase_listen_events' and indexdef like '%(user_id, created_at)%'),'quota has user/time index');
set local role anon;
select throws_ok('select * from public.phrase_listen_events','42501',null,'anon cannot read events');
select throws_ok('select * from public.phrase_listen_counts','42501',null,'anon cannot read counts');
select throws_ok($$select public.record_phrase_listen('11111111-1111-4111-a111-111111111111','dddddddd-dddd-4ddd-addd-dddddddddddd','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')$$,'42501',null,'anon cannot execute RPC');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',true);
select is((public.record_phrase_listen('11111111-1111-4111-a111-111111111111','dddddddd-dddd-4ddd-addd-dddddddddddd','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')->>'count')::bigint,1::bigint,'A initial event increments');
select is((public.record_phrase_listen('11111111-1111-4111-a111-111111111111','dddddddd-dddd-4ddd-addd-dddddddddddd','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')->>'duplicate')::boolean,true,'retry duplicate successful');
select is((public.record_phrase_listen('11111111-1111-4111-a111-111111111111','eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')->>'reason'),'conflict','same event different phrase conflicts');
select is((public.record_phrase_listen('22222222-2222-4222-a222-222222222222','dddddddd-dddd-4ddd-addd-dddddddddddd','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')->>'count')::bigint,2::bigint,'distinct event adds atomically');
select is((select count(*)::int from public.phrase_listen_events),2,'A sees own events only');
select is((public.record_phrase_listen('33333333-3333-4333-a333-333333333333','dddddddd-dddd-4ddd-addd-dddddddddddd','bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb')->>'reason'),'identity_changed','stale A cannot submit for B');
select is((public.record_phrase_listen('33333333-3333-4333-a333-333333333333','ffffffff-ffff-4fff-afff-ffffffffffff','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')->>'reason'),'not_available','missing phrase rejected');
select throws_ok($$insert into public.phrase_listen_events(user_id,event_id,phrase_id) values('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','33333333-3333-4333-a333-333333333333','dddddddd-dddd-4ddd-addd-dddddddddddd')$$,'42501',null,'direct event insert denied');
select throws_ok('update public.phrase_listen_counts set count=99','42501',null,'direct counter update denied');
select throws_ok('delete from public.phrase_listen_events','42501',null,'direct event delete denied');
select throws_ok('update public.phrase_listen_events set created_at=now()', '42501',null,'direct event timestamp mutation denied');
select throws_ok($$insert into public.phrase_listen_counts(user_id,phrase_id,count)values('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','eeeeeeee-eeee-4eee-aeee-eeeeeeeeeeee',1)$$,'42501',null,'direct counter insert denied');
select throws_ok('delete from public.phrase_listen_counts','42501',null,'direct counter delete denied');
select is(public.record_phrase_listen(null,'dddddddd-dddd-4ddd-addd-dddddddddddd','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')->>'reason','not_available','null event cannot bypass ledger');
select set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',true);
select is((select count(*)::int from public.phrase_listen_events),0,'B cannot see A ledger');
select is((select count(*)::int from public.phrase_listen_counts),0,'B cannot see A count');
select is((public.record_phrase_listen('11111111-1111-4111-a111-111111111111','dddddddd-dddd-4ddd-addd-dddddddddddd','bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb')->>'count')::bigint,1::bigint,'B identical event identity is separate ownership');
select set_config('request.jwt.claim.sub','',true);
select is(public.record_phrase_listen('33333333-3333-4333-a333-333333333333','dddddddd-dddd-4ddd-addd-dddddddddddd','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')->>'reason','unauthenticated','authenticated role without UID rejected');
reset role;
-- Server timestamps and aggregate reconciliation; fill the minute budget.
insert into public.phrase_listen_events(user_id,event_id,phrase_id)
select 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',gen_random_uuid(),'dddddddd-dddd-4ddd-addd-dddddddddddd' from generate_series(1,58);
update public.phrase_listen_counts set count=60 where user_id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',true);
select is(public.record_phrase_listen('44444444-4444-4444-a444-444444444444','dddddddd-dddd-4ddd-addd-dddddddddddd','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')->>'reason','rate_limited','61st new minute event rejected');
select is((public.record_phrase_listen('11111111-1111-4111-a111-111111111111','dddddddd-dddd-4ddd-addd-dddddddddddd','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')->>'count')::bigint,60::bigint,'duplicate retry exempt from quota');
reset role;
select is((select count(*) from public.phrase_listen_events where user_id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),(select count from public.phrase_listen_counts where user_id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),'ledger reconciles with count');
update public.phrase_listen_events set created_at=now()-interval '2 minutes' where user_id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
update public.phrase_listen_counts set count=9007199254740991 where user_id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',true);
select is(public.record_phrase_listen('44444444-4444-4444-a444-444444444444','dddddddd-dddd-4ddd-addd-dddddddddddd','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')->>'reason','limit_reached','JSON safe count limit rejects save');
select is((select count(*)::int from public.phrase_listen_events where event_id='44444444-4444-4444-a444-444444444444'),0,'overflow leaves no orphan event');
reset role;
update public.playlists set published=false where id='cccccccc-cccc-4ccc-accc-cccccccccccc';
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',true);
select is((select count(*)::int from public.phrase_listen_counts),0,'hidden catalog hides existing history');
select is(public.record_phrase_listen('11111111-1111-4111-a111-111111111111','dddddddd-dddd-4ddd-addd-dddddddddddd','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')->>'reason','not_available','hidden phrase duplicate cannot expose count');
reset role;
delete from auth.users where id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
select is((select count(*)::int from public.phrase_listen_events where user_id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),0,'account deletion cascades ledger');
select is((select count(*)::int from public.phrase_listen_counts where user_id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),0,'account deletion cascades counter');
delete from public.phrases where id='dddddddd-dddd-4ddd-addd-dddddddddddd';
select is((select count(*)::int from public.phrase_listen_events),0,'phrase deletion cascades events');
select is((select count(*)::int from public.phrase_listen_counts),0,'phrase deletion cascades counters');
select ok((select prosecdef and proconfig @> array['search_path=""'] from pg_proc where oid='public.record_phrase_listen(uuid,uuid,uuid)'::regprocedure),'narrow definer fixed search path');
select ok(not has_function_privilege('anon','public.record_phrase_listen(uuid,uuid,uuid)','execute'),'anon execution revoked');
select * from finish();
rollback;
