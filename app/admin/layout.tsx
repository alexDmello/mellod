"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  BarChart3,
  Wallet,
  Truck,
  LogOut,
  Menu,
  X,
  Navigation,
  MapPin,
  UserPlus,
  Settings,
  ShieldAlert,
  Loader2,
  UserCog,
  CreditCard,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const ALL_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/financials", label: "Financials", icon: Wallet },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/pickers", label: "Pickup Reviews", icon: Truck },
  { href: "/admin/routes", label: "Routes", icon: Navigation },
  { href: "/admin/map", label: "Map", icon: MapPin },
  { href: "/admin/onboarding", label: "Onboarding", icon: UserPlus },
  { href: "/admin/credentials", label: "Account Management", icon: UserCog },
  { href: "/admin/settings", label: "Sub-Admins & Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // User & Access Control State
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoleName, setUserRoleName] = useState<string>("");
  const [allowedRoutes, setAllowedRoutes] = useState<string[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userName, setUserName] = useState<string>("");

  const supabase = createClient();

  useEffect(() => {
    async function loadUserPermissions() {
      setLoadingUser(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single();

        if (!profile || (profile.role === "fbo" || profile.role === "picker")) {
          router.push("/");
          return;
        }

        setUserRole(profile.role);
        setUserName(profile.full_name || "Admin");

        if (profile.role === "admin") {
          setUserRoleName("Super Admin");
          setAllowedRoutes(ALL_NAV_ITEMS.map((item) => item.href));
        } else {
          const { data: roleData } = await supabase
            .from("custom_roles")
            .select("role_name, default_routes")
            .eq("role_key", profile.role)
            .maybeSingle();

          const formattedRoleName =
            roleData?.role_name ||
            profile.role
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c: string) => c.toUpperCase());

          setUserRoleName(formattedRoleName);

          const routes = roleData?.default_routes || ["/admin"];
          setAllowedRoutes(routes);

          const isCurrentAllowed = routes.some((route: string) =>
            route === "/admin" ? pathname === "/admin" : pathname.startsWith(route)
          );

          if (!isCurrentAllowed && routes.length > 0) {
            router.replace(routes[0]);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load user permissions:", err);
      } finally {
        setLoadingUser(false);
      }
    }

    loadUserPermissions();
  }, [pathname]);

  // Lock background body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // Filter navigation items based on allowed_routes
  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => {
    if (userRole === "admin") return true;
    return allowedRoutes.includes(item.href);
  });

  const isAuthorizedRoute = () => {
    if (loadingUser) return true;
    if (userRole === "admin") return true;
    return allowedRoutes.some((route) =>
      route === "/admin" ? pathname === "/admin" : pathname.startsWith(route)
    );
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={cn(
        "bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800/80 shadow-xl",
        mobile
          ? "fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto"
          : "hidden lg:flex w-64 h-screen sticky top-0 overflow-y-auto flex-col flex-shrink-0"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/80">
        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
          <img src="/icons/logo.png" alt="Mellod Logo" className="w-8 h-8 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-white font-bold tracking-tight text-base leading-none truncate">
            Mellod Biofuels
          </div>
          <div className="text-slate-400 text-[11px] mt-1 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            <span>{userRole === "admin" ? "Super-Admin Panel" : `${userRoleName || "Staff"} Portal`}</span>
          </div>
        </div>
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Info Header at Top */}
      <div className="px-5 py-3 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
        <span className="font-semibold truncate max-w-[140px] text-slate-200">{userName}</span>
        <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold truncate max-w-[90px]">
          {userRoleName || (userRole === "admin" ? "Super Admin" : "Staff")}
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Navigation
        </div>

        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200",
                active
                  ? "bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 shadow-sm"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              )}
            >
              {/* Simple active pill indicator on left edge */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-400 rounded-r-full shadow-md shadow-emerald-400/50" />
              )}
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-colors duration-200",
                  active ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"
                )}
              />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/50">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 border border-transparent transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden touch-none"
            onClick={() => setSidebarOpen(false)}
          />
          <Sidebar mobile />
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-30 shadow-md">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-300 hover:text-white p-1"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/icons/logo.png" alt="Mellod Logo" className="w-6 h-6 object-contain" />
            <span className="text-white font-bold text-sm">Mellod Biofuels</span>
          </div>
          <span className="ml-auto bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] uppercase px-2 py-0.5 rounded-full font-bold truncate max-w-[90px]">
            {userRoleName || (userRole === "admin" ? "Super Admin" : "Staff")}
          </span>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          {loadingUser ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-green-700" />
              <p className="text-sm font-medium text-gray-500">Verifying access permissions...</p>
            </div>
          ) : !isAuthorizedRoute() ? (
            <div className="card p-10 text-center max-w-lg mx-auto my-12 space-y-4 border-amber-200 bg-amber-50/50 shadow-md animate-fade-in">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-700">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Access Restricted</h2>
                <p className="text-xs text-gray-600 mt-1">
                  You are logged in as a <strong>Sub-Admin</strong>, but your account does not have permission to view the section <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono">{pathname}</code>.
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Please contact the Super Admin to request permission for this page.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => router.push(allowedRoutes[0] || "/admin")}
                  className="btn btn-primary text-xs py-2 px-5 font-bold shadow-sm"
                >
                  Return to Allowed Home Page
                </button>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
