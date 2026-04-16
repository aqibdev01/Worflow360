/**
 * AI DATA BOUNDARY — PII stripping guard
 *
 * Recursively removes any forbidden fields from payloads before
 * they are sent to the AI server. This is the last line of defense.
 */

const FORBIDDEN_FIELDS = new Set([
  // User PII
  "email",
  "password",
  "encrypted_password",
  "phone",
  "avatar_url",
  "full_name",
  "security_question",
  "security_answer",
  "raw_user_meta_data",
  "raw_app_meta_data",
  "recovery_token",
  "confirmation_token",
  // Communication content
  "content", // chat message content
  "body", // mail body
  "message", // any message field
  "subject", // mail subject
  // File data
  "storage_path", // file storage paths
  "public_url", // file URLs
  "file_path",
  // Auth / session
  "token",
  "session",
  "cookie",
  "access_token",
  "refresh_token",
]);

/**
 * Strip any accidental PII before sending to AI server.
 *
 * Recursively walks the data structure and removes any key whose
 * lowercase name matches a forbidden field. This runs on every
 * payload before it leaves the Next.js server.
 *
 * @param data - Any data structure to sanitize
 * @returns A new deep copy with forbidden fields removed
 */
export function sanitizeForAI(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return data;

  if (Array.isArray(data)) return data.map(sanitizeForAI);

  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>)
      .filter(([key]) => !FORBIDDEN_FIELDS.has(key.toLowerCase()))
      .map(([key, val]) => [key, sanitizeForAI(val)])
  );
}

/**
 * Validate that a payload contains ONLY expected keys.
 *
 * Unlike sanitizeForAI (which silently strips), this throws if
 * forbidden fields are found — use it in development/testing to
 * catch bugs early.
 *
 * @param data - The payload to validate
 * @param context - Label for error messages (e.g. "decompose request")
 * @throws Error if any forbidden fields are detected
 */
export function assertNoForbiddenFields(
  data: Record<string, unknown>,
  context: string
): void {
  const violations: string[] = [];
  _findViolations(data, "", violations);
  if (violations.length > 0) {
    throw new Error(
      `[AI Privacy Violation] ${context}: forbidden fields detected: ${violations.join(", ")}`
    );
  }
}

function _findViolations(
  data: unknown,
  path: string,
  violations: string[]
): void {
  if (typeof data !== "object" || data === null) return;

  if (Array.isArray(data)) {
    data.forEach((item, i) => _findViolations(item, `${path}[${i}]`, violations));
    return;
  }

  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    const fullPath = path ? `${path}.${key}` : key;
    if (FORBIDDEN_FIELDS.has(key.toLowerCase())) {
      violations.push(fullPath);
    }
    _findViolations(val, fullPath, violations);
  }
}
