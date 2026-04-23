/**
 * AI Server HTTP client.
 *
 * All communication with the AI server goes through this module.
 * Every outbound payload is sanitized via guards.ts before sending.
 */

import { sanitizeForAI } from "./guards";

const AI_SERVER_URL = (
  process.env.AI_SERVER_URL || "http://localhost:8000"
).trim().replace(/\/+$/, "");
const AI_API_KEY = (process.env.AI_API_KEY || "").trim();

/**
 * Send a sanitized POST request to the AI server.
 *
 * @param endpoint - Path e.g. "/api/decompose"
 * @param payload  - Request body (will be sanitized before sending)
 * @returns Parsed JSON response from the AI server
 */
export async function callAIServer<T>(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<T> {
  // Last-line-of-defense: strip any accidental PII
  const safePayload = sanitizeForAI(payload);

  const url = `${AI_SERVER_URL}${endpoint}`;
  const body = JSON.stringify(safePayload);

  // HF Spaces occasionally closes keep-alive sockets mid-response on Node 24/undici.
  // Retry on SocketError / connection-reset so the user doesn't see a hard failure.
  const maxAttempts = 3;
  let lastErr: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55_000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": AI_API_KEY,
          Connection: "close",
          "Accept-Encoding": "identity",
        },
        body,
        signal: controller.signal,
        keepalive: false,
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(
          `AI server error ${res.status} on ${endpoint}: ${errorBody}`,
        );
      }

      return (await res.json()) as T;
    } catch (err: any) {
      lastErr = err;
      const causeCode = err?.cause?.code;
      const isRetryable =
        err?.name === "AbortError" ||
        causeCode === "UND_ERR_SOCKET" ||
        causeCode === "UND_ERR_RES_CONTENT_LENGTH_MISMATCH" ||
        causeCode === "ECONNRESET" ||
        causeCode === "ECONNREFUSED" ||
        causeCode === "ETIMEDOUT";

      console.error("[ai-client] fetch failed", {
        url,
        endpoint,
        attempt,
        errName: err?.name,
        errMessage: err?.message,
        errCause: causeCode || err?.cause?.message,
        willRetry: isRetryable && attempt < maxAttempts,
      });

      if (!isRetryable || attempt === maxAttempts) break;

      await new Promise((r) => setTimeout(r, 500 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastErr?.name === "AbortError") {
    throw new Error(
      `AI server timed out on ${endpoint} — the model may be warming up. Try again in a few seconds.`,
    );
  }
  throw new Error(
    `AI server unreachable at ${url}: ${lastErr?.message || lastErr} (cause: ${lastErr?.cause?.code || "unknown"})`,
  );
}
