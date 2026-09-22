import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isMockMode } from './config';
import { getPlayFabService } from './service';
import type {
  PlayerProfile, PlayerProgression, PlayerWallet, InventoryItem, Loadout,
  Achievement, KnowledgeEntry, ProductionLog, LeaderboardEntry, FriendInfo,
  Transaction, PlayerNotification, SessionData, RoleStatistics,
  BugReport, PlayerReport, PartnershipApplication, AdminNotification,
  AdEntry, RevenueEntry, GameBuild, BuildHistoryEntry, SystemRequirement,
  InstallStep, SocialLink, CurrencyType,
} from './types';

export const QUERY_KEYS = {
  session: ['playfab', 'session'] as const,
  profile: ['playfab', 'player', 'profile'] as const,
  progression: ['playfab', 'player', 'progression'] as const,
  wallet: ['playfab', 'player', 'wallet'] as const,
  inventory: ['playfab', 'player', 'inventory'] as const,
  loadout: ['playfab', 'player', 'loadout'] as const,
  achievements: ['playfab', 'player', 'achievements'] as const,
  knowledge: ['playfab', 'player', 'knowledge'] as const,
  productionLogs: ['playfab', 'player', 'productionLogs'] as const,
  transactions: ['playfab', 'player', 'transactions'] as const,
  friends: ['playfab', 'player', 'friends'] as const,
  playerSearch: (query: string) => ['playfab', 'player', 'search', query] as const,
  notifications: ['playfab', 'player', 'notifications'] as const,
  leaderboard: (stat: string) => ['playfab', 'leaderboard', stat] as const,
  leaderboardAround: (stat: string) => ['playfab', 'leaderboard', 'around', stat] as const,
  catalog: ['playfab', 'shop', 'catalog'] as const,
  // Admin keys
  adminPlayers: ['playfab', 'admin', 'players'] as const,
  adminPlayer: (id: string) => ['playfab', 'admin', 'player', id] as const,
  adminBugReports: ['playfab', 'admin', 'bugReports'] as const,
  adminPlayerReports: ['playfab', 'admin', 'playerReports'] as const,
  adminPartnerships: ['playfab', 'admin', 'partnerships'] as const,
  adminAds: ['playfab', 'admin', 'ads'] as const,
  adminRevenue: ['playfab', 'admin', 'revenue'] as const,
  adminGameBuilds: ['playfab', 'admin', 'gameBuilds'] as const,
  adminBuildHistory: ['playfab', 'admin', 'buildHistory'] as const,
  adminSystemRequirements: ['playfab', 'admin', 'systemRequirements'] as const,
  adminInstallSteps: ['playfab', 'admin', 'installSteps'] as const,
  adminSocialLinks: ['playfab', 'admin', 'socialLinks'] as const,
  adminNotifications: ['playfab', 'admin', 'notifications'] as const,
} as const;

export function useSession() {
  return useQuery({
    queryKey: QUERY_KEYS.session,
    queryFn: () => getPlayFabService().auth.getSession(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

// Player Data Hooks
export function usePlayerProfile() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.profile,
    queryFn: () => getPlayFabService().player.getProfile(),
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePlayerProgression() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.progression,
    queryFn: () => getPlayFabService().player.getProgression(),
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePlayerWallet() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.wallet,
    queryFn: () => getPlayFabService().player.getWallet(),
    enabled: !!session,
    staleTime: 30 * 1000,
  });
}

export function usePlayerInventory() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.inventory,
    queryFn: () => getPlayFabService().player.getInventory(),
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePlayerLoadout() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.loadout,
    queryFn: () => getPlayFabService().player.getLoadout(),
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAchievements() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.achievements,
    queryFn: () => getPlayFabService().player.getAchievements(),
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });
}

export function useKnowledge() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.knowledge,
    queryFn: () => getPlayFabService().player.getKnowledge(),
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });
}

export function useProductionLogs() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.productionLogs,
    queryFn: () => getPlayFabService().player.getProductionLogs(),
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTransactions() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.transactions,
    queryFn: () => getPlayFabService().player.getTransactions(),
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });
}

export function useFriends() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.friends,
    queryFn: () => getPlayFabService().player.getFriends(),
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });
}

export type PlayerSearchResult = {
  playFabId: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  level?: number;
  role?: string;
  online?: boolean;
};

export function useSearchPlayers(query: string, enabled = true) {
  const normalizedQuery = query.trim();
  return useQuery<PlayerSearchResult[]>({
    queryKey: QUERY_KEYS.playerSearch(normalizedQuery),
    queryFn: async () => {
      const response = await fetch(`/api/playfab/players/search?q=${encodeURIComponent(normalizedQuery)}`, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok || result?.success === false) {
        throw new Error(result?.error ?? 'Player search failed.');
      }
      return (result?.data ?? []) as PlayerSearchResult[];
    },
    enabled: enabled && !isMockMode() && normalizedQuery.length >= 3,
    staleTime: 15_000,
    retry: false,
  });
}

export function useNotifications() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.notifications,
    queryFn: () => getPlayFabService().player.getNotifications(),
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });
}

// Leaderboard
export function useLeaderboard(statistic: string, maxResults = 100) {
  return useQuery({
    queryKey: [...QUERY_KEYS.leaderboard(statistic), maxResults] as const,
    queryFn: () => getPlayFabService().leaderboard.getGlobal(statistic, maxResults),
    staleTime: 2 * 60 * 1000,
  });
}

export function useLeaderboardAroundPlayer(statistic: string) {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.leaderboardAround(statistic),
    queryFn: () => getPlayFabService().leaderboard.getAroundPlayer(statistic),
    enabled: !!session,
    staleTime: 2 * 60 * 1000,
  });
}

// Shop
export function useCatalog() {
  return useQuery({
    queryKey: QUERY_KEYS.catalog,
    queryFn: () => getPlayFabService().shop.getCatalog(),
    staleTime: 2 * 60 * 1000,
  });
}

// Admin Hooks
export function useAdminPlayers(enabled = true) {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.adminPlayers,
    queryFn: () => getPlayFabService().admin.getPlayers(),
    enabled: enabled && !!session && (session.role === 'admin' || session.role === 'developer'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminPlayer(id: string) {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.adminPlayer(id),
    queryFn: () => getPlayFabService().admin.getPlayer(id),
    enabled: !!session && !!id && (session.role === 'admin' || session.role === 'developer'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminBugReports() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.adminBugReports,
    queryFn: () => getPlayFabService().admin.getBugReports(),
    enabled: !!session && (session.role === 'admin' || session.role === 'developer'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminPlayerReports() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.adminPlayerReports,
    queryFn: () => getPlayFabService().admin.getPlayerReports(),
    enabled: !!session && (session.role === 'admin' || session.role === 'developer'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminPartnerships() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.adminPartnerships,
    queryFn: () => getPlayFabService().admin.getPartnerships(),
    enabled: !!session && (session.role === 'admin' || session.role === 'developer'),
    refetchInterval: 30_000,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminAds() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.adminAds,
    queryFn: () => getPlayFabService().admin.getAds(),
    enabled: !!session && (session.role === 'admin' || session.role === 'developer'),
    refetchInterval: 30_000,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminRevenue() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.adminRevenue,
    queryFn: () => getPlayFabService().admin.getRevenue(),
    enabled: !!session && (session.role === 'admin' || session.role === 'developer'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminGameBuilds() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.adminGameBuilds,
    queryFn: () => getPlayFabService().admin.getGameBuilds(),
    enabled: !!session && (session.role === 'admin' || session.role === 'developer'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminBuildHistory() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.adminBuildHistory,
    queryFn: () => getPlayFabService().admin.getBuildHistory(),
    enabled: !!session && (session.role === 'admin' || session.role === 'developer'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminSystemRequirements() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.adminSystemRequirements,
    queryFn: () => getPlayFabService().admin.getSystemRequirements(),
    enabled: !!session && (session.role === 'admin' || session.role === 'developer'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminInstallSteps() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.adminInstallSteps,
    queryFn: () => getPlayFabService().admin.getInstallSteps(),
    enabled: !!session && (session.role === 'admin' || session.role === 'developer'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminSocialLinks() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.adminSocialLinks,
    queryFn: () => getPlayFabService().admin.getSocialLinks(),
    enabled: !!session && (session.role === 'admin' || session.role === 'developer'),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminNotifications() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: QUERY_KEYS.adminNotifications,
    queryFn: () => getPlayFabService().admin.getNotifications(),
    enabled: !!session && (session.role === 'admin' || session.role === 'developer'),
    staleTime: 2 * 60 * 1000,
  });
}

// Mutations
export function usePurchaseItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { itemId: string; price: number; currency: CurrencyType }) =>
      getPlayFabService().shop.purchaseItem(args.itemId, args.price, args.currency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wallet });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.catalog });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
    },
  });
}

export function usePurchaseCoinPack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (packId: string) => getPlayFabService().shop.purchaseCoinPack(packId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wallet });
    },
  });
}

export function useUpdateLoadout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (loadout: Loadout) => getPlayFabService().player.updateLoadout(loadout),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.loadout });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: Partial<PlayerProfile>) => getPlayFabService().player.updateProfile(profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile });
    },
  });
}

export function useSubmitBugReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (report: Omit<BugReport, 'id' | 'createdAt' | 'status'>) => getPlayFabService().admin.submitBugReport(report),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminBugReports });
    },
  });
}

export function useSubmitPlayerReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (report: Omit<PlayerReport, 'id' | 'createdAt' | 'status'>) => getPlayFabService().admin.submitPlayerReport(report),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminPlayerReports });
    },
  });
}

export function useSubmitPartnership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (partnership: Omit<PartnershipApplication, 'id' | 'createdAt' | 'status'>) => getPlayFabService().admin.submitPartnership(partnership),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminPartnerships });
    },
  });
}

export function useUpdateBugReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; status: BugReport['status'] }) =>
      getPlayFabService().admin.updateBugReport(args.id, { status: args.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminBugReports });
    },
  });
}

export function useDeleteBugReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getPlayFabService().admin.deleteBugReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminBugReports });
    },
  });
}

export function useDeleteBugReports() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => getPlayFabService().admin.deleteBugReports(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminBugReports });
    },
  });
}

export function useUpdatePlayerReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; status: PlayerReport['status'] }) =>
      getPlayFabService().admin.updatePlayerReport(args.id, { status: args.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminPlayerReports });
    },
  });
}

export function useDeletePlayerReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getPlayFabService().admin.deletePlayerReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminPlayerReports });
    },
  });
}

export function useDeletePlayerReports() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => getPlayFabService().admin.deletePlayerReports(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminPlayerReports });
    },
  });
}

export function useUpdatePartnership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; status: PartnershipApplication['status'] }) =>
      getPlayFabService().admin.updatePartnership(args.id, { status: args.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminPartnerships });
    },
  });
}

export function useDeletePartnership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getPlayFabService().admin.deletePartnership(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminPartnerships });
    },
  });
}

export function useDeletePartnerships() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const admin = getPlayFabService().admin;
      if (admin.deletePartnerships) {
        await admin.deletePartnerships(ids);
      } else {
        await Promise.all(ids.map((id) => admin.deletePartnership(id)));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminPartnerships });
    },
  });
}

export function useUpdateAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; data: Partial<AdEntry> }) => getPlayFabService().admin.updateAd(args.id, args.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminAds });
    },
  });
}

export function useDeleteAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getPlayFabService().admin.deleteAd(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminAds });
    },
  });
}

export function useUpdateGameBuild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (build: GameBuild) => getPlayFabService().admin.updateGameBuild(build.id, build),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminGameBuilds });
    },
  });
}

export function useUpdateSystemRequirements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reqs: SystemRequirement[]) => getPlayFabService().admin.updateSystemRequirements(reqs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminSystemRequirements });
    },
  });
}

export function useUpdateInstallSteps() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (steps: InstallStep[]) => getPlayFabService().admin.updateInstallSteps(steps),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminInstallSteps });
    },
  });
}

export function useUpdateSocialLinks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (links: SocialLink[]) => getPlayFabService().admin.updateSocialLinks(links),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminSocialLinks });
    },
  });
}

// Friends
export function useAddFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friendPlayFabId: string) => {
      const response = await fetch('/api/playfab/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendPlayFabId }),
      });
      if (!response.ok) throw new Error('Failed to add friend');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.friends });
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (friendPlayFabId: string) => {
      const response = await fetch('/api/playfab/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendPlayFabId }),
      });
      if (!response.ok) throw new Error('Failed to remove friend');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.friends });
    },
  });
}
