import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const hook = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only")
      return { url: "data:text/javascript,export {}", shortCircuit: true };
    return next(specifier, context);
  },
});
const { richText, feedbackProperties, FeedbackNotionClient, exportFeedback } = await import(
  "../src/lib/notion-feedback.ts"
);
hook.deregister();
const source = "173fea48-0b42-40cc-996f-14c762857aa1";
const page = "11111111-1111-4111-8111-111111111111";
const upload = "22222222-2222-4222-8222-222222222222";
const feedback = {
  id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  user_id: "bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb",
  message: "Improve this app please.",
  page_path: "/home",
  submitted_at: "2026-10-04T12:00:00.000Z",
  captured_at: "2026-10-04T11:59:00.000Z",
  viewport: { width: 375, height: 800 },
  navigation: [],
  screenshot_path: null,
};
function fixture({
  image = false,
  started = false,
  results = [],
  createStatus = 200,
  lostResponse = false,
  uploadStatus = "uploaded",
  findStatus = 200,
  ackFails = false,
} = {}) {
  const calls = [],
    events = [];
  const job = {
    feedback_id: feedback.id,
    attempts: 1,
    lease_token: page,
    creation_started: started,
    feedback: { ...feedback, screenshot_path: image ? "owned/test.png" : null },
  };
  const transport = async (url, init) => {
    calls.push({
      url,
      init,
      body: init.body instanceof FormData ? init.body : init.body ? JSON.parse(init.body) : null,
    });
    if (url.endsWith("/query"))
      return Response.json({ results }, { status: findStatus, headers: { "Retry-After": "120" } });
    if (url.endsWith("/file_uploads")) return Response.json({ id: upload });
    if (url.endsWith("/send")) return Response.json({ id: upload, status: uploadStatus });
    if (url.endsWith("/pages")) {
      events.push("create");
      if (lostResponse) throw new Error("secret provider response");
      return Response.json(
        { id: page, secret: "private server details" },
        { status: createStatus, headers: { "Retry-After": "120" } },
      );
    }
    throw new Error("unexpected request");
  };
  const queue = {
    async start() {
      events.push("start");
      job.creation_started = true;
    },
    async screenshot(path) {
      events.push(path);
      return new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });
    },
    async finish(...args) {
      events.push(args);
      if (ackFails && args[1]) throw new Error("queue offline");
      if (args[4]) job.creation_started = false;
    },
  };
  return {
    calls,
    events,
    job,
    queue,
    notion: new FeedbackNotionClient("test-secret", source, transport, async () => {}),
  };
}
test("full 5000-character feedback and emoji boundaries survive Notion text limits", () => {
  const value = `${"a".repeat(1999)}😀${"b".repeat(2999)}`;
  const chunks = richText(value);
  assert.equal(chunks.map((v) => v.text.content).join(""), value);
  assert.ok(chunks.every((v) => v.text.content.length <= 2000 && v.text.content.isWellFormed()));
  const payload = feedbackProperties({ ...feedback, message: value }, null);
  assert.equal(payload.Mensagem.rich_text.map((v) => v.text.content).join(""), value);
  assert.equal(payload.Contexto.rich_text[0].text.content, "[]");
  assert.deepEqual(payload.Screenshot.files, []);
  assert.equal(payload["Usuário ID"].rich_text[0].text.content, feedback.user_id);
  for (const key of ["Notas Hermes", "Responsável", "Categoria", "Próxima ação", "Issue"])
    assert.equal(key in payload, false);
});
test("text-only delivery records creation intent before POST and acknowledges page", async () => {
  const f = fixture();
  assert.deepEqual(await exportFeedback(f.job, f.queue, f.notion), { delivered: true });
  assert.deepEqual(f.events.slice(0, 2), ["start", "create"]);
  assert.equal(f.events.at(-1)[1], page);
  assert.equal(f.calls[1].body.parent.data_source_id, source);
  assert.equal(f.calls[0].init.headers["Notion-Version"], "2026-03-11");
});
test("screenshot goes as multipart private upload, then files property, without source URL", async () => {
  const f = fixture({ image: true });
  await exportFeedback(f.job, f.queue, f.notion);
  const send = f.calls.find((v) => v.url.endsWith("/send"));
  assert.ok(send.body.get("file") instanceof File);
  assert.equal(send.init.headers["Content-Type"], undefined);
  assert.equal(f.calls.at(-1).body.properties.Screenshot.files[0].file_upload.id, upload);
  assert.ok(f.calls.every((v) => v.url.startsWith("https://api.notion.com/v1/")));
});
test("lost creation response leaves durable intent; resume reconciles without writing triage", async () => {
  const f = fixture({ lostResponse: true });
  assert.equal((await exportFeedback(f.job, f.queue, f.notion)).error, "notion_transport");
  assert.equal(f.job.creation_started, true);
  const resumed = fixture({ started: true, results: [{ id: page }] });
  assert.equal((await exportFeedback(resumed.job, resumed.queue, resumed.notion)).delivered, true);
  assert.equal(resumed.calls.length, 1);
  assert.equal(resumed.calls[0].body.filter.rich_text.equals, feedback.id);
});
test("unknown result without match never blindly recreates", async () => {
  const f = fixture({ started: true });
  assert.equal((await exportFeedback(f.job, f.queue, f.notion)).error, "uncertain_creation");
  assert.equal(f.calls.length, 1);
  assert.equal(f.job.creation_started, true);
});
test("known 429 rejection respects Retry-After and permits a later create", async () => {
  const f = fixture({ createStatus: 429 });
  await exportFeedback(f.job, f.queue, f.notion);
  assert.equal(f.events.at(-1)[3], 120);
  assert.equal(f.events.at(-1)[4], true);
  assert.equal(f.job.creation_started, false);
});
test("503 write may be committed; preserve intent rather than recreating", async () => {
  const f = fixture({ createStatus: 503 });
  await exportFeedback(f.job, f.queue, f.notion);
  assert.equal(f.events.at(-1)[2], "notion_http_503");
  assert.equal(f.events.at(-1)[4], false);
  assert.equal(f.job.creation_started, true);
});
test("query limit failure defers without setting creation intent", async () => {
  const f = fixture({ findStatus: 429 });
  await exportFeedback(f.job, f.queue, f.notion);
  assert.equal(f.calls.length, 1);
  assert.equal(f.job.creation_started, false);
});
test("duplicate remote records stop safely and do not modify either", async () => {
  const f = fixture({ results: [{ id: page }, { id: upload }] });
  assert.equal((await exportFeedback(f.job, f.queue, f.notion)).error, "duplicate_remote");
  assert.equal(f.calls.length, 1);
});
test("unfinished screenshot prevents page creation and leaves retryable job", async () => {
  const f = fixture({ image: true, uploadStatus: "pending" });
  assert.equal((await exportFeedback(f.job, f.queue, f.notion)).error, "screenshot_not_uploaded");
  assert.equal(f.job.creation_started, false);
  assert.ok(!f.calls.some((v) => v.url.endsWith("/pages")));
});
test("missing source screenshot defers without publishing an incomplete page", async () => {
  const f = fixture({ image: true });
  f.queue.screenshot = async () => {
    throw new Error("private storage error");
  };
  const result = await exportFeedback(f.job, f.queue, f.notion);
  assert.equal(result.error, "worker_dependency");
  assert.equal(f.calls.length, 1);
  assert.equal(f.job.creation_started, false);
});
test("nonempty context, timestamps and viewport are preserved exactly", () => {
  const row = {
    ...feedback,
    navigation: [{ path: "/home", action: "page", at: "2026-10-04T11:58:00.000Z" }],
  };
  const payload = feedbackProperties(row, null);
  assert.deepEqual(JSON.parse(payload.Contexto.rich_text[0].text.content), row.navigation);
  assert.deepEqual(JSON.parse(payload.Viewport.rich_text[0].text.content), row.viewport);
  assert.equal(payload["Recebido em"].date.start, row.submitted_at);
  assert.equal(payload["Capturado em"].date.start, row.captured_at);
});
test("queue acknowledgement failure propagates without resetting intent", async () => {
  const f = fixture({ ackFails: true });
  await assert.rejects(exportFeedback(f.job, f.queue, f.notion), /queue offline/);
  assert.equal(f.job.creation_started, true);
});
test("lost lease cannot start remote creation", async () => {
  const f = fixture();
  f.queue.start = async () => {
    throw new Error("lease expired");
  };
  await exportFeedback(f.job, f.queue, f.notion);
  assert.equal(f.calls.length, 1);
});
test("retry delay grows and caps at one hour", async () => {
  const f = fixture({ findStatus: 503 });
  f.job.attempts = 100;
  await exportFeedback(f.job, f.queue, f.notion);
  assert.equal(f.events.at(-1)[3], 3600);
});
test("schema check rejects missing/wrong property without writes", async () => {
  const calls = [];
  const n = new FeedbackNotionClient(
    "secret",
    source,
    async (_url, init) => {
      calls.push(init.method);
      return Response.json({ properties: { Feedback: { type: "rich_text" } } });
    },
    async () => {},
  );
  await assert.rejects(n.check(), /notion_schema_mismatch/);
  assert.deepEqual(calls, ["GET"]);
});
