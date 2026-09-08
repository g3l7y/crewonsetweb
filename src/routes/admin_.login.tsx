import { createFileRoute, redirect } from "@tanstack/react-router";

import { CrewAccessPage } from "@/components/crew-access-page";
import { getCrewSession } from "@/lib/session.functions";

export const Route = createFileRoute("/admin_/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — Crew On Set!" },
      { name: "description", content: "Sign in to the Crew On Set! studio admin console." },
      { property: "og:title", content: "Admin Login — Crew On Set!" },
      { property: "og:description", content: "Sign in to the Crew On Set! studio admin console." },
    ],
  }),
  beforeLoad: async () => {
    const session = await getCrewSession();
    if (session.isAdmin) throw redirect({ to: "/admin" });
    if (session.isPlayer) throw redirect({ to: "/portal" });
  },
  component: AdminLoginPage,
});

function AdminLoginPage() {
  return <CrewAccessPage mode="login" scope="admin" />;
}
