import { ADJACENCY, type ContinentId, CONTINENT_TERRITORIES, TERRITORY_IDS, TERRITORY_TO_CONTINENT, type TerritoryId } from "./constants.js";
import type { EngineState } from "./types.js";

export function isTerritoryId(value: string): value is TerritoryId {
  return TERRITORY_IDS.includes(value as TerritoryId);
}

export function areAdjacent(a: TerritoryId, b: TerritoryId): boolean {
  return ADJACENCY[a].includes(b);
}

export function getContinent(territoryId: TerritoryId): ContinentId {
  return TERRITORY_TO_CONTINENT[territoryId];
}

export function isContinentControlledByPlayer(
  state: EngineState,
  continentId: ContinentId,
  playerId: string,
): boolean {
  return CONTINENT_TERRITORIES[continentId].every(
    (territoryId) => state.territories[territoryId].ownerId === playerId,
  );
}

export function getConnectedTerritoriesForPlayer(
  state: EngineState,
  start: TerritoryId,
  playerId: string,
): Set<TerritoryId> {
  const visited = new Set<TerritoryId>();
  const stack: TerritoryId[] = [start];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) {
      continue;
    }

    if (state.territories[current].ownerId !== playerId) {
      continue;
    }

    visited.add(current);
    for (const neighbor of ADJACENCY[current]) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }

  return visited;
}
