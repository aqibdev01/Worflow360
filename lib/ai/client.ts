/**
 * AI Server HTTP client.
 *
 * All communication with the AI server goes through this module.
 * Every outbound payload is sanitized via guards.ts before sending.
 */

import { sanitizeForAI } from "./guards";

const AI_SERVER_URL =
  process.env.AI_SERVER_URL || "http://localhost:8000";
const AI_API_KEY = process.env.AI_API_KEY || "";

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

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": AI_API_KEY,
    },
    body: JSON.stringify(safePayload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(
      `AI server error ${res.status} on ${endpoint}: ${errorBody}`
    );
  }

  return res.json() as Promise<T>;
}
