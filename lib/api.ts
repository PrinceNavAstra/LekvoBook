"use client";
import { useCallback, useEffect, useState } from "react";

export const SIGNED_OUT_EVENT = "lekvo:signed-out";

/**
 * Calls an API route and throws an Error carrying the server's user-friendly message.
 * Handles both error shapes in this app: { error: { message } } (v1 routes) and { error: "text" } (auth routes).
 * A 401 on a data route tells the app the session ended, so it can show the sign-in screen.
 */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new Error("You appear to be offline. Check your connection and try again.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && url.startsWith("/api/v1/")) window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
    const err = body?.error;
    throw new Error((typeof err === "string" ? err : err?.message) ?? "Something went wrong. Please try again.");
  }
  return body as T;
}

export const post = <T,>(url: string, data: unknown) => api<T>(url, { method: "POST", body: JSON.stringify(data) });

/** Loads a GET endpoint and exposes loading, error and reload state. */
export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api<T>(url));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load };
}
