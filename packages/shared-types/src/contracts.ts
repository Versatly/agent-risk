export type PlayerKind = "human" | "bot" | "agent";

export type GamePhase =
  | "setup_claim"
  | "setup_reinforce"
  | "reinforce"
  | "attack"
  | "occupy"
  | "fortify"
  | "game_over";

export type CardKind = "infantry" | "cavalry" | "artillery" | "wild";

export interface TerritoryState {
  id: string;
  ownerId: string | null;
  troops: number;
}

export interface RiskCard {
  id: string;
  territoryId: string | null;
  kind: CardKind;
}

export interface PendingOccupation {
  fromTerritoryId: string;
  toTerritoryId: string;
  minTroops: number;
  maxTroops: number;
}

export interface BattleOutcome {
  fromTerritoryId: string;
  toTerritoryId: string;
  attackDice: number[];
  defendDice: number[];
  attackerLosses: number;
  defenderLosses: number;
  conquered: boolean;
  timestamp: number;
}

export interface BattleLogEntry {
  id: string;
  playerId: string;
  phase: GamePhase;
  message: string;
  timestamp: number;
  outcome?: BattleOutcome;
}

export interface PlayerStatePublic {
  id: string;
  name: string;
  color: string;
  kind: PlayerKind;
  territories: number;
  troopsOnBoard: number;
  reinforcementPool: number;
  cardsCount: number;
  isEliminated: boolean;
}

export interface PlayerStatePrivate extends PlayerStatePublic {
  cards: RiskCard[];
}

export interface GameStatePublic {
  gameId: string;
  lobbyCode: string;
  createdAt: number;
  round: number;
  currentPlayerId: string;
  currentPhase: GamePhase;
  players: PlayerStatePublic[];
  territories: Record<string, TerritoryState>;
  pendingOccupation: PendingOccupation | null;
  battleLog: BattleLogEntry[];
  winnerId: string | null;
}

export interface GameStatePrivate extends GameStatePublic {
  me: PlayerStatePrivate;
}

export type ActionErrorCode =
  | "GAME_NOT_ACTIVE"
  | "INVALID_PHASE"
  | "NOT_YOUR_TURN"
  | "ILLEGAL_ACTION"
  | "INVALID_TERRITORY"
  | "INSUFFICIENT_TROOPS"
  | "CARD_SET_INVALID"
  | "UNAUTHORIZED"
  | "GAME_NOT_FOUND";

export interface ActionError {
  code: ActionErrorCode;
  message: string;
}

export type RiskAction =
  | {
      type: "claim_territory";
      territoryId: string;
    }
  | {
      type: "place_troops";
      territoryId: string;
      troops: number;
    }
  | {
      type: "trade_cards";
      cardIds: string[];
    }
  | {
      type: "attack";
      fromTerritoryId: string;
      toTerritoryId: string;
      attackDice: number;
    }
  | {
      type: "occupy";
      troops: number;
    }
  | {
      type: "end_attack";
    }
  | {
      type: "fortify";
      fromTerritoryId: string;
      toTerritoryId: string;
      troops: number;
    }
  | {
      type: "end_turn";
    };

export interface LegalActionHint {
  type: RiskAction["type"];
  description: string;
  payloadShape: Record<string, string>;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  kind: PlayerKind;
  color: string;
  isReady: boolean;
}

export interface LobbySummary {
  gameId: string;
  lobbyCode: string;
  createdAt: number;
  startedAt: number | null;
  maxPlayers: number;
  players: LobbyPlayer[];
  isStarted: boolean;
}

export interface CreateGameRequest {
  hostName: string;
  maxPlayers: number;
}

export interface JoinGameRequest {
  gameCode: string;
  playerName: string;
  kind?: PlayerKind;
}

export interface AddBotRequest {
  gameId: string;
  botName: string;
}

export interface JoinGameResponse {
  gameId: string;
  lobbyCode: string;
  playerId: string;
  playerSecret: string;
}
