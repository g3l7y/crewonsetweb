import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Crew On Set! — Co-op Commercial Chaos" },
      { name: "description", content: "A playful 1-4 player co-op game about making the greatest commercial nobody asked for." },
      { property: "og:title", content: "Crew On Set! — Co-op Commercial Chaos" },
      { property: "og:description", content: "A playful 1-4 player co-op game about making the greatest commercial nobody asked for." },
    ],
  }),
  component: HomePage,
});

import Image from "@/components/next-compat/image";
import Link from "@/components/next-compat/link";
import {
  ArrowDown,
  ArrowRight,
  AudioLines,
  Camera,
  Download,
  Building2,
  Clapperboard,
  Instagram,
  Mail,
  Megaphone,
  MessageCircle,
  Scissors,
  Timer,
  Trophy,
  Facebook,
} from "lucide-react";

import { CameraFrame } from "@/components/marketing/camera-frame";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { StarsBackground } from "@/components/marketing/stars-background";
import "@/styles/home.css";
import "@/styles/almanac.css";

const chapters = [
  {
    number: "01",
    title: "PRE-PRODUCTION",
    text: "Your crew lands its first commercial. Different roles, different responsibilities.",
    icon: Building2,
    image: "/assets/story-studio.png",
  },
  {
    number: "02",
    title: "PRODUCTION",
    text: "Your crew finally gets a shot at a production. Everything is on the line",
    icon: Clapperboard,
    image: "/assets/hero-key-art.png",
  },
  {
    number: "03",
    title: "POST-PRODUCTION",
    text: "Refining the footage and preparing the final product.",
    icon: Timer,
    image: "/assets/story-studio.png",
  },
  {
    number: "04",
    title: "FINAL TOUCHES",
    text: "Finalization of the shoot work. Well done!",
    icon: Trophy,
    image: "/assets/hero-key-art.png",
  },
];

const roles = [
  {
    image: "/assets/director.png",
    title: "Director",
    text: "Call the shots, direct the crew, and keep the entire production moving toward the final take.",
  },
  {
    image: "/assets/cameraman.png",
    title: "Cameraman",
    text: "Frame the shots and capture every important moment before time runs out.",
  },
  {
    image: "/assets/av-technician.png",
    title: "AV Technician",
    text: "Control lighting, sound, and studio equipment so every scene looks and sounds ready for the take.",
  },
  {
    image: "/assets/editor.png",
    title: "Editor",
    text: "Choose the strongest takes, fix production mistakes, and assemble the commercial to its perfection.",
  },
];

function HomePage() {
  return (
    <MarketingShell>
      {/* HOME */}
      <section
        id="home"
        className="home-hero relative flex min-h-[calc(100svh-80px)] items-center overflow-hidden border-b border-white/10 pb-16 pt-28 sm:min-h-screen sm:pb-20"
      >
        <div className="hero-camera-image absolute inset-0">
          <Image
            src="/assets/hero-key-art.png"
            alt="A chaotic commercial shoot in Crew On Set"
            fill
            priority
            className="object-cover object-[58%_center]"
            sizes="100vw"
          />
        </div>

        <div className="hero-overlay absolute inset-0" />
        <div className="hero-grid absolute inset-0" />
        <div className="hero-bottom-gradient absolute inset-x-0 bottom-0 h-56" />

        <CameraFrame />

        <div className="relative z-20 mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-700">
            <span className="eyebrow mb-5">
              <span className="size-2 animate-pulse rounded-full bg-yellow" />
              NOW IN PRODUCTION
            </span>

            <h1 className="display-title text-white">
              CREW
              <br />
              <span className="text-yellow">ON</span>
              <span className="text-coral"> SET!</span>
            </h1>

            <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-white/50 sm:text-xl">
              Grab your crew and make the greatest commercial nobody asked
              for. A 1–4 player co-op game where every second on set counts.
            </p>

            <div className="mt-8">
              <Link href="/download" className="cta-primary">
                <span className="cta-text">DOWNLOAD THE GAME</span>

                <span className="cta-icon">
                  <Download className="size-6" />
                </span>
              </Link>
            </div>

            <a
              href="#story"
              className="mt-10 inline-flex items-center gap-2 text-sm font-black tracking-widest text-white/60 transition hover:text-white"
            >
              SCROLL TO CALL TIME
              <ArrowDown className="size-4 animate-bounce" />
            </a>
          </div>
        </div>
      </section>

      {/* STORY */}
      <section
        id="story"
        className="section-padding relative overflow-hidden bg-navy text-white"
      >
        <div className="story-decoration absolute -right-20 top-16 size-64 rounded-full" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[.9fr_1.1fr] lg:px-8">
          <div>
            <span className="eyebrow mb-5 bg-coral/15 text-coral-light">
              01 — THE STORY
            </span>

            <h2 className="section-title text-white">
              BEHIND EVERY <span className="text-yellow">PERFECT SHOT.</span>
            </h2>

            <p className="mt-6 text-lg leading-relaxed text-white/70">
              Welcome to your own studio, where clients are demanding, the
              props are puzzling, and someone definitely forgot to put an SD
              Card into the camera.
            </p>

            <p className="mt-4 text-lg leading-relaxed text-white/70">
              You and your crew have one job and it is to turn contracts into
              unforgettable commercials. Learn each other&apos;s strengths,
              work under pressure, and get the final shot.
            </p>


            <div className="mt-8 flex gap-8 border-t border-white/15 pt-7">
              <div>
                <strong className="stat">4</strong>
                <span className="stat-label">PLAYERS</span>
              </div>

              <div>
                <strong className="stat">∞</strong>
                <span className="stat-label">BAD TAKES</span>
              </div>

              <div>
                <strong className="stat">1</strong>
                <span className="stat-label">PERFECT SHOT</span>
              </div>
            </div>
          </div>

          <div className="image-frame rotate-1">
            <div className="group relative aspect-video w-full overflow-hidden bg-black">
              <iframe
                className="absolute inset-0 h-full w-full"
                src="https://www.youtube-nocookie.com/embed/BFQWKpAQ7vQ"
                title="The Story of Crew On Set!"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
              {/* Blocks player hover so YouTube controls/details stay hidden until the frame is hovered */}
              <div aria-hidden className="absolute inset-0 group-hover:pointer-events-none" />
            </div>

            <span className="frame-label">
                LORE // CREW ON SET!
            </span>
          </div>
        </div>
      </section>

      {/* THE WORLD OF CREW ON SET! */}
      <section className="story-journey">
        <div className="story-container">
          <div className="journey-heading">
            <div>
              <p className="story-eyebrow">GAME FLOW</p>
              <h2>THE WORLD OF CREW ON SET!</h2>
            </div>
            <span className="journey-counter"></span>
          </div>

          <div className="story-filmstrip">
            <div className="film-holes film-holes-top" />
            <div className="film-holes film-holes-bottom" />

            <div className="story-chapters">
              {chapters.map((chapter) => {
                const Icon = chapter.icon;
                return (
                  <article key={chapter.number} className="story-chapter">
                    <div className="chapter-image">
                      <Image src={chapter.image} alt={chapter.title} fill className="object-cover" />
                      <div className="chapter-image-overlay" />
                      <span className="chapter-number">{chapter.number}</span>
                    </div>

                    <div className="chapter-content">
                      <div className="chapter-kicker">
                        <Icon />
                        <span>CHAPTER {chapter.number}</span>
                      </div>
                      <h3>{chapter.title}</h3>
                      <p>{chapter.text}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

        </div>
      </section>


      {/* ROLES */}
      <section
        id="roles"
        className="roles-section section-padding relative overflow-hidden bg-[#090e18]">

       <StarsBackground />

       <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="eyebrow mb-5 bg-navy text-yellow">
              02 — CHOOSE YOUR ROLE
            </span>

            <h2 className="section-title">
              One Crew.
              <br />
              <span className="text-coral">One Teamwork.</span>
            </h2>

            <p className="mt-5 text-lg text-navy/65">
              Choose your role and work together. Every role controls a
              different part of the production.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {roles.map((role, index) => (
              <article key={role.title} className="role-card">
                <div className="role-image">
                  <Image
                    src={role.image}
                    alt={role.title}
                    width={600}
                    height={600}
                  />

                  <span className="role-number">
                    0{index + 1}
                  </span>
                </div>

                <h3 className="text-2xl font-black uppercase tracking-tight">
                  {role.title}
                </h3>

                <p className="mt-3 leading-relaxed text-navy/60">
                  {role.text}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/features" className="story-button">
              LEARN MORE FEATURES
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* PRODUCTION MECHANICS */}
      <section className="section-padding relative overflow-hidden bg-navy text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
          <div className="image-frame rotate-1 border-white/10 bg-black">
            <Image
              src="/assets/gameplay-shot.png"
              alt="Crew coordinating a live shoot"
              width={1200}
              height={800}
              className="h-auto w-full object-cover"
            />
            <span className="frame-label">ON SET // TAKE 3</span>
          </div>

          <div>

            <h2 className="section-title text-white">
              IT TAKES A CREW TO MAKE <span className="text-yellow">THE SHOT.</span>
            </h2>

            <p className="mt-6 text-lg leading-relaxed text-white/70">
              Every production depends on teamwork. The Director leads the vision, the Cameraman captures the shot, the AV Technician keeps the set running, and the Editor brings it all together. Work together, handle the chaos, and make every take count.
            </p>

            <p className="mt-4 text-lg leading-relaxed text-white/70">
              Miss a cue and the take is ruined. Nail it, and the crew moves
              one step closer to wrapping the shoot on schedule — and on
              budget.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-white/10 bg-white/5 px-4 py-4">
                <span className="text-xs font-black uppercase tracking-widest text-yellow">PREPARATION</span>
                <p className="mt-1 text-sm leading-relaxed text-white/60">
                  Get your equipment ready, coordinate with your crew, and make sure everything is in place before the cameras roll.
                </p>
              </div>
              <div className="rounded-md border border-white/10 bg-white/5 px-4 py-4">
                <span className="text-xs font-black uppercase tracking-widest text-yellow">ON-SET PRESSURE</span>
                <p className="mt-1 text-sm leading-relaxed text-white/60">
                  Keep the production moving, react to unexpected problems, and deliver the shot before time runs out.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section id="team" className="team-section section-padding">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2 lg:px-8">
          <div className="order-2 lg:order-1">
            <div className="image-frame -rotate-1 border-navy bg-navy">
              <Image
                src="/assets/team-portrait.png"
                alt="The team behind Crew On Set"
                width={1200}
                height={800}
                className="h-auto w-full object-cover"
              />

              <span className="frame-label bg-navy text-white">
                THE CREATORS
              </span>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="eyebrow mb-5 bg-navy text-yellow">
              03 — MEET THE TEAM
            </span>

            <h2 className="section-title">
              Made by people who{" "}
              <span className="text-coral">love the mess.</span>
            </h2>

            <p className="mt-6 text-lg leading-relaxed text-navy/70">
              We&apos;re a small independent crew of artists, designers,
              documentators and developers obsessed with co-op games and the
              strange magic that happens behind the camera.
            </p>

            <p className="mt-4 text-lg leading-relaxed text-navy/70">
              Crew On Set! is our game for multimedia arts students and
              aspiring film makers to explore the creative process of
              commercial film making in a collaborative environment of a game.
            </p>

            <Link href="/team" className="team-button mt-8">
              GET TO KNOW THEM BETTER
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* MAKE THE SHOT */}
      <section className="story-journey">
        <div className="story-container">
          <div className="story-note">
            <span className="note-star note-star-left">✦</span>
            <span className="note-star note-star-right">☆</span>
            <div className="note-inner">
              <p className="note-main">
                MAKE THE SHOT.
                <br />
                SAVE THE SET.
                <br />
                BECOME LEGENDS.
              </p>
              <p className="note-signature">Don&apos;t call cut.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section
        id="contact"
        className="contact-section border-t border-coral/25 py-16 text-white sm:py-20 lg:py-24"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <span className="eyebrow mb-4 bg-white/15 text-white">
              04 — CONTACT
            </span>

            <h2 className="contact-title">
              Get on the <span className="text-yellow">call sheet.</span>
            </h2>

            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
              Follow production, join the community, or submit a partnership
              proposal to bring your brand onto the set.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href="mailto:hello@crew-on-set.game"
                className="social-link"
              >
                <Mail />
                crewonset1@gmail.com
              </a>

              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
                className="social-link"
              >
                <Facebook />
                Crew On Set!
              </a>

              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                className="social-link"
              >
                <Instagram />
                @crew_on_set_game
              </a>
            </div>
          </div>

          <Link href="/contact" className="contact-button">
            CONTACT & PARTNERSHIPS
            <ArrowRight className="size-5" />
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}