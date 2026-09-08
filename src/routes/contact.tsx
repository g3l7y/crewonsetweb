import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCrewSession } from "@/lib/session.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Partnerships — Crew On Set!" },
      { name: "description", content: "Reach the Crew On Set! studio or submit a brand partnership proposal." },
      { property: "og:title", content: "Contact & Partnerships — Crew On Set!" },
      { property: "og:description", content: "Reach the Crew On Set! studio or submit a brand partnership proposal." },
    ],
  }),
  beforeLoad: async () => {
    const session = await getCrewSession();
    if (session.isAdmin) throw redirect({ to: "/admin" });
  },
  component: ContactPage,
});

import { Facebook, Instagram, Mail, MessageCircle, Radio } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { PartnershipForm } from "@/components/marketing/partnership-form";

const contacts = [
  { icon: Mail, label: "General inquiries", value: "crewonset1@gmail.com", href: "mailto:crewonset1@gmail.com" },
  { icon: Facebook, label: "Facebook", value: "Crew On Set!", href: "https://www.facebook.com/" },
  { icon: Instagram, label: "Instagram", value: "@crew_on_set_game", href: "https://www.instagram.com//" },
];

function ContactPage() {
  return (
    <MarketingShell>
      <PageHero eyebrow="CONTACT & PARTNERSHIPS" title="Bring your brand" accent="onto the set." description="Connect with the Crew On Set! studio, join our community, or submit a production-ready proposal for a brand and product collaboration." image="/assets/gameplay-shot.png" imageAlt="A production team preparing a commercial set" />
      <section className="bg-[#070b13] py-20 sm:py-28"><div className="mx-auto grid max-w-7xl items-start gap-12 px-5 lg:grid-cols-[.68fr_1.32fr] lg:px-8"><aside className="lg:sticky lg:top-24"><span className="eyebrow mb-5 bg-navy text-yellow">THE STUDIO LINE</span><h2 className="text-4xl font-black uppercase leading-[.95] tracking-[-.045em] sm:text-5xl">Let&apos;s make your product<span className="text-coral"> a commercial.</span></h2><p className="mt-5 leading-relaxed text-navy/60">For press, community questions, or general studio conversations, contact us directly. Companies and product teams can use the production brief to submit a partnership proposal. <br /><br />
      Have questions, feedback, or need assistance? We&apos;d love to hear from you. Reach out to the Crew on Set! team</p>
      
      <div className="mt-8 space-y-3">{contacts.map((contact) => <a key={contact.label} href={contact.href} target={contact.href.startsWith("http") ? "_blank" : undefined} rel={contact.href.startsWith("http") ? "noreferrer" : undefined} className="flex items-center gap-4 rounded-lg border border-navy/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-coral/40 hover:shadow-md"><div className="grid size-10 shrink-0 place-items-center rounded-md bg-navy text-yellow"><contact.icon className="size-4" /></div><div><p className="text-[10px] font-black uppercase tracking-wider text-navy/40">{contact.label}</p><p className="mt-1 text-sm font-bold">{contact.value}</p></div></a>)}</div></aside><PartnershipForm /></div></section>

    </MarketingShell>
  );
}
