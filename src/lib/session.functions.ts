import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { validateSessionFromRequest } from "./playfab/session";

export interface CrewSession {
  playFabId: string;
  sessionTicket?: string;
  username: string;
  displayName: string;
  email: string;
  role: "admin" | "player";
}

/**
 * Server function to read the PlayFab session from cookies.
 * Safe to import and call anywhere — TanStack Start creates an RPC endpoint on client
 * and executes directly on the server.
 */
export const getCrewSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<CrewSession | null> => {
    try {
      const session = await validateSessionFromRequest(getRequest());
      if (!session) {
        return null;
      }

      return {
        playFabId: session.playFabId,
        username: session.username || session.displayName || "Player",
        displayName: session.displayName || "Player",
        email: session.email || "",
        role: session.role === "admin" ? "admin" : "player",
      };
    } catch {
      return null;
    }
  },
);

export const isAdminSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<boolean> => {
    const session = await getCrewSession();
    return session?.role === "admin";
  },
);

export const isPlayerSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<boolean> => {
    const session = await getCrewSession();
    return session != null;
  },
);
