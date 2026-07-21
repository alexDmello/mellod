import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase browser client configured with 1-year session persistence.
 */
export function createClient(): SupabaseClient<any, "public", any> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createBrowserClient<any>(
      "https://placeholder.supabase.co",
      "placeholder-key"
    ) as unknown as SupabaseClient<any, "public", any>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createBrowserClient<any>(url, key, {
    cookieOptions: {
      name: "sb-auth-token",
      maxAge: 365 * 24 * 60 * 60, // 1 year persistence so closing browser does NOT log out user
      path: "/",
      sameSite: "lax",
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }) as unknown as SupabaseClient<any, "public", any>;
}
