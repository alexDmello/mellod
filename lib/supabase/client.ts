import { createBrowserClient } from "@supabase/ssr";

/**
 * Returns a Supabase browser client.
 * Guards against missing env vars during build-time SSR rendering.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // During build-time prerender, env vars may not be present.
    // Return a stub so pages don't crash; real auth happens client-side.
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-key"
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createBrowserClient<any>(url, key);
}
