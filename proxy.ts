import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // If env vars are missing (e.g. before .env.local is configured),
  // skip auth and let the app render the login page unauthenticated.
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

  const pathname = request.nextUrl.pathname;

  // Public routes — always accessible
  if (
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
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
        if (p.role === "sub_admin") {
          const { data: perm } = await supabase
            .from("sub_admin_permissions")
            .select("allowed_routes")
            .eq("profile_id", user.id)
            .maybeSingle();

          if (perm?.allowed_routes && perm.allowed_routes.length > 0) {
            destination = perm.allowed_routes[0];
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

  // Protected routes — require auth
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

  if (pathname.startsWith("/admin") && role !== "admin" && role !== "sub_admin") {
    return NextResponse.redirect(new URL(role === "picker" ? "/picker" : "/fbo", request.url));
  }
  if (pathname.startsWith("/picker") && role !== "picker") {
    return NextResponse.redirect(new URL(`/${role}`, request.url));
  }
  if (pathname.startsWith("/fbo") && role !== "fbo") {
    return NextResponse.redirect(new URL(`/${role}`, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|widgets|manifest.json|sw.js|offline.html|workbox-.*).*)",
  ],
};
