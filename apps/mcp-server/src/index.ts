import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerCreateGameTool } from "./tools/create-game.js";
import { registerListGamesTool } from "./tools/list-games.js";
import { registerJoinGameTool } from "./tools/join-game.js";
import { registerStartGameTool } from "./tools/start-game.js";
import { registerGetStateTool } from "./tools/get-state.js";
import { registerGetLegalActionsTool } from "./tools/get-legal-actions.js";
import { registerSubmitActionTool } from "./tools/submit-action.js";
import { registerEndTurnTool } from "./tools/end-turn.js";
import { registerLeaveGameTool } from "./tools/leave-game.js";

const server = new McpServer(
  {
    name: "risk-browser-game-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      logging: {},
    },
  },
);

registerCreateGameTool(server);
registerListGamesTool(server);
registerJoinGameTool(server);
registerStartGameTool(server);
registerGetStateTool(server);
registerGetLegalActionsTool(server);
registerSubmitActionTool(server);
registerEndTurnTool(server);
registerLeaveGameTool(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server failed:", error);
  process.exit(1);
});
