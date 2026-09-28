/**
 * Centralized PlayFab Data Keys and Constants.
 * Shared contract between Unity game client and website portal.
 */

/**
 * Authoritative PlayFab User Data Keys (Read/Write via User Data API).
 */
export const PLAYFAB_DATA_KEYS = {
  progression: "progression",
  stats: "stats",
  loadout: "loadout",
  almanac_unlocked: "almanac_unlocked",
  production_logs: "production_logs",
  transactions: "transactions",
  notifications: "notifications",
  profile_metadata: "profile_metadata",
  legal_consent: "legal_consent",
  // Backward compatibility / alias keys
  achievements: "achievements",
  knowledge: "knowledge",
} as const;

export type PlayFabDataKey = (typeof PLAYFAB_DATA_KEYS)[keyof typeof PLAYFAB_DATA_KEYS];

/**
 * Standard PlayFab Player Statistics (Scalar integer metrics).
 */
export const PLAYFAB_STATISTICS = {
  level: "level",
  total_xp: "total_xp",
  highest_level: "highest_level",
  tutorial_progress: "tutorial_progress",
  campaign_completed: "campaign_completed",
  multiplayer_unlocked: "multiplayer_unlocked",
  director_productions: "director_productions",
  cameraman_productions: "cameraman_productions",
  av_tech_productions: "av_tech_productions",
  editor_productions: "editor_productions",
  director_avg_score: "director_avg_score",
  cameraman_avg_score: "cameraman_avg_score",
  av_tech_avg_score: "av_tech_avg_score",
  editor_avg_score: "editor_avg_score",
} as const;

export type PlayFabStatistic = (typeof PLAYFAB_STATISTICS)[keyof typeof PLAYFAB_STATISTICS];

/**
 * PlayFab Virtual Currency Codes.
 * BC = B-Coins (in-game production budget currency)
 * CC = C-Coins (player cosmetic/premium currency, server-authoritative)
 */
export const PLAYFAB_CURRENCIES = {
  BC: "BC",
  CC: "CC",
} as const;

export type PlayFabCurrency = (typeof PLAYFAB_CURRENCIES)[keyof typeof PLAYFAB_CURRENCIES];

/**
 * Standard 23 Knowledge Entry IDs for the Film Set Almanac.
 */
export const ALMANAC_KNOWLEDGE_IDS = [
  "rule_of_thirds",
  "three_point_lighting",
  "director_tablet",
  "led_panel",
  "nony_fx_camera",
  "sd_card",
  "level_2_camera",
  "level_3_soft_light",
  "level_1_workflow",
  "contracts_and_guides",
  "set_building",
  "recording_workflow",
  "automotive_staging",
  "soft_light_technique",
  "hiring_and_posing_actors",
  "shot_coverage",
  "screen_continuity",
  "motivated_lighting",
  "lifestyle_staging",
  "warm_commercial_grade",
  "creative_brief",
  "visual_hierarchy",
  "quality_control",
] as const;

export type AlmanacKnowledgeId = (typeof ALMANAC_KNOWLEDGE_IDS)[number];
