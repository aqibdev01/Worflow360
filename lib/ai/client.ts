/**
 * AI Server HTTP client.
 *
 * All communication with the AI server goes through this module.
 * Every outbound payload is sanitized via guards.ts before sending.
 */

import { sanitizeForAI } from "./guards";
import * as https from "node:https";
import * as http from "node:http";
import { URL as NodeURL } from "node:url";

interface RawResponse {
  statusCode: number;
  body: string;
}

// Raw HTTPS request — bypasses undici/fetch entirely to avoid the
// UND_ERR_RES_CONTENT_LENGTH_MISMATCH thrown by HF Space's proxy.
function rawPost(urlStr: string, body: string, apiKey: string, timeoutMs: number): Promise<RawResponse> {
  const u = new NodeURL(urlStr);
  const mod: any = u.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = mod.request(
      {
        method: "POST",
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: u.pathname + u.search,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "X-API-Key": apiKey,
          Connection: "close",
          "Accept-Encoding": "identity",
        },
      },
      (res: any) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () =>
          resolve({
            statusCode: res.statusCode || 0,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
        res.on("error", (err: any) => {
          // Partial body is fine — hand back what we have.
          resolve({
            statusCode: res.statusCode || 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(Object.assign(new Error("Request timed out"), { name: "AbortError" }));
    });
    req.on("error", (err: any) => reject(err));
    req.write(body);
    req.end();
  });
}

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
    try {
      const { statusCode, body: text } = await rawPost(url, body, AI_API_KEY, 55_000);

      console.log("[ai-client] response", {
        endpoint,
        attempt,
        statusCode,
        bodyLength: text.length,
        bodyPreview: text.slice(0, 300),
        bodyTail: text.slice(-100),
      });

      if (statusCode < 200 || statusCode >= 300) {
        throw new Error(
          `AI server error ${statusCode} on ${endpoint}: ${text}`,
        );
      }

      if (!text || !text.trim()) {
        throw new Error(
          `AI server returned empty body (status ${statusCode})`,
        );
      }

      return JSON.parse(text) as T;
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
