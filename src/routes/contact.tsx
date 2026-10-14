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
    if (session?.role === "admin") throw redirect({ to: "/admin" });
  },
  component: ContactPage,
});

import { Facebook, Instagram, Mail } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { PartnershipForm } from "@/components/marketing/partnership-form";

const contacts = [
  { icon: Mail, label: "General inquiries", value: "crewonsetgame@gmail.com", href: "https://mail.google.com/mail/?view=cm&fs=1&to=crewonsetgame@gmail.com" },
  { icon: Facebook, label: "Facebook", value: "Crew On Set", href: "https://www.facebook.com/profile.php?id=61594770855744" },
  { icon: Instagram, label: "Instagram", value: "@crewonset", href: "https://www.instagram.com/crewonset/" },
];

function ContactPage() {
  const faqs = [
    {
      question: "What is Crew On Set!?",
      answer: "Crew On Set! is a desktop game about making video commercials. Play solo and take on the Director, AV Technician, Cameraman, and Editor roles, or invite up to three friends and split up the production.",
    },
    {
      question: "How can I get started playing?",
      answer: "Head to the Download page, check that your computer meets the requirements, then install the game and get your first production underway.",
    },
    {
      question: "Can I play with friends?",
      answer: "Of course. You can run the whole shoot solo or team up online with up to three friends. Each player can take on a different part of the production.",
    },
    {
      question: "How can a brand or product team partner with Crew On Set!?",
      answer: "Fill out the partnership form below with your product details, business email, proposed budget, and campaign length. Add a link or a short description to help us picture your idea.",
    },
    {
      question: "Where can I ask a question or share feedback?",
      answer: "Send us a message through any of the contact links here. If you have a brand idea, the partnership form is the best way to get it in front of our team.",
    },
  ];

  return (
    <MarketingShell>
      <div className="contact-page">
      <PageHero
        eyebrow="CONTACT & PARTNERSHIPS"
        title="Connect with the crew"
        accent={
          <>
            <span className="text-yellow">on </span>
            <span className="text-coral">and</span>
            <span className="text-yellow"> off the </span>
            <span className="text-coral">set</span>
            <span className="text-white">.</span>
          </>
        }
        description="Whether you’re here to play, share feedback, join the community, or explore a brand partnership, we’d love to hear from you."
        image="/assets/crew-set-illustration.png"
        imageAlt="A production team preparing a commercial set"
        cameraFrame
      />
      <section className="bg-[#070b13] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-24 sm:mb-32">
            <span className="eyebrow mb-5 bg-navy text-yellow">PLAYER &amp; PARTNER INFO</span>
            <h2 className="font-sans text-4xl font-extrabold uppercase leading-tight tracking-wide text-white sm:text-5xl">
              Frequently Asked <span className="text-yellow">Questions</span>
            </h2>
            <div className="mt-8 max-w-5xl divide-y divide-white/15 border-y border-white/15">
              {faqs.map((faq) => (
                <details key={faq.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-black text-white marker:hidden sm:text-lg">
                    {faq.question}
                    <span aria-hidden="true" className="text-2xl font-normal text-coral transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="max-w-2xl pt-4 leading-relaxed text-white/65">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="grid items-start gap-12 lg:grid-cols-[.68fr_1.32fr]">
            <aside className="lg:sticky lg:top-24"><span className="eyebrow mb-5 bg-navy text-yellow">THE STUDIO LINE</span><h2 className="font-sans text-4xl font-extrabold uppercase leading-tight tracking-normal sm:text-5xl">Let&apos;s make your product<span className="text-coral"> a commercial.</span></h2><p className="mt-5 leading-relaxed text-[#fefdf8]">For press, community questions, or general studio conversations, contact us directly. Companies and product teams can use the production brief to submit a partnership proposal. <br /><br />
      Have questions, feedback, or need assistance? We&apos;d love to hear from you. Reach out to the Crew on Set! team.</p>
      
      <div className="mt-8 space-y-3">{contacts.map((contact) => <a key={contact.label} href={contact.href} target={contact.href.startsWith("http") ? "_blank" : undefined} rel={contact.href.startsWith("http") ? "noreferrer" : undefined} className="flex items-center gap-4 rounded-lg border border-navy/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-coral/40 hover:shadow-md"><div className="grid size-10 shrink-0 place-items-center rounded-md bg-navy text-yellow"><contact.icon className="size-4" /></div><div><p className="text-[10px] font-black uppercase tracking-wider text-navy/40">{contact.label}</p><p className="mt-1 text-sm font-bold">{contact.value}</p></div></a>)}</div></aside><PartnershipForm />
          </div>
        </div>
      </section>
      </div>

    </MarketingShell>
  );
}
