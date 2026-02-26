import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServerApp } from "../app.js";

interface JoinPayload {
  gameId: string;
  lobbyCode: string;
  playerId: string;
  playerSecret: string;
}

describe("server lobby and game flow", () => {
  let app: FastifyInstance;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const runtime = await createServerApp(10_000);
    app = runtime.app;
    close = runtime.close;
    await app.ready();
  });

  afterAll(async () => {
    await close();
  });

  it("creates lobby, joins player, starts game and applies action", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/lobbies",
      payload: {
        hostName: "Host",
        maxPlayers: 3,
      },
    });
    expect(createResponse.statusCode).toBe(201);

    const created = createResponse.json() as {
      join: JoinPayload;
    };

    const joinResponse = await app.inject({
      method: "POST",
      url: `/api/lobbies/${created.join.lobbyCode}/join`,
      payload: {
        playerName: "Guest",
      },
    });
    expect(joinResponse.statusCode).toBe(200);

    const startResponse = await app.inject({
      method: "POST",
      url: `/api/games/${created.join.gameId}/start`,
      payload: {},
    });
    expect(startResponse.statusCode).toBe(200);

    const actionResponse = await app.inject({
      method: "POST",
      url: `/api/games/${created.join.gameId}/action`,
      payload: {
        playerId: created.join.playerId,
        playerSecret: created.join.playerSecret,
        action: {
          type: "claim_territory",
          territoryId: "alaska",
        },
      },
    });

    expect(actionResponse.statusCode).toBe(200);
    const actionPayload = actionResponse.json() as {
      publicState: {
        territories: Record<string, { ownerId: string | null }>;
      };
    };
    expect(actionPayload.publicState.territories.alaska.ownerId).toBe(
      created.join.playerId,
    );
  });
});
