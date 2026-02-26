# Skill: Risk Agent Turn Strategy

Use this skill for any MCP-connected agent participating in a game.

## Inputs Required

- `gameId`
- `playerId`
- `playerSecret`

## Mandatory Loop

1. Call `get_game_state`
2. Verify:
   - it is your turn (`currentPlayerId === playerId`)
   - game is not over (`winnerId == null`)
3. Call `get_legal_actions`
4. Choose exactly one legal action
5. Submit with `submit_action` (or `end_turn`)
6. Repeat

## Decision Policy by Phase

### setup_claim
- Prefer territories with high connectivity (future attack flexibility).

### setup_reinforce / reinforce
- Prioritize frontline territories (owned territories adjacent to enemies).
- Trade cards only when valid and beneficial to immediate board pressure.

### attack
- Attack only when source troop advantage is meaningful.
- Prefer targets that:
  1. complete a continent,
  2. isolate an enemy front,
  3. eliminate a weak opponent.
- If no favorable attacks, `end_attack`.

### occupy
- Move enough troops to hold captured territory while preserving source defense.

### fortify
- Move troops from safe interior to threatened border.
- If no useful fortify route, `end_turn`.

## Safety Rules

- Never fabricate actions outside `get_legal_actions`.
- Never reuse another player’s credentials.
- If action rejected, re-fetch state + legal actions before retry.
