import type { ContentPart, GenOptions, ModeId, Task, UploadedMedia } from "./types";
import { getApiKey } from "./store";

function authHeaders(): Record<string, string> {
  const key = getApiKey();
  return key ? { "x-byteplus-key": key } : {};
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `요청 실패 (${res.status})`);
  return data as T;
}

export async function uploadMedia(
  file: File,
  kind: UploadedMedia["kind"],
): Promise<UploadedMedia> {
  const res = await fetch(`/api/uploads?name=${encodeURIComponent(file.name)}`, {
    method: "POST",
    headers: { "content-type": file.type || "application/octet-stream" },
    body: file,
  });
  const data = await jsonOrThrow<{ key: string; url: string }>(res);
  return { kind, url: data.url, key: data.key, name: file.name };
}

export async function createTask(input: {
  mode: ModeId;
  model: string;
  content: ContentPart[];
  options: GenOptions;
}): Promise<Task> {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<Task>(res);
}

export async function listTasks(): Promise<Task[]> {
  const res = await fetch("/api/tasks");
  return jsonOrThrow<Task[]>(res);
}

export async function getTask(id: string): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, { headers: authHeaders() });
  return jsonOrThrow<Task>(res);
}

export async function deleteTask(id: string): Promise<void> {
  await fetch(`/api/tasks/${id}`, { method: "DELETE", headers: authHeaders() });
}
