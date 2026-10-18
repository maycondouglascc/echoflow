export function feedbackHandler(secret: string, run: () => Promise<unknown>) {
  return async (request: Request) => {
    const response = (body: object, status: number) =>
      Response.json(body, {
        status,
        headers: { "Cache-Control": "no-store" },
      });
    if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
      return response({ error: "unauthorized" }, 401);
    try {
      return response({ result: await run() }, 200);
    } catch {
      return response({ error: "export_unavailable" }, 503);
    }
  };
}
