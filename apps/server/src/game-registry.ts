import type { JoinGameResponse, PlayerKind } from "@risk/shared-types";
import { GameSession } from "./game-session.js";

export class GameRegistry {
  private readonly sessionsByGameId = new Map<string, GameSession>();
  private readonly gameIdByLobbyCode = new Map<string, string>();
  private readonly socketAuth = new Map<
    string,
    { gameId: string; playerId: string }
  >();
  private readonly socketsByGamePlayer = new Map<string, Set<string>>();

  createLobby(hostName: string, maxPlayers: number) {
    const session = new GameSession(maxPlayers);
    this.sessionsByGameId.set(session.gameId, session);
    this.gameIdByLobbyCode.set(session.lobbyCode, session.gameId);

    const joinResponse = session.addPlayer(hostName, "human");
    if (!joinResponse) {
      throw new Error("Failed to create host seat.");
    }

    return {
      session,
      joinResponse,
    };
  }

  listOpenLobbies() {
    return [...this.sessionsByGameId.values()]
      .filter((session) => !session.isStarted())
      .map((session) => session.getLobbySummary());
  }

  joinByCode(
    gameCode: string,
    playerName: string,
    kind: PlayerKind = "human",
  ): { session: GameSession; joinResponse: JoinGameResponse } | null {
    const session = this.getSessionByCode(gameCode);
    if (!session) {
      return null;
    }

    const joinResponse = session.addPlayer(playerName, kind);
    if (!joinResponse) {
      return null;
    }

    return { session, joinResponse };
  }

  addBot(gameId: string, botName: string) {
    const session = this.getSession(gameId);
    if (!session) {
      return null;
    }

    const joinResponse = session.addBot(botName);
    if (!joinResponse) {
      return null;
    }

    return {
      session,
      joinResponse,
    };
  }

  startGame(gameId: string) {
    const session = this.getSession(gameId);
    if (!session) {
      return null;
    }

    return session.start();
  }

  getSession(gameId: string): GameSession | null {
    return this.sessionsByGameId.get(gameId) ?? null;
  }

  getSessionByCode(lobbyCode: string): GameSession | null {
    const gameId = this.gameIdByLobbyCode.get(lobbyCode.toUpperCase());
    if (!gameId) {
      return null;
    }

    return this.getSession(gameId);
  }

  attachSocket(socketId: string, gameId: string, playerId: string) {
    this.socketAuth.set(socketId, { gameId, playerId });
    const key = this.getPlayerKey(gameId, playerId);
    const existing = this.socketsByGamePlayer.get(key) ?? new Set<string>();
    existing.add(socketId);
    this.socketsByGamePlayer.set(key, existing);
  }

  detachSocket(socketId: string) {
    const auth = this.socketAuth.get(socketId);
    if (!auth) {
      return;
    }

    const key = this.getPlayerKey(auth.gameId, auth.playerId);
    const sockets = this.socketsByGamePlayer.get(key);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.socketsByGamePlayer.delete(key);
      }
    }
    this.socketAuth.delete(socketId);
  }

  listSocketsForPlayer(gameId: string, playerId: string): string[] {
    const key = this.getPlayerKey(gameId, playerId);
    return [...(this.socketsByGamePlayer.get(key) ?? new Set<string>())];
  }

  listConnectedPlayers(gameId: string): string[] {
    const result = new Set<string>();
    for (const auth of this.socketAuth.values()) {
      if (auth.gameId === gameId) {
        result.add(auth.playerId);
      }
    }

    return [...result];
  }

  listSessions(): GameSession[] {
    return [...this.sessionsByGameId.values()];
  }

  private getPlayerKey(gameId: string, playerId: string) {
    return `${gameId}:${playerId}`;
  }
}
