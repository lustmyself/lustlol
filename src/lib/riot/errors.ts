import { RiotError } from "./client";
import type { ApiErrorCode } from "./types";

export function errorCode(e: unknown): ApiErrorCode {
  if (e instanceof RiotError) return e.code;
  console.error(e);
  return "unavailable";
}

export function errorResponse(e: unknown) {
  const code = errorCode(e);
  const status = code === "not_found" ? 404 : code === "rate_limited" ? 429 : code === "unavailable" ? 502 : 503;
  return Response.json({ error: code }, { status });
}
