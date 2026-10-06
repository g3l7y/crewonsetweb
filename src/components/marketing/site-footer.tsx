import { Facebook, Instagram, Mail } from "lucide-react";

const footerContacts = [
  { label: "crewonsetgame@gmail.com", href: "mailto:crewonsetgame@gmail.com", icon: Mail },
  { label: "Crew On Set", href: "https://www.facebook.com/profile.php?id=61594770855744", icon: Facebook },
  { label: "@crewonset", href: "https://www.instagram.com/crewonset/", icon: Instagram },
];

export function SiteFooter() {
  return (
    <footer className="w-full bg-[#0f1626] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-7 px-5 py-12 text-center">
        {/* NAV */}
        <nav className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-x-7 gap-y-3 sm:justify-between" aria-label="Contact links">
          {footerContacts.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target={item.href.startsWith("mailto:") ? undefined : "_blank"}
              rel={item.href.startsWith("mailto:") ? undefined : "noreferrer noopener"}
              className="footer-contact-link inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/[.04] px-4 py-3 text-xs font-black tracking-[.04em] transition hover:-translate-y-0.5"
            >
              <item.icon className="size-4 shrink-0" aria-hidden="true" />
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
