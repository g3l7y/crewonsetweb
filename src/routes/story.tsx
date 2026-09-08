import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/story")({
  beforeLoad: () => {
    throw redirect({ to: "/features" });
  },
  component: () => null,
});
