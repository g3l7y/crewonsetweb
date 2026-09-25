import type {
  PlayFabService,
  PlayerProfile,
  PlayerProgression,
  PlayerWallet,
  InventoryItem,
  Loadout,
  Achievement,
  KnowledgeEntry,
  ProductionLog,
  RoleStatistics,
  LeaderboardEntry,
  FriendInfo,
  Transaction,
  PlayerNotification,
  BugReport,
  PlayerReport,
  PartnershipApplication,
  AdminNotification,
  AdEntry,
  RevenueEntry,
  GameBuild,
  BuildHistoryEntry,
  SystemRequirement,
  InstallStep,
  SocialLink,
  SessionData,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  CurrencyType,
  ItemRarity,
} from './types';
import { cosmeticCatalog } from '@/lib/demo/portal-shop';
import { DEFAULT_PROFILE_PICTURE_URL } from '@/lib/profile-avatar';

// Helper for simulated delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(): Promise<void> {
  return delay(50 + Math.random() * 100);
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// In-memory mock session state
let mockSession: SessionData | null = {
  playFabId: 'MOCK-PLAYER-001',
  role: 'player',
  displayName: 'CAMERA_PRO',
  email: 'player@crewonset.com',
};

// ============================================================================
// Mock Seed Data
// ============================================================================

let MOCK_PLAYER_PROFILE: PlayerProfile = {
  playFabId: 'MOCK-PLAYER-001',
  email: 'player@crewonset.com',
  displayName: 'CAMERA_PRO',
  username: 'CAMERA_PRO',
  avatarUrl: DEFAULT_PROFILE_PICTURE_URL,
  primaryRole: 'cameraman',
  crewId: 'COS-2847-CP',
  joinedAt: '2025-03-14T08:00:00Z',
  lastLoginAt: new Date().toISOString(),
};

type StoredMockProfileMetadata = Pick<PlayerProfile, 'bio' | 'avatarUrl' | 'socialLinks' | 'showStatus' | 'profileVisibility' | 'showCrewActivity'>;
const MOCK_PROFILE_METADATA_KEY = 'cos.profile.metadata';

function getStoredMockProfileMetadata(): StoredMockProfileMetadata {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(MOCK_PROFILE_METADATA_KEY);
    if (!raw) return {};
    const metadata = JSON.parse(raw) as StoredMockProfileMetadata;
    return {
      ...(typeof metadata.bio === 'string' ? { bio: metadata.bio } : {}),
      ...(typeof metadata.avatarUrl === 'string' ? { avatarUrl: metadata.avatarUrl } : {}),
      ...(metadata.socialLinks ? { socialLinks: metadata.socialLinks } : {}),
      ...(typeof metadata.showStatus === 'boolean' ? { showStatus: metadata.showStatus } : {}),
      ...(typeof metadata.profileVisibility === 'boolean' ? { profileVisibility: metadata.profileVisibility } : {}),
      ...(typeof metadata.showCrewActivity === 'boolean' ? { showCrewActivity: metadata.showCrewActivity } : {}),
    };
  } catch {
    return {};
  }
}

function persistMockProfileMetadata(metadata: StoredMockProfileMetadata) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MOCK_PROFILE_METADATA_KEY, JSON.stringify(metadata));
}
function getStoredMockProfileAccount(): { username: string; email: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('cos.profile.account');
    if (!raw) return null;
    const account = JSON.parse(raw) as Partial<{ username: string; email: string }>;
    if (!account.username) return null;
    return {
      username: account.username,
      email: account.email ?? '',
    };
  } catch {
    return null;
  }
}

const MOCK_PROGRESSION: PlayerProgression = {
  level: 27,
  currentXp: 6820,
  xpToNextLevel: 10000,
  totalXp: 276820,
  highestLevelUnlocked: 4,
  completedLevels: ['crystal_blooms', 'goke_cola', 'lambormini'],
  completedStages: {
    crystal_blooms: ['pre', 'production', 'post'],
    goke_cola: ['pre', 'production', 'post'],
    lambormini: ['pre', 'production'],
  },
  tutorialProgress: 100,
  tutorialsCompleted: true,
  campaignCompleted: false,
  multiplayerUnlocked: true,
};

const MOCK_WALLET: PlayerWallet = {
  bCoins: 45000,
  cCoins: 12500,
};

const MOCK_INVENTORY: InventoryItem[] = [
  { itemId: 'cos-classic-vest', displayName: 'Classic Crew Vest', category: 'costumes', rarity: 'common', quantity: 1, acquiredAt: '2025-03-14T08:15:00Z' },
  { itemId: 'cos-director-beret', displayName: "Director's Beret", category: 'costumes', rarity: 'rare', quantity: 1, acquiredAt: '2025-04-02T14:30:00Z' },
  { itemId: 'cos-golden-clapper', displayName: 'Golden Clapper Board', category: 'decorators', rarity: 'epic', quantity: 1, acquiredAt: '2025-05-10T11:20:00Z' },
  { itemId: 'cos-neon-headset', displayName: 'Neon Studio Headset', category: 'equipment', rarity: 'uncommon', quantity: 1, acquiredAt: '2025-03-20T09:45:00Z' },
  { itemId: 'cos-vintage-lens', displayName: 'Vintage Anamorphic Lens', category: 'equipment', rarity: 'rare', quantity: 1, acquiredAt: '2025-06-15T16:10:00Z' },
  { itemId: 'cos-studio-boots', displayName: 'Studio Floor Boots', category: 'costumes', rarity: 'common', quantity: 1, acquiredAt: '2025-03-14T08:15:00Z' },
  { itemId: 'cos-star-badge', displayName: 'Star Producer Badge', category: 'decorators', rarity: 'legendary', quantity: 1, acquiredAt: '2025-07-01T10:00:00Z' },
  { itemId: 'cos-camo-wrap', displayName: 'Camera Camo Wrap', category: 'equipment', rarity: 'uncommon', quantity: 1, acquiredAt: '2025-04-18T13:25:00Z' },
];

let MOCK_LOADOUT: Loadout = {
  Hair: 'hair-soft-crop',
  Tops: 'top-coral-tee',
  ShoeWear: 'shoe-studio-boots',
  Accessories: 'glasses-round-ink',
};

const MOCK_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_wrap', title: 'First Wrap!', description: 'Complete your first production.', unlocked: true, progress: 1, maxProgress: 1, unlockedAt: '2025-03-15T18:00:00Z' },
  { id: 'five_star_director', title: 'Five Star Director', description: 'Earn a perfect score as Director.', unlocked: true, progress: 1, maxProgress: 1, unlockedAt: '2025-05-20T20:30:00Z' },
  { id: 'lighting_master', title: 'Lighting Master', description: 'Complete 10 productions as AV Technician.', unlocked: false, progress: 6, maxProgress: 10 },
  { id: 'camera_pro', title: 'Camera Pro', description: 'Achieve 95%+ focus accuracy in 5 productions.', unlocked: true, progress: 5, maxProgress: 5, unlockedAt: '2025-06-10T14:15:00Z' },
  { id: 'budget_hawk', title: 'Budget Hawk', description: 'Complete a production under budget 3 times.', unlocked: true, progress: 3, maxProgress: 3, unlockedAt: '2025-07-02T09:45:00Z' },
  { id: 'team_player', title: 'Team Player', description: 'Complete 5 multiplayer productions.', unlocked: false, progress: 2, maxProgress: 5 },
  { id: 'knowledge_seeker', title: 'Knowledge Seeker', description: 'Unlock 15 knowledge entries.', unlocked: true, progress: 15, maxProgress: 15, unlockedAt: '2025-08-01T11:20:00Z' },
  { id: 'speed_demon', title: 'Speed Demon', description: 'Complete a production in under 30 minutes.', unlocked: true, progress: 1, maxProgress: 1, unlockedAt: '2025-04-28T16:50:00Z' },
];

const MOCK_KNOWLEDGE: KnowledgeEntry[] = [
  { id: 'rule_of_thirds', title: 'Rule of Thirds', category: 'cinematography', content: 'A fundamental composition technique where the frame is divided into a 3x3 grid.', unlocked: true, unlockedAt: '2025-03-15T10:00:00Z' },
  { id: 'three_point_lighting', title: 'Three-Point Lighting', category: 'lighting', content: 'The standard method of lighting using a key light, fill light, and back light.', unlocked: true, unlockedAt: '2025-03-16T11:00:00Z' },
  { id: 'director_tablet', title: "Director's Tablet", category: 'equipment', content: 'The primary tool for managing set operations, reviewing takes, and adjusting budgets on the fly.', unlocked: true, unlockedAt: '2025-03-17T12:00:00Z' },
  { id: 'led_panel', title: 'LED Panel Lighting', category: 'lighting', content: 'Versatile continuous lighting fixtures with adjustable color temperature and intensity.', unlocked: true, unlockedAt: '2025-03-18T13:00:00Z' },
  { id: 'nony_fx_camera', title: 'Nony FX Cinema Camera', category: 'equipment', content: 'A high-end digital cinema camera known for robust color science.', unlocked: true, unlockedAt: '2025-03-19T14:00:00Z' },
  { id: 'sd_card', title: 'Media Management', category: 'workflow', content: 'The critical process of organizing and backing up digital media files.', unlocked: true, unlockedAt: '2025-03-20T15:00:00Z' },
  { id: 'level_2_camera', title: 'Advanced Camera Support', category: 'equipment', content: 'Utilizing gimbals and steadicams to stabilize dynamic shots.', unlocked: true, unlockedAt: '2025-04-05T09:00:00Z' },
  { id: 'level_3_soft_light', title: 'Soft Lighting Techniques', category: 'lighting', content: 'Using diffusion materials to create flattering, wrap-around lighting on subjects.', unlocked: true, unlockedAt: '2025-04-10T10:30:00Z' },
  { id: 'level_1_workflow', title: 'Basic On-Set Protocol', category: 'workflow', content: 'Understanding the hierarchy and communication flow on a professional film set.', unlocked: true, unlockedAt: '2025-04-15T11:45:00Z' },
  { id: 'contracts_and_guides', title: 'Production Paperwork', category: 'production', content: 'Managing essential legal documents including location agreements and releases.', unlocked: true, unlockedAt: '2025-05-01T14:20:00Z' },
  { id: 'set_building', title: 'Art Direction Basics', category: 'production', content: 'Collaborating with the art department to build believable environments.', unlocked: true, unlockedAt: '2025-05-15T16:10:00Z' },
  { id: 'recording_workflow', title: 'Dual-System Audio', category: 'workflow', content: 'Recording audio on a dedicated device separate from the camera for higher quality sound.', unlocked: true, unlockedAt: '2025-06-02T13:15:00Z' },
  { id: 'automotive_staging', title: 'Automotive Rigging', category: 'cinematography', content: 'Specialized techniques for safely mounting cameras to vehicles for dynamic driving shots.', unlocked: true, unlockedAt: '2025-06-20T10:45:00Z' },
  { id: 'soft_light_technique', title: 'Book Lighting', category: 'lighting', content: 'Bouncing a light source off a reflector and through diffusion for an ultra-soft effect.', unlocked: true, unlockedAt: '2025-07-10T15:30:00Z' },
  { id: 'hiring_and_posing_actors', title: 'Working with Talent', category: 'production', content: 'Effective communication strategies for directors to elicit authentic performances.', unlocked: true, unlockedAt: '2025-07-25T11:00:00Z' },
  { id: 'shot_coverage', title: 'Master Scene Technique', category: 'cinematography', content: 'Shooting a scene starting with a wide master shot, followed by tighter coverage.', unlocked: false },
  { id: 'screen_continuity', title: 'The 180-Degree Rule', category: 'cinematography', content: 'Maintaining spatial relationships between characters by keeping camera on one side of an axis.', unlocked: false },
  { id: 'motivated_lighting', title: 'Motivated Lighting', category: 'lighting', content: 'Designing lighting that logically appears to come from practical sources in scene.', unlocked: false },
  { id: 'lifestyle_staging', title: 'Lifestyle Art Direction', category: 'production', content: 'Creating authentic, lived-in sets that reflect the brand demographic.', unlocked: false },
  { id: 'warm_commercial_grade', title: 'Color Grading: Commercial', category: 'post-production', content: 'Applying warm, inviting color palettes used in lifestyle and food commercials.', unlocked: false },
  { id: 'creative_brief', title: 'The Creative Brief', category: 'workflow', content: 'The foundational document that outlines project goals and deliverables.', unlocked: false },
  { id: 'visual_hierarchy', title: 'Visual Hierarchy', category: 'cinematography', content: "Using lighting, focus, and framing to direct the viewer's eye to key elements.", unlocked: false },
  { id: 'quality_control', title: 'Broadcast QC', category: 'post-production', content: 'Technical checks to ensure deliverables meet broadcast standards.', unlocked: false },
];

const MOCK_PRODUCTION_LOGS: ProductionLog[] = [
  {
    productionId: 'PRD-2291',
    clientName: 'Cafe Kalye',
    level: 1,
    mode: 'solo',
    playerId: 'MOCK-PLAYER-001',
    role: 'cameraman',
    date: '2026-08-26T00:00:00Z',
    overallScore: 98,
    letterGrade: 'S',
    rank: 'S',
    runtime: '42m 10s',
    retakes: 0,
    errors: 0,
    bCoinsEarned: 1500,
    success: true,
    feedback: 'Single-location commercial shot handheld at first light. Client approved first cut with zero retakes.',
    stats: [
      ['Shots', '24'],
      ['Retakes', '0'],
      ['Focus Accuracy', '99%'],
      ['Client Rating', '5.0'],
    ],
  },
  {
    productionId: 'PRD-2287',
    clientName: 'Vantage Apparel',
    level: 2,
    mode: 'solo',
    playerId: 'MOCK-PLAYER-001',
    role: 'cameraman',
    date: '2026-08-22T00:00:00Z',
    overallScore: 94,
    letterGrade: 'A',
    rank: 'A',
    runtime: '1h 04m',
    retakes: 1,
    errors: 0,
    bCoinsEarned: 1200,
    success: true,
    feedback: 'Tracking shots along the backlot. Delivered on schedule with high focus accuracy.',
    stats: [
      ['Shots', '31'],
      ['Retakes', '1'],
      ['Focus Accuracy', '94%'],
      ['Client Rating', '4.6'],
    ],
  },
  {
    productionId: 'PRD-2280',
    clientName: 'Bolt Energy',
    level: 3,
    mode: 'solo',
    playerId: 'MOCK-PLAYER-001',
    role: 'av_technician',
    date: '2026-08-17T00:00:00Z',
    overallScore: 88,
    letterGrade: 'B',
    rank: 'B',
    runtime: '58m 32s',
    retakes: 2,
    errors: 2,
    bCoinsEarned: 950,
    success: true,
    feedback: 'Night exterior on studio court. Practicals balanced after adjustment pass.',
    stats: [
      ['Shots', '19'],
      ['Retakes', '2'],
      ['Audio Clipping', '2 takes'],
      ['Client Rating', '4.2'],
    ],
  },
  {
    productionId: 'PRD-2274',
    clientName: 'Skyfare Airlines',
    level: 4,
    mode: 'solo',
    playerId: 'MOCK-PLAYER-001',
    role: 'director',
    date: '2026-08-11T00:00:00Z',
    overallScore: 91,
    letterGrade: 'A',
    rank: 'A',
    runtime: '1h 27m',
    retakes: 3,
    errors: 1,
    bCoinsEarned: 1400,
    success: true,
    feedback: 'Multi-set promo covering check-in, cabin and arrival. Directed four-person crew.',
    stats: [
      ['Shots', '44'],
      ['Retakes', '3'],
      ['Crew Size', '4'],
      ['Client Rating', '4.8'],
    ],
  },
  {
    productionId: 'PRD-2268',
    clientName: 'Northline Optics',
    level: 2,
    mode: 'solo',
    playerId: 'MOCK-PLAYER-001',
    role: 'editor',
    date: '2026-08-04T00:00:00Z',
    overallScore: 96,
    letterGrade: 'S',
    rank: 'S',
    runtime: '36m 55s',
    retakes: 0,
    errors: 0,
    bCoinsEarned: 1350,
    success: true,
    feedback: 'Product feature cut from two camera angles. Approved without notes.',
    stats: [
      ['Shots', '17'],
      ['Retakes', '0'],
      ['Sync Errors', '0'],
      ['Client Rating', '4.9'],
    ],
  },
  {
    productionId: 'PRD-2259',
    clientName: 'Cafe Kalye',
    level: 1,
    mode: 'solo',
    playerId: 'MOCK-PLAYER-001',
    role: 'cameraman',
    date: '2026-07-29T00:00:00Z',
    overallScore: 84,
    letterGrade: 'B',
    rank: 'B',
    runtime: '51m 08s',
    retakes: 2,
    errors: 1,
    bCoinsEarned: 800,
    success: true,
    feedback: 'Fast turnaround spot with limited coverage.',
    stats: [
      ['Shots', '22'],
      ['Retakes', '2'],
      ['Focus Accuracy', '88%'],
      ['Client Rating', '4.0'],
    ],
  },
  {
    productionId: 'PRD-2251',
    clientName: 'Vantage Apparel',
    level: 3,
    mode: 'solo',
    playerId: 'MOCK-PLAYER-001',
    role: 'av_technician',
    date: '2026-07-21T00:00:00Z',
    overallScore: 90,
    letterGrade: 'A',
    rank: 'A',
    runtime: '1h 12m',
    retakes: 1,
    errors: 0,
    bCoinsEarned: 1100,
    success: true,
    feedback: 'Lighting-led session with rapid wardrobe changes.',
    stats: [
      ['Looks', '12'],
      ['Retakes', '1'],
      ['Setup Time', '18m'],
      ['Client Rating', '4.7'],
    ],
  },
  {
    productionId: 'PRD-2244',
    clientName: 'Bolt Energy',
    level: 3,
    mode: 'solo',
    playerId: 'MOCK-PLAYER-001',
    role: 'director',
    date: '2026-07-14T00:00:00Z',
    overallScore: 79,
    letterGrade: 'C',
    rank: 'C',
    runtime: '1h 33m',
    retakes: 5,
    errors: 3,
    bCoinsEarned: 600,
    success: true,
    feedback: 'Backlot reveal that ran long.',
    stats: [
      ['Shots', '28'],
      ['Retakes', '5'],
      ['Overtime', '22m'],
      ['Client Rating', '3.6'],
    ],
  },
  {
    productionId: 'PRD-2236',
    clientName: 'Skyfare Airlines',
    level: 4,
    mode: 'solo',
    playerId: 'MOCK-PLAYER-001',
    role: 'editor',
    date: '2026-07-06T00:00:00Z',
    overallScore: 93,
    letterGrade: 'A',
    rank: 'A',
    runtime: '44m 21s',
    retakes: 1,
    errors: 1,
    bCoinsEarned: 1150,
    success: true,
    feedback: 'Assembly cut of cabin inserts with on-screen callouts.',
    stats: [
      ['Shots', '20'],
      ['Retakes', '1'],
      ['Sync Errors', '1'],
      ['Client Rating', '4.6'],
    ],
  },
  {
    productionId: 'PRD-2228',
    clientName: 'Cafe Kalye',
    level: 1,
    mode: 'solo',
    playerId: 'MOCK-PLAYER-001',
    role: 'cameraman',
    date: '2026-06-28T00:00:00Z',
    overallScore: 97,
    letterGrade: 'S',
    rank: 'S',
    runtime: '39m 44s',
    retakes: 0,
    errors: 0,
    bCoinsEarned: 1450,
    success: true,
    feedback: 'Portrait series shot on long glass with shallow depth.',
    stats: [
      ['Shots', '18'],
      ['Retakes', '0'],
      ['Focus Accuracy', '100%'],
      ['Client Rating', '5.0'],
    ],
  },
  {
    productionId: 'PRD-2219',
    clientName: 'Crew On Set! Studios',
    level: 1,
    mode: 'solo',
    playerId: 'MOCK-PLAYER-001',
    role: 'av_technician',
    date: '2026-06-19T00:00:00Z',
    overallScore: 86,
    letterGrade: 'B',
    rank: 'B',
    runtime: '1h 02m',
    retakes: 2,
    errors: 2,
    bCoinsEarned: 900,
    success: true,
    feedback: 'Internal training reel demonstrating rig safety.',
    stats: [
      ['Shots', '26'],
      ['Retakes', '2'],
      ['Audio Passes', '2'],
      ['Client Rating', '4.3'],
    ],
  },
];

const MOCK_ROLE_STATISTICS: RoleStatistics[] = [
  { role: 'director', productions: 12, averageScore: 85, bestScore: 91, perfectScores: 0, errors: 8, retakes: 8, knowledgeUnlocked: 5 },
  { role: 'cameraman', productions: 24, averageScore: 93, bestScore: 98, perfectScores: 3, errors: 4, retakes: 3, knowledgeUnlocked: 8 },
  { role: 'av_technician', productions: 15, averageScore: 88, bestScore: 90, perfectScores: 0, errors: 7, retakes: 5, knowledgeUnlocked: 5 },
  { role: 'editor', productions: 8, averageScore: 91, bestScore: 96, perfectScores: 1, errors: 2, retakes: 1, knowledgeUnlocked: 5 },
];

const MOCK_LEADERBOARDS: LeaderboardEntry[] = [
  { playFabId: 'PF-002', displayName: 'DIRECTOR_X', position: 1, statValue: 312450, avatarUrl: DEFAULT_PROFILE_PICTURE_URL },
  { playFabId: 'MOCK-PLAYER-001', displayName: 'CAMERA_PRO', position: 2, statValue: 276820, avatarUrl: DEFAULT_PROFILE_PICTURE_URL },
  { playFabId: 'PF-003', displayName: 'LIGHT_MASTER', position: 3, statValue: 245600, avatarUrl: DEFAULT_PROFILE_PICTURE_URL },
  { playFabId: 'PF-004', displayName: 'EDIT_KING', position: 4, statValue: 198300, avatarUrl: DEFAULT_PROFILE_PICTURE_URL },
  { playFabId: 'PF-005', displayName: 'SCENE_SETTER', position: 5, statValue: 187650, avatarUrl: DEFAULT_PROFILE_PICTURE_URL },
  { playFabId: 'PF-006', displayName: 'FOCUS_PULLER', position: 6, statValue: 176200, avatarUrl: DEFAULT_PROFILE_PICTURE_URL },
  { playFabId: 'PF-007', displayName: 'BOOM_OPERATOR', position: 7, statValue: 165800, avatarUrl: DEFAULT_PROFILE_PICTURE_URL },
  { playFabId: 'PF-008', displayName: 'GRIP_MASTER', position: 8, statValue: 154300, avatarUrl: DEFAULT_PROFILE_PICTURE_URL },
  { playFabId: 'PF-009', displayName: 'SLATE_RUNNER', position: 9, statValue: 143900, avatarUrl: DEFAULT_PROFILE_PICTURE_URL },
  { playFabId: 'PF-010', displayName: 'DOLLY_GRIP', position: 10, statValue: 132500, avatarUrl: DEFAULT_PROFILE_PICTURE_URL },
];

const MOCK_FRIENDS: FriendInfo[] = [
  { playFabId: 'PF-002', displayName: 'DIRECTOR_X', status: 'confirmed', role: 'director', level: 31 },
  { playFabId: 'PF-003', displayName: 'LIGHT_MASTER', status: 'confirmed', role: 'av_technician', level: 24 },
  { playFabId: 'PF-004', displayName: 'EDIT_KING', status: 'confirmed', role: 'editor', level: 19 },
  { playFabId: 'PF-005', displayName: 'SCENE_SETTER', status: 'confirmed', role: 'director', level: 22 },
  { playFabId: 'PF-006', displayName: 'FOCUS_PULLER', status: 'confirmed', role: 'cameraman', level: 17 },
  { playFabId: 'PF-007', displayName: 'BOOM_OPERATOR', status: 'confirmed', role: 'av_technician', level: 15 },
  { playFabId: 'PF-008', displayName: 'GRIP_MASTER', status: 'confirmed', role: 'cameraman', level: 13 },
  { playFabId: 'PF-009', displayName: 'SLATE_RUNNER', status: 'confirmed', role: 'editor', level: 11 },
  { playFabId: 'PF-010', displayName: 'DOLLY_GRIP', status: 'pending_incoming', role: 'cameraman', level: 9 },
  { playFabId: 'PF-011', displayName: 'NEW_RECRUIT_1', status: 'pending_incoming', role: 'director', level: 3 },
  { playFabId: 'PF-012', displayName: 'NEW_RECRUIT_2', status: 'pending_incoming', role: 'av_technician', level: 5 },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tx-001', type: 'earn', amount: 1500, currency: 'bCoins', description: 'Production payout: Kalye Cold Brew', timestamp: '2026-08-26T00:10:00Z' },
  { id: 'tx-002', type: 'spend', amount: 800, currency: 'cCoins', description: 'Purchased Cameraman Gloves', timestamp: '2026-08-25T14:20:00Z', itemId: 'cos-cameraman-gloves' },
  { id: 'tx-003', type: 'earn', amount: 1200, currency: 'bCoins', description: 'Production payout: Vantage Crew Jacket', timestamp: '2026-08-22T00:15:00Z' },
  { id: 'tx-004', type: 'purchase', amount: 5000, currency: 'cCoins', description: 'C-Coin Package Purchase (PHP 299)', timestamp: '2026-08-20T10:00:00Z' },
  { id: 'tx-005', type: 'spend', amount: 1800, currency: 'cCoins', description: "Purchased Director's Beret", timestamp: '2026-08-18T19:30:00Z', itemId: 'cos-director-beret' },
];

const MOCK_NOTIFICATIONS: PlayerNotification[] = [
  { id: 'ntf-1', title: 'Achievement Unlocked', body: 'You unlocked "Camera Pro"!', kind: 'achievement', read: false, createdAt: '2026-08-26T12:00:00Z', href: '/portal/almanac' },
  { id: 'ntf-2', title: 'Friend Request', body: 'DOLLY_GRIP sent you a friend request.', kind: 'friend', read: false, createdAt: '2026-08-25T16:40:00Z', href: '/portal/friends' },
  { id: 'ntf-3', title: 'Daily Login Reward', body: 'Claimed 500 B-Coins daily reward.', kind: 'reward', read: true, createdAt: '2026-08-25T08:00:00Z' },
];

// Admin Mock Seeds
let MOCK_BUG_REPORTS: BugReport[] = [
  { id: 'BR-001', playerName: 'CAMERA_PRO', playerId: 'COS-2847-CP', category: 'Camera/Rigging', description: 'Gimbal axis slips when rotating beyond 90 degrees.', email: 'player@crewonset.com', submittedAt: '2026-08-25T10:00:00Z', status: 'New' },
  { id: 'BR-002', playerName: 'LIGHT_MASTER', playerId: 'COS-1044-LM', category: 'Lighting/FX', description: 'HMI lighting fixture shadow artifacting on cyc wall.', email: 'light@crewonset.com', submittedAt: '2026-08-24T14:20:00Z', status: 'Investigating' },
  { id: 'BR-003', playerName: 'EDIT_KING', playerId: 'COS-3321-EK', category: 'Audio/Sync', description: 'WAV timeline export clipping by 1 frame.', email: 'edit@crewonset.com', submittedAt: '2026-08-20T09:15:00Z', status: 'Resolved' },
];

let MOCK_PLAYER_REPORTS: PlayerReport[] = [
  { id: 'PR-001', reporterName: 'CAMERA_PRO', reporterId: 'COS-2847-CP', reportedUsername: 'TROLL_USER', reportType: 'Griefing', description: 'Blocking camera frame intentionally during take 3.', submittedAt: '2026-08-26T11:00:00Z', status: 'New' },
  { id: 'PR-002', reporterName: 'DIRECTOR_X', reporterId: 'COS-0002-DX', reportedUsername: 'AFK_CREW', reportType: 'Inactivity', description: 'Left headset on without responding during stage 2.', submittedAt: '2026-08-23T15:30:00Z', status: 'Investigating' },
];

let MOCK_PARTNERSHIPS: PartnershipApplication[] = [
  { id: 'PA-001', brand: 'Cafe Kalye', productType: 'Beverage', exactModel: 'Cold Brew Can 250ml', budget: 50000, duration: 3, durationUnit: 'months', email: 'sponsor@cafekalye.ph', description: 'In-game prop placement in commercial level 1.', submittedAt: '2026-08-20T10:00:00Z', status: 'Approved', archived: false },
  { id: 'PA-002', brand: 'Vantage Apparel', productType: 'Costume', exactModel: 'Vantage Crew Jacket 2026', budget: 75000, duration: 6, durationUnit: 'months', email: 'partner@vantage.ph', description: 'Custom branded costume unlockable for high rank crew.', submittedAt: '2026-08-22T14:00:00Z', status: 'On-going', archived: false },
  { id: 'PA-003', brand: 'Northline Optics', productType: 'Equipment', exactModel: 'NL-70 Prime Lens', budget: 100000, duration: 12, durationUnit: 'months', email: 'collab@northline.com', description: 'Featured cinema lens in equipment shop.', submittedAt: '2026-08-25T16:00:00Z', status: 'Pending', archived: false },
];

let MOCK_ADS: AdEntry[] = [
  { id: 'AD-001', brand: 'Cafe Kalye', product: 'Morning Roast Promo', impressions: 45200, clicks: 3820, revenue: 15400, startDate: '2026-08-01', status: 'Active' },
  { id: 'AD-002', brand: 'Vantage Apparel', product: 'Backlot Lookbook', impressions: 32100, clicks: 2940, revenue: 11800, startDate: '2026-08-10', status: 'Active' },
];

const MOCK_REVENUE: RevenueEntry[] = [
  { id: 'REV-001', source: 'C-Coin Microtransactions', amount: 84500, date: '2026-08-01' },
  { id: 'REV-002', source: 'Brand Partnerships', amount: 125000, date: '2026-08-15' },
  { id: 'REV-003', source: 'In-Game Ad Displays', amount: 27200, date: '2026-08-20' },
];

const MOCK_GAME_BUILDS: GameBuild[] = [
  { id: 'build-001', version: '0.9.2-beta', platform: 'Windows', status: 'Active', releaseDate: '2026-08-15T00:00:00Z', size: '2.4 GB', downloadUrl: 'https://downloads.crewonset.com/CrewOnSet-v0.9.2-beta.zip', notes: 'Latest stable beta build with level 4 optimizations.', changelog: 'Fixed audio clip timing; added 4K texture support.' },
  { id: 'build-002', version: '0.9.1-beta', platform: 'Windows', status: 'Archived', releaseDate: '2026-07-20T00:00:00Z', size: '2.3 GB', downloadUrl: '#', notes: 'Previous release.' },
];

const MOCK_BUILD_HISTORY: BuildHistoryEntry[] = [
  { id: 'BH-001', version: '0.9.2-beta', date: '2026-08-15T00:00:00Z', status: 'Active', notes: 'Public beta release' },
  { id: 'BH-002', version: '0.9.1-beta', date: '2026-07-20T00:00:00Z', status: 'Archived', notes: 'Hotfix build' },
  { id: 'BH-003', version: '0.9.0-alpha', date: '2026-06-10T00:00:00Z', status: 'Archived', notes: 'Initial alpha testing' },
];

let MOCK_SYSTEM_REQS: SystemRequirement[] = [
  { id: 'sr-1', component: 'Operating System', minimum: 'Windows 10 64-bit', recommended: 'Windows 11 64-bit' },
  { id: 'sr-2', component: 'Processor', minimum: 'Intel Core i5-8400 / AMD Ryzen 5 2600', recommended: 'Intel Core i7-10700 / AMD Ryzen 7 3700X' },
  { id: 'sr-3', component: 'Memory', minimum: '8 GB RAM', recommended: '16 GB RAM' },
  { id: 'sr-4', component: 'Graphics', minimum: 'NVIDIA GTX 1060 6GB / AMD RX 580', recommended: 'NVIDIA RTX 3060 12GB / AMD RX 6700 XT' },
  { id: 'sr-5', component: 'DirectX', minimum: 'Version 11', recommended: 'Version 12' },
  { id: 'sr-6', component: 'Storage', minimum: '10 GB available space (SSD required)', recommended: '15 GB available space (NVMe SSD)' },
];

let MOCK_INSTALL_STEPS: InstallStep[] = [
  { id: 'is-1', step: 1, title: 'Download Installer', description: 'Download the latest Crew On Set client installer from the portal.' },
  { id: 'is-2', step: 2, title: 'Run Setup', description: 'Execute the setup wizard and choose your target installation drive.' },
  { id: 'is-3', step: 3, title: 'Sign In', description: 'Launch the game and sign in using your Crew On Set credentials.' },
  { id: 'is-4', step: 4, title: 'Step On Set', description: 'Complete the studio orientation tutorial to unlock multiplayer mode.' },
];

let MOCK_SOCIAL_LINKS: SocialLink[] = [
  { id: 'soc-fb', platform: 'Facebook', url: 'https://facebook.com/crewonset', enabled: true },
  { id: 'soc-tw', platform: 'Twitter', url: 'https://twitter.com/crewonset', enabled: true },
  { id: 'soc-dc', platform: 'Discord', url: 'https://discord.gg/crewonset', enabled: true },
  { id: 'soc-yt', platform: 'YouTube', url: 'https://youtube.com/crewonset', enabled: true },
];

const MOCK_ADMIN_NOTIFS: AdminNotification[] = [
  { id: 'an-1', title: 'New Partnership Submitted', body: 'Northline Optics submitted an equipment partnership application.', kind: 'partnership', href: '/admin/partnerships', read: false, createdAt: '2026-08-25T16:00:00Z' },
  { id: 'an-2', title: 'New Bug Report', body: 'BR-001: Gimbal axis slips in camera mode.', kind: 'bug-report', href: '/admin/bugs', read: false, createdAt: '2026-08-25T10:00:00Z' },
  { id: 'an-3', title: 'Build 0.9.2-beta Live', body: 'Game build 0.9.2-beta has been published.', kind: 'build', href: '/admin/game', read: true, createdAt: '2026-08-15T01:00:00Z' },
];

const MOCK_SHOP_CATALOG: InventoryItem[] = cosmeticCatalog.map((item) => ({
  itemId: item.id,
  displayName: item.name,
  category: item.category,
  rarity: item.rarity.toLowerCase() as ItemRarity,
  price: item.price,
  currency: 'cCoins',
  quantity: 1,
  acquiredAt: '',
  description: item.description,
  customData: { assetKey: item.assetKey, priceCoins: String(item.price), currency: 'cCoins' },
}));
// ============================================================================
// Service Factory
// ============================================================================

export function createMockService(): PlayFabService {
  return {
    auth: {
      async login({ email, password }: LoginRequest): Promise<AuthResponse> {
        await randomDelay();
        if (email === 'admin@crewonset.com' && password === 'admin') {
          mockSession = {
            playFabId: 'MOCK-ADMIN-001',
            role: 'admin',
            displayName: 'ADMIN',
            email: 'admin@crewonset.com',
          };
          return { success: true, destination: '/admin', session: mockSession };
        }
        if (email === 'player@crewonset.com' && password === 'player') {
          mockSession = {
            playFabId: 'MOCK-PLAYER-001',
            role: 'player',
            displayName: 'CAMERA_PRO',
            email: 'player@crewonset.com',
          };
          return { success: true, destination: '/portal', session: mockSession };
        }
        // General demo fallback
        mockSession = {
          playFabId: 'MOCK-PLAYER-001',
          role: 'player',
          displayName: (email.split('@')[0] ?? 'PLAYER').toUpperCase(),
          email,
        };
        return { success: true, destination: '/portal', session: mockSession };
      },
      async register({ email, username }: RegisterRequest): Promise<AuthResponse> {
        await randomDelay();
        mockSession = {
          playFabId: uid('PF'),
          role: 'player',
          displayName: username || (email.split('@')[0] ?? 'PLAYER').toUpperCase(),
          email,
        };
        return { success: true, destination: '/portal', session: mockSession };
      },
      async logout(): Promise<void> {
        await randomDelay();
        mockSession = null;
      },
      async getSession(): Promise<SessionData | null> {
        await randomDelay();
        return mockSession;
      },
      async isAdmin(): Promise<boolean> {
        await randomDelay();
        return mockSession?.role === 'admin';
      },
    },

    player: {
      async getProfile(): Promise<PlayerProfile> {
        await randomDelay();
        const account = getStoredMockProfileAccount();
        const metadata = getStoredMockProfileMetadata();
        return {
          ...MOCK_PLAYER_PROFILE,
          ...metadata,
          ...(account ? {
            displayName: account.username,
            username: account.username,
            email: account.email || MOCK_PLAYER_PROFILE.email,
          } : {}),
        };
      },
      async getProgression(): Promise<PlayerProgression> {
        await randomDelay();
        return { ...MOCK_PROGRESSION };
      },
      async getWallet(): Promise<PlayerWallet> {
        await randomDelay();
        return { ...MOCK_WALLET };
      },
      async getInventory(): Promise<InventoryItem[]> {
        await randomDelay();
        return [...MOCK_INVENTORY];
      },
      async getLoadout(): Promise<Loadout> {
        await randomDelay();
        return { ...MOCK_LOADOUT };
      },
      async getAchievements(): Promise<Achievement[]> {
        await randomDelay();
        return [...MOCK_ACHIEVEMENTS];
      },
      async getKnowledge(): Promise<KnowledgeEntry[]> {
        await randomDelay();
        return [...MOCK_KNOWLEDGE];
      },
      async getProductionLogs(): Promise<ProductionLog[]> {
        await randomDelay();
        return [...MOCK_PRODUCTION_LOGS];
      },
      async getTransactions(): Promise<Transaction[]> {
        await randomDelay();
        return [...MOCK_TRANSACTIONS];
      },
      async getFriends(): Promise<FriendInfo[]> {
        await randomDelay();
        return [...MOCK_FRIENDS];
      },
      async getNotifications(): Promise<PlayerNotification[]> {
        await randomDelay();
        return [...MOCK_NOTIFICATIONS];
      },
      async updateProfile(updates: Partial<PlayerProfile>): Promise<PlayerProfile> {
        await randomDelay();
        MOCK_PLAYER_PROFILE = { ...MOCK_PLAYER_PROFILE, ...updates };
        if ('bio' in updates || 'avatarUrl' in updates || 'socialLinks' in updates || 'showStatus' in updates || 'profileVisibility' in updates || 'showCrewActivity' in updates) {
          const current = getStoredMockProfileMetadata();
          persistMockProfileMetadata({
            ...current,
            ...(updates.bio !== undefined ? { bio: updates.bio } : {}),
            ...(updates.avatarUrl !== undefined ? { avatarUrl: updates.avatarUrl } : {}),
            ...(updates.socialLinks !== undefined ? { socialLinks: updates.socialLinks } : {}),
            ...(updates.showStatus !== undefined ? { showStatus: updates.showStatus } : {}),
            ...(updates.profileVisibility !== undefined ? { profileVisibility: updates.profileVisibility } : {}),
            ...(updates.showCrewActivity !== undefined ? { showCrewActivity: updates.showCrewActivity } : {}),
          });
        }
        return { ...MOCK_PLAYER_PROFILE, ...getStoredMockProfileMetadata() };
      },
      async updateLoadout(loadout: Loadout): Promise<Loadout> {
        await randomDelay();
        MOCK_LOADOUT = { ...loadout };
        return { ...MOCK_LOADOUT };
      },
      async getRoleStatistics(): Promise<RoleStatistics[]> {
        await randomDelay();
        return [...MOCK_ROLE_STATISTICS];
      },
    },

    leaderboard: {
      async getGlobal(_stat: string, maxResults = 10): Promise<LeaderboardEntry[]> {
        await randomDelay();
        const currentAvatar = getStoredMockProfileMetadata().avatarUrl || DEFAULT_PROFILE_PICTURE_URL;
        return MOCK_LEADERBOARDS.slice(0, maxResults).map((entry) => ({
          ...entry,
          avatarUrl: entry.playFabId === MOCK_PLAYER_PROFILE.playFabId ? currentAvatar : DEFAULT_PROFILE_PICTURE_URL,
        }));
      },
      async getAroundPlayer(_stat: string, maxResults = 5): Promise<LeaderboardEntry[]> {
        await randomDelay();
        const currentAvatar = getStoredMockProfileMetadata().avatarUrl || DEFAULT_PROFILE_PICTURE_URL;
        return MOCK_LEADERBOARDS.slice(0, maxResults).map((entry) => ({
          ...entry,
          avatarUrl: entry.playFabId === MOCK_PLAYER_PROFILE.playFabId ? currentAvatar : DEFAULT_PROFILE_PICTURE_URL,
        }));
      },
    },

    shop: {
      async getCatalog(): Promise<InventoryItem[]> {
        await randomDelay();
        return [...MOCK_SHOP_CATALOG];
      },
      async purchaseItem(itemId: string, currencyOrPrice: CurrencyType | number, priceOrCurrency?: number | CurrencyType): Promise<{ success: boolean; error?: string }> {
        await randomDelay();
        const price = typeof currencyOrPrice === 'number' ? currencyOrPrice : (priceOrCurrency as number ?? 1000);
        const currency = typeof currencyOrPrice === 'string' ? currencyOrPrice : (priceOrCurrency as CurrencyType ?? 'cCoins');

        if (currency === 'cCoins') {
          if (MOCK_WALLET.cCoins < price) {
            return { success: false, error: 'Insufficient C-Coins' };
          }
          MOCK_WALLET.cCoins -= price;
        } else {
          if (MOCK_WALLET.bCoins < price) {
            return { success: false, error: 'Insufficient B-Coins' };
          }
          MOCK_WALLET.bCoins -= price;
        }

        const catalogItem = MOCK_SHOP_CATALOG.find((item) => item.itemId === itemId);
        if (catalogItem && !MOCK_INVENTORY.some((inv) => inv.itemId === itemId)) {
          MOCK_INVENTORY.push({
            ...catalogItem,
            acquiredAt: new Date().toISOString(),
            quantity: 1,
          });
        }
        return { success: true };
      },
      async purchaseCoinPack(_packId: string): Promise<{ success: boolean; error?: string }> {
        await randomDelay();
        MOCK_WALLET.cCoins += 1000;
        return { success: true };
      },
    },

    admin: {
      async getPlayers(): Promise<PlayerProfile[]> {
        await randomDelay();
        const currentAvatar = getStoredMockProfileMetadata().avatarUrl || DEFAULT_PROFILE_PICTURE_URL;
        return Array.from({ length: 8 }).map((_, i) => ({
          ...MOCK_PLAYER_PROFILE,
          playFabId: `MOCK-PLAYER-00${i + 1}`,
          displayName: `PLAYER_${i + 1}`,
          username: `PLAYER_${i + 1}`,
          avatarUrl: i === 0 ? currentAvatar : DEFAULT_PROFILE_PICTURE_URL,
        }));
      },
      async getPlayer(id: string) {
        await randomDelay();
        const isCurrentPlayer = id === MOCK_PLAYER_PROFILE.playFabId;
        return {
          profile: {
            ...MOCK_PLAYER_PROFILE,
            ...(isCurrentPlayer ? getStoredMockProfileMetadata() : {}),
            avatarUrl: isCurrentPlayer ? getStoredMockProfileMetadata().avatarUrl || DEFAULT_PROFILE_PICTURE_URL : DEFAULT_PROFILE_PICTURE_URL,
            playFabId: id,
          },
          progression: MOCK_PROGRESSION,
          wallet: MOCK_WALLET,
          inventory: MOCK_INVENTORY,
          achievements: MOCK_ACHIEVEMENTS,
          statistics: MOCK_ROLE_STATISTICS,
        };
      },
      async getBugReports(): Promise<BugReport[]> {
        await randomDelay();
        return [...MOCK_BUG_REPORTS];
      },
      async updateBugReport(id: string, updates: Partial<BugReport>): Promise<BugReport> {
        await randomDelay();
        const report = MOCK_BUG_REPORTS.find((r) => r.id === id);
        if (!report) throw new Error('Bug report not found');
        Object.assign(report, updates);
        return report;
      },
      async deleteBugReport(id: string): Promise<void> {
        await randomDelay();
        MOCK_BUG_REPORTS = MOCK_BUG_REPORTS.filter((r) => r.id !== id);
      },
      async deleteBugReports(ids: string[]): Promise<void> {
        await randomDelay();
        MOCK_BUG_REPORTS = MOCK_BUG_REPORTS.filter((r) => !ids.includes(r.id));
      },
      async getPlayerReports(): Promise<PlayerReport[]> {
        await randomDelay();
        return [...MOCK_PLAYER_REPORTS];
      },
      async updatePlayerReport(id: string, updates: Partial<PlayerReport>): Promise<PlayerReport> {
        await randomDelay();
        const report = MOCK_PLAYER_REPORTS.find((r) => r.id === id);
        if (!report) throw new Error('Player report not found');
        Object.assign(report, updates);
        return report;
      },
      async deletePlayerReport(id: string): Promise<void> {
        await randomDelay();
        MOCK_PLAYER_REPORTS = MOCK_PLAYER_REPORTS.filter((r) => r.id !== id);
      },
      async deletePlayerReports(ids: string[]): Promise<void> {
        await randomDelay();
        MOCK_PLAYER_REPORTS = MOCK_PLAYER_REPORTS.filter((r) => !ids.includes(r.id));
      },
      async getPartnerships(): Promise<PartnershipApplication[]> {
        await randomDelay();
        return [...MOCK_PARTNERSHIPS];
      },
      async updatePartnership(id: string, updates: Partial<PartnershipApplication>): Promise<PartnershipApplication> {
        await randomDelay();
        const p = MOCK_PARTNERSHIPS.find((x) => x.id === id);
        if (!p) throw new Error('Partnership not found');
        Object.assign(p, updates);
        return p;
      },
      async deletePartnership(id: string): Promise<void> {
        await randomDelay();
        MOCK_PARTNERSHIPS = MOCK_PARTNERSHIPS.filter((x) => x.id !== id);
      },
      async getAds(): Promise<AdEntry[]> {
        await randomDelay();
        return [...MOCK_ADS];
      },
      async updateAd(id: string, updates: Partial<AdEntry>): Promise<AdEntry> {
        await randomDelay();
        const ad = MOCK_ADS.find((x) => x.id === id);
        if (!ad) throw new Error('Ad not found');
        Object.assign(ad, updates);
        return ad;
      },
      async deleteAd(id: string): Promise<void> {
        await randomDelay();
        MOCK_ADS = MOCK_ADS.filter((x) => x.id !== id);
      },
      async getRevenue(): Promise<RevenueEntry[]> {
        await randomDelay();
        return [...MOCK_REVENUE];
      },
      async getGameBuilds(): Promise<GameBuild[]> {
        await randomDelay();
        return [...MOCK_GAME_BUILDS];
      },
      async updateGameBuild(id: string, updates: Partial<GameBuild>): Promise<GameBuild> {
        await randomDelay();
        const b = MOCK_GAME_BUILDS.find((x) => x.id === id);
        if (!b) throw new Error('Game build not found');
        Object.assign(b, updates);
        return b;
      },
      async getBuildHistory(): Promise<BuildHistoryEntry[]> {
        await randomDelay();
        return [...MOCK_BUILD_HISTORY];
      },
      async getSystemRequirements(): Promise<SystemRequirement[]> {
        await randomDelay();
        return [...MOCK_SYSTEM_REQS];
      },
      async updateSystemRequirements(reqs: SystemRequirement[]): Promise<void> {
        await randomDelay();
        MOCK_SYSTEM_REQS = [...reqs];
      },
      async getInstallSteps(): Promise<InstallStep[]> {
        await randomDelay();
        return [...MOCK_INSTALL_STEPS];
      },
      async updateInstallSteps(steps: InstallStep[]): Promise<void> {
        await randomDelay();
        MOCK_INSTALL_STEPS = [...steps];
      },
      async getSocialLinks(): Promise<SocialLink[]> {
        await randomDelay();
        return [...MOCK_SOCIAL_LINKS];
      },
      async updateSocialLinks(links: SocialLink[]): Promise<void> {
        await randomDelay();
        MOCK_SOCIAL_LINKS = [...links];
      },
      async getNotifications(): Promise<AdminNotification[]> {
        await randomDelay();
        return [...MOCK_ADMIN_NOTIFS];
      },
      async submitBugReport(report: Omit<BugReport, 'id' | 'submittedAt' | 'status'> | any): Promise<BugReport> {
        await randomDelay();
        const newReport: BugReport = {
          ...report,
          id: uid('BR'),
          status: 'New',
          submittedAt: new Date().toISOString(),
        };
        MOCK_BUG_REPORTS.unshift(newReport);
        return newReport;
      },
      async submitPlayerReport(report: Omit<PlayerReport, 'id' | 'submittedAt' | 'status'> | any): Promise<PlayerReport> {
        await randomDelay();
        const newReport: PlayerReport = {
          ...report,
          id: uid('PR'),
          status: 'New',
          submittedAt: new Date().toISOString(),
        };
        MOCK_PLAYER_REPORTS.unshift(newReport);
        return newReport;
      },
      async submitPartnership(app: Omit<PartnershipApplication, 'id' | 'submittedAt' | 'status' | 'archived' | 'archivedAt'> | any): Promise<PartnershipApplication> {
        await randomDelay();
        const newApp: PartnershipApplication = {
          ...app,
          id: uid('PA'),
          status: 'Pending',
          archived: false,
          submittedAt: new Date().toISOString(),
        };
        MOCK_PARTNERSHIPS.unshift(newApp);
        return newApp;
      },
    },
  };
}

export default createMockService;
