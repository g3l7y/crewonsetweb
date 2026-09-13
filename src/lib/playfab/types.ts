/**
 * PlayFab integration TypeScript type definitions.
 *
 * Central type definition file for all PlayFab entities, player progression,
 * virtual currency, admin moderation, portal state, and service interfaces.
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

/**
 * Playable film crew roles in Crew On Set.
 */
export type PlayerRole = 'director' | 'cameraman' | 'av_technician' | 'editor';

/**
 * In-game shop and inventory item categories.
 */
export type ItemCategory = 'costumes' | 'decorators' | 'equipment' | 'other';

/**
 * Item rarity tiers determining visual styling and drop rates.
 */
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/**
 * Production game modes.
 */
export type ProductionMode = 'solo' | 'multiplayer';

/**
 * Virtual currencies supported in the ecosystem.
 * - bCoins: Soft in-game currency earned via productions.
 * - cCoins: Premium hard currency (potential real-money), server-authoritative only.
 */
export type CurrencyType = 'bCoins' | 'cCoins';

/**
 * Transaction ledger operation types.
 */
export type TransactionType = 'purchase' | 'earn' | 'spend' | 'grant';

/**
 * Social friendship connection states.
 */
export type FriendStatus = 'confirmed' | 'pending_incoming' | 'pending_outgoing';

/**
 * Moderation triage states for player and bug reports.
 */
export type ReportStatus = 'New' | 'Investigating' | 'Resolved';

/**
 * Brand partnership application workflow states.
 */
export type PartnershipStatus = 'Pending' | 'Approved' | 'On-going' | 'Done' | 'Declined';

// ============================================================================
// Player Data
// ============================================================================

/**
 * Canonical player account profile.
 */
export interface PlayerProfile {
  /** PlayFab unique entity ID */
  playFabId: string;
  /** Registered email address */
  email: string;
  /** Public display name */
  displayName: string;
  /** Unique username identifier */
  username: string;
  /** URL to player's avatar image */
  avatarUrl?: string | null | undefined;
  /** Primary / preferred crew role */
  primaryRole?: PlayerRole | undefined;
  /** Role alias */
  role?: PlayerRole | string | undefined;
  /** Short player bio */
  bio?: string | undefined;
  /** Studio crew identifier, e.g. "COS-0001" */
  crewId?: string | undefined;
  /** ISO timestamp when the account was registered */
  joinedAt: string;
  /** ISO timestamp of most recent login */
  lastLoginAt: string;

  /** Legacy / convenience alias for playFabId */
  id?: string | undefined;
  /** Legacy / convenience alias for lastLoginAt */
  lastLogin?: string | undefined;
  /** Legacy / convenience alias for joinedAt */
  createdAt?: string | undefined;
}

/**
 * Player career progression, level milestones, and unlocked modes.
 */
export interface PlayerProgression {
  /** Current career level */
  level: number;
  /** Current experience points in active level */
  currentXp: number;
  /** Experience points required to reach next level */
  xpToNextLevel: number;
  /** Cumulative experience points earned across all games */
  totalXp: number;
  /** Highest stage/level unlocked in career campaign */
  highestLevelUnlocked: number;
  /** List of completed level IDs */
  completedLevels: string[];
  /** Map of level ID to list of completed stage IDs */
  completedStages: Record<string, string[]>;
  /** Tutorial progress percentage (0 - 100) */
  tutorialProgress: number;
  /** Whether onboarding tutorials have been finished */
  tutorialsCompleted: boolean;
  /** Whether the main production campaign has been finished */
  campaignCompleted: boolean;
  /** Whether multiplayer co-op sessions are unlocked */
  multiplayerUnlocked: boolean;

  /** Legacy / convenience aliases */
  highest_level?: number | undefined;
  total_xp?: number | undefined;
  tutorial_progress?: number | undefined;
  campaign_completed?: number | boolean | undefined;
  multiplayer_unlocked?: number | boolean | undefined;
}

/**
 * Player currency wallet.
 * Note: cCoins is strictly server-authoritative.
 */
export interface PlayerWallet {
  /** Soft currency earned in-game */
  bCoins: number;
  /** Premium currency (server-authoritative) */
  cCoins: number;
}

/**
 * Individual inventory item owned by a player.
 */
export interface InventoryItem {
  /** Unique catalog item identifier */
  itemId: string;
  /** Display title */
  displayName: string;
  /** Categorization */
  category: ItemCategory;
  /** Rarity tier */
  rarity: ItemRarity;
  /** Equipped slot name if currently equipped (e.g. "costume", "Head") */
  equippedSlot?: string | undefined;
  /** ISO timestamp when item was granted / purchased */
  acquiredAt: string;
  /** Item quantity / stack count */
  quantity: number;
  /** Arbitrary item metadata or properties */
  metadata?: Record<string, string> | undefined;

  /** Optional item description */
  description?: string | undefined;
  /** Optional catalog item price */
  price?: number | undefined;
  /** Optional currency used for purchase */
  currency?: CurrencyType | undefined;
  /** Optional PlayFab instance identifier */
  itemInstanceId?: string | undefined;
  /** Optional custom data dictionary from PlayFab */
  customData?: Record<string, string> | undefined;
  /** Legacy alias for acquiredAt */
  purchaseDate?: string | undefined;
  /** Uses remaining if consumable item */
  remainingUses?: number | null | undefined;
}

/**
 * Equipped cosmetic and equipment loadout mapped by slot name.
 */
export interface Loadout {
  costume?: string | undefined;
  decorator?: string | undefined;
  equipment?: string | undefined;
  [slot: string]: string | undefined;
}

/**
 * In-game achievement tracking.
 */
export interface Achievement {
  /** Unique achievement identifier */
  id: string;
  /** Title / display name */
  title: string;
  /** Unlocking condition description */
  description: string;
  /** Whether achievement criteria have been fulfilled */
  unlocked: boolean;
  /** Current progress value towards maxProgress */
  progress: number;
  /** Target progress required for unlock */
  maxProgress: number;
  /** ISO timestamp when achieved */
  unlockedAt?: string | null | undefined;
  /** Icon asset URL */
  iconUrl?: string | undefined;

  /** Legacy alias for title */
  name?: string | undefined;
  /** Legacy alias for unlocked */
  isCompleted?: boolean | undefined;
}

/**
 * Film set Almanac / Knowledge base entry.
 */
export interface KnowledgeEntry {
  /** Unique knowledge entry identifier */
  id: string;
  /** Entry title */
  title: string;
  /** Topic category (e.g. "cinematography", "lighting", "workflow") */
  category: string;
  /** Detailed educational content */
  content: string;
  /** Whether player has discovered / unlocked this entry */
  unlocked: boolean;
  /** ISO timestamp when unlocked */
  unlockedAt?: string | null | undefined;
  /** Optional unlock progress (0 - 100) */
  progress?: number | undefined;

  /** Legacy alias for unlocked */
  isUnlocked?: boolean | undefined;
  /** Legacy alias for content summary */
  contentSummary?: string | undefined;
}

/**
 * Production wrap log recorded at completion of a shoot.
 */
export interface ProductionLog {
  /** Unique production record identifier */
  productionId?: string | undefined;
  /** Contract ID if tied to a client contract */
  contractId?: string | undefined;
  /** Client or studio brand name */
  clientName?: string | undefined;
  /** Production level index */
  level: number;
  /** Production stage name or identifier */
  stage?: string | undefined;
  /** Production mode */
  mode: ProductionMode;
  /** Co-op team ID if multiplayer */
  teamId?: string | undefined;
  /** ISO timestamp when the shoot was recorded */
  date: string;
  /** PlayFab ID of reporting player */
  playerId: string;
  /** Crew role performed */
  role: PlayerRole;
  /** Overall wrap score (0 - 100) */
  overallScore?: number | undefined;
  /** Pre-production phase score */
  preProductionScore?: number | undefined;
  /** Production shoot phase score */
  productionScore?: number | undefined;
  /** Post-production editing phase score */
  postProductionScore?: number | undefined;
  /** Letter grade assigned (e.g. "S", "A", "B", "C") */
  letterGrade: string;
  /** Competitive rank achieved */
  rank?: string | undefined;
  /** Shoot duration / runtime string (e.g. "04:15") */
  runtime: string;
  /** Count of retakes required */
  retakes: number;
  /** Count of errors flagged during wrap */
  errors: number;
  /** Budget spent on production */
  budgetUsed?: number | undefined;
  /** Budget surplus remaining */
  budgetRemaining?: number | undefined;
  /** Soft currency awarded */
  bCoinsEarned: number;
  /** Hard currency awarded */
  cCoinsEarned?: number | undefined;
  /** Client feedback note */
  feedback?: string | undefined;
  /** Whether production met success criteria */
  success: boolean;
  /** Key-value summary stats */
  stats?: [string, string][] | Array<{ label: string; value: string; type?: string }> | undefined;

  /** Legacy / mock compatibility aliases */
  id?: string | undefined;
  title?: string | undefined;
  client?: string | undefined;
  score?: number | undefined;
  rolePlayed?: string | undefined;
  completedAt?: string | undefined;
  details?: Record<string, unknown> | undefined;
}

/**
 * Aggregate performance statistics for a specific crew role.
 */
export interface RoleStatistics {
  /** Crew role */
  role: PlayerRole;
  /** Total completed productions in this role */
  productions?: number | undefined;
  /** Average wrap score across productions */
  averageScore: number;
  /** Best overall score recorded */
  bestScore?: number | undefined;
  /** Count of 100% or perfect scores */
  perfectScores: number;
  /** Total errors committed */
  errors?: number | undefined;
  /** Total retakes called */
  retakes?: number | undefined;
  /** Knowledge entries unlocked under this role's department */
  knowledgeUnlocked: number;

  /** Legacy / mock compatibility aliases */
  productionsPlayed?: number | undefined;
  highestScore?: number | undefined;
  totalErrors?: number | undefined;
  totalRetakes?: number | undefined;
  roleId?: string | undefined;
  level?: number | undefined;
  xp?: number | undefined;
  matchesPlayed?: number | undefined;
}

/**
 * Public leaderboard entry.
 */
export interface LeaderboardEntry {
  /** Player PlayFab ID */
  playFabId: string;
  /** Public display name */
  displayName: string;
  /** Leaderboard rank position (1-indexed or 0-indexed) */
  position: number;
  /** Statistic value (score, level, productions, etc.) */
  statValue: number;
  /** Optional player avatar URL */
  avatarUrl?: string | undefined;
}

/**
 * Friend connection details.
 */
export interface FriendInfo {
  /** Friend's PlayFab ID */
  playFabId: string;
  /** Friend's display name */
  displayName: string;
  /** Relationship status */
  status: FriendStatus;
  /** Primary crew role */
  role?: PlayerRole | undefined;
  /** Career level */
  level?: number | undefined;
  /** Avatar image URL */
  avatarUrl?: string | undefined;

  /** Legacy alias for playFabId */
  friendPlayFabId?: string | undefined;
  /** Legacy tags associated with friend */
  tags?: string[] | undefined;
}

/**
 * Transaction history ledger entry.
 */
export interface Transaction {
  /** Unique transaction identifier */
  id: string;
  /** Operation type */
  type: TransactionType;
  /** Currency amount transferred */
  amount: number;
  /** Currency type */
  currency: CurrencyType;
  /** Human-readable transaction description */
  description: string;
  /** ISO timestamp */
  timestamp?: string | undefined;
  /** Catalog item ID if related to a store purchase */
  itemId?: string | undefined;

  /** Legacy alias for timestamp */
  date?: string | undefined;
}

/**
 * In-game or portal notification for a player.
 */
export interface PlayerNotification {
  /** Unique notification identifier */
  id: string;
  /** Notification headline */
  title: string;
  /** Notification body message */
  body?: string | undefined;
  /** Notification category (e.g. "announcement", "achievement", "friend", "shop", "system") */
  kind?: string | undefined;
  /** Read/unread state */
  read: boolean;
  /** ISO timestamp */
  createdAt: string;
  /** In-app navigation link destination */
  href?: string | undefined;

  /** Legacy / mock compatibility aliases */
  message?: string | undefined;
  type?: string | undefined;
}

// ============================================================================
// Admin / Website Data
// ============================================================================

export type BugStatus = "New" | "Investigating" | "Resolved";
export type PlayerReportStatus = "New" | "Investigating" | "Resolved";

/**
 * Bug report submitted by a player.
 */
export interface BugReport {
  /** Unique report identifier (e.g. "BUG-2041", "BR-101") */
  id: string;
  /** Reporting player's display name */
  playerName?: string | undefined;
  /** Reporting player's ID / PlayFab ID */
  playerId?: string | undefined;
  /** Issue category (e.g. "Gameplay", "Audio", "Graphics / Visual") */
  category: string;
  /** Description of the defect and reproduction steps */
  description: string;
  /** Contact email supplied by player */
  email?: string | undefined;
  /** Name of attached file or screenshot */
  attachmentName?: string | undefined;
  /** URL to access uploaded attachment */
  attachmentUrl?: string | undefined;
  /** MIME type of attachment */
  attachmentType?: string | undefined;
  /** ISO timestamp of submission */
  submittedAt?: string | undefined;
  /** Admin triage status */
  status: ReportStatus | string;

  /** Legacy / mock compatibility aliases */
  reportedBy?: string | undefined;
  createdAt?: string | undefined;
}

/**
 * Player code-of-conduct violation report.
 */
export interface PlayerReport {
  /** Unique report identifier */
  id: string;
  /** Reporter display name */
  reporterName?: string | undefined;
  /** Reporter PlayFab ID */
  reporterId?: string | undefined;
  /** Username of accused player */
  reportedUsername?: string | undefined;
  /** Report category (e.g. "Trolling", "Verbal Abuse", "Other") */
  reportType?: string | undefined;
  /** Details describing the conduct */
  description: string;
  /** Name of evidence attachment */
  attachmentName?: string | undefined;
  /** Attachment access URL */
  attachmentUrl?: string | undefined;
  /** MIME type of attachment */
  attachmentType?: string | undefined;
  /** ISO timestamp of submission */
  submittedAt?: string | undefined;
  /** Admin triage status */
  status: ReportStatus | string;

  /** Legacy / mock compatibility aliases */
  reportedBy?: string | undefined;
  reportedPlayerId?: string | undefined;
  reason?: string | undefined;
  createdAt?: string | undefined;
}

/**
 * Brand partnership and sponsorship application.
 */
export interface PartnershipApplication {
  /** Unique application identifier (e.g. "APP-4821", "PA-301") */
  id: string;
  /** Brand or company name */
  brand?: string | undefined;
  /** Product category (e.g. "Camera Gear", "Food & Beverage", "Apparel") */
  productType?: string | undefined;
  /** Specific product model / SKU to showcase */
  exactModel?: string | undefined;
  /** Official brand or product URL */
  link?: string | undefined;
  /** Brand kit file name */
  fileName?: string | undefined;
  /** Attachment name */
  attachmentName?: string | undefined;
  /** Attachment download URL */
  attachmentUrl?: string | undefined;
  /** Attachment MIME type */
  attachmentType?: string | undefined;
  /** Proposed sponsorship budget amount */
  budget?: number | undefined;
  /** Duration quantity */
  duration?: number | undefined;
  /** Duration unit (e.g. "Days" | "Months") */
  durationUnit?: string | undefined;
  /** Contact email */
  email: string;
  /** Additional campaign details */
  description?: string | undefined;
  /** ISO timestamp of submission */
  submittedAt: string;
  /** Application review status */
  status: PartnershipStatus | string;
  /** Whether archived from active admin view */
  archived?: boolean | undefined;
  /** ISO timestamp when archived */
  archivedAt?: string | undefined;

  /** Legacy / mock compatibility aliases */
  name?: string | undefined;
  company?: string | undefined;
  proposal?: string | undefined;
}

/**
 * Administrator alert and notification.
 */
export interface AdminNotification {
  /** Unique alert identifier */
  id: string;
  /** Headline */
  title: string;
  /** Detail message */
  body?: string | undefined;
  /** Category (e.g. "player-report", "application", "system") */
  kind?: string | undefined;
  /** Direct link to admin console page */
  href?: string | undefined;
  /** Associated entity ID (bug ID, application ID, player ID) */
  entityId?: string | undefined;
  /** Type of associated entity */
  entityType?: string | undefined;
  /** Read state */
  read: boolean;
  /** ISO timestamp */
  createdAt: string;

  /** Legacy / mock compatibility aliases */
  message?: string | undefined;
  type?: string | undefined;
}

/**
 * In-game active advertisement placement.
 */
export interface AdEntry {
  /** Unique ad identifier */
  id: string;
  /** Sponsor brand name */
  brand?: string | undefined;
  /** Sponsored product */
  product?: string | undefined;
  /** Cumulative impression count */
  impressions: number;
  /** Total click interactions */
  clicks: number;
  /** Contract revenue generated */
  revenue?: number | undefined;
  /** ISO timestamp of placement campaign start */
  startDate?: string | undefined;
  /** ISO timestamp of campaign conclusion */
  endDate?: string | undefined;
  /** Operational status (e.g. "On-going", "Expiring", "Expired", "Done") */
  status?: string | undefined;
  /** Ad creative image asset URL */
  imageUrl?: string | undefined;
  /** In-game set location (e.g. "Studio B — craft table props") */
  placement?: string | undefined;

  /** Legacy / mock compatibility aliases */
  title?: string | undefined;
  linkUrl?: string | undefined;
  active?: boolean | undefined;
}

/**
 * Studio revenue log entry.
 */
export interface RevenueEntry {
  /** Unique entry identifier */
  id?: string | undefined;
  /** Revenue source name (e.g. "Sponsorship", "Coin Top-Ups", "Store", "cCoins") */
  source: string;
  /** Amount */
  amount: number;
  /** ISO timestamp of transaction */
  date: string;
  /** Accounting category */
  category?: string | undefined;
  /** Remarks */
  notes?: string | undefined;

  /** Legacy / mock compatibility aliases */
  currency?: string | undefined;
}

/**
 * Game client build record.
 */
export interface GameBuild {
  /** Unique build record identifier */
  id: string;
  /** Semantic version string (e.g. "0.9.4") */
  version: string;
  /** Target operating system platform (e.g. "Windows 10/11 64-bit") */
  platform: string;
  /** Deployment status (e.g. "Live", "Archived", "Testing", "Active") */
  status: string;
  /** ISO timestamp of release */
  releaseDate?: string | undefined;
  /** Install package file size string (e.g. "4.2 GB") */
  size?: string | undefined;
  /** Direct package download URL */
  downloadUrl?: string | undefined;
  /** Internal release notes */
  notes?: string | undefined;
  /** Player-facing changelog */
  changelog?: string | undefined;
  /** Legacy / compatibility properties */
  buildNumber?: string | number | undefined;
  minWindows?: string | undefined;
  releasedAt?: string | undefined;
  installerFileName?: string | undefined;
  releaseNotes?: string | undefined;
}

/**
 * Build deployment history archive entry.
 */
export interface BuildHistoryEntry {
  /** Unique history record identifier */
  id: string;
  /** Version number */
  version: string;
  /** ISO timestamp of build date */
  date?: string | undefined;
  /** Historical deployment status */
  status?: string | undefined;
  /** Build notes */
  notes?: string | undefined;

  /** Legacy / mock compatibility aliases */
  releaseDate?: string | undefined;
}

/**
 * Client hardware and software system requirement specification.
 */
export interface SystemRequirement {
  /** Unique requirement row identifier */
  id: string;
  /** Hardware/software component label (e.g. "OS", "Processor", "Graphics") */
  component: string;
  /** Minimum required hardware specification */
  minimum: string;
  /** Recommended hardware specification */
  recommended: string;
}

/**
 * Download wizard installation step.
 */
export interface InstallStep {
  /** Unique step identifier */
  id: string;
  /** Step order index (1-based) */
  step?: number | undefined;
  /** Step title */
  title: string;
  /** Step instructions */
  description: string;

  /** Legacy / mock compatibility aliases */
  order?: number | undefined;
}

/**
 * Official social media channel link.
 */
export interface SocialLink {
  /** Unique link identifier */
  id: string;
  /** Platform name (e.g. "YouTube", "Twitter", "Discord") */
  platform: string;
  /** Destination URL */
  url: string;
  /** Whether displayed in public footer */
  enabled?: boolean | undefined;

  /** Legacy / mock compatibility aliases */
  icon?: string | undefined;
  active?: boolean | undefined;
}

// ============================================================================
// Auth Session
// ============================================================================

/**
 * Authenticated session payload stored client-side.
 */
export interface SessionData {
  /** PlayFab unique user ID */
  playFabId: string;
  /** PlayFab client session authentication ticket */
  sessionTicket?: string | undefined;
  /** Authorized role tier */
  role: 'admin' | 'player' | 'developer';
  /** User's display name */
  displayName?: string | undefined;
  /** User's email */
  email?: string | undefined;
}

/**
 * Email/password credentials for authentication.
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Registration request payload.
 */
export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

/**
 * Authentication result response.
 */
export interface AuthResponse {
  success: boolean;
  error?: string | undefined;
  session?: SessionData | undefined;
  destination?: string | undefined;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Authentication and session service.
 */
export interface AuthService {
  login(req: LoginRequest): Promise<AuthResponse>;
  register(req: RegisterRequest): Promise<AuthResponse>;
  logout(): Promise<void>;
  getSession(): Promise<SessionData | null>;
  isAdmin(): Promise<boolean>;
}

/**
 * Player profile, progression, loadout, and social service.
 */
export interface PlayerService {
  getProfile(): Promise<PlayerProfile>;
  getProgression(): Promise<PlayerProgression>;
  getWallet(): Promise<PlayerWallet>;
  getInventory(): Promise<InventoryItem[]>;
  getLoadout(): Promise<Loadout>;
  getAchievements(): Promise<Achievement[]>;
  getKnowledge(): Promise<KnowledgeEntry[]>;
  getProductionLogs(): Promise<ProductionLog[]>;
  getTransactions(): Promise<Transaction[]>;
  getFriends(): Promise<FriendInfo[]>;
  getNotifications(): Promise<PlayerNotification[]>;
  updateProfile(updates: Partial<Pick<PlayerProfile, 'displayName' | 'username' | 'avatarUrl'>> | Partial<PlayerProfile>): Promise<PlayerProfile | void>;
  updateLoadout(loadout: Loadout | Partial<Loadout>): Promise<Loadout | void>;

  /** Optional convenience aliases */
  getKnowledgeBase?(): Promise<KnowledgeEntry[]>;
  getRoleStatistics?(): Promise<RoleStatistics[]>;
}

/**
 * Competitive leaderboard service.
 */
export interface LeaderboardService {
  getGlobal(statistic: string, maxResults?: number): Promise<LeaderboardEntry[]>;
  getAroundPlayer(statistic: string, maxResults?: number): Promise<LeaderboardEntry[]>;
}

/**
 * In-game catalog and coin purchase shop service.
 */
export interface ShopService {
  getCatalog(): Promise<InventoryItem[]>;
  purchaseItem(itemId: string, currency: CurrencyType, price: number): Promise<{ success: boolean; error?: string } | boolean>;
  purchaseItem(itemId: string, price: number, currency: CurrencyType): Promise<{ success: boolean; error?: string } | boolean>;
  purchaseCoinPack(packId: string): Promise<{ success: boolean; error?: string } | boolean>;
}

/**
 * Administrative console management and moderation service.
 */
export interface AdminService {
  getPlayers(): Promise<PlayerProfile[]>;
  getPlayer(playFabId: string): Promise<{
    profile: PlayerProfile;
    progression: PlayerProgression;
    wallet: PlayerWallet;
    inventory: InventoryItem[];
    achievements: Achievement[];
    statistics: RoleStatistics[];
  } | PlayerProfile | null>;
  getBugReports(): Promise<BugReport[]>;
  updateBugReport(id: string, updates: Partial<BugReport>): Promise<BugReport | void>;
  deleteBugReport(id: string): Promise<void>;
  deleteBugReports(ids: string[]): Promise<void>;
  getPlayerReports(): Promise<PlayerReport[]>;
  updatePlayerReport(id: string, updates: Partial<PlayerReport>): Promise<PlayerReport | void>;
  deletePlayerReport(id: string): Promise<void>;
  deletePlayerReports(ids: string[]): Promise<void>;
  getPartnerships(): Promise<PartnershipApplication[]>;
  updatePartnership(id: string, updates: Partial<PartnershipApplication>): Promise<PartnershipApplication | void>;
  deletePartnership(id: string): Promise<void>;
  deletePartnerships?(ids: string[]): Promise<void>;
  getAds(): Promise<AdEntry[]>;
  updateAd(id: string, updates: Partial<AdEntry>): Promise<AdEntry | void>;
  deleteAd(id: string): Promise<void>;
  deleteAds?(ids: string[]): Promise<void>;
  getRevenue(): Promise<RevenueEntry[]>;
  getGameBuilds(): Promise<GameBuild[]>;
  updateGameBuild(id: string, updates: Partial<GameBuild>): Promise<GameBuild | void>;
  getBuildHistory(): Promise<BuildHistoryEntry[]>;
  getSystemRequirements(): Promise<SystemRequirement[]>;
  updateSystemRequirements(reqs: SystemRequirement[]): Promise<void>;
  getInstallSteps(): Promise<InstallStep[]>;
  updateInstallSteps(steps: InstallStep[]): Promise<void>;
  getSocialLinks(): Promise<SocialLink[]>;
  updateSocialLinks(links: SocialLink[]): Promise<void>;
  getNotifications(): Promise<AdminNotification[]>;
  submitBugReport(report: Omit<BugReport, 'id' | 'submittedAt' | 'status'> | Omit<BugReport, 'id' | 'status' | 'createdAt'>): Promise<BugReport | void>;
  submitPlayerReport(report: Omit<PlayerReport, 'id' | 'submittedAt' | 'status'> | Omit<PlayerReport, 'id' | 'status' | 'createdAt'>): Promise<PlayerReport | void>;
  submitPartnership(app: Omit<PartnershipApplication, 'id' | 'submittedAt' | 'status' | 'archived' | 'archivedAt'> | Omit<PartnershipApplication, 'id' | 'status' | 'submittedAt'>): Promise<PartnershipApplication | void>;
}

/**
 * Unified PlayFab service interface aggregating all service domains.
 */
export interface PlayFabService {
  auth: AuthService;
  player: PlayerService;
  leaderboard: LeaderboardService;
  shop: ShopService;
  admin: AdminService;
}
