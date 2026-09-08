import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

import { ADMIN_COOKIE, ADMIN_SESSION, PLAYER_COOKIE, PLAYER_SESSION } from "./session.constants";
import type { CrewSession } from "./session.constants";

export const getCrewSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<CrewSession> => ({
    isAdmin: getCookie(ADMIN_COOKIE) === ADMIN_SESSION,
    isPlayer: getCookie(PLAYER_COOKIE) === PLAYER_SESSION,
  }),
);
