import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/almanac")({
  beforeLoad: () => {
    throw redirect({ to: "/features" });
  },
  component: () => null,
});
