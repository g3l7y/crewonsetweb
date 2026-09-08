import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/admin-shell";
import { getCrewSession } from "@/lib/session.functions";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await getCrewSession();
    if (session.isPlayer) {
      throw redirect({ to: "/portal" });
    }
    if (!session.isAdmin) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
