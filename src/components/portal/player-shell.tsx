import Image from "@/components/next-compat/image";
import Link from "@/components/next-compat/link";
import { usePathname, useRouter } from "@/components/next-compat/navigation";
import {
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShoppingBag,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NotificationBell } from "@/components/portal/notification-bell";
import { useDisplayTheme } from "@/components/theme/display-theme-switcher";

const navigation = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "Profile", href: "/portal/profile", icon: UserCircle },
  { label: "Almanac", href: "/portal/almanac", icon: BookOpen },
  { label: "Friends", href: "/portal/friends", icon: Users },
  { label: "Shop", href: "/portal/shop", icon: ShoppingBag },
  { label: "Settings", href: "/portal/settings", icon: Settings },
];

export function PlayerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const displayTheme = useDisplayTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    return href === "/portal" ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className={`blueprint-sheet portal-theme ${displayTheme === "dark" ? "portal-dark" : ""} min-h-screen`}>
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 border-b border-[#d9d5c8] bg-[#f4f1e8] text-navy shadow-lg">
        <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between gap-6 px-6 sm:px-8 lg:px-10">
          {/* Logo */}
          <Link href="/portal" className="relative h-10 w-36 shrink-0 sm:w-40">
            <Image
              src="/assets/crew-on-set-logo.png"
              alt="Crew On Set"
              fill
              className="object-contain object-left"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav
            aria-label="Player portal navigation"
            className="hidden flex-1 items-center justify-center gap-1 md:flex"
          >
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${
                      active
                      ? "bg-coral text-[#fffdf7] shadow-sm hover:bg-coral"
                      : "text-[#b8c4d6] hover:bg-white/10 hover:text-[#fffdf7]"
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell dark={false} />

            {/* Account dropdown - desktop */}
            <div ref={accountRef} className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/10 py-2 pl-2 pr-3 text-[#fffdf7] shadow-sm transition hover:bg-white/15"
              >
                <span className="relative size-8 shrink-0 overflow-hidden rounded-full border-2 border-yellow">
                  <Image
                    src="/assets/hero-key-art.png"
                    alt="Player avatar"
                    fill
                    className="object-cover object-[62%_45%]"
                  />
                </span>
                <span className="text-left leading-tight">
                  <span className="block text-xs font-bold text-[#fffdf7]">CAMERA_PRO</span>
                  <span className="block text-[10px] text-[#b8c4d6]">Level 27</span>
                </span>
                <ChevronDown className="size-3.5 text-[#b8c4d6]" />
              </button>

              {accountOpen && (
                <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-lg border border-navy/10 bg-white py-1.5 text-navy shadow-2xl">
                  <Link
                    href="/portal/profile"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-navy/5"
                  >
                    <UserCircle className="size-4" /> Profile
                  </Link>
                  <Link
                    href="/portal/settings"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-navy/5"
                  >
                    <Settings className="size-4" /> Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      setConfirmingSignOut(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-coral hover:bg-coral/10"
                  >
                    <LogOut className="size-4" /> Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="grid size-10 place-items-center rounded-md border border-white/15 text-white md:hidden"
              aria-label="Open navigation"
            >
              <Menu />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-50 md:hidden ${mobileOpen ? "visible" : "invisible"}`}>
        <button
          className={`absolute inset-0 bg-navy/70 transition-opacity ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
        <aside
          className={`absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] flex-col overflow-y-auto bg-charcoal text-white transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <span className="relative h-9 w-32">
              <Image
                src="/assets/crew-on-set-logo.png"
                alt="Crew On Set"
                fill
                className="object-contain object-left"
              />
            </span>
            <button
              onClick={() => setMobileOpen(false)}
              className="text-white/60 transition hover:text-white"
              aria-label="Close navigation"
            >
              <X />
            </button>
          </div>

          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
            <span className="relative size-11 shrink-0 overflow-hidden rounded-full border-2 border-yellow">
              <Image
                src="/assets/hero-key-art.png"
                alt="Player avatar"
                fill
                className="object-cover object-[62%_45%]"
              />
            </span>
            <span>
              <span className="block text-sm font-bold">CAMERA_PRO</span>
              <span className="block text-xs text-white/40">Level 27</span>
            </span>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Player portal navigation mobile">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm font-bold transition ${
                    active ? "bg-coral text-[#fffdf7] shadow-sm" : "text-[#b8c4d6] hover:bg-white/[.07] hover:text-[#fffdf7]"
                  }`}
                >
                  <item.icon className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              onClick={() => {
                setMobileOpen(false);
                setConfirmingSignOut(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-coral/40 px-4 py-3 text-xs font-black uppercase tracking-wide text-coral-light transition hover:bg-coral/10"
            >
              <LogOut className="size-4" /> Sign Out
            </button>
          </div>
        </aside>
      </div>

      {/* Page Content */}
      <main className="portal-theme blueprint-sheet min-h-[calc(100vh-64px)] text-navy">{children}</main>

      {/* FOOTER */}
      <footer className="bg-charcoal px-4 py-8 text-white/60 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="relative h-8 w-28">
            <Image
              src="/assets/crew-on-set-logo.png"
              alt="Crew On Set"
              fill
              className="object-contain object-left sm:object-center"
            />
          </span>
          <p className="text-center text-xs">
            © {new Date().getFullYear()} Crew On Set! — Player Portal. All progress is demo data stored on this device.
          </p>
          <nav className="flex gap-4 text-xs font-bold uppercase tracking-wide">
            <Link href="/portal/settings" className="hover:text-white">
              Settings
            </Link>
            <Link href="/portal/shop" className="hover:text-white">
              Shop
            </Link>
          </nav>
        </div>
      </footer>

      {/* Sign Out Confirmation */}
      {confirmingSignOut && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-navy/70 p-5 backdrop-blur-sm">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="signout-title"
            className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl"
          >
            <div className="grid size-10 place-items-center rounded-md bg-coral/10 text-coral">
              <LogOut className="size-5" />
            </div>
            <h2 id="signout-title" className="mt-5 text-2xl font-black uppercase">
              Sign out?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-navy/55">
              Are you sure you want to leave the player portal?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmingSignOut(false)}
                className="rounded-md border border-navy/15 px-4 py-2 text-sm font-bold transition hover:bg-navy/5"
              >
                Cancel
              </button>
              <button
                onClick={signOut}
                className="rounded-md bg-coral px-4 py-2 text-sm font-black text-white transition hover:opacity-90"
              >
                Sign Out
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
