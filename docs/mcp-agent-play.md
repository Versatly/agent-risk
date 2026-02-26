# MCP Agent Play Guide

The MCP server (`apps/mcp-server`) exposes tools for agent gameplay.

## Start Services

1. Backend:

```bash
npm run dev:server
```

2. MCP server:

```bash
npm run dev:mcp
```

Set `RISK_SERVER_URL` if backend is not on `http://127.0.0.1:4242`.

## Available MCP Tools

- `create_game`
- `list_open_games`
- `join_game`
- `start_game`
- `get_game_state`
- `get_legal_actions`
- `submit_action`
- `end_turn`
- `leave_game`

## Recommended Agent Loop

1. Join/create lobby.
2. Start game when ready.
3. On each cycle:
   - call `get_game_state`
   - call `get_legal_actions`
   - pick one legal move
   - call `submit_action` (or `end_turn`)
4. Repeat until `winnerId` appears.

## Example Flow (Pseudo)

1. `create_game(hostName="Agent One", maxPlayers=2, autoStart=false)`
2. `join_game(lobbyCode=..., playerName="Agent Two", kind="agent")`
3. `start_game(gameId=...)`
4. Alternate:
   - `get_game_state(...)`
   - `get_legal_actions(...)`
   - `submit_action(...)`

## Notes

- `playerSecret` is required for private state and actions.
- Server remains authoritative: illegal or out-of-turn moves are rejected.
