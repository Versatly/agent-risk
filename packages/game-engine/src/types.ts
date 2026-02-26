import type {
  BattleLogEntry,
  BattleOutcome,
  GamePhase,
  RiskAction,
  RiskCard,
} from "@risk/shared-types";
import type { TerritoryId } from "./constants.js";

export interface RandomSource {
  nextDie(): number;
}

export interface TerritoryControlState {
  id: TerritoryId;
  ownerId: string | null;
  troops: number;
}

export interface EnginePlayerState {
  id: string;
  name: string;
  color: string;
  kind: "human" | "bot" | "agent";
  territories: number;
  troopsOnBoard: number;
  reinforcementPool: number;
  cards: RiskCard[];
  isEliminated: boolean;
  hasConqueredThisTurn: boolean;
}

export interface DeckState {
  drawPile: RiskCard[];
  discardPile: RiskCard[];
  tradeCount: number;
}

export interface PendingOccupationState {
  fromTerritoryId: TerritoryId;
  toTerritoryId: TerritoryId;
  minTroops: number;
  maxTroops: number;
}

export interface EngineState {
  gameId: string;
  lobbyCode: string;
  createdAt: number;
  startedAt: number | null;
  round: number;
  currentPlayerId: string;
  currentPhase: GamePhase;
  players: EnginePlayerState[];
  territories: Record<TerritoryId, TerritoryControlState>;
  deck: DeckState;
  pendingOccupation: PendingOccupationState | null;
  lastBattle: BattleOutcome | null;
  battleLog: BattleLogEntry[];
  winnerId: string | null;
}

export interface ActionResult {
  ok: boolean;
  state: EngineState;
  error?: {
    code:
      | "GAME_NOT_ACTIVE"
      | "INVALID_PHASE"
      | "NOT_YOUR_TURN"
      | "ILLEGAL_ACTION"
      | "INVALID_TERRITORY"
      | "INSUFFICIENT_TROOPS"
      | "CARD_SET_INVALID";
    message: string;
  };
}

export interface ApplyActionParams {
  state: EngineState;
  playerId: string;
  action: RiskAction;
  rng: RandomSource;
}

export interface LegalActionContext {
  state: EngineState;
  playerId: string;
}
