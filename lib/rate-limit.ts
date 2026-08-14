import { NextRequest } from "next/server";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  limit: number;
  isAuth: boolean;
  ip: string;
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
const AUTH_LIMIT = 5; // max 5 attempts on auth routes per 15 minutes
const GENERAL_LIMIT = 100; // max 100 requests on general endpoints per 15 minutes

// In-memory sliding window store: key -> array of request timestamps
const memoryStore = new Map<string, number[]>();

// Periodically clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of memoryStore.entries()) {
      const validTimestamps = timestamps.filter((t) => now - t < WINDOW_MS);
      if (validTimestamps.length === 0) {
        memoryStore.delete(key);
      } else {
        memoryStore.set(key, validTimestamps);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Checks whether a given path is an authentication or credential route.
 */
export function isAuthRoute(pathname: string): boolean {
  const normalizedPath = pathname.toLowerCase();
  return (
    normalizedPath.startsWith("/api/auth") ||
    normalizedPath.includes("/admin/verify-credentials-key") ||
    normalizedPath.includes("/admin/create-user") ||
    normalizedPath.includes("/dpdp/erase-account")
  );
}

/**
 * Extracts client IP from request headers or request object.
 */
export function getClientIp(request: Request | NextRequest): string {
  const headers = request.headers;
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ips = xForwardedFor.split(",").map((ip) => ip.trim());
    if (ips[0]) return ips[0];
  }
  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  if ("ip" in request && typeof (request as any).ip === "string") {
    return (request as any).ip;
  }

  return "127.0.0.1";
}

/**
 * Checks and updates rate limits for incoming requests using sliding window.
 */
export function checkRateLimit(request: Request | NextRequest, customPathname?: string): RateLimitResult {
  const pathname = customPathname || (request instanceof NextRequest ? request.nextUrl.pathname : new URL(request.url).pathname);
  const ip = getClientIp(request);
  const isAuth = isAuthRoute(pathname);
  const limit = isAuth ? AUTH_LIMIT : GENERAL_LIMIT;
  const storeKey = `${ip}:${isAuth ? "auth" : "general"}`;

  const now = Date.now();
  const existingTimestamps = memoryStore.get(storeKey) || [];

  // Filter timestamps within the sliding window
  const validTimestamps = existingTimestamps.filter((t) => now - t < WINDOW_MS);

  if (validTimestamps.length >= limit) {
    const oldestTimestamp = validTimestamps[0];
    const resetMs = Math.max(1000, oldestTimestamp + WINDOW_MS - now);

    return {
      allowed: false,
      remaining: 0,
      resetMs,
      limit,
      isAuth,
      ip,
    };
  }

  validTimestamps.push(now);
  memoryStore.set(storeKey, validTimestamps);

  return {
    allowed: true,
    remaining: limit - validTimestamps.length,
    resetMs: WINDOW_MS,
    limit,
    isAuth,
    ip,
  };
}

/**
 * Formats rate limit result into standard HTTP headers.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil((Date.now() + result.resetMs) / 1000).toString(),
  };

  if (!result.allowed) {
    headers["Retry-After"] = Math.ceil(result.resetMs / 1000).toString();
  }

  return headers;
}
