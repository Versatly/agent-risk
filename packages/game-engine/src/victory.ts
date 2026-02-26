import type { EngineState } from "./types.js";

export function findWinnerId(state: EngineState): string | null {
  const activePlayers = state.players.filter((player) => !player.isEliminated);
  if (activePlayers.length === 1) {
    return activePlayers[0].id;
  }

  return null;
}
