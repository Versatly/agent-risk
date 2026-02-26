import type { BattleOutcome } from "@risk/shared-types";
import { areAdjacent } from "./board.js";
import type { RandomSource, EngineState } from "./types.js";

interface CombatResult {
  state: EngineState;
  outcome: BattleOutcome;
  conquered: boolean;
  defenderId: string | null;
}

export function resolveAttack(
  state: EngineState,
  playerId: string,
  fromTerritoryId: string,
  toTerritoryId: string,
  attackDice: number,
  rng: RandomSource,
): CombatResult | null {
  const fromTerritory = state.territories[fromTerritoryId as keyof typeof state.territories];
  const toTerritory = state.territories[toTerritoryId as keyof typeof state.territories];
  if (!fromTerritory || !toTerritory) {
    return null;
  }

  if (!areAdjacent(fromTerritory.id, toTerritory.id)) {
    return null;
  }

  if (fromTerritory.ownerId !== playerId || toTerritory.ownerId === playerId) {
    return null;
  }

  if (fromTerritory.troops <= 1) {
    return null;
  }

  const maxAttackDice = Math.min(3, fromTerritory.troops - 1);
  if (attackDice < 1 || attackDice > maxAttackDice) {
    return null;
  }

  const defendDiceCount = Math.min(2, toTerritory.troops);
  const attackRolls = rollDice(attackDice, rng);
  const defendRolls = rollDice(defendDiceCount, rng);

  let attackerLosses = 0;
  let defenderLosses = 0;
  const rounds = Math.min(attackRolls.length, defendRolls.length);

  for (let index = 0; index < rounds; index += 1) {
    if (attackRolls[index] > defendRolls[index]) {
      defenderLosses += 1;
    } else {
      attackerLosses += 1;
    }
  }

  const nextTerritories = {
    ...state.territories,
    [fromTerritory.id]: {
      ...fromTerritory,
      troops: fromTerritory.troops - attackerLosses,
    },
    [toTerritory.id]: {
      ...toTerritory,
      troops: toTerritory.troops - defenderLosses,
    },
  };

  let conquered = false;
  if (nextTerritories[toTerritory.id].troops <= 0) {
    conquered = true;
    nextTerritories[toTerritory.id] = {
      ...nextTerritories[toTerritory.id],
      ownerId: playerId,
      troops: 0,
    };
  }

  const nextPlayers = state.players.map((player) => {
    if (player.id === playerId) {
      return {
        ...player,
        troopsOnBoard: player.troopsOnBoard - attackerLosses,
        territories: conquered ? player.territories + 1 : player.territories,
      };
    }

    if (player.id === toTerritory.ownerId) {
      return {
        ...player,
        troopsOnBoard: player.troopsOnBoard - defenderLosses,
        territories: conquered ? player.territories - 1 : player.territories,
      };
    }

    return player;
  });

  const outcome: BattleOutcome = {
    fromTerritoryId: fromTerritory.id,
    toTerritoryId: toTerritory.id,
    attackDice: attackRolls,
    defendDice: defendRolls,
    attackerLosses,
    defenderLosses,
    conquered,
    timestamp: Date.now(),
  };

  return {
    state: {
      ...state,
      players: nextPlayers,
      territories: nextTerritories,
      lastBattle: outcome,
    },
    outcome,
    conquered,
    defenderId: toTerritory.ownerId,
  };
}

function rollDice(count: number, rng: RandomSource): number[] {
  const values = Array.from({ length: count }, () =>
    Math.min(6, Math.max(1, Math.floor(rng.nextDie()))),
  );
  values.sort((a, b) => b - a);
  return values;
}
