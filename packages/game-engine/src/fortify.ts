import { getConnectedTerritoriesForPlayer } from "./board.js";
import type { EngineState } from "./types.js";
import type { TerritoryId } from "./constants.js";

export function canFortifyBetween(
  state: EngineState,
  playerId: string,
  fromTerritoryId: TerritoryId,
  toTerritoryId: TerritoryId,
): boolean {
  const fromTerritory = state.territories[fromTerritoryId];
  const toTerritory = state.territories[toTerritoryId];
  if (!fromTerritory || !toTerritory) {
    return false;
  }

  if (fromTerritory.ownerId !== playerId || toTerritory.ownerId !== playerId) {
    return false;
  }

  const connected = getConnectedTerritoriesForPlayer(state, fromTerritoryId, playerId);
  return connected.has(toTerritoryId);
}
