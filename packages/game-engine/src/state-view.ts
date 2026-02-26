import type {
  GameStatePrivate,
  GameStatePublic,
  PlayerStatePublic,
  TerritoryState,
} from "@risk/shared-types";
import type { EngineState } from "./types.js";
import { TERRITORY_IDS } from "./constants.js";

export function toPublicState(state: EngineState): GameStatePublic {
  const players: PlayerStatePublic[] = state.players.map((player) => ({
    id: player.id,
    name: player.name,
    color: player.color,
    kind: player.kind,
    territories: player.territories,
    troopsOnBoard: player.troopsOnBoard,
    reinforcementPool: player.reinforcementPool,
    cardsCount: player.cards.length,
    isEliminated: player.isEliminated,
  }));

  const territories = Object.fromEntries(
    TERRITORY_IDS.map((territoryId) => {
      const territory = state.territories[territoryId];
      const mapped: TerritoryState = {
        id: territory.id,
        ownerId: territory.ownerId,
        troops: territory.troops,
      };
      return [territoryId, mapped];
    }),
  );

  return {
    gameId: state.gameId,
    lobbyCode: state.lobbyCode,
    createdAt: state.createdAt,
    round: state.round,
    currentPlayerId: state.currentPlayerId,
    currentPhase: state.currentPhase,
    players,
    territories,
    pendingOccupation: state.pendingOccupation,
    battleLog: state.battleLog,
    winnerId: state.winnerId,
  };
}

export function toPrivateState(
  state: EngineState,
  playerId: string,
): GameStatePrivate | null {
  const me = state.players.find((player) => player.id === playerId);
  if (!me) {
    return null;
  }

  return {
    ...toPublicState(state),
    me: {
      id: me.id,
      name: me.name,
      color: me.color,
      kind: me.kind,
      territories: me.territories,
      troopsOnBoard: me.troopsOnBoard,
      reinforcementPool: me.reinforcementPool,
      cardsCount: me.cards.length,
      cards: [...me.cards],
      isEliminated: me.isEliminated,
    },
  };
}
