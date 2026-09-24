import Link from "@/components/next-compat/link";
import { usePathname, useRouter } from "@/components/next-compat/navigation";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import {
  adminAccountStore,
  alertReadStore,
  bugReportsStore,
  playerReportsStore,
} from "@/lib/demo/store";
import { topUpsStore, type TopUpRecord } from "@/lib/admin-demo-data";
import { buildAlerts } from "@/components/admin/admin-alerts";
import { isMockMode } from "@/lib/playfab/config";
import { useSession } from "@/lib/playfab/hooks";
import { useDisplayTheme } from "@/components/theme/display-theme-switcher";
import {
  Banknote,
  BarChart3,
  Bell,
  Bug,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Gamepad2,
  HandCoins,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Players", href: "/admin/players", icon: Users },
  { label: "Game & Updates", href: "/admin/game", icon: Gamepad2 },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Bug Reports", href: "/admin/bugs", icon: Bug },
  { label: "Player Reports", href: "/admin/player-reports", icon: Bug },
  { label: "Transactions", href: "/admin/transactions", icon: Banknote },
  { label: "Partnerships & Ads", href: "/admin/partnerships", icon: HandCoins },
  { label: "Ad Revenue", href: "/admin/ad-revenue", icon: LineChart },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const displayTheme = useDisplayTheme("admin");
  const mockMode = isMockMode();
  const sessionQuery = useSession();
  const [demoTransactions] = topUpsStore.useStore();
  const liveTransactionsQuery = useQuery({
    queryKey: ["admin", "paymongo-orders", "notifications"],
    queryFn: async (): Promise<TopUpRecord[]> => {
      const response = await fetch("/api/admin/paymongo-orders", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return [];
      const result = (await response.json().catch(() => ({}))) as { data?: unknown };
      return Array.isArray(result.data) ? (result.data as TopUpRecord[]) : [];
    },
    enabled: !mockMode && Boolean(sessionQuery.data),
    staleTime: 0,
    refetchInterval: mockMode ? false : 15 * 1000,
  });
  const transactions = useMemo(
    () => (mockMode ? demoTransactions : (liveTransactionsQuery.data ?? [])),
    [demoTransactions, liveTransactionsQuery.data, mockMode],
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [account] = adminAccountStore.useStore();
  const [bugs] = bugReportsStore.useStore();
  const [playerReports] = playerReportsStore.useStore();
  const alerts = useMemo(
    () => buildAlerts(bugs, playerReports, transactions),
    [bugs, playerReports, transactions],
  );
  const [readIds, setReadIds] = alertReadStore.useStore();
  const unread = alerts.filter((alert) => !readIds.includes(alert.id)).length;

  function openAlert(id: string, href: string) {
    if (!readIds.includes(id)) setReadIds([...readIds, id]);
    setNotificationsOpen(false);
    router.push(href);
  }

  const notificationBell = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setNotificationsOpen((current) => !current)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={notificationsOpen}
        className="admin-notification-trigger relative grid size-8 place-items-center rounded-md border border-white/10 text-white/60 transition hover:border-white/25 hover:text-white"
      >
        <Bell className="size-4.5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[17px] place-items-center rounded-full bg-coral px-1 text-[9px] font-black leading-[17px] text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {notificationsOpen && (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-white/10 bg-[#151c28] p-2 shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-xs font-black uppercase tracking-wide text-white">
              Admin Notifications
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40">{unread} unread</span>
              <button
                type="button"
                disabled={!unread}
                onClick={() => setReadIds(alerts.map((alert) => alert.id))}
                className="text-[9px] font-black uppercase text-coral disabled:cursor-not-allowed disabled:opacity-30"
              >
                Mark all read
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {alerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => openAlert(alert.id, alert.href)}
                className={`block w-full rounded-md px-3 py-3 text-left transition hover:bg-white/[.06] ${readIds.includes(alert.id) ? "opacity-55" : ""}`}
              >
                <p className="text-xs font-black text-white">{alert.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/50">{alert.body}</p>
              </button>
            ))}
          </div>
          <Link
            href="/admin/notifications"
            onClick={() => setNotificationsOpen(false)}
            className="mt-1 flex items-center justify-center border-t border-white/10 px-3 py-2.5 text-[10px] font-black uppercase tracking-[.14em] text-coral transition hover:text-white"
          >
            View More
          </Link>
        </div>
      )}
    </div>
  );

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const admin = mockMode
    ? account[0]
    : {
        name: sessionQuery.data?.displayName || sessionQuery.data?.username || "Administrator",
        email: sessionQuery.data?.email || "",
        password: "",
      };

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      {/* LOGO / ADMIN PANEL */}
      <div className="relative shrink-0 border-b border-white/10 px-4 py-5">
        <Link href="/admin" className="relative flex h-auto w-full flex-col items-center">
          <div className={`relative h-14 ${collapsed ? "w-14" : "w-60"} transition-all`}>
            <img
              src="/assets/crew-on-set-logo.png"
              alt="Crew On Set"
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>

          {!collapsed && (
            <p className="mt-2 text-[11px] font-black tracking-[.28em] text-yellow">ADMIN PANEL</p>
          )}
        </Link>

        {/* COLLAPSE TOGGLE: keep it beside ADMIN PANEL when expanded. */}
        <button
          onClick={() => setCollapsed((current) => !current)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={
            "sidebar-toggle absolute z-10 hidden size-8 place-items-center rounded-md text-white/40 transition hover:bg-white/10 hover:text-white md:grid " +
            (collapsed ? "bottom-1 right-2" : "bottom-5 right-2")
          }
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </button>
      </div>

      {/* NAVIGATION */}
      <nav
        className="min-h-0 flex-1 space-y-0.5 overflow-hidden px-3 py-3"
        aria-label="Admin navigation"
      >
        {navigation.map((item) => {
          const active =
            item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
          const showBadge = false;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={`admin-nav-link relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-bold transition ${
                collapsed ? "justify-center px-0" : ""
              } ${
                active
                  ? "admin-nav-active bg-coral text-white shadow-lg shadow-coral/15"
                  : "text-white/60 hover:bg-white/[.07] hover:text-white"
              }`}
            >
              <span className="relative">
                <item.icon
                  className={`size-5 shrink-0 ${active ? "text-white" : "text-yellow/75"}`}
                />
                {showBadge && collapsed && (
                  <span className="absolute -right-1.5 -top-1.5 grid min-w-[16px] place-items-center rounded-full bg-coral px-1 text-[8px] font-black leading-[16px] text-white ring-2 ring-navy">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && showBadge && (
                <span className="ml-auto grid min-w-[18px] place-items-center rounded-full bg-coral px-1 text-[9px] font-black leading-[18px] text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* BOTTOM ACCOUNT AREA */}
      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIdentityOpen((current) => !current);
            }}
            aria-expanded={identityOpen}
            className={`admin-profile-summary flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-white/5 ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-yellow text-sm font-black text-navy">
              {admin?.name?.charAt(0) ?? "A"}
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {admin?.name ?? "Administrator"}
                </p>
                <p className="truncate text-[11px] text-white/40">{admin?.email ?? "admin"}</p>
              </div>
            )}
          </button>

          {identityOpen && (
            <div
              role="tooltip"
              className={`admin-profile-menu absolute z-50 w-[min(15rem,72vw)] rounded-lg border border-white/12 bg-[#111827] p-3 shadow-2xl shadow-black/60 ${
                collapsed ? "bottom-0 left-full ml-2" : "bottom-full left-0 mb-2"
              }`}
            >
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-yellow">
                Administrator
              </p>
              <p className="mt-1.5 truncate text-sm font-bold text-white">
                {admin?.name ?? "Administrator"}
              </p>
              <p className="mt-2 break-all text-[11px] text-white/50">
                <span className="font-black uppercase tracking-wide text-white/30">Email: </span>
                {admin?.email ?? "—"}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/50">
                <span className="font-black uppercase tracking-wide text-white/30">Password:</span>
                <span className="tracking-[0.2em]">••••••••</span>
              </div>
              <div className="mt-3 space-y-1 border-t border-white/10 pt-2">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-black uppercase tracking-wide transition"
                >
                  <ExternalLink className="size-4 shrink-0" />
                  Visit Website
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIdentityOpen(false);
                    setMobileOpen(false);
                    setLogoutConfirmOpen(true);
                  }}
                  className="admin-profile-logout flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-black uppercase tracking-wide transition"
                >
                  <LogOut className="size-4 shrink-0" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`admin-theme relative h-dvh w-full overflow-hidden bg-[#1a1b1e] text-[#eceef1] ${displayTheme === "light" ? "admin-light" : ""}`}
    >
      <Toaster theme="dark" position="top-right" richColors />

      {/* DESKTOP SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden h-dvh flex-col overflow-hidden bg-navy shadow-2xl transition-all duration-200 md:flex ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebar}
      </aside>

      {/* MOBILE HEADER */}
      <header className="admin-notification-header fixed inset-x-0 top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-navy/10 bg-navy px-5 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="relative grid size-10 place-items-center rounded-md border border-white/15 text-white"
          aria-label="Open admin navigation"
        >
          <Menu className="size-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid min-w-[16px] place-items-center rounded-full bg-coral px-1 text-[8px] font-black leading-[16px] text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        <div className="relative h-10 w-28">
          <img
            src="/assets/crew-on-set-logo.png"
            alt="Crew On Set"
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>

        {notificationBell}
      </header>

      {/* MOBILE SIDEBAR */}
      <div className={`fixed inset-0 z-50 md:hidden ${mobileOpen ? "visible" : "invisible"}`}>
        <button
          className={`absolute inset-0 bg-navy/70 transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />

        <aside
          className={`absolute inset-y-0 left-0 flex h-dvh w-[min(18rem,85vw)] flex-col overflow-hidden bg-navy shadow-2xl transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-3 z-10 grid size-9 place-items-center text-white/60 transition hover:text-white"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>

          {sidebar}
        </aside>
      </div>

      {/* LOGOUT CONFIRMATION */}
      {logoutConfirmOpen && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-5 backdrop-blur-sm">
          <section className="w-full max-w-sm rounded-xl border border-white/10 bg-[#1f2126] p-6 shadow-2xl">
            <div className="grid size-12 place-items-center rounded-full bg-coral/15 text-coral">
              <LogOut className="size-6" />
            </div>
            <h2 className="mt-4 text-xl font-black uppercase text-white">Log out?</h2>
            <p className="mt-2 text-sm text-white/55">
              You will be signed out of the admin console and returned to the login page.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(false)}
                className="rounded-md border border-white/15 px-4 py-2.5 text-sm font-black text-white/70 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoutConfirmOpen(false);
                  void logout();
                }}
                className="rounded-md bg-coral px-4 py-2.5 text-sm font-black text-white transition hover:opacity-90"
              >
                Log out
              </button>
            </div>
          </section>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main
        className={`flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden pt-16 transition-all md:pt-0 ${
          collapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <div className="admin-notification-header admin-notification-bar hidden h-16 items-center justify-end border-b border-white/[0.06] bg-navy px-6 md:flex">
          {notificationBell}
        </div>
        <div className="admin-shell-content min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  );
}
