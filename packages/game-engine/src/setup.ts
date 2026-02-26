import type { BattleLogEntry, PlayerKind } from "@risk/shared-types";
import { TERRITORY_IDS } from "./constants.js";
import { createStandardDeck } from "./cards.js";
import type { EnginePlayerState, EngineState } from "./types.js";

export interface NewPlayerInput {
  id: string;
  name: string;
  color: string;
  kind: PlayerKind;
}

interface CreateInitialStateParams {
  gameId: string;
  lobbyCode: string;
  players: NewPlayerInput[];
}

export function createInitialGameState(params: CreateInitialStateParams): EngineState {
  const now = Date.now();
  const initialTroops = getInitialTroopsForPlayerCount(params.players.length);

  const players: EnginePlayerState[] = params.players.map((player) => ({
    id: player.id,
    name: player.name,
    color: player.color,
    kind: player.kind,
    territories: 0,
    troopsOnBoard: 0,
    reinforcementPool: initialTroops,
    cards: [],
    isEliminated: false,
    hasConqueredThisTurn: false,
  }));

  const territories = Object.fromEntries(
    TERRITORY_IDS.map((territoryId) => [
      territoryId,
      {
        id: territoryId,
        ownerId: null,
        troops: 0,
      },
    ]),
  ) as EngineState["territories"];

  const initialLog: BattleLogEntry = {
    id: `log_${now}`,
    playerId: players[0].id,
    phase: "setup_claim",
    message: "Game started. Claim territories to begin.",
    timestamp: now,
  };

  return {
    gameId: params.gameId,
    lobbyCode: params.lobbyCode,
    createdAt: now,
    startedAt: now,
    round: 1,
    currentPlayerId: players[0].id,
    currentPhase: "setup_claim",
    players,
    territories,
    deck: createStandardDeck(),
    pendingOccupation: null,
    lastBattle: null,
    battleLog: [initialLog],
    winnerId: null,
  };
}

export function getInitialTroopsForPlayerCount(playerCount: number): number {
  const lookup: Record<number, number> = {
    2: 40,
    3: 35,
    4: 30,
    5: 25,
    6: 20,
  };

  return lookup[playerCount] ?? 20;
}

export function getNextActivePlayerId(
  state: EngineState,
  currentPlayerId: string,
): string {
  const activePlayers = state.players.filter((player) => !player.isEliminated);
  const currentIndex = activePlayers.findIndex((player) => player.id === currentPlayerId);
  if (currentIndex === -1 || activePlayers.length === 0) {
    return currentPlayerId;
  }

  const nextIndex = (currentIndex + 1) % activePlayers.length;
  return activePlayers[nextIndex].id;
}
