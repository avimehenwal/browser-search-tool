import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Result } from "./db";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function fetchSampleData(): Promise<Result[]> {
  try {
    // Handle basePath for GitHub Pages static export
    const basePath =
      typeof window !== "undefined"
        ? (window as { __NEXT_PUBLIC_BASE_PATH__?: string })
            .__NEXT_PUBLIC_BASE_PATH__ || ""
        : "";
    const url = `${basePath}/sample.data.json`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("fetchSampleData error", res.statusText, "url:", url);
      return [];
    }
    const json = await res.json();
    if (Array.isArray(json)) return json as Result[];
    if (json && Array.isArray(json.data)) return json.data as Result[];
    return [];
  } catch (err) {
    console.error("fetchSampleData error", err);
    return [];
  }
}

export function formatDatestringToDate(s: string): Date {
  const datePart = String(s).split("T")[0];
  const parts = datePart.split(".");
  const day = Number(parts[0] ?? 0);
  const month = Number(parts[1] ?? 1);
  const year = Number(parts[2] ?? 1970);
  return new Date(year, Math.max(0, month - 1), day);
}

// Sanitize and normalize user-provided search query strings.
// - strips HTML tags
// - removes control characters
// - trims and limits length
export function sanitizeSearchQuery(q: unknown, maxLen = 200): string {
  try {
    let s = String(q ?? "").trim();
    // remove HTML tags
    s = s.replace(/<[^>]*>/g, "");
    // remove control characters
    s = s.replace(/[\x00-\x1F\x7F]+/g, " ");
    // collapse whitespace
    s = s.replace(/\s+/g, " ");
    if (s.length > maxLen) s = s.slice(0, maxLen);
    return s;
  } catch {
    return "";
  }
}

// Escape HTML special characters
export function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Escape HTML but preserve <mark> and </mark> tags which we use for highlights.
export function escapeHtmlPreserveMark(s: string) {
  if (!s) return s;
  // temporarily replace mark tags with placeholders
  const open = "___MARK_OPEN___";
  const close = "___MARK_CLOSE___";
  const t = String(s)
    .replace(/<mark>/gi, open)
    .replace(/<\/mark>/gi, close);
  const escaped = escapeHtml(t);
  return escaped
    .replace(new RegExp(open, "g"), "<mark>")
    .replace(new RegExp(close, "g"), "</mark>");
}
