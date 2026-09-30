import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, KeyRound, LoaderCircle, ShieldAlert, Trash2, UserRoundX } from 'lucide-react';
import { useAdminPlayers } from '@/lib/playfab/hooks';
import { isMockMode } from '@/lib/playfab/config';
import { getPlayFabService } from '@/lib/playfab/service';
import { purgeMockPlayerAccountData, deleteMockPlayerAccount } from '@/lib/playfab/mock-provider';
import {
  adminNotificationsStore,
  applicationsStore,
  bugReportsStore,
  notificationsStore,
  playerMailStore,
  playerReportsStore,
  transactionsStore,
  walletStore,
} from '@/lib/demo/store';
import { ownedItemsStore, equippedItemsStore } from '@/lib/demo/portal-shop';
import { topUpsStore } from '@/lib/admin-demo-data';

export const Route = createFileRoute('/admin/dev-tools')({
  head: () => ({ meta: [{ title: 'Developer Maintenance — Crew On Set! Admin' }] }),
  component: DeveloperMaintenancePage,
});

type MaintenanceAction = 'player-reset' | 'player-delete' | 'application-delete';

function DeveloperMaintenancePage() {
  const mockMode = isMockMode();
  const queryClient = useQueryClient();
  const playersQuery = useAdminPlayers();
  const [applications, setApplications] = applicationsStore.useStore();
  const [key, setKey] = useState('');
  const [targetId, setTargetId] = useState('');
  const [action, setAction] = useState<MaintenanceAction>('player-reset');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const players = useMemo(() => (playersQuery.data || []).filter((player) =>
    !mockMode || player.playFabId === 'MOCK-PLAYER-001'), [mockMode, playersQuery.data]);
  const options = action === 'application-delete'
    ? applications.map((application) => ({ id: application.id, label: application.brand + ' — ' + application.exactModel }))
    : players.map((player) => ({ id: player.playFabId, label: (player.username || player.displayName || player.playFabId) + ' — ' + player.playFabId }));
  const selected = options.find((option) => option.id === targetId);
  const allowed = Boolean(key.trim() && targetId && confirmation.trim() === targetId && !busy);

  async function runAction() {
    if (!allowed) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/dev/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-maintenance-key': key },
        body: JSON.stringify({ action, targetId }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Developer maintenance action failed.');

      if (mockMode && action === 'application-delete') {
        const application = applications.find((item) => item.id === targetId);
        await getPlayFabService().admin.deletePartnership(targetId);
        setApplications((current) => current.filter((item) => item.id !== targetId));
        const relatedPaymentIds = new Set(topUpsStore.get()
          .filter((item) => item.playerId === targetId || (item.bank.toLowerCase().includes('brand partnership') && item.playerName.toLowerCase() === application?.brand.toLowerCase()))
          .map((item) => item.id));
        topUpsStore.set((current) => current.filter((item) => !relatedPaymentIds.has(item.id)));
        adminNotificationsStore.set((current) => current.filter((item) => item.entityId !== targetId && !relatedPaymentIds.has(item.id)));
        const adMatches = (item: { applicationId?: string; id: string }) => item.applicationId !== targetId && item.id !== 'AD-' + targetId;
        const { adsStore, revenueStore } = await import('@/lib/demo/store');
        adsStore.set((current) => current.filter(adMatches));
        revenueStore.set((current) => current.filter(adMatches));
      }

      if (mockMode && (action === 'player-reset' || action === 'player-delete')) {
        purgeMockPlayerAccountData();
        if (action === 'player-delete') deleteMockPlayerAccount();
        walletStore.set([0]);
        ownedItemsStore.set([]);
        equippedItemsStore.set({});
        transactionsStore.set([]);
        notificationsStore.set([]);
        playerMailStore.set([]);
        const player = players.find((item) => item.playFabId === targetId);
        topUpsStore.set((current) => current.filter((item) => item.playerId !== targetId && item.playerName.toLowerCase() !== (player?.username || '').toLowerCase()));
        bugReportsStore.set((current) => current.filter((item) => item.playerId !== targetId));
        playerReportsStore.set((current) => current.filter((item) => item.reporterId !== targetId));
        adminNotificationsStore.set((current) => current.filter((item) => item.entityId !== targetId));
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['playfab', 'admin', 'players'] }),
        queryClient.invalidateQueries({ queryKey: ['playfab', 'admin', 'partnerships'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'paymongo-orders'] }),
      ]);
      setMessage(action === 'player-reset'
        ? 'Player activity, progress, owned items, balances, and transaction ledgers were purged.'
        : action === 'player-delete'
          ? 'The player account and its linked activity and transaction ledgers were permanently deleted.'
          : 'The brand application, promotion records, and linked payment ledger entries were permanently deleted.');
      setKey('');
      setTargetId('');
      setConfirmation('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Developer maintenance action failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-[#101923] px-5 py-7 text-white sm:px-8">
      <header className="mb-7">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#f3c747]/30 bg-[#f3c747]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-[#f3c747]">
          <KeyRound className="size-3.5" /> Private developer utility
        </div>
        <h1 className="admin-heading !text-white">Developer Maintenance</h1>
        <p className="admin-kicker mt-2 !text-white/45">Permanently clear one player account or brand application and its linked ledgers.</p>
      </header>

      <div className="mb-6 flex gap-3 rounded-xl border border-[#f3c747]/20 bg-[#f3c747]/[.06] p-4 text-sm text-white/70">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-[#f3c747]" />
        <p>The key is checked on the server and is never included in the site bundle or saved in browser storage. Admin reset and delete buttons remain unchanged and continue to preserve payment ledgers.</p>
      </div>

      <section className="max-w-3xl rounded-2xl border border-white/10 bg-[#151c29] p-5 shadow-xl sm:p-7">
        <label className="mb-5 block">
          <span className="mb-2 block text-xs font-black uppercase tracking-wider text-white/55">Developer key</span>
          <input type="password" autoComplete="new-password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Enter the server-configured developer key" className="w-full rounded-lg border border-white/15 bg-[#101923] px-4 py-3 text-sm text-white outline-none focus:border-[#f3c747]" />
        </label>

        <label className="mb-5 block">
          <span className="mb-2 block text-xs font-black uppercase tracking-wider text-white/55">Action</span>
          <select value={action} onChange={(event) => { setAction(event.target.value as MaintenanceAction); setTargetId(''); setConfirmation(''); }} className="w-full rounded-lg border border-white/15 bg-[#101923] px-4 py-3 text-sm text-white outline-none focus:border-[#f3c747]">
            <option value="player-reset">Purge player records and reset account</option>
            <option value="player-delete">Delete player account and all linked records</option>
            <option value="application-delete">Delete brand application and linked promotion/payment records</option>
          </select>
        </label>

        <label className="mb-5 block">
          <span className="mb-2 block text-xs font-black uppercase tracking-wider text-white/55">{action === 'application-delete' ? 'Brand application' : 'Player account'}</span>
          <select value={targetId} onChange={(event) => { setTargetId(event.target.value); setConfirmation(''); }} className="w-full rounded-lg border border-white/15 bg-[#101923] px-4 py-3 text-sm text-white outline-none focus:border-[#f3c747]">
            <option value="">Select a target…</option>
            {options.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
          </select>
          {mockMode && action !== 'application-delete' && <span className="mt-2 block text-xs text-white/40">Mock mode stores gameplay data for the CAMERA_PRO demo player only.</span>}
          {action === 'application-delete' && (applications.length === 0) && <span className="mt-2 block text-xs text-white/40">No application records are available.</span>}
        </label>

        <label className="mb-5 block">
          <span className="mb-2 block text-xs font-black uppercase tracking-wider text-white/55">Confirm by typing the selected ID: <strong className="text-white">{targetId || '—'}</strong></span>
          <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Type the ID exactly" className="w-full rounded-lg border border-white/15 bg-[#101923] px-4 py-3 text-sm text-white outline-none focus:border-[#f3c747]" />
        </label>

        {(action === 'player-delete' || action === 'application-delete') && <div className="mb-5 flex gap-2 rounded-lg border border-coral/30 bg-coral/10 p-3 text-xs text-coral"><AlertTriangle className="size-4 shrink-0" />This permanently removes the selected account or brand record and its linked transaction history.</div>}
        {error && <p role="alert" className="mb-4 text-sm text-coral">{error}</p>}
        {message && <p role="status" className="mb-4 text-sm text-emerald-300">{message}</p>}

        <button type="button" disabled={!allowed || !selected} onClick={() => void runAction()} className="inline-flex items-center gap-2 rounded-lg bg-coral px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : action === 'application-delete' ? <Trash2 className="size-4" /> : <UserRoundX className="size-4" />}
          {busy ? 'Processing…' : action === 'player-reset' ? 'Purge and reset player' : action === 'player-delete' ? 'Delete player completely' : 'Delete application completely'}
        </button>
      </section>
    </div>
  );
}
