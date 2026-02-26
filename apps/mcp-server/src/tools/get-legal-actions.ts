import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { getLegalActions } from "../client.js";

export function registerGetLegalActionsTool(server: McpServer) {
  server.registerTool(
    "get_legal_actions",
    {
      description:
        "Get legal action hints for the current player in their current phase.",
      inputSchema: {
        gameId: z.string().min(1),
        playerId: z.string().min(1),
        playerSecret: z.string().min(1),
      },
    },
    async ({ gameId, playerId, playerSecret }) => {
      const result = await getLegalActions({
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
