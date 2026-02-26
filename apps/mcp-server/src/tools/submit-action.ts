import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { submitAction } from "../client.js";

export function registerSubmitActionTool(server: McpServer) {
  server.registerTool(
    "submit_action",
    {
      description:
        "Submit a fully specified Risk action payload for the current player.",
      inputSchema: {
        gameId: z.string().min(1),
        playerId: z.string().min(1),
        playerSecret: z.string().min(1),
        action: z.object({
          type: z.string().min(1),
        }).passthrough(),
      },
    },
    async ({ gameId, playerId, playerSecret, action }) => {
      const result = await submitAction({
        gameId,
        playerId,
        playerSecret,
        action: action as never,
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
