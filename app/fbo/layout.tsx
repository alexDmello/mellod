"use client";
// Force dynamic rendering for all FBO routes (requires Supabase auth)
export const dynamic = "force-dynamic";


import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Leaf, BarChart3, CreditCard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/fbo", label: "Dashboard", icon: BarChart3 },
  { href: "/fbo/payment", label: "Payment", icon: CreditCard },
];

export default function FBOLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-green-700 px-4 pb-3.5 sticky top-0 z-30 flex items-center justify-between" style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-none">Mellod</div>
            <div className="text-green-200 text-xs">Partner Portal</div>
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

      <main className="flex-1 pb-24 overflow-y-auto">{children}</main>

      <nav className="bottom-nav">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/fbo" ? pathname === "/fbo" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn("bottom-nav-item", active && "active")}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
