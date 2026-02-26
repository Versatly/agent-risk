import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listOpenGames } from "../client.js";

export function registerListGamesTool(server: McpServer) {
  server.registerTool(
    "list_open_games",
    {
      description: "List all open Risk lobbies that are waiting to start.",
      inputSchema: {},
    },
    async () => {
      const result = await listOpenGames();
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
