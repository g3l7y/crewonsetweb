import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/portal/almanac")({
  head: () => ({
    meta: [
      { title: "Almanac — Crew On Set! Portal" },
      { name: "description", content: "Your production logs and unlocked achievements." },
      { property: "og:title", content: "Almanac — Crew On Set! Portal" },
      { property: "og:description", content: "Your production logs and unlocked achievements." },
    ],
  }),
  component: AlmanacPage,
});

import { useMemo, useState } from "react";
import { ProductionLogs } from "@/components/portal/production-logs";
import {
  Award,
  Camera,
  CheckCircle2,
  Clapperboard,
  Crown,
  Film,
  Lock,
  Medal,
  ScrollText,
  Sparkles,
  Star,
  Trophy,
  Users,
  X,
} from "lucide-react";

type Achievement = {
  name: string;
  description: string;
  date?: string;
  unlocked: boolean;
  icon: typeof Star;
  progress?: string;
  percent?: number;
  requirement?: string;
  levelUnlocked: number;
  unlocks: string;
};

const achievements: Achievement[] = [
  {
    name: "Perfect Take",
    description: "Earn a 100% production rating.",
    date: "Aug 02, 2026",
    unlocked: true,
    icon: Star,
    requirement: "Earn a perfect 100% production rating.",
    levelUnlocked: 12,
    unlocks: "Precision Framing techniques and the S-Rank scoring breakdown.",
  },
  {
    name: "Box Office Hit",
    description: "Score over 100,000 in one production.",
    date: "Jul 19, 2026",
    unlocked: true,
    icon: Trophy,
    requirement: "Score more than 100,000 points in a single production.",
    levelUnlocked: 18,
    unlocks: "Advanced client-rating tactics and the Box Office bonus multiplier guide.",
  },
  {
    name: "First Day on Set",
    description: "Complete your first production.",
    date: "Mar 14, 2025",
    unlocked: true,
    icon: Clapperboard,
    requirement: "Complete your first production.",
    levelUnlocked: 1,
    unlocks: "On-set basics: call sheets, slate reading, and the production log system.",
  },
  {
    name: "One More Take",
    description: "Replay a production five times.",
    date: "Jun 04, 2026",
    unlocked: true,
    icon: Camera,
    requirement: "Replay any production five times.",
    levelUnlocked: 8,
    unlocks: "Retake analysis knowledge and the shot-consistency training drills.",
  },
  {
    name: "Production Veteran",
    description: "Complete 100 productions.",
    progress: "87/100 Productions",
    percent: 87,
    unlocked: false,
    icon: Film,
    requirement: "Complete 100 productions.",
    levelUnlocked: 40,
    unlocks: "The Veteran department dossier and legacy production archive access.",
  },
  {
    name: "Department Head",
    description: "Reach Crew Level 50.",
    progress: "27/50 Crew Level",
    percent: 54,
    unlocked: false,
    icon: Award,
    requirement: "Reach Crew Level 50.",
    levelUnlocked: 50,
    unlocks: "Crew leadership knowledge and multi-department coordination playbook.",
  },
  {
    name: "Legendary Crew",
    description: "Work with ten legendary players.",
    progress: "2/10 Legendary Crew",
    percent: 20,
    unlocked: false,
    icon: Users,
    requirement: "Work with ten legendary crew members.",
    levelUnlocked: 35,
    unlocks: "Legendary collaboration perks and the co-op scoring knowledge set.",
  },
  {
    name: "Flawless Reel",
    description: "Earn ten perfect scores.",
    progress: "3/10 Perfect Scores",
    percent: 30,
    unlocked: false,
    icon: Crown,
    requirement: "Earn ten perfect production scores.",
    levelUnlocked: 45,
    unlocks: "The Flawless Reel masterclass and the perfect-run replay library.",
  },
];

function formatShort(value?: string) {
  return value ?? "";
}

function AlmanacPage() {
  const [tab, setTab] = useState<"Production Logs" | "Achievements">(
    "Production Logs"
  );
  const [filter, setFilter] = useState("All");
  const [achievementSort, setAchievementSort] = useState("Recent");
  const [selectedAchievement, setSelectedAchievement] =
    useState<Achievement | null>(null);

  const shownAchievements = useMemo(() => {
    const filtered = achievements.filter((item) => {
      if (filter === "Unlocked") return item.unlocked;
      if (filter === "Locked") return !item.unlocked;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (a.unlocked && b.unlocked) {
        const dateA = new Date(a.date ?? 0).getTime();
        const dateB = new Date(b.date ?? 0).getTime();
        if (achievementSort === "Oldest") return dateA - dateB;
        return dateB - dateA;
      }
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      return 0;
    });
  }, [filter, achievementSort]);

  return (
    <div className="portal-page almanac-page">
      <div className="almanac-container">
        <header className="almanac-header">
          <div className="header-title-area">
            <p className="page-eyebrow">PRODUCTION ARCHIVE</p>
            <h1 className="almanac-title">ALMANAC</h1>
          </div>
        </header>

        {/* SECTION TABS */}
        <div className="almanac-tabs-wrapper">
          <div className="almanac-tabs">
            {[
              { name: "Production Logs" as const, icon: ScrollText },
              { name: "Achievements" as const, icon: Award },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.name;
              return (
                <button
                  type="button"
                  key={item.name}
                  onClick={() => setTab(item.name)}
                  className={active ? "almanac-tab active" : "almanac-tab"}
                >
                  <Icon className="almanac-tab-icon" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {tab === "Production Logs" ? (
          <ProductionLogs />
        ) : (
          <section className="achievements-section">
            <div className="achievements-toolbar">
              <div className="achievements-filters">
                {["All", "Unlocked", "Locked"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    className={
                      filter === option
                        ? "achievements-filter active"
                        : "achievements-filter"
                    }
                  >
                    {option}
                  </button>
                ))}
              </div>

              <select
                value={achievementSort}
                onChange={(e) => setAchievementSort(e.target.value)}
                className="achievements-sort"
                aria-label="Sort achievements"
              >
                <option value="Recent">Recent</option>
                <option value="Oldest">Oldest</option>
              </select>
            </div>

            <div className="achievements-grid">
              {shownAchievements.map((achievement) => {
                const AchievementIcon = achievement.icon;
                return (
                  <button
                    key={achievement.name}
                    type="button"
                    onClick={() => setSelectedAchievement(achievement)}
                    className={`achievement-card ${
                      achievement.unlocked ? "unlocked" : "locked"
                    }`}
                  >
                    <div className="achievement-card-top">
                      <div
                        className={`achievement-icon ${
                          achievement.unlocked ? "unlocked" : "locked"
                        }`}
                      >
                        <AchievementIcon />
                      </div>

                      <div className="achievement-card-body">
                        <div className="achievement-card-heading">
                          <h3>{achievement.name}</h3>
                          {achievement.unlocked ? (
                            <Medal className="achievement-medal" />
                          ) : (
                            <Lock className="achievement-lock" />
                          )}
                        </div>
                        <p className="achievement-desc">
                          {achievement.description}
                        </p>
                      </div>
                    </div>

                    <div className="achievement-level-row">
                      <span className="achievement-level-badge">
                        Level {achievement.levelUnlocked}
                      </span>
                      <span className="achievement-level-label">
                        {achievement.unlocked
                          ? "Unlocked at"
                          : "Unlocks at"}
                      </span>
                    </div>

                    <div className="achievement-unlocks">
                      <span className="achievement-unlocks-eyebrow">
                        <Sparkles className="achievement-unlocks-icon" />
                        Knowledge Unlocked
                      </span>
                      <p>{achievement.unlocks}</p>
                    </div>

                    {achievement.unlocked ? (
                      <div className="achievement-footer unlocked">
                        <span>Unlocked {formatShort(achievement.date)}</span>
                        <CheckCircle2 className="achievement-check" />
                      </div>
                    ) : (
                      <div className="achievement-progress">
                        <div className="achievement-progress-labels">
                          <span>{achievement.progress}</span>
                          <span>{achievement.percent}%</span>
                        </div>
                        <div className="achievement-progress-track">
                          <div
                            className="achievement-progress-fill"
                            style={{ width: `${achievement.percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {shownAchievements.length === 0 && (
              <div className="empty-results">
                <Trophy className="empty-icon" />
                <h3>NO ACHIEVEMENTS FOUND</h3>
                <p>Try switching to another achievement filter.</p>
              </div>
            )}
          </section>
        )}
      </div>

      {/* ACHIEVEMENT MODAL */}
      {selectedAchievement && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedAchievement(null)}
        >
          <div
            className="achievement-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close achievement"
              onClick={() => setSelectedAchievement(null)}
              className="modal-close"
            >
              <X />
            </button>

            <div className="achievement-modal-icon-wrap">
              <div
                className={`achievement-icon large ${
                  selectedAchievement.unlocked ? "unlocked" : "locked"
                }`}
              >
                <selectedAchievement.icon />
              </div>
            </div>

            <div className="achievement-modal-heading">
              <div className="achievement-modal-title">
                <h2>{selectedAchievement.name}</h2>
                {selectedAchievement.unlocked && (
                  <CheckCircle2 className="achievement-check" />
                )}
              </div>
              <p>{selectedAchievement.description}</p>
            </div>

            <div className="achievement-modal-level">
              <span className="achievement-level-badge">
                Level {selectedAchievement.levelUnlocked}
              </span>
              <span>
                {selectedAchievement.unlocked
                  ? "Level unlocked"
                  : "Level required"}
              </span>
            </div>

            <div className="achievement-modal-block">
              <p className="achievement-modal-block-title">
                <Sparkles className="achievement-unlocks-icon" />
                Knowledge / Content Unlocked
              </p>
              <p className="achievement-modal-block-value">
                {selectedAchievement.unlocks}
              </p>
            </div>

            <div className="achievement-modal-block muted">
              <p className="achievement-modal-block-title">Requirement</p>
              <p className="achievement-modal-block-value">
                {selectedAchievement.requirement}
              </p>
            </div>

            {selectedAchievement.unlocked ? (
              <div className="achievement-modal-unlocked">
                <Medal />
                <span>Unlocked on {selectedAchievement.date}</span>
              </div>
            ) : (
              <div className="achievement-progress">
                <div className="achievement-progress-labels">
                  <span>{selectedAchievement.progress}</span>
                  <span>{selectedAchievement.percent}%</span>
                </div>
                <div className="achievement-progress-track">
                  <div
                    className="achievement-progress-fill"
                    style={{ width: `${selectedAchievement.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }

        .almanac-page {
          min-height: 100vh;
          padding: 32px 24px 48px;
          background: var(--blueprint-paper);
          color: #131b34;
          overflow-x: hidden;
        }

        .almanac-container {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
        }

        .almanac-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
        }

        .header-title-area {
          min-width: 0;
        }

        .page-eyebrow {
          margin: 0;
          color: #ff765f;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .almanac-title {
          margin: 8px 0 0;
          color: #131b34;
          font-size: 48px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: -0.035em;
          text-transform: uppercase;
        }

        /* SECTION TABS */
        .almanac-tabs-wrapper {
          width: 100%;
          margin-top: 26px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .almanac-tabs-wrapper::-webkit-scrollbar {
          display: none;
        }

        .almanac-tabs {
          display: flex;
          align-items: stretch;
          width: 100%;
          min-width: max-content;
          gap: 4px;
          border-bottom: 1px solid rgba(19, 27, 52, 0.12);
        }

        .almanac-tab {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-width: 170px;
          height: 58px;
          padding: 0 24px;
          border: none;
          border-bottom: 3px solid transparent;
          border-radius: 8px 8px 0 0;
          background: transparent;
          color: #65738a;
          font-family: inherit;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
          cursor: pointer;
          transition: color 0.2s ease, background 0.2s ease;
        }

        .almanac-tab:hover {
          background: rgba(19, 27, 52, 0.04);
          color: #131b34;
        }

        .almanac-tab.active {
          color: #131b34;
          border-bottom-color: #ff765f;
        }

        .almanac-tab-icon {
          width: 18px;
          height: 18px;
        }

        /* ACHIEVEMENTS */
        .achievements-section {
          margin-top: 28px;
        }

        .achievements-toolbar {
          display: flex;
          flex-direction: column;
          gap: 16px;
          justify-content: space-between;
          border-bottom: 1px solid rgba(19, 27, 52, 0.1);
        }

        @media (min-width: 640px) {
          .achievements-toolbar {
            flex-direction: row;
            align-items: flex-end;
          }
        }

        .achievements-filters {
          display: flex;
          gap: 24px;
        }

        .achievements-filter {
          padding-bottom: 12px;
          border: none;
          border-bottom: 2px solid transparent;
          background: transparent;
          color: rgba(19, 27, 52, 0.4);
          font-family: inherit;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 0.2s ease, border-color 0.2s ease;
        }

        .achievements-filter:hover {
          color: rgba(19, 27, 52, 0.7);
        }

        .achievements-filter.active {
          color: #131b34;
          border-bottom-color: #ff765f;
        }

        .achievements-sort {
          margin-bottom: 8px;
          padding: 12px 16px;
          border: 1px solid rgba(19, 27, 52, 0.14);
          border-radius: 8px;
          background: var(--blueprint-paper-soft);
          color: rgba(19, 27, 52, 0.7);
          font-family: inherit;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          outline: none;
          cursor: pointer;
          transition: border-color 0.2s ease;
        }

        .achievements-sort:focus {
          border-color: rgba(255, 118, 95, 0.65);
        }

        .achievements-grid {
          display: grid;
          gap: 16px;
          margin-top: 24px;
          grid-template-columns: 1fr;
        }

        @media (min-width: 768px) {
          .achievements-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1200px) {
          .achievements-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .achievement-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px;
          border: 1px solid rgba(19, 27, 52, 0.1);
          border-radius: 16px;
          background: var(--blueprint-paper-soft);
          text-align: left;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease,
            box-shadow 0.2s ease, opacity 0.2s ease;
        }

        .achievement-card.unlocked {
          border-color: rgba(255, 199, 44, 0.4);
        }

        .achievement-card.locked {
          opacity: 0.66;
        }

        .achievement-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px rgba(19, 27, 52, 0.1);
          opacity: 1;
        }

        .achievement-card.unlocked:hover {
          border-color: rgba(255, 199, 44, 0.7);
        }

        .achievement-card-top {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .achievement-icon {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 56px;
          height: 56px;
          border-radius: 12px;
        }

        .achievement-icon svg {
          width: 28px;
          height: 28px;
        }

        .achievement-icon.large {
          width: 64px;
          height: 64px;
          border-radius: 14px;
        }

        .achievement-icon.large svg {
          width: 32px;
          height: 32px;
        }

        .achievement-icon.unlocked {
          background: var(--sunburst, #ffc72c);
          color: #131b34;
          box-shadow: 0 8px 18px rgba(255, 199, 44, 0.35);
        }

        .achievement-icon.locked {
          background: rgba(19, 27, 52, 0.06);
          color: rgba(19, 27, 52, 0.28);
        }

        .achievement-card-body {
          min-width: 0;
        }

        .achievement-card-heading {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .achievement-card-heading h3 {
          margin: 0;
          color: #131b34;
          font-size: 15px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .achievement-medal {
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          color: var(--sunburst, #ffc72c);
        }

        .achievement-lock {
          flex-shrink: 0;
          width: 14px;
          height: 14px;
          color: rgba(19, 27, 52, 0.28);
        }

        .achievement-desc {
          margin: 4px 0 0;
          color: rgba(19, 27, 52, 0.55);
          font-size: 13px;
          line-height: 1.5;
        }

        .achievement-level-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .achievement-level-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 12px;
          border-radius: 999px;
          background: rgba(255, 118, 95, 0.12);
          color: #ff765f;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .achievement-level-label {
          color: rgba(19, 27, 52, 0.45);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .achievement-unlocks {
          padding: 12px 14px;
          border: 1px solid rgba(19, 27, 52, 0.08);
          border-radius: 10px;
          background: rgba(19, 27, 52, 0.03);
        }

        .achievement-unlocks-eyebrow {
          display: flex;
          align-items: center;
          gap: 6px;
          color: rgba(19, 27, 52, 0.45);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .achievement-unlocks-icon {
          width: 13px;
          height: 13px;
          color: #ff765f;
        }

        .achievement-unlocks p {
          margin: 6px 0 0;
          color: rgba(19, 27, 52, 0.75);
          font-size: 13px;
          font-weight: 600;
          line-height: 1.5;
        }

        .achievement-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
        }

        .achievement-footer.unlocked span {
          color: #1f9d6b;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .achievement-check {
          width: 16px;
          height: 16px;
          color: #1f9d6b;
        }

        .achievement-progress {
          margin-top: auto;
        }

        .achievement-progress-labels {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          color: rgba(19, 27, 52, 0.4);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .achievement-progress-track {
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(19, 27, 52, 0.1);
        }

        .achievement-progress-fill {
          height: 100%;
          border-radius: 999px;
          background: #ff765f;
          transition: width 0.5s ease;
        }

        /* EMPTY */
        .empty-results {
          margin-top: 24px;
          padding: 48px 24px;
          border: 1px solid rgba(19, 27, 52, 0.1);
          border-radius: 16px;
          background: var(--blueprint-paper-soft);
          text-align: center;
        }

        .empty-icon {
          width: 40px;
          height: 40px;
          margin: 0 auto;
          color: rgba(19, 27, 52, 0.2);
        }

        .empty-results h3 {
          margin: 16px 0 0;
          color: #131b34;
          font-weight: 900;
          text-transform: uppercase;
        }

        .empty-results p {
          margin: 8px 0 0;
          color: rgba(19, 27, 52, 0.45);
          font-size: 14px;
        }

        /* MODAL */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 120;
          display: grid;
          place-items: center;
          padding: 16px;
          background: rgba(5, 8, 13, 0.55);
          backdrop-filter: blur(6px);
        }

        .achievement-modal {
          position: relative;
          width: 100%;
          max-width: 460px;
          padding: 28px;
          border: 1px solid rgba(19, 27, 52, 0.12);
          border-radius: 18px;
          background: var(--blueprint-paper);
          box-shadow: 0 30px 60px rgba(5, 8, 13, 0.4);
        }

        .modal-close {
          position: absolute;
          top: 18px;
          right: 18px;
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 999px;
          background: rgba(19, 27, 52, 0.06);
          color: rgba(19, 27, 52, 0.45);
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .modal-close:hover {
          background: rgba(19, 27, 52, 0.12);
          color: #131b34;
        }

        .modal-close svg {
          width: 18px;
          height: 18px;
        }

        .achievement-modal-icon-wrap {
          display: flex;
          justify-content: center;
          padding-top: 6px;
        }

        .achievement-modal-heading {
          margin-top: 18px;
          text-align: center;
        }

        .achievement-modal-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .achievement-modal-title h2 {
          margin: 0;
          color: #131b34;
          font-size: 20px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .achievement-modal-heading > p {
          margin: 8px 0 0;
          color: rgba(19, 27, 52, 0.55);
          font-size: 14px;
          line-height: 1.5;
        }

        .achievement-modal-level {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 20px;
        }

        .achievement-modal-level > span:last-child {
          color: rgba(19, 27, 52, 0.45);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .achievement-modal-block {
          margin-top: 16px;
          padding: 16px;
          border: 1px solid rgba(255, 118, 95, 0.25);
          border-radius: 12px;
          background: rgba(255, 118, 95, 0.06);
          text-align: center;
        }

        .achievement-modal-block.muted {
          border-color: rgba(19, 27, 52, 0.1);
          background: rgba(19, 27, 52, 0.03);
        }

        .achievement-modal-block-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin: 0;
          color: rgba(19, 27, 52, 0.4);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .achievement-modal-block-value {
          margin: 6px 0 0;
          color: rgba(19, 27, 52, 0.82);
          font-size: 14px;
          font-weight: 700;
          line-height: 1.5;
        }

        .achievement-modal-unlocked {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 20px;
          color: #1f9d6b;
          font-size: 14px;
          font-weight: 900;
        }

        .achievement-modal-unlocked svg {
          width: 20px;
          height: 20px;
        }

        .achievement-modal .achievement-progress {
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
}
