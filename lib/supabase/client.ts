import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Persistent storage adapter that bridges Android APK WebView localStorage with browser cookies
const persistentStorage = {
  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    try {
      let val = window.localStorage.getItem(key);
      if (!val) {
        val = window.localStorage.getItem("sb-auth-token");
      }
      if (!val) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && (k.includes("auth-token") || k.startsWith("sb-"))) {
            val = window.localStorage.getItem(k);
            if (val && val.includes("access_token")) break;
          }
        }
      }
      if (val) {
        // Sync to document.cookie so next fetch/SSR request includes cookie
        document.cookie = `sb-auth-token=${encodeURIComponent(val)}; path=/; max-age=31536000; SameSite=Lax`;
      }
      return val;
    } catch (e) {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, value);
      window.localStorage.setItem("sb-auth-token", value);
      document.cookie = `sb-auth-token=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
    } catch (e) {
      // Storage error fallback
    }
  },
  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
      window.localStorage.removeItem("sb-auth-token");
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const k = window.localStorage.key(i);
        if (k && (k.includes("auth-token") || k.startsWith("sb-"))) {
          window.localStorage.removeItem(k);
        }
      }
      document.cookie = "sb-auth-token=; path=/; max-age=0; SameSite=Lax";
    } catch (e) {
      // Storage error fallback
    }
  },
};

/**
 * Returns a Supabase browser client configured with dual-layer (localStorage + cookie) 1-year session persistence.
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
      maxAge: 365 * 24 * 60 * 60, // 1 year persistence
      path: "/",
      sameSite: "lax",
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "sb-auth-token",
      storage: persistentStorage,
    },
  }) as unknown as SupabaseClient<any, "public", any>;
}
