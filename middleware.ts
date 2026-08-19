import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { checkPayloadSize, DEFAULT_MAX_JSON_SIZE, DEFAULT_MAX_UPLOAD_SIZE } from "@/lib/security";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host") || "";

  // Identify subdomain environment
  const isAdminSubdomain = host.startsWith("admin.");
  const isAppSubdomain = host.startsWith("app.") || host.startsWith("portal.");

  // Determine cookie domain for cross-subdomain authentication (.mellod.in)
  const isProduction = process.env.NODE_ENV === "production" || host.includes("mellod.in");
  const cookieDomain = isProduction ? ".mellod.in" : undefined;

  // 1. Enforce Rate Limiting & Payload Size checks on all API endpoints
  if (pathname.startsWith("/api")) {
    const rateLimit = checkRateLimit(request);
    const rateHeaders = getRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
      const errorMessage = rateLimit.isAuth
        ? "Too many authentication attempts. Maximum 5 attempts allowed per 15 minutes."
        : "Too many requests. Maximum rate limit exceeded per 15 minutes.";

      return NextResponse.json(
        { error: errorMessage },
        { status: 429, headers: rateHeaders }
      );
    }

    const isUploadRoute = pathname.includes("/pickup/log");
    const maxPayloadSize = isUploadRoute ? DEFAULT_MAX_UPLOAD_SIZE : DEFAULT_MAX_JSON_SIZE;
    const sizeCheck = checkPayloadSize(request, maxPayloadSize);

    if (!sizeCheck.valid) {
      return NextResponse.json(
        { error: `Payload too large. Maximum allowed request size is ${Math.round(maxPayloadSize / (1024 * 1024))}MB.` },
        { status: 413, headers: rateHeaders }
      );
    }

    const apiResponse = NextResponse.next({ request });
    Object.entries(rateHeaders).forEach(([k, v]) => apiResponse.headers.set(k, v));
    return apiResponse;
  }

  // 2. Supabase Client Setup for Middleware Session & Cookie Management
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // If env vars are missing during build/prerender, pass through
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          const opts = { ...options };
          if (cookieDomain) opts.domain = cookieDomain;
          supabaseResponse.cookies.set(name, value, opts);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public assets & internal endpoints — bypass RBAC redirects
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/widgets") ||
    pathname === "/sw.js" ||
    pathname === "/offline.html" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/icons")
  ) {
    return supabaseResponse;
  }

  // 3. Subdomain-Specific Routing & Role Enforcement
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profile as { role: string } | null)?.role;

    // Cross-subdomain redirection if logged in user is on wrong subdomain
    if (isAdminSubdomain) {
      if (role === "picker" || role === "fbo") {
        const destDomain = isProduction ? "https://app.mellod.in" : request.url;
        const targetPath = role === "picker" ? "/picker" : "/fbo";
        return NextResponse.redirect(new URL(targetPath, destDomain));
      }
      if (pathname === "/") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }

    if (isAppSubdomain) {
      if (role === "admin") {
        const destDomain = isProduction ? "https://admin.mellod.in" : request.url;
        return NextResponse.redirect(new URL("/admin", destDomain));
      }
      if (pathname === "/") {
        const targetPath = role === "picker" ? "/picker" : role === "fbo" ? "/fbo" : "/admin";
        return NextResponse.redirect(new URL(targetPath, request.url));
      }
    }

    // Standard Route RBAC
    if (pathname === "/") {
      let destination = "/admin";
      if (role === "picker") destination = "/picker";
      else if (role === "fbo") destination = "/fbo";
      return NextResponse.redirect(new URL(destination, request.url));
    }

    if (pathname.startsWith("/admin") && role !== "admin") {
      const destPath = role === "picker" ? "/picker" : "/fbo";
      return NextResponse.redirect(new URL(destPath, request.url));
    }
    if (pathname.startsWith("/picker") && role !== "picker") {
      const destPath = role === "fbo" ? "/fbo" : "/admin";
      return NextResponse.redirect(new URL(destPath, request.url));
    }
    if (pathname.startsWith("/fbo") && role !== "fbo") {
      const destPath = role === "picker" ? "/picker" : "/admin";
      return NextResponse.redirect(new URL(destPath, request.url));
    }
  } else {
    // Unauthenticated user attempting to access protected portal pages
    if (pathname.startsWith("/admin") || pathname.startsWith("/picker") || pathname.startsWith("/fbo")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|widgets|manifest.json|sw.js|offline.html|workbox-.*).*)",
  ],
};
