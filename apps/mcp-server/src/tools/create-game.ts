import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createGame, startGame } from "../client.js";

export function registerCreateGameTool(server: McpServer) {
  server.registerTool(
    "create_game",
    {
      description:
        "Create a new Risk game lobby. Returns player credentials for the host.",
      inputSchema: {
        hostName: z.string().min(1),
        maxPlayers: z.number().int().min(2).max(6).default(6),
        autoStart: z.boolean().default(false),
      },
    },
    async ({ hostName, maxPlayers, autoStart }) => {
      const result = await createGame({ hostName, maxPlayers });
      if (autoStart) {
        await startGame(result.join.gameId);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      };
    },
  );
}
