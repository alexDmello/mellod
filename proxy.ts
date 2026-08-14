import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { checkPayloadSize, DEFAULT_MAX_JSON_SIZE, DEFAULT_MAX_UPLOAD_SIZE } from "@/lib/security";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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

  // 2. Supabase Client Setup for Page Authentication
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // If env vars are missing, skip page auth checks
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
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public page routes — always accessible
  if (
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/widgets") ||
    pathname === "/sw.js" ||
    pathname === "/offline.html"
  ) {
    // If logged-in user hits the login page, redirect to their portal
    if (pathname === "/" && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile) {
        const p = profile as { role: string };
        let destination = "/admin";
        if (p.role !== "admin" && p.role !== "picker" && p.role !== "fbo") {
          const { data: roleData } = await supabase
            .from("custom_roles")
            .select("default_routes")
            .eq("role_key", p.role)
            .maybeSingle();

          if (roleData?.default_routes && roleData.default_routes.length > 0) {
            destination = roleData.default_routes[0];
          }
        } else if (p.role === "picker") {
          destination = "/picker";
        } else if (p.role === "fbo") {
          destination = "/fbo";
        }
        return NextResponse.redirect(new URL(destination, request.url));
      }
    }
    return supabaseResponse;
  }

  // Protected page routes — require auth
  if (!user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Role-based access control
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const role = (profile as { role: string }).role;

  if (pathname.startsWith("/admin") && role === "picker") {
    return NextResponse.redirect(new URL("/picker", request.url));
  }
  if (pathname.startsWith("/admin") && role === "fbo") {
    return NextResponse.redirect(new URL("/fbo", request.url));
  }
  if (pathname.startsWith("/picker") && role !== "picker") {
    return NextResponse.redirect(new URL(role === "fbo" ? "/fbo" : "/admin", request.url));
  }
  if (pathname.startsWith("/fbo") && role !== "fbo") {
    return NextResponse.redirect(new URL(role === "picker" ? "/picker" : "/admin", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|widgets|manifest.json|sw.js|offline.html|workbox-.*).*)",
  ],
};
