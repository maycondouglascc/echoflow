import type { Database } from "./supabase/database.types.ts";

export type ExportFeedback = Omit<
  Database["public"]["Tables"]["app_feedback"]["Row"],
  "request_sha256"
>;
export type ExportJob = {
  feedback_id: string;
  attempts: number;
  lease_token: string;
  creation_started: boolean;
  feedback: ExportFeedback;
};
export type ExportQueue = {
  start(job: ExportJob): Promise<void>;
  screenshot(path: string): Promise<Blob>;
  finish(
    job: ExportJob,
    page: string | null,
    error?: string,
    delay?: number,
    reset?: boolean,
  ): Promise<void>;
};

export class ExportError extends Error {
  code: string;
  retryAfter: number;
  rejected: boolean;
  constructor(code: string, retryAfter = 0, rejected = false) {
    super(code);
    this.code = code;
    this.retryAfter = retryAfter;
    this.rejected = rejected;
  }
}

// UTF-16 length bounded, without splitting surrogate pairs. Preserve full content.
export function richText(value: string) {
  const chunks: { type: "text"; text: { content: string } }[] = [];
  let chunk = "";
  for (const point of value) {
    if (chunk.length + point.length > 2000) {
      chunks.push({ type: "text", text: { content: chunk } });
      chunk = "";
    }
    chunk += point;
  }
  if (chunk) chunks.push({ type: "text", text: { content: chunk } });
  return chunks;
}

export function feedbackProperties(row: ExportFeedback, uploadId: string | null) {
  const text = (value: string) => ({ rich_text: richText(value) });
  return {
    Feedback: { title: richText(`Feedback ${row.id}`) },
    "Feedback ID": text(row.id),
    Mensagem: text(row.message),
    Página: text(row.page_path),
    "Recebido em": { date: { start: row.submitted_at } },
    "Capturado em": { date: { start: row.captured_at } },
    "Usuário ID": text(row.user_id),
    Viewport: text(JSON.stringify(row.viewport)),
    Contexto: text(JSON.stringify(row.navigation)),
    Screenshot: {
      files: uploadId
        ? [{ type: "file_upload", file_upload: { id: uploadId }, name: `${row.id}.png` }]
        : [],
    },
    Status: { select: { name: "Novo" } },
    Prioridade: { select: { name: "Não definida" } },
  };
}

type NotionResult = {
  id?: string;
  status?: string;
  results?: { id: string }[];
  properties?: Record<string, { type: string }>;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function remoteId(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value))
    throw new ExportError("invalid_notion_response");
  return value;
}

export class FeedbackNotionClient {
  private token: string;
  private source: string;
  private transport: typeof fetch;
  private pause: (ms: number) => Promise<void>;
  constructor(
    token: string,
    source: string,
    transport: typeof fetch = fetch,
    pause: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {
    if (!token || !UUID.test(source)) throw new ExportError("missing_configuration");
    this.token = token;
    this.source = source;
    this.transport = transport;
    this.pause = pause;
  }

  private async request(
    path: string,
    method: string,
    body?: object | FormData,
  ): Promise<NotionResult> {
    await this.pause(400);
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.token}`,
        "Notion-Version": "2026-03-11",
      };
      if (!(body instanceof FormData)) headers["Content-Type"] = "application/json";
      const result = await this.transport(`https://api.notion.com/v1/${path}`, {
        method,
        headers,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      });
      if (!result.ok) {
        const seconds = Number(result.headers.get("retry-after"));
        const retry = Number.isFinite(seconds) ? Math.max(0, Math.min(86400, seconds)) : 0;
        throw new ExportError(
          `notion_http_${result.status}`,
          retry,
          [400, 401, 403, 404, 409, 413, 422, 429].includes(result.status),
        );
      }
      return (await result.json()) as NotionResult;
    } catch (error) {
      if (error instanceof ExportError) throw error;
      // Never print server bodies, URLs, credentials or feedback text.
      throw new ExportError("notion_transport");
    }
  }

  async check() {
    const schema = await this.request(`data_sources/${this.source}`, "GET");
    const expected: Record<string, string> = {
      Feedback: "title",
      "Feedback ID": "rich_text",
      Mensagem: "rich_text",
      Página: "rich_text",
      "Recebido em": "date",
      "Capturado em": "date",
      "Usuário ID": "rich_text",
      Viewport: "rich_text",
      Contexto: "rich_text",
      Screenshot: "files",
      Status: "select",
      Prioridade: "select",
    };
    for (const [name, type] of Object.entries(expected)) {
      if (schema.properties?.[name]?.type !== type) throw new ExportError("notion_schema_mismatch");
    }
  }

  async find(feedbackId: string) {
    const result = await this.request(`data_sources/${this.source}/query`, "POST", {
      filter: { property: "Feedback ID", rich_text: { equals: feedbackId } },
      page_size: 2,
    });
    if (!Array.isArray(result.results)) throw new ExportError("invalid_notion_response");
    if (result.results.length > 1) throw new ExportError("duplicate_remote");
    return result.results[0] ? remoteId(result.results[0].id) : null;
  }

  async upload(row: ExportFeedback, file: Blob) {
    if (file.size < 1 || file.size > 2097152 || file.type !== "image/png")
      throw new ExportError("invalid_screenshot");
    const upload = await this.request("file_uploads", "POST", {
      mode: "single_part",
      filename: `${row.id}.png`,
      content_type: "image/png",
    });
    const id = remoteId(upload.id);
    const form = new FormData();
    form.set("file", file, `${row.id}.png`);
    const sent = await this.request(`file_uploads/${id}/send`, "POST", form);
    if (sent.status !== "uploaded") throw new ExportError("screenshot_not_uploaded");
    return id;
  }

  async create(row: ExportFeedback, uploadId: string | null) {
    const page = await this.request("pages", "POST", {
      parent: { type: "data_source_id", data_source_id: this.source },
      properties: feedbackProperties(row, uploadId),
    });
    return remoteId(page.id);
  }
}

export async function exportFeedback(
  job: ExportJob,
  queue: ExportQueue,
  notion: FeedbackNotionClient,
) {
  let creating = false;
  let page: string;
  try {
    const existing = await notion.find(job.feedback_id);
    if (existing) page = existing;
    else {
      if (job.creation_started) throw new ExportError("uncertain_creation");
      const row = job.feedback;
      const upload = row.screenshot_path
        ? await notion.upload(row, await queue.screenshot(row.screenshot_path))
        : null;
      await queue.start(job);
      creating = true;
      page = await notion.create(row, upload);
    }
  } catch (error) {
    const failure = error instanceof ExportError ? error : new ExportError("worker_dependency");
    const delay = Math.max(
      Math.min(3600, 60 * 2 ** Math.min(job.attempts - 1, 6)),
      failure.retryAfter,
    );
    await queue.finish(job, null, failure.code, delay, creating && failure.rejected);
    return { delivered: false, error: failure.code };
  }
  // If local acknowledgement fails, retain the durable creation marker. A future
  // claim queries the remote ID; it must never clear it and repeat creation.
  await queue.finish(job, page);
  return { delivered: true };
}
