import { createFileRoute, redirect } from "@tanstack/react-router";

// Achievements now live inside the Almanac (Almanac → Achievements tab).
// This route is kept as a redirect so existing links/bookmarks continue to work.
export const Route = createFileRoute("/portal/achievements")({
  beforeLoad: () => {
    throw redirect({ to: "/portal/almanac" });
  },
});
