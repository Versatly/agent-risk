export const SOCKET_EVENTS = {
  auth: "session:auth",
  authenticated: "session:authenticated",
  statePublic: "state:public",
  statePrivate: "state:private",
  actionError: "action:error",
} as const;

export interface SocketAuthPayload {
  gameId: string;
  playerId: string;
  playerSecret: string;
}
