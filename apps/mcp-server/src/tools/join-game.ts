import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { joinGame } from "../client.js";

export function registerJoinGameTool(server: McpServer) {
  server.registerTool(
    "join_game",
    {
      description:
        "Join an existing Risk lobby by lobby code. Returns player credentials.",
      inputSchema: {
        lobbyCode: z.string().min(4),
        playerName: z.string().min(1),
        kind: z.enum(["human", "bot", "agent"]).default("agent"),
      },
    },
    async ({ lobbyCode, playerName, kind }) => {
      const result = await joinGame({
        lobbyCode: lobbyCode.toUpperCase(),
        playerName,
        kind,
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
