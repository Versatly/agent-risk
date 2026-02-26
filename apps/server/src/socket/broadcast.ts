import type { Server as SocketServer } from "socket.io";
import type { GameSession } from "../game-session.js";
import type { GameRegistry } from "../game-registry.js";
import { SOCKET_EVENTS } from "./events.js";

export function broadcastSessionState(
  io: SocketServer,
  registry: GameRegistry,
  session: GameSession,
) {
  const publicState = session.getPublicState();
  if (!publicState) {
    return;
  }

  io.to(session.gameId).emit(SOCKET_EVENTS.statePublic, publicState);

  for (const seat of session.listSeats()) {
    const seatDetails = session.getSeat(seat.id);
    if (!seatDetails) {
      continue;
    }

    const privateState = session.getPrivateState(
      seat.id,
      seatDetails.playerSecret,
    );
    if (!privateState.state) {
      continue;
    }

    const sockets = registry.listSocketsForPlayer(session.gameId, seat.id);
    for (const socketId of sockets) {
      io.to(socketId).emit(SOCKET_EVENTS.statePrivate, privateState.state);
    }
  }
}
