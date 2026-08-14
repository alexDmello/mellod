import { NextResponse } from "next/server";

export const DEFAULT_MAX_JSON_SIZE = 1 * 1024 * 1024; // 1 MB
export const DEFAULT_MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Sanitizes a single string to prevent XSS, HTML injection, and control character exploits.
 */
export function sanitizeString(str: string): string {
  if (typeof str !== "string") return str;

  return str
    // Remove null bytes
    .replace(/\0/g, "")
    .replace(/\u0000/g, "")
    // Remove script tags and inline event handlers
    .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, "")
    .replace(/on\w+\s*=\s*(['"]?)(.*?)\1/gi, "")
    // Remove javascript: and data: pseudo-protocols
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/data\s*:\s*text\/html/gi, "")
    // Strip raw HTML tags
    .replace(/<[^>]*>?/gm, "")
    // Trim surrounding whitespace
    .trim();
}

/**
 * Recursively sanitizes user input data structures (objects, arrays, strings).
 * Preserves primitive numbers, booleans, dates, null/undefined, and File/Blob objects.
 */
export function sanitizeInput<T>(val: T): T {
  if (val === null || val === undefined) {
    return val;
  }

  if (typeof val === "string") {
    return sanitizeString(val) as unknown as T;
  }

  if (typeof val === "number" || typeof val === "boolean") {
    return val;
  }

  if (val instanceof Date) {
    return val;
  }

  if (typeof File !== "undefined" && val instanceof File) {
    return val;
  }

  if (typeof Blob !== "undefined" && val instanceof Blob) {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => sanitizeInput(item)) as unknown as T;
  }

  if (typeof val === "object") {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(val as Record<string, any>)) {
      const cleanKey = sanitizeString(key);
      sanitizedObj[cleanKey] = sanitizeInput(value);
    }
    return sanitizedObj as T;
  }

  return val;
}

/**
 * Checks request Content-Length header against max payload size limit.
 */
export function checkPayloadSize(
  request: Request,
  maxSizeBytes: number = DEFAULT_MAX_JSON_SIZE
): { valid: boolean; size: number; limit: number } {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(contentLength) && contentLength > maxSizeBytes) {
      return { valid: false, size: contentLength, limit: maxSizeBytes };
    }
    return { valid: true, size: contentLength, limit: maxSizeBytes };
  }
  return { valid: true, size: 0, limit: maxSizeBytes };
}

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; status: 400 | 413; error: string };

/**
 * Safely parses JSON request body with payload size limits, malformed payload detection,
 * and recursive input sanitization.
 */
export function parseAndSanitizeJson<T = any>(
  rawText: string,
  maxSizeBytes: number = DEFAULT_MAX_JSON_SIZE
): ParseResult<T> {
  // Check payload byte length
  const byteLength = Buffer.byteLength(rawText, "utf8");
  if (byteLength > maxSizeBytes) {
    return {
      success: false,
      status: 413,
      error: `Payload too large (${Math.round(byteLength / 1024)}KB). Maximum allowed size is ${Math.round(maxSizeBytes / 1024)}KB.`,
    };
  }

  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      status: 400,
      error: "Malformed request payload: Request body cannot be empty.",
    };
  }

  try {
    const parsed = JSON.parse(rawText);
    const sanitized = sanitizeInput<T>(parsed);
    return { success: true, data: sanitized };
  } catch (err: any) {
    return {
      success: false,
      status: 400,
      error: `Malformed request payload: Invalid JSON format (${err.message}).`,
    };
  }
}

/**
 * Helper to generate standardized security error JSON responses.
 */
export function createSecurityErrorResponse(
  error: string,
  status: 400 | 413 | 429,
  additionalHeaders?: Record<string, string>
) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...additionalHeaders,
      },
    }
  );
}
