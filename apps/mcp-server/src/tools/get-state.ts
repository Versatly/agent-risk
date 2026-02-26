import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { getGameState } from "../client.js";

export function registerGetStateTool(server: McpServer) {
  server.registerTool(
    "get_game_state",
    {
      description: "Fetch the current private game state for a specific player.",
      inputSchema: {
        gameId: z.string().min(1),
        playerId: z.string().min(1),
        playerSecret: z.string().min(1),
      },
    },
    async ({ gameId, playerId, playerSecret }) => {
      const result = await getGameState({
        gameId,
        playerId,
        playerSecret,
      });

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
