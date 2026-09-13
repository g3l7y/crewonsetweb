import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AdminShell } from "@/components/admin/admin-shell";
import { getCrewSession } from "@/lib/session.functions";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const session = await getCrewSession();
    if (!session) {
      throw redirect({ to: "/admin/login" });
    }
    if (session.role !== "admin") {
      throw redirect({ to: "/portal" });
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
