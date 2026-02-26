# Implemented Rules (MVP)

This document defines the exact mechanics currently implemented.

## Board

- 42 territories
- 6 continents
- Standard adjacency graph
- Standard continent bonuses:
  - North America: 5
  - South America: 2
  - Europe: 5
  - Africa: 3
  - Asia: 7
  - Australia: 2

## Setup

1. Players claim unowned territories in turn order.
2. Each claim places exactly 1 troop.
3. After all territories are claimed, setup reinforcement starts.
4. Players place remaining starting troops in turn order.
5. When all setup pools are depleted, normal gameplay begins.

## Turn Phases

### Reinforce

- Base reinforcement: `max(3, floor(territories / 3))`
- + continent bonuses for fully controlled continents
- Card trade-ins may be performed in reinforce phase
- Player places troops onto owned territories

### Attack

- Attack from an owned territory with at least 2 troops
- Target must be adjacent and enemy-owned
- Attacker uses 1–3 dice (bounded by troops - 1)
- Defender uses 1–2 dice (bounded by territory troops)
- Dice compare highest-to-highest, ties favor defender

### Occupy (after conquest)

- Triggered when defender troops drop to 0
- Captured territory owner changes to attacker
- Attacker must move troops from source to target:
  - minimum = attacking dice used
  - maximum = source troops - 1

### Fortify

- Optional troop move between connected owned territories
- At least 1 troop must remain in source territory
- After fortify, turn ends immediately
- If no fortify, explicit `end_turn` can be used

## Cards

- 42 territory cards + 2 wild cards
- Valid trade set:
  - 3 of same kind, or
  - 1 infantry + 1 cavalry + 1 artillery,
  - wild can substitute
- Trade bonus progression:
  - 4, 6, 8, 10, 12, 15, then +5 per subsequent trade
- If player conquers at least one territory in turn, they draw one card at turn end

## Elimination & Victory

- Player is eliminated when territory count reaches 0
- Eliminated player’s cards transfer to eliminator
- Winner is the last non-eliminated player
- Game phase becomes `game_over`

## Known MVP Simplifications

- No mission/objective variants; only world domination victory.
- No persistent saves or replay timeline storage beyond current in-memory state.
