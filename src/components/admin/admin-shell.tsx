import Link from "@/components/next-compat/link";
import { usePathname, useRouter } from "@/components/next-compat/navigation";
import { Toaster } from "@/components/ui/sonner";
import {
  adminAccountStore,
  adsStore,
  alertReadStore,
  applicationsStore,
  bugReportsStore,
  playerReportsStore,
} from "@/lib/demo/store";
import { buildAlerts } from "@/components/admin/admin-alerts";
import { useDisplayTheme } from "@/components/theme/display-theme-switcher";
import {
  Banknote,
  Bell,
  BookOpen,
  Bug,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Eye,
  EyeOff,
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
import { useEffect, useMemo, useState } from "react";

function useUnreadAlertsCount() {
  const [applications] = applicationsStore.useStore();
  const [ads] = adsStore.useStore();
  const [bugs] = bugReportsStore.useStore();
  const [playerReports] = playerReportsStore.useStore();
  const alerts = useMemo(
    () => buildAlerts(applications, ads, bugs, playerReports),
    [applications, ads, bugs, playerReports],
  );
  const [readIds] = alertReadStore.useStore();

  return {
    total: alerts.length,
    unread: alerts.filter((alert) => !readIds.includes(alert.id)).length,
  };
}

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Players", href: "/admin/players", icon: Users },
  { label: "Game & Updates", href: "/admin/game", icon: Gamepad2 },
  { label: "Almanac", href: "/admin/almanac", icon: BookOpen },
  { label: "Bug Reports", href: "/admin/bugs", icon: Bug },
  { label: "Player Reports", href: "/admin/player-reports", icon: Bug },
  { label: "Transactions", href: "/admin/transactions", icon: Banknote },
  { label: "Partnerships & Ads", href: "/admin/partnerships", icon: HandCoins },
  { label: "Ad Revenue", href: "/admin/ad-revenue", icon: LineChart },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const displayTheme = useDisplayTheme("admin");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [identityHover, setIdentityHover] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [account] = adminAccountStore.useStore();
  const [applications] = applicationsStore.useStore();
  const [ads] = adsStore.useStore();
  const [bugs] = bugReportsStore.useStore();
  const [playerReports] = playerReportsStore.useStore();
  const alerts = useMemo(
    () => buildAlerts(applications, ads, bugs, playerReports),
    [applications, ads, bugs, playerReports],
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
        className="relative grid size-10 place-items-center rounded-md border border-white/10 text-white/60 transition hover:border-white/25 hover:text-white"
      >
        <Bell className="size-5" />
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
              <button type="button" disabled={!unread} onClick={() => setReadIds(alerts.map((alert) => alert.id))} className="text-[9px] font-black uppercase text-coral disabled:cursor-not-allowed disabled:opacity-30">Mark all read</button>
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
        </div>
      )}
    </div>
  );

  useEffect(() => {
    const stored = window.localStorage.getItem("cos.admin.sidebar.collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("cos.admin.sidebar.collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const admin = account[0];

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      {/* LOGO / ADMIN PANEL */}
      <div className="relative shrink-0 border-b border-white/10 px-4 py-5">
        {/* COLLAPSE TOGGLE (desktop only, top-right) */}
        <button
          onClick={() => setCollapsed((current) => !current)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute right-2 top-2 z-10 hidden size-9 place-items-center rounded-md text-white/40 transition hover:bg-white/10 hover:text-white md:grid"
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </button>

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
              className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-bold transition ${
                collapsed ? "justify-center px-0" : ""
              } ${
                active
                  ? "bg-coral text-white shadow-lg shadow-coral/15"
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

      {/* QUICK ACTIONS */}
      <div className="shrink-0 border-t border-white/10 p-3">
        <div className={`flex gap-1 ${collapsed ? "flex-col items-center" : "items-center"}`}>
          <Link
            href="/"
            title="Visit Website"
            className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-xs font-bold text-white/55 transition hover:bg-white/5 hover:text-white ${
              collapsed ? "justify-center px-0" : "min-w-0 flex-1 justify-between"
            }`}
          >
            {!collapsed && <span className="truncate">Visit Website</span>}
            <ExternalLink className="size-4 shrink-0" />
          </Link>

          <button
            onClick={() => {
              setMobileOpen(false);
              setLogoutConfirmOpen(true);
            }}
            title="Log out"
            aria-label="Log out"
            className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-xs font-bold text-white/55 transition hover:bg-coral/15 hover:text-coral-light ${
              collapsed ? "justify-center px-0" : "shrink-0"
            }`}
          >
            <LogOut className="size-4 shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </div>

      {/* BOTTOM ACCOUNT AREA */}
      <div className="shrink-0 border-t border-white/10 p-3">
        <div
          onMouseEnter={() => setIdentityHover(true)}
          onMouseLeave={() => {
            setIdentityHover(false);
            setShowPassword(false);
          }}
          className="relative"
        >
          <button
            type="button"
            onClick={() => setIdentityHover((current) => !current)}
            aria-expanded={identityHover}
            className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-white/5 ${
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

          {identityHover && (
            <div
              role="tooltip"
              className={`absolute z-50 w-[min(15rem,72vw)] rounded-lg border border-white/12 bg-[#111827] p-3 shadow-2xl shadow-black/60 ${
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
                <span className="min-w-0 flex-1 truncate">
                  {showPassword ? (admin?.password ?? "—") : "••••••••"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="shrink-0 text-white/40 transition hover:text-yellow"
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`admin-theme relative h-dvh w-full overflow-hidden bg-[#1a1b1e] text-[#eceef1] ${displayTheme === "light" ? "admin-light" : ""}`}>
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
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-navy/10 bg-navy px-5 md:hidden">
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
        className={`h-dvh min-h-0 min-w-0 overflow-hidden pt-16 transition-all md:pt-0 ${
          collapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <div className="hidden h-16 items-center justify-end border-b border-white/[0.06] bg-navy px-6 md:flex">
          {notificationBell}
        </div>
        {children}
      </main>
    </div>
  );
}
