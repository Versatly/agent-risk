import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";

export function registerLeaveGameTool(server: McpServer) {
  server.registerTool(
    "leave_game",
    {
      description:
        "Signal that the agent is leaving a game session. This is currently advisory/no-op on server state.",
      inputSchema: {
        gameId: z.string().min(1),
        playerId: z.string().min(1),
      },
    },
    async ({ gameId, playerId }) => {
      return {
        content: [
          {
            type: "text",
            text: `Player ${playerId} acknowledged as left game ${gameId}.`,
          },
        ],
        structuredContent: {
          ok: true,
          gameId,
          playerId,
        },
      };
    },
  );
}
