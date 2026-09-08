import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { PlayerShell } from "@/components/portal/player-shell";
import { getCrewSession } from "@/lib/session.functions";

export const Route = createFileRoute("/portal")({
  beforeLoad: async () => {
    const session = await getCrewSession();
    if (session.isAdmin) {
      throw redirect({ to: "/admin" });
    }
    if (!session.isPlayer) {
      throw redirect({ to: "/login" });
    }
  },
  component: PortalLayout,
});

function PortalLayout() {
  return (
    <PlayerShell>
      <Outlet />
    </PlayerShell>
  );
}
