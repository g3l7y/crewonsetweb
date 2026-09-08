import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Crew On Set!" },
      { name: "description", content: "The story, the world, and the four crew roles that power every shoot in Crew On Set!" },
      { property: "og:title", content: "Features — Crew On Set!" },
      { property: "og:description", content: "The story, the world, and the four crew roles that power every shoot in Crew On Set!" },
    ],
  }),
  component: FeaturesPage,
});

import Image from "@/components/next-compat/image";
import { useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Camera,
  CheckCircle2,
  Megaphone,
  Scissors,
} from "lucide-react";

import { MarketingShell } from "@/components/marketing/marketing-shell";

import "@/styles/almanac.css";

const timeline = [
  {
    number: "01",
    title: "THE FIRST GIG",
    text: "A small commercial. Big dreams.",
  },
  {
    number: "02",
    title: "THINGS GET REAL",
    text: "New clients. Tighter deadlines. More chaos.",
  },
  {
    number: "03",
    title: "RISING REPUTATION",
    text: "Your crew starts to get noticed.",
  },
  {
    number: "04",
    title: "THE BIG LEAGUES",
    text: "One final job to prove you're the best.",
  },
];

const roles = [
  {
    icon: Megaphone,
    title: "Director",
    specialty: "Production Command",
    color: "coral",
    description:
      "Leads the production, coordinates the crew, and makes the final creative decisions to deliver the client's vision.",
    image: "/assets/story-studio.png",
    responsibilities: [
      "Read and understand the client brief",
      "Break down the vision and plan each take",
      "Assign roles and coordinate the crew",
      "Oversee the shoot and solve problems on set",
      "Approve the final cut before delivery",
    ],
    skills: ["Leadership", "Decision Making", "Communication", "Creative Vision"],
    tools: ["Shot List", "Storyboard", "Call Sheet", "Headset", "Monitor"],
    purpose:
      "Gameplay purpose: sets objectives, calls the shot order, and keeps every other role synced to the take.",
    quote: "A good Director doesn't just see the shot—they see the story behind it.",
  },
  {
    icon: Camera,
    title: "Cameraman",
    specialty: "Framing & Movement",
    color: "blue",
    description:
      "Captures the action with precision, controls the camera, and brings the story to life through framing and movement.",
    image: "/assets/gameplay-shot.png",
    responsibilities: [
      "Frame shots according to the director's vision",
      "Control focus, exposure, and camera movement",
      "Track unpredictable action across the set",
      "Capture every required shot",
    ],
    skills: ["Focus", "Composition", "Movement", "Visual Awareness"],
    tools: ["Camera", "Lenses", "Tripod", "Monitor", "Gimbal"],
    purpose:
      "Gameplay purpose: physically frames and times every shot, turning the director's plan into usable footage.",
    quote: "Every frame tells a story. Make sure yours is worth remembering.",
  },
  {
    icon: AudioLines,
    title: "AV Technician",
    specialty: "Light & Sound",
    color: "green",
    description:
      "Manages lighting, audio, monitors, and technical equipment to keep the set clean, stable, and production-ready.",
    image: "/assets/story-studio.png",
    responsibilities: [
      "Set up and operate production equipment",
      "Manage studio lighting and microphones",
      "Monitor audio and video signals",
      "Troubleshoot technical problems on set",
      "Maintain equipment and production quality",
    ],
    skills: ["Technical Expertise", "Problem Solving", "Equipment Management", "Attention to Detail"],
    tools: ["Microphone", "Studio Lights", "Mixer", "Monitors", "Cables"],
    purpose:
      "Gameplay purpose: keeps the technical systems running so the other three roles never lose sound or light mid-take.",
    quote: "When the equipment works perfectly, nobody notices. That's the point.",
  },
  {
    icon: Scissors,
    title: "Editor",
    specialty: "Post-Production",
    color: "purple",
    description:
      "Shapes the story in post, selects the strongest moments, fixes continuity issues, and builds the final commercial.",
    image: "/assets/gameplay-shot.png",
    responsibilities: [
      "Review all captured footage",
      "Select the strongest moments",
      "Assemble scenes into a cohesive sequence",
      "Fix continuity and pacing problems",
      "Prepare the final commercial for delivery",
    ],
    skills: ["Attention to Detail", "Storytelling", "Timing", "Creative Judgment"],
    tools: ["Editing Suite", "Timeline", "Headphones", "Monitor", "Storage"],
    purpose:
      "Gameplay purpose: turns the crew's raw takes into the final scored commercial that decides if the shoot succeeded.",
    quote: "The shoot captures the story. The edit decides how the story is remembered.",
  },
];

function FeaturesPage() {
  const [selectedRole, setSelectedRole] = useState(0);
  const role = roles[selectedRole]!;
  const RoleIcon = role.icon;

  return (
    <MarketingShell>
      <div className="features-almanac">

      {/* =========================================================
          HERO
      ========================================================= */}

      <section className="story-hero">
        <div className="story-hero-bg">
          <Image src="/assets/story-studio.png" alt="Crew working on a commercial set" fill priority className="object-cover" />
        </div>

        <div className="story-hero-overlay" />

        <div className="story-hero-content">
          <div className="story-camera-frame">
            <span className="camera-corner camera-corner-tl" />
            <span className="camera-corner camera-corner-tr" />
            <span className="camera-corner camera-corner-bl" />
            <span className="camera-corner camera-corner-br" />

            <div className="story-rec"><span />REC</div>

            <div className="story-hero-copy">
              <p className="story-eyebrow">THE WORLD & THE CREW</p>
              <h1>
                FEATURES OF
                <br />
                CREW ON SET!
              </h1>
              <p className="story-hero-description">
                From the studio&apos;s story to the four roles that run it —
                <br />
                everything that makes a shoot a Crew On Set! shoot.
              </p>
            </div>

            <div className="camera-info">
              <span>HD</span>
              <span>4K</span>
              <span>FPS 24</span>
              <span>00:01:24:08</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          THE PRODUCTION CONCEPT / WORKFLOW
      ========================================================= */}

      <section className="story-timeline">
        <div className="story-container">
          <div className="timeline-heading">
            <p className="story-eyebrow gold">THE PRODUCTION CONCEPT</p>
            <h2>THE PRODUCTION WORKFLOW</h2>
          </div>

          <div className="timeline">
            <div className="timeline-line" />
            {timeline.map((item, index) => (
              <div key={item.number} className="timeline-item">
                <div className="timeline-top">
                  <div className="timeline-number">{item.number}</div>
                  {index < timeline.length - 1 && <ArrowRight className="timeline-arrow" />}
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          FOUR ROLES — HERO INTRO
      ========================================================= */}

      <section className="almanac-hero">
        <div className="almanac-container almanac-hero-content">
          <br />
        </div>
      </section>

      {/* =====================================================
          ROLE SELECTOR
      ===================================================== */}

      <section className="almanac-selector-section">
        <div className="almanac-container">
          <div className="almanac-role-selector">
            {roles.map((item, index) => {
              const Icon = item.icon;
              const active = selectedRole === index;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setSelectedRole(index)}
                  className={`almanac-role-button ${active ? "active" : ""} color-${item.color}`}
                >
                  <Icon className="almanac-role-icon" />
                  <span className="almanac-role-name">{item.title}</span>
                  {active && <span className="almanac-role-active-line" />}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          ROLE DETAILS
      ===================================================== */}

      <section className="almanac-details-section">
        <div className="almanac-container almanac-details-container">
          <div className="almanac-details-box">
            <div className="almanac-details-heading">
              <h2>ROLE DETAILS</h2>
              <p>Explore the responsibilities, skills, tools, and gameplay purpose of the selected role.</p>
            </div>

            <div className="almanac-role-main">
              <div className="almanac-role-image">
                <Image src={role.image} alt={`${role.title} at Big Take Studios`} width={1200} height={800} />
                <div className="almanac-image-overlay" />
              </div>

              <div className="almanac-role-information">
                <div className="almanac-role-label">
                  <span className={`color-${role.color}`}>0{selectedRole + 1}</span>
                  <span className={`color-${role.color}`}>{role.specialty}</span>
                </div>

                <h2 className="almanac-role-title">{role.title}</h2>
                <p className="almanac-role-description">{role.description}</p>
                <p className="almanac-role-description">{role.purpose}</p>

                <div className="almanac-info-grid">
                  <div className="almanac-info-card">
                    <h3 className={`color-${role.color}`}>Key Responsibilities</h3>
                    <div className="almanac-responsibility-list">
                      {role.responsibilities.map((item) => (
                        <div key={item} className="almanac-responsibility">
                          <CheckCircle2 className={`color-${role.color}`} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="almanac-info-card">
                    <h3 className={`color-${role.color}`}>Key Skills</h3>
                    <div className="almanac-skills-list">
                      {role.skills.map((skill) => (
                        <div key={skill} className="almanac-skill">
                          <RoleIcon className={`color-${role.color}`} />
                          <span>{skill}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="almanac-bottom-grid">
              <div className="almanac-info-card almanac-tools-card">
                <h3>Tools of the Trade</h3>
                <div className="almanac-tools">
                  {role.tools.map((tool) => (
                    <div key={tool} className="almanac-tool">
                      <div className="almanac-tool-icon">
                        <RoleIcon className={`color-${role.color}`} />
                      </div>
                      <span>{tool}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="almanac-quote-card">
                <p><span>&ldquo;</span>{role.quote}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          QUICK REFERENCE
      ===================================================== */}

      <section className="almanac-reference-section">
        <div className="almanac-container">
          <div className="almanac-reference-heading">
            <span className="almanac-reference-eyebrow">QUICK REFERENCE</span>
            <h2>ALL ROLES AT A GLANCE</h2>
            <p>A quick look at what each department brings to the set.</p>
          </div>

          <div className="almanac-reference-grid">
            <div className="almanac-reference-header">
              <div>ROLE</div>
              <div>MAIN FUNCTION</div>
              <div>KEY STRENGTH</div>
              <div>PRIMARY FOCUS</div>
            </div>

            {roles.map((item) => {
              const Icon = item.icon;

              const roleSummary: Record<string, { function: string; strength: string; responsibility: string }> = {
                Director: {
                  function: "Leads the production and oversee everything.",
                  strength: "Leadership",
                  responsibility: "Planning & Coordination",
                },
                Cameraman: {
                  function: "Captures and frames the action on set.",
                  strength: "Focus",
                  responsibility: "Camera & Movement",
                },
                "AV Technician": {
                  function: "Manages lighting, audio, and technical systems.",
                  strength: "Technical Expertise",
                  responsibility: "Equipment & Monitoring",
                },
                Editor: {
                  function: "Shapes and assembles the final commercial.",
                  strength: "Attention to Detail",
                  responsibility: "Editing & Storytelling",
                },
              };
              const summary = roleSummary[item.title];

              return (
                <div key={item.title} className="almanac-reference-row">
                  <div className={`almanac-reference-role color-${item.color}`}>
                    <div className="almanac-reference-icon"><Icon /></div>
                    <div><h3>{item.title}</h3></div>
                  </div>

                  <div className="almanac-reference-item"><p>{summary?.function}</p></div>
                  <div className="almanac-reference-item"><p>{summary?.strength}</p></div>
                  <div className="almanac-reference-item"><p>{summary?.responsibility}</p></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      </div>
    </MarketingShell>
  );
}
