import { Facebook, Globe, Instagram, Twitter, Youtube } from "lucide-react";

import { socialLinksStore } from "@/lib/demo/store";

const footerContacts = [
  { label: "crewonsetgame@gmail.com", href: "https://mail.google.com/mail/?view=cm&fs=1&to=crewonsetgame@gmail.com" },
  { label: "Crew On Set", href: "https://www.facebook.com/profile.php?id=61594770855744" },
  { label: "@crewonset", href: "https://www.instagram.com/crewonset/" },
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
        <nav className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-x-7 gap-y-3 sm:justify-between" aria-label="Contact links">
          {footerContacts.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs font-black tracking-[.08em] text-white/70 transition hover:text-yellow"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      {/* COPYRIGHT BAR */}
      <div className="w-full border-t border-white/[.08] bg-[#0f1728] px-5 py-5">
        <p className="mx-auto max-w-7xl text-center text-[11px] font-bold tracking-[.14em] text-[#c6c5c2]">
          © 2026 CREW ON SET! — ALL RIGHTS RESERVED. NO PROPS WERE HARMED.
        </p>
      </div>
    </footer>
  );
}
