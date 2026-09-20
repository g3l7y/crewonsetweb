import { createFileRoute } from '@tanstack/react-router';
import { unauthorizedSessionResponse, validateSessionFromRequest } from '@/lib/playfab/session';
import {
  WEBSITE_DATA_KEYS,
  getWebsiteRecords,
} from '@/lib/playfab/websiteData';

type PayMongoOrder = {
  id: string;
  checkoutSessionId: string;
  playFabId: string;
  username?: string;
  packageId: string;
  coins: number;
  amountInCentavos: number;
  currency: 'PHP';
  email: string;
  status: 'pending' | 'active' | 'fulfilled' | 'failed';
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  eventId?: string;
};

type AdminTopUp = {
  id: string;
  playerName: string;
  playerId: string;
  date: string;
  time: string;
  bank: string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Failed';
};

function getStatus(status: PayMongoOrder['status']): AdminTopUp['status'] {
  if (status === 'fulfilled') return 'Completed';
  if (status === 'failed') return 'Failed';
  return 'Pending';
}

function toAdminTopUp(order: PayMongoOrder): AdminTopUp {
  const timestamp = order.paidAt || order.updatedAt || order.createdAt;
  const date = new Date(timestamp);

  return {
    id: order.id,
    playerName: order.username || order.playFabId,
    playerId: order.playFabId,
    date: Number.isNaN(date.getTime()) ? timestamp.slice(0, 10) : date.toISOString().slice(0, 10),
    time: Number.isNaN(date.getTime())
      ? '--:--'
      : date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
    bank: 'PayMongo Hosted Checkout',
    amount: order.amountInCentavos / 100,
    status: getStatus(order.status),
  };
}

export const Route = createFileRoute('/api/admin/paymongo-orders')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await validateSessionFromRequest(request, { requireAdmin: true }))) {
          return unauthorizedSessionResponse();
        }

        const playfabSecret = process.env['PLAYFAB_SECRET_KEY'];
        if (!playfabSecret) {
          return Response.json({ success: true, data: [] }, {
            headers: { 'Cache-Control': 'no-store' },
          });
        }

        const orders = await getWebsiteRecords<PayMongoOrder>(
          WEBSITE_DATA_KEYS.paymongoOrders,
          playfabSecret,
        );

        return Response.json(
          {
            success: true,
            data: orders
              .filter((order) => order.currency === 'PHP')
              .map(toAdminTopUp),
          },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      },
    },
  },
});
