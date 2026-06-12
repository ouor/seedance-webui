import { Hono } from "hono";

// ---- bindings (see wrangler.jsonc) ----
interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  MODELARK_BASE: string;
  CALLBACK_TOKEN: string; // anti-spoof token embedded in the callback_url
}

// shape of a ModelArk task (retrieve response == callback body)
interface ArkTask {
  id?: string;
  status?: string;
  content?: { video_url?: string };
  usage?: { total_tokens?: number };
  error?: { message?: string };
}

// ---- stored row shape ----
interface TaskRow {
  id: string;
  status: string;
  mode: string;
  model: string;
  prompt: string | null;
  params: string | null;
  input_media: string | null;
  remote_video_url: string | null;
  video_key: string | null;
  usage_tokens: number | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

const TERMINAL = new Set(["succeeded", "failed", "cancelled", "expired"]);

const app = new Hono<{ Bindings: Env }>();

// BYOK: the user's ModelArk key arrives per-request and is never persisted.
function getKey(c: { req: { header: (n: string) => string | undefined } }): string | null {
  return c.req.header("x-byteplus-key") || null;
}

function arkFetch(env: Env, path: string, key: string, init?: RequestInit) {
  return fetch(`${env.MODELARK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

function rowToClient(row: TaskRow, origin: string) {
  return {
    id: row.id,
    status: row.status,
    mode: row.mode,
    model: row.model,
    prompt: row.prompt,
    params: row.params ? JSON.parse(row.params) : null,
    inputMedia: row.input_media ? JSON.parse(row.input_media) : [],
    videoUrl: row.video_key ? `${origin}/media/${row.video_key}` : null,
    remoteVideoUrl: row.remote_video_url,
    usageTokens: row.usage_tokens,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Apply a ModelArk task state to D1. On success, archive the video into R2
// BEFORE ModelArk's ~24h url expires. Used by both the poll and the webhook,
// so completion is durable even if the browser is closed. No API key required —
// the result video_url is publicly fetchable.
async function finalizeUpdate(env: Env, id: string, data: ArkTask, row: TaskRow): Promise<TaskRow> {
  const now = Math.floor(Date.now() / 1000);
  let videoKey = row.video_key;
  if (data.status === "succeeded" && !videoKey && data.content?.video_url) {
    const vid = await fetch(data.content.video_url);
    if (vid.ok && vid.body) {
      videoKey = `videos/${id}.mp4`;
      await env.MEDIA.put(videoKey, vid.body, { httpMetadata: { contentType: "video/mp4" } });
    }
  }
  await env.DB.prepare(
    `UPDATE tasks SET status = ?, remote_video_url = ?, video_key = ?, usage_tokens = ?, error = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      data.status ?? row.status,
      data.content?.video_url ?? row.remote_video_url,
      videoKey,
      data.usage?.total_tokens ?? row.usage_tokens,
      data.error?.message ?? null,
      now,
      id,
    )
    .run();
  return (await env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first<TaskRow>())!;
}

// ============ media: public R2 serving (ModelArk fetches input by this URL) ============
app.get("/media/*", async (c) => {
  const key = c.req.path.replace(/^\/media\//, "");
  const obj = await c.env.MEDIA.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
});

// ============ upload: store bytes in R2, return a public URL for ModelArk ============
app.post("/api/uploads", async (c) => {
  const name = c.req.query("name") || "file";
  const contentType = c.req.header("content-type") || "application/octet-stream";
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `uploads/${crypto.randomUUID()}-${safe}`;
  await c.env.MEDIA.put(key, c.req.raw.body, { httpMetadata: { contentType } });
  const origin = new URL(c.req.url).origin;
  return c.json({ key, url: `${origin}/media/${key}` });
});

// ============ create a generation task ============
app.post("/api/tasks", async (c) => {
  const key = getKey(c);
  if (!key) return c.json({ error: "API 키가 없습니다. 설정에서 키를 등록하세요." }, 401);

  const body = await c.req.json<{
    mode: string;
    model: string;
    content: Array<Record<string, unknown>>;
    options?: Record<string, unknown>;
  }>();

  const arkBody: Record<string, unknown> = { model: body.model, content: body.content };
  for (const [k, v] of Object.entries(body.options || {})) {
    if (v !== undefined && v !== null && v !== "") arkBody[k] = v;
  }

  // Ask ModelArk to call us back on status change. Skipped on localhost, where
  // ModelArk can't reach us — the frontend poll covers dev.
  const origin = new URL(c.req.url).origin;
  if (!/localhost|127\.0\.0\.1/.test(origin)) {
    arkBody.callback_url = `${origin}/api/webhooks/modelark?token=${c.env.CALLBACK_TOKEN}`;
  }

  const res = await arkFetch(c.env, "/contents/generations/tasks", key, {
    method: "POST",
    body: JSON.stringify(arkBody),
  });
  const data = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !data.id) {
    return c.json({ error: data.error?.message || `생성 요청 실패 (${res.status})` }, 502);
  }

  const now = Math.floor(Date.now() / 1000);
  const prompt =
    (body.content.find((x) => x.type === "text")?.text as string | undefined) || null;
  const inputMedia = body.content
    .filter((x) => x.type !== "text")
    .map((x) => ({ type: x.type, role: x.role ?? null }));

  await c.env.DB.prepare(
    `INSERT INTO tasks (id, status, mode, model, prompt, params, input_media, created_at, updated_at)
     VALUES (?, 'queued', ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      data.id,
      body.mode,
      body.model,
      prompt,
      JSON.stringify(body.options || {}),
      JSON.stringify(inputMedia),
      now,
      now,
    )
    .run();

  const row = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(data.id).first<TaskRow>();
  return c.json(rowToClient(row!, new URL(c.req.url).origin));
});

// ============ list tasks ============
app.get("/api/tasks", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM tasks ORDER BY created_at DESC LIMIT 200",
  ).all<TaskRow>();
  const origin = new URL(c.req.url).origin;
  return c.json(results.map((r) => rowToClient(r, origin)));
});

// ============ get one task — polls ModelArk + archives finished video to R2 ============
app.get("/api/tasks/:id", async (c) => {
  const id = c.req.param("id");
  const origin = new URL(c.req.url).origin;
  let row = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first<TaskRow>();
  if (!row) return c.notFound();
  if (TERMINAL.has(row.status)) return c.json(rowToClient(row, origin));

  const key = getKey(c);
  if (!key) return c.json(rowToClient(row, origin)); // can't poll without a key; return last known

  const res = await arkFetch(c.env, `/contents/generations/tasks/${id}`, key, { method: "GET" });
  const data = (await res.json()) as {
    status?: string;
    content?: { video_url?: string };
    usage?: { total_tokens?: number };
    error?: { message?: string };
  };
  if (!res.ok || !data.status) return c.json(rowToClient(row, origin));

  const updated = await finalizeUpdate(c.env, id, data, row);
  return c.json(rowToClient(updated, origin));
});

// ============ webhook: ModelArk callback on status change (no key needed) ============
app.post("/api/webhooks/modelark", async (c) => {
  if (c.req.query("token") !== c.env.CALLBACK_TOKEN) return c.json({ error: "forbidden" }, 403);
  const data = (await c.req.json()) as ArkTask;
  if (!data.id) return c.json({ error: "missing id" }, 400);
  const row = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(data.id).first<TaskRow>();
  if (!row) return c.json({ ok: true }); // unknown / already deleted — ack so ModelArk stops retrying
  await finalizeUpdate(c.env, data.id, data, row);
  return c.json({ ok: true });
});

// ============ delete / cancel ============
app.delete("/api/tasks/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first<TaskRow>();
  if (!row) return c.notFound();

  const key = getKey(c);
  if (key) {
    // best effort: cancel queued / delete record on ModelArk
    await arkFetch(c.env, `/contents/generations/tasks/${id}`, key, { method: "DELETE" }).catch(
      () => undefined,
    );
  }
  if (row.video_key) await c.env.MEDIA.delete(row.video_key);
  await c.env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

// unknown API routes -> JSON 404 (never fall through to the SPA)
app.all("/api/*", (c) => c.json({ error: "not found" }, 404));

// everything else -> static assets / SPA fallback
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
