# MVP Validation Matrix

Validation was run against a live local server at `http://127.0.0.1:4242` using real runtime flows.

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

## Scenario 2 — Human vs Bot (runtime smoke)

Method:
- Create lobby (human host)
- Add bot seat
- Start game
- Submit one human setup action and wait for bot tick

Observed result:

```json
{
  "scenario": "human_vs_bot",
  "createStatus": 201,
  "addBotStatus": 200,
  "startStatus": 200,
  "hostClaimStatus": 200,
  "botTerritories": 1,
  "phase": "setup_claim"
}
```

This confirms autonomous bot turns are executing against live server state.

## Scenario 3 — Human vs MCP Agent (runtime smoke via MCP tools)

Method:
- Create lobby as human via REST
- Join as agent via MCP `join_game`
- Start game via MCP `start_game`
- Human submits one claim via REST
- Agent reads legal actions via MCP and submits claim via MCP `submit_action`

Observed result:

```json
{
  "scenario": "human_vs_mcp_agent",
  "createStatus": 201,
  "startPhase": "setup_claim",
  "humanClaimStatus": 200,
  "legalCount": 1,
  "beforeOwner": null,
  "afterOwner": "KSNfAk0ivgON",
  "mcpActionHasPublicState": true
}
```

## Scenario 4 — Agent vs Agent (two MCP clients, runtime smoke)

Method:
- MCP client A creates game via `create_game`
- MCP client B joins via `join_game`
- Start via MCP `start_game`
- Agent A performs first claim
- Agent B fetches legal actions and performs second claim

Observed result:

```json
{
  "scenario": "agent_vs_agent_mcp",
  "initialCurrentPlayer": "WJM2wcAm3LUC",
  "afterAClaimCurrentPlayer": "CxRb8oC5mDXG",
  "bLegalCount": 1,
  "owners": {
    "alaska": "WJM2wcAm3LUC",
    "greenland": "CxRb8oC5mDXG"
  },
  "phase": "setup_claim"
}
```

## Additional Automated Validation

- `npm run typecheck` ✅
- `npm run test` ✅
  - game engine tests: 5
  - server integration tests: 1
- `npm run build` ✅
