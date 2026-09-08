import { createFileRoute, redirect } from "@tanstack/react-router";

import { getCrewSession } from "@/lib/session.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Crew Access — Crew On Set!" },
      { name: "description", content: "Sign in to the Crew On Set! player portal or studio admin console." },
      { property: "og:title", content: "Crew Access — Crew On Set!" },
      { property: "og:description", content: "Sign in to the Crew On Set! player portal or studio admin console." },
    ],
  }),
  beforeLoad: async () => {
    const session = await getCrewSession();
    if (session.isAdmin) throw redirect({ to: "/admin" });
    if (session.isPlayer) throw redirect({ to: "/portal" });
  },
  component: LoginPage,
});

import { CrewAccessPage } from "@/components/crew-access-page";

function LoginPage() {
  return <CrewAccessPage mode="login" />;
}
