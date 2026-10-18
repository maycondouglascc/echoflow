import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

const container = process.env.ECHOFLOW_HISTORY_DB_CONTAINER;
function sql(query) {
  return new Promise((resolve, reject) => {
    const p = spawn(
      "docker",
      [
        "exec",
        "-i",
        container,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-At",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let out = "",
      err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(out) : reject(Error(err))));
    p.stdin.end(query);
  });
}
test("real separate transactions serialize overlapping duplicate/distinct events without lost counters", {
  skip: !container,
}, async () => {
  assert.equal(
    container,
    "supabase_db_echoflow-008-history",
    "explicit isolated history stack required",
  );
  const uid = "99999999-9999-4999-a999-999999999999",
    pid = "dddddddd-dddd-4ddd-addd-000000000001",
    list = "cccccccc-cccc-4ccc-accc-000000000001";
  try {
    await sql(
      `insert into auth.users(id,email)values('${uid}','concurrency@example.test');insert into public.playlists(id,slug,title,sort_order,published)values('${list}','history-concurrency','Concurrency',998,true);insert into public.phrases(id,playlist_id,slug,text,category,sort_order,published)values('${pid}','${list}','history-concurrency-phrase','Test','test',1,true);`,
    );
    const events = (first) =>
      Array.from(
        { length: 12 },
        (_, i) => `${String(first + i).padStart(8, "0")}-1111-4111-a111-111111111111`,
      );
    const submission = (ids) =>
      `begin;set local role authenticated;set local request.jwt.claim.sub='${uid}';${ids.map((id) => `select public.record_phrase_listen('${id}','${pid}','${uid}');`).join("")}select pg_sleep(0.05);commit;`;
    await Promise.all([sql(submission(events(1))), sql(submission(events(7)))]);
    assert.equal(
      (await sql(`select count from public.phrase_listen_counts where user_id='${uid}';`)).trim(),
      "18",
    );
    assert.equal(
      (
        await sql(`select count(*) from public.phrase_listen_events where user_id='${uid}';`)
      ).trim(),
      "18",
    );
  } finally {
    await sql(
      `delete from auth.users where id='${uid}';delete from public.phrases where id='${pid}';delete from public.playlists where id='${list}';`,
    );
  }
});
