import { createFileRoute, redirect } from "@tanstack/react-router";

import { getCrewSession } from "@/lib/session.functions";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Join the Crew — Crew On Set!" },
      { name: "description", content: "Create your Crew On Set! account and join the production." },
      { property: "og:title", content: "Join the Crew — Crew On Set!" },
      { property: "og:description", content: "Create your Crew On Set! account and join the production." },
    ],
  }),
  beforeLoad: async () => {
    const session = await getCrewSession();
    if (session.isAdmin) throw redirect({ to: "/admin" });
    if (session.isPlayer) throw redirect({ to: "/portal" });
  },
  component: SignupPage,
});

import { CrewAccessPage } from "@/components/crew-access-page";

function SignupPage() {
  return <CrewAccessPage mode="signup" />;
}
