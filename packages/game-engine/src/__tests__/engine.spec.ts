import { describe, expect, it } from "vitest";
import {
  createGameState,
  applyGameAction,
  calculateTerritoryReinforcement,
  calculateContinentReinforcement,
  resolveAttack,
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
});
