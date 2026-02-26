import { CONTINENT_BONUSES, CONTINENTS } from "./constants.js";
import { isContinentControlledByPlayer } from "./board.js";
import type { EngineState } from "./types.js";

export function calculateTerritoryReinforcement(territoryCount: number): number {
  return Math.max(3, Math.floor(territoryCount / 3));
}

export function calculateContinentReinforcement(
  state: EngineState,
  playerId: string,
): number {
  return CONTINENTS.reduce((total, continentId) => {
    if (isContinentControlledByPlayer(state, continentId, playerId)) {
      return total + CONTINENT_BONUSES[continentId];
    }

    return total;
  }, 0);
}

export function calculateTotalReinforcements(
  state: EngineState,
  playerId: string,
): {
  territoryBonus: number;
  continentBonus: number;
  total: number;
} {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    return {
      territoryBonus: 0,
      continentBonus: 0,
      total: 0,
    };
  }

  const territoryBonus = calculateTerritoryReinforcement(player.territories);
  const continentBonus = calculateContinentReinforcement(state, playerId);

  return {
    territoryBonus,
    continentBonus,
    total: territoryBonus + continentBonus,
  };
}
