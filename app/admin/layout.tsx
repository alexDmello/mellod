"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  BarChart3,
  Wallet,
  Building2,
  Truck,
  Key,
  LogOut,
  Menu,
  X,
  Navigation,
  MapPin,
  UserPlus,
  Settings,
  ShieldAlert,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const ALL_NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/financials", label: "Financials", icon: Wallet },
  { href: "/admin/routes", label: "Routes", icon: Navigation },
  { href: "/admin/map", label: "Map", icon: MapPin },
  { href: "/admin/onboarding", label: "Onboarding", icon: UserPlus },
  { href: "/admin/credentials", label: "Credentials", icon: Key },
  { href: "/admin/settings", label: "Sub-Admins & Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // User & Access Control State
  const [userRole, setUserRole] = useState<"admin" | "sub_admin" | null>(null);
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

        if (!profile || (profile.role !== "admin" && profile.role !== "sub_admin")) {
          router.push("/");
          return;
        }

        setUserRole(profile.role as "admin" | "sub_admin");
        setUserName(profile.full_name || "Admin");

        if (profile.role === "admin") {
          // Super admin gets full access to all sections
          setAllowedRoutes(ALL_NAV_ITEMS.map((item) => item.href));
        } else if (profile.role === "sub_admin") {
          // Fetch sub-admin permissions
          const { data: perm } = await supabase
            .from("sub_admin_permissions")
            .select("allowed_routes")
            .eq("profile_id", user.id)
            .maybeSingle();

          const routes = perm?.allowed_routes || ["/admin"];
          setAllowedRoutes(routes);
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

  // Check if current route is authorized for sub-admin
  const isAuthorizedRoute = () => {
    if (loadingUser) return true;
    if (userRole === "admin") return true;
    // Exact match or prefix match (e.g. /admin/fbo/123)
    return allowedRoutes.some((route) =>
      route === "/admin" ? pathname === "/admin" : pathname.startsWith(route)
    );
  };

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={cn(
        "bg-green-700 flex flex-col",
        mobile
          ? "fixed inset-y-0 left-0 z-50 w-64 shadow-2xl overflow-y-auto"
          : "hidden lg:flex w-64 h-screen sticky top-0 overflow-y-auto flex-col flex-shrink-0"
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-green-600">
        <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
          <img src="/icons/logo.png" alt="Mellod Logo" className="w-8 h-8 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-white font-bold text-base leading-none truncate">Mellod Admin</div>
          <div className="text-green-200 text-xs mt-0.5 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
            {userRole === "sub_admin" ? "Sub-Admin Portal" : "Super-Admin Panel"}
          </div>
        </div>
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-green-200 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Info Header */}
      <div className="px-5 py-3 bg-green-800/60 border-b border-green-600/60 flex items-center justify-between text-xs text-green-100">
        <span className="font-semibold truncate max-w-[140px]">{userName}</span>
        <span className="bg-white/20 text-white font-mono text-[9px] uppercase px-1.5 py-0.5 rounded font-bold">
          {userRole === "sub_admin" ? "Sub Admin" : "Super Admin"}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {visibleNavItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all",
                active
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-green-100 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
              {active && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-green-600">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-green-100 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
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
            className="fixed inset-0 bg-black/50 z-40 lg:hidden touch-none"
            onClick={() => setSidebarOpen(false)}
          />
          <Sidebar mobile />
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden bg-green-700 px-4 py-3 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white hover:text-green-100"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/icons/logo.png" alt="Mellod Logo" className="w-6 h-6 object-contain" />
            <span className="text-white font-bold text-sm">Mellod Admin</span>
          </div>
          <span className="ml-auto bg-white/20 text-white font-mono text-[9px] uppercase px-2 py-0.5 rounded font-bold">
            {userRole === "sub_admin" ? "Sub Admin" : "Super Admin"}
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
