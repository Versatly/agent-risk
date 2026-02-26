import type { FastifyInstance } from "fastify";
import type { Server as SocketServer } from "socket.io";
import type { RiskAction } from "@risk/shared-types";
import type { GameRegistry } from "../game-registry.js";
import { broadcastSessionState } from "../socket/broadcast.js";

interface RegisterGameRoutesParams {
  app: FastifyInstance;
  registry: GameRegistry;
  io: SocketServer;
}

export async function registerGameRoutes({
  app,
  registry,
  io,
}: RegisterGameRoutesParams) {
  app.get("/api/games/open", async () => ({
    games: registry.listOpenLobbies(),
  }));

  app.post("/api/games/:gameId/add-bot", async (request, reply) => {
    const params = request.params as { gameId: string };
    const body = request.body as { botName?: string };

    const result = registry.addBot(params.gameId, body.botName ?? "CPU");
    if (!result) {
      return reply.code(404).send({
        message: "Game not found or full.",
      });
    }

    return {
      lobby: result.session.getLobbySummary(),
      join: result.joinResponse,
    };
  });

  app.post("/api/games/:gameId/start", async (request, reply) => {
    const params = request.params as { gameId: string };
    const started = registry.startGame(params.gameId);
    if (!started) {
      return reply.code(404).send({
        message: "Game not found or cannot be started.",
      });
    }

    const session = registry.getSession(params.gameId)!;
    broadcastSessionState(io, registry, session);
    return {
      state: session.getPublicState(),
    };
  });

  app.get("/api/games/:gameId/state", async (request, reply) => {
    const params = request.params as { gameId: string };
    const query = request.query as { playerId?: string; playerSecret?: string };
    const session = registry.getSession(params.gameId);
    if (!session) {
      return reply.code(404).send({
        message: "Game not found.",
      });
    }

    if (query.playerId && query.playerSecret) {
      const result = session.getPrivateState(query.playerId, query.playerSecret);
      if (result.error) {
        return reply.code(401).send(result.error);
      }

      return {
        state: result.state,
      };
    }

    return {
      state: session.getPublicState(),
    };
  });

  app.get("/api/games/:gameId/legal-actions", async (request, reply) => {
    const params = request.params as { gameId: string };
    const query = request.query as { playerId?: string; playerSecret?: string };
    const session = registry.getSession(params.gameId);
    if (!session) {
      return reply.code(404).send({
        message: "Game not found.",
      });
    }

    if (!query.playerId || !query.playerSecret) {
      return reply.code(400).send({
        message: "playerId and playerSecret are required.",
      });
    }

    const result = session.getLegalActions(query.playerId, query.playerSecret);
    if (result.error) {
      return reply.code(401).send(result.error);
    }

    return {
      actions: result.actions,
    };
  });

  app.post("/api/games/:gameId/action", async (request, reply) => {
    const params = request.params as { gameId: string };
    const body = request.body as {
      playerId?: string;
      playerSecret?: string;
      action?: RiskAction;
    };

    const session = registry.getSession(params.gameId);
    if (!session) {
      return reply.code(404).send({
        code: "GAME_NOT_FOUND",
        message: "Game not found.",
      });
    }

    if (!body.playerId || !body.playerSecret || !body.action) {
      return reply.code(400).send({
        message: "playerId, playerSecret and action are required.",
      });
    }

    const result = session.applyAction(
      body.playerId,
      body.playerSecret,
      body.action,
    );
    if (!result.ok) {
      return reply.code(400).send(result.error);
    }

    broadcastSessionState(io, registry, session);
    return {
      state: session.getPrivateState(body.playerId, body.playerSecret).state,
      publicState: session.getPublicState(),
    };
  });

  app.post("/api/games/:gameId/end-turn", async (request, reply) => {
    const params = request.params as { gameId: string };
    const body = request.body as { playerId?: string; playerSecret?: string };
    if (!body.playerId || !body.playerSecret) {
      return reply.code(400).send({
        message: "playerId and playerSecret are required.",
      });
    }

    const session = registry.getSession(params.gameId);
    if (!session) {
      return reply.code(404).send({
        code: "GAME_NOT_FOUND",
        message: "Game not found.",
      });
    }

    const result = session.applyAction(body.playerId, body.playerSecret, {
      type: "end_turn",
    });
    if (!result.ok) {
      return reply.code(400).send(result.error);
    }

    broadcastSessionState(io, registry, session);
    return {
      state: session.getPrivateState(body.playerId, body.playerSecret).state,
      publicState: session.getPublicState(),
    };
  });
}
