import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { startGame } from "../client.js";

export function registerStartGameTool(server: McpServer) {
  server.registerTool(
    "start_game",
    {
      description: "Start a lobby once enough players have joined.",
      inputSchema: {
        gameId: z.string().min(1),
      },
    },
    async ({ gameId }) => {
      const result = await startGame(gameId);
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
