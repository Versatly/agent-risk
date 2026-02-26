import { describe, expect, it } from "vitest";
import {
  createGameState,
  applyGameAction,
  calculateTerritoryReinforcement,
  calculateContinentReinforcement,
  resolveAttack,
  ADJACENCY,
  SeededRandomSource,
  type TerritoryId,
} from "../index.js";
import type { RandomSource } from "../types.js";

class FixedDice implements RandomSource {
  private readonly values: number[];
  private index = 0;

  constructor(values: number[]) {
    this.values = values;
  }

  nextDie(): number {
    const value = this.values[this.index % this.values.length];
    this.index += 1;
    return value;
  }
}

describe("game engine core", () => {
  it("creates initial game state in setup claim phase", () => {
    const state = createGameState({
      gameId: "test_game",
      lobbyCode: "TST001",
      players: [
        { id: "p1", name: "Alpha", kind: "human" },
        { id: "p2", name: "Bravo", kind: "human" },
        { id: "p3", name: "Charlie", kind: "bot" },
      ],
    });

    expect(state.currentPhase).toBe("setup_claim");
    expect(Object.keys(state.territories)).toHaveLength(42);
    expect(state.players[0].reinforcementPool).toBe(35);
    expect(
      Object.values(state.territories).every((territory) => territory.ownerId === null),
    ).toBe(true);
  });

  it("claims an unowned territory and passes turn", () => {
    const state = createGameState({
      gameId: "test_claim",
      lobbyCode: "TST002",
      players: [
        { id: "p1", name: "Alpha", kind: "human" },
        { id: "p2", name: "Bravo", kind: "human" },
      ],
    });

    const result = applyGameAction(
      state,
      "p1",
      { type: "claim_territory", territoryId: "alaska" },
      new FixedDice([6]),
    );

    expect(result.ok).toBe(true);
    expect(result.state.territories.alaska.ownerId).toBe("p1");
    expect(result.state.territories.alaska.troops).toBe(1);
    expect(result.state.currentPlayerId).toBe("p2");
  });

  it("calculates reinforcements and continent bonus correctly", () => {
    const state = createGameState({
      gameId: "test_reinforce",
      lobbyCode: "TST003",
      players: [
        { id: "p1", name: "Alpha", kind: "human" },
        { id: "p2", name: "Bravo", kind: "human" },
      ],
    });

    for (const territoryId of ["alaska", "northwest_territory", "greenland", "alberta", "ontario", "quebec", "western_united_states", "eastern_united_states", "central_america"] as const) {
      state.territories[territoryId].ownerId = "p1";
      state.territories[territoryId].troops = 3;
    }

    state.players[0].territories = 9;
    const base = calculateTerritoryReinforcement(9);
    const continent = calculateContinentReinforcement(state, "p1");

    expect(base).toBe(3);
    expect(continent).toBe(5);
  });

  it("resolves attack dice and conquest correctly", () => {
    const state = createGameState({
      gameId: "test_attack",
      lobbyCode: "TST004",
      players: [
        { id: "p1", name: "Alpha", kind: "human" },
        { id: "p2", name: "Bravo", kind: "human" },
      ],
    });

    state.currentPhase = "attack";
    state.currentPlayerId = "p1";
    state.territories.alaska.ownerId = "p1";
    state.territories.alaska.troops = 4;
    state.territories.northwest_territory.ownerId = "p2";
    state.territories.northwest_territory.troops = 1;
    state.players[0].territories = 1;
    state.players[1].territories = 1;
    state.players[0].troopsOnBoard = 4;
    state.players[1].troopsOnBoard = 1;

    const combat = resolveAttack(
      state,
      "p1",
      "alaska",
      "northwest_territory",
      3,
      new FixedDice([6, 5, 4, 1]),
    );

    expect(combat).not.toBeNull();
    expect(combat?.outcome.conquered).toBe(true);
    expect(combat?.state.territories.northwest_territory.ownerId).toBe("p1");
    expect(combat?.state.pendingOccupation).toBeNull();
  });

  it("simulates to a winner with deterministic bot policy", () => {
    let state = createGameState({
      gameId: "test_full_game",
      lobbyCode: "TST999",
      players: [
        { id: "p1", name: "Alpha", kind: "bot" },
        { id: "p2", name: "Bravo", kind: "bot" },
      ],
    });

    const rng = new SeededRandomSource(42);
    const maxActions = 20_000;

    for (let step = 0; step < maxActions && !state.winnerId; step += 1) {
      const currentPlayer = state.currentPlayerId;
      const action = choosePolicyAction(state, currentPlayer);
      const result = applyGameAction(state, currentPlayer, action, rng);
      if (!result.ok) {
        throw new Error(`Policy produced invalid action: ${JSON.stringify(action)}`);
      }
      state = result.state;
    }

    expect(state.winnerId).not.toBeNull();
    expect(state.currentPhase).toBe("game_over");
  });
});

function choosePolicyAction(state: ReturnType<typeof createGameState>, playerId: string) {
  const territories = Object.values(state.territories);
  const mine = territories.filter((territory) => territory.ownerId === playerId);

  switch (state.currentPhase) {
    case "setup_claim": {
      const unowned = territories.find((territory) => territory.ownerId === null);
      return {
        type: "claim_territory" as const,
        territoryId: unowned?.id ?? territories[0].id,
      };
    }
    case "setup_reinforce":
    case "reinforce": {
      const frontline = mine
        .slice()
        .sort((a, b) => pressure(state, b.id) - pressure(state, a.id))[0];
      const troops = Math.max(1, state.players.find((player) => player.id === playerId)?.reinforcementPool ?? 1);
      return {
        type: "place_troops" as const,
        territoryId: frontline?.id ?? mine[0].id,
        troops,
      };
    }
    case "attack": {
      for (const source of mine) {
        if (source.troops < 2) {
          continue;
        }
        const neighbors = ADJACENCY[source.id as TerritoryId] as string[];
        const target = neighbors
          .map((neighborId) => state.territories[neighborId as TerritoryId])
          .find(
            (territory) =>
              territory.ownerId !== playerId && source.troops > territory.troops,
          );
        if (target) {
          return {
            type: "attack" as const,
            fromTerritoryId: source.id,
            toTerritoryId: target.id,
            attackDice: Math.min(3, source.troops - 1),
          };
        }
      }
      return { type: "end_attack" as const };
    }
    case "occupy":
      return {
        type: "occupy" as const,
        troops: state.pendingOccupation?.minTroops ?? 1,
      };
    case "fortify": {
      const source = mine.find((territory) => territory.troops > 1);
      if (!source) {
        return { type: "end_turn" as const };
      }

      const destination = (ADJACENCY[source.id as TerritoryId] as string[])
        .map((neighborId) => state.territories[neighborId as TerritoryId])
        .find((territory) => territory.ownerId === playerId);

      if (!destination) {
        return { type: "end_turn" as const };
      }

      return {
        type: "fortify" as const,
        fromTerritoryId: source.id,
        toTerritoryId: destination.id,
        troops: 1,
      };
    }
    case "game_over":
    default:
      return { type: "end_turn" as const };
  }
}

function pressure(state: ReturnType<typeof createGameState>, territoryId: string) {
  const territory = state.territories[territoryId as TerritoryId];
  const neighbors = ADJACENCY[territory.id as TerritoryId] as string[];
  return neighbors.reduce((total, neighborId) => {
    return total + (state.territories[neighborId as TerritoryId].ownerId === territory.ownerId ? 0 : 1);
  }, 0);
}
