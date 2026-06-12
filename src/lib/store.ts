// Local, browser-only persistence. The API key lives here and is NEVER stored
// server-side — it is sent per-request as a header and forwarded to BytePlus.
import { DEFAULT_OPTIONS, type GenOptions } from "./types";

const KEY_K = "seedance_api_key";
const PRESET_K = "seedance_preset";

export function getApiKey(): string {
  return localStorage.getItem(KEY_K) || "";
}
export function setApiKey(v: string) {
  if (v) localStorage.setItem(KEY_K, v);
  else localStorage.removeItem(KEY_K);
}
export function hasApiKey(): boolean {
  return !!getApiKey();
}

export function getPreset(): GenOptions {
  try {
    const raw = localStorage.getItem(PRESET_K);
    if (raw) return { ...DEFAULT_OPTIONS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_OPTIONS };
}
export function setPreset(p: GenOptions) {
  localStorage.setItem(PRESET_K, JSON.stringify(p));
}
