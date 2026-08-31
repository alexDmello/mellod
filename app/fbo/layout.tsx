"use client";


import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/fbo", label: "Home", icon: Home },
  { href: "/fbo/pickups", label: "Pickups", icon: Clock },
  { href: "/fbo/profile", label: "Profile", icon: User },
];

export default function FBOLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-paper-grid font-sans text-emerald-950">
      {/* Main Page Content */}
      <main className="flex-1 pb-28 overflow-y-auto relative z-10">{children}</main>

      {/* Bottom Paper Navigation - Green & White Theme */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-emerald-950/20 shadow-[0_-8px_25px_rgba(6,78,59,0.12)] px-4 py-2 flex items-center justify-around max-w-md mx-auto sm:rounded-t-2xl">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/fbo" ? pathname === "/fbo" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl text-xs font-black transition-all duration-200",
                active
                  ? "text-white bg-emerald-600 shadow-[2px_2px_0px_#064e3b] border border-emerald-950"
                  : "text-emerald-900/80 hover:text-emerald-950 hover:bg-emerald-100/40"
              )}
            >
              {active && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-7 h-1 bg-emerald-500 rounded-full shadow-xs" />
              )}
              <Icon className={cn("w-5 h-5 transition-transform duration-200", active && "scale-110 text-white")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
