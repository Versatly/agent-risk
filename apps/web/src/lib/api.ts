import type { RiskAction } from "@risk/shared-types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4242";

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message ?? `Request failed (${response.status})`);
  }

  return payload as T;
}

export const api = {
  listLobbies: () =>
    apiRequest<{
      lobbies: Array<{
        gameId: string;
        lobbyCode: string;
        maxPlayers: number;
        players: Array<{ id: string; name: string; kind: string }>;
      }>;
    }>("/api/lobbies"),

  createLobby: (hostName: string, maxPlayers: number) =>
    apiRequest<{
      lobby: unknown;
      join: {
        gameId: string;
        lobbyCode: string;
        playerId: string;
        playerSecret: string;
      };
    }>("/api/lobbies", {
      method: "POST",
      body: JSON.stringify({ hostName, maxPlayers }),
    }),

  joinLobby: (lobbyCode: string, playerName: string, kind = "human") =>
    apiRequest<{
      lobby: unknown;
      join: {
        gameId: string;
        lobbyCode: string;
        playerId: string;
        playerSecret: string;
      };
    }>(`/api/lobbies/${lobbyCode}/join`, {
      method: "POST",
      body: JSON.stringify({ playerName, kind }),
    }),

  addBot: (gameId: string, botName: string) =>
    apiRequest<{ lobby: unknown; join: unknown }>(`/api/games/${gameId}/add-bot`, {
      method: "POST",
      body: JSON.stringify({ botName }),
    }),

  startGame: (gameId: string) =>
    apiRequest<{ state: unknown }>(`/api/games/${gameId}/start`, {
      method: "POST",
      body: JSON.stringify({}),
    }),

  getState: (gameId: string, playerId: string, playerSecret: string) => {
    const query = new URLSearchParams({ playerId, playerSecret });
    return apiRequest<{ state: unknown }>(`/api/games/${gameId}/state?${query}`);
  },

  getLegalActions: (gameId: string, playerId: string, playerSecret: string) => {
    const query = new URLSearchParams({ playerId, playerSecret });
    return apiRequest<{ actions: unknown[] }>(
      `/api/games/${gameId}/legal-actions?${query}`,
    );
  },

  submitAction: (
    gameId: string,
    playerId: string,
    playerSecret: string,
    action: RiskAction,
  ) =>
    apiRequest<{ state: unknown; publicState: unknown }>(`/api/games/${gameId}/action`, {
      method: "POST",
      body: JSON.stringify({ playerId, playerSecret, action }),
    }),

  endTurn: (gameId: string, playerId: string, playerSecret: string) =>
    apiRequest<{ state: unknown; publicState: unknown }>(`/api/games/${gameId}/end-turn`, {
      method: "POST",
      body: JSON.stringify({ playerId, playerSecret }),
    }),
};

export function getApiBaseUrl() {
  return API_BASE_URL;
}
