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
    title: "PRE-PRODUCTION",
    text: "Review and accept the contract, plan the required shots, then buy and arrange the set, products, props, actors, and equipment.",
  },
  {
    number: "02",
    title: "PRODUCTION",
    text: "Set up lighting, frame the brief's required shots, cue actor actions when needed, and record takes you can review or try again.",
  },
  {
    number: "03",
    title: "POST-PRODUCTION",
    text: "Arrange and trim footage on the timeline, add required branding and sound, adjust color, then export and submit for a review.",
  },
];

const roles = [
  {
    icon: Megaphone,
    title: "Director",
    specialty: "Set & Actor Direction",
    color: "coral",
    description:
      "Uses the production tablet to plan the set, place products and props, position actors, and cue their actions to meet the client brief.",
    image: "/assets/home-role-director.png",
    responsibilities: [
      "Review the contract and its shot requirements",
      "Choose and arrange the set, backdrop, products, and props",
      "Place actors and plan their poses or movement",
      "Cue actor actions during a take when the contract requires it",
    ],
    skills: ["Leadership", "Decision Making", "Communication", "Creative Vision"],
    tools: ["Production Tablet", "Contract Brief", "Set Props", "Actors", "Megaphone"],
    purpose:
      "In multiplayer, the Director handles set planning and actor cues. In solo play, one player can take on these tasks along with the other roles.",
    quote: "A good Director doesn't just see the shot—they see the story behind it.",
  },
  {
    icon: AudioLines,
    title: "AV Technician",
    specialty: "Lighting & Monitoring",
    color: "green",
    description:
      "Sets up production lights and monitors audio levels with the in-game audio monitor while the set is prepared.",
    image: "/assets/home-role-av-technician.png",
    responsibilities: [
      "Collect and set up production lights",
      "Adjust light placement, power, intensity, and color temperature",
      "Use the audio monitor to check levels",
    ],
    skills: ["Technical Expertise", "Problem Solving", "Equipment Management", "Attention to Detail"],
    tools: ["Panel Lights", "Better Lights", "Audio Monitor", "Light Controls", "Equipment Shop"],
    purpose:
      "The AV Technician prepares and adjusts lighting and can monitor audio levels. The game does not record a live microphone track into the commercial.",
    quote: "When the equipment works perfectly, nobody notices. That's the point.",
  },
  {
    icon: Camera,
    title: "Cameraman",
    specialty: "Framing & Recording",
    color: "blue",
    description:
      "Uses the camera viewfinder and controls to compose shots, adjust available camera settings, and record footage for the edit.",
    image: "/assets/home-role-cameraman.png",
    responsibilities: [
      "Frame the subjects and composition required by the contract",
      "Adjust available focus, zoom, white balance, and exposure controls as they unlock",
      "Record and review takes on SD cards",
      "Capture the footage needed for the final edit",
    ],
    skills: ["Focus", "Composition", "Movement", "Visual Awareness"],
    tools: ["Camera", "Viewfinder", "SD Cards", "Camera Settings", "Recording Controls"],
    purpose:
      "The Cameraman frames and records the takes used in the edit. In solo play, the same player can switch between camera work and the other production tasks.",
    quote: "Every frame tells a story. Make sure yours is worth remembering.",
  },
  {
    icon: Scissors,
    title: "Editor",
    specialty: "Post-Production",
    color: "purple",
    description:
      "Builds the commercial in the editing suite by arranging and trimming recorded clips, adding branding and sound, adjusting color, then exporting and submitting the cut.",
    image: "/assets/home-role-editor.png",
    responsibilities: [
      "Preview and select recorded takes",
      "Arrange, trim, or split clips on the timeline",
      "Add campaign branding, overlays, and music where required",
      "Adjust color and check the commercial's duration and contract requirements",
      "Export and submit the cut for grading and feedback",
    ],
    skills: ["Attention to Detail", "Storytelling", "Timing", "Creative Judgment"],
    tools: ["Editing Suite", "Timeline", "Recorded Clips", "Branding & Music", "Color Grading"],
    purpose:
      "The Editor assembles and submits the final cut. The game grades the submitted commercial against the contract's setup, footage, and editing requirements and returns feedback.",
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
          <Image src="/assets/home-role-director.png" alt="The Director leading a production on set" fill priority className="object-cover" />
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
                <span className="text-yellow">CREW </span>
                <span className="text-coral">ON</span>
                <span className="text-yellow"> SET</span>
                <span className="text-coral">!</span>
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
