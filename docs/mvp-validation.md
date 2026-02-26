# MVP Validation Matrix

Validation was run against live local servers using real runtime flows:

- `http://127.0.0.1:4242` (default bot cadence)
- `http://127.0.0.1:4243` (accelerated bot cadence for full completion matrix)

## Scenario 1 — Human vs Human (full game completion)

Method:
- Create lobby (human host)
- Join second human
- Start game
- Drive both players with legal policy actions through REST until game completion

Observed result:

```json
{
  "scenario": "human_vs_human_full",
  "steps": 319,
  "winner": "dmRS9MlNHcH-",
  "phase": "game_over",
  "round": 12,
  "territories": [
    { "name": "AutoHuman1", "territories": 42 },
    { "name": "AutoHuman2", "territories": 0 }
  ]
}
```

## Scenario 2 — Human vs Bot (full game completion)

Method:
- Create lobby (human host)
- Add bot seat
- Start game
- Drive human turns with legal policy actions while server bot runner executes bot turns
- Continue until game completion

Observed result:

```json
{
  "scenario": "human_vs_bot_full",
  "winner": "NuDDkjDr8yVF",
  "round": 7,
  "phase": "game_over",
  "loops": 322,
  "territories": [
    { "name": "FullHuman", "territories": 0 },
    { "name": "FullBot", "territories": 42 }
  ],
  "botId": "NuDDkjDr8yVF"
}
```

## Scenario 3 — Human vs MCP Agent (full game completion via MCP tools)

Method:
- Create lobby as human via REST
- Join as agent via MCP `join_game`
- Start game via MCP `start_game`
- Drive human turns via REST policy
- Drive agent turns via MCP (`get_game_state` + `submit_action`)
- Continue until game completion

Observed result:

```json
{
  "scenario": "human_vs_mcp_agent_full",
  "winner": "YmIlBmHx0DcQ",
  "round": 9,
  "phase": "game_over",
  "loops": 304,
  "territories": [
    { "name": "HumanVsMCP", "territories": 42 },
    { "name": "MCPAgent", "territories": 0 }
  ],
  "agentId": "tNGI_5l5OHZl"
}
```

## Scenario 4 — Agent vs Agent (full game completion via MCP)

Method:
- MCP client A creates game via `create_game`
- MCP client B joins via `join_game`
- Start via MCP `start_game`
- Drive both agent turns via MCP policy loops
- Continue until game completion

Observed result:

```json
{
  "scenario": "agent_vs_agent_full",
  "winner": "g7TjLY6Am9M3",
  "round": 14,
  "phase": "game_over",
  "loops": 433,
  "territories": [
    { "name": "AgentFullA", "territories": 0 },
    { "name": "AgentFullB", "territories": 42 }
  ],
  "agentA": "T6PVMkjp1kS6",
  "agentB": "g7TjLY6Am9M3"
}
```

## Additional Automated Validation

- `npm run typecheck` ✅
- `npm run test` ✅
  - game engine tests: 5
  - server integration tests: 1
- `npm run build` ✅
