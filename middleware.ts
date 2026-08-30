import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { checkPayloadSize, DEFAULT_MAX_JSON_SIZE, DEFAULT_MAX_UPLOAD_SIZE } from "@/lib/security";

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "admin",
  "app",
  "portal",
  "api",
  "static",
  "auth",
  "super-admin",
  "assets",
  "public",
]);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const rawHost = request.headers.get("host") || "";
  const host = rawHost.split(":")[0].toLowerCase();

  // Root domain from environment variable (default to mellod.in)
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "mellod.in").toLowerCase();

  // Guards for localhost and Vercel preview deployments
  const isLocalhost = host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
  const isVercelPreview = host.endsWith(".vercel.app") || host.endsWith(".vercel.dev");

  // Cross-subdomain cookie domain setting
  const isProduction = process.env.NODE_ENV === "production" || host.endsWith(rootDomain);
  const cookieDomain = isProduction && !isLocalhost && !isVercelPreview ? `.${rootDomain}` : undefined;

  // 1. API Rate Limiting & Payload Checks
  if (pathname.startsWith("/api")) {
    const rateLimit = checkRateLimit(request);
    const rateHeaders = getRateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
      const errorMessage = rateLimit.isAuth
        ? "Too many authentication attempts. Maximum 5 attempts allowed per 15 minutes."
        : "Too many requests. Maximum rate limit exceeded per 15 minutes.";

      return NextResponse.json({ error: errorMessage }, { status: 429, headers: rateHeaders });
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

  // 2. Subdomain Extraction
  let subdomain: string | null = null;
  if (!isLocalhost && !isVercelPreview && host.endsWith(`.${rootDomain}`)) {
    const parts = host.replace(`.${rootDomain}`, "").split(".");
    if (parts.length === 1 && parts[0]) {
      subdomain = parts[0];
    }
  }

  const isMainWebsiteDomain = !subdomain || subdomain === "www" || host === rootDomain;
  const isAdminSubdomain = subdomain === "admin";
  const isAppSubdomain = subdomain === "app" || subdomain === "portal";
  const isTenantSubdomain = !!(subdomain && !RESERVED_SUBDOMAINS.has(subdomain));

  // 3. Apex / Marketing Domain Rewrites
  if (isMainWebsiteDomain) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/website/index.html", request.url));
    }
    if (pathname === "/style.css" || pathname === "/script.js" || pathname === "/logo.png") {
      return NextResponse.rewrite(new URL(`/website${pathname}`, request.url));
    }
  }

  // 4. Wildcard Subdomain Tenant Rewrite ([slug].yourdomain.com -> /qr/[slug])
  if (isTenantSubdomain && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL(`/qr/${subdomain}`, request.url));
    }
    if (!pathname.startsWith("/qr/")) {
      return NextResponse.rewrite(new URL(`/qr/${subdomain}${pathname}`, request.url));
    }
  }

  // 5. Supabase Auth & Session Verification
  let supabaseResponse = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          const opts = { ...options };
          if (cookieDomain) opts.domain = cookieDomain;
          supabaseResponse.cookies.set(name, value, opts);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Public assets & internal endpoints bypass
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/widgets") ||
    pathname.startsWith("/website") ||
    pathname === "/sw.js" ||
    pathname === "/offline.html" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/qr")
  ) {
    return supabaseResponse;
  }

  // Role RBAC
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profile as { role: string } | null)?.role;
    const isNonAdminRole = role === "picker" || role === "fbo";

    if (isAdminSubdomain) {
      if (isNonAdminRole) {
        const destDomain = isProduction ? `https://app.${rootDomain}` : request.url;
        const targetPath = role === "picker" ? "/picker" : "/fbo";
        return NextResponse.redirect(new URL(targetPath, destDomain));
      }
      if (pathname === "/") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }

    if (isAppSubdomain) {
      if (!isNonAdminRole) {
        const destDomain = isProduction ? `https://admin.${rootDomain}` : request.url;
        return NextResponse.redirect(new URL("/admin", destDomain));
      }
      if (pathname === "/") {
        const targetPath = role === "picker" ? "/picker" : role === "fbo" ? "/fbo" : "/admin";
        return NextResponse.redirect(new URL(targetPath, request.url));
      }
    }

    if (pathname === "/") {
      let destination = "/admin";
      if (role === "picker") destination = "/picker";
      else if (role === "fbo") destination = "/fbo";
      return NextResponse.redirect(new URL(destination, request.url));
    }

    if (pathname.startsWith("/admin") && isNonAdminRole) {
      const destPath = role === "picker" ? "/picker" : "/fbo";
      return NextResponse.redirect(new URL(destPath, request.url));
    }
  } else {
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
