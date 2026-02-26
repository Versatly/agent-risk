import type { FastifyInstance } from "fastify";
import type { GameRegistry } from "../game-registry.js";

interface RegisterLobbyRoutesParams {
  app: FastifyInstance;
  registry: GameRegistry;
}

export async function registerLobbyRoutes({
  app,
  registry,
}: RegisterLobbyRoutesParams) {
  app.get("/api/lobbies", async () => ({
    lobbies: registry.listOpenLobbies(),
  }));

  app.post("/api/lobbies", async (request, reply) => {
    const body = request.body as { hostName?: string; maxPlayers?: number };
    const hostName = body.hostName?.trim();
    if (!hostName) {
      return reply.code(400).send({
        message: "hostName is required.",
      });
    }

    const maxPlayers = Math.max(2, Math.min(6, Number(body.maxPlayers ?? 6)));
    const created = registry.createLobby(hostName, maxPlayers);

    return reply.code(201).send({
      lobby: created.session.getLobbySummary(),
      join: created.joinResponse,
    });
  });

  app.post("/api/lobbies/:lobbyCode/join", async (request, reply) => {
    const params = request.params as { lobbyCode: string };
    const body = request.body as {
      playerName?: string;
      kind?: "human" | "bot" | "agent";
    };

    const playerName = body.playerName?.trim();
    if (!playerName) {
      return reply.code(400).send({
        message: "playerName is required.",
      });
    }

    const joined = registry.joinByCode(
      params.lobbyCode,
      playerName,
      body.kind ?? "human",
    );
    if (!joined) {
      return reply.code(404).send({
        message: "Lobby not found or full.",
      });
    }

    return {
      lobby: joined.session.getLobbySummary(),
      join: joined.joinResponse,
    };
  });
}
