import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server as SocketIOServer } from "socket.io";
import { SERVER_CONFIG } from "./config.js";
import { GameRegistry } from "./game-registry.js";
import { registerLobbyRoutes } from "./routes/lobbies.js";
import { registerGameRoutes } from "./routes/games.js";
import { registerSocketHandlers } from "./socket/handlers.js";
import { startBotRunner } from "./bots/bot-runner.js";

export async function createServerApp(botTickMs = SERVER_CONFIG.botTickMs) {
  const app = Fastify({
    logger: false,
  });

  const registry = new GameRegistry();
  await app.register(cors, {
    origin: SERVER_CONFIG.corsOrigin,
    credentials: true,
  });

  const io = new SocketIOServer(app.server, {
    cors: {
      origin: SERVER_CONFIG.corsOrigin,
      credentials: true,
    },
  });

  await registerLobbyRoutes({ app, registry });
  await registerGameRoutes({ app, registry, io });
  registerSocketHandlers(io, registry, app.log);

  const stopBots = startBotRunner(registry, io, app.log, botTickMs);

  app.get("/health", async () => ({
    ok: true,
    timestamp: Date.now(),
  }));

  async function close() {
    stopBots();
    io.close();
    await app.close();
  }

  return {
    app,
    io,
    registry,
    close,
  };
}
