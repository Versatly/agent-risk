import type { RiskAction } from "@risk/shared-types";

const BASE_URL = process.env.RISK_SERVER_URL ?? "http://127.0.0.1:4242";

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as T | { message?: string };
  if (!response.ok) {
    const message =
      (payload as { message?: string }).message ??
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export interface CreateGamePayload {
  hostName: string;
  maxPlayers: number;
}

export interface JoinGamePayload {
  lobbyCode: string;
  playerName: string;
  kind?: "human" | "bot" | "agent";
}

export interface ActionPayload {
  gameId: string;
  playerId: string;
  playerSecret: string;
  action: RiskAction;
}

export interface SessionAuthPayload {
  gameId: string;
  playerId: string;
  playerSecret: string;
}

export async function createGame(payload: CreateGamePayload) {
  return request<{
    lobby: unknown;
    join: {
      gameId: string;
      lobbyCode: string;
      playerId: string;
      playerSecret: string;
    };
  }>("/api/lobbies", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listOpenGames() {
  return request<{
    lobbies: unknown[];
  }>("/api/lobbies");
}

export async function joinGame(payload: JoinGamePayload) {
  return request<{
    lobby: unknown;
    join: {
      gameId: string;
      lobbyCode: string;
      playerId: string;
      playerSecret: string;
    };
  }>(`/api/lobbies/${payload.lobbyCode}/join`, {
    method: "POST",
    body: JSON.stringify({
      playerName: payload.playerName,
      kind: payload.kind ?? "agent",
    }),
  });
}

export async function startGame(gameId: string) {
  return request<{ state: unknown }>(`/api/games/${gameId}/start`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function getGameState(payload: SessionAuthPayload) {
  const query = new URLSearchParams({
    playerId: payload.playerId,
    playerSecret: payload.playerSecret,
  });

  return request<{ state: unknown }>(`/api/games/${payload.gameId}/state?${query.toString()}`);
}

export async function getLegalActions(payload: SessionAuthPayload) {
  const query = new URLSearchParams({
    playerId: payload.playerId,
    playerSecret: payload.playerSecret,
  });

  return request<{ actions: unknown[] }>(
    `/api/games/${payload.gameId}/legal-actions?${query.toString()}`,
  );
}

export async function submitAction(payload: ActionPayload) {
  return request<{ state: unknown; publicState: unknown }>(
    `/api/games/${payload.gameId}/action`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function endTurn(payload: SessionAuthPayload) {
  return request<{ state: unknown; publicState: unknown }>(
    `/api/games/${payload.gameId}/end-turn`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
