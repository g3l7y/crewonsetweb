import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "The Team — Crew On Set!" },
      { name: "description", content: "The people behind Crew On Set! and the roles you can play on set." },
      { property: "og:title", content: "The Team — Crew On Set!" },
      { property: "og:description", content: "The people behind Crew On Set! and the roles you can play on set." },
    ],
  }),
  component: TeamPage,
});

import Image from "@/components/next-compat/image";
import Link from "@/components/next-compat/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  Camera,
  Clapperboard,
  Code2,
  Coffee,
  Crown,
  Gamepad2,
  Github,
  Instagram,
  Lightbulb,
  Linkedin,
  MapPin,
  Palette,
  Play,
  Rocket,
  Trophy,
  Wrench,
} from "lucide-react";

import { MarketingShell } from "@/components/marketing/marketing-shell";
import "@/styles/team-page.css";

/* =========================================================
   TEAM DATA
========================================================= */

const team = [
  {
    number: "01",
    name: "Mc Kelvin Bocateja",
    role: "Programmer",
    icon: Crown,
    imagePosition: "member-one",
    description:
      "Writes the engine side — camera rig physics, lighting simulation, the editing timeline and the live services powering this portal.",
    skills: ["CODE", "TECH", "TOOLS"],
  },
  {
    number: "02",
    name: "Joseph Namuag",
    role: "System Analyst",
    icon: Gamepad2,
    imagePosition: "member-two",
    description:
      "Maps the production loop into systems: scoring curves, C-Coin economy, ad placement rules and the data model behind the Almanac.",
    skills: ["GAMEPLAY", "SYSTEMS", "LEVEL DESIGN"],
  },
  {
    number: "03",
    name: "Princess Angela Cartel",
    role: "Technical Writer",
    icon: Palette,
    imagePosition: "member-three",
    description:
      "Owns the documentation, the in-game briefs and every word a client character says. If it reads clearly on set, Angela wrote it.",
    skills: ["VISION", "LEADERSHIP", "STORYTELLING"],
  },
  {
    number: "04",
    name: "Rae Yshene Acido",
    role: "Designer",
    icon: Code2,
    imagePosition: "member-four",
    description:
      "Built the whole 2D anime visual language — characters, cosmetics, UI framing and the ink-line look that runs across the game and this site.",
    skills: ["ART", "ANIMATION", "CHARACTERS"],
  },
];

/* =========================================================
   TOOLS
========================================================= */

const tools = [
  {
    name: "UNITY",
    image: "/assets/unity.png",
  },
  {
    name: "BLENDER",
    image: "/assets/blender.png",
  },
  {
    name: "MEDIBANG",
    image: "/assets/medibang.png",
  },
  {
    name: "AUDACITY",
    image: "/assets/audacity.png",
  },
  {
    name: "GITHUB",
    image: "/assets/github.png",
  },
];

/* =========================================================
   PAGE
========================================================= */

function TeamPage() {
  const [activeMember, setActiveMember] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMember((current) => (current + 1) % team.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  function previousMember() {
    setActiveMember((current) =>
      current === 0 ? team.length - 1 : current - 1
    );
  }

  function nextMember() {
    setActiveMember((current) => (current + 1) % team.length);
  }

  const member = team[activeMember]!;
  const MemberIcon = member.icon;

  return (
    <MarketingShell>
      <main className="team-page">

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="team-hero">

          <div className="team-grid-overlay" />

          <div className="team-container team-hero-container">

            <div className="team-hero-grid">

              <div className="team-hero-copy">

                <div className="team-hero-kicker">
                  <span>THIS IS US!</span>
                  <ArrowDownRight />
                </div>

                <h1>
                  NOT JUST
                  <br />
                  A TEAM.
                  <br />
                  <span>A CREW.</span>
                </h1>

                <p>
                  We&apos;re a small crew of dreamers, builders, and chaos
                  coordinators making games we actually want to play.
                </p>

                <div className="team-mini-members">

                  {team.map((person, index) => (
                    <button
                      key={person.number}
                      type="button"
                      onClick={() => setActiveMember(index)}
                      aria-label={`View ${person.name}`}
                    >
                      <Image
                        src="/assets/team-portrait.png"
                        alt={person.name}
                        fill
                        className={`mini-member-image ${person.imagePosition}`}
                      />
                    </button>
                  ))}

                  <span>{team.length} MEMBERS</span>

                </div>

                <Crown className="hero-crown" />

              </div>

              {/* HERO PHOTO */}

              <div className="hero-photo-wrapper">

                <div className="hero-photo-shadow" />

                <div className="hero-photo">

                  <div className="hero-photo-image">

                    <Image
                      src="/assets/team-portrait.png"
                      alt="The team behind Crew On Set"
                      fill
                      priority
                    />

                    <div className="hero-photo-gradient" />

                  </div>

                  <div className="hero-photo-footer">

                    <div>
                      <Camera />
                      <MessageIcon />
                      <Play />
                    </div>

                    <span>Good ideas start here.</span>

                  </div>

                </div>

                <div className="hero-tape" />

              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            JOURNEY
        ===================================================== */}

        <section className="journey-section">

          <div className="team-container">

            <span className="section-kicker">
              OUR JOURNEY SO FAR
            </span>

            <h2 className="journey-title">
              FROM IDEA TO{" "}
              <span>HERE.</span>
            </h2>

            <div className="journey-timeline">

              <JourneyItem
                icon={<Lightbulb />}
                title="IDEA"
                subtitle="Brainstormed"
                arrow
              />

              <JourneyItem
                icon={<Wrench />}
                title="FIRST PROTOTYPE"
                subtitle="Built"
                arrow
              />

              <JourneyItem
                icon={<Gamepad2 />}
                title="FIRST PLAYTEST"
                subtitle="Survived"
                arrow
              />

              <JourneyItem
                icon={<Rocket />}
                title="DEMO"
                subtitle="Released"
                arrow
              />

              <JourneyItem
                icon={<MapPin />}
                title="YOU ARE"
                subtitle="HERE"
              />

            </div>

          </div>

        </section>

        {/* =====================================================
            THE CREW
        ===================================================== */}

        <section className="crew-section">

          <div className="team-container">

            <div className="crew-heading">

              <span className="section-kicker">
                THE CREW
              </span>

              <h2>
                MEET THE MINDS
                <br />
                BEHIND THE{" "}
                <span>MAYHEM.</span>
              </h2>

              <p>
                Different roles. One mission. Create unforgettable
                experiences.
              </p>

            </div>

            <div className="crew-slider">

              {/* PREVIOUS */}

              <button
                type="button"
                className="crew-arrow crew-arrow-left"
                onClick={previousMember}
                aria-label="Previous team member"
              >
                <ArrowRight />
              </button>

              {/* NEXT */}

              <button
                type="button"
                className="crew-arrow crew-arrow-right"
                onClick={nextMember}
                aria-label="Next team member"
              >
                <ArrowRight />
              </button>

              {/* PROFILE */}

              <div
                key={activeMember}
                className="crew-profile"
              >

                <div className="crew-grid-pattern" />

                {/* IMAGE */}

                <div className="crew-profile-image">

                  <Image
                    src="/assets/team-portrait.png"
                    alt={`${member.name} - ${member.role}`}
                    fill
                    priority={activeMember === 0}
                    className={member.imagePosition}
                  />

                  <div className="crew-image-gradient" />

                  <div className="member-number">
                    {member.number}
                  </div>

                  {activeMember === 0 && (
                    <div className="thats-me">
                      THAT&apos;S ME!
                    </div>
                  )}

                  {activeMember === 0 && (
                    <Crown className="member-crown" />
                  )}

                  <div className="crew-image-label">
                    CREW ON SET
                  </div>

                </div>

                {/* INFORMATION */}

                <div className="crew-profile-info">

                  <div className="member-role">

                    <MemberIcon />

                    <span>
                      {member.role}
                    </span>

                  </div>

                  <h3>
                    {member.name}
                  </h3>

                  <div className="member-divider" />

                  <p>
                    {member.description}
                  </p>

                  <div className="member-skills">

                    {member.skills.map((skill, index) => (
                      <div key={skill}>

                        {index === 0 && <EyeIcon />}
                        {index === 1 && <SparkIcon />}
                        {index === 2 && <PencilIcon />}

                        <span>{skill}</span>

                      </div>
                    ))}

                  </div>

                  <div className="member-socials">

                    <Instagram />
                    <span />
                    <Github />
                    <span />
                    <Linkedin />

                  </div>

                  <div className="mobile-crew-arrows">

                    <button
                      type="button"
                      onClick={previousMember}
                      aria-label="Previous member"
                    >
                      <ArrowRight />
                    </button>

                    <button
                      type="button"
                      onClick={nextMember}
                      aria-label="Next member"
                    >
                      <ArrowRight />
                    </button>

                  </div>

                </div>

              </div>

              {/* THUMBNAILS */}

              <div className="crew-thumbnails">

                <span className="thumbnail-label red">
                  Different
                  <br />
                  roles
                </span>

                {team.map((person, index) => (
                  <button
                    key={person.number}
                    type="button"
                    onClick={() => setActiveMember(index)}
                    className={
                      activeMember === index
                        ? "crew-thumbnail active"
                        : "crew-thumbnail"
                    }
                  >

                    <div>
                      <Image
                        src="/assets/team-portrait.png"
                        alt={person.name}
                        fill
                        className={person.imagePosition}
                      />
                    </div>

                  </button>
                ))}

                <span className="thumbnail-label green">
                  One
                  <br />
                  mission
                </span>

              </div>

              {/* PROGRESS */}

              <div className="crew-progress">

                <span>
                  {String(activeMember + 1).padStart(2, "0")}
                </span>

                <div>
                  <i
                    style={{
                      width: `${((activeMember + 1) / team.length) * 100}%`,
                    }}
                  />
                </div>

                <span>
                  {String(team.length).padStart(2, "0")}
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            BEHIND THE SCENES
        ===================================================== */}

        <section className="behind-section">

          <div className="team-container">

            <div className="behind-grid">

              <div className="behind-copy">

                <span className="section-kicker green-kicker">
                  BEHIND THE SCENES
                </span>

                <h2>
                  THIS IS WHERE
                  <br />
                  IT ALL
                  <br />
                  STARTED.
                </h2>

                <div className="behind-text">

                  <p>
                    Late nights, tons of coffee, brainstorming,
                    playtests, failures, and tiny wins.
                  </p>

                  <p>
                    Here&apos;s a peek into our process —
                    where ideas were turned into games.
                  </p>

                </div>

              </div>

              <div className="behind-photos">

                <div className="behind-photo behind-photo-one">
                  <Image
                    src="/assets/team-portrait.png"
                    alt="Behind the scenes"
                    fill
                  />
                </div>

                <div className="behind-photo behind-photo-two">
                  <Image
                    src="/assets/team-portrait.png"
                    alt="Team production"
                    fill
                  />
                </div>

                <div className="behind-photo behind-photo-three">
                  <Image
                    src="/assets/team-portrait.png"
                    alt="Game development"
                    fill
                  />
                </div>


              </div>

            </div>

          </div>

        </section>

        {/* =====================================================
            TOOLS
        ===================================================== */}

        <section className="tools-section">

          <div className="team-container">

            <div className="tools-box">

              <div className="tools-grid">

                <div className="tools-copy">

                  <span className="section-kicker">
                    OUR TOOLS
                  </span>

                  <h2>
                    OF THE
                    <br />
                    TRADE.
                  </h2>

                  <p>
                    The gear we use to build our worlds.
                    <br />
                    <span>(and break things)</span>
                  </p>

                </div>

                <div className="tools-list">

                  {tools.map((tool) => (
                    <div
                      key={tool.name}
                      className="tool-card"
                    >

                      <div>
                        <Image
                          src={tool.image}
                          alt={tool.name}
                          fill
                        />
                      </div>

                      <span>
                        {tool.name}
                      </span>

                    </div>
                  ))}

                  <div className="tool-card tool-more">

                    <strong>+</strong>

                    <span>
                      MORE
                    </span>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>

      </main>
    </MarketingShell>
  );
}

/* =========================================================
   JOURNEY ITEM
========================================================= */

function JourneyItem({
  icon,
  title,
  subtitle,
  arrow = false,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  arrow?: boolean;
}) {
  return (
    <div className="journey-item">

      <div className="journey-icon">
        {icon}
      </div>

      <div className="journey-copy">

        <h3>
          {title}
        </h3>

        <p>
          {subtitle}
        </p>

      </div>

      {arrow && (
        <ArrowRight className="journey-arrow" />
      )}

    </div>
  );
}

/* =========================================================
   CUSTOM ICONS
========================================================= */

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" />
      <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 20 4.2-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" />
      <path d="m13.8 7.2 3 3" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 18.5 3.5 21l.9-4.2A7.8 7.8 0 0 1 3 12.2C3 7.7 7 4 12 4s9 3.7 9 8.2-4 8.2-9 8.2c-1.8 0-3.5-.5-5-1.4Z" />
    </svg>
  );
}