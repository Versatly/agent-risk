import { io, type Socket } from "socket.io-client";
import type { GameStatePrivate, GameStatePublic } from "@risk/shared-types";
import { getApiBaseUrl } from "./api";

export interface SessionAuth {
  gameId: string;
  playerId: string;
  playerSecret: string;
}

export interface RiskSocketEvents {
  onPublicState: (state: GameStatePublic) => void;
  onPrivateState: (state: GameStatePrivate) => void;
  onActionError: (error: { message?: string }) => void;
}

export function connectGameSocket(
  auth: SessionAuth,
  events: RiskSocketEvents,
): Socket {
  const socket = io(getApiBaseUrl(), {
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    socket.emit("session:auth", auth);
  });

  socket.on("state:public", events.onPublicState);
  socket.on("state:private", events.onPrivateState);
  socket.on("action:error", events.onActionError);

  return socket;
}
