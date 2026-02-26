import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { endTurn } from "../client.js";

export function registerEndTurnTool(server: McpServer) {
  server.registerTool(
    "end_turn",
    {
      description:
        "End the current player's turn during fortify phase (or after choosing not to fortify).",
      inputSchema: {
        gameId: z.string().min(1),
        playerId: z.string().min(1),
        playerSecret: z.string().min(1),
      },
    },
    async ({ gameId, playerId, playerSecret }) => {
      const result = await endTurn({
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
