import { createFileRoute } from '@tanstack/react-router';
import { isMockMode, PLAYFAB_API_BASE, PLAYFAB_TITLE_ID } from '@/lib/playfab/config';
import { validateSessionFromRequest, unauthorizedSessionResponse } from '@/lib/playfab/session';
import { PLAYFAB_DATA_KEYS } from '@/lib/playfab/constants';
import { WEBSITE_DATA_KEYS, getWebsiteRecords, setWebsiteRecords } from '@/lib/playfab/websiteData';
import { deletePayMongoOrdersForPlayer, isPayMongoLedgerConfigured } from '@/lib/paymongo/ledger';
import { deleteBrandPromotionData } from '@/lib/brand-promotion-tracking';
import { deletePlayerEmailIdentity } from '@/lib/playfab/email-login-identities';
import { deletePlayerProfileAvatarFiles } from '@/lib/playfab/profile-avatars';
import { deleteSubmissionAttachments } from '@/lib/playfab/submission-attachments';

function getPlayFabSecret() {
  return process.env['PLAYFAB_SECRET_KEY']?.trim() || '';
}

function isAuthorizedDevKey(request: Request): boolean {
  const configured = process.env['DEV_MAINTENANCE_KEY']?.trim() || '';
  const supplied = request.headers.get('x-dev-maintenance-key') || '';
  if (!configured || !supplied) return false;
  const expectedBytes = new TextEncoder().encode(configured);
  const suppliedBytes = new TextEncoder().encode(supplied);
  let difference = expectedBytes.length ^ suppliedBytes.length;
  for (let index = 0; index < Math.max(expectedBytes.length, suppliedBytes.length); index += 1) {
    difference |= (expectedBytes[index] || 0) ^ (suppliedBytes[index] || 0);
  }
  return difference === 0;
}

async function playFabServerRequest<T>(path: string, body: Record<string, unknown>, secretKey: string): Promise<T> {
  const response = await fetch(PLAYFAB_API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-SecretKey': secretKey },
    body: JSON.stringify({ ...body, TitleId: PLAYFAB_TITLE_ID }),
  });
  const result = await response.json().catch(() => ({})) as { code?: number; errorMessage?: string; data?: T };
  if (!response.ok || result.code !== 200) throw new Error(result.errorMessage || 'PlayFab could not complete the maintenance action.');
  return result.data as T;
}

async function removeRecords<T extends { id: string }>(collection: string, keep: (record: T) => boolean, secretKey: string) {
  const records = await getWebsiteRecords<T>(collection, secretKey);
  const remaining = records.filter(keep);
  if (remaining.length !== records.length && !(await setWebsiteRecords(collection, remaining, secretKey))) {
    throw new Error('Could not clear related records from ' + collection + '.');
  }
}

async function clearPlayerWebsiteRecords(playFabId: string, secretKey: string) {
  const playerCollections = [
    WEBSITE_DATA_KEYS.notifications,
    WEBSITE_DATA_KEYS.playerNotifications,
    WEBSITE_DATA_KEYS.playerMail,
    WEBSITE_DATA_KEYS.playerFriendRequests,
    WEBSITE_DATA_KEYS.bugReports,
    WEBSITE_DATA_KEYS.playerReports,
  ];
  for (const collection of playerCollections) {
    await removeRecords<Record<string, unknown> & { id: string }>(collection, (record) => {
      const target = record['target'] as { playerIds?: unknown[] } | undefined;
      const referenceFields = ['playFabId', 'playerId', 'reporterId', 'reportedPlayerId', 'senderPlayerId', 'recipientPlayerId', 'fromPlayerId', 'toPlayerId', 'entityId'];
      if (referenceFields.some((field) => record[field] === playFabId)) return false;
      if (Array.isArray(target?.playerIds) && target.playerIds.includes(playFabId)) return false;
      const threadId = String(record['threadId'] || '');
      if (threadId === 'thread-' + playFabId || threadId.startsWith('thread-' + playFabId + '-') || threadId.endsWith('-' + playFabId)) return false;
      return true;
    }, secretKey);
  }
  await removeRecords<Record<string, unknown> & { id: string }>(WEBSITE_DATA_KEYS.paymongoOrders,
    (record) => record['playFabId'] !== playFabId, secretKey);
}

async function resetPlayFabPlayer(playFabId: string, secretKey: string) {
  await deletePlayerProfileAvatarFiles(playFabId, secretKey);
  const friendData = await playFabServerRequest<{ Friends?: Array<{ FriendPlayFabId?: string }> }>('/Server/GetFriendsList', {
    PlayFabId: playFabId,
  }, secretKey);
  for (const friend of friendData.Friends || []) {
    if (friend.FriendPlayFabId) {
      await playFabServerRequest('/Server/RemoveFriend', { PlayFabId: playFabId, FriendPlayFabId: friend.FriendPlayFabId }, secretKey);
    }
  }
  const current = await playFabServerRequest<{
    UserInventory?: Array<{ ItemInstanceId?: string }>;
    UserVirtualCurrency?: Record<string, number>;
  }>('/Server/GetPlayerCombinedInfo', {
    PlayFabId: playFabId,
    InfoRequestParameters: { GetUserInventory: true, GetUserVirtualCurrency: true },
  }, secretKey);
  await playFabServerRequest('/Admin/ResetUserStatistics', { PlayFabId: playFabId }, secretKey);
  await playFabServerRequest('/Server/UpdateUserData', {
    PlayFabId: playFabId,
    KeysToRemove: Object.values(PLAYFAB_DATA_KEYS),
  }, secretKey);
  const inventory = current.UserInventory || [];
  for (let offset = 0; offset < inventory.length; offset += 25) {
    const items = inventory.slice(offset, offset + 25).flatMap((item) => item.ItemInstanceId ? [{ PlayFabId: playFabId, ItemInstanceId: item.ItemInstanceId }] : []);
    if (items.length) await playFabServerRequest('/Admin/RevokeInventoryItems', { Items: items }, secretKey);
  }
  for (const [currency, balance] of Object.entries(current.UserVirtualCurrency || {})) {
    if (balance > 0) await playFabServerRequest('/Server/SubtractUserVirtualCurrency', { PlayFabId: playFabId, VirtualCurrency: currency, Amount: balance }, secretKey);
  }
}

async function deletePartnershipApplication(applicationId: string, secretKey: string) {
  const [applications, payments, notifications] = await Promise.all([
    getWebsiteRecords<Record<string, unknown> & { id: string }>(WEBSITE_DATA_KEYS.partnerships, secretKey),
    getWebsiteRecords<Record<string, unknown> & { id: string; applicationId?: string }>(WEBSITE_DATA_KEYS.partnershipPayments, secretKey),
    getWebsiteRecords<Record<string, unknown> & { id: string }>(WEBSITE_DATA_KEYS.notifications, secretKey),
  ]);
  const paymentIds = new Set(payments.filter((payment) => payment.applicationId === applicationId).map((payment) => payment.id));
  const nextApplications = applications.filter((application) => application.id !== applicationId);
  const nextPayments = payments.filter((payment) => payment.applicationId !== applicationId);
  const nextNotifications = notifications.filter((notification) => notification['entityId'] !== applicationId && !paymentIds.has(notification.id));
  const savedApplications = await setWebsiteRecords(WEBSITE_DATA_KEYS.partnerships, nextApplications, secretKey);
  if (!savedApplications) throw new Error('The application record could not be removed.');
  const savedPayments = await setWebsiteRecords(WEBSITE_DATA_KEYS.partnershipPayments, nextPayments, secretKey);
  if (!savedPayments) throw new Error('The application was removed, but its payment ledger could not be cleared.');
  const savedNotifications = await setWebsiteRecords(WEBSITE_DATA_KEYS.notifications, nextNotifications, secretKey);
  if (!savedNotifications) throw new Error('The application was removed, but its notifications could not be cleared.');
  await deleteBrandPromotionData(applicationId);
  await deleteSubmissionAttachments(applicationId, secretKey);
}

export const Route = createFileRoute('/api/dev/maintenance')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await validateSessionFromRequest(request, { requireAdmin: true });
        if (!session) return unauthorizedSessionResponse();
        if (!process.env['DEV_MAINTENANCE_KEY']?.trim()) {
          return Response.json({ error: 'Developer maintenance is not configured on this server.' }, { status: 503 });
        }
        if (!isAuthorizedDevKey(request)) return Response.json({ error: 'Developer key rejected.' }, { status: 403 });
        try {
          const body = await request.json() as { action?: string; targetId?: string; targetIds?: unknown[] };
          const requestedIds = Array.isArray(body.targetIds)
            ? body.targetIds.map((id) => String(id || '').trim()).filter(Boolean)
            : [String(body.targetId || '').trim()].filter(Boolean);
          const targetIds = [...new Set(requestedIds)];
          if (!targetIds.length || targetIds.length > 500) return Response.json({ error: 'Choose at least one target (up to 500 at a time).' }, { status: 400 });
          if (isMockMode()) return Response.json({ success: true, mode: 'mock' });

          const secretKey = getPlayFabSecret();
          if (!secretKey) return Response.json({ error: 'PlayFab server access is not configured.' }, { status: 503 });
          if (body.action === 'player-reset' || body.action === 'player-delete') {
            for (const targetId of targetIds) {
              await resetPlayFabPlayer(targetId, secretKey);
              await clearPlayerWebsiteRecords(targetId, secretKey);
              if (isPayMongoLedgerConfigured()) await deletePayMongoOrdersForPlayer(targetId);
              if (body.action === 'player-delete') {
                await deletePlayerEmailIdentity(targetId);
                await playFabServerRequest('/Admin/DeleteMasterPlayerAccount', { PlayFabId: targetId }, secretKey);
              }
            }
            return Response.json({ success: true, mode: 'real', count: targetIds.length });
          }
          if (body.action === 'application-delete') {
            for (const targetId of targetIds) await deletePartnershipApplication(targetId, secretKey);
            return Response.json({ success: true, mode: 'real', count: targetIds.length });
          }
          return Response.json({ error: 'Unsupported developer maintenance action.' }, { status: 400 });
        } catch (error) {
          console.error('[Developer maintenance] Action failed:', error);
          return Response.json({ error: error instanceof Error ? error.message : 'Maintenance action failed.' }, { status: 502 });
        }
      },
    },
  },
});
