import { create } from "zustand";
import { api } from "../lib/api";

export interface SessionCredentials {
  gameId: string;
  lobbyCode: string;
  playerId: string;
  playerSecret: string;
  playerName: string;
}

interface LobbySummary {
  gameId: string;
  lobbyCode: string;
  maxPlayers: number;
  players: Array<{ id: string; name: string; kind: string }>;
}

interface LobbyStoreState {
  lobbies: LobbySummary[];
  loading: boolean;
  error: string | null;
  credentials: SessionCredentials | null;
  refreshLobbies: () => Promise<void>;
  createLobby: (hostName: string, maxPlayers: number) => Promise<void>;
  joinLobby: (lobbyCode: string, playerName: string) => Promise<void>;
  setCredentials: (credentials: SessionCredentials | null) => void;
}

const SESSION_STORAGE_KEY = "risk-browser-session";

export const useLobbyStore = create<LobbyStoreState>((set) => ({
  lobbies: [],
  loading: false,
  error: null,
  credentials: loadStoredCredentials(),

  refreshLobbies: async () => {
    set({ loading: true, error: null });
    try {
      const result = await api.listLobbies();
      set({
        lobbies: result.lobbies,
        loading: false,
      });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error),
      });
    }
  },

  createLobby: async (hostName, maxPlayers) => {
    set({ loading: true, error: null });
    try {
      const result = await api.createLobby(hostName, maxPlayers);
      const credentials: SessionCredentials = {
        ...result.join,
        playerName: hostName,
      };
      saveCredentials(credentials);
      set({
        credentials,
        loading: false,
      });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error),
      });
    }
  },

  joinLobby: async (lobbyCode, playerName) => {
    set({ loading: true, error: null });
    try {
      const result = await api.joinLobby(lobbyCode.toUpperCase(), playerName);
      const credentials: SessionCredentials = {
        ...result.join,
        playerName,
      };
      saveCredentials(credentials);
      set({
        credentials,
        loading: false,
      });
    } catch (error) {
      set({
        loading: false,
        error: getErrorMessage(error),
      });
    }
  },

  setCredentials: (credentials) => {
    if (credentials) {
      saveCredentials(credentials);
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }

    set({ credentials });
  },
}));

function loadStoredCredentials(): SessionCredentials | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionCredentials;
  } catch {
    return null;
  }
}

function saveCredentials(credentials: SessionCredentials) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(credentials));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}
