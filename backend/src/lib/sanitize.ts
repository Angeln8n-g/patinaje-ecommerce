/**
 * XSS sanitization utilities.
 * Strips dangerous HTML/script content from user inputs.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

const HTML_CHARS_REGEX = /[&<>"'/]/g;

/** Escape HTML special characters to prevent XSS */
export function escapeHtml(str: string): string {
  return str.replace(HTML_CHARS_REGEX, (char) => HTML_ENTITY_MAP[char] || char);
}

/** Strip all HTML tags from a string */
export function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize a user input string: strip tags + trim.
 * Use for text fields that should never contain HTML (names, comments, etc.)
 */
export function sanitize(input: unknown): string {
  if (typeof input !== "string") return "";
  return stripTags(input).trim();
}

/**
 * Recursively sanitize all string values in an object.
 * Useful for sanitizing entire request bodies.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitize(value);
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
