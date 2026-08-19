import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createClient(): Promise<ReturnType<typeof createServerClient<any>>> {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key";

  const isProduction = process.env.NODE_ENV === "production";
  const cookieDomain = isProduction ? ".mellod.in" : undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = { ...options };
            if (cookieDomain) opts.domain = cookieDomain;
            cookieStore.set(name, value, opts);
          });
        } catch {
          // Server component context — middleware handles session refresh
        }
      },
    },
  });
}
