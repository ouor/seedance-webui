import { useCallback, useEffect, useRef, useState } from "react";
import { deleteTask, getTask, listTasks } from "../lib/api";
import type { Task, TaskStatus } from "../lib/types";

const TERMINAL: TaskStatus[] = ["succeeded", "failed", "cancelled", "expired"];
const isActive = (t: Task) => !TERMINAL.includes(t.status);

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const polling = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setTasks(await listTasks());
    } catch {
      /* offline / not deployed yet */
    } finally {
      setLoading(false);
    }
  }, []);

  const upsert = useCallback((t: Task) => {
    setTasks((prev) => {
      const i = prev.findIndex((p) => p.id === t.id);
      if (i === -1) return [t, ...prev];
      const next = [...prev];
      next[i] = t;
      return next;
    });
  }, []);

  const remove = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((p) => p.id !== id));
    await deleteTask(id);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // In production the ModelArk webhook finalizes tasks server-side, so this poll
  // mostly just reads back already-terminal rows from D1 (getTask short-circuits
  // on terminal status without re-hitting ModelArk). It is the primary path in
  // local dev, where the webhook can't reach localhost.
  useEffect(() => {
    const timer = setInterval(async () => {
      if (polling.current) return;
      const active = tasks.filter(isActive);
      if (active.length === 0) return;
      polling.current = true;
      try {
        for (const t of active) {
          const updated = await getTask(t.id).catch(() => null);
          if (updated) upsert(updated);
        }
      } finally {
        polling.current = false;
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [tasks, upsert]);

  return { tasks, loading, refresh, upsert, remove };
}
