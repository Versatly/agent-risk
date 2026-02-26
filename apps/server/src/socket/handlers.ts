import type { FastifyBaseLogger } from "fastify";
import type { Server as SocketServer, Socket } from "socket.io";
import type { RiskAction } from "@risk/shared-types";
import type { GameRegistry } from "../game-registry.js";
import { broadcastSessionState } from "./broadcast.js";
import { SOCKET_EVENTS, type SocketAuthPayload } from "./events.js";

const ACTION_SUBMIT_EVENT = "action:submit";

interface ActionSubmitPayload {
  gameId: string;
  playerId: string;
  playerSecret: string;
  action: RiskAction;
}

export function registerSocketHandlers(
  io: SocketServer,
  registry: GameRegistry,
  logger: FastifyBaseLogger,
) {
  io.on("connection", (socket) => {
    registerConnectionHandlers(io, socket, registry, logger);
  });
}

function registerConnectionHandlers(
  io: SocketServer,
  socket: Socket,
  registry: GameRegistry,
  logger: FastifyBaseLogger,
) {
  socket.on(SOCKET_EVENTS.auth, (payload: SocketAuthPayload) => {
    const session = registry.getSession(payload.gameId);
    if (!session) {
      socket.emit(SOCKET_EVENTS.actionError, {
        code: "GAME_NOT_FOUND",
        message: "Game session not found.",
      });
      return;
    }

    const authError = session.authorize(payload.playerId, payload.playerSecret);
    if (authError) {
      socket.emit(SOCKET_EVENTS.actionError, authError);
      return;
    }

    registry.attachSocket(socket.id, payload.gameId, payload.playerId);
    socket.join(payload.gameId);
    socket.emit(SOCKET_EVENTS.authenticated, {
      gameId: payload.gameId,
      playerId: payload.playerId,
      lobby: session.getLobbySummary(),
    });

    const privateState = session.getPrivateState(
      payload.playerId,
      payload.playerSecret,
    );
    if (privateState.state) {
      socket.emit(SOCKET_EVENTS.statePrivate, privateState.state);
    }

    if (session.getPublicState()) {
      socket.emit(SOCKET_EVENTS.statePublic, session.getPublicState());
    }
  });

  socket.on(ACTION_SUBMIT_EVENT, (payload: ActionSubmitPayload) => {
    const session = registry.getSession(payload.gameId);
    if (!session) {
      socket.emit(SOCKET_EVENTS.actionError, {
        code: "GAME_NOT_FOUND",
        message: "Game session not found.",
      });
      return;
    }

    const result = session.applyAction(
      payload.playerId,
      payload.playerSecret,
      payload.action,
    );
    if (!result.ok) {
      socket.emit(SOCKET_EVENTS.actionError, result.error);
      return;
    }

    broadcastSessionState(io, registry, session);
  });

  socket.on("disconnect", () => {
    logger.debug({ socketId: socket.id }, "Socket disconnected");
    registry.detachSocket(socket.id);
  });
}
