import type { RiskAction } from "@risk/shared-types";
import { getLegalActionHints } from "./actions.js";
import { PLAYER_COLORS } from "./constants.js";
import { DefaultRandomSource } from "./random.js";
import { applyAction } from "./reducer.js";
import { createInitialGameState } from "./setup.js";
import { toPrivateState, toPublicState } from "./state-view.js";
import type { EngineState, RandomSource } from "./types.js";

export interface CreateGamePlayer {
  id: string;
  name: string;
  color?: string;
  kind: "human" | "bot" | "agent";
}

export interface CreateGameInput {
  gameId: string;
  lobbyCode: string;
  players: CreateGamePlayer[];
}

export function createGameState(input: CreateGameInput): EngineState {
  const normalizedPlayers = input.players.map((player, index) => ({
    ...player,
    color: player.color ?? PLAYER_COLORS[index % PLAYER_COLORS.length],
  }));

  return createInitialGameState({
    gameId: input.gameId,
    lobbyCode: input.lobbyCode,
    players: normalizedPlayers,
  });
}

export function applyGameAction(
  state: EngineState,
  playerId: string,
  action: RiskAction,
  rng: RandomSource = new DefaultRandomSource(),
) {
  return applyAction({
    state,
    playerId,
    action,
    rng,
  });
}

export function getLegalActions(state: EngineState, playerId: string) {
  return getLegalActionHints({ state, playerId });
}

export function getPublicGameState(state: EngineState) {
  return toPublicState(state);
}

export function getPrivateGameState(state: EngineState, playerId: string) {
  return toPrivateState(state, playerId);
}
