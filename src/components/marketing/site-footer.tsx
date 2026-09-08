import Image from "@/components/next-compat/image";
import Link from "@/components/next-compat/link";
import { usePathname } from "@/components/next-compat/navigation";
import { Facebook, Globe, Instagram, Twitter, Youtube } from "lucide-react";

import { socialLinksStore } from "@/lib/demo/store";

const footerNav = [
  { label: "HOME", href: "/" },
  { label: "FEATURES", href: "/features" },
  { label: "DOWNLOAD", href: "/download" },
  { label: "TEAM", href: "/team" },
  { label: "CONTACT", href: "/contact" },
];

function iconForPlatform(platform: string) {
  const normalized = platform.trim().toLowerCase();
  if (normalized === "facebook") return Facebook;
  if (normalized === "instagram") return Instagram;
  if (normalized === "twitter" || normalized === "twitter/x" || normalized === "x") return Twitter;
  if (normalized === "youtube") return Youtube;
  return Globe;
}

export function SiteFooter() {
  const pathname = usePathname();
  const [socialLinks] = socialLinksStore.useStore();
  const activeSocialLinks = socialLinks.filter((social) => social.active === true);

  return (
    <footer className="w-full bg-[#0f1626] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-7 px-5 py-12 text-center">
        {/* SOCIAL ICONS */}
        <div className="flex items-center justify-center gap-3">
          {activeSocialLinks.map((social) => {
            const Icon = iconForPlatform(social.platform);
            return (
              <a
                key={social.id}
                href={social.url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={social.platform}
                className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/[.06] text-white/70 transition hover:-translate-y-0.5 hover:border-yellow hover:bg-yellow hover:text-navy"
              >
                <Icon className="size-5" />
              </a>
            );
          })}
        </div>
          
        {/* NAV */}
        <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3" aria-label="Footer navigation">
          {footerNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`text-xs font-black tracking-[.16em] transition hover:text-yellow ${
                pathname === item.href ? "text-yellow" : "text-white/60"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* COPYRIGHT BAR */}
      <div className="w-full border-t border-white/[.08] bg-[#0f1728] px-5 py-5">
        <p className="mx-auto max-w-7xl text-center text-[11px] font-bold tracking-[.14em] text-white/35">
          © 2026 CREW ON SET! — ALL RIGHTS RESERVED. NO PROPS WERE HARMED.
        </p>
      </div>
    </footer>
  );
}
