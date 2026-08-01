"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import PwaLaunchManager from "@/components/PwaLaunchManager";

const navItems = [
  { href: "/picker", label: "Home Route", icon: Home },
  { href: "/picker/history", label: "Collection History", icon: History },
];

export default function PickerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/60 font-sans">
      {/* Page Content */}
      <main className="flex-1 pb-28 overflow-y-auto">{children}</main>

      {/* Bottom Floating Glass Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-emerald-950/10 shadow-2xl px-3 py-2 flex items-center justify-around max-w-md mx-auto sm:rounded-t-2xl">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/picker" ? pathname === "/picker" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl text-xs font-bold transition-all duration-200",
                active
                  ? "text-emerald-700 bg-emerald-50/80 shadow-sm"
                  : "text-gray-400 hover:text-gray-700"
              )}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-1 bg-emerald-600 rounded-full shadow-sm shadow-emerald-500/50" />
              )}
              <Icon className={cn("w-5 h-5 transition-transform duration-200", active && "scale-110 text-emerald-700")} />
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
