"use client";
export const dynamic = "force-dynamic";


import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Leaf, MapPin, History, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import PwaLaunchManager from "@/components/PwaLaunchManager";

const navItems = [
  { href: "/picker", label: "Today's Route", icon: MapPin },
  { href: "/picker/history", label: "History", icon: History },
];

export default function PickerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const isDashboard = pathname === "/picker";

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top header - Only show on sub-routes, not on the main dashboard */}
      {!isDashboard && (
        <header className="bg-green-700 px-4 pb-3.5 sticky top-0 z-30 flex items-center justify-between" style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center">
              <img src="/icons/logo.png" alt="Mellod Logo" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-none">Mellod</div>
              <div className="text-green-200 text-xs">Picker App</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-green-200 hover:text-white transition-colors text-xs font-medium"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </header>
      )}

      {/* Page content with bottom padding for nav */}
      <main className="flex-1 pb-24 overflow-y-auto">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/picker" ? pathname === "/picker" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn("bottom-nav-item", active && "active")}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <Suspense fallback={null}>
        <PwaLaunchManager />
      </Suspense>
    </div>
  );
}
