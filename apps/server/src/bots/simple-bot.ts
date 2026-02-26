import type { GameStatePublic, RiskAction } from "@risk/shared-types";
import { ADJACENCY } from "@risk/game-engine";

export function chooseBotAction(state: GameStatePublic): RiskAction {
  const player = state.players.find((entry) => entry.id === state.currentPlayerId);
  if (!player) {
    return { type: "end_turn" };
  }

  switch (state.currentPhase) {
    case "setup_claim":
      return chooseSetupClaimAction(state);
    case "setup_reinforce":
    case "reinforce":
      return chooseReinforcementAction(state, player.id, player.reinforcementPool);
    case "attack":
      return chooseAttackAction(state, player.id);
    case "occupy":
      return chooseOccupyAction(state);
    case "fortify":
      return chooseFortifyAction(state, player.id);
    case "game_over":
    default:
      return { type: "end_turn" };
  }
}

function chooseSetupClaimAction(state: GameStatePublic): RiskAction {
  const unowned = Object.values(state.territories).find(
    (territory) => territory.ownerId === null,
  );

  if (!unowned) {
    return { type: "end_turn" };
  }

  return {
    type: "claim_territory",
    territoryId: unowned.id,
  };
}

function chooseReinforcementAction(
  state: GameStatePublic,
  playerId: string,
  reinforcements: number,
): RiskAction {
  if (reinforcements <= 0) {
    return state.currentPhase === "setup_reinforce"
      ? { type: "place_troops", territoryId: getAnyOwnedTerritory(state, playerId), troops: 1 }
      : { type: "end_attack" };
  }

  const target = findFrontlineTerritory(state, playerId) ?? getAnyOwnedTerritory(state, playerId);
  return {
    type: "place_troops",
    territoryId: target,
    troops: reinforcements,
  };
}

function chooseAttackAction(state: GameStatePublic, playerId: string): RiskAction {
  let best:
    | {
        from: string;
        to: string;
        score: number;
        attackDice: number;
      }
    | null = null;

  for (const territory of Object.values(state.territories)) {
    if (territory.ownerId !== playerId || territory.troops < 2) {
      continue;
    }

    for (const neighborId of ADJACENCY[territory.id as keyof typeof ADJACENCY]) {
      const neighbor = state.territories[neighborId];
      if (!neighbor || neighbor.ownerId === playerId) {
        continue;
      }

      const score = territory.troops - neighbor.troops;
      const attackDice = Math.min(3, territory.troops - 1);
      if (!best || score > best.score) {
        best = {
          from: territory.id,
          to: neighbor.id,
          score,
          attackDice,
        };
      }
    }
  }

  if (!best || best.score < 1) {
    return { type: "end_attack" };
  }

  return {
    type: "attack",
    fromTerritoryId: best.from,
    toTerritoryId: best.to,
    attackDice: best.attackDice,
  };
}

function chooseOccupyAction(state: GameStatePublic): RiskAction {
  if (!state.pendingOccupation) {
    return { type: "end_attack" };
  }

  const fromTroops = state.territories[state.pendingOccupation.fromTerritoryId]?.troops ?? 1;
  const preferred = Math.max(
    state.pendingOccupation.minTroops,
    Math.floor((fromTroops - 1) / 2),
  );
  const troops = Math.min(preferred, state.pendingOccupation.maxTroops);

  return {
    type: "occupy",
    troops: Math.max(state.pendingOccupation.minTroops, troops),
  };
}

function chooseFortifyAction(state: GameStatePublic, playerId: string): RiskAction {
  const candidateFrom = Object.values(state.territories)
    .filter((territory) => territory.ownerId === playerId && territory.troops > 1)
    .sort((a, b) => b.troops - a.troops)[0];

  if (!candidateFrom) {
    return { type: "end_turn" };
  }

  for (const neighborId of ADJACENCY[candidateFrom.id as keyof typeof ADJACENCY]) {
    const neighbor = state.territories[neighborId];
    if (neighbor?.ownerId === playerId) {
      return {
        type: "fortify",
        fromTerritoryId: candidateFrom.id,
        toTerritoryId: neighbor.id,
        troops: candidateFrom.troops - 1,
      };
    }
  }

  return { type: "end_turn" };
}

function findFrontlineTerritory(
  state: GameStatePublic,
  playerId: string,
): string | null {
  let best: { id: string; pressure: number } | null = null;

  for (const territory of Object.values(state.territories)) {
    if (territory.ownerId !== playerId) {
      continue;
    }

    let enemyNeighbors = 0;
    for (const neighborId of ADJACENCY[territory.id as keyof typeof ADJACENCY]) {
      if (state.territories[neighborId]?.ownerId !== playerId) {
        enemyNeighbors += 1;
      }
    }

    if (!best || enemyNeighbors > best.pressure) {
      best = {
        id: territory.id,
        pressure: enemyNeighbors,
      };
    }
  }

  return best?.id ?? null;
}

function getAnyOwnedTerritory(state: GameStatePublic, playerId: string): string {
  return (
    Object.values(state.territories).find((territory) => territory.ownerId === playerId)?.id ??
    Object.values(state.territories)[0].id
  );
}
