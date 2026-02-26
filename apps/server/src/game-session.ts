import { applyGameAction, createGameState, getLegalActions, getPrivateGameState, getPublicGameState, PLAYER_COLORS, type EngineState } from "@risk/game-engine";
import type { ActionError, JoinGameResponse, LobbyPlayer, LobbySummary, PlayerKind, RiskAction } from "@risk/shared-types";
import { customAlphabet, nanoid } from "nanoid";
import { unauthorized } from "./player-auth.js";

const lobbyCodeGenerator = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

interface SessionSeat {
  playerId: string;
  playerSecret: string;
  name: string;
  kind: PlayerKind;
  color: string;
}

export interface ApplyActionResult {
  ok: boolean;
  error?: ActionError;
  state?: EngineState;
}

export class GameSession {
  readonly gameId: string;
  readonly lobbyCode: string;
  readonly createdAt: number;
  readonly maxPlayers: number;
  private seats: SessionSeat[];
  private state: EngineState | null;
  private startedAt: number | null;

  constructor(maxPlayers: number) {
    this.gameId = nanoid(12);
    this.lobbyCode = lobbyCodeGenerator();
    this.createdAt = Date.now();
    this.maxPlayers = Math.max(2, Math.min(6, maxPlayers));
    this.seats = [];
    this.state = null;
    this.startedAt = null;
  }

  addPlayer(name: string, kind: PlayerKind = "human"): JoinGameResponse | null {
    if (this.seats.length >= this.maxPlayers || this.state) {
      return null;
    }

    const seat: SessionSeat = {
      playerId: nanoid(12),
      playerSecret: nanoid(24),
      name: name.trim().slice(0, 32) || `Player ${this.seats.length + 1}`,
      kind,
      color: PLAYER_COLORS[this.seats.length % PLAYER_COLORS.length],
    };

    this.seats.push(seat);
    return {
      gameId: this.gameId,
      lobbyCode: this.lobbyCode,
      playerId: seat.playerId,
      playerSecret: seat.playerSecret,
    };
  }

  addBot(botName: string): JoinGameResponse | null {
    return this.addPlayer(botName || `Bot ${this.seats.length + 1}`, "bot");
  }

  start(): EngineState | null {
    if (this.state || this.seats.length < 2) {
      return this.state;
    }

    this.state = createGameState({
      gameId: this.gameId,
      lobbyCode: this.lobbyCode,
      players: this.seats.map((seat) => ({
        id: seat.playerId,
        name: seat.name,
        kind: seat.kind,
        color: seat.color,
      })),
    });
    this.startedAt = Date.now();
    return this.state;
  }

  isStarted(): boolean {
    return this.state !== null;
  }

  getLobbySummary(): LobbySummary {
    const players: LobbyPlayer[] = this.seats.map((seat) => ({
      id: seat.playerId,
      name: seat.name,
      kind: seat.kind,
      color: seat.color,
      isReady: Boolean(this.state),
    }));

    return {
      gameId: this.gameId,
      lobbyCode: this.lobbyCode,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      maxPlayers: this.maxPlayers,
      players,
      isStarted: Boolean(this.state),
    };
  }

  listSeats(): LobbyPlayer[] {
    return this.seats.map((seat) => ({
      id: seat.playerId,
      name: seat.name,
      kind: seat.kind,
      color: seat.color,
      isReady: Boolean(this.state),
    }));
  }

  getSeat(playerId: string): SessionSeat | undefined {
    return this.seats.find((seat) => seat.playerId === playerId);
  }

  authorize(playerId: string, playerSecret: string): ActionError | null {
    const seat = this.getSeat(playerId);
    if (!seat || seat.playerSecret !== playerSecret) {
      return unauthorized();
    }

    return null;
  }

  getPublicState() {
    if (!this.state) {
      return null;
    }
    return getPublicGameState(this.state);
  }

  getPrivateState(playerId: string, playerSecret: string) {
    const authError = this.authorize(playerId, playerSecret);
    if (authError) {
      return { error: authError, state: null };
    }

    if (!this.state) {
      return {
        error: {
          code: "GAME_NOT_ACTIVE",
          message: "Game has not started yet.",
        } satisfies ActionError,
        state: null,
      };
    }

    return { error: null, state: getPrivateGameState(this.state, playerId) };
  }

  getLegalActions(playerId: string, playerSecret: string) {
    const authError = this.authorize(playerId, playerSecret);
    if (authError) {
      return { error: authError, actions: [] };
    }

    if (!this.state) {
      return {
        error: {
          code: "GAME_NOT_ACTIVE",
          message: "Game has not started.",
        } satisfies ActionError,
        actions: [],
      };
    }

    return {
      error: null,
      actions: getLegalActions(this.state, playerId),
    };
  }

  applyAction(
    playerId: string,
    playerSecret: string,
    action: RiskAction,
  ): ApplyActionResult {
    const authError = this.authorize(playerId, playerSecret);
    if (authError) {
      return {
        ok: false,
        error: authError,
      };
    }

    if (!this.state) {
      return {
        ok: false,
        error: {
          code: "GAME_NOT_ACTIVE",
          message: "Game has not started.",
        },
      };
    }

    const result = applyGameAction(this.state, playerId, action);
    if (!result.ok || result.error) {
      return {
        ok: false,
        error: result.error,
      };
    }

    this.state = result.state;
    return {
      ok: true,
      state: this.state,
    };
  }

  getCurrentPlayerKind(): PlayerKind | null {
    if (!this.state) {
      return null;
    }

    const seat = this.getSeat(this.state.currentPlayerId);
    return seat?.kind ?? null;
  }

  getCurrentPlayerAuth():
    | { playerId: string; playerSecret: string }
    | null {
    if (!this.state) {
      return null;
    }

    const seat = this.getSeat(this.state.currentPlayerId);
    if (!seat) {
      return null;
    }

    return {
      playerId: seat.playerId,
      playerSecret: seat.playerSecret,
    };
  }
}
