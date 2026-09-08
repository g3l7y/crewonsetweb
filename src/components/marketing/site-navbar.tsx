import Image from "@/components/next-compat/image";
import Link from "@/components/next-compat/link";
import { usePathname } from "@/components/next-compat/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, LogIn, Menu, UserPlus, X } from "lucide-react";

import { getCrewSession } from "@/lib/session.functions";

const navItems = [
  { label: "HOME", href: "/" },
  { label: "FEATURES", href: "/features" },
  { label: "DOWNLOAD", href: "/download" },
  { label: "TEAM", href: "/team" },
  { label: "CONTACT", href: "/contact" },
];

export function SiteNavbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [crewMenuOpen, setCrewMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const crewMenuRef = useRef<HTMLDivElement>(null);
  const { data: session } = useQuery({
    queryKey: ["crew-session"],
    queryFn: () => getCrewSession(),
  });
  const portalHref = session?.isAdmin ? "/admin" : "/portal";
  const isAuthenticated = session?.isAdmin || session?.isPlayer;
  const visibleNavItems = session?.isAdmin ? navItems.filter((item) => item.href !== "/contact") : navItems;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    const handleOutsideClick = (event: PointerEvent) => {
      if (!crewMenuRef.current?.contains(event.target as Node)) setCrewMenuOpen(false);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("pointerdown", handleOutsideClick);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? "bg-navy/95 shadow-xl shadow-navy/15 backdrop-blur-md" : "bg-[linear-gradient(180deg,rgba(19,27,52,.6),transparent)]"}`}>
      <div className={`flex w-full items-center justify-between border-b px-5 transition-all duration-500 sm:px-8 lg:px-12 ${scrolled ? "h-16 border-white/10" : "h-20 border-transparent"}`}>
        <Link href="/" className="relative h-14 w-44 shrink-0" aria-label="Crew On Set home">
          <Image src="/assets/crew-on-set-logo.png" alt="Crew On Set!" fill className="object-contain object-left" priority />
        </Link>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
          {visibleNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`nav-link ${active ? "!text-yellow after:scale-x-100 drop-shadow-[0_0_10px_rgba(245,196,49,.35)]" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div ref={crewMenuRef} className="relative hidden lg:block">
          {isAuthenticated ? (
            <Link href={portalHref} className="inline-flex items-center rounded-md border border-white/20 bg-coral px-5 py-2.5 text-sm font-black tracking-wide text-white transition hover:bg-coral-dark focus:outline-none focus:ring-2 focus:ring-yellow/70">
              MY PORTAL
            </Link>
          ) : (
            <>
              <button type="button" onClick={() => setCrewMenuOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-coral px-5 py-2.5 text-sm font-black tracking-wide text-white transition hover:bg-coral-dark focus:outline-none focus:ring-2 focus:ring-yellow/70" aria-expanded={crewMenuOpen} aria-haspopup="menu">
                JOIN THE CREW <ChevronDown className={`size-4 transition-transform duration-300 ${crewMenuOpen ? "rotate-180" : ""}`} />
              </button>
              <div className={`absolute right-0 top-[calc(100%+10px)] w-52 origin-top-right overflow-hidden rounded-md border border-white/10 bg-navy/95 p-2 shadow-2xl backdrop-blur-xl transition-all duration-200 ${crewMenuOpen ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-2 scale-95 opacity-0"}`} role="menu">
                <Link href="/login" className="crew-menu-item" role="menuitem"><LogIn /> LOGIN</Link>
                <Link href="/signup" className="crew-menu-item" role="menuitem"><UserPlus /> SIGN UP</Link>
              </div>
            </>
          )}
        </div>
        <button className="grid size-10 place-items-center rounded-md border border-white/15 bg-white/10 text-white lg:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation" aria-expanded={menuOpen}>
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
      <nav className={`mx-3 mt-2 overflow-hidden rounded-lg border border-white/10 bg-navy/95 px-3 shadow-2xl backdrop-blur-xl transition-all duration-300 lg:hidden ${menuOpen ? "max-h-[460px] py-3 opacity-100" : "pointer-events-none max-h-0 py-0 opacity-0"}`} aria-label="Mobile navigation">
        {visibleNavItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`block rounded-md px-4 py-3 text-sm font-black tracking-wider ${pathname === item.href ? "bg-white/10 text-yellow" : "text-white"}`}>{item.label}</Link>)}
        <div className="mt-2 border-t border-white/10 pt-3">
          {isAuthenticated ? (
            <Link href={portalHref} onClick={() => setMenuOpen(false)} className="mobile-crew-link bg-coral">MY PORTAL</Link>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link href="/login" className="mobile-crew-link"><LogIn /> LOGIN</Link>
              <Link href="/signup" className="mobile-crew-link bg-coral"><UserPlus /> SIGN UP</Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
