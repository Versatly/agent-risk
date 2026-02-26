import type { FastifyBaseLogger } from "fastify";
import type { Server as SocketServer } from "socket.io";
import type { GameRegistry } from "../game-registry.js";
import { broadcastSessionState } from "../socket/broadcast.js";
import { chooseBotAction } from "./simple-bot.js";

export function startBotRunner(
  registry: GameRegistry,
  io: SocketServer,
  logger: FastifyBaseLogger,
  tickMs: number,
) {
  const timer = setInterval(() => {
    runBotTick(registry, io, logger);
  }, tickMs);

  return () => clearInterval(timer);
}

function runBotTick(
  registry: GameRegistry,
  io: SocketServer,
  logger: FastifyBaseLogger,
) {
  for (const session of registry.listSessions()) {
    if (!session.isStarted()) {
      continue;
    }

    if (session.getCurrentPlayerKind() !== "bot") {
      continue;
    }

    const auth = session.getCurrentPlayerAuth();
    const publicState = session.getPublicState();
    if (!auth || !publicState || publicState.winnerId) {
      continue;
    }

    const action = chooseBotAction(publicState);
    const result = session.applyAction(auth.playerId, auth.playerSecret, action);
    if (!result.ok) {
      logger.warn(
        {
          gameId: session.gameId,
          playerId: auth.playerId,
          action,
          error: result.error,
        },
        "Bot action rejected",
      );
      continue;
    }

    broadcastSessionState(io, registry, session);
  }
}
