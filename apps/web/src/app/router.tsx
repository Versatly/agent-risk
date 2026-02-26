import type { SessionCredentials } from "../store/lobby-store";

export type AppRoute = "lobby" | "game";

export function resolveRoute(credentials: SessionCredentials | null): AppRoute {
  return credentials ? "game" : "lobby";
}
